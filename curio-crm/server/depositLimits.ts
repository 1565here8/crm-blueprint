/**
 * CRM deposit min/max limits — per currency, PSP, region, FTD, and campaign.
 */
import { getDb } from "./db";
import { initPaymentGatewayTables, listPaymentProcessors } from "./paymentGateways";

export const DEPOSIT_LIMIT_TYPES = ["min", "max"] as const;
export type DepositLimitType = (typeof DEPOSIT_LIMIT_TYPES)[number];

export type DepositLimitRow = {
  id: number;
  limit_type: DepositLimitType;
  ftd_only: number;
  currency: string;
  amount: number;
  visual_amount: string;
  psp_processor_id: string | null;
  country_codes: string | null;
  campaign_id: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

export type DepositLimitListItem = DepositLimitRow & {
  psp_processor_name: string | null;
  country_codes_list: string[];
};

export type DepositLimitCreateInput = {
  limitType: DepositLimitType;
  ftdOnly?: boolean;
  currency: string;
  amount: number;
  visualAmount?: string;
  pspProcessorId?: string | null;
  countryCodes?: string[] | null;
  campaignId?: string | null;
  active?: boolean;
};

export type DepositLimitUpdateInput = Partial<DepositLimitCreateInput>;

export type DepositLimitListFilters = {
  search?: string;
  currency?: string;
  limitType?: DepositLimitType;
  ftdOnly?: boolean;
  pspProcessorId?: string;
  activeOnly?: boolean;
};

export type DepositLimitContext = {
  userId: string;
  amount: number;
  currency?: string;
  pspProcessorId?: string | null;
  countryCode?: string | null;
  campaignId?: string | null;
};

let schemaReady = false;

function parseCountryCodes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
    }
  } catch {
    return raw
      .split(/[,;\s]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  }
  return [];
}

function mapListRow(row: DepositLimitRow): DepositLimitListItem {
  const processors = listPaymentProcessors();
  const psp = row.psp_processor_id
    ? processors.find((p) => p.id === row.psp_processor_id)
    : undefined;
  return {
    ...row,
    limit_type: row.limit_type as DepositLimitType,
    psp_processor_name: psp?.gateway_name ?? null,
    country_codes_list: parseCountryCodes(row.country_codes),
  };
}

function seedDepositLimits(): void {
  const db = getDb();
  initPaymentGatewayTables();
  const processors = listPaymentProcessors();
  const cardPsp = processors.find((p) => p.gateway_name === "directPay")?.id ?? null;
  const now = new Date().toISOString();

  const ins = db.prepare(
    `INSERT INTO crm_deposit_limit
     (limit_type, ftd_only, currency, amount, visual_amount, psp_processor_id, country_codes,
      campaign_id, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const rows: Array<[
    DepositLimitType,
    number,
    string,
    number,
    string,
    string | null,
    string | null,
    string | null,
    number,
    string,
    string,
  ]> = [
    ["min", 0, "USD", 50, "$50", cardPsp, null, null, 1, now, now],
    ["min", 1, "USD", 100, "$100", null, null, null, 1, now, now],
    ["max", 0, "USD", 10000, "$10,000", null, null, null, 1, now, now],
    ["min", 0, "JPY", 5000, "¥5,000", null, null, null, 1, now, now],
    ["max", 0, "JPY", 500000, "¥500,000", null, null, null, 1, now, now],
    ["min", 0, "CNY", 100, "¥100", null, '["CN","HK"]', null, 1, now, now],
    ["max", 0, "CHF", 50000, "CHF 50,000", null, '["CH","LI"]', null, 1, now, now],
    ["min", 0, "RUB", 3000, "₽3,000", null, '["RU"]', null, 1, now, now],
    ["max", 0, "GBP", 25000, "£25,000", null, null, null, 1, now, now],
    ["min", 1, "AUD", 100, "A$100", null, '["AU","NZ"]', null, 1, now, now],
    ["max", 0, "BTC", 2, "₿2", processors.find((p) => p.gateway_name === "bitcoBrokers")?.id ?? null, null, null, 1, now, now],
    ["max", 0, "USD", 100, "$100", cardPsp, '["US"]', null, 1, now, now],
  ];

  for (const r of rows) {
    ins.run(...r);
  }
}

export function ensureDepositLimitsSchema(): void {
  if (schemaReady) return;
  initPaymentGatewayTables();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_deposit_limit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      limit_type TEXT NOT NULL CHECK(limit_type IN ('min', 'max')),
      ftd_only INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      amount REAL NOT NULL,
      visual_amount TEXT NOT NULL DEFAULT '',
      psp_processor_id TEXT,
      country_codes TEXT,
      campaign_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_deposit_limit_currency ON crm_deposit_limit(currency);
    CREATE INDEX IF NOT EXISTS idx_deposit_limit_type ON crm_deposit_limit(limit_type);
    CREATE INDEX IF NOT EXISTS idx_deposit_limit_active ON crm_deposit_limit(active);
  `);

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_deposit_limit").get() as { c: number };
  if (count.c === 0) seedDepositLimits();

  schemaReady = true;
}

