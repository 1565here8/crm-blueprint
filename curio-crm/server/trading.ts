import { getQuoteForUser } from "./spreadProfiles";
import { getUserExchangeSpread } from "./crmUsers";

/**
 * Apply the per-user Exchange Spread (-5..+5).
 * Each unit shifts the fill price by 0.1% in the trader's favor (positive)
 * or against them (negative). BUY fills are reduced, SELL fills are increased
 * by the favorable side. Used to compensate for market glitches or to
 * demonstrate wins/losses.
 */
function applySpread(price: number, side: "BUY" | "SELL", spread: number): number {
  if (!spread || !Number.isFinite(price)) return price;
  const step = 0.001;
  const factor = side === "BUY" ? 1 - spread * step : 1 + spread * step;
  return Math.max(0.0001, price * factor);
}
import { computeCryptoMatrixCommission } from "./cryptoCommissions";
import { computeForexMatrixCommission } from "./forexCommissions";
import { assertExposureWithinLeverage, evaluateStopLossTakeProfit, getPlatformLeverage } from "./tradingRisk";
import {
  cancelPendingOrder,
  closePosition,
  computeTradeCommission,
  formatDisplayTradeId,
  getCashBalance,
  getClosedPositions,
  getPositionCommissionTotal,
  getExecutions,
  getOpenPositions,
  getPendingOrderById,
  getPositionById,
  getUserById,
  getUserProfileSummary,
  getUserTradingStatus,
  insertOpenPosition,
  insertPendingOrder,
  listPendingOrdersForUsers,
  listPositionsForUsers,
  markPendingOrderFilled,
} from "./db";
import type {
  AccountSummary,
  AssetClass,
  Execution,
  OrderType,
  PendingOrder,
  Position,
  PositionMark,
  PositionSide,
} from "./types";

export type OrderResult =
  | { kind: "filled"; position?: Position; execution: Execution; closed?: Position }
  | { kind: "pending"; pendingOrder: PendingOrder };

function assertTradingEnabled(userId: string) {
  const status = getUserTradingStatus(userId);
  if (status.toLowerCase() === "disabled" || status.toLowerCase() === "blocked") {
    throw new Error(`Trading is ${status} for this account.`);
  }
}

function resolveTradeCommission(args: {
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  notional: number;
  qty: number;
}): number {
  if (args.assetClass === "us_equity") {
    return round(computeForexMatrixCommission(args.userId, args.symbol, args.assetClass));
  }
  if (args.assetClass === "crypto") {
    return round(computeCryptoMatrixCommission(args.userId, args.symbol));
  }
  return computeTradeCommission(args.assetClass, args.notional, args.qty);
}

export async function placeOrder(args: {
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  qty: number;
  side: "BUY" | "SELL";
  orderType: OrderType;
  limitPrice?: number;
  positionId?: string;
  actorId: string | null;
}): Promise<OrderResult> {
  if (args.qty <= 0) throw new Error("Quantity must be positive.");
  assertTradingEnabled(args.userId);

  const quote = await getQuoteForUser(args.userId, args.symbol, args.assetClass);

  if (args.side === "BUY") {
    if (args.orderType === "LIMIT" && args.limitPrice != null && args.limitPrice < quote.ask) {
      const pending = insertPendingOrder({
        userId: args.userId,
        symbol: quote.symbol,
        assetClass: args.assetClass,
        qty: args.qty,
        side: "BUY",
        orderType: "LIMIT",
        limitPrice: args.limitPrice,
      });
      return { kind: "pending", pendingOrder: getPendingOrderById(pending.id)! };
    }

    const rawBuyPrice = resolveBuyFillPrice(args.orderType, quote.ask, args.limitPrice);
    const fillPrice = applySpread(rawBuyPrice, "BUY", getUserExchangeSpread(args.userId));
    const notional = round(fillPrice * args.qty);
    const commission = resolveTradeCommission({
      userId: args.userId,
      symbol: args.symbol,
      assetClass: args.assetClass,
      notional,
      qty: args.qty,
    });
    const balance = getCashBalance(args.userId);
    if (balance < notional + commission) throw new Error("Insufficient buying power.");
    await assertExposureWithinLeverage(args.userId, notional);

    const { position, execution } = insertOpenPosition({
      userId: args.userId,
      symbol: quote.symbol,
      assetClass: args.assetClass,
      qty: args.qty,
      side: "long" satisfies PositionSide,
      entryPrice: fillPrice,
      openedBy: args.actorId,
      notionalCost: notional,
      orderType: args.orderType,
      commission,
    });

    return { kind: "filled", position, execution };
  }

  if (!args.positionId) throw new Error("Position required to sell.");
  const position = getPositionById(args.positionId);
  if (!position || position.user_id !== args.userId) throw new Error("Position not found.");
  if (position.status !== "open") throw new Error("Position already closed.");

  const sellQty = Math.min(args.qty, position.qty);
  if (sellQty <= 0) throw new Error("Quantity must be positive.");

  const sellQuote = await getQuoteForUser(args.userId, position.symbol, position.asset_class);

  if (args.orderType === "LIMIT" && args.limitPrice != null && args.limitPrice > sellQuote.bid) {
    const pending = insertPendingOrder({
      userId: args.userId,
      symbol: position.symbol,
      assetClass: position.asset_class,
      qty: sellQty,
      side: "SELL",
      orderType: "LIMIT",
      limitPrice: args.limitPrice,
      positionId: args.positionId,
    });
    return { kind: "pending", pendingOrder: getPendingOrderById(pending.id)! };
  }

  const rawSellPrice = resolveSellFillPrice(args.orderType, sellQuote.bid, args.limitPrice);
  const fillPrice = applySpread(rawSellPrice, "SELL", getUserExchangeSpread(args.userId));
  const notional = round(fillPrice * sellQty);
  const commission = resolveTradeCommission({
    userId: args.userId,
    symbol: position.symbol,
    assetClass: position.asset_class,
    notional,
    qty: sellQty,
  });

  const { position: closed, execution } = closePosition({
    positionId: args.positionId,
    exitPrice: fillPrice,
    actorId: args.actorId,
    orderType: args.orderType,
    commission,
    closeQty: sellQty,
  });

  return { kind: "filled", closed, execution };
}

