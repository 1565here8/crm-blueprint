/**
 * DRIP ENGINE — auto-drafts customer-facing emails using the local LLM.
 *
 * Each campaign has:
 *   - trigger_type     'kyc_chase' | 'no_deposit' | 'dormant' | 'wire_pending' | 'failed_deposit' | 'birthday' | 'custom'
 *   - trigger_config   JSON-encoded knobs (thresholds, days, custom SQL)
 *   - cadence_hours    comma-separated attempt intervals e.g. "24,48,72,168"
 *   - prompt_template  the LLM brief for this campaign
 *   - auto_send        0=draft+queue for admin review, 1=auto-send (logs as CRM email)
 *
 * The scanner finds eligible users for each enabled campaign, skips any
 * user already past the last attempt or sent too recently, drafts an email
 * with Ollama using house-rules + per-user context, and either auto-sends
 * (via createCrmEmail) or stores in drip_history for admin approval.
 */
import { randomUUID } from "crypto";
import { getDb, createCrmEmail } from "./db";
import { ensureDeskExtensionSchema } from "./desk/schema";
import { ensureUserProfilesSchema } from "./crmUsers";
import { injectionForScope } from "./houseRules";
import { OLLAMA_BASE, OLLAMA_DESK_FAST_MODEL, OLLAMA_DESK_FAST_NUM_CTX } from "./ollama";
import { error as logError, warn as logWarn } from "./log";

const MS_HOUR = 3_600_000;
const REQ_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 90_000);

export type DripTriggerType =
  | "kyc_chase" | "no_deposit" | "dormant" | "wire_pending"
  | "failed_deposit" | "birthday" | "custom";

export type DripCampaign = {
  id: string;
  name: string;
  trigger_type: DripTriggerType;
  trigger_config: string | null;
  cadence_hours: string;
  prompt_template: string;
  auto_send: boolean;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DripHistoryRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  attempt_number: number;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed" | "cancelled";
  scheduled_for: string | null;
  sent_at: string | null;
  approved_by: string | null;
  created_at: string;
};

type Row = {
  id: string; name: string; trigger_type: string; trigger_config: string | null;
  cadence_hours: string; prompt_template: string; auto_send: number; enabled: number;
  created_by: string | null; created_at: string; updated_at: string;
};

function toCampaign(r: Row): DripCampaign {
  return {
    id: r.id, name: r.name,
    trigger_type: r.trigger_type as DripTriggerType,
    trigger_config: r.trigger_config,
    cadence_hours: r.cadence_hours || "24,48,72",
    prompt_template: r.prompt_template,
    auto_send: Boolean(r.auto_send),
    enabled: Boolean(r.enabled),
    created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at,
  };
}

export function listDripCampaigns(): DripCampaign[] {
  ensureDeskExtensionSchema();
  return (getDb()
    .prepare("SELECT * FROM drip_campaigns ORDER BY enabled DESC, name")
    .all() as Row[]).map(toCampaign);
}

export function getDripCampaign(id: string): DripCampaign | null {
  ensureDeskExtensionSchema();
  const r = getDb().prepare("SELECT * FROM drip_campaigns WHERE id = ?").get(id) as Row | undefined;
  return r ? toCampaign(r) : null;
}

