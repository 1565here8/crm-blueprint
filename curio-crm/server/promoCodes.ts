/**
 * CRM Promo Codes — registration / affiliate bonus codes (legacy broker CRM parity).
 */
import { getDb } from "./db";
import { ensureAccountTypesSchema, listAccountTypes } from "./accountTypes";
import { ensureDeskGroupsSchema, listDeskGroups } from "./deskGroups";
import { ensureAutoAssignRulesSchema, promoCodeUsedInAutoAssign } from "./autoAssignRules";

export const PROMO_PURPOSES = ["investor", "affiliate", "bonus", "demo", "custom"] as const;
export type PromoPurpose = (typeof PROMO_PURPOSES)[number];

export type PromoCodeRow = {
  id: number;
  code: string;
  purpose: PromoPurpose;
  label: string;
  bonus_amount: number | null;
  bonus_percent: number | null;
  assign_group_id: string | null;
  assign_account_type_id: number | null;
  max_uses: number | null;
  use_count: number;
  active: number;
  expires_at: string | null;
  created_at: string;
};

export type PromoCodeListItem = PromoCodeRow & {
  used_in_auto_assign: boolean;
  assign_group_name: string | null;
  assign_account_type_name: string | null;
};

export type PromoCodeCreateInput = {
  code: string;
  purpose?: PromoPurpose;
  label?: string;
  bonusAmount?: number | null;
  bonusPercent?: number | null;
  assignGroupId?: string | null;
  assignAccountTypeId?: number | null;
  maxUses?: number | null;
  active?: boolean;
  expiresAt?: string | null;
};

