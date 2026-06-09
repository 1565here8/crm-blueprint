/**
 * Forex commission matrix — tier × currency fixed per-side fees (legacy CRM parity).
 */
import { getDb } from "./db";
import { ensureAccountTypesSchema } from "./accountTypes";

export const FOREX_COMMISSION_CURRENCIES = [
  "USD",
  "EUR",
  "AUD",
  "GBP",
  "RUB",
  "CHF",
  "CNY",
  "JPY",
  "BTC",
] as const;

export type ForexCommissionCurrency = (typeof FOREX_COMMISSION_CURRENCIES)[number];

export const FOREX_COMMISSION_TIERS = [0, 1, 2, 3, 4] as const;
export type ForexCommissionTier = (typeof FOREX_COMMISSION_TIERS)[number];

export const FOREX_TIER_LABELS: Record<ForexCommissionTier, string> = {
  0: "Tier 0 Default",
  1: "Tier 1 Standard",
  2: "Tier 2 Silver",
  3: "Tier 3 Gold",
  4: "Tier 4 VIP",
};

export type ForexCommissionCell = {
  tier: ForexCommissionTier;
  currency: ForexCommissionCurrency;
  amount: number;
};

export type ForexCommissionTierInfo = {
  tier: ForexCommissionTier;
  label: string;
  linkedAccountTypes: Array<{ id: number; name: string; slug: string }>;
};

export type ForexCommissionMatrix = {
  tiers: ForexCommissionTierInfo[];
  currencies: ForexCommissionCurrency[];
  cells: ForexCommissionCell[];
  updatedAt: string | null;
};

/** Legacy screenshot seed — tier rows 0–4 × currency columns. */
const LEGACY_SEED: Record<ForexCommissionTier, Record<ForexCommissionCurrency, number>> = {
  0: { USD: 2, EUR: 0, AUD: 2, GBP: 2, RUB: 50, CHF: 2, CNY: 15, JPY: 200, BTC: 0.0001 },
  1: { USD: 5, EUR: 1, AUD: 3, GBP: 2, RUB: 75, CHF: 3, CNY: 18, JPY: 250, BTC: 0.00015 },
  2: { USD: 10, EUR: 2, AUD: 5, GBP: 2, RUB: 100, CHF: 4, CNY: 20, JPY: 300, BTC: 0.0002 },
  3: { USD: 15, EUR: 3, AUD: 8, GBP: 2, RUB: 125, CHF: 5, CNY: 22, JPY: 350, BTC: 0.00025 },
  4: { USD: 20, EUR: 4, AUD: 10, GBP: 1, RUB: 150, CHF: 6, CNY: 25, JPY: 400, BTC: 0.0003 },
};

let schemaReady = false;

export function ensureForexCommissionsSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_forex_commission (
      tier INTEGER NOT NULL CHECK(tier >= 0 AND tier <= 4),
      currency TEXT NOT NULL CHECK(currency IN ('USD','EUR','AUD','GBP','RUB','CHF','CNY','JPY','BTC')),
      amount REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tier, currency)
    );
    CREATE INDEX IF NOT EXISTS idx_forex_commission_tier ON crm_forex_commission(tier);
  `);

  ensureAccountTypesSchema();
  try {
    db.exec(`ALTER TABLE crm_account_type ADD COLUMN forex_commission_tier INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
  try {
    db.exec(`ALTER TABLE user_profiles ADD COLUMN forex_commission_tier INTEGER NULL`);
  } catch {
    /* column exists */
  }

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_forex_commission").get() as { c: number };
  if (count.c === 0) {
    seedForexCommissions();
    linkAccountTypeTiers();
  }

  schemaReady = true;
}

