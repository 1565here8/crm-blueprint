/**
 * CRM Spread Profiles — tier trades table + exchange matrix + per-client overrides.
 */
import { getDb } from "./db";
import { getQuote } from "./marketData";
import type { AssetClass, Quote } from "./types";
import { CATALOG } from "./marketCatalog";
import { ensureAccountTypesSchema } from "./accountTypes";

export const SPREAD_ASSET_CLASSES = [
  "currencies",
  "commodities",
  "indices",
  "stocks",
  "crypto_usd",
  "crypto_eur",
] as const;

export type SpreadAssetClass = (typeof SPREAD_ASSET_CLASSES)[number];
export type SpreadUnit = "pip" | "percent";

export type SpreadTierRow = {
  id: number;
  name: string;
  slug: string;
  trade_percent: number;
  is_positive: number;
  sort_order: number;
  account_type_id: number | null;
  account_type_name: string | null;
};

export type SpreadExchangeRow = {
  tier_id: number;
  asset_class: SpreadAssetClass;
  value: number;
  unit: SpreadUnit;
};

export type SpreadOverridesJson = {
  tiers?: Record<string, { tradePercent?: number; isPositive?: boolean }>;
  cells?: Record<string, Partial<Record<SpreadAssetClass, { value: number; unit: SpreadUnit }>>>;
};

export type SpreadClientOverrideRow = {
  id: number;
  user_id: string | null;
  is_demo: number;
  tier_id: number | null;
  overrides_json: string;
  updated_at: string;
};

export type EffectiveSpread = {
  value: number;
  unit: SpreadUnit;
  source: "override" | "tier" | "default";
  tierSlug?: string;
  isPositive: boolean;
};

export type SpreadPreviewPoint = {
  assetClass: SpreadAssetClass;
  label: string;
  effectivePercent: number;
  rawValue: number;
  unit: SpreadUnit;
};

const TIER_SEED: Array<{
  slug: string;
  name: string;
  trade_percent: number;
  is_positive: number;
  sort_order: number;
}> = [
  { slug: "a", name: "A", trade_percent: 0.05, is_positive: 1, sort_order: 1 },
  { slug: "b", name: "B", trade_percent: 0.12, is_positive: 1, sort_order: 2 },
  { slug: "c", name: "C", trade_percent: 0.22, is_positive: 1, sort_order: 3 },
  { slug: "d", name: "D", trade_percent: 0.35, is_positive: 1, sort_order: 4 },
  { slug: "e", name: "E", trade_percent: 0.48, is_positive: 1, sort_order: 5 },
  { slug: "neutral", name: "Neutral", trade_percent: 0.55, is_positive: 1, sort_order: 6 },
  { slug: "g", name: "G", trade_percent: 0.62, is_positive: 1, sort_order: 7 },
  { slug: "h", name: "H", trade_percent: 0.72, is_positive: 0, sort_order: 8 },
  { slug: "i", name: "I", trade_percent: 0.81, is_positive: 0, sort_order: 9 },
  { slug: "j", name: "J", trade_percent: 0.91, is_positive: 0, sort_order: 10 },
  { slug: "k", name: "K", trade_percent: 1, is_positive: 0, sort_order: 11 },
];

const NEUTRAL_DEFAULTS: Record<SpreadAssetClass, { value: number; unit: SpreadUnit }> = {
  currencies: { value: 1, unit: "pip" },
  commodities: { value: 3, unit: "pip" },
  indices: { value: 0.05, unit: "percent" },
  stocks: { value: 0.05, unit: "percent" },
  crypto_usd: { value: 0.05, unit: "percent" },
  crypto_eur: { value: 0.05, unit: "percent" },
};

const TIER_FACTOR: Record<string, number> = {
  a: 0.5,
  b: 0.7,
  c: 0.85,
  d: 0.95,
  e: 0.98,
  neutral: 1,
  g: 1.15,
  h: 1.35,
  i: 1.6,
  j: 2,
  k: 5,
};

const ASSET_LABELS: Record<SpreadAssetClass, string> = {
  currencies: "Currencies",
  commodities: "Commodities",
  indices: "Indices",
  stocks: "Stocks",
  crypto_usd: "Crypto USD",
  crypto_eur: "Crypto EUR",
};