let schemaReady = false;

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function seedPromoCodes(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO crm_promo_code
     (code, purpose, label, bonus_amount, bonus_percent, assign_group_id, assign_account_type_id,
      max_uses, use_count, active, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const rows: Array<[
    string,
    PromoPurpose,
    string,
    number | null,
    number | null,
    string | null,
    number | null,
    number | null,
    number,
    number,
    string | null,
    string,
  ]> = [
    ["VIP23", "investor", "VIP23", null, 10, null, null, null, 0, 1, null, now],
    ["VIK5", "affiliate", "VIK5", null, 5, "affiliate", null, null, 0, 1, null, now],
    ["123123", "custom", "123123", null, null, null, null, null, 0, 1, null, now],
  ];

  for (const r of rows) {
    ins.run(...r);
  }
}

export function ensurePromoCodesSchema(): void {
  if (schemaReady) return;
  ensureDeskGroupsSchema();
  ensureAccountTypesSchema();
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_promo_code (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE COLLATE NOCASE,
      purpose TEXT NOT NULL DEFAULT 'custom',
      label TEXT NOT NULL DEFAULT '',
      bonus_amount REAL,
      bonus_percent REAL,
      assign_group_id TEXT,
      assign_account_type_id INTEGER,
      max_uses INTEGER,
      use_count INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_promo_code_purpose ON crm_promo_code(purpose);
    CREATE INDEX IF NOT EXISTS idx_promo_code_active ON crm_promo_code(active);
  `);

  ensureAutoAssignRulesSchema();

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_promo_code").get() as { c: number };
  if (count.c === 0) seedPromoCodes();

  schemaReady = true;
}

function mapListRow(row: PromoCodeRow & { used_in_auto_assign?: number }): PromoCodeListItem {
  const db = getDb();
  let assignGroupName: string | null = null;
  let assignAccountTypeName: string | null = null;

  if (row.assign_group_id) {
    const g = db.prepare("SELECT name FROM desk_groups WHERE id = ?").get(row.assign_group_id) as
      | { name: string }
      | undefined;
    assignGroupName = g?.name ?? null;
  }
  if (row.assign_account_type_id) {
    const t = db.prepare("SELECT name FROM crm_account_type WHERE id = ?").get(row.assign_account_type_id) as
      | { name: string }
      | undefined;
    assignAccountTypeName = t?.name ?? null;
  }

  return {
    ...row,
    purpose: row.purpose as PromoPurpose,
    used_in_auto_assign: Boolean(row.used_in_auto_assign),
    assign_group_name: assignGroupName,
    assign_account_type_name: assignAccountTypeName,
  };
}

export function listPromoCodes(): { rows: PromoCodeListItem[] } {
  ensurePromoCodesSchema();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT p.id, p.code, p.purpose, p.label, p.bonus_amount, p.bonus_percent,
              p.assign_group_id, p.assign_account_type_id, p.max_uses, p.use_count,
              p.active, p.expires_at, p.created_at,
              CASE WHEN EXISTS (
                SELECT 1 FROM crm_auto_assign_rule r
                WHERE r.rule_type = 'promo_code' AND r.target_key = p.code COLLATE NOCASE
              ) THEN 1 ELSE 0 END AS used_in_auto_assign
       FROM crm_promo_code p
       ORDER BY p.id ASC`,
    )
    .all() as Array<PromoCodeRow & { used_in_auto_assign: number }>;

  return { rows: rows.map(mapListRow) };
}

export function getPromoCodeOptions(): {
  deskGroups: Array<{ id: string; name: string }>;
  accountTypes: Array<{ id: number; name: string }>;
  purposes: PromoPurpose[];
} {
  ensurePromoCodesSchema();
  const groups = listDeskGroups().map((g) => ({ id: g.id, name: g.name }));
  const types = listAccountTypes({ limit: 100, activeOnly: true }).rows.map((t) => ({
    id: t.id,
    name: t.name,
  }));
  return { deskGroups: groups, accountTypes: types, purposes: [...PROMO_PURPOSES] };
}

export function getPromoCode(id: number): PromoCodeListItem | null {
  ensurePromoCodesSchema();
  const row = getDb()
    .prepare(
      `SELECT p.id, p.code, p.purpose, p.label, p.bonus_amount, p.bonus_percent,
              p.assign_group_id, p.assign_account_type_id, p.max_uses, p.use_count,
              p.active, p.expires_at, p.created_at,
              CASE WHEN EXISTS (
                SELECT 1 FROM crm_auto_assign_rule r
                WHERE r.rule_type = 'promo_code' AND r.target_key = p.code COLLATE NOCASE
              ) THEN 1 ELSE 0 END AS used_in_auto_assign
       FROM crm_promo_code p WHERE p.id = ?`,
    )
    .get(id) as (PromoCodeRow & { used_in_auto_assign: number }) | undefined;
  return row ? mapListRow(row) : null;
}

export function createPromoCode(input: PromoCodeCreateInput): PromoCodeListItem {
  ensurePromoCodesSchema();
  const code = normalizeCode(input.code);
  if (!code) throw new Error("Promo code is required.");
  if (code.length > 32) throw new Error("Promo code must be 32 characters or fewer.");

  const purpose = input.purpose ?? "custom";
  if (!(PROMO_PURPOSES as readonly string[]).includes(purpose)) {
    throw new Error("Invalid promo purpose.");
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM crm_promo_code WHERE code = ? COLLATE NOCASE").get(code);
  if (existing) throw new Error("That promo code already exists.");

  if (input.assignGroupId) {
    const g = db.prepare("SELECT id FROM desk_groups WHERE id = ?").get(input.assignGroupId);
    if (!g) throw new Error("Desk group not found.");
  }
  if (input.assignAccountTypeId) {
    const t = db.prepare("SELECT id FROM crm_account_type WHERE id = ?").get(input.assignAccountTypeId);
    if (!t) throw new Error("Account type not found.");
  }

  const bonusPercent =
    input.bonusPercent != null && input.bonusPercent !== undefined
      ? Math.max(0, Math.min(100, input.bonusPercent))
      : null;
  const bonusAmount =
    input.bonusAmount != null && input.bonusAmount !== undefined ? Math.max(0, input.bonusAmount) : null;
  const maxUses =
    input.maxUses != null && input.maxUses !== undefined ? Math.max(1, Math.round(input.maxUses)) : null;

  const now = new Date().toISOString();
  const label = (input.label ?? code).trim() || code;

  const r = db
    .prepare(
      `INSERT INTO crm_promo_code
       (code, purpose, label, bonus_amount, bonus_percent, assign_group_id, assign_account_type_id,
        max_uses, use_count, active, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .run(
      code,
      purpose,
      label,
      bonusAmount,
      bonusPercent,
      input.assignGroupId ?? null,
      input.assignAccountTypeId ?? null,
      maxUses,
      input.active === false ? 0 : 1,
      input.expiresAt ?? null,
      now,
    );

  const created = getPromoCode(Number(r.lastInsertRowid));
  if (!created) throw new Error("Could not create promo code.");
  return created;
}

export function deletePromoCode(id: number): boolean {
  ensurePromoCodesSchema();
  const db = getDb();
  const existing = getPromoCode(id);
  if (!existing) return false;
  if (promoCodeUsedInAutoAssign(existing.code)) {
    throw new Error("Used in auto-assign rules.");
  }
  db.prepare("DELETE FROM crm_promo_code WHERE id = ?").run(id);
  return true;
}
