/**
 * Regional sales desks — language/territory floors (German, UK, LATAM, etc.).
 * Separate from desk_groups (role permission buckets).
 */
import { getDb } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";
import { listOnlineVisitors } from "./presence";

export type DeskRow = {
  id: number;
  name: string;
  slug: string;
  region_code: string;
  timezone: string;
  language: string;
  active: number;
  created_at: string;
  updated_at: string;
};

export type DeskListRow = DeskRow & {
  agent_count: number;
  client_count: number;
};

export type DeskAgentInfo = {
  userId: string;
  displayId: number;
  name: string;
  username: string;
  email: string;
  online: boolean;
};

export type DeskDetail = DeskListRow & {
  agents: DeskAgentInfo[];
};

export type DeskQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  activeOnly?: boolean;
};

export type DeskCreateInput = {
  name: string;
  slug?: string;
  regionCode?: string;
  timezone?: string;
  language?: string;
  active?: boolean;
  agentIds?: string[];
};

export type DeskUpdateInput = {
  name?: string;
  slug?: string;
  regionCode?: string;
  timezone?: string;
  language?: string;
  active?: boolean;
  agentIds?: string[];
};

const SEED_DESKS: Array<{
  name: string;
  slug: string;
  region_code: string;
  timezone: string;
  language: string;
}> = [
  { name: "German Desk", slug: "german", region_code: "DE", timezone: "Europe/Berlin", language: "de" },
  { name: "Indian Desk", slug: "indian", region_code: "IN", timezone: "Asia/Kolkata", language: "hi" },
  { name: "UK Desk", slug: "uk", region_code: "GB", timezone: "Europe/London", language: "en" },
  { name: "US Desk", slug: "us", region_code: "US", timezone: "America/New_York", language: "en" },
  { name: "LATAM Desk", slug: "latam", region_code: "LATAM", timezone: "America/Mexico_City", language: "es" },
  { name: "Arabic Desk", slug: "arabic", region_code: "MENA", timezone: "Asia/Dubai", language: "ar" },
];

const SORT_COLS: Record<string, string> = {
  id: "d.id",
  name: "d.name",
  region_code: "d.region_code",
  agent_count: "agent_count",
  client_count: "client_count",
  created_at: "d.created_at",
  updated_at: "d.updated_at",
};

let schemaReady = false;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function staffDisplayName(first: string, last: string, username: string): string {
  const n = [first, last].filter(Boolean).join(" ").trim();
  return n || username;
}