let schemaReady = false;

export type SpreadVenueRow = {
  id: number;
  name: string;
  percent: number;
  is_positive: number;
  applied_at: string | null;
};

function roundSpread(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function tierDefaultCell(slug: string, assetClass: SpreadAssetClass): { value: number; unit: SpreadUnit } {
  const base = NEUTRAL_DEFAULTS[assetClass];
  const factor = TIER_FACTOR[slug] ?? 1;
  if (base.unit === "pip") {
    return { value: roundSpread(Math.max(0.1, base.value * factor)), unit: "pip" };
  }
  return { value: roundSpread(Math.max(0.01, base.value * factor)), unit: "percent" };
}

function parseOverrides(raw: string | null | undefined): SpreadOverridesJson {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SpreadOverridesJson;
  } catch {
    return {};
  }
}

function migrateLegacyTables(db: ReturnType<typeof getDb>): void {
  const exchangeInfo = db.prepare("PRAGMA table_info(crm_spread_exchange)").all() as Array<{ name: string }>;
  if (exchangeInfo.some((c) => c.name === "id" && !exchangeInfo.some((x) => x.name === "tier_id"))) {
    db.exec(`ALTER TABLE crm_spread_exchange RENAME TO crm_spread_exchange_legacy`);
  }

  const cellExists = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='crm_spread_cell'`)
    .get() as { name: string } | undefined;

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_spread_tier (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      trade_percent REAL NOT NULL DEFAULT 0,
      is_positive INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS crm_spread_exchange (
      tier_id INTEGER NOT NULL REFERENCES crm_spread_tier(id) ON DELETE CASCADE,
      asset_class TEXT NOT NULL CHECK(asset_class IN ('currencies','commodities','indices','stocks','crypto_usd','crypto_eur')),
      value REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'percent' CHECK(unit IN ('pip','percent')),
      PRIMARY KEY (tier_id, asset_class)
    );

    CREATE TABLE IF NOT EXISTS crm_spread_client_override (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0, 1)),
      tier_id INTEGER NULL REFERENCES crm_spread_tier(id),
      overrides_json TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
  `);

  try {
    db.exec(`ALTER TABLE crm_spread_tier ADD COLUMN trade_percent REAL NOT NULL DEFAULT 0`);
  } catch {
    /* exists */
  }

  if (cellExists) {
    const rows = db.prepare(`SELECT tier_id, asset_class, value, unit FROM crm_spread_cell`).all() as SpreadExchangeRow[];
    const ins = db.prepare(
      `INSERT OR IGNORE INTO crm_spread_exchange (tier_id, asset_class, value, unit) VALUES (?, ?, ?, ?)`,
    );
    for (const r of rows) ins.run(r.tier_id, r.asset_class, r.value, r.unit);
  }

  const oldOverride = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='crm_spread_client_override'`)
    .get() as { name: string } | undefined;
  if (oldOverride) {
    const cols = db.prepare("PRAGMA table_info(crm_spread_client_override)").all() as Array<{ name: string }>;
    if (cols.some((c) => c.name === "asset_class") && !cols.some((c) => c.name === "overrides_json")) {
      db.exec(`ALTER TABLE crm_spread_client_override RENAME TO crm_spread_client_override_legacy`);
      db.exec(`
        CREATE TABLE crm_spread_client_override (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NULL REFERENCES users(id) ON DELETE CASCADE,
          is_demo INTEGER NOT NULL DEFAULT 0 CHECK(is_demo IN (0, 1)),
          tier_id INTEGER NULL REFERENCES crm_spread_tier(id),
          overrides_json TEXT NOT NULL DEFAULT '{}',
          updated_at TEXT NOT NULL
        );
      `);
    }
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_spread_override_demo ON crm_spread_client_override(is_demo) WHERE is_demo = 1;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_spread_override_user ON crm_spread_client_override(user_id) WHERE user_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_spread_exchange_tier ON crm_spread_exchange(tier_id);

    CREATE TABLE IF NOT EXISTS crm_spread_venue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      percent REAL NOT NULL DEFAULT 0,
      is_positive INTEGER NOT NULL DEFAULT 1,
      applied_at TEXT
    );
  `);
}