export async function cancelUserPendingOrder(userId: string, orderId: string) {
  return cancelPendingOrder(orderId, userId);
}

export async function tryFillPendingOrders(userId: string): Promise<OrderResult[]> {
  const pending = listPendingOrdersForUsers([userId]) as PendingOrder[];
  const filled: OrderResult[] = [];

  for (const order of pending) {
    if (order.status !== "pending") continue;
    try {
      const quote = await getQuoteForUser(userId, order.symbol, order.asset_class);
      const marketable =
        order.side === "BUY"
          ? order.limit_price != null && order.limit_price >= quote.ask
          : order.limit_price != null && order.limit_price <= quote.bid;

      if (!marketable) continue;

      if (order.side === "BUY") {
        const notional = round((order.limit_price ?? quote.ask) * order.qty);
        const commission = resolveTradeCommission({
          userId,
          symbol: order.symbol,
          assetClass: order.asset_class,
          notional,
          qty: order.qty,
        });
        if (getCashBalance(userId) < notional + commission) continue;

        const { position, execution } = insertOpenPosition({
          userId,
          symbol: order.symbol,
          assetClass: order.asset_class,
          qty: order.qty,
          side: "long",
          entryPrice: quote.ask,
          openedBy: userId,
          notionalCost: notional,
          orderType: "LIMIT",
          commission,
        });
        markPendingOrderFilled(order.id);
        filled.push({ kind: "filled", position, execution });
      } else if (order.position_id) {
        const notional = round(quote.bid * order.qty);
        const commission = resolveTradeCommission({
          userId,
          symbol: order.symbol,
          assetClass: order.asset_class,
          notional,
          qty: order.qty,
        });
        const { position: closed, execution } = closePosition({
          positionId: order.position_id,
          exitPrice: quote.bid,
          actorId: userId,
          orderType: "LIMIT",
          commission,
        });
        markPendingOrderFilled(order.id);
        filled.push({ kind: "filled", closed, execution });
      }
    } catch {
      /* skip failed fills */
    }
  }

  return filled;
}

function resolveBuyFillPrice(orderType: OrderType, ask: number, limitPrice?: number): number {
  if (orderType === "MARKET") return ask;
  if (limitPrice == null) throw new Error("Limit price required.");
  if (limitPrice < ask) throw new Error(`Limit ${limitPrice} below ask ${ask}. Order queued as pending.`);
  return ask;
}

function resolveSellFillPrice(orderType: OrderType, bid: number, limitPrice?: number): number {
  if (orderType === "MARKET") return bid;
  if (limitPrice == null) throw new Error("Limit price required.");
  if (limitPrice > bid) throw new Error(`Limit ${limitPrice} above bid ${bid}. Order queued as pending.`);
  return bid;
}

