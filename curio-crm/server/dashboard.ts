import { getDb, getCashBalance, listUsers } from "./db";
import { getQuote } from "./marketData";
import type { AssetClass } from "./types";

export type DashboardPeriod =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "7d"
  | "14d"
  | "30d"
  | "60d";

export function resolvePeriod(period: DashboardPeriod): { from: string; to: string; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      break;
    case "this_week": {
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      break;
    }
    case "this_month":
      start.setDate(1);
      break;
    case "last_month":
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "14d":
      start.setDate(start.getDate() - 14);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "60d":
      start.setDate(start.getDate() - 60);
      break;
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return {
    from: start.toISOString(),
    to: end.toISOString(),
    label: `${fmt(start)} - ${fmt(end)}`,
  };
}

function sumLedger(from: string, to: string, reasons: string[], positiveOnly: boolean): number {
  if (reasons.length === 0) return 0;
  const placeholders = reasons.map(() => "?").join(", ");
  const signFilter = positiveOnly ? "AND amount_delta > 0" : "AND amount_delta < 0";
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount_delta)), 0) AS total
       FROM ledger_entries
       WHERE reason IN (${placeholders}) ${signFilter}
       AND created_at >= ? AND created_at <= ?`,
    )
    .get(...reasons, from, to) as { total: number };
  return round(row.total);
}

function countInPeriod(table: string, dateCol: string, from: string, to: string, extra = ""): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM ${table}
       WHERE ${dateCol} >= ? AND ${dateCol} <= ? ${extra}`,
    )
    .get(from, to) as { c: number };
  return row.c;
}

async function aggregateOpenPnl(): Promise<{
  total: number;
  forex: number;
  crypto: number;
}> {
  const rows = getDb()
    .prepare("SELECT symbol, asset_class, qty, side, entry_price FROM positions WHERE status = 'open' LIMIT 80")
    .all() as {
    symbol: string;
    asset_class: AssetClass;
    qty: number;
    side: string;
    entry_price: number;
  }[];

  let total = 0;
  let forex = 0;
  let crypto = 0;

  for (const p of rows) {
    try {
      const quote = await getQuote(p.symbol, p.asset_class);
      const mark = p.side === "long" ? quote.bid : quote.ask;
      const cost = p.entry_price * p.qty;
      const value = mark * p.qty;
      const pnl = round(value - cost);
      total += pnl;
      if (p.asset_class === "crypto") crypto += pnl;
      else forex += pnl;
    } catch {
      // skip symbols that fail quote fetch
    }
  }

  return { total: round(total), forex: round(forex), crypto: round(crypto) };
}

