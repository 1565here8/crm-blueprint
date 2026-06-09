/**
 * CRM Balance Events — wallet mutation audit (legacy broker CRM parity, Node-native).
 */
import { getDb, getUserById, roundMoney } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";

export type BalanceEventRow = {
  id: number;
  event_type: string;
  user_id: string;
  user_email: string | null;
  user_label: string | null;
  prev_cash: number;
  new_cash: number;
  prev_bonus: number;
  new_bonus: number;
  ledger_ref: string | null;
  ref_note: string | null;
  operator_note: string | null;
  flagged: number;
  actor_id: string | null;
  created_at: string;
};

export type BalanceEventQuery = {
  from?: string;
  to?: string;
  type?: string;
  user?: string;
  search?: string;
  flagged?: boolean;
  negativeOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type UpsertBalanceEventInput = {
  eventType: string;
  userId: string;
  prevCash: number;
  newCash: number;
  prevBonus?: number;
  newBonus?: number;
  ledgerRef?: string | null;
  refNote?: string | null;
  operatorNote?: string | null;
  createdAt?: string;
  actorId?: string | null;
};

let schemaReady = false;

function userMeta(userId: string): { email: string | null; label: string | null } {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT p.email, u.username
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = ?`,
    )
    .get(userId) as { email?: string; username?: string } | undefined;
  return { email: row?.email ?? null, label: row?.username ?? null };
}

function reasonToEventType(reason: string): string {
  if (reason === "admin_initial_credit" || reason === "admin_credit") return "create_deposit";
  if (reason.startsWith("fill_") || reason.startsWith("close_pnl_")) return "create_trade";
  if (reason.startsWith("commission_")) return `forex_daily_commission_${reason.split("_").pop() ?? "0"}`;
  if (reason === "admin_bonus") return "bonus";
  if (reason === "admin_adjustment") return "manual_adjustment";
  if (reason === "admin_debit" || /withdraw/i.test(reason)) return "withdrawal";
  return reason.slice(0, 60);
}

function seedDemoRows(): void {
  const db = getDb();
  const demoUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: string } | undefined;
  const userId = demoUser?.id ?? "demo-user";
  const meta = userMeta(userId);
  const ins = db.prepare(
    `INSERT INTO crm_balance_event
     (event_type, user_id, user_email, user_label, prev_cash, new_cash, prev_bonus, new_bonus,
      ledger_ref, ref_note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const rows: Array<[string, number, number, string]> = [
    ["forex_daily_commission_89", 4576.16, 4576.89, "2026-05-28T14:22:01.000Z"],
    ["create_trade", 4601.16, 4576.16, "2026-05-28T11:05:44.000Z"],
    ["forex_daily_commission_89", 4598.02, 4601.16, "2026-05-27T18:40:12.000Z"],
    ["create_trade", 4620.5, 4598.02, "2026-05-27T09:15:33.000Z"],
    ["create_deposit", 120.5, 4620.5, "2026-05-26T16:02:08.000Z"],
    ["create_deposit", -424.84, 4576.16, "2026-05-20T08:11:55.000Z"],
  ];
  for (const [type, prev, next, at] of rows) {
    ins.run(
      type,
      userId,
      meta.email ?? "luckyman140@gmail.com",
      meta.label,
      prev,
      next,
      0,
      0,
      null,
      "Legacy demo seed",
      at,
    );
  }
}

function backfillFromLedger(): void {
  ensureUserProfilesSchema();
  const db = getDb();
  const entries = db
    .prepare(
      `SELECT l.id, l.user_id, l.amount_delta, l.reason, l.actor_id, l.created_at
       FROM ledger_entries l
       ORDER BY l.created_at ASC, l.id ASC`,
    )
    .all() as Array<{
    id: string;
    user_id: string;
    amount_delta: number;
    reason: string;
    actor_id: string | null;
    created_at: string;
  }>;

  if (entries.length === 0) {
    seedDemoRows();
    return;
  }

  const balances = new Map<string, number>();
  const ins = db.prepare(
    `INSERT INTO crm_balance_event
     (event_type, user_id, user_email, user_label, prev_cash, new_cash, prev_bonus, new_bonus,
      ledger_ref, ref_note, actor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const e of entries) {
    const prev = balances.get(e.user_id) ?? 0;
    const next = roundMoney(prev + e.amount_delta);
    balances.set(e.user_id, next);
    const meta = userMeta(e.user_id);
    ins.run(
      reasonToEventType(e.reason),
      e.user_id,
      meta.email,
      meta.label,
      prev,
      next,
      0,
      0,
      e.id,
      e.reason,
      e.actor_id,
      e.created_at,
    );
  }
}

export function ensureBalanceEventsSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_balance_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_email TEXT,
      user_label TEXT,
      prev_cash REAL NOT NULL,
      new_cash REAL NOT NULL,
      prev_bonus REAL NOT NULL DEFAULT 0,
      new_bonus REAL NOT NULL DEFAULT 0,
      ledger_ref TEXT,
      ref_note TEXT,
      operator_note TEXT,
      flagged INTEGER NOT NULL DEFAULT 0,
      actor_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_balance_created ON crm_balance_event(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_balance_type ON crm_balance_event(event_type);
    CREATE INDEX IF NOT EXISTS idx_balance_user ON crm_balance_event(user_id);
    CREATE INDEX IF NOT EXISTS idx_balance_email ON crm_balance_event(user_email);
  `);

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_balance_event").get() as { c: number };
  if (count.c === 0) backfillFromLedger();

  schemaReady = true;
}

export function recordBalanceEventFromLedger(args: {
  userId: string;
  amountDelta: number;
  reason: string;
  actorId?: string | null;
  ledgerRef: string;
  prevCash: number;
  newCash: number;
}): number {
  ensureBalanceEventsSchema();
  const meta = userMeta(args.userId);
  const r = getDb()
    .prepare(
      `INSERT INTO crm_balance_event
       (event_type, user_id, user_email, user_label, prev_cash, new_cash, prev_bonus, new_bonus,
        ledger_ref, ref_note, actor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      reasonToEventType(args.reason),
      args.userId,
      meta.email,
      meta.label,
      args.prevCash,
      args.newCash,
      0,
      0,
      args.ledgerRef,
      args.reason,
      args.actorId ?? null,
      new Date().toISOString(),
    );
  return Number(r.lastInsertRowid);
}

const SORT_COLS: Record<string, string> = {
  id: "id",
  created_at: "created_at",
  event_type: "event_type",
  prev_cash: "prev_cash",
  new_cash: "new_cash",
  user_email: "user_email",
};

export function listBalanceEvents(q: BalanceEventQuery): {
  rows: BalanceEventRow[];
  total: number;
  page: number;
  limit: number;
  eventTypes: string[];
  stats: { total: number; flagged: number; deposits: number; trades: number; netCashDelta: number };
} {
  ensureBalanceEventsSchema();
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(10, q.limit ?? 25));
  const offset = (page - 1) * limit;
  const sortCol = SORT_COLS[q.sortBy ?? ""] ?? "id";
  const sortDir = q.sortDir === "asc" ? "ASC" : "DESC";

  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (q.from) {
    where.push("created_at >= ?");
    params.push(q.from);
  }
  if (q.to) {
    where.push("created_at <= ?");
    params.push(q.to);
  }
  if (q.type && q.type !== "all") {
    if (q.type === "deposit") where.push("event_type LIKE '%deposit%'");
    else if (q.type === "trade") where.push("event_type LIKE '%trade%'");
    else if (q.type === "commission") where.push("event_type LIKE '%commission%'");
    else {
      where.push("event_type = ?");
      params.push(q.type);
    }
  }
  if (q.user?.trim()) {
    where.push("(user_email LIKE ? OR user_label LIKE ? OR user_id LIKE ?)");
    const like = `%${q.user.trim()}%`;
    params.push(like, like, like);
  }
  if (q.search?.trim()) {
    where.push(
      `(event_type LIKE ? OR ref_note LIKE ? OR operator_note LIKE ? OR user_email LIKE ? OR ledger_ref LIKE ?)`,
    );
    const like = `%${q.search.trim()}%`;
    params.push(like, like, like, like, like);
  }
  if (q.flagged) where.push("flagged = 1");
  if (q.negativeOnly) where.push("new_cash < 0 OR prev_cash < 0");

  const whereSql = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_balance_event WHERE ${whereSql}`).get(...params) as {
    c: number;
  }).c;

  const rows = db
    .prepare(
      `SELECT id, event_type, user_id, user_email, user_label, prev_cash, new_cash,
              prev_bonus, new_bonus, ledger_ref, ref_note, operator_note, flagged, actor_id, created_at
       FROM crm_balance_event WHERE ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as BalanceEventRow[];

  const eventTypes = (
    db.prepare("SELECT DISTINCT event_type FROM crm_balance_event ORDER BY event_type").all() as Array<{
      event_type: string;
    }>
  ).map((r) => r.event_type);

  const statsRow = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN flagged = 1 THEN 1 ELSE 0 END) AS flagged,
         SUM(CASE WHEN event_type LIKE '%deposit%' THEN 1 ELSE 0 END) AS deposits,
         SUM(CASE WHEN event_type LIKE '%trade%' THEN 1 ELSE 0 END) AS trades,
         SUM(new_cash - prev_cash) AS netCashDelta
       FROM crm_balance_event WHERE ${whereSql}`,
    )
    .get(...params) as { total: number; flagged: number; deposits: number; trades: number; netCashDelta: number };

  return {
    rows,
    total,
    page,
    limit,
    eventTypes,
    stats: {
      total: statsRow.total ?? 0,
      flagged: statsRow.flagged ?? 0,
      deposits: statsRow.deposits ?? 0,
      trades: statsRow.trades ?? 0,
      netCashDelta: roundMoney(statsRow.netCashDelta ?? 0),
    },
  };
}

export function getBalanceEvent(id: number): BalanceEventRow | null {
  ensureBalanceEventsSchema();
  return (
    getDb()
      .prepare(
        `SELECT id, event_type, user_id, user_email, user_label, prev_cash, new_cash,
                prev_bonus, new_bonus, ledger_ref, ref_note, operator_note, flagged, actor_id, created_at
         FROM crm_balance_event WHERE id = ?`,
      )
      .get(id) as BalanceEventRow | undefined
  ) ?? null;
}

export function updateBalanceEventAnnotation(
  id: number,
  patch: { operatorNote?: string | null; flagged?: boolean },
): BalanceEventRow | null {
  ensureBalanceEventsSchema();
  const db = getDb();
  if (!db.prepare("SELECT id FROM crm_balance_event WHERE id = ?").get(id)) return null;

  if (patch.operatorNote !== undefined) {
    db.prepare("UPDATE crm_balance_event SET operator_note = ? WHERE id = ?").run(
      patch.operatorNote?.slice(0, 500) ?? null,
      id,
    );
  }
  if (patch.flagged !== undefined) {
    db.prepare("UPDATE crm_balance_event SET flagged = ? WHERE id = ?").run(patch.flagged ? 1 : 0, id);
  }
  return getBalanceEvent(id);
}

export function createBalanceEvent(input: UpsertBalanceEventInput): BalanceEventRow {
  ensureBalanceEventsSchema();
  const user = getUserById(input.userId);
  if (!user) throw new Error("User not found.");
  const meta = userMeta(input.userId);
  const r = getDb()
    .prepare(
      `INSERT INTO crm_balance_event
       (event_type, user_id, user_email, user_label, prev_cash, new_cash, prev_bonus, new_bonus,
        ledger_ref, ref_note, operator_note, actor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.eventType.slice(0, 80),
      input.userId,
      meta.email,
      meta.label,
      roundMoney(input.prevCash),
      roundMoney(input.newCash),
      roundMoney(input.prevBonus ?? 0),
      roundMoney(input.newBonus ?? 0),
      input.ledgerRef ?? null,
      input.refNote?.slice(0, 200) ?? null,
      input.operatorNote?.slice(0, 500) ?? null,
      input.actorId ?? null,
      input.createdAt ?? new Date().toISOString(),
    );
  return getBalanceEvent(Number(r.lastInsertRowid))!;
}

export function updateBalanceEvent(id: number, input: UpsertBalanceEventInput): BalanceEventRow | null {
  ensureBalanceEventsSchema();
  const db = getDb();
  if (!db.prepare("SELECT id FROM crm_balance_event WHERE id = ?").get(id)) return null;
  const meta = userMeta(input.userId);
  db.prepare(
    `UPDATE crm_balance_event SET
       event_type = ?, user_id = ?, user_email = ?, user_label = ?,
       prev_cash = ?, new_cash = ?, prev_bonus = ?, new_bonus = ?,
       ledger_ref = ?, ref_note = ?, operator_note = ?, created_at = COALESCE(?, created_at)
     WHERE id = ?`,
  ).run(
    input.eventType.slice(0, 80),
    input.userId,
    meta.email,
    meta.label,
    roundMoney(input.prevCash),
    roundMoney(input.newCash),
    roundMoney(input.prevBonus ?? 0),
    roundMoney(input.newBonus ?? 0),
    input.ledgerRef ?? null,
    input.refNote?.slice(0, 200) ?? null,
    input.operatorNote?.slice(0, 500) ?? null,
    input.createdAt ?? null,
    id,
  );
  return getBalanceEvent(id);
}

export function exportBalanceEventsCsv(q: BalanceEventQuery): string {
  const { rows } = listBalanceEvents({ ...q, page: 1, limit: 5000 });
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header =
    "Id,Date,Type,User Email,Prev Cash,New Cash,Cash Delta,Prev Bonus,New Bonus,Prev Total,New Total,Ledger Ref,Note,Flagged";
  const lines = rows.map((r) => {
    const delta = roundMoney(r.new_cash - r.prev_cash);
    return [
      r.id,
      r.created_at,
      r.event_type,
      r.user_email,
      r.prev_cash.toFixed(8),
      r.new_cash.toFixed(8),
      delta.toFixed(8),
      r.prev_bonus.toFixed(8),
      r.new_bonus.toFixed(8),
      (r.prev_cash + r.prev_bonus).toFixed(8),
      (r.new_cash + r.new_bonus).toFixed(8),
      r.ledger_ref,
      r.operator_note ?? r.ref_note,
      r.flagged ? "yes" : "no",
    ]
      .map(esc)
      .join(",");
  });
  return [header, ...lines].join("\n");
}
