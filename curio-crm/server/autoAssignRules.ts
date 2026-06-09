/**
 * Auto-assign rules — route new leads to desk agents by promo, campaign, country, etc.
 *
 * Runtime hook: call `resolveAutoAssignAgent(lead)` when a lead is created (signup,
 * API import, Hot Leads ingest). Returns the first active rule match by precedence
 * (1 = highest priority). Wire into lead creation once assignment UX is live.
 */
import { getDb, listMarketingCampaigns } from "./db";

export const AUTO_ASSIGN_RULE_TYPES = [
  "promo_code",
  "campaign",
  "country",
  "language",
  "all_leads",
] as const;

export type AutoAssignRuleType = (typeof AUTO_ASSIGN_RULE_TYPES)[number];

export type AutoAssignRuleRow = {
  id: number;
  rule_type: AutoAssignRuleType;
  target_key: string;
  agent_id: string;
  agent_label: string;
  active: number;
  precedence: number;
  created_at: string;
};

export type AutoAssignRuleDto = {
  id: number;
  ruleType: AutoAssignRuleType;
  targetKey: string;
  agentId: string;
  agentLabel: string;
  active: boolean;
  precedence: number;
  createdAt: string;
  /** Legacy-style label, e.g. "Campaigns: Amazon" */
  autoAssignedFor: string;
};

export type LeadForAutoAssign = {
  promoCode?: string | null;
  campaign?: string | null;
  country?: string | null;
  language?: string | null;
};

export type AutoAssignCreateInput = {
  ruleType: AutoAssignRuleType;
  targetKey: string;
  agentId: string;
  agentLabel: string;
  active?: boolean;
  precedence?: number;
};

const RULE_TYPE_LABELS: Record<AutoAssignRuleType, string> = {
  promo_code: "Promo Codes",
  campaign: "Campaigns",
  country: "Country",
  language: "Language",
  all_leads: "All leads",
};

let schemaReady = false;

function normalizeTarget(ruleType: AutoAssignRuleType, raw: string): string {
  const t = raw.trim();
  if (ruleType === "promo_code") return t.toUpperCase().replace(/\s+/g, "");
  if (ruleType === "all_leads") return t || "*";
  return t;
}

function formatAutoAssignedFor(ruleType: AutoAssignRuleType, targetKey: string): string {
  const label = RULE_TYPE_LABELS[ruleType];
  const key = ruleType === "all_leads" && (targetKey === "*" || !targetKey) ? "all" : targetKey;
  return `${label}: ${key}`;
}

function toDto(row: AutoAssignRuleRow): AutoAssignRuleDto {
  return {
    id: row.id,
    ruleType: row.rule_type,
    targetKey: row.target_key,
    agentId: row.agent_id,
    agentLabel: row.agent_label,
    active: Boolean(row.active),
    precedence: row.precedence,
    createdAt: row.created_at,
    autoAssignedFor: formatAutoAssignedFor(row.rule_type, row.target_key),
  };
}