export async function getDashboardStats(period: DashboardPeriod) {
  const { from, to, label } = resolvePeriod(period);
  const db = getDb();

  const registrations = countInPeriod("users", "created_at", from, to, "AND role = 'user'");

  const deposits = sumLedger(from, to, ["admin_credit", "admin_initial_credit"], true);
  const bonuses = sumLedger(from, to, ["admin_bonus"], true);
  const withdrawals = sumLedger(from, to, ["admin_debit", "withdraw_to_credits"], false);
  const adjustments = sumLedger(from, to, ["admin_adjustment"], true);

  const allUsers = listUsers().filter((u) => u.role === "user");
  const activeUserIds = new Set<string>();

  const activeRows = db
    .prepare(
      `SELECT DISTINCT user_id FROM ledger_entries
       WHERE created_at >= ? AND created_at <= ?
       UNION
       SELECT DISTINCT user_id FROM executions
       WHERE created_at >= ? AND created_at <= ?
       UNION
       SELECT DISTINCT user_id FROM positions WHERE status = 'open'`,
    )
    .all(from, to, from, to) as { user_id: string }[];

  for (const r of activeRows) activeUserIds.add(r.user_id);

  const activeUsers = allUsers.filter((u) => activeUserIds.has(u.id)).length;
  const inactiveUsers = Math.max(0, allUsers.length - activeUsers);

  let totalEquity = 0;
  for (const u of allUsers) {
    const cash = getCashBalance(u.id);
    const openVal = db
      .prepare(
        `SELECT COALESCE(SUM(qty * entry_price), 0) AS v FROM positions WHERE user_id = ? AND status = 'open'`,
      )
      .get(u.id) as { v: number };
    totalEquity += cash + openVal.v;
  }
  const avgPlayerValue = allUsers.length > 0 ? round(totalEquity / allUsers.length) : 0;

  const ftdRow = db
    .prepare(
      `SELECT COUNT(*) AS c FROM (
         SELECT user_id, MIN(created_at) AS first_credit
         FROM ledger_entries
         WHERE amount_delta > 0 AND reason IN ('admin_credit', 'admin_initial_credit')
         GROUP BY user_id
         HAVING first_credit >= ? AND first_credit <= ?
       )`,
    )
    .get(from, to) as { c: number };
  const ftds = ftdRow.c;

  const avgFtd = ftds > 0 ? round(deposits / ftds) : 0;

  const retentionRow = db
    .prepare(
      `SELECT COALESCE(AVG(amount_delta), 0) AS avg FROM ledger_entries
       WHERE amount_delta > 0 AND reason = 'admin_credit'
       AND created_at >= ? AND created_at <= ?`,
    )
    .get(from, to) as { avg: number };

  const trades = countInPeriod("executions", "created_at", from, to);
  const execCols = db.prepare("PRAGMA table_info(executions)").all() as { name: string }[];
  const volumeExpr = execCols.some((c) => c.name === "notional")
    ? "COALESCE(SUM(notional), 0)"
    : "COALESCE(SUM(qty * fill_price), 0)";
  const volumeRow = db
    .prepare(
      `SELECT ${volumeExpr} AS v FROM executions
       WHERE created_at >= ? AND created_at <= ?`,
    )
    .get(from, to) as { v: number };

  const closedPnlRow = db
    .prepare(
      `SELECT COALESCE(SUM(pnl), 0) AS pnl FROM positions
       WHERE status = 'closed' AND closed_at >= ? AND closed_at <= ?`,
    )
    .get(from, to) as { pnl: number };

  const closedForexRow = db
    .prepare(
      `SELECT COALESCE(SUM(pnl), 0) AS pnl FROM positions
       WHERE status = 'closed' AND asset_class = 'us_equity'
       AND closed_at >= ? AND closed_at <= ?`,
    )
    .get(from, to) as { pnl: number };

  const closedCryptoRow = db
    .prepare(
      `SELECT COALESCE(SUM(pnl), 0) AS pnl FROM positions
       WHERE status = 'closed' AND asset_class = 'crypto'
       AND closed_at >= ? AND closed_at <= ?`,
    )
    .get(from, to) as { pnl: number };

  const openPnl = await aggregateOpenPnl();

  const approvedWithdrawals = sumLedger(from, to, ["admin_debit", "withdraw_to_credits", "wire_withdrawal"], false);
  let pendingWithdrawals = 0;
  try {
    const pendingWithdrawalsRow = getDb()
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM wire_requests WHERE status = 'pending'")
      .get() as { total: number };
    pendingWithdrawals = round(pendingWithdrawalsRow.total);
  } catch {
    pendingWithdrawals = 0;
  }

  const allCommissionRow = getDb()
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount_delta)), 0) AS total FROM ledger_entries
       WHERE (reason LIKE 'commission_buy_%' OR reason LIKE 'commission_sell_%')
       AND created_at >= ? AND created_at <= ?`,
    )
    .get(from, to) as { total: number };

  const totalCommission = round(allCommissionRow.total);
  const forexCommission = round(totalCommission * 0.6);
  const cryptoCommission = round(totalCommission - forexCommission);

  const conversionRate = registrations > 0 ? round((ftds / registrations) * 100) : 0;
  const redepositRate =
    ftds > 0
      ? round(
          ((db.prepare(
            `SELECT COUNT(DISTINCT user_id) AS c FROM ledger_entries
             WHERE reason = 'admin_credit' AND created_at >= ? AND created_at <= ?`,
          ).get(from, to) as { c: number }).c /
            ftds) *
            100,
        )
      : 0;

  return {
    period: { key: period, label },
    cards: {
      registrations,
      deposits,
      bonuses,
      withdrawals,
      adjustments,
    },
    playerData: {
      activeUsers,
      inactiveUsers,
      avgPlayerValue,
      conversionRate,
      redepositRate,
    },
    moneyIn: {
      netDeposits: round(deposits - withdrawals),
      ftds,
      avgFtd,
      avgRetentionDeposit: round(retentionRow.avg),
      failedDeposits: 0,
    },
    trading: {
      trades,
      totalVolume: round(volumeRow.v),
      totalPnl: round(closedPnlRow.pnl + openPnl.total),
      openForexPnl: openPnl.forex,
      openCryptoPnl: openPnl.crypto,
      totalOpenPnl: openPnl.total,
      closedForexPnl: round(closedForexRow.pnl),
      closedCryptoPnl: round(closedCryptoRow.pnl),
      totalClosedPnl: round(closedPnlRow.pnl),
      forexCommission,
      cryptoCommission,
      totalCommission,
    },
    moneyOut: {
      approvedWithdrawals,
      pendingWithdrawals,
    },
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
