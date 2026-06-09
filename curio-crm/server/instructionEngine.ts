/**
 * INSTRUCTION ENGINE — "do anything I ask" with a safety harness.
 *
 * Flow:
 *   1. Admin types a plain-English instruction.
 *   2. LLM proposes a structured JSON plan (whitelisted actions only).
 *   3. Server returns plan + estimated affected count.
 *   4. Admin reviews + clicks "execute".
 *   5. Server runs only the whitelisted actions against matching users.
 *
 * No shell. No raw SQL writes. Only the action vocabulary below.
 */
import { randomUUID } from "crypto";
import { getDb, createCrmNote, createCrmEmail } from "./db";
import { ensureDeskExtensionSchema } from "./desk/schema";
import { ensureUserProfilesSchema, updateCrmUser } from "./crmUsers";
import { injectionForScope } from "./houseRules";
import { OLLAMA_BASE, OLLAMA_DESK_FAST_MODEL, OLLAMA_DESK_FAST_NUM_CTX } from "./ollama";
import { error as logError, warn as logWarn } from "./log";

const REQ_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 60_000);

export type InstructionAction =
  | { kind: "add_note"; filter: UserFilter; body: string }
  | { kind: "draft_email"; filter: UserFilter; subject: string; body: string }
  | { kind: "set_crm_status"; filter: UserFilter; status: string }
  | { kind: "assign_agent"; filter: UserFilter; agent: string }
  | { kind: "add_tag"; filter: UserFilter; tag: string }
  | { kind: "flag_for_review"; filter: UserFilter; reason: string };

export type UserFilter = {
  status?: string | null;
  agent?: string | null;
  country?: string | null;
  hasDepositGte?: number | null;
  daysSinceContactGte?: number | null;
  daysSinceSignupLte?: number | null;
  daysSinceSignupGte?: number | null;
};

export type InstructionPlan = {
  reasoning: string;
  actions: InstructionAction[];
};

export type InstructionRecord = {
  id: string;
  instruction: string;
  plan_json: string;
  status: "proposed" | "approved" | "executed" | "cancelled" | "failed";
  affected_count: number;
  executed_by: string | null;
  created_at: string;
  executed_at: string | null;
};

function buildFilterSql(f: UserFilter): { sql: string; params: unknown[] } {
  const wh: string[] = ["u.role = 'user'"];
  const params: unknown[] = [];
  if (f.status) { wh.push("p.crm_status = ?"); params.push(f.status); }
  if (f.agent) { wh.push("p.agent_name = ?"); params.push(f.agent); }
  if (f.country) { wh.push("UPPER(p.country_code) = ?"); params.push(f.country.toUpperCase()); }
  if (typeof f.daysSinceSignupGte === "number") { wh.push(`u.created_at <= datetime('now','-' || ? || ' days')`); params.push(f.daysSinceSignupGte); }
  if (typeof f.daysSinceSignupLte === "number") { wh.push(`u.created_at >= datetime('now','-' || ? || ' days')`); params.push(f.daysSinceSignupLte); }
  if (typeof f.hasDepositGte === "number") {
    wh.push(`(SELECT COALESCE(SUM(amount_delta),0) FROM ledger_entries
              WHERE user_id = u.id AND amount_delta > 0 AND reason LIKE '%credit%') >= ?`);
    params.push(f.hasDepositGte);
  }
  if (typeof f.daysSinceContactGte === "number") {
    wh.push(`COALESCE(
      (SELECT MAX(created_at) FROM crm_notes WHERE user_id = u.id),
      (SELECT MAX(created_at) FROM crm_emails WHERE user_id = u.id),
      u.created_at
    ) <= datetime('now','-' || ? || ' days')`);
    params.push(f.daysSinceContactGte);
  }
  return { sql: wh.join(" AND "), params };
}

function matchingUserIds(f: UserFilter, limit = 500): string[] {
  ensureUserProfilesSchema();
  const { sql, params } = buildFilterSql(f);
  return (getDb()
    .prepare(`SELECT u.id FROM users u JOIN user_profiles p ON p.user_id = u.id WHERE ${sql} LIMIT ?`)
    .all(...params, limit) as Array<{ id: string }>).map((r) => r.id);
}