export function upsertDripCampaign(args: Omit<DripCampaign, "id" | "created_at" | "updated_at"> & { id?: string }): DripCampaign {
  ensureDeskExtensionSchema();
  const now = new Date().toISOString();
  if (args.id) {
    const ex = getDripCampaign(args.id);
    if (ex) {
      getDb().prepare(`UPDATE drip_campaigns SET
        name=?, trigger_type=?, trigger_config=?, cadence_hours=?, prompt_template=?, auto_send=?, enabled=?, updated_at=? WHERE id=?`,
      ).run(args.name, args.trigger_type, args.trigger_config, args.cadence_hours, args.prompt_template, args.auto_send ? 1 : 0, args.enabled ? 1 : 0, now, args.id);
      return getDripCampaign(args.id)!;
    }
  }
  const id = args.id ?? randomUUID();
  getDb().prepare(`INSERT INTO drip_campaigns
    (id, name, trigger_type, trigger_config, cadence_hours, prompt_template, auto_send, enabled, created_by, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(id, args.name, args.trigger_type, args.trigger_config, args.cadence_hours, args.prompt_template, args.auto_send ? 1 : 0, args.enabled ? 1 : 0, args.created_by ?? null, now, now);
  return getDripCampaign(id)!;
}

export function deleteDripCampaign(id: string): boolean {
  ensureDeskExtensionSchema();
  return getDb().prepare("DELETE FROM drip_campaigns WHERE id = ?").run(id).changes > 0;
}

export function listDripHistory(filter?: { status?: DripHistoryRow["status"]; userId?: string; limit?: number }): DripHistoryRow[] {
  ensureDeskExtensionSchema();
  const db = getDb();
  const limit = Math.min(500, filter?.limit ?? 200);
  const wh: string[] = []; const params: unknown[] = [];
  if (filter?.status) { wh.push("status = ?"); params.push(filter.status); }
  if (filter?.userId) { wh.push("user_id = ?"); params.push(filter.userId); }
  const sql = `SELECT * FROM drip_history ${wh.length ? "WHERE " + wh.join(" AND ") : ""} ORDER BY created_at DESC LIMIT ?`;
  return db.prepare(sql).all(...params, limit) as DripHistoryRow[];
}

export function approveDripDraft(args: { id: string; approverId: string }): DripHistoryRow | null {
  ensureDeskExtensionSchema();
  const db = getDb();
  const row = db.prepare("SELECT * FROM drip_history WHERE id = ?").get(args.id) as DripHistoryRow | undefined;
  if (!row || row.status !== "queued") return row ?? null;
  createCrmEmail({ userId: row.user_id, subject: row.subject, body: row.body, authorId: args.approverId });
  const now = new Date().toISOString();
  db.prepare("UPDATE drip_history SET status='sent', sent_at=?, approved_by=? WHERE id=?").run(now, args.approverId, args.id);
  db.prepare(
    `INSERT INTO drip_state (campaign_id, user_id, last_attempt, last_sent_at, completed) VALUES (?,?,?,?,?)
     ON CONFLICT(campaign_id, user_id) DO UPDATE SET last_attempt=?, last_sent_at=?`,
  ).run(row.campaign_id, row.user_id, row.attempt_number, now, 0, row.attempt_number, now);
  return db.prepare("SELECT * FROM drip_history WHERE id = ?").get(args.id) as DripHistoryRow;
}

export function cancelDripDraft(id: string): boolean {
  ensureDeskExtensionSchema();
  return getDb().prepare("UPDATE drip_history SET status='cancelled' WHERE id=? AND status='queued'").run(id).changes > 0;
}

async function ollamaDraft(args: { systemBlocks: string[]; userBrief: string }): Promise<{ subject: string; body: string } | null> {
  const messages = [
    ...args.systemBlocks.map((s) => ({ role: "system" as const, content: s })),
    { role: "user" as const, content: args.userBrief + "\n\nReturn EXACTLY:\nSUBJECT: <one line under 70 chars>\nBODY:\n<message body, under 220 words>\nEND" },
  ];
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), REQ_TIMEOUT_MS);
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_DESK_FAST_MODEL, messages, stream: false, keep_alive: "24h", options: { temperature: 0.4, num_ctx: OLLAMA_DESK_FAST_NUM_CTX, num_predict: 180 } }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) { logWarn("[drip] ollama http", r.status); return null; }
    const j = (await r.json()) as { message?: { content?: string } };
    const text = (j.message?.content ?? "").trim();
    const sub = text.match(/SUBJECT:\s*(.+)/i)?.[1]?.trim() ?? "";
    const bodyMatch = text.match(/BODY:\s*([\s\S]+?)\n?\s*END\s*$/i)?.[1]?.trim() ?? text;
    if (!sub) return null;
    return { subject: sub.slice(0, 120), body: bodyMatch.slice(0, 4_000) };
  } catch (err) {
    clearTimeout(timer);
    logError("[drip] draft failed", err);
    return null;
  }
}

const SUBJECT_FALLBACK: Record<DripTriggerType, string> = {
  kyc_chase: "Quick verification step to finish your account",
  no_deposit: "Your account is ready when you are",
  dormant: "We miss you at the desk",
  wire_pending: "Update on your withdrawal request",
  failed_deposit: "We can help you complete your deposit",
  birthday: "A note from the desk",
  custom: "A message for you",
};

function fallbackBody(c: DripCampaign, user: { name: string }): { subject: string; body: string } {
  return {
    subject: SUBJECT_FALLBACK[c.trigger_type],
    body: `Hi ${user.name || "there"},\n\nWe wanted to reach out about your account. A specialist is available to help you with any next step.\n\nIf you'd prefer a call back, simply reply with a convenient time.\n\nKind regards,\nThe Desk`,
  };
}

type CandidateRow = {
  user_id: string; email: string; first_name: string; last_name: string;
  agent_name: string; created_at: string; total_deposits: number;
};