function seedSpreadTiersAndExchange(): void {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_spread_tier").get() as { c: number };
  if (count.c > 0) return;

  const insTier = db.prepare(
    `INSERT INTO crm_spread_tier (name, slug, trade_percent, is_positive, sort_order) VALUES (?, ?, ?, ?, ?)`,
  );
  const insCell = db.prepare(
    `INSERT INTO crm_spread_exchange (tier_id, asset_class, value, unit) VALUES (?, ?, ?, ?)`,
  );

  for (const t of TIER_SEED) {
    const result = insTier.run(t.name, t.slug, t.trade_percent, t.is_positive, t.sort_order);
    const tierId = Number(result.lastInsertRowid);
    for (const ac of SPREAD_ASSET_CLASSES) {
      const cell = tierDefaultCell(t.slug, ac);
      insCell.run(tierId, ac, cell.value, cell.unit);
    }
  }

  linkAccountTypesToTiers();
}

function seedSpreadVenues(): void {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_spread_venue").get() as { c: number };
  if (count.c > 0) return;

  const names = [
    "NYSE", "NASDAQ", "LSE", "XETRA", "TSE", "ASX", "HKEX", "SGX", "CME", "ICE",
    "Binance Spot", "Coinbase", "Kraken", "Bitstamp", "FXCM", "OANDA", "IG", "CMC", "Saxo", "Interactive Brokers",
    "MetaTrader Bridge", "Demo Feed A", "Demo Feed B", "VIP Liquidity", "Retail Liquidity",
    "Prime LP 1", "Prime LP 2", "Crypto USD Pool", "Crypto EUR Pool", "Indices CFD",
    "Commodities CFD", "Forex ECN", "Forex STP", "OTC Desk", "Internalizer",
    "Cross Connect 1", "Cross Connect 2", "Backup Feed", "Weekend Crypto", "After Hours US",
    "Pre-Market US", "EU Session", "Asia Session", "Latency Arb", "Synthetic Index",
    "Tokenized Stock", "Stablecoin Pair", "Alt Coin Basket", "Wholesale Tier", "Retail Tier",
  ];
  const ins = db.prepare(
    `INSERT INTO crm_spread_venue (name, percent, is_positive, applied_at) VALUES (?, ?, ?, ?)`,
  );
  for (let i = 0; i < names.length; i++) {
    ins.run(names[i], roundSpread(0.02 + (i % 10) * 0.01), i % 3 === 0 ? 1 : 0, null);
  }
}

function linkAccountTypesToTiers(): void {
  const db = getDb();
  try {
    ensureAccountTypesSchema();
  } catch {
    return;
  }
  try {
    db.exec(`ALTER TABLE crm_account_type ADD COLUMN spread_tier_id INTEGER REFERENCES crm_spread_tier(id)`);
  } catch {
    /* column exists */
  }
  const vip = db.prepare("SELECT id FROM crm_spread_tier WHERE slug = 'a'").get() as { id: number } | undefined;
  const retail = db.prepare("SELECT id FROM crm_spread_tier WHERE slug = 'neutral'").get() as
    | { id: number }
    | undefined;
  const ib = db.prepare("SELECT id FROM crm_spread_tier WHERE slug = 'g'").get() as { id: number } | undefined;
  if (vip) db.prepare(`UPDATE crm_account_type SET spread_tier_id = ? WHERE slug = 'vip'`).run(vip.id);
  if (retail) {
    db.prepare(`UPDATE crm_account_type SET spread_tier_id = ? WHERE slug IN ('retail', 'default')`).run(retail.id);
  }
  if (ib) db.prepare(`UPDATE crm_account_type SET spread_tier_id = ? WHERE slug = 'ib'`).run(ib.id);
}

export function ensureSpreadProfilesSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  migrateLegacyTables(db);

  try {
    db.exec(`ALTER TABLE user_profiles ADD COLUMN spread_tier_id INTEGER REFERENCES crm_spread_tier(id)`);
  } catch {
    /* exists */
  }

  seedSpreadTiersAndExchange();
  seedSpreadVenues();
  schemaReady = true;
}