function userIsFirstDeposit(userId: string): boolean {
  const row = getDb()
    .prepare(
      `SELECT 1 FROM deposit_requests
       WHERE user_id = ? AND status = 'approved' LIMIT 1`,
    )
    .get(userId);
  return !row;
}

function ruleMatches(row: DepositLimitRow, ctx: DepositLimitContext, isFtd: boolean): boolean {
  if (row.active !== 1) return false;
  if (row.ftd_only === 1 && !isFtd) return false;

  const currency = (ctx.currency ?? "USD").toUpperCase();
  if (row.currency.toUpperCase() !== currency) return false;

  if (row.psp_processor_id) {
    if (!ctx.pspProcessorId || ctx.pspProcessorId !== row.psp_processor_id) return false;
  }

  const countries = parseCountryCodes(row.country_codes);
  if (countries.length > 0) {
    const userCountry = (ctx.countryCode ?? "").toUpperCase();
    if (!userCountry || !countries.includes(userCountry)) return false;
  }

  if (row.campaign_id) {
    if (!ctx.campaignId || ctx.campaignId !== row.campaign_id) return false;
  }

  return true;
}

function getUserDepositContext(userId: string): Pick<DepositLimitContext, "currency" | "countryCode"> {
  const row = getDb()
    .prepare(
      `SELECT currency, country_code FROM user_profiles WHERE user_id = ? LIMIT 1`,
    )
    .get(userId) as { currency: string; country_code: string } | undefined;
  return {
    currency: row?.currency ?? "USD",
    countryCode: row?.country_code ?? null,
  };
}

export function validateDepositAmount(ctx: DepositLimitContext): void {
  ensureDepositLimitsSchema();
  const profile = getUserDepositContext(ctx.userId);
  const fullCtx: DepositLimitContext = {
    ...ctx,
    currency: ctx.currency ?? profile.currency ?? "USD",
    countryCode: ctx.countryCode ?? profile.countryCode ?? null,
  };

  const isFtd = userIsFirstDeposit(fullCtx.userId);
  const rows = getDb()
    .prepare("SELECT * FROM crm_deposit_limit WHERE active = 1")
    .all() as DepositLimitRow[];

  const matching = rows.filter((r) => ruleMatches(r, fullCtx, isFtd));
  const mins = matching.filter((r) => r.limit_type === "min");
  const maxs = matching.filter((r) => r.limit_type === "max");

  if (mins.length > 0) {
    const strictestMin = mins.reduce((best, r) => (r.amount > best.amount ? r : best));
    if (fullCtx.amount < strictestMin.amount) {
      const label = strictestMin.visual_amount || `${strictestMin.amount} ${strictestMin.currency}`;
      throw new Error(
        `Deposit below minimum (${label}). Increase the amount or contact support if you need a lower limit.`,
      );
    }
  }

  if (maxs.length > 0) {
    const strictestMax = maxs.reduce((best, r) => (r.amount < best.amount ? r : best));
    if (fullCtx.amount > strictestMax.amount) {
      const label = strictestMax.visual_amount || `${strictestMax.amount} ${strictestMax.currency}`;
      throw new Error(
        `Deposit exceeds maximum (${label}). Complete KYC for higher limits or split into smaller deposits.`,
      );
    }
  }
}

