/**
 * THE CONCIERGE — public-facing AI assistant.
 *
 * Floating chat widget on every public page. Single goal: answer general
 * questions (only what's on the website) and capture name/email/phone so
 * the right agent can call the lead back.
 *
 * Same local Ollama daemon as THE DESK, different persona. Geo signal
 * from Cloudflare headers (already at the edge). Visitor IP NEVER
 * persisted. Only city/country/timezone/language stored with the lead.
 */
import type { Request } from "express";
import { randomUUID } from "crypto";
import { getDb } from "./db";
import { CONCIERGE_SYSTEM_COMPACT, LEAD_ROUTING, withConciergeDisclaimer } from "./deskPrompts";
import {
  OLLAMA_BASE,
  OLLAMA_CONCIERGE_MODEL,
  OLLAMA_CONCIERGE_NUM_CTX,
  OLLAMA_DESK_FAST_MODEL,
} from "./ollama";
import { conciergeFastPath } from "./conciergeFastPath";
import { error as logError, warn as logWarn } from "./log";

const REQ_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 180_000);
const CONCIERGE_TIMEOUT_MS = Number(process.env.OLLAMA_CONCIERGE_TIMEOUT_MS ?? 45_000);
const NGROK_CHAT_URL = (process.env.NGROK_CHAT_URL ?? "").trim();

export type VisitorContext = {
  city: string | null;
  countryCode: string | null;
  region: string | null;
  timezone: string | null;
  language: string | null;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatLead = {
  id: string;
  session_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  country_code: string | null;
  city: string | null;
  timezone: string | null;
  language: string | null;
  source: string | null;
  page: string | null;
  status: "new" | "assigned" | "dismissed" | "converted";
  assigned_agent: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  conversation: string | null;
  created_at: string;
  updated_at: string;
};

export function visitorContextFromRequest(req: Request): VisitorContext {
  const h = req.headers;
  const pick = (k: string) => {
    const v = h[k];
    if (!v) return null;
    const s = Array.isArray(v) ? v[0] : v;
    const t = String(s).trim();
    return t.length ? t : null;
  };
  const langRaw = pick("accept-language");
  const language = langRaw ? langRaw.split(",")[0]?.split(";")[0]?.trim() ?? null : null;
  return {
    city: pick("cf-ipcity"),
    countryCode: pick("cf-ipcountry"),
    region: pick("cf-region") ?? pick("cf-region-code"),
    timezone: pick("cf-timezone") ?? pick("cf-iptimezone"),
    language,
  };
}

function ctxBlock(ctx: VisitorContext, page: string | null): string {
  const parts = ["VISITOR CONTEXT:"];
  parts.push(`  city: ${ctx.city ?? "unknown"}`);
  parts.push(`  country: ${ctx.countryCode ?? "unknown"}`);
  if (ctx.region) parts.push(`  region: ${ctx.region}`);
  if (ctx.timezone) parts.push(`  timezone: ${ctx.timezone}`);
  if (ctx.language) parts.push(`  preferred language: ${ctx.language}`);
  if (page) parts.push(`  current page: ${page}`);
  return parts.join("\n");
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("ollama timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export type ConciergeReply = { ok: boolean; reply: string; degraded?: string };

function normalizeHistory(history: ChatTurn[], message: string): ChatTurn[] {
  const trimmed = message.trim();
  const slice = history.slice(-8);
  const last = slice[slice.length - 1];
  if (last?.role === "user" && last.content.trim() === trimmed) {
    return slice.slice(0, -1);
  }
  return slice;
}

/** Strip meta-commentary small models sometimes emit instead of speaking in character. */
function sanitizeConciergeOutput(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^here(?:'s| is) (?:a )?(?:gentle |sample )?reply:?\s*/i, "");
  s = s.replace(/^reply:?\s*/i, "");
  const quoted = s.match(/^["“](.+?)["”]\s*$/s);
  if (quoted?.[1] && quoted[1].length > 20) s = quoted[1].trim();
  const cut = s.search(/\n\n(?:Once |This response |And then |When they've )/i);
  if (cut > 40) s = s.slice(0, cut).trim();
  return s.trim() || raw.trim();
}

async function ngrokConciergeTurn(args: {
  message: string;
  history: ChatTurn[];
  visitor: VisitorContext;
  page: string | null;
}) {
  if (!NGROK_CHAT_URL) return null;

  return withTimeout(
    fetch(NGROK_CHAT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: `concierge-${randomUUID()}`,
        message: args.message.slice(0, 1_200),
        history: args.history.slice(-8),
        page: args.page,
        visitor: args.visitor,
      }),
    }),
    CONCIERGE_TIMEOUT_MS,
  );
}

async function ollamaConciergeTurn(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  return withTimeout(
    fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_CONCIERGE_MODEL,
        messages,
        stream: false,
        keep_alive: "24h",
        options: {
          temperature: 0.4,
          num_ctx: OLLAMA_CONCIERGE_NUM_CTX,
          top_p: 0.85,
          num_predict: 80,
        },
      }),
    }),
    CONCIERGE_TIMEOUT_MS,
  );
}