export function listSpreadTiers(): SpreadTierRow[] {
  ensureSpreadProfilesSchema();
  return getDb()
    .prepare(
      `SELECT t.id, t.name, t.slug, t.trade_percent, t.is_positive, t.sort_order,
              a.id AS account_type_id, a.name AS account_type_name
       FROM crm_spread_tier t
       LEFT JOIN crm_account_type a ON a.spread_tier_id = t.id
       ORDER BY t.sort_order ASC, t.id ASC`,
    )
    .all() as SpreadTierRow[];
}

export function listSpreadExchange(): SpreadExchangeRow[] {
  ensureSpreadProfilesSchema();
  return getDb()
    .prepare(`SELECT tier_id, asset_class, value, unit FROM crm_spread_exchange ORDER BY tier_id, asset_class`)
    .all() as SpreadExchangeRow[];
}

export function getSpreadBundle(args: { userId?: string; demo?: boolean } = {}) {
  ensureSpreadProfilesSchema();
  const tiers = listSpreadTiers();
  const exchange = listSpreadExchange();
  let override: SpreadClientOverrideRow | null = null;

  if (args.demo) {
    override =
      (getDb()
        .prepare(
          `SELECT id, user_id, is_demo, tier_id, overrides_json, updated_at
           FROM crm_spread_client_override WHERE is_demo = 1 LIMIT 1`,
        )
        .get() as SpreadClientOverrideRow | undefined) ?? null;
  } else if (args.userId) {
    override =
      (getDb()
        .prepare(
          `SELECT id, user_id, is_demo, tier_id, overrides_json, updated_at
           FROM crm_spread_client_override WHERE user_id = ? LIMIT 1`,
        )
        .get(args.userId) as SpreadClientOverrideRow | undefined) ?? null;
  }

  return {
    assetClasses: SPREAD_ASSET_CLASSES.map((id) => ({ id, label: ASSET_LABELS[id] })),
    tiers,
    exchange,
    override,
    defaults: NEUTRAL_DEFAULTS,
  };
}

export function updateSpreadTier(
  tierId: number,
  patch: { tradePercent?: number; isPositive?: boolean; name?: string },
): SpreadTierRow {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const existing = db.prepare("SELECT * FROM crm_spread_tier WHERE id = ?").get(tierId) as SpreadTierRow | undefined;
  if (!existing) throw new Error("Spread tier not found.");

  const tradePercent =
    patch.tradePercent !== undefined
      ? Math.max(-1, Math.min(1, roundSpread(patch.tradePercent)))
      : existing.trade_percent;
  const isPositive = patch.isPositive !== undefined ? (patch.isPositive ? 1 : 0) : existing.is_positive;
  const name = patch.name?.trim() || existing.name;

  db.prepare(`UPDATE crm_spread_tier SET name = ?, trade_percent = ?, is_positive = ? WHERE id = ?`).run(
    name,
    tradePercent,
    isPositive,
    tierId,
  );

  return db
    .prepare(
      `SELECT t.id, t.name, t.slug, t.trade_percent, t.is_positive, t.sort_order,
              a.id AS account_type_id, a.name AS account_type_name
       FROM crm_spread_tier t
       LEFT JOIN crm_account_type a ON a.spread_tier_id = t.id
       WHERE t.id = ?`,
    )
    .get(tierId) as SpreadTierRow;
}

export function updateSpreadExchangeCell(args: {
  tierId: number;
  assetClass: SpreadAssetClass;
  value: number;
  unit: SpreadUnit;
}): SpreadExchangeRow {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const tier = db.prepare("SELECT id FROM crm_spread_tier WHERE id = ?").get(args.tierId);
  if (!tier) throw new Error("Spread tier not found.");
  if (!SPREAD_ASSET_CLASSES.includes(args.assetClass)) throw new Error("Invalid asset class.");

  const value = Math.max(0, Math.min(9999, roundSpread(args.value)));
  const unit = args.unit === "pip" ? "pip" : "percent";

  db.prepare(
    `INSERT INTO crm_spread_exchange (tier_id, asset_class, value, unit)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tier_id, asset_class) DO UPDATE SET value = excluded.value, unit = excluded.unit`,
  ).run(args.tierId, args.assetClass, value, unit);

  return db
    .prepare(`SELECT tier_id, asset_class, value, unit FROM crm_spread_exchange WHERE tier_id = ? AND asset_class = ?`)
    .get(args.tierId, args.assetClass) as SpreadExchangeRow;
}

