/**
 * Crypto commission matrix — tier × currency fixed per-side fees (legacy CRM parity).
 */
import { getDb } from "./db";
import { ensureAccountTypesSchema } from "./accountTypes";
import {
  CURRENCY_SYMBOLS,
  FOREX_COMMISSION_CURRENCIES,
  type ForexCommissionCurrency,
} from "./forexCommissions";

export const CRYPTO_COMMISSION_CURRENCIES = FOREX_COMMISSION_CURRENCIES;
export type CryptoCommissionCurrency = ForexCommissionCurrency;

export const CRYPTO_COMMISSION_TIERS = [0, 1, 2, 3, 4] as const;
export type CryptoCommissionTier = (typeof CRYPTO_COMMISSION_TIERS)[number];

export const CRYPTO_TIER_LABELS: Record<CryptoCommissionTier, string> = {
  0: "0 (default)",
  1: "1",
  2: "2",
  3: "3",
  4: "4",
};

export type CryptoCommissionCell = {
  tier: CryptoCommissionTier;
  currency: CryptoCommissionCurrency;
  amount: number;
};

export type CryptoCommissionTierInfo = {
  tier: CryptoCommissionTier;
  label: string;
  linkedAccountTypes: Array<{ id: number; name: string; slug: string }>;
};

export type CryptoCommissionMatrix = {
  tiers: CryptoCommissionTierInfo[];
  currencies: CryptoCommissionCurrency[];
  cells: CryptoCommissionCell[];
  updatedAt: string | null;
};

export { CURRENCY_SYMBOLS as CRYPTO_CURRENCY_SYMBOLS };

let schemaReady = false;

export function ensureCryptoCommissionsSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_crypto_commission (
      tier INTEGER NOT NULL CHECK(tier >= 0 AND tier <= 4),
      currency TEXT NOT NULL CHECK(currency IN ('USD','EUR','AUD','GBP','RUB','CHF','CNY','JPY','BTC')),
      amount REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (tier, currency)
    );
    CREATE INDEX IF NOT EXISTS idx_crypto_commission_tier ON crm_crypto_commission(tier);
  `);

  ensureAccountTypesSchema();
  try {
    db.exec(`ALTER TABLE crm_account_type ADD COLUMN crypto_commission_tier INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
  try {
    db.exec(`ALTER TABLE user_profiles ADD COLUMN crypto_commission_tier INTEGER NULL`);
  } catch {
    /* column exists */
  }

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_crypto_commission").get() as { c: number };
  if (count.c === 0) seedCryptoCommissions();

  linkAccountTypeTiers();

  schemaReady = true;
}