export function estimateAffected(plan: InstructionPlan): number {
  if (plan.actions.length === 0) return 0;
  const ids = new Set<string>();
  for (const a of plan.actions) {
    for (const id of matchingUserIds(a.filter, 2_000)) ids.add(id);
  }
  return ids.size;
}

const PLAN_SCHEMA_HINT = `You MUST output ONLY valid JSON in this shape:
{
  "reasoning": "<one sentence>",
  "actions": [
    {
      "kind": "<one of: add_note | draft_email | set_crm_status | assign_agent | add_tag | flag_for_review>",
      "filter": {
        "status": "<optional crm status>",
        "agent": "<optional agent name>",
        "country": "<optional ISO-2 country code>",
        "hasDepositGte": <optional number>,
        "daysSinceContactGte": <optional number>,
        "daysSinceSignupGte": <optional number>,
        "daysSinceSignupLte": <optional number>
      },
      "body": "<required for add_note and draft_email>",
      "subject": "<required for draft_email>",
      "status": "<required for set_crm_status>",
      "agent":  "<required for assign_agent>",
      "tag":    "<required for add_tag>",
      "reason": "<required for flag_for_review>"
    }
  ]
}
No markdown. No prose around the JSON. No code fences.`;

function safeParsePlan(text: string): InstructionPlan | null {
  const trimmed = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const reasoning = String(obj.reasoning ?? "").slice(0, 600);
  const raw = Array.isArray(obj.actions) ? obj.actions : [];
  const allowed = new Set(["add_note", "draft_email", "set_crm_status", "assign_agent", "add_tag", "flag_for_review"]);
  const actions: InstructionAction[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    if (typeof o.kind !== "string" || !allowed.has(o.kind)) continue;
    const filter = (o.filter as UserFilter) ?? {};
    const safe: UserFilter = {
      status: typeof filter.status === "string" ? filter.status : null,
      agent: typeof filter.agent === "string" ? filter.agent : null,
      country: typeof filter.country === "string" ? filter.country : null,
      hasDepositGte: typeof filter.hasDepositGte === "number" ? filter.hasDepositGte : null,
      daysSinceContactGte: typeof filter.daysSinceContactGte === "number" ? filter.daysSinceContactGte : null,
      daysSinceSignupGte: typeof filter.daysSinceSignupGte === "number" ? filter.daysSinceSignupGte : null,
      daysSinceSignupLte: typeof filter.daysSinceSignupLte === "number" ? filter.daysSinceSignupLte : null,
    };
    switch (o.kind) {
      case "add_note":
        if (typeof o.body !== "string" || o.body.length === 0) continue;
        actions.push({ kind: "add_note", filter: safe, body: String(o.body).slice(0, 2000) });
        break;
      case "draft_email":
        if (typeof o.subject !== "string" || typeof o.body !== "string") continue;
        actions.push({ kind: "draft_email", filter: safe, subject: String(o.subject).slice(0, 200), body: String(o.body).slice(0, 4000) });
        break;
      case "set_crm_status":
        if (typeof o.status !== "string") continue;
        actions.push({ kind: "set_crm_status", filter: safe, status: String(o.status).slice(0, 60) });
        break;
      case "assign_agent":
        if (typeof o.agent !== "string") continue;
        actions.push({ kind: "assign_agent", filter: safe, agent: String(o.agent).slice(0, 120) });
        break;
      case "add_tag":
        if (typeof o.tag !== "string") continue;
        actions.push({ kind: "add_tag", filter: safe, tag: String(o.tag).slice(0, 60) });
        break;
      case "flag_for_review":
        if (typeof o.reason !== "string") continue;
        actions.push({ kind: "flag_for_review", filter: safe, reason: String(o.reason).slice(0, 400) });
        break;
    }
  }
  return { reasoning, actions };
}