export function updateSpreadExchangeRow(
  tierId: number,
  cells: Array<{ assetClass: SpreadAssetClass; value: number; unit: SpreadUnit }>,
): SpreadExchangeRow[] {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const tier = db.prepare("SELECT id FROM crm_spread_tier WHERE id = ?").get(tierId);
  if (!tier) throw new Error("Spread tier not found.");

  const upd = db.prepare(
    `INSERT INTO crm_spread_exchange (tier_id, asset_class, value, unit)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tier_id, asset_class) DO UPDATE SET value = excluded.value, unit = excluded.unit`,
  );
  const tx = db.transaction(() => {
    for (const c of cells) {
      if (!SPREAD_ASSET_CLASSES.includes(c.assetClass)) continue;
      const value = Math.max(0, Math.min(9999, roundSpread(Number(c.value))));
      upd.run(tierId, c.assetClass, value, c.unit === "pip" ? "pip" : "percent");
    }
  });
  tx();
  return db
    .prepare(`SELECT tier_id, asset_class, value, unit FROM crm_spread_exchange WHERE tier_id = ?`)
    .all(tierId) as SpreadExchangeRow[];
}

export function applySpreadExchangeToAll(args: {
  assetClass: SpreadAssetClass;
  value: number;
  unit: SpreadUnit;
}): number {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const value = Math.max(0, Math.min(9999, roundSpread(args.value)));
  const unit = args.unit === "pip" ? "pip" : "percent";
  const result = db
    .prepare(`UPDATE crm_spread_exchange SET value = ?, unit = ? WHERE asset_class = ?`)
    .run(value, unit, args.assetClass);
  return result.changes;
}

export function restoreSpreadExchangeDefaults(): void {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const tiers = db.prepare("SELECT id, slug FROM crm_spread_tier").all() as Array<{ id: number; slug: string }>;
  const upd = db.prepare(
    `INSERT INTO crm_spread_exchange (tier_id, asset_class, value, unit)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tier_id, asset_class) DO UPDATE SET value = excluded.value, unit = excluded.unit`,
  );
  const tx = db.transaction(() => {
    for (const t of tiers) {
      for (const ac of SPREAD_ASSET_CLASSES) {
        const cell = tierDefaultCell(t.slug, ac);
        upd.run(t.id, ac, cell.value, cell.unit);
      }
    }
  });
  tx();
}

function cellToEffectivePercent(
  value: number,
  unit: SpreadUnit,
  tradePercent: number,
  isPositive: boolean,
): number {
  let base = unit === "percent" ? value : value * 0.01;
  base *= Math.max(0.01, tradePercent || 0.55);
  if (!isPositive) base = -Math.abs(base);
  return roundSpread(base);
}