function tableHasColumn(db: ReturnType<typeof getDb>, column: string): boolean {
  const cols = db.prepare("PRAGMA table_info(crm_auto_assign_rule)").all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function migrateLegacyAutoAssignTable(db: ReturnType<typeof getDb>): void {
  if (!tableHasColumn(db, "promo_code_id")) return;

  const legacy = db
    .prepare(
      `SELECT r.id, r.name, r.promo_code_id, r.active, r.created_at, p.code
       FROM crm_auto_assign_rule r
       LEFT JOIN crm_promo_code p ON p.id = r.promo_code_id`,
    )
    .all() as Array<{
    id: number;
    name: string;
    promo_code_id: number | null;
    active: number;
    created_at: string;
    code: string | null;
  }>;

  db.exec(`
    CREATE TABLE crm_auto_assign_rule_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_type TEXT NOT NULL,
      target_key TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_label TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      precedence INTEGER NOT NULL DEFAULT 99,
      created_at TEXT NOT NULL
    );
  `);

  const ins = db.prepare(
    `INSERT INTO crm_auto_assign_rule_new
     (rule_type, target_key, agent_id, agent_label, active, precedence, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  let prec = 1;
  for (const row of legacy) {
    if (row.code) {
      ins.run("promo_code", row.code, "legacy-unassigned", row.name || "Legacy rule", row.active, prec++, row.created_at);
    }
  }

  db.exec(`DROP TABLE crm_auto_assign_rule;`);
  db.exec(`ALTER TABLE crm_auto_assign_rule_new RENAME TO crm_auto_assign_rule;`);
}

export function ensureAutoAssignRulesSchema(): void {
  if (schemaReady) return;
  const db = getDb();

  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='crm_auto_assign_rule'")
    .get();

  if (exists && tableHasColumn(db, "promo_code_id")) {
    migrateLegacyAutoAssignTable(db);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_auto_assign_rule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_type TEXT NOT NULL,
      target_key TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_label TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      precedence INTEGER NOT NULL DEFAULT 99,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auto_assign_precedence ON crm_auto_assign_rule(precedence);
    CREATE INDEX IF NOT EXISTS idx_auto_assign_type_target ON crm_auto_assign_rule(rule_type, target_key);
  `);

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_auto_assign_rule").get() as { c: number };
  if (count.c === 0) seedAutoAssignRules();

  schemaReady = true;
}

function seedAutoAssignRules(): void {
  const db = getDb();
  const now = new Date().toISOString();
  const ins = db.prepare(
    `INSERT INTO crm_auto_assign_rule
     (rule_type, target_key, agent_id, agent_label, active, precedence, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const rows: Array<[AutoAssignRuleType, string, string, string, number, number]> = [
    ["promo_code", "VIP23", "seed-trader-rich", "Trader Rich", 1, 1],
    ["campaign", "all-campaigns", "seed-admin-broker", "Admin Broker", 1, 2],
    ["campaign", "Amazon", "seed-adminnew", "adminnew", 1, 3],
    ["country", "US", "seed-trader-rich", "Trader Rich", 1, 4],
    ["language", "en", "seed-admin-broker", "Admin Broker", 0, 5],
    ["campaign", "Facebook", "seed-adminnew", "adminnew", 1, 6],
    ["all_leads", "*", "seed-trader-rich", "Trader Rich", 1, 7],
  ];

  for (const [ruleType, targetKey, agentId, agentLabel, active, precedence] of rows) {
    ins.run(ruleType, targetKey, agentId, agentLabel, active, precedence, now);
  }

  const campaigns = listMarketingCampaigns() as Array<{ name: string }>;
  const hasAmazon = campaigns.some((c) => c.name.toLowerCase() === "amazon");
  if (!hasAmazon) {
    /* optional — marketing may seed separately */
  }
}

export function listAutoAssignRules(): { rows: AutoAssignRuleDto[] } {
  ensureAutoAssignRulesSchema();
  const rows = getDb()
    .prepare(
      `SELECT id, rule_type, target_key, agent_id, agent_label, active, precedence, created_at
       FROM crm_auto_assign_rule
       ORDER BY precedence ASC, id ASC`,
    )
    .all() as AutoAssignRuleRow[];
  return { rows: rows.map(toDto) };
}

export function getAutoAssignRule(id: number): AutoAssignRuleDto | null {
  ensureAutoAssignRulesSchema();
  const row = getDb()
    .prepare(
      `SELECT id, rule_type, target_key, agent_id, agent_label, active, precedence, created_at
       FROM crm_auto_assign_rule WHERE id = ?`,
    )
    .get(id) as AutoAssignRuleRow | undefined;
  return row ? toDto(row) : null;
}

export function promoCodeUsedInAutoAssign(promoCode: string): boolean {
  ensureAutoAssignRulesSchema();
  const key = normalizeTarget("promo_code", promoCode);
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM crm_auto_assign_rule WHERE rule_type = 'promo_code' AND target_key = ? COLLATE NOCASE`,
    )
    .get(key) as { c: number };
  return row.c > 0;
}

function nextPrecedence(): number {
  const row = getDb().prepare("SELECT MAX(precedence) AS m FROM crm_auto_assign_rule").get() as {
    m: number | null;
  };
  return (row.m ?? 0) + 1;
}

export function createAutoAssignRule(input: AutoAssignCreateInput): AutoAssignRuleDto {
  ensureAutoAssignRulesSchema();
  if (!(AUTO_ASSIGN_RULE_TYPES as readonly string[]).includes(input.ruleType)) {
    throw new Error("Invalid rule type.");
  }
  const targetKey = normalizeTarget(input.ruleType, input.targetKey);
  if (!targetKey && input.ruleType !== "all_leads") {
    throw new Error("Target is required.");
  }
  if (!input.agentId?.trim()) throw new Error("Agent is required.");
  const agentLabel = (input.agentLabel ?? input.agentId).trim() || input.agentId;

  const now = new Date().toISOString();
  const precedence = input.precedence ?? nextPrecedence();

  const r = getDb()
    .prepare(
      `INSERT INTO crm_auto_assign_rule
       (rule_type, target_key, agent_id, agent_label, active, precedence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.ruleType,
      targetKey,
      input.agentId.trim(),
      agentLabel,
      input.active === false ? 0 : 1,
      Math.max(1, Math.min(99, Math.round(precedence))),
      now,
    );

  const created = getAutoAssignRule(Number(r.lastInsertRowid));
  if (!created) throw new Error("Could not create rule.");
  return created;
}

export function updateAutoAssignRule(
  id: number,
  patch: Partial<AutoAssignCreateInput>,
): AutoAssignRuleDto | null {
  ensureAutoAssignRulesSchema();
  const existing = getAutoAssignRule(id);
  if (!existing) return null;

  const ruleType = patch.ruleType ?? existing.ruleType;
  const targetKey =
    patch.targetKey !== undefined ? normalizeTarget(ruleType, patch.targetKey) : existing.targetKey;
  const agentId = patch.agentId?.trim() ?? existing.agentId;
  const agentLabel = (patch.agentLabel ?? existing.agentLabel).trim() || agentId;
  const active = patch.active !== undefined ? (patch.active ? 1 : 0) : existing.active ? 1 : 0;
  const precedence =
    patch.precedence !== undefined
      ? Math.max(1, Math.min(99, Math.round(patch.precedence)))
      : existing.precedence;

  getDb()
    .prepare(
      `UPDATE crm_auto_assign_rule
       SET rule_type = ?, target_key = ?, agent_id = ?, agent_label = ?, active = ?, precedence = ?
       WHERE id = ?`,
    )
    .run(ruleType, targetKey, agentId, agentLabel, active, precedence, id);

  return getAutoAssignRule(id);
}

export function deleteAutoAssignRule(id: number): boolean {
  ensureAutoAssignRulesSchema();
  const r = getDb().prepare("DELETE FROM crm_auto_assign_rule WHERE id = ?").run(id);
  return r.changes > 0;
}

export function reorderAutoAssignPrecedence(orderedIds: number[]): { rows: AutoAssignRuleDto[] } {
  ensureAutoAssignRulesSchema();
  const db = getDb();
  const txn = db.transaction((ids: number[]) => {
    ids.forEach((id, idx) => {
      db.prepare("UPDATE crm_auto_assign_rule SET precedence = ? WHERE id = ?").run(idx + 1, id);
    });
  });
  txn(orderedIds);
  return listAutoAssignRules();
}

/**
 * Resolve which agent should own a new lead. First active rule by precedence wins.
 * Integrate at lead-create: assign `agent_id` on profile from returned agentId.
 */
export function resolveAutoAssignAgent(lead: LeadForAutoAssign): {
  agentId: string;
  agentLabel: string;
  ruleId: number;
} | null {
  ensureAutoAssignRulesSchema();
  const rules = getDb()
    .prepare(
      `SELECT id, rule_type, target_key, agent_id, agent_label, active, precedence, created_at
       FROM crm_auto_assign_rule
       WHERE active = 1
       ORDER BY precedence ASC, id ASC`,
    )
    .all() as AutoAssignRuleRow[];

  const promo = lead.promoCode?.trim().toUpperCase().replace(/\s+/g, "") ?? "";
  const campaign = lead.campaign?.trim() ?? "";
  const country = lead.country?.trim().toUpperCase() ?? "";
  const language = lead.language?.trim().toLowerCase() ?? "";

  for (const rule of rules) {
    if (rule.rule_type === "all_leads") {
      return { agentId: rule.agent_id, agentLabel: rule.agent_label, ruleId: rule.id };
    }
    if (rule.rule_type === "promo_code" && promo && rule.target_key.toUpperCase() === promo) {
      return { agentId: rule.agent_id, agentLabel: rule.agent_label, ruleId: rule.id };
    }
    if (rule.rule_type === "campaign") {
      const key = rule.target_key.toLowerCase();
      if (key === "all-campaigns" && campaign) {
        return { agentId: rule.agent_id, agentLabel: rule.agent_label, ruleId: rule.id };
      }
      if (campaign && key === campaign.toLowerCase()) {
        return { agentId: rule.agent_id, agentLabel: rule.agent_label, ruleId: rule.id };
      }
    }
    if (rule.rule_type === "country" && country && rule.target_key.toUpperCase() === country) {
      return { agentId: rule.agent_id, agentLabel: rule.agent_label, ruleId: rule.id };
    }
    if (rule.rule_type === "language" && language && rule.target_key.toLowerCase() === language) {
      return { agentId: rule.agent_id, agentLabel: rule.agent_label, ruleId: rule.id };
    }
  }

  return null;
}

export function getAutoAssignOptions(): {
  campaigns: Array<{ id: string; name: string }>;
  promoCodes: Array<{ code: string; label: string }>;
} {
  ensureAutoAssignRulesSchema();
  const campaigns = (listMarketingCampaigns() as Array<{ id: string; name: string }>).map((c) => ({
    id: c.id,
    name: c.name,
  }));
  const db = getDb();
  const hasPromo = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='crm_promo_code'")
    .get();
  const promoCodes = hasPromo
    ? (db.prepare("SELECT code, label FROM crm_promo_code WHERE active = 1 ORDER BY code").all() as Array<{
        code: string;
        label: string;
      }>)
    : [];
  return { campaigns, promoCodes };
}
