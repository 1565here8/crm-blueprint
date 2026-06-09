/**
 * CRM client pipeline statuses — labels, colours, and per-status client counts.
 */
import { BROKER_PIPELINE_STATUSES } from "../shared/crmPipelineStatuses";
import { getDb } from "./db";

export type ClientStatusRow = {
  id: number;
  name: string;
  slug: string;
  color_hex: string;
  sort_order: number;
  is_system: number;
  active: number;
  created_at: string;
  updated_at: string;
  client_count?: number;
};

export type ClientStatusQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  activeOnly?: boolean;
};

export type ClientStatusCreateInput = {
  name: string;
  slug?: string;
  colorHex?: string;
  sortOrder?: number;
  active?: boolean;
};

export type ClientStatusUpdateInput = {
  name?: string;
  slug?: string;
  colorHex?: string;
  sortOrder?: number;
  active?: boolean;
};

export type StatusCountRow = {
  id: number;
  name: string;
  slug: string;
  color_hex: string;
  active: number;
  client_count: number;
};

const LEGACY_STATUSES: Array<{ name: string; color: string }> = [
  ...BROKER_PIPELINE_STATUSES.map((s) => ({ name: s.name, color: s.color })),
  { name: "Registered", color: "#14b8a6" },
  { name: "Call Again", color: "#0ea5e9" },
  { name: "Interested", color: "#84cc16" },
  { name: "Not Interested", color: "#78716c" },
  { name: "Depositor", color: "#059669" },
  { name: "Verified", color: "#10b981" },
  { name: "Blocked", color: "#1f2937" },
  { name: "Follow Up", color: "#2563eb" },
  { name: "KYC Pending", color: "#8b5cf6" },
];

let schemaReady = false;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeHex(hex: string): string {
  const raw = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  return "#64748b";
}

function seedClientStatuses(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO crm_client_status
     (name, slug, color_hex, sort_order, is_system, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
  );
  LEGACY_STATUSES.forEach((row, idx) => {
    ins.run(row.name, slugify(row.name), normalizeHex(row.color), idx + 1, now, now);
  });
}

/** Insert broker pipeline labels missing from an already-seeded DB. */
function ensureBrokerPipelineStatuses(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const maxRow = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM crm_client_status").get() as {
    m: number;
  };
  let sort = maxRow.m;
  const ins = db.prepare(
    `INSERT INTO crm_client_status
     (name, slug, color_hex, sort_order, is_system, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
  );
  for (const row of BROKER_PIPELINE_STATUSES) {
    const exists = db
      .prepare("SELECT id FROM crm_client_status WHERE LOWER(name) = LOWER(?)")
      .get(row.name) as { id: number } | undefined;
    if (exists) continue;
    sort += 1;
    ins.run(row.name, slugify(row.name), normalizeHex(row.color), sort, now, now);
  }
}

function ensureProfileStatusColumn(): void {
  const db = getDb();
  const hasProfiles = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user_profiles'")
    .get();
  if (!hasProfiles) return;
  try {
    db.exec(
      `ALTER TABLE user_profiles ADD COLUMN client_status_id INTEGER REFERENCES crm_client_status(id)`,
    );
  } catch {
    /* column exists */
  }
}

function backfillProfileStatusIds(): void {
  const db = getDb();
  const hasProfiles = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'user_profiles'")
    .get();
  if (!hasProfiles) return;
  const statuses = db
    .prepare("SELECT id, name FROM crm_client_status")
    .all() as Array<{ id: number; name: string }>;
  const byName = new Map(statuses.map((s) => [s.name.toLowerCase(), s.id]));
  const profiles = db
    .prepare("SELECT user_id, crm_status, client_status_id FROM user_profiles")
    .all() as Array<{ user_id: string; crm_status: string; client_status_id: number | null }>;

  const upd = db.prepare(
    "UPDATE user_profiles SET client_status_id = ?, crm_status = ? WHERE user_id = ?",
  );
  for (const p of profiles) {
    const match = byName.get(String(p.crm_status ?? "").trim().toLowerCase());
    if (match && p.client_status_id !== match) {
      const name = statuses.find((s) => s.id === match)?.name ?? p.crm_status;
      upd.run(match, name, p.user_id);
    } else if (!p.client_status_id && p.crm_status?.trim()) {
      const newId = byName.get(p.crm_status.trim().toLowerCase());
      if (newId) upd.run(newId, p.crm_status.trim(), p.user_id);
    }
  }
}

export function ensureClientStatusesSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_client_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      color_hex TEXT NOT NULL DEFAULT '#64748b',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_client_status_name ON crm_client_status(name);
    CREATE INDEX IF NOT EXISTS idx_client_status_active ON crm_client_status(active);
    CREATE INDEX IF NOT EXISTS idx_client_status_sort ON crm_client_status(sort_order);
  `);

  ensureProfileStatusColumn();

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_client_status").get() as { c: number };
  if (count.c === 0) seedClientStatuses();
  ensureBrokerPipelineStatuses();
  backfillProfileStatusIds();

  schemaReady = true;
}

