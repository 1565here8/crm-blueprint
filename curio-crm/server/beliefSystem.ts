/**
 * BELIEF SYSTEM — the LLM zombie's constitutional layer.
 *
 * The hard-coded persona prompts in deskPrompts.ts are FACTORY DEFAULTS.
 * The super admin (owner) can override any of them at runtime from the
 * "Brain" admin page. Overrides are stored locally in belief_system and
 * loaded for every LLM call. Reverting an override deletes the row and
 * the factory default takes over again.
 *
 * This is the broker's IP. Owner-only read and write. Never exposed to
 * any other audience. Never logged.
 */
import { getDb } from "./db";
import { ensureDeskExtensionSchema } from "./desk/schema";
import {
  DESK_SYSTEM,
  OPERATOR_BRIEF,
  AGENT_BRIEF,
  CLIENT_PITCH,
  FREE_ASK,
  COLLECTIONS_BRIEF,
  CONCIERGE_SYSTEM,
  LEAD_ROUTING,
} from "./deskPrompts";

export type BeliefKey =
  | "persona"
  | "operator_brief"
  | "agent_brief"
  | "client_pitch"
  | "free_ask"
  | "collections_brief"
  | "concierge"
  | "lead_routing"
  | "forensics_analyze"
  | "marketing_analyze"
  | "agent_perf_analyze"
  | "instruction_planner"
  | "drip_email_drafter";

export const BELIEF_KEYS: BeliefKey[] = [
  "persona",
  "operator_brief",
  "agent_brief",
  "client_pitch",
  "free_ask",
  "collections_brief",
  "concierge",
  "lead_routing",
  "forensics_analyze",
  "marketing_analyze",
  "agent_perf_analyze",
  "instruction_planner",
  "drip_email_drafter",
];

const FORENSICS_ANALYZE_DEFAULT =
  `MODE: forensic narrative. Read the structured forensic report and produce:
SUMMARY (1 line), RISK FLAGS (bullets), RECOMMENDED ACTIONS (max 5 imperatives, each under 12 words).
End with the literal word END.`;

const MARKETING_ANALYZE_DEFAULT =
  `MODE: marketing analysis. Given the campaign table, produce:
TOP PERFORMERS (max 5 lines), KILL LIST (max 5 lines), ONE STRATEGIC MOVE (1 sentence).
End with the literal word END.`;

const AGENT_PERF_ANALYZE_DEFAULT =
  `MODE: agent board. Given the agent table, produce:
TOP 3, BOTTOM 3, SILENCE WATCH (anyone >24h quiet), ACTION QUEUE (3 imperatives).
End with FLOOR OPEN.`;

const INSTRUCTION_PLANNER_DEFAULT =
  `You are the operations planner for THE DESK. Translate plain-English admin instructions into a structured action plan using ONLY the whitelisted action kinds (add_note | draft_email | set_crm_status | assign_agent | add_tag | flag_for_review). Never invent or use any other action. Never access the network. Never make trading decisions.`;

const DRIP_EMAIL_DRAFTER_DEFAULT =
  `You are the brand concierge writing a brief, warm, personalised email to a single client. Output ONLY the SUBJECT and BODY in the format requested. No preamble. No commentary.`;

const FACTORY: Record<BeliefKey, string> = {
  persona: DESK_SYSTEM,
  operator_brief: OPERATOR_BRIEF,
  agent_brief: AGENT_BRIEF,
  client_pitch: CLIENT_PITCH,
  free_ask: FREE_ASK,
  collections_brief: COLLECTIONS_BRIEF,
  concierge: CONCIERGE_SYSTEM,
  lead_routing: LEAD_ROUTING,
  forensics_analyze: FORENSICS_ANALYZE_DEFAULT,
  marketing_analyze: MARKETING_ANALYZE_DEFAULT,
  agent_perf_analyze: AGENT_PERF_ANALYZE_DEFAULT,
  instruction_planner: INSTRUCTION_PLANNER_DEFAULT,
  drip_email_drafter: DRIP_EMAIL_DRAFTER_DEFAULT,
};

const LABELS: Record<BeliefKey, string> = {
  persona: "Persona (THE DESK — root identity)",
  operator_brief: "Operator Morning Brief",
  agent_brief: "Agent Floor Brief (pre-bell)",
  client_pitch: "Per-Client Phone Pitch",
  free_ask: "Ask the Desk (free-form)",
  collections_brief: "Collections Brief (PSP)",
  concierge: "Public Concierge (site chat)",
  lead_routing: "Lead Routing Recommendation",
  forensics_analyze: "Forensic Narrative",
  marketing_analyze: "Marketing Analysis",
  agent_perf_analyze: "Agent Board Analysis",
  instruction_planner: "Open Instruction Planner",
  drip_email_drafter: "Drip Email Drafter",
};

function ensureSchema() {
  ensureDeskExtensionSchema();
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS belief_system (
      key        TEXT PRIMARY KEY,
      body       TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL
    );
  `);
}
ensureSchema();

export function getBelief(key: BeliefKey): string {
  ensureSchema();
  const row = getDb().prepare("SELECT body FROM belief_system WHERE key = ?").get(key) as { body: string } | undefined;
  if (row && row.body && row.body.trim().length > 0) return row.body;
  return FACTORY[key];
}

export function getAllBeliefs(): Array<{
  key: BeliefKey;
  label: string;
  factory: string;
  override: string | null;
  effective: string;
  updatedBy: string | null;
  updatedAt: string | null;
  isOverridden: boolean;
}> {
  ensureSchema();
  const overrides = getDb()
    .prepare("SELECT key, body, updated_by, updated_at FROM belief_system")
    .all() as Array<{ key: string; body: string; updated_by: string | null; updated_at: string }>;
  const map = new Map(overrides.map((r) => [r.key, r]));
  return BELIEF_KEYS.map((k) => {
    const o = map.get(k);
    const override = o?.body ?? null;
    return {
      key: k,
      label: LABELS[k],
      factory: FACTORY[k],
      override,
      effective: override && override.trim() ? override : FACTORY[k],
      updatedBy: o?.updated_by ?? null,
      updatedAt: o?.updated_at ?? null,
      isOverridden: Boolean(override && override.trim()),
    };
  });
}

export function setBelief(key: BeliefKey, body: string, actor: string | null): void {
  ensureSchema();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO belief_system (key, body, updated_by, updated_at)
       VALUES (?,?,?,?)
       ON CONFLICT(key) DO UPDATE SET body=excluded.body, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    )
    .run(key, body, actor, now);
}

export function resetBelief(key: BeliefKey): boolean {
  ensureSchema();
  return getDb().prepare("DELETE FROM belief_system WHERE key = ?").run(key).changes > 0;
}
