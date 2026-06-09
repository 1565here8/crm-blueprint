/**
 * CRM History Logs — operator audit trail (legacy broker CRM parity, Node-native).
 */
import { getDb } from "./db";

export type HistoryLogRow = {
  id: number;
  action_type: string;
  executed_by: string | null;
  route_name: string | null;
  actioned_on: string | null;
  actioned_on_id: string | null;
  current_owner: string | null;
  prev_owner: string | null;
  prev_status: string | null;
  new_status: string | null;
  detail: string | null;
  meta_json: string | null;
  operator_note: string | null;
  amount: number | null;
  currency: string | null;
  prev_value: string | null;
  new_value: string | null;
  comments: string | null;
  changed_status: string | null;
  crm_id: string | null;
  flagged: number;
  created_at: string;
};

export type LogHistoryInput = {
  actionType: string;
  executedBy?: string | null;
  routeName?: string | null;
  actionedOn?: string | null;
  actionedOnId?: string | null;
  currentOwner?: string | null;
  prevOwner?: string | null;
  prevStatus?: string | null;
  newStatus?: string | null;
  detail?: string | null;
  meta?: Record<string, unknown>;
  amount?: number | null;
  currency?: string | null;
  prevValue?: string | null;
  newValue?: string | null;
  comments?: string | null;
  changedStatus?: string | null;
  crmId?: string | null;
};

export type HistoryLogQuery = {
  from?: string;
  to?: string;
  action?: string;
  agent?: string;
  user?: string;
  search?: string;
  comment?: string;
  changedStatus?: string;
  crmId?: string;
  flagged?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

let schemaReady = false;

function ensureHistorySchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_history_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action_type TEXT NOT NULL,
      executed_by TEXT,
      route_name TEXT,
      actioned_on TEXT,
      actioned_on_id TEXT,
      current_owner TEXT,
      prev_owner TEXT,
      prev_status TEXT,
      new_status TEXT,
      detail TEXT,
      meta_json TEXT,
      operator_note TEXT,
      flagged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_created ON crm_history_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_history_action ON crm_history_log(action_type);
    CREATE INDEX IF NOT EXISTS idx_history_executed ON crm_history_log(executed_by);
  `);

  for (const sql of [
    "ALTER TABLE crm_history_log ADD COLUMN amount REAL",
    "ALTER TABLE crm_history_log ADD COLUMN currency TEXT",
    "ALTER TABLE crm_history_log ADD COLUMN prev_value TEXT",
    "ALTER TABLE crm_history_log ADD COLUMN new_value TEXT",
    "ALTER TABLE crm_history_log ADD COLUMN comments TEXT",
    "ALTER TABLE crm_history_log ADD COLUMN changed_status TEXT",
    "ALTER TABLE crm_history_log ADD COLUMN crm_id TEXT",
  ]) {
    try {
      db.exec(sql);
    } catch {
      /* column exists */
    }
  }

  try {
    const count = db.prepare("SELECT COUNT(*) AS c FROM crm_history_log").get() as { c: number };
    if (count.c === 0) {
      const legacy = db
        .prepare(
          `SELECT message, actor, meta_json, created_at
           FROM platform_event_log WHERE kind = 'history' ORDER BY id ASC`,
        )
        .all() as Array<{ message: string; actor: string | null; meta_json: string | null; created_at: string }>;
      const ins = db.prepare(
        `INSERT INTO crm_history_log
         (action_type, executed_by, route_name, detail, meta_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const row of legacy) {
        ins.run("maintenance", row.actor, "superAdminOps", row.message, row.meta_json, row.created_at);
      }
    }
  } catch {
    /* platform_event_log optional */
  }

  schemaReady = true;
}

const HISTORY_SELECT = `id, action_type, executed_by, route_name, actioned_on, actioned_on_id,
  current_owner, prev_owner, prev_status, new_status, detail, meta_json, operator_note,
  amount, currency, prev_value, new_value, comments, changed_status, crm_id,
  flagged, created_at`;