function uniqueSlug(base: string, excludeId?: number): string {
  ensureDesksSchema();
  const db = getDb();
  let slug = base || "desk";
  let n = 0;
  for (;;) {
    const row = db.prepare("SELECT id FROM crm_desk WHERE slug = ?").get(slug) as { id: number } | undefined;
    if (!row || (excludeId !== undefined && row.id === excludeId)) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export function ensureDesksSchema(): void {
  if (schemaReady) return;
  ensureUserProfilesSchema();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_desk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      region_code TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      language TEXT NOT NULL DEFAULT 'en',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_crm_desk_name ON crm_desk(name);
    CREATE INDEX IF NOT EXISTS idx_crm_desk_active ON crm_desk(active);
    CREATE INDEX IF NOT EXISTS idx_crm_desk_region ON crm_desk(region_code);

    CREATE TABLE IF NOT EXISTS crm_desk_agent (
      desk_id INTEGER NOT NULL REFERENCES crm_desk(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (desk_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_desk_agent_user ON crm_desk_agent(user_id);
  `);

  try {
    db.exec(`ALTER TABLE user_profiles ADD COLUMN desk_id INTEGER REFERENCES crm_desk(id)`);
  } catch {
    /* column exists */
  }
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_user_profiles_desk_id ON user_profiles(desk_id)`);
  } catch {
    /* index exists */
  }

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_desk").get() as { c: number };
  if (count.c === 0) {
    const now = new Date().toISOString();
    const ins = db.prepare(
      `INSERT INTO crm_desk (name, slug, region_code, timezone, language, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    );
    for (const d of SEED_DESKS) ins.run(d.name, d.slug, d.region_code, d.timezone, d.language, now, now);
  }

  schemaReady = true;
}

function deskAgentNamesSubquery(): string {
  return `
    SELECT TRIM(COALESCE(NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), u.username)) AS agent_name
    FROM crm_desk_agent da
    JOIN user_profiles p ON p.user_id = da.user_id
    JOIN users u ON u.id = da.user_id
    WHERE da.desk_id = d.id
    UNION
    SELECT TRIM(COALESCE(NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), u.username)) AS agent_name
    FROM user_profiles p
    JOIN users u ON u.id = p.user_id
    WHERE p.desk_id = d.id AND p.is_staff = 1
  `;
}

function listSelectSql(): string {
  const agentNames = deskAgentNamesSubquery();
  return `
    SELECT d.id, d.name, d.slug, d.region_code, d.timezone, d.language, d.active, d.created_at, d.updated_at,
      (
        SELECT COUNT(DISTINCT x.user_id) FROM (
          SELECT da.user_id FROM crm_desk_agent da WHERE da.desk_id = d.id
          UNION
          SELECT p.user_id FROM user_profiles p WHERE p.desk_id = d.id AND p.is_staff = 1
        ) x
      ) AS agent_count,
      (
        SELECT COUNT(*) FROM user_profiles cp
        JOIN users cu ON cu.id = cp.user_id AND cu.role = 'user'
        WHERE cp.desk_id = d.id
           OR cp.agent_name IN (${agentNames})
      ) AS client_count
    FROM crm_desk d
  `;
}

export function listDesks(q: DeskQuery): {
  rows: DeskListRow[];
  total: number;
  page: number;
  limit: number;
} {
  ensureDesksSchema();
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(5, q.limit ?? 10));
  const offset = (page - 1) * limit;
  const sortCol = SORT_COLS[q.sortBy ?? ""] ?? "d.id";
  const sortDir = q.sortDir === "desc" ? "DESC" : "ASC";

  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (q.activeOnly) where.push("d.active = 1");

  if (q.search?.trim()) {
    where.push("(d.name LIKE ? OR d.slug LIKE ? OR d.region_code LIKE ? OR d.language LIKE ?)");
    const like = `%${q.search.trim()}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.join(" AND ");
  const base = listSelectSql();
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_desk d WHERE ${whereSql}`).get(...params) as { c: number }).c;

  const rows = db
    .prepare(`${base} WHERE ${whereSql} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as DeskListRow[];

  return { rows, total, page, limit };
}

export function listActiveDesksBrief(): Array<{ id: number; name: string; slug: string; language: string }> {
  ensureDesksSchema();
  return getDb()
    .prepare("SELECT id, name, slug, language FROM crm_desk WHERE active = 1 ORDER BY name")
    .all() as Array<{ id: number; name: string; slug: string; language: string }>;
}

function loadDeskAgents(deskId: number): DeskAgentInfo[] {
  ensureDesksSchema();
  const online = new Set(
    listOnlineVisitors()
      .filter((v) => v.userId)
      .map((v) => v.userId as string),
  );
  const rows = getDb()
    .prepare(
      `SELECT DISTINCT p.user_id, p.display_id, p.first_name, p.last_name, p.email, u.username
       FROM user_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.is_staff = 1 AND (
         p.user_id IN (SELECT user_id FROM crm_desk_agent WHERE desk_id = ?)
         OR p.desk_id = ?
       )
       ORDER BY p.display_id DESC`,
    )
    .all(deskId, deskId) as Array<{
    user_id: string;
    display_id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
  }>;

  return rows.map((r) => ({
    userId: r.user_id,
    displayId: Number(r.display_id),
    name: staffDisplayName(r.first_name, r.last_name, r.username),
    username: r.username,
    email: r.email,
    online: online.has(r.user_id),
  }));
}

export function getDesk(id: number): DeskDetail | null {
  ensureDesksSchema();
  const row = getDb()
    .prepare(`${listSelectSql()} WHERE d.id = ?`)
    .get(id) as DeskListRow | undefined;
  if (!row) return null;
  return { ...row, agents: loadDeskAgents(id) };
}

export function getDeskStats(): {
  totalDesks: number;
  activeDesks: number;
  agentsOnline: number;
  clientsAssigned: number;
} {
  ensureDesksSchema();
  const db = getDb();
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active
       FROM crm_desk`,
    )
    .get() as { total: number; active: number };

  const deskIds = db.prepare("SELECT id FROM crm_desk WHERE active = 1").all() as Array<{ id: number }>;
  const staffIds = new Set<string>();
  for (const { id } of deskIds) {
    for (const a of loadDeskAgents(id)) staffIds.add(a.userId);
  }

  const online = listOnlineVisitors()
    .filter((v) => v.userId && staffIds.has(v.userId))
    .map((v) => v.userId as string);
  const agentsOnline = new Set(online).size;

  let clientsAssigned = 0;
  for (const { id } of deskIds) {
    const d = getDesk(id);
    if (d) clientsAssigned += d.client_count;
  }

  return {
    totalDesks: Number(totals.total ?? 0),
    activeDesks: Number(totals.active ?? 0),
    agentsOnline,
    clientsAssigned,
  };
}

function syncDeskAgents(deskId: number, agentIds: string[]): void {
  ensureDesksSchema();
  const db = getDb();
  const desk = db.prepare("SELECT name FROM crm_desk WHERE id = ?").get(deskId) as { name: string } | undefined;
  if (!desk) throw new Error("Desk not found.");

  const cleaned = [...new Set(agentIds.filter(Boolean))];
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM crm_desk_agent WHERE desk_id = ?").run(deskId);
    db.prepare("UPDATE user_profiles SET desk_id = NULL WHERE desk_id = ? AND is_staff = 1").run(deskId);

    const ins = db.prepare(
      "INSERT INTO crm_desk_agent (desk_id, user_id, created_at) VALUES (?, ?, ?)",
    );
    const setStaffDesk = db.prepare(
      "UPDATE user_profiles SET desk_id = ?, desk = ? WHERE user_id = ? AND is_staff = 1",
    );

    for (const userId of cleaned) {
      const staff = db
        .prepare("SELECT is_staff FROM user_profiles WHERE user_id = ?")
        .get(userId) as { is_staff: number } | undefined;
      if (!staff?.is_staff) continue;
      ins.run(deskId, userId, now);
      setStaffDesk.run(deskId, desk.name, userId);
    }
  });
  tx();
}

export function createDesk(input: DeskCreateInput): DeskDetail {
  ensureDesksSchema();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  const slug = uniqueSlug(slugify(input.slug?.trim() || name));
  const now = new Date().toISOString();
  const r = getDb()
    .prepare(
      `INSERT INTO crm_desk (name, slug, region_code, timezone, language, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      slug,
      (input.regionCode ?? "").trim().toUpperCase(),
      (input.timezone ?? "UTC").trim() || "UTC",
      (input.language ?? "en").trim().toLowerCase() || "en",
      input.active === false ? 0 : 1,
      now,
      now,
    );

  const id = Number(r.lastInsertRowid);
  if (input.agentIds?.length) syncDeskAgents(id, input.agentIds);

  const created = getDesk(id);
  if (!created) throw new Error("Could not create desk.");
  return created;
}

export function updateDesk(id: number, input: DeskUpdateInput): DeskDetail | null {
  ensureDesksSchema();
  const existing = getDesk(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Name is required.");

  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = uniqueSlug(slugify(input.slug.trim() || name), id);
  } else if (input.name !== undefined && input.name.trim() !== existing.name) {
    slug = uniqueSlug(slugify(name), id);
  }

  const regionCode = input.regionCode !== undefined ? input.regionCode.trim().toUpperCase() : existing.region_code;
  const timezone = input.timezone !== undefined ? input.timezone.trim() || "UTC" : existing.timezone;
  const language = input.language !== undefined ? input.language.trim().toLowerCase() || "en" : existing.language;
  const active = input.active !== undefined ? (input.active ? 1 : 0) : existing.active;
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `UPDATE crm_desk
       SET name = ?, slug = ?, region_code = ?, timezone = ?, language = ?, active = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(name, slug, regionCode, timezone, language, active, now, id);

  if (input.agentIds !== undefined) syncDeskAgents(id, input.agentIds);
  else if (input.name !== undefined) {
    getDb()
      .prepare("UPDATE user_profiles SET desk = ? WHERE desk_id = ? AND is_staff = 1")
      .run(name, id);
  }

  return getDesk(id);
}

export function deleteDesk(id: number): boolean {
  ensureDesksSchema();
  const existing = getDesk(id);
  if (!existing) return false;
  if (existing.agent_count > 0 || existing.client_count > 0) {
    throw new Error("Desk has assigned agents or clients — deactivate instead of delete.");
  }
  getDb().prepare("DELETE FROM crm_desk WHERE id = ?").run(id);
  return true;
}

/** SQL fragment + params to filter CRM clients belonging to a regional desk. */
export function deskClientFilterClause(deskId: number): { sql: string; params: unknown[] } {
  ensureDesksSchema();
  const desk = getDesk(deskId);
  if (!desk) return { sql: " AND 1=0", params: [] };

  const agentNames = desk.agents.map((a) => a.name);
  if (agentNames.length === 0) {
    return { sql: " AND p.desk_id = ?", params: [deskId] };
  }
  const ph = agentNames.map(() => "?").join(", ");
  return {
    sql: ` AND (p.desk_id = ? OR p.agent_name IN (${ph}))`,
    params: [deskId, ...agentNames],
  };
}

export function regionFlag(regionCode: string): string {
  const map: Record<string, string> = {
    DE: "🇩🇪",
    IN: "🇮🇳",
    GB: "🇬🇧",
    US: "🇺🇸",
    LATAM: "🌎",
    MENA: "🇸🇦",
    AE: "🇦🇪",
    FR: "🇫🇷",
    ES: "🇪🇸",
    IT: "🇮🇹",
  };
  return map[regionCode.toUpperCase()] ?? "🌐";
}