export async function conciergeChat(args: {
  message: string;
  history: ChatTurn[];
  visitor: VisitorContext;
  page: string | null;
}): Promise<ConciergeReply> {
  const instant = conciergeFastPath(args.message, args.visitor);
  if (instant) {
    return { ok: true, reply: instant.reply };
  }

  const history = normalizeHistory(args.history, args.message);
  const messages = [
    { role: "system" as const, content: CONCIERGE_SYSTEM_COMPACT },
    { role: "system" as const, content: ctxBlock(args.visitor, args.page) },
    ...history.slice(-3),
    { role: "user" as const, content: args.message.slice(0, 1_200) },
  ];

  const offlineReply = withConciergeDisclaimer(
    "Apologies — our concierge is offline for a moment. Please leave your name, email and phone and a specialist will reach out within one business day.",
  );

  try {
    const ngrok = await ngrokConciergeTurn({
      message: args.message,
      history: args.history,
      visitor: args.visitor,
      page: args.page,
    });

    if (ngrok && ngrok.ok) {
      try {
        const j = (await ngrok.json()) as {
          reply?: string;
          response?: string;
          text?: string;
          content?: string;
          ok?: boolean;
          degraded?: string;
        };
        const raw = (j.reply ?? j.response ?? j.text ?? j.content ?? "").trim();
        if (raw) {
          return { ok: j.ok !== false, reply: withConciergeDisclaimer(raw), degraded: j.degraded };
        }
      } catch {
        const text = await ngrok.text().catch(() => "");
        if (text.trim()) {
          return { ok: true, reply: withConciergeDisclaimer(text.trim()) };
        }
      }
    } else if (ngrok) {
      const text = await ngrok.text().catch(() => "");
      logWarn("[concierge] ngrok http", ngrok.status, text.slice(0, 120));
    }

    const r = await ollamaConciergeTurn(messages);
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      logWarn("[concierge] http", r.status, text.slice(0, 120));
      return { ok: false, reply: offlineReply, degraded: `http ${r.status}` };
    }
    const j = (await r.json()) as { message?: { content?: string } };
    const raw =
      sanitizeConciergeOutput(j.message?.content ?? "") ||
      "Could you tell me a little more about what you'd like to know?";
    return { ok: true, reply: withConciergeDisclaimer(raw) };
  } catch (err) {
    logError("[concierge] chat failed", err);
    return { ok: false, reply: offlineReply, degraded: "concierge unreachable" };
  }
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/i;
const PHONE_RE = /\+?\d[\d\s().-]{6,}\d/;

export function extractContactFromMessage(text: string): {
  email: string | null;
  phone: string | null;
} {
  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone = text.match(PHONE_RE)?.[0] ?? null;
  return { email, phone };
}