export function explainDepositLimitRule(row: DepositLimitListItem): string {
  const amountLabel = row.visual_amount || `${row.amount} ${row.currency}`;
  const parts: string[] = [];

  parts.push(
    row.limit_type === "min"
      ? `Clients must deposit at least ${amountLabel}.`
      : `Clients cannot deposit more than ${amountLabel}.`,
  );

  if (row.ftd_only) {
    parts.push("This rule applies only on the client's first approved deposit (FTD).");
  } else {
    parts.push("This rule applies on every deposit attempt, first-time or repeat.");
  }

  parts.push(`Currency: ${row.currency}.`);

  if (row.psp_processor_name) {
    parts.push(`Payment processor: ${row.psp_processor_name} only.`);
  } else {
    parts.push("Applies to all payment processors unless a PSP-specific rule is stricter.");
  }

  if (row.country_codes_list.length > 0) {
    parts.push(`Regions: ${row.country_codes_list.join(", ")}.`);
  } else {
    parts.push("Applies globally (all countries).");
  }

  if (row.campaign_id) {
    parts.push(`Campaign filter: ${row.campaign_id}.`);
  }

  if (row.limit_type === "min") {
    parts.push("Use minimums to block micro-deposits and card-testing fraud.");
  } else {
    parts.push("Use maximums where KYC cannot verify high rollers or PSP caps exposure.");
  }

  return parts.join(" ");
}

export function listDepositLimits(filters: DepositLimitListFilters = {}): {
  rows: DepositLimitListItem[];
} {
  ensureDepositLimitsSchema();
  const db = getDb();
  let sql = "SELECT * FROM crm_deposit_limit WHERE 1=1";
  const params: unknown[] = [];

  if (filters.currency) {
    sql += " AND currency = ? COLLATE NOCASE";
    params.push(filters.currency.toUpperCase());
  }
  if (filters.limitType) {
    sql += " AND limit_type = ?";
    params.push(filters.limitType);
  }
  if (filters.ftdOnly === true) {
    sql += " AND ftd_only = 1";
  } else if (filters.ftdOnly === false) {
    sql += " AND ftd_only = 0";
  }
  if (filters.pspProcessorId) {
    sql += " AND psp_processor_id = ?";
    params.push(filters.pspProcessorId);
  }
  if (filters.activeOnly === true) {
    sql += " AND active = 1";
  } else if (filters.activeOnly === false) {
    sql += " AND active = 0";
  }

  sql += " ORDER BY id ASC";

  let rows = (db.prepare(sql).all(...params) as DepositLimitRow[]).map(mapListRow);

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        String(r.id).includes(q) ||
        r.currency.toLowerCase().includes(q) ||
        r.visual_amount.toLowerCase().includes(q) ||
        r.limit_type.includes(q) ||
        (r.psp_processor_name?.toLowerCase().includes(q) ?? false) ||
        (r.campaign_id?.toLowerCase().includes(q) ?? false),
    );
  }

  return { rows };
}

export function getDepositLimitOptions(): {
  processors: Array<{ id: string; gatewayName: string }>;
  currencies: string[];
  campaigns: Array<{ id: string; name: string }>;
  countries: Array<{ iso: string; name: string }>;
} {
  ensureDepositLimitsSchema();
  const db = getDb();
  const processors = listPaymentProcessors().map((p) => ({
    id: p.id,
    gatewayName: p.gateway_name,
  }));

  const currencyRows = db
    .prepare("SELECT DISTINCT currency FROM crm_deposit_limit ORDER BY currency")
    .all() as Array<{ currency: string }>;
  const seeded = ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "RUB", "AUD", "BTC"];
  const currencies = [...new Set([...seeded, ...currencyRows.map((r) => r.currency.toUpperCase())])];

  let campaigns: Array<{ id: string; name: string }> = [];
  try {
    campaigns = db
      .prepare("SELECT id, name FROM marketing_campaigns ORDER BY name LIMIT 200")
      .all() as Array<{ id: string; name: string }>;
  } catch {
    campaigns = [];
  }

  let countries: Array<{ iso: string; name: string }> = [];
  try {
    countries = db
      .prepare("SELECT iso, name FROM platform_countries ORDER BY name LIMIT 300")
      .all() as Array<{ iso: string; name: string }>;
  } catch {
    countries = [];
  }

  return { processors, currencies, campaigns, countries };
}

export function getDepositLimit(id: number): DepositLimitListItem | null {
  ensureDepositLimitsSchema();
  const row = getDb().prepare("SELECT * FROM crm_deposit_limit WHERE id = ?").get(id) as
    | DepositLimitRow
    | undefined;
  return row ? mapListRow(row) : null;
}