const SORT_COLS: Record<string, string> = {
  id: "s.id",
  name: "s.name",
  slug: "s.slug",
  color_hex: "s.color_hex",
  sort_order: "s.sort_order",
  active: "s.active",
  created_at: "s.created_at",
  updated_at: "s.updated_at",
  client_count: "client_count",
};

function countJoinSql(): string {
  return `
    SELECT s.id, s.name, s.slug, s.color_hex, s.sort_order, s.is_system, s.active,
           s.created_at, s.updated_at,
           (
             SELECT COUNT(*)
             FROM user_profiles p
             JOIN users u ON u.id = p.user_id AND u.role = 'user'
             WHERE p.client_status_id = s.id
                OR (p.client_status_id IS NULL AND LOWER(p.crm_status) = LOWER(s.name))
           ) AS client_count
    FROM crm_client_status s
  `;
}

export function listClientStatuses(q: ClientStatusQuery): {
  rows: ClientStatusRow[];
  total: number;
  page: number;
  limit: number;
} {
  ensureClientStatusesSchema();
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(10, q.limit ?? 10));
  const offset = (page - 1) * limit;
  const sortCol = SORT_COLS[q.sortBy ?? ""] ?? "s.sort_order";
  const sortDir = q.sortDir === "desc" ? "DESC" : "ASC";

  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (q.activeOnly) where.push("s.active = 1");

  if (q.search?.trim()) {
    where.push("(s.name LIKE ? OR s.slug LIKE ?)");
    const like = `%${q.search.trim()}%`;
    params.push(like, like);
  }

  const whereSql = where.join(" AND ");
  const baseFrom = `(${countJoinSql()}) AS s WHERE ${whereSql}`;

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM ${baseFrom}`).get(...params) as { c: number }).c;

  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.slug, s.color_hex, s.sort_order, s.is_system, s.active,
              s.created_at, s.updated_at, s.client_count
       FROM ${baseFrom}
       ORDER BY ${sortCol} ${sortDir}, s.id ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as ClientStatusRow[];

  return { rows, total, page, limit };
}

export function getClientStatus(id: number): ClientStatusRow | null {
  ensureClientStatusesSchema();
  const row = getDb()
    .prepare(`${countJoinSql()} WHERE s.id = ?`)
    .get(id) as ClientStatusRow | undefined;
  return row ?? null;
}

export function getStatusCounts(): {
  rows: StatusCountRow[];
  totalClients: number;
  unassigned: number;
} {
  ensureClientStatusesSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.slug, s.color_hex, s.active,
              (
                SELECT COUNT(*)
                FROM user_profiles p
                JOIN users u ON u.id = p.user_id AND u.role = 'user'
                WHERE p.client_status_id = s.id
                   OR (p.client_status_id IS NULL AND LOWER(p.crm_status) = LOWER(s.name))
              ) AS client_count
       FROM crm_client_status s
       WHERE s.active = 1
       ORDER BY client_count DESC, s.sort_order ASC, s.name ASC`,
    )
    .all() as StatusCountRow[];

  const totalClients = (db
    .prepare(
      `SELECT COUNT(*) AS c FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       WHERE u.role = 'user'`,
    )
    .get() as { c: number }).c;

  const assigned = rows.reduce((sum, r) => sum + r.client_count, 0);
  const unassigned = Math.max(0, totalClients - assigned);

  return { rows, totalClients, unassigned };
}

export function listActiveStatusNames(): string[] {
  ensureClientStatusesSchema();
  return getDb()
    .prepare(
      `SELECT name FROM crm_client_status
       WHERE active = 1
       ORDER BY sort_order ASC, name ASC`,
    )
    .all()
    .map((r) => String((r as { name: string }).name));
}