export async function proposeInstructionPlan(instruction: string): Promise<{ plan: InstructionPlan; affected: number } | { error: string }> {
  const systemBlocks = [
    "You are the operations planner for THE DESK. You translate plain-English admin instructions into a structured action plan using ONLY the whitelisted action kinds. You NEVER invent or use any other action. You NEVER access the network. You NEVER make trading decisions.",
    PLAN_SCHEMA_HINT,
    injectionForScope("instruction"),
  ].filter(Boolean);
  const messages = [
    ...systemBlocks.map((s) => ({ role: "system" as const, content: s })),
    { role: "user" as const, content: instruction.slice(0, 2000) },
  ];
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQ_TIMEOUT_MS);
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_DESK_FAST_MODEL, messages, stream: false, keep_alive: "24h", options: { temperature: 0.2, num_ctx: OLLAMA_DESK_FAST_NUM_CTX, num_predict: 120 } }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) { logWarn("[instruction] ollama http", r.status); return { error: `engine http ${r.status}` }; }
    const j = (await r.json()) as { message?: { content?: string } };
    const text = (j.message?.content ?? "").trim();
    const plan = safeParsePlan(text);
    if (!plan) return { error: "engine returned unparseable plan" };
    const affected = estimateAffected(plan);
    return { plan, affected };
  } catch (err) {
    clearTimeout(timer);
    logError("[instruction] propose failed", err);
    return { error: "engine unreachable" };
  }
}

export function saveProposedInstruction(args: { instruction: string; plan: InstructionPlan; affected: number; actorId: string | null }): InstructionRecord {
  ensureDeskExtensionSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO instruction_history (id, instruction, plan_json, status, affected_count, executed_by, created_at, executed_at)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(id, args.instruction, JSON.stringify(args.plan), "proposed", args.affected, args.actorId, now, null);
  return getInstruction(id)!;
}

export function getInstruction(id: string): InstructionRecord | null {
  ensureDeskExtensionSchema();
  return (getDb().prepare("SELECT * FROM instruction_history WHERE id = ?").get(id) as InstructionRecord | undefined) ?? null;
}

export function listInstructions(limit = 50): InstructionRecord[] {
  ensureDeskExtensionSchema();
  return getDb().prepare("SELECT * FROM instruction_history ORDER BY created_at DESC LIMIT ?").all(limit) as InstructionRecord[];
}

export function cancelInstruction(id: string): boolean {
  ensureDeskExtensionSchema();
  return getDb().prepare("UPDATE instruction_history SET status='cancelled' WHERE id=? AND status='proposed'").run(id).changes > 0;
}

export function executeInstruction(args: { id: string; actorId: string | null; maxAffected?: number }): { ok: boolean; ran: number; errors: number; record: InstructionRecord | null } {
  ensureDeskExtensionSchema();
  const rec = getInstruction(args.id);
  if (!rec || rec.status !== "proposed") return { ok: false, ran: 0, errors: 0, record: rec };
  const cap = Math.max(0, Math.min(args.maxAffected ?? 500, 5_000));

  let plan: InstructionPlan;
  try { plan = JSON.parse(rec.plan_json) as InstructionPlan; } catch { return { ok: false, ran: 0, errors: 1, record: rec }; }

  const db = getDb();
  let ran = 0, errors = 0;
  for (const action of plan.actions) {
    const ids = matchingUserIds(action.filter, cap);
    for (const userId of ids.slice(0, cap)) {
      try {
        switch (action.kind) {
          case "add_note":
            createCrmNote({ userId, body: `[AI plan] ${action.body}`, authorId: args.actorId ?? "ai-plan" });
            break;
          case "draft_email": {
            const id = randomUUID();
            const now = new Date().toISOString();
            db.prepare(
              `INSERT INTO drip_history (id, campaign_id, user_id, attempt_number, subject, body, status, scheduled_for, sent_at, approved_by, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            ).run(id, "instruction-engine", userId, 1, action.subject, action.body, "queued", null, null, null, now);
            break;
          }
          case "set_crm_status":
            updateCrmUser(userId, { crmStatus: action.status });
            break;
          case "assign_agent":
            updateCrmUser(userId, { agentName: action.agent });
            break;
          case "add_tag":
            updateCrmUser(userId, { param1: action.tag });
            break;
          case "flag_for_review":
            createCrmNote({ userId, body: `[AI review flag] ${action.reason}`, authorId: args.actorId ?? "ai-plan" });
            break;
        }
        ran += 1;
        if (ran >= cap) break;
      } catch (err) {
        errors += 1;
        logError("[instruction] action failed", err);
      }
    }
    if (ran >= cap) break;
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE instruction_history SET status=?, affected_count=?, executed_by=?, executed_at=? WHERE id=?")
    .run(errors > 0 && ran === 0 ? "failed" : "executed", ran, args.actorId, now, args.id);
  return { ok: true, ran, errors, record: getInstruction(args.id) };
}
