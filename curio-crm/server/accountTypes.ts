/**
 * CRM Account Types — product tiers (Retail, VIP, IB) with default limits.
 */
import { getDb } from "./db";

export type AccountTypeRow = {
  id: number;
  name: string;
  slug: string;
  active: number;
  leverage_default: number;
  min_deposit: number;
  max_deposit: number;
  spread_markup_bps: number;
  bonus_eligible: number;
  vip_tier: number;
  description: string;
  settings_json: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountTypeQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  activeOnly?: boolean;
};

export type AccountTypeCreateInput = {
  name: string;
  slug?: string;
  active?: boolean;
  leverageDefault?: number;
  minDeposit?: number;
  maxDeposit?: number;
  spreadMarkupBps?: number;
  bonusEligible?: boolean;
  vipTier?: number;
  description?: string;
  settings?: Record<string, unknown>;
};

export type AccountTypeUpdateInput = {
  name?: string;
  slug?: string;
  active?: boolean;
  leverageDefault?: number;
  minDeposit?: number;
  maxDeposit?: number;
  spreadMarkupBps?: number;
  bonusEligible?: boolean;
  vipTier?: number;
  description?: string;
  settings?: Record<string, unknown> | null;
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

function seedAccountTypes(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO crm_account_type
     (name, slug, active, leverage_default, min_deposit, max_deposit, spread_markup_bps,
      bonus_eligible, vip_tier, description, settings_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const rows: Array<[
    string,
    string,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    string,
    string | null,
    string,
    string,
  ]> = [
    [
      "Default",
      "default",
      1,
      100,
      100,
      50_000,
      0,
      1,
      0,
      "Standard tier assigned when no other type is selected.",
      null,
      now,
      now,
    ],
    [
      "Retail",
      "retail",
      1,
      30,
      250,
      25_000,
      25,
      1,
      0,
      "Everyday clients — moderate leverage and deposit caps.",
      null,
      now,
      now,
    ],
    [
      "VIP",
      "vip",
      1,
      200,
      10_000,
      500_000,
      10,
      1,
      3,
      "High-value clients — tighter spreads and higher limits.",
      null,
      now,
      now,
    ],
    [
      "IB Partner",
      "ib-partner",
      1,
      500,
      500,
      1_000_000,
      5,
      0,
      0,
      "Introducing broker accounts — volume pricing, no retail bonuses.",
      null,
      now,
      now,
    ],
  ];
  for (const r of rows) ins.run(...r);
}

export function ensureAccountTypesSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_account_type (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      leverage_default INTEGER NOT NULL DEFAULT 100,
      min_deposit REAL NOT NULL DEFAULT 100,
      max_deposit REAL NOT NULL DEFAULT 50000,
      spread_markup_bps INTEGER NOT NULL DEFAULT 0,
      bonus_eligible INTEGER NOT NULL DEFAULT 1,
      vip_tier INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      settings_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_account_type_name ON crm_account_type(name);
    CREATE INDEX IF NOT EXISTS idx_account_type_active ON crm_account_type(active);
    CREATE INDEX IF NOT EXISTS idx_account_type_slug ON crm_account_type(slug);
  `);

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_account_type").get() as { c: number };
  if (count.c === 0) seedAccountTypes();

  schemaReady = true;
}

const SORT_COLS: Record<string, string> = {
  id: "id",
  name: "name",
  slug: "slug",
  active: "active",
  leverage_default: "leverage_default",
  min_deposit: "min_deposit",
  max_deposit: "max_deposit",
  created_at: "created_at",
  updated_at: "updated_at",
};

export function listAccountTypes(q: AccountTypeQuery): {
  rows: AccountTypeRow[];
  total: number;
  page: number;
  limit: number;
} {
  ensureAccountTypesSchema();
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(10, q.limit ?? 10));
  const offset = (page - 1) * limit;
  const sortCol = SORT_COLS[q.sortBy ?? ""] ?? "id";
  const sortDir = q.sortDir === "desc" ? "DESC" : "ASC";

  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (q.activeOnly) {
    where.push("active = 1");
  }

  if (q.search?.trim()) {
    where.push("(name LIKE ? OR slug LIKE ? OR description LIKE ?)");
    const like = `%${q.search.trim()}%`;
    params.push(like, like, like);
  }

  const whereSql = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_account_type WHERE ${whereSql}`).get(...params) as {
    c: number;
  }).c;

  const rows = db
    .prepare(
      `SELECT id, name, slug, active, leverage_default, min_deposit, max_deposit, spread_markup_bps,
              bonus_eligible, vip_tier, description, settings_json, created_at, updated_at
       FROM crm_account_type WHERE ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as AccountTypeRow[];

  return { rows, total, page, limit };
}

export function getAccountType(id: number): AccountTypeRow | null {
  ensureAccountTypesSchema();
  const row = getDb()
    .prepare(
      `SELECT id, name, slug, active, leverage_default, min_deposit, max_deposit, spread_markup_bps,
              bonus_eligible, vip_tier, description, settings_json, created_at, updated_at
       FROM crm_account_type WHERE id = ?`,
    )
    .get(id) as AccountTypeRow | undefined;
  return row ?? null;
}

export function getAccountTypeBySlug(slug: string): AccountTypeRow | null {
  ensureAccountTypesSchema();
  const row = getDb()
    .prepare(
      `SELECT id, name, slug, active, leverage_default, min_deposit, max_deposit, spread_markup_bps,
              bonus_eligible, vip_tier, description, settings_json, created_at, updated_at
       FROM crm_account_type WHERE slug = ?`,
    )
    .get(slug) as AccountTypeRow | undefined;
  return row ?? null;
}

function uniqueSlug(base: string, excludeId?: number): string {
  const db = getDb();
  let slug = base || "type";
  let n = 0;
  for (;;) {
    const row = db.prepare("SELECT id FROM crm_account_type WHERE slug = ?").get(slug) as { id: number } | undefined;
    if (!row || (excludeId !== undefined && row.id === excludeId)) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export function createAccountType(input: AccountTypeCreateInput): AccountTypeRow {
  ensureAccountTypesSchema();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  const baseSlug = slugify(input.slug?.trim() || name);
  const slug = uniqueSlug(baseSlug);
  const now = new Date().toISOString();
  const leverage = Math.max(1, Math.min(1000, Math.round(input.leverageDefault ?? 100)));
  const minDeposit = Math.max(0, input.minDeposit ?? 100);
  const maxDeposit = Math.max(minDeposit, input.maxDeposit ?? 50_000);
  const spreadBps = Math.max(0, Math.min(500, Math.round(input.spreadMarkupBps ?? 0)));
  const vipTier = Math.max(0, Math.min(10, Math.round(input.vipTier ?? 0)));

  const r = getDb()
    .prepare(
      `INSERT INTO crm_account_type
       (name, slug, active, leverage_default, min_deposit, max_deposit, spread_markup_bps,
        bonus_eligible, vip_tier, description, settings_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      name,
      slug,
      input.active === false ? 0 : 1,
      leverage,
      minDeposit,
      maxDeposit,
      spreadBps,
      input.bonusEligible === false ? 0 : 1,
      vipTier,
      (input.description ?? "").trim(),
      input.settings ? JSON.stringify(input.settings) : null,
      now,
      now,
    );

  const created = getAccountType(Number(r.lastInsertRowid));
  if (!created) throw new Error("Could not create account type.");
  return created;
}

export function updateAccountType(id: number, input: AccountTypeUpdateInput): AccountTypeRow | null {
  ensureAccountTypesSchema();
  const existing = getAccountType(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Name is required.");

  let slug = existing.slug;
  if (input.slug !== undefined) {
    slug = uniqueSlug(slugify(input.slug.trim() || name), id);
  } else if (input.name !== undefined && input.name.trim() !== existing.name) {
    slug = uniqueSlug(slugify(name), id);
  }

  const leverage =
    input.leverageDefault !== undefined
      ? Math.max(1, Math.min(1000, Math.round(input.leverageDefault)))
      : existing.leverage_default;
  const minDeposit = input.minDeposit !== undefined ? Math.max(0, input.minDeposit) : existing.min_deposit;
  const maxDeposit =
    input.maxDeposit !== undefined ? Math.max(minDeposit, input.maxDeposit) : existing.max_deposit;
  const spreadBps =
    input.spreadMarkupBps !== undefined
      ? Math.max(0, Math.min(500, Math.round(input.spreadMarkupBps)))
      : existing.spread_markup_bps;
  const vipTier =
    input.vipTier !== undefined ? Math.max(0, Math.min(10, Math.round(input.vipTier))) : existing.vip_tier;
  const active = input.active !== undefined ? (input.active ? 1 : 0) : existing.active;
  const bonusEligible =
    input.bonusEligible !== undefined ? (input.bonusEligible ? 1 : 0) : existing.bonus_eligible;
  const description = input.description !== undefined ? input.description.trim() : existing.description;
  const settingsJson =
    input.settings !== undefined
      ? input.settings
        ? JSON.stringify(input.settings)
        : null
      : existing.settings_json;
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `UPDATE crm_account_type
       SET name = ?, slug = ?, active = ?, leverage_default = ?, min_deposit = ?, max_deposit = ?,
           spread_markup_bps = ?, bonus_eligible = ?, vip_tier = ?, description = ?,
           settings_json = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      name,
      slug,
      active,
      leverage,
      minDeposit,
      maxDeposit,
      spreadBps,
      bonusEligible,
      vipTier,
      description,
      settingsJson,
      now,
      id,
    );

  return getAccountType(id);
}

export function toggleAccountTypeActive(id: number): AccountTypeRow | null {
  ensureAccountTypesSchema();
  const existing = getAccountType(id);
  if (!existing) return null;

  const next = existing.active ? 0 : 1;
  const now = new Date().toISOString();
  getDb().prepare("UPDATE crm_account_type SET active = ?, updated_at = ? WHERE id = ?").run(next, now, id);
  return getAccountType(id);
}