export function resolveStatusIdByName(name: string): number | null {
  ensureClientStatusesSchema();
  const row = getDb()
    .prepare("SELECT id FROM crm_client_status WHERE LOWER(name) = LOWER(?) AND active = 1")
    .get(name.trim()) as { id: number } | undefined;
  return row?.id ?? null;
}

function uniqueSlug(base: string, excludeId?: number): string {
  const db = getDb();
  let slug = base || "status";
  let n = 0;
  for (;;) {
    const row = db.prepare("SELECT id FROM crm_client_status WHERE slug = ?").get(slug) as
      | { id: number }
      | undefined;
    if (!row || (excludeId !== undefined && row.id === excludeId)) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export function createClientStatus(input: ClientStatusCreateInput): ClientStatusRow {
  ensureClientStatusesSchema();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  const baseSlug = slugify(input.slug?.trim() || name);
  const slug = uniqueSlug(baseSlug);
  const now = new Date().toISOString();
  const color = normalizeHex(input.colorHex ?? "#64748b");
  const maxSort = getDb()
    .prepare("SELECT COALESCE(MAX(sort_order), 0) AS m FROM crm_client_status")
    .get() as { m: number };
  const sortOrder = input.sortOrder ?? maxSort.m + 1;

  const r = getDb()
    .prepare(
      `INSERT INTO crm_client_status
       (name, slug, color_hex, sort_order, is_system, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .run(name, slug, color, sortOrder, input.active === false ? 0 : 1, now, now);

  const created = getClientStatus(Number(r.lastInsertRowid));
  if (!created) throw new Error("Could not create status.");
  return created;
}

export function updateClientStatus(id: number, input: ClientStatusUpdateInput): ClientStatusRow | null {
  ensureClientStatusesSchema();
  const existing = getClientStatus(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Name is required.");

  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = uniqueSlug(slugify(input.slug.trim() || name), id);
  } else if (input.name !== undefined && input.name.trim() !== existing.name) {
    slug = uniqueSlug(slugify(name), id);
  }

  const color =
    input.colorHex !== undefined ? normalizeHex(input.colorHex) : existing.color_hex;
  const sortOrder =
    input.sortOrder !== undefined ? Math.max(0, Math.round(input.sortOrder)) : existing.sort_order;
  const active = input.active !== undefined ? (input.active ? 1 : 0) : existing.active;
  const now = new Date().toISOString();
  const db = getDb();

  db.prepare(
    `UPDATE crm_client_status
     SET name = ?, slug = ?, color_hex = ?, sort_order = ?, active = ?, updated_at = ?
     WHERE id = ?`,
  ).run(name, slug, color, sortOrder, active, now, id);

  if (name !== existing.name) {
    db.prepare(
      `UPDATE user_profiles SET crm_status = ? WHERE client_status_id = ?`,
    ).run(name, id);
    db.prepare(
      `UPDATE user_profiles SET client_status_id = ?, crm_status = ?
       WHERE client_status_id IS NULL AND LOWER(crm_status) = LOWER(?)`,
    ).run(id, name, existing.name);
  }

  return getClientStatus(id);
}

export function toggleClientStatusActive(id: number): ClientStatusRow | null {
  ensureClientStatusesSchema();
  const existing = getClientStatus(id);
  if (!existing) return null;

  const next = existing.active ? 0 : 1;
  const now = new Date().toISOString();
  getDb()
    .prepare("UPDATE crm_client_status SET active = ?, updated_at = ? WHERE id = ?")
    .run(next, now, id);
  return getClientStatus(id);
}

/** Sync profile FK when crm_status text is set directly. */
export function syncProfileStatusFromName(userId: string, crmStatus: string): void {
  ensureClientStatusesSchema();
  const statusId = resolveStatusIdByName(crmStatus);
  if (statusId) {
    getDb()
      .prepare("UPDATE user_profiles SET client_status_id = ?, crm_status = ? WHERE user_id = ?")
      .run(statusId, crmStatus.trim(), userId);
  } else {
    getDb()
      .prepare("UPDATE user_profiles SET client_status_id = NULL, crm_status = ? WHERE user_id = ?")
      .run(crmStatus.trim(), userId);
  }
}