function validateInput(input: DepositLimitCreateInput, existingId?: number): void {
  if (!(DEPOSIT_LIMIT_TYPES as readonly string[]).includes(input.limitType)) {
    throw new Error("Invalid limit type.");
  }
  const currency = input.currency.trim().toUpperCase();
  if (!currency || currency.length > 8) throw new Error("Currency is required.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }

  if (input.pspProcessorId) {
    const psp = listPaymentProcessors().find((p) => p.id === input.pspProcessorId);
    if (!psp) throw new Error("Payment processor not found.");
  }

  if (input.campaignId) {
    const c = getDb()
      .prepare("SELECT id FROM marketing_campaigns WHERE id = ?")
      .get(input.campaignId);
    if (!c) throw new Error("Campaign not found.");
  }

  void existingId;
}

export function createDepositLimit(input: DepositLimitCreateInput): DepositLimitListItem {
  ensureDepositLimitsSchema();
  validateInput(input);
  const now = new Date().toISOString();
  const currency = input.currency.trim().toUpperCase();
  const visual =
    (input.visualAmount ?? "").trim() ||
    `${input.amount.toLocaleString("en-US")} ${currency}`;
  const countryJson =
    input.countryCodes && input.countryCodes.length > 0
      ? JSON.stringify(input.countryCodes.map((c) => c.trim().toUpperCase()))
      : null;

  const r = getDb()
    .prepare(
      `INSERT INTO crm_deposit_limit
       (limit_type, ftd_only, currency, amount, visual_amount, psp_processor_id, country_codes,
        campaign_id, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.limitType,
      input.ftdOnly ? 1 : 0,
      currency,
      input.amount,
      visual,
      input.pspProcessorId ?? null,
      countryJson,
      input.campaignId ?? null,
      input.active === false ? 0 : 1,
      now,
      now,
    );

  const created = getDepositLimit(Number(r.lastInsertRowid));
  if (!created) throw new Error("Could not create deposit limit.");
  return created;
}

export function updateDepositLimit(id: number, input: DepositLimitUpdateInput): DepositLimitListItem {
  ensureDepositLimitsSchema();
  const existing = getDepositLimit(id);
  if (!existing) throw new Error("Deposit limit not found.");

  const merged: DepositLimitCreateInput = {
    limitType: input.limitType ?? existing.limit_type,
    ftdOnly: input.ftdOnly ?? existing.ftd_only === 1,
    currency: input.currency ?? existing.currency,
    amount: input.amount ?? existing.amount,
    visualAmount: input.visualAmount ?? existing.visual_amount,
    pspProcessorId:
      input.pspProcessorId !== undefined ? input.pspProcessorId : existing.psp_processor_id,
    countryCodes:
      input.countryCodes !== undefined ? input.countryCodes : existing.country_codes_list,
    campaignId: input.campaignId !== undefined ? input.campaignId : existing.campaign_id,
    active: input.active !== undefined ? input.active : existing.active === 1,
  };

  validateInput(merged, id);
  const now = new Date().toISOString();
  const currency = merged.currency.trim().toUpperCase();
  const visual =
    (merged.visualAmount ?? "").trim() ||
    `${merged.amount.toLocaleString("en-US")} ${currency}`;
  const countryJson =
    merged.countryCodes && merged.countryCodes.length > 0
      ? JSON.stringify(merged.countryCodes.map((c) => c.trim().toUpperCase()))
      : null;

  getDb()
    .prepare(
      `UPDATE crm_deposit_limit SET
         limit_type = ?, ftd_only = ?, currency = ?, amount = ?, visual_amount = ?,
         psp_processor_id = ?, country_codes = ?, campaign_id = ?, active = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      merged.limitType,
      merged.ftdOnly ? 1 : 0,
      currency,
      merged.amount,
      visual,
      merged.pspProcessorId ?? null,
      countryJson,
      merged.campaignId ?? null,
      merged.active === false ? 0 : 1,
      now,
      id,
    );

  const updated = getDepositLimit(id);
  if (!updated) throw new Error("Could not update deposit limit.");
  return updated;
}

export function deleteDepositLimit(id: number): boolean {
  ensureDepositLimitsSchema();
  const r = getDb().prepare("DELETE FROM crm_deposit_limit WHERE id = ?").run(id);
  return r.changes > 0;
}

/** @deprecated alias — use validateDepositAmount */
export function assertDepositWithinLimits(ctx: DepositLimitContext): void {
  validateDepositAmount(ctx);
}

export function resolveDepositLimitContext(userId: string): {
  currency: string;
  countryCode: string | null;
} {
  const ctx = getUserDepositContext(userId);
  return {
    currency: ctx.currency ?? "USD",
    countryCode: ctx.countryCode ?? null,
  };
}
