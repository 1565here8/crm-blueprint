/**
 * Security → View Log — staff action audit (legacy CRM parity).
 */
import { getDb } from "./db";

export type SecurityViewLogRow = {
  id: number;
  agentId: string;
  counter: number;
  action: string;
  ip: string | null;
  dateCreated: string;
};

export type SecurityViewLogQuery = {
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

let schemaReady = false;

function ensureSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_security_view_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 1,
      action TEXT NOT NULL,
      ip TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sec_view_agent ON crm_security_view_log(agent_id);
    CREATE INDEX IF NOT EXISTS idx_sec_view_created ON crm_security_view_log(created_at DESC);
  `);
  schemaReady = true;
  seedSamplesIfEmpty();
}

function seedSamplesIfEmpty(): void {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS c FROM crm_security_view_log").get() as { c: number };
  if (row.c > 0) return;
  const now = new Date();
  const samples = [
    { agentId: "admin", action: "login", offsetMin: 5 },
    { agentId: "admin", action: "view_dashboard", offsetMin: 4 },
    { agentId: "agent1", action: "login", offsetMin: 12 },
    { agentId: "agent1", action: "open_client_list", offsetMin: 11 },
  ];
  for (const s of samples) {
    const t = new Date(now.getTime() - s.offsetMin * 60_000).toISOString();
    const counter = nextCounter(s.agentId);
    db.prepare(
      "INSERT INTO crm_security_view_log (agent_id, counter, action, ip, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(s.agentId, counter, s.action, "127.0.0.1", t);
  }
}

function nextCounter(agentId: string): number {
  const db = getDb();
  const max = db
    .prepare("SELECT MAX(counter) AS m FROM crm_security_view_log WHERE agent_id = ?")
    .get(agentId) as { m: number | null };
  const n = (max.m ?? 0) + 1;
  return n;
}

export function logSecurityViewEvent(opts: {
  agentId: string;
  action: string;
  ip?: string | null;
}): SecurityViewLogRow {
  ensureSchema();
  const db = getDb();
  const counter = nextCounter(opts.agentId);
  const created_at = new Date().toISOString();
  const result = db
    .prepare(
      "INSERT INTO crm_security_view_log (agent_id, counter, action, ip, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(opts.agentId, counter, opts.action, opts.ip ?? null, created_at);
  return {
    id: Number(result.lastInsertRowid),
    agentId: opts.agentId,
    counter,
    action: opts.action,
    ip: opts.ip ?? null,
    dateCreated: created_at,
  };
}

function parseDayBound(iso: string, end: boolean): string {
  const d = iso.slice(0, 10);
  return end ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`;
}

export function listSecurityViewLogs(query: SecurityViewLogQuery): {
  rows: SecurityViewLogRow[];
  total: number;
  page: number;
  limit: number;
} {
  ensureSchema();
  const db = getDb();
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(200, Math.max(1, query.limit ?? 50));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];

  if (query.userId?.trim()) {
    where.push("(agent_id LIKE ? OR agent_id = ?)");
    const q = query.userId.trim();
    params.push(`%${q}%`, q);
  }
  if (query.from?.trim()) {
    where.push("created_at >= ?");
    params.push(parseDayBound(query.from, false));
  }
  if (query.to?.trim()) {
    where.push("created_at <= ?");
    params.push(parseDayBound(query.to, true));
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM crm_security_view_log ${clause}`).get(...params) as { c: number }
  ).c;

  const rows = db
    .prepare(
      `SELECT id, agent_id AS agentId, counter, action, ip, created_at AS dateCreated
       FROM crm_security_view_log ${clause}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as SecurityViewLogRow[];

  return { rows, total, page, limit };
}
