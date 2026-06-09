/**
 * RULE ROOM — admin-authored prompt rules injected into LLM calls.
 *
 * Each rule has a SCOPE that determines which LLM endpoints receive it:
 *   global           every desk call
 *   operator_brief   morning operator brief
 *   agent_brief      agent floor pitch brief
 *   client_pitch     per-client phone script
 *   concierge        public concierge widget
 *   email_drafts     drip-engine email generation
 *   forensics        forensic narratives
 *   marketing        campaign analysis
 *   instruction      open-instruction planning
 *
 * Rules are stored locally, injected at call time, ordered by priority
 * (lower first). All admin-managed via UI — no redeploy required.
 */
import { randomUUID } from "crypto";
import { getDb } from "./db";
import { ensureDeskExtensionSchema } from "./desk/schema";

export type RuleScope =
  | "global"
  | "operator_brief"
  | "agent_brief"
  | "client_pitch"
  | "concierge"
  | "email_drafts"
  | "forensics"
  | "marketing"
  | "instruction";

export const RULE_SCOPES: RuleScope[] = [
  "global", "operator_brief", "agent_brief", "client_pitch",
  "concierge", "email_drafts", "forensics", "marketing", "instruction",
];

export type HouseRule = {
  id: string;
  title: string;
  body: string;
  scope: RuleScope;
  priority: number;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Row = {
  id: string; title: string; body: string; scope: string;
  priority: number; enabled: number;
  created_by: string | null; created_at: string; updated_at: string;
};

function toHouseRule(r: Row): HouseRule {
  return {
    id: r.id, title: r.title, body: r.body,
    scope: (RULE_SCOPES as readonly string[]).includes(r.scope) ? (r.scope as RuleScope) : "global",
    priority: Number(r.priority) || 0,
    enabled: Boolean(r.enabled),
    created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at,
  };
}

export function listHouseRules(): HouseRule[] {
  ensureDeskExtensionSchema();
  return (getDb()
    .prepare("SELECT * FROM house_rules ORDER BY priority ASC, created_at DESC")
    .all() as Row[]).map(toHouseRule);
}

export function getHouseRule(id: string): HouseRule | null {
  ensureDeskExtensionSchema();
  const row = getDb().prepare("SELECT * FROM house_rules WHERE id = ?").get(id) as Row | undefined;
  return row ? toHouseRule(row) : null;
}

export function createHouseRule(args: {
  title: string; body: string; scope: RuleScope; priority?: number; enabled?: boolean; created_by?: string | null;
}): HouseRule {
  ensureDeskExtensionSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO house_rules (id, title, body, scope, priority, enabled, created_by, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
  ).run(id, args.title, args.body, args.scope, args.priority ?? 0, args.enabled === false ? 0 : 1, args.created_by ?? null, now, now);
  return getHouseRule(id)!;
}

export function updateHouseRule(id: string, patch: Partial<Omit<HouseRule, "id" | "created_at" | "updated_at">>): HouseRule | null {
  ensureDeskExtensionSchema();
  const cur = getHouseRule(id);
  if (!cur) return null;
  const next: HouseRule = {
    ...cur,
    title: patch.title ?? cur.title,
    body: patch.body ?? cur.body,
    scope: patch.scope ?? cur.scope,
    priority: patch.priority ?? cur.priority,
    enabled: patch.enabled ?? cur.enabled,
    created_by: patch.created_by ?? cur.created_by,
    updated_at: new Date().toISOString(),
  };
  getDb().prepare(
    `UPDATE house_rules SET title=?, body=?, scope=?, priority=?, enabled=?, updated_at=? WHERE id=?`,
  ).run(next.title, next.body, next.scope, next.priority, next.enabled ? 1 : 0, next.updated_at, id);
  return next;
}

export function deleteHouseRule(id: string): boolean {
  ensureDeskExtensionSchema();
  const r = getDb().prepare("DELETE FROM house_rules WHERE id = ?").run(id);
  return r.changes > 0;
}

/**
 * Build the injection string for a given scope.
 * Rules matching `global` are always added; rules matching the specific
 * scope come after. Ordered by priority ASC.
 */
export function injectionForScope(scope: RuleScope): string {
  const rules = listHouseRules().filter((r) => r.enabled && (r.scope === "global" || r.scope === scope));
  if (rules.length === 0) return "";
  const lines = ["HOUSE RULES (operator-authored, treat as binding):"];
  for (const r of rules) {
    lines.push(`- [${r.scope}] ${r.title}: ${r.body.trim().replace(/\s+/g, " ").slice(0, 600)}`);
  }
  return lines.join("\n");
}