export function getSpreadPreviewChart(args: {
  tierId?: number;
  tierSlug?: string;
  userId?: string;
  demo?: boolean;
}): { points: SpreadPreviewPoint[]; tierLabel: string } {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const tiers = listSpreadTiers();
  const exchange = listSpreadExchange();

  let tier: SpreadTierRow | undefined;
  if (args.tierId) tier = tiers.find((t) => t.id === args.tierId);
  if (!tier && args.tierSlug) tier = tiers.find((t) => t.slug === args.tierSlug);

  let overrides = parseOverrides(undefined);
  if (args.demo) {
    const row = db
      .prepare(`SELECT overrides_json, tier_id FROM crm_spread_client_override WHERE is_demo = 1 LIMIT 1`)
      .get() as { overrides_json: string; tier_id: number | null } | undefined;
    if (row) {
      overrides = parseOverrides(row.overrides_json);
      if (!tier && row.tier_id) tier = tiers.find((t) => t.id === row.tier_id);
    }
  } else if (args.userId) {
    const row = db
      .prepare(`SELECT overrides_json, tier_id FROM crm_spread_client_override WHERE user_id = ? LIMIT 1`)
      .get(args.userId) as { overrides_json: string; tier_id: number | null } | undefined;
    if (row) {
      overrides = parseOverrides(row.overrides_json);
      if (!tier && row.tier_id) tier = tiers.find((t) => t.id === row.tier_id);
    }
    if (!tier) {
      const profile = db
        .prepare("SELECT spread_tier_id FROM user_profiles WHERE user_id = ?")
        .get(args.userId) as { spread_tier_id: number | null } | undefined;
      if (profile?.spread_tier_id) tier = tiers.find((t) => t.id === profile.spread_tier_id);
    }
  }

  if (!tier) tier = tiers.find((t) => t.slug === "neutral") ?? tiers[0];

  const tierOverride = tier ? overrides.tiers?.[tier.slug] : undefined;
  const tradePercent = tierOverride?.tradePercent ?? tier?.trade_percent ?? 0.55;
  const isPositive = tierOverride?.isPositive ?? Boolean(tier?.is_positive ?? 1);
  const cellOverrides = tier ? overrides.cells?.[tier.slug] : undefined;

  const points: SpreadPreviewPoint[] = SPREAD_ASSET_CLASSES.map((ac) => {
    const cellOverride = cellOverrides?.[ac];
    const platformCell = exchange.find((c) => c.tier_id === tier!.id && c.asset_class === ac);
    const value = cellOverride?.value ?? platformCell?.value ?? NEUTRAL_DEFAULTS[ac].value;
    const unit = cellOverride?.unit ?? platformCell?.unit ?? NEUTRAL_DEFAULTS[ac].unit;
    return {
      assetClass: ac,
      label: ASSET_LABELS[ac],
      effectivePercent: cellToEffectivePercent(value, unit, tradePercent, isPositive),
      rawValue: value,
      unit,
    };
  });

  return { points, tierLabel: tier?.name ?? "Neutral" };
}