export async function buildAccountSummary(userId: string): Promise<AccountSummary> {
  const user = getUserById(userId);
  if (!user) throw new Error("User not found.");

  const cash = getCashBalance(userId);
  const positions = getOpenPositions(userId);
  const marked: PositionMark[] = [];
  let portfolioValue = 0;
  let unrealizedPnl = 0;

  for (const p of positions) {
    const q = await getQuoteForUser(userId, p.symbol, p.asset_class);
    const mark = p.side === "long" ? q.bid : q.ask;
    const marketValue = round(mark * p.qty);
    const cost = round(p.entry_price * p.qty);
    const pnl = round(marketValue - cost);
    const pnlPct = cost > 0 ? round((pnl / cost) * 100) : 0;
    marked.push({ ...p, mark, marketValue, unrealizedPnl: pnl, unrealizedPnlPct: pnlPct });
    portfolioValue += marketValue;
    unrealizedPnl += pnl;
  }

  portfolioValue = round(portfolioValue);
  unrealizedPnl = round(unrealizedPnl);

  const equity = round(cash + portfolioValue);
  const leverage = getPlatformLeverage();
  const maxExposure = round(equity * leverage);
  const buyingPower = round(Math.max(0, maxExposure - portfolioValue));

  return {
    cashBalance: cash,
    buyingPower,
    portfolioValue,
    equity,
    unrealizedPnl,
    credits: user.credits,
    openPositions: marked,
  };
}

export async function userSummary(userId: string) {
  await tryFillPendingOrders(userId);
  await evaluateStopLossTakeProfit(userId, userId);
  const user = getUserById(userId);
  if (!user) throw new Error("User not found.");
  const account = await buildAccountSummary(userId);
  const profile = getUserProfileSummary(userId);
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    cashBalance: account.cashBalance,
    buyingPower: account.buyingPower,
    portfolioValue: account.portfolioValue,
    equity: account.equity,
    unrealizedPnl: account.unrealizedPnl,
    credits: account.credits,
    openPositions: account.openPositions,
    createdAt: user.created_at,
    displayId: profile.displayId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    currency: profile.currency,
    phone: profile.phone,
    countryCode: profile.countryCode,
    crmStatus: profile.crmStatus,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zipCode: profile.zipCode,
    nationality: profile.nationality,
    birthday: profile.birthday,
    extDocsRequired: profile.extDocsRequired,
  };
}

/** @deprecated use placeOrder */
export async function openTrade(args: {
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  qty: number;
  side: PositionSide;
  actorId: string | null;
}) {
  const result = await placeOrder({
    userId: args.userId,
    symbol: args.symbol,
    assetClass: args.assetClass,
    qty: args.qty,
    side: "BUY",
    orderType: "MARKET",
    actorId: args.actorId,
  });
  if (result.kind === "pending") throw new Error("Unexpected pending order on market buy.");
  return result.position!;
}

/** @deprecated use placeOrder */
export async function closeTrade(args: {
  positionId: string;
  actorId: string | null;
  qty?: number;
}) {
  const position = getPositionById(args.positionId);
  if (!position) throw new Error("Position not found.");
  const sellQty = args.qty != null ? Math.min(args.qty, position.qty) : position.qty;
  const result = await placeOrder({
    userId: position.user_id,
    symbol: position.symbol,
    assetClass: position.asset_class,
    qty: sellQty,
    side: "SELL",
    orderType: "MARKET",
    positionId: args.positionId,
    actorId: args.actorId,
  });
  if (result.kind === "pending") throw new Error("Unexpected pending order on market sell.");
  return result.closed!;
}

export async function buildAdminTradingDesk(userIds: string[]) {
  for (const uid of userIds) {
    await tryFillPendingOrders(uid);
    await evaluateStopLossTakeProfit(uid, null);
  }

  const openRaw = listPositionsForUsers(userIds, "open") as Array<Position & { username: string }>;
  const closedRaw = listPositionsForUsers(userIds, "closed") as Array<Position & { username: string }>;
  const pending = listPendingOrdersForUsers(userIds);

  const openPositions: Array<PositionMark & { username?: string }> = [];
  for (const p of openRaw) {
    const q = await getQuoteForUser(p.user_id, p.symbol, p.asset_class);
    const mark = p.side === "long" ? q.bid : q.ask;
    const marketValue = round(mark * p.qty);
    const cost = round(p.entry_price * p.qty);
    const pnl = round(marketValue - cost);
    const pnlPct = cost > 0 ? round((pnl / cost) * 100) : 0;
    openPositions.push({
      ...p,
      mark,
      marketValue,
      unrealizedPnl: pnl,
      unrealizedPnlPct: pnlPct,
      username: p.username,
    });
  }

  const closedPositions = closedRaw.map((p) => ({
    ...p,
    commission: getPositionCommissionTotal(p.user_id, p.symbol, p.opened_at, p.closed_at),
    displayTradeId: formatDisplayTradeId(p.trade_number, p.id),
  }));

  return {
    userCount: userIds.length,
    openPositions,
    pendingOrders: pending,
    closedPositions,
  };
}

export { getExecutions, getClosedPositions };
export { updatePositionStops, getPlatformLeverage } from "./tradingRisk";

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