export function logHistoryEvent(input: LogHistoryInput): number {
  ensureHistorySchema();
  const changedStatus =
    input.changedStatus?.slice(0, 120) ??
    (input.prevStatus && input.newStatus ? `${input.prevStatus} → ${input.newStatus}` : null);
  const r = getDb()
    .prepare(
      `INSERT INTO crm_history_log
       (action_type, executed_by, route_name, actioned_on, actioned_on_id,
        current_owner, prev_owner, prev_status, new_status, detail, meta_json,
        amount, currency, prev_value, new_value, comments, changed_status, crm_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.actionType.slice(0, 60),
      input.executedBy ?? null,
      input.routeName?.slice(0, 200) ?? null,
      input.actionedOn?.slice(0, 200) ?? null,
      input.actionedOnId ?? null,
      input.currentOwner?.slice(0, 120) ?? null,
      input.prevOwner?.slice(0, 120) ?? null,
      input.prevStatus?.slice(0, 60) ?? null,
      input.newStatus?.slice(0, 60) ?? null,
      input.detail?.slice(0, 500) ?? null,
      input.meta ? JSON.stringify(input.meta) : null,
      input.amount ?? null,
      input.currency?.slice(0, 12) ?? null,
      input.prevValue?.slice(0, 120) ?? input.prevStatus?.slice(0, 120) ?? null,
      input.newValue?.slice(0, 120) ?? input.newStatus?.slice(0, 120) ?? null,
      input.comments?.slice(0, 500) ?? input.detail?.slice(0, 500) ?? null,
      changedStatus,
      input.crmId?.slice(0, 64) ?? input.actionedOnId ?? null,
      new Date().toISOString(),
    );
  return Number(r.lastInsertRowid);
}

const SORT_COLS: Record<string, string> = {
  id: "id",
  created_at: "created_at",
  action_type: "action_type",
  executed_by: "executed_by",
  actioned_on: "actioned_on",
};

export function listHistoryLogs(q: HistoryLogQuery): {
  rows: HistoryLogRow[];
  total: number;
  page: number;
  limit: number;
  actionTypes: string[];
  stats: { total: number; flagged: number; logins: number; statusChanges: number; uniqueAgents: number };
} {
  ensureHistorySchema();
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
  if (q.action && q.action !== "all") {
    where.push("action_type = ?");
    params.push(q.action);
  }
  if (q.agent?.trim()) {
    where.push("(executed_by LIKE ? OR current_owner LIKE ? OR prev_owner LIKE ?)");
    const like = `%${q.agent.trim()}%`;
    params.push(like, like, like);
  }
  if (q.user?.trim()) {
    where.push("(actioned_on LIKE ? OR executed_by LIKE ?)");
    const like = `%${q.user.trim()}%`;
    params.push(like, like);
  }
  if (q.search?.trim()) {
    where.push(
      `(detail LIKE ? OR route_name LIKE ? OR actioned_on LIKE ? OR executed_by LIKE ? OR operator_note LIKE ? OR comments LIKE ? OR crm_id LIKE ?)`,
    );
    const like = `%${q.search.trim()}%`;
    params.push(like, like, like, like, like, like, like);
  }
  if (q.comment?.trim()) {
    where.push("(comments LIKE ? OR detail LIKE ? OR operator_note LIKE ?)");
    const like = `%${q.comment.trim()}%`;
    params.push(like, like, like);
  }
  if (q.changedStatus?.trim()) {
    where.push(
      "(changed_status LIKE ? OR prev_status LIKE ? OR new_status LIKE ? OR (prev_status || ' → ' || new_status) LIKE ?)",
    );
    const like = `%${q.changedStatus.trim()}%`;
    params.push(like, like, like, like);
  }
  if (q.crmId?.trim()) {
    where.push("(crm_id LIKE ? OR actioned_on_id LIKE ?)");
    const like = `%${q.crmId.trim()}%`;
    params.push(like, like);
  }
  if (q.flagged) {
    where.push("flagged = 1");
  }

  const whereSql = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_history_log WHERE ${whereSql}`).get(...params) as {
    c: number;
  }).c;

  const rows = db
    .prepare(
      `SELECT ${HISTORY_SELECT}
       FROM crm_history_log WHERE ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as HistoryLogRow[];

  const actionTypes = (
    db.prepare("SELECT DISTINCT action_type FROM crm_history_log ORDER BY action_type").all() as Array<{
      action_type: string;
    }>
  ).map((r) => r.action_type);

  const statsRow = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN flagged = 1 THEN 1 ELSE 0 END) AS flagged,
         SUM(CASE WHEN action_type = 'login' THEN 1 ELSE 0 END) AS logins,
         SUM(CASE WHEN action_type IN ('status_change','bulk_status_change','owner_change') THEN 1 ELSE 0 END) AS statusChanges,
         COUNT(DISTINCT COALESCE(NULLIF(TRIM(executed_by), ''), NULLIF(TRIM(current_owner), ''))) AS uniqueAgents
       FROM crm_history_log WHERE ${whereSql}`,
    )
    .get(...params) as { total: number; flagged: number; logins: number; statusChanges: number; uniqueAgents: number };

  return {
    rows,
    total,
    page,
    limit,
    actionTypes,
    stats: {
      total: statsRow.total ?? 0,
      flagged: statsRow.flagged ?? 0,
      logins: statsRow.logins ?? 0,
      statusChanges: statsRow.statusChanges ?? 0,
      uniqueAgents: statsRow.uniqueAgents ?? 0,
    },
  };
}

