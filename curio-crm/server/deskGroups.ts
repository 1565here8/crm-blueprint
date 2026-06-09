/**
 * Desk groups table — role buckets for auto-assign, IP rules, and permission matrices.
 */
import { getDb } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";

const SEED_GROUPS: Array<{ id: string; name: string }> = [
  { id: "admin", name: "admin" },
  { id: "regular", name: "regular" },
  { id: "manager", name: "manager" },
  { id: "support", name: "support" },
  { id: "rep", name: "rep" },
  { id: "affiliate", name: "affiliate" },
  { id: "rep-conversion", name: "rep-conversion" },
  { id: "conversion-manager", name: "Conversion Manager" },
  { id: "rep-retention", name: "rep-retention" },
  { id: "retention-manager", name: "Retention Manager" },
];

let schemaReady = false;

export function ensureDeskGroupsSchema(): void {
  if (schemaReady) return;
  ensureUserProfilesSchema();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS desk_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      allowed_ips TEXT NOT NULL DEFAULT 'All',
      updated_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  const ins = db.prepare(
    "INSERT OR IGNORE INTO desk_groups (id, name, allowed_ips, updated_at) VALUES (?, ?, 'All', ?)",
  );
  for (const g of SEED_GROUPS) ins.run(g.id, g.name, now);

  schemaReady = true;
}

export function listDeskGroups(): Array<{ id: string; name: string; allowed_ips: string; updated_at: string }> {
  ensureDeskGroupsSchema();
  return getDb()
    .prepare("SELECT id, name, allowed_ips, updated_at FROM desk_groups ORDER BY name")
    .all() as Array<{ id: string; name: string; allowed_ips: string; updated_at: string }>;
}

export function listDeskGroupsPaginated(q: {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}): { rows: Array<{ id: string; name: string; allowed_ips: string; updated_at: string }>; total: number; page: number; limit: number } {
  ensureDeskGroupsSchema();
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(5, q.limit ?? 10));
  const offset = (page - 1) * limit;
  const sortCol = q.sortBy === "name" ? "name" : "id";
  const sortDir = q.sortDir === "desc" ? "DESC" : "ASC";
  const search = (q.search ?? "").trim();
  const where = search ? "WHERE id LIKE ? OR name LIKE ?" : "";
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM desk_groups ${where}`).get(...params) as { c: number }
  ).c;
  const rows = db
    .prepare(
      `SELECT id, name, allowed_ips, updated_at FROM desk_groups ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Array<{ id: string; name: string; allowed_ips: string; updated_at: string }>;

  return { rows, total, page, limit };
}

export function setAllGroupsIpsToAll(): { groupsUpdated: number } {
  ensureDeskGroupsSchema();
  const now = new Date().toISOString();
  const r = getDb().prepare("UPDATE desk_groups SET allowed_ips = 'All', updated_at = ?").run(now);
  return { groupsUpdated: r.changes };
}