function findCandidates(c: DripCampaign): CandidateRow[] {
  ensureUserProfilesSchema();
  const db = getDb();
  const base = `SELECT u.id AS user_id, COALESCE(p.email,'') AS email,
                       COALESCE(p.first_name,'') AS first_name, COALESCE(p.last_name,'') AS last_name,
                       COALESCE(p.agent_name,'') AS agent_name, u.created_at,
                       (SELECT COALESCE(SUM(amount_delta),0) FROM ledger_entries
                          WHERE user_id = u.id AND amount_delta > 0 AND reason LIKE '%credit%') AS total_deposits
                FROM users u JOIN user_profiles p ON p.user_id = u.id
                WHERE u.role = 'user' AND COALESCE(p.email,'') LIKE '%@%' AND p.email NOT LIKE '%@local'`;
  switch (c.trigger_type) {
    case "kyc_chase":
      return db.prepare(`${base}
        AND total_deposits > 0
        AND NOT EXISTS (SELECT 1 FROM user_documents d WHERE d.user_id = u.id AND d.status = 'approved' AND d.doc_type GLOB '*id*')
        LIMIT 200`).all() as CandidateRow[];
    case "no_deposit":
      return db.prepare(`${base} AND total_deposits = 0 AND u.created_at <= datetime('now','-4 hours') LIMIT 200`).all() as CandidateRow[];
    case "dormant":
      return db.prepare(`${base} AND total_deposits > 0
        AND NOT EXISTS (SELECT 1 FROM executions e WHERE e.user_id = u.id AND e.created_at >= datetime('now','-14 days'))
        LIMIT 200`).all() as CandidateRow[];
    case "wire_pending":
      return db.prepare(`${base}
        AND EXISTS (SELECT 1 FROM wire_requests w WHERE w.user_id = u.id AND w.status = 'pending') LIMIT 200`).all() as CandidateRow[];
    case "failed_deposit":
      return db.prepare(`${base}
        AND EXISTS (SELECT 1 FROM deposit_requests dr WHERE dr.user_id = u.id AND dr.status = 'pending'
                    AND dr.created_at <= datetime('now','-12 hours')) LIMIT 200`).all() as CandidateRow[];
    case "birthday":
      return db.prepare(`${base}
        AND p.birthday <> '' AND strftime('%m-%d', p.birthday) = strftime('%m-%d','now') LIMIT 200`).all() as CandidateRow[];
    case "custom":
    default:
      return [];
  }
}

function dueForAttempt(c: DripCampaign, state: { last_attempt: number; last_sent_at: string | null; completed: number } | undefined): number {
  if (state?.completed) return 0;
  const cadence = c.cadence_hours.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
  if (cadence.length === 0) return 0;
  const nextAttempt = (state?.last_attempt ?? 0) + 1;
  if (nextAttempt > cadence.length) return 0;
  if (!state?.last_sent_at) return nextAttempt;
  const elapsedHrs = (Date.now() - new Date(state.last_sent_at).getTime()) / MS_HOUR;
  return elapsedHrs >= cadence[nextAttempt - 1]! ? nextAttempt : 0;
}

export type DripRunResult = {
  campaignId: string;
  campaignName: string;
  scanned: number;
  drafted: number;
  queued: number;
  sent: number;
  errors: number;
};