export function patchSpreadClientOverride(args: {
  userId?: string | null;
  demo?: boolean;
  tierId?: number | null;
  overrides?: SpreadOverridesJson;
}): SpreadClientOverrideRow | null {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const now = new Date().toISOString();

  if (args.demo) {
    const existing = db
      .prepare(`SELECT id FROM crm_spread_client_override WHERE is_demo = 1 LIMIT 1`)
      .get() as { id: number } | undefined;
    const json = JSON.stringify(args.overrides ?? {});
    if (existing) {
      db.prepare(
        `UPDATE crm_spread_client_override SET tier_id = ?, overrides_json = ?, updated_at = ? WHERE id = ?`,
      ).run(args.tierId ?? null, json, now, existing.id);
    } else {
      db.prepare(
        `INSERT INTO crm_spread_client_override (user_id, is_demo, tier_id, overrides_json, updated_at)
         VALUES (NULL, 1, ?, ?, ?)`,
      ).run(args.tierId ?? null, json, now);
    }
    return db
      .prepare(`SELECT id, user_id, is_demo, tier_id, overrides_json, updated_at FROM crm_spread_client_override WHERE is_demo = 1`)
      .get() as SpreadClientOverrideRow;
  }

  if (!args.userId) return null;

  const json = JSON.stringify(args.overrides ?? {});
  const existing = db
    .prepare(`SELECT id FROM crm_spread_client_override WHERE user_id = ? LIMIT 1`)
    .get(args.userId) as { id: number } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE crm_spread_client_override SET tier_id = ?, overrides_json = ?, updated_at = ? WHERE id = ?`,
    ).run(args.tierId ?? null, json, now, existing.id);
  } else {
    db.prepare(
      `INSERT INTO crm_spread_client_override (user_id, is_demo, tier_id, overrides_json, updated_at)
       VALUES (?, 0, ?, ?, ?)`,
    ).run(args.userId, args.tierId ?? null, json, now);
  }
  return db
    .prepare(`SELECT id, user_id, is_demo, tier_id, overrides_json, updated_at FROM crm_spread_client_override WHERE user_id = ?`)
    .get(args.userId) as SpreadClientOverrideRow;
}

export function deleteSpreadClientOverride(args: { userId?: string; demo?: boolean }): boolean {
  ensureSpreadProfilesSchema();
  const db = getDb();
  if (args.demo) {
    return db.prepare(`DELETE FROM crm_spread_client_override WHERE is_demo = 1`).run().changes > 0;
  }
  if (!args.userId) return false;
  return db.prepare(`DELETE FROM crm_spread_client_override WHERE user_id = ?`).run(args.userId).changes > 0;
}

function resolveUserSpreadTierId(userId: string): number | null {
  ensureSpreadProfilesSchema();
  const db = getDb();

  const override = db
    .prepare(`SELECT tier_id FROM crm_spread_client_override WHERE user_id = ? LIMIT 1`)
    .get(userId) as { tier_id: number | null } | undefined;
  if (override?.tier_id) return override.tier_id;

  const profile = db
    .prepare("SELECT spread_tier_id FROM user_profiles WHERE user_id = ?")
    .get(userId) as { spread_tier_id: number | null } | undefined;
  if (profile?.spread_tier_id) return profile.spread_tier_id;

  const neutral = db.prepare("SELECT id FROM crm_spread_tier WHERE slug = 'neutral'").get() as { id: number };
  return neutral?.id ?? null;
}

export function resolveSpreadAssetClass(
  symbol: string,
  assetClass: AssetClass,
  accountCurrency = "USD",
): SpreadAssetClass {
  const normalized = symbol.trim().toUpperCase();
  const inst =
    CATALOG.find((c) => c.displaySymbol.toUpperCase() === normalized) ??
    CATALOG.find((c) => c.displaySymbol.toUpperCase() === normalized.replace("/USD", ""));
  if (inst) {
    if (inst.category === "currencies") return "currencies";
    if (inst.category === "commodities") return "commodities";
    if (inst.category === "indexes") return "indices";
    if (inst.category === "stocks") return "stocks";
    if (inst.category === "crypto_eurt") return "crypto_eur";
    if (inst.category === "crypto_usdt") return "crypto_usd";
  }
  if (assetClass === "crypto") {
    return accountCurrency === "EUR" ? "crypto_eur" : "crypto_usd";
  }
  return "stocks";
}

export function getEffectiveSpread(userId: string, assetClass: SpreadAssetClass): EffectiveSpread {
  ensureSpreadProfilesSchema();
  const db = getDb();

  const overrideRow = db
    .prepare(`SELECT tier_id, overrides_json FROM crm_spread_client_override WHERE user_id = ? LIMIT 1`)
    .get(userId) as { tier_id: number | null; overrides_json: string } | undefined;

  if (overrideRow) {
    const overrides = parseOverrides(overrideRow.overrides_json);
    const tierId = overrideRow.tier_id ?? resolveUserSpreadTierId(userId);
    if (tierId) {
      const tier = db.prepare("SELECT slug, is_positive, trade_percent FROM crm_spread_tier WHERE id = ?").get(tierId) as
        | { slug: string; is_positive: number; trade_percent: number }
        | undefined;
      const cellOv = tier ? overrides.cells?.[tier.slug]?.[assetClass] : undefined;
      if (cellOv) {
        const tierOv = tier ? overrides.tiers?.[tier.slug] : undefined;
        return {
          value: cellOv.value,
          unit: cellOv.unit,
          source: "override",
          tierSlug: tier?.slug,
          isPositive: tierOv?.isPositive ?? Boolean(tier?.is_positive ?? 1),
        };
      }
    }
  }

  const tierId = resolveUserSpreadTierId(userId);
  if (tierId) {
    const cell = db
      .prepare(
        `SELECT c.value, c.unit, t.slug, t.is_positive
         FROM crm_spread_exchange c
         JOIN crm_spread_tier t ON t.id = c.tier_id
         WHERE c.tier_id = ? AND c.asset_class = ?`,
      )
      .get(tierId, assetClass) as
      | { value: number; unit: SpreadUnit; slug: string; is_positive: number }
      | undefined;
    if (cell) {
      return {
        value: cell.value,
        unit: cell.unit,
        source: "tier",
        tierSlug: cell.slug,
        isPositive: Boolean(cell.is_positive),
      };
    }
  }

  const fallback = NEUTRAL_DEFAULTS[assetClass];
  return {
    value: fallback.value,
    unit: fallback.unit,
    source: "default",
    tierSlug: "neutral",
    isPositive: true,
  };
}

function userAccountCurrency(userId: string): string {
  const row = getDb()
    .prepare("SELECT currency FROM user_profiles WHERE user_id = ?")
    .get(userId) as { currency: string } | undefined;
  return row?.currency ?? "USD";
}

export async function getQuoteForUser(
  userId: string,
  symbol: string,
  assetClass: AssetClass,
): Promise<Quote> {
  const quote = await getQuote(symbol, assetClass);
  const spreadClass = resolveSpreadAssetClass(symbol, assetClass, userAccountCurrency(userId));
  const effective = getEffectiveSpread(userId, spreadClass);
  return applySpreadMarkup(quote, effective, effective.isPositive);
}

export function applySpreadMarkup(quote: Quote, spread: EffectiveSpread, isPositiveTier = true): Quote {
  const mid = quote.mid;
  if (!Number.isFinite(mid) || mid <= 0) return quote;

  let halfSpread: number;
  if (spread.unit === "percent") {
    halfSpread = (mid * (spread.value / 100)) / 2;
  } else {
    const pipSize = quote.assetClass === "crypto" || mid > 10 ? mid * 0.0001 : 0.0001;
    halfSpread = (spread.value * pipSize) / 2;
  }

  if (!isPositiveTier) halfSpread = -halfSpread;
  const bid = Math.max(0.0001, Math.round((mid - halfSpread) * 100) / 100);
  const ask = Math.max(0.0001, Math.round((mid + halfSpread) * 100) / 100);
  return { ...quote, bid, ask };
}

export type SpreadVenueQuery = { search?: string; page?: number; limit?: number };

export function listSpreadVenues(args: SpreadVenueQuery = {}) {
  ensureSpreadProfilesSchema();
  const page = Math.max(1, args.page ?? 1);
  const limit = Math.min(100, Math.max(1, args.limit ?? 50));
  const offset = (page - 1) * limit;
  const search = args.search?.trim().toLowerCase() ?? "";
  const where = search ? "WHERE LOWER(name) LIKE ?" : "";
  const params = search ? [`%${search}%`] : [];
  const db = getDb();
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_spread_venue ${where}`).get(...params) as { c: number }).c;
  const rows = db
    .prepare(
      `SELECT id, name, percent, is_positive, applied_at FROM crm_spread_venue ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as SpreadVenueRow[];
  return { rows, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export function updateSpreadVenue(
  id: number,
  patch: { name?: string; percent?: number; isPositive?: boolean },
): SpreadVenueRow {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const existing = db.prepare("SELECT * FROM crm_spread_venue WHERE id = ?").get(id) as SpreadVenueRow | undefined;
  if (!existing) throw new Error("Venue spread row not found.");
  const name = patch.name?.trim() || existing.name;
  const percent = patch.percent !== undefined ? Math.max(0, Math.min(100, roundSpread(patch.percent))) : existing.percent;
  const isPositive = patch.isPositive !== undefined ? (patch.isPositive ? 1 : 0) : existing.is_positive;
  db.prepare(`UPDATE crm_spread_venue SET name = ?, percent = ?, is_positive = ? WHERE id = ?`).run(
    name, percent, isPositive, id,
  );
  return db.prepare("SELECT id, name, percent, is_positive, applied_at FROM crm_spread_venue WHERE id = ?").get(id) as SpreadVenueRow;
}

export function applySpreadVenue(id: number): SpreadVenueRow {
  ensureSpreadProfilesSchema();
  const db = getDb();
  const row = db.prepare("SELECT * FROM crm_spread_venue WHERE id = ?").get(id) as SpreadVenueRow | undefined;
  if (!row) throw new Error("Venue spread row not found.");
  const now = new Date().toISOString();
  db.prepare(`UPDATE crm_spread_venue SET applied_at = ? WHERE id = ?`).run(now, id);
  return { ...row, applied_at: now };
}
