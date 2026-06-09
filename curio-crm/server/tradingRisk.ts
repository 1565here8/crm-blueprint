import { listAccountTypes } from "./accountTypes";
import { getCashBalance, getDb, getOpenPositions, getPositionById } from "./db";
import { getQuoteForUser } from "./spreadProfiles";
import type { Position } from "./types";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Platform default leverage (1:X) from first active account tier, else 30. */
export function getPlatformLeverage(): number {
  try {
    const { rows } = listAccountTypes({ activeOnly: true, page: 1, limit: 1 });
    const lev = rows[0]?.leverage_default;
    if (lev && lev >= 1) return Math.min(1000, Math.round(lev));
  } catch {
    /* schema optional */
  }
  return 30;
}

/** Reject new exposure when open book + order exceeds equity × leverage. */
export async function assertExposureWithinLeverage(userId: string, additionalNotional: number): Promise<void> {
  const leverage = getPlatformLeverage();
  const positions = getOpenPositions(userId);
  let exposure = additionalNotional;
  let equity = getCashBalance(userId);

  for (const p of positions) {
    const q = await getQuoteForUser(userId, p.symbol, p.asset_class);
    const mark = p.side === "long" ? q.bid : q.ask;
    const mv = mark * p.qty;
    exposure += mv;
    equity += mv;
  }
  exposure = round(exposure);
  equity = round(equity);
  const cap = round(equity * leverage);
  if (exposure > cap + 0.01) {
    throw new Error(
      `Exceeds 1:${leverage} leverage (exposure ${exposure.toLocaleString()} > cap ${cap.toLocaleString()} on equity ${equity.toLocaleString()}).`,
    );
  }
}

export function updatePositionStops(
  positionId: string,
  userId: string,
  stopLoss: number | null,
  takeProfit: number | null,
): Position {
  const p = getPositionById(positionId);
  if (!p || p.user_id !== userId || p.status !== "open") {
    throw new Error("Open position not found.");
  }
  if (stopLoss != null && stopLoss <= 0) throw new Error("Stop loss must be positive.");
  if (takeProfit != null && takeProfit <= 0) throw new Error("Take profit must be positive.");
  if (p.side === "long" && stopLoss != null && takeProfit != null && stopLoss >= takeProfit) {
    throw new Error("Stop loss must be below take profit for long positions.");
  }
  getDb()
    .prepare("UPDATE positions SET stop_loss = ?, take_profit = ? WHERE id = ?")
    .run(stopLoss, takeProfit, positionId);
  return getPositionById(positionId)!;
}

/** Auto-close when mark hits stop loss or take profit (long positions). */
export async function evaluateStopLossTakeProfit(userId: string, actorId: string | null): Promise<void> {
  const positions = getOpenPositions(userId) as Array<
    Position & { stop_loss?: number | null; take_profit?: number | null }
  >;
  for (const p of positions) {
    const sl = p.stop_loss ?? null;
    const tp = p.take_profit ?? null;
    if (sl == null && tp == null) continue;
    const q = await getQuoteForUser(userId, p.symbol, p.asset_class);
    const mark = p.side === "long" ? q.bid : q.ask;
    const hitSl = sl != null && mark <= sl;
    const hitTp = tp != null && mark >= tp;
    if (!hitSl && !hitTp) continue;
    try {
      const { placeOrder } = await import("./trading");
      await placeOrder({
        userId,
        symbol: p.symbol,
        assetClass: p.asset_class,
        qty: p.qty,
        side: "SELL",
        orderType: "MARKET",
        positionId: p.id,
        actorId,
      });
    } catch {
      /* best-effort — desk may close manually */
    }
  }
}