export async function runCampaignOnce(c: DripCampaign, opts?: { limit?: number }): Promise<DripRunResult> {
  ensureDeskExtensionSchema();
  const db = getDb();
  const candidates = findCandidates(c);
  const limit = Math.min(opts?.limit ?? 50, candidates.length);
  let scanned = 0, drafted = 0, queued = 0, sent = 0, errors = 0;

  const systemBlocks = [
    "You are the brand concierge writing a brief, warm, personalised email to a single client. Output ONLY the SUBJECT and BODY in the format requested. No preamble. No commentary.",
    injectionForScope("email_drafts"),
  ].filter(Boolean);

  for (const cand of candidates.slice(0, limit)) {
    scanned += 1;
    const state = db.prepare("SELECT last_attempt, last_sent_at, completed FROM drip_state WHERE campaign_id=? AND user_id=?")
      .get(c.id, cand.user_id) as { last_attempt: number; last_sent_at: string | null; completed: number } | undefined;
    const attempt = dueForAttempt(c, state);
    if (attempt === 0) continue;

    const userName = `${cand.first_name} ${cand.last_name}`.trim() || cand.email.split("@")[0] || "there";
    const userBrief = [
      `CAMPAIGN: ${c.name} (${c.trigger_type})`,
      `ATTEMPT: ${attempt} of ${c.cadence_hours.split(",").length}`,
      `CLIENT: name=${userName} email=${cand.email} agent=${cand.agent_name || "(unassigned)"} totalDeposits=${Math.round(Number(cand.total_deposits) || 0)}`,
      "",
      "BRAND BRIEF FOR THIS CAMPAIGN:",
      c.prompt_template,
    ].join("\n");

    const draft = (await ollamaDraft({ systemBlocks, userBrief })) ?? fallbackBody(c, { name: userName });
    drafted += 1;

    const id = randomUUID();
    const now = new Date().toISOString();
    const status: DripHistoryRow["status"] = c.auto_send ? "sent" : "queued";

    db.prepare(`INSERT INTO drip_history
      (id, campaign_id, user_id, attempt_number, subject, body, status, scheduled_for, sent_at, approved_by, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, c.id, cand.user_id, attempt, draft.subject, draft.body, status, null, c.auto_send ? now : null, null, now);

    if (c.auto_send) {
      try {
        createCrmEmail({ userId: cand.user_id, subject: draft.subject, body: draft.body, authorId: null });
        sent += 1;
      } catch (err) {
        errors += 1;
        logError("[drip] auto send failed", err);
        db.prepare("UPDATE drip_history SET status='failed' WHERE id=?").run(id);
      }
      db.prepare(
        `INSERT INTO drip_state (campaign_id, user_id, last_attempt, last_sent_at, completed) VALUES (?,?,?,?,?)
         ON CONFLICT(campaign_id, user_id) DO UPDATE SET last_attempt=?, last_sent_at=?`,
      ).run(c.id, cand.user_id, attempt, now, 0, attempt, now);
    } else {
      queued += 1;
    }
  }

  return { campaignId: c.id, campaignName: c.name, scanned, drafted, queued, sent, errors };
}

export async function runAllCampaignsOnce(opts?: { perCampaignLimit?: number }): Promise<DripRunResult[]> {
  const out: DripRunResult[] = [];
  for (const c of listDripCampaigns().filter((c) => c.enabled)) {
    out.push(await runCampaignOnce(c, { limit: opts?.perCampaignLimit ?? 25 }));
  }
  return out;
}

const SCAN_INTERVAL_MS = Number(process.env.DRIP_SCAN_INTERVAL_MS ?? 30 * 60 * 1000);
let scannerHandle: NodeJS.Timeout | null = null;

export function startDripScanner() {
  if (scannerHandle) return;
  if (process.env.DRIP_ENABLED === "0") return;
  ensureDeskExtensionSchema();
  scannerHandle = setInterval(() => {
    runAllCampaignsOnce({ perCampaignLimit: 15 }).catch((err) => logError("[drip scanner]", err));
  }, SCAN_INTERVAL_MS);
}

export function seedDefaultCampaignsIfEmpty() {
  ensureDeskExtensionSchema();
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) AS c FROM drip_campaigns").get() as { c: number }).c;
  if (count > 0) return;
  const now = new Date().toISOString();
  const seed = (name: string, type: DripTriggerType, cadence: string, prompt: string) => {
    db.prepare(`INSERT INTO drip_campaigns
      (id, name, trigger_type, trigger_config, cadence_hours, prompt_template, auto_send, enabled, created_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(randomUUID(), name, type, null, cadence, prompt, 0, 1, null, now, now);
  };
  seed("KYC Chase", "kyc_chase", "24,48,72,168",
    "The client deposited but has not uploaded a valid ID document. Write a short polite reminder. Mention that uploading ID + proof of address takes under two minutes and unlocks higher account limits. Include a clear next step. Do not threaten or rush. Sign off from 'The Desk'.");
  seed("First Deposit Nudge", "no_deposit", "4,24,72",
    "The client signed up but has not funded the account yet. Write a brief, warm welcome email. Mention demo mode and that a specialist is available. Do not mention specific instruments or returns. Sign off from 'The Desk'.");
  seed("Dormant Reactivation", "dormant", "720",
    "The client funded the account but has not traded in over 14 days. Write a one-paragraph 'we're here when you are' note. Offer a 15-minute strategy call. Avoid mentioning specific markets or returns. Sign off from 'The Desk'.");
  seed("Wire Pending", "wire_pending", "0,24",
    "The client has a wire withdrawal in pending status. Write a brief reassurance email confirming it is being processed and providing a realistic ETA. No financial advice.");
  seed("Failed Deposit Recovery", "failed_deposit", "12,36",
    "The client started a deposit that has not completed. Offer help and link to the cashier page. Do not blame the PSP.");
  seed("Birthday", "birthday", "0",
    "The client's birthday is today. Write a brief warm greeting with no upsell. One sentence. Sign off from 'The Desk'.");
}