export function updateHistoryLogAnnotation(
  id: number,
  patch: { operatorNote?: string | null; flagged?: boolean },
): HistoryLogRow | null {
  ensureHistorySchema();
  const db = getDb();
  const cur = db.prepare("SELECT id FROM crm_history_log WHERE id = ?").get(id);
  if (!cur) return null;

  if (patch.operatorNote !== undefined) {
    db.prepare("UPDATE crm_history_log SET operator_note = ? WHERE id = ?").run(
      patch.operatorNote?.slice(0, 500) ?? null,
      id,
    );
  }
  if (patch.flagged !== undefined) {
    db.prepare("UPDATE crm_history_log SET flagged = ? WHERE id = ?").run(patch.flagged ? 1 : 0, id);
  }

  return db
    .prepare(`SELECT ${HISTORY_SELECT} FROM crm_history_log WHERE id = ?`)
    .get(id) as HistoryLogRow;
}

export function exportHistoryLogsCsv(q: HistoryLogQuery): string {
  const { rows } = listHistoryLogs({ ...q, page: 1, limit: 5000 });
  const esc = (v: string | null | undefined) => {
    const s = v ?? "";
    return `"${s.replace(/"/g, '""')}"`;
  };
  const header =
    "Date Created,Type,Executed By,Actioned On,Amount,Currency,Prev Value,New Value,Comments,Changed Status,Crm Id,Detail,Note,Flagged";
  const lines = rows.map((r) =>
    [
      r.created_at,
      r.action_type,
      r.executed_by,
      r.actioned_on,
      r.amount,
      r.currency,
      r.prev_value ?? r.prev_status,
      r.new_value ?? r.new_status,
      r.comments ?? r.detail,
      r.changed_status ?? (r.prev_status && r.new_status ? `${r.prev_status} → ${r.new_status}` : ""),
      r.crm_id ?? r.actioned_on_id,
      r.detail,
      r.operator_note,
      r.flagged ? "yes" : "no",
    ]
      .map((c) => esc(c == null ? "" : String(c)))
      .join(","),
  );
  return [header, ...lines].join("\n");
}