export function captureLead(args: {
  sessionId: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  conversation?: ChatTurn[];
  visitor: VisitorContext;
  page: string | null;
  source: string | null;
}): ChatLead {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO chat_leads
       (id, session_id, name, email, phone, message, country_code, city,
        timezone, language, source, page, status, assigned_agent, assigned_at,
        assigned_by, conversation, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'new',NULL,NULL,NULL,?,?,?)`,
  ).run(
    id,
    args.sessionId,
    args.name ?? null,
    args.email ?? null,
    args.phone ?? null,
    args.message ?? null,
    args.visitor.countryCode,
    args.visitor.city,
    args.visitor.timezone,
    args.visitor.language,
    args.source,
    args.page,
    args.conversation ? JSON.stringify(args.conversation.slice(-24)) : null,
    now,
    now,
  );
  return db.prepare("SELECT * FROM chat_leads WHERE id = ?").get(id) as ChatLead;
}

export function listChatLeads(filter?: { status?: ChatLead["status"]; limit?: number }): ChatLead[] {
  const db = getDb();
  const limit = Math.min(500, filter?.limit ?? 100);
  if (filter?.status) {
    return db
      .prepare(`SELECT * FROM chat_leads WHERE status = ? ORDER BY created_at DESC LIMIT ?`)
      .all(filter.status, limit) as ChatLead[];
  }
  return db.prepare(`SELECT * FROM chat_leads ORDER BY created_at DESC LIMIT ?`).all(limit) as ChatLead[];
}

export function getChatLead(id: string): ChatLead | null {
  return (getDb().prepare("SELECT * FROM chat_leads WHERE id = ?").get(id) as ChatLead | undefined) ?? null;
}

export function assignChatLead(args: { id: string; agentName: string; actorId: string | null }): ChatLead | null {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE chat_leads SET status = 'assigned', assigned_agent = ?, assigned_at = ?, assigned_by = ?, updated_at = ? WHERE id = ?`,
    )
    .run(args.agentName, now, args.actorId, now, args.id);
  return getChatLead(args.id);
}

export function dismissChatLead(id: string): ChatLead | null {
  const now = new Date().toISOString();
  getDb().prepare(`UPDATE chat_leads SET status = 'dismissed', updated_at = ? WHERE id = ?`).run(now, id);
  return getChatLead(id);
}

export function leadStats(): Record<string, number> {
  const rows = getDb()
    .prepare(`SELECT status, COUNT(*) AS c FROM chat_leads GROUP BY status`)
    .all() as Array<{ status: string; c: number }>;
  const map: Record<string, number> = { new: 0, assigned: 0, dismissed: 0, converted: 0 };
  for (const r of rows) map[r.status] = r.c;
  return map;
}

export async function recommendAgent(args: {
  lead: ChatLead;
  agentLoad: Array<{ agent: string; count: number }>;
}): Promise<ConciergeReply> {
  const ctx = [
    "LEAD:",
    `  name: ${args.lead.name ?? "no data"}`,
    `  email: ${args.lead.email ?? "no data"}`,
    `  phone: ${args.lead.phone ?? "no data"}`,
    `  country: ${args.lead.country_code ?? "no data"}`,
    `  city: ${args.lead.city ?? "no data"}`,
    `  language: ${args.lead.language ?? "no data"}`,
    `  message: ${(args.lead.message ?? "").slice(0, 400) || "no data"}`,
    "",
    "AGENT LOAD (lower count is better):",
    ...args.agentLoad.slice(0, 12).map((a) => `  ${a.agent} = ${a.count}`),
  ].join("\n");
  const messages = [
    { role: "system" as const, content: LEAD_ROUTING },
    { role: "system" as const, content: `Context (use only this; do not invent more):\n${ctx}` },
    { role: "user" as const, content: "Recommend the agent now." },
  ];
  try {
    const r = await withTimeout(
      fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_DESK_FAST_MODEL,
          messages,
          stream: false,
          keep_alive: "24h",
          options: { temperature: 0.2, num_ctx: 1024, top_p: 0.85, num_predict: 60 },
        }),
      }),
      REQ_TIMEOUT_MS,
    );
    if (!r.ok) return { ok: false, reply: "Local AI engine offline. Pick the lowest-loaded agent manually.", degraded: `http ${r.status}` };
    const j = (await r.json()) as { message?: { content?: string } };
    return { ok: true, reply: (j.message?.content ?? "").trim() || "(empty)" };
  } catch (err) {
    logError("[concierge] recommendAgent failed", err);
    return { ok: false, reply: "Local AI engine offline. Pick the lowest-loaded agent manually.", degraded: "ollama unreachable" };
  }
}