function seedCryptoCommissions(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO crm_crypto_commission (tier, currency, amount, updated_at) VALUES (?, ?, ?, ?)`,
  );
  for (const tier of CRYPTO_COMMISSION_TIERS) {
    for (const currency of CRYPTO_COMMISSION_CURRENCIES) {
      ins.run(tier, currency, 0, now);
    }
  }
}

function linkAccountTypeTiers(): void {
  const db = getDb();
  const map: Array<[string, CryptoCommissionTier]> = [
    ["default", 0],
    ["retail", 1],
    ["ib-partner", 2],
    ["vip", 4],
  ];
  for (const [slug, tier] of map) {
    db.prepare(
      `UPDATE crm_account_type SET crypto_commission_tier = ? WHERE slug = ? AND crypto_commission_tier = 0`,
    ).run(tier, slug);
  }
  db.prepare(`UPDATE crm_account_type SET crypto_commission_tier = 4 WHERE slug = 'vip'`).run();
}

function tierAccountTypes(tier: CryptoCommissionTier): Array<{ id: number; name: string; slug: string }> {
  return getDb()
    .prepare(`SELECT id, name, slug FROM crm_account_type WHERE crypto_commission_tier = ? ORDER BY name ASC`)
    .all(tier) as Array<{ id: number; name: string; slug: string }>;
}

export function getCryptoCommissionMatrix(): CryptoCommissionMatrix {
  ensureCryptoCommissionsSchema();
  const rows = getDb()
    .prepare(`SELECT tier, currency, amount, updated_at FROM crm_crypto_commission ORDER BY tier, currency`)
    .all() as Array<{ tier: number; currency: string; amount: number; updated_at: string }>;

  const cells: CryptoCommissionCell[] = rows.map((r) => ({
    tier: r.tier as CryptoCommissionTier,
    currency: r.currency as CryptoCommissionCurrency,
    amount: r.amount,
  }));

  const updatedAt = rows.reduce<string | null>((max, r) => {
    if (!max || r.updated_at > max) return r.updated_at;
    return max;
  }, null);

  return {
    tiers: CRYPTO_COMMISSION_TIERS.map((tier) => ({
      tier,
      label: CRYPTO_TIER_LABELS[tier],
      linkedAccountTypes: tierAccountTypes(tier),
    })),
    currencies: [...CRYPTO_COMMISSION_CURRENCIES],
    cells,
    updatedAt,
  };
}

export function bulkUpdateCryptoCommissionMatrix(
  cells: Array<{ tier: number; currency: string; amount: number }>,
): CryptoCommissionMatrix {
  ensureCryptoCommissionsSchema();
  const db = getDb();
  const now = new Date().toISOString();
  const upd = db.prepare(
    `UPDATE crm_crypto_commission SET amount = ?, updated_at = ? WHERE tier = ? AND currency = ?`,
  );

  for (const cell of cells) {
    const tier = Math.max(0, Math.min(4, Math.round(cell.tier)));
    const currency = String(cell.currency).toUpperCase();
    if (!CRYPTO_COMMISSION_CURRENCIES.includes(currency as CryptoCommissionCurrency)) {
      throw new Error(`Invalid currency: ${currency}`);
    }
    if (!Number.isFinite(cell.amount) || cell.amount < 0) {
      throw new Error(`Invalid amount for ${currency} tier ${tier}.`);
    }
    const changes = upd.run(cell.amount, now, tier, currency).changes;
    if (changes === 0) {
      db.prepare(`INSERT INTO crm_crypto_commission (tier, currency, amount, updated_at) VALUES (?, ?, ?, ?)`).run(
        tier,
        currency,
        cell.amount,
        now,
      );
    }
  }

  return getCryptoCommissionMatrix();
}

export function getUserCryptoCommissionTier(userId: string): CryptoCommissionTier {
  ensureCryptoCommissionsSchema();
  const profile = getDb()
    .prepare(`SELECT crypto_commission_tier FROM user_profiles WHERE user_id = ?`)
    .get(userId) as { crypto_commission_tier: number | null } | undefined;
  if (profile?.crypto_commission_tier != null && profile.crypto_commission_tier >= 0 && profile.crypto_commission_tier <= 4) {
    return profile.crypto_commission_tier as CryptoCommissionTier;
  }
  return 0;
}

export function getCryptoCommissionCell(tier: CryptoCommissionTier, currency: CryptoCommissionCurrency): number {
  ensureCryptoCommissionsSchema();
  const row = getDb()
    .prepare(`SELECT amount FROM crm_crypto_commission WHERE tier = ? AND currency = ?`)
    .get(tier, currency) as { amount: number } | undefined;
  return row?.amount ?? 0;
}

export function resolveCryptoCommissionCurrency(userId: string, symbol: string): CryptoCommissionCurrency {
  const s = symbol.toUpperCase();
  if (s.includes("BTC")) return "BTC";
  const row = getDb()
    .prepare(`SELECT currency FROM user_profiles WHERE user_id = ?`)
    .get(userId) as { currency: string } | undefined;
  const c = String(row?.currency ?? "USD").toUpperCase();
  if (CRYPTO_COMMISSION_CURRENCIES.includes(c as CryptoCommissionCurrency)) {
    return c as CryptoCommissionCurrency;
  }
  return "USD";
}

export function computeCryptoMatrixCommission(userId: string, symbol: string): number {
  const tier = getUserCryptoCommissionTier(userId);
  const currency = resolveCryptoCommissionCurrency(userId, symbol);
  return getCryptoCommissionCell(tier, currency);
}