function seedForexCommissions(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO crm_forex_commission (tier, currency, amount, updated_at) VALUES (?, ?, ?, ?)`,
  );
  for (const tier of FOREX_COMMISSION_TIERS) {
    for (const currency of FOREX_COMMISSION_CURRENCIES) {
      ins.run(tier, currency, LEGACY_SEED[tier][currency], now);
    }
  }
}

function linkAccountTypeTiers(): void {
  const db = getDb();
  const map: Array<[string, ForexCommissionTier]> = [
    ["default", 0],
    ["retail", 1],
    ["ib-partner", 2],
    ["vip", 4],
  ];
  for (const [slug, tier] of map) {
    db.prepare(`UPDATE crm_account_type SET forex_commission_tier = ? WHERE slug = ?`).run(tier, slug);
  }
}

function tierAccountTypes(tier: ForexCommissionTier): Array<{ id: number; name: string; slug: string }> {
  return getDb()
    .prepare(`SELECT id, name, slug FROM crm_account_type WHERE forex_commission_tier = ? ORDER BY name ASC`)
    .all(tier) as Array<{ id: number; name: string; slug: string }>;
}

export function getForexCommissionMatrix(): ForexCommissionMatrix {
  ensureForexCommissionsSchema();
  const rows = getDb()
    .prepare(`SELECT tier, currency, amount, updated_at FROM crm_forex_commission ORDER BY tier, currency`)
    .all() as Array<{ tier: number; currency: string; amount: number; updated_at: string }>;

  const cells: ForexCommissionCell[] = rows.map((r) => ({
    tier: r.tier as ForexCommissionTier,
    currency: r.currency as ForexCommissionCurrency,
    amount: r.amount,
  }));

  const updatedAt = rows.reduce<string | null>((max, r) => {
    if (!max || r.updated_at > max) return r.updated_at;
    return max;
  }, null);

  return {
    tiers: FOREX_COMMISSION_TIERS.map((tier) => ({
      tier,
      label: FOREX_TIER_LABELS[tier],
      linkedAccountTypes: tierAccountTypes(tier),
    })),
    currencies: [...FOREX_COMMISSION_CURRENCIES],
    cells,
    updatedAt,
  };
}

export function bulkUpdateForexCommissionMatrix(
  cells: Array<{ tier: number; currency: string; amount: number }>,
): ForexCommissionMatrix {
  ensureForexCommissionsSchema();
  const db = getDb();
  const now = new Date().toISOString();
  const upd = db.prepare(
    `UPDATE crm_forex_commission SET amount = ?, updated_at = ? WHERE tier = ? AND currency = ?`,
  );

  for (const cell of cells) {
    const tier = Math.max(0, Math.min(4, Math.round(cell.tier)));
    const currency = String(cell.currency).toUpperCase();
    if (!FOREX_COMMISSION_CURRENCIES.includes(currency as ForexCommissionCurrency)) {
      throw new Error(`Invalid currency: ${currency}`);
    }
    if (!Number.isFinite(cell.amount) || cell.amount < 0) {
      throw new Error(`Invalid amount for ${currency} tier ${tier}.`);
    }
    const changes = upd.run(cell.amount, now, tier, currency).changes;
    if (changes === 0) {
      db.prepare(`INSERT INTO crm_forex_commission (tier, currency, amount, updated_at) VALUES (?, ?, ?, ?)`).run(
        tier,
        currency,
        cell.amount,
        now,
      );
    }
  }

  return getForexCommissionMatrix();
}

export function getUserForexCommissionTier(userId: string): ForexCommissionTier {
  ensureForexCommissionsSchema();
  const profile = getDb()
    .prepare(`SELECT forex_commission_tier FROM user_profiles WHERE user_id = ?`)
    .get(userId) as { forex_commission_tier: number | null } | undefined;
  if (profile?.forex_commission_tier != null && profile.forex_commission_tier >= 0 && profile.forex_commission_tier <= 4) {
    return profile.forex_commission_tier as ForexCommissionTier;
  }
  return 0;
}

export function getUserAccountCurrency(userId: string): ForexCommissionCurrency {
  const row = getDb()
    .prepare(`SELECT currency FROM user_profiles WHERE user_id = ?`)
    .get(userId) as { currency: string } | undefined;
  const c = String(row?.currency ?? "USD").toUpperCase();
  if (FOREX_COMMISSION_CURRENCIES.includes(c as ForexCommissionCurrency)) {
    return c as ForexCommissionCurrency;
  }
  return "USD";
}

export function getForexCommissionCell(tier: ForexCommissionTier, currency: ForexCommissionCurrency): number {
  ensureForexCommissionsSchema();
  const row = getDb()
    .prepare(`SELECT amount FROM crm_forex_commission WHERE tier = ? AND currency = ?`)
    .get(tier, currency) as { amount: number } | undefined;
  return row?.amount ?? 0;
}

export function resolveForexCommissionCurrency(
  userId: string,
  symbol: string,
  assetClass: "us_equity" | "crypto",
): ForexCommissionCurrency {
  if (assetClass === "crypto") {
    const s = symbol.toUpperCase();
    if (s.includes("BTC")) return "BTC";
  }
  return getUserAccountCurrency(userId);
}

export function computeForexMatrixCommission(
  userId: string,
  symbol: string,
  assetClass: "us_equity" | "crypto",
): number {
  const tier = getUserForexCommissionTier(userId);
  const currency = resolveForexCommissionCurrency(userId, symbol, assetClass);
  return getForexCommissionCell(tier, currency);
}

export const CURRENCY_SYMBOLS: Record<ForexCommissionCurrency, string> = {
  USD: "$",
  EUR: "€",
  AUD: "A$",
  GBP: "£",
  RUB: "₽",
  CHF: "Fr",
  CNY: "¥",
  JPY: "¥",
  BTC: "₿",
};

export function formatForexCommissionPreview(
  tier: ForexCommissionTier,
  currency: ForexCommissionCurrency,
  amount: number,
): string {
  const sym = CURRENCY_SYMBOLS[currency];
  const formatted =
    currency === "BTC"
      ? amount.toFixed(4)
      : currency === "JPY" || currency === "RUB" || currency === "CNY"
        ? Math.round(amount).toString()
        : amount % 1 === 0
          ? amount.toFixed(0)
          : amount.toFixed(2);
  return `${sym}${formatted}/side on ${currency} pairs`;
}
