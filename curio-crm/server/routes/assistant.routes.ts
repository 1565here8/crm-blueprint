/**
 * Operator AI assistant routes — "THE DESK".
 *
 * All admin-only. Local Ollama only. Audit data + market snapshots feed the
 * local model; nothing leaves the VPS. Server appends the legal disclaimer
 * to every response (see deskPrompts.ts).
 */
import { Router, json as expressJson } from "express";
import { z } from "zod";
import { error as logError } from "../log";
import { deskChat, deskChatStream, ollamaStatus, purgeOllamaMemoryExcept, warmDeskFastModel, warmDeskSmartModel, OLLAMA_CONCIERGE_MODEL, OLLAMA_DESK_FAST_MODEL } from "../ollama";
import {
  auditToContextText,
  auditToContextTextCompact,
  buildAuditReport,
  type AuditCategoryKey,
} from "../assistantAudit";
import { buildMarketBrief, buildMarketBriefFast, marketBriefToContextText } from "../marketBrief";
import {
  AGENT_BRIEF,
  ASSIST_MODE,
  ASSIST_MODE_COMPACT,
  CLIENT_PITCH,
  COLLECTIONS_BRIEF,
  FREE_ASK,
  FREE_ASK_COMPACT,
  DESK_DEMO_GUIDE,
  LEGAL_DISCLAIMER,
  OPERATOR_BRIEF,
  PITCH_COACH,
  SALES_CALL_COMPACT,
  SALES_CALL_REVIEW,
  withDisclaimer,
} from "../deskPrompts";
import { deskFastPath } from "../deskFastPath";
import { buildPitchContextForLlm, isDeskRepeatLoop, isPitchOrMarketTipRequest, isLlmSlop } from "../deskPitchEngine";
import {
  resolveDeskInstant,
  resolveDeskFallback,
  shouldSkipLlm,
  needsSmartDesk,
  wantsDeskMarketContext,
  moversForDesk,
} from "../deskRouteMessage";
import { resolveDeskPayloadFallback } from "../deskPayloadFallback";
import { digestAttachments, digestsToContextText } from "../deskAttachments";
import {
  buildCrmCatalogForAi,
  CRM_LLM_KNOWLEDGE,
  isCrmGuideQuestion,
} from "../../shared/crmGuideKnowledge";

function crmGuideContext(message: string, compact = false): string | null {
  if (!isCrmGuideQuestion(message)) return null;
  if (compact) return CRM_LLM_KNOWLEDGE;
  const { catalog } = buildCrmCatalogForAi();
  return `${CRM_LLM_KNOWLEDGE}\n\n${catalog}`;
}

function hasDeskPayload(data: { attachments?: unknown[]; callTranscript?: string }): boolean {
  return Boolean(data.attachments?.length) || Boolean(data.callTranscript?.trim());
}

function deskAssistOverlay(
  mode: "assist" | "sales_call",
  smart: boolean,
  message: string,
  hasPayload = false,
): string {
  if (mode === "sales_call") return hasPayload ? SALES_CALL_REVIEW : SALES_CALL_COMPACT;
  if (hasPayload) return ASSIST_MODE;
  if (isCrmGuideQuestion(message)) return `${DESK_DEMO_GUIDE}\n\n${ASSIST_MODE_COMPACT}`;
  if (smart && (isPitchOrMarketTipRequest(message) || needsSmartDesk(message))) return PITCH_COACH;
  return ASSIST_MODE_COMPACT;
}

async function* streamDeskAssist(args: {
  mode: "assist" | "sales_call";
  message: string;
  contextText: string;
  history?: { role: "user" | "assistant"; content: string }[];
  temperature: number;
  maxPredict: number;
  smart?: boolean;
  hasPayload?: boolean;
}) {
  for await (const chunk of deskChatStream({
    modeOverlay: deskAssistOverlay(
      args.mode,
      Boolean(args.smart),
      args.message,
      Boolean(args.hasPayload),
    ),
    userMessage: args.message,
    contextText: args.contextText,
    history: args.history,
    temperature: args.temperature,
    fast: !args.smart,
    smart: args.smart,
    maxPredict: args.maxPredict,
  })) {
    yield chunk;
  }
}

function deskAssistMaxPredict(
  mode: "assist" | "sales_call",
  message: string,
  smart: boolean,
  hasPayload = false,
): number {
  if (smart || hasPayload) return Math.min(480, 280 + Math.floor(message.length / 6));
  if (isCrmGuideQuestion(message)) return 48;
  return Math.min(64, 40 + Math.floor(message.length / 14));
}

function wantsMarketContext(message: string, includeMarket?: boolean): boolean {
  if (includeMarket) return true;
  return /market|stock|crypto|fx|forex|mover|tape|commodit|index|bitcoin|btc|eth/i.test(message);
}
import { getCrmUser } from "../crmUsers";
import { getExecutions } from "../db";
import {
  assignChatLead,
  dismissChatLead,
  getChatLead,
  leadStats,
  listChatLeads,
  recommendAgent,
} from "../concierge";
import { buildPspHealthReport } from "../pspHealth";
import { buildCollectionsContext } from "../collectionsBrief";
import {
  assignTask,
  completeTask,
  createTask,
  dismissTask,
  generateAuditTasks,
  listTasks,
  reopenTask,
  taskStats,
} from "../tasks";
import {
  effectivePermissions,
  requireAdminOrStaff,
  requireStaffPermission,
} from "../staffPermissions";
import { requireAdmin } from "../auth";
import { connectAiWallstreet, getBrokerAiSetup } from "../aiBridge";

export const assistantRouter = Router();

assistantRouter.use(requireAdminOrStaff);
assistantRouter.use((_req, res, next) => {
  res.setHeader("X-Accel-Buffering", "no");
  next();
});

assistantRouter.post("/connect", requireAdmin, expressJson(), async (req, res) => {
  try {
    const host = typeof req.body?.host === "string" ? req.body.host.trim() : undefined;
    const tunnel = req.body?.tunnel === true;
    res.json(await connectAiWallstreet(host, tunnel));
  } catch (err) {
    logError("[desk/connect]", err);
    res.status(500).json({
      ok: false,
      connected: false,
      restarted: false,
      message: "Connect failed. Try again.",
    });
  }
});

assistantRouter.get("/status", async (_req, res) => {
  try {
    res.json({ ...(await ollamaStatus()), setup: getBrokerAiSetup() });
  } catch (err) {
    logError("[desk/status]", err);
    res.json({
      available: false,
      model: "unknown",
      baseUrl: "",
      installedModels: [],
      error: "status check failed",
    });
  }
});

assistantRouter.get("/warm", (_req, res) => {
  void warmDeskFastModel().then((ok) => res.json({ ok }));
});

assistantRouter.get("/audit", (_req, res) => {
  try {
    res.json({ report: buildAuditReport() });
  } catch (err) {
    logError("[desk/audit]", err);
    res.json({
      report: {
        generatedAt: new Date().toISOString(),
        totals: { users: 0, online: 0, depositors: 0, silentAgents: 0, flaggedLeads: 0 },
        agentLoad: [],
        categories: [],
      },
      warning: "Audit engine unavailable.",
    });
  }
});

assistantRouter.get("/market-brief", async (_req, res) => {
  try {
    res.json({ brief: await buildMarketBrief() });
  } catch (err) {
    logError("[desk/market-brief]", err);
    res.json({
      brief: {
        generatedAt: new Date().toISOString(),
        fx: [],
        stocks: [],
        crypto: [],
        commodities: [],
        indices: [],
      },
      warning: "Market feeds unreachable.",
    });
  }
});

assistantRouter.get("/disclaimer", (_req, res) => {
  res.json({ disclaimer: LEGAL_DISCLAIMER });
});

/* --------------------------- LLM-backed endpoints --------------------------- */

assistantRouter.post("/operator-brief", requireStaffPermission("desk.operator_brief"), async (_req, res) => {
  try {
    const audit = buildAuditReport();
    const ctx = auditToContextTextCompact(audit);
    const result = await deskChat({
      modeOverlay: OPERATOR_BRIEF,
      userMessage: "Generate the operator pipeline brief now.",
      contextText: ctx,
      fast: true,
      maxPredict: 180,
    });
    res.json({
      reply: result.content,
      ok: result.ok,
      degraded: result.degraded,
      model: result.model,
    });
  } catch (err) {
    logError("[desk/operator-brief]", err);
    res.json({
      reply: withDisclaimer("Local AI engine error. Try again in a moment."),
      ok: false,
      degraded: "operator-brief failed",
    });
  }
});

assistantRouter.post("/agent-brief", requireStaffPermission("desk.agent_brief"), async (_req, res) => {
  try {
    const brief = await buildMarketBrief();
    const ctx = marketBriefToContextText(brief);
    const result = await deskChat({
      modeOverlay: AGENT_BRIEF,
      userMessage: "Generate the 09:25 agent floor brief now.",
      contextText: ctx,
      temperature: 0.35,
      fast: true,
      maxPredict: 180,
    });
    res.json({
      reply: result.content,
      ok: result.ok,
      degraded: result.degraded,
      model: result.model,
      snapshot: brief,
    });
  } catch (err) {
    logError("[desk/agent-brief]", err);
    res.json({
      reply: withDisclaimer("Local AI engine error. Try again in a moment."),
      ok: false,
      degraded: "agent-brief failed",
    });
  }
});

const clientPitchSchema = z.object({
  userId: z.string().uuid(),
});

assistantRouter.post("/client-pitch", requireStaffPermission("desk.client_pitch"), async (req, res) => {
  try {
    const parsed = clientPitchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }
    const c = getCrmUser(parsed.data.userId);
    const execs = getExecutions(parsed.data.userId, 5);
    const brief = await buildMarketBrief();
    const ctx = [
      "CLIENT SNAPSHOT:",
      `  id #${c.displayId} | name ${c.fullName} | country ${c.countryCode || "?"}`,
      `  cash ${c.cashBalance} ${c.currency} | equity ${c.equity} | credits ${c.credits}`,
      `  total deposits ${c.totalDeposits} | total volume ${c.totalVolume}`,
      `  status ${c.crmStatus} | trading ${c.tradingStatus} | agent ${c.agentName}`,
      `  online now: ${c.online} | last login ${c.lastLoginAt ?? "never"}`,
      `  notes on file: ${c.noteCount} | last note ${c.lastNoteAt ?? "never"}`,
      `  closed PnL ${c.totalClosedPnl} | open PnL ${c.totalOpenPnl}`,
      "",
      "RECENT EXECUTIONS:",
      ...(execs.length
        ? execs.map(
            (e) => `  ${e.created_at} ${e.side} ${e.qty} ${e.symbol} @ ${e.fill_price}`,
          )
        : ["  none"]),
      "",
      marketBriefToContextText(brief),
    ].join("\n");

    const result = await deskChat({
      modeOverlay: CLIENT_PITCH,
      userMessage: `Generate the pitch script for client #${c.displayId} now. Pick the strongest asset from today's top-of-book that matches their history and cash level.`,
      contextText: ctx,
      temperature: 0.4,
      fast: true,
      maxPredict: 200,
    });
    res.json({
      reply: result.content,
      ok: result.ok,
      degraded: result.degraded,
      model: result.model,
    });
  } catch (err) {
    logError("[desk/client-pitch]", err);
    res.json({
      reply: withDisclaimer("Could not generate pitch. Try again in a moment."),
      ok: false,
      degraded: "client-pitch failed",
    });
  }
});

const askSchema = z.object({
  message: z.string().min(1).max(4_000),
  includeAudit: z.boolean().optional().default(false),
  includeMarket: z.boolean().optional().default(false),
  category: z
    .enum([
      "bad_leads",
      "fake_or_dead_investors",
      "uncalled",
      "unanswered",
      "document_gaps",
      "pipeline_stalled",
      "agent_silence",
      "duplicates",
    ])
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4_000),
      }),
    )
    .max(10)
    .optional(),
});

assistantRouter.post("/ask", requireStaffPermission("desk.ask"), async (req, res) => {
  try {
    const parsed = askSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }

      const instant = deskFastPath(parsed.data.message, parsed.data.history);
    if (instant) {
      res.json({ reply: instant.reply, ok: true, model: "fast-path" });
      return;
    }

    const parts: string[] = [];
    if (parsed.data.includeAudit) {
      const audit = buildAuditReport();
      if (parsed.data.category) {
        const cat = audit.categories.find((c) => c.key === (parsed.data.category as AuditCategoryKey));
        if (cat) parts.push(auditToContextTextCompact({ ...audit, categories: [cat] }));
        else parts.push(auditToContextTextCompact(audit));
      } else {
        parts.push(auditToContextTextCompact(audit));
      }
    }
    if (parsed.data.includeMarket) {
      try {
        const brief = await buildMarketBrief();
        parts.push(marketBriefToContextText(brief));
      } catch {
        /* best-effort */
      }
    }

    const guideCtx = crmGuideContext(parsed.data.message);
    if (guideCtx) parts.unshift(guideCtx);

    const result = await deskChat({
      modeOverlay: FREE_ASK_COMPACT,
      userMessage: parsed.data.message,
      contextText: parts.join("\n\n"),
      history: parsed.data.history,
      fast: true,
    });
    res.json({
      reply: result.content,
      ok: result.ok,
      degraded: result.degraded,
      model: result.model,
    });
  } catch (err) {
    logError("[desk/ask]", err);
    res.json({
      reply: withDisclaimer("Local AI engine unreachable."),
      ok: false,
      degraded: "ask failed",
    });
  }
});

/* --------------------------- caller perms --------------------------- */

assistantRouter.get("/me/permissions", (req, res) => {
  res.json(effectivePermissions(req));
});

assistantRouter.get("/crm-catalog", requireStaffPermission("desk.ask"), (_req, res) => {
  res.json(buildCrmCatalogForAi());
});

/* --------------------- ADMIN-WIDE FLOATING BUBBLE --------------------- */
/**
 * One endpoint serves the floating Wallstreet AI bubble that sits
 * on every admin page. Accepts a free-form message plus optional
 * attachments (text-extracted in-browser, or base64-encoded PDFs /
 * audio / images that the server parses safely). Two modes:
 *   - "assist"      → general operator copilot (ASSIST_MODE overlay)
 *   - "sales_call"  → sales-call forensics & coaching (SALES_CALL_REVIEW)
 *
 * Open to every admin and every staff member with the basic `desk.ask`
 * permission — same gate as the standard text "ask" route. The bubble
 * is the operator's pocket assistant; nothing leaves the VPS.
 */
const attachmentInputSchema = z.object({
  name: z.string().max(200),
  mime: z.string().max(120),
  size: z.number().int().nonnegative().max(20 * 1024 * 1024),
  contentText: z.string().max(2_000_000).nullable().optional(),
  contentBase64: z.string().max(28_000_000).nullable().optional(),
});

const assistSchema = z.object({
  message: z.string().min(1).max(8_000),
  mode: z.enum(["assist", "sales_call"]).optional().default("assist"),
  callTranscript: z.string().max(40_000).optional(),
  includeAudit: z.boolean().optional().default(false),
  includeMarket: z.boolean().optional().default(false),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4_000),
      }),
    )
    .max(8)
    .optional(),
  attachments: z.array(attachmentInputSchema).max(6).optional(),
});

assistantRouter.post(
  "/assist",
  // bigger JSON ceiling than the global 256kb so base64 attachments fit
  expressJson({ limit: "25mb" }),
  requireStaffPermission("desk.ask"),
  async (req, res) => {
    try {
      const parsed = assistSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Bad request." });
        return;
      }

      const hasPayload = hasDeskPayload(parsed.data);
      const smart = hasPayload || needsSmartDesk(parsed.data.message, parsed.data.history);

      const instant = !hasPayload ? await resolveDeskInstant(parsed.data.message, parsed.data.history) : null;
      if (instant) {
        res.json({
          reply: `${instant.body}\n\nEND`,
          ok: true,
          model: instant.model,
          mode: parsed.data.mode,
          attachments: [],
        });
        return;
      }

      const digests = await digestAttachments(parsed.data.attachments);
      const ctxParts: string[] = [];

      const guideCtx = crmGuideContext(parsed.data.message, !smart);
      if (guideCtx) ctxParts.push(guideCtx);

      if (parsed.data.includeAudit) {
        try {
          ctxParts.push(auditToContextTextCompact(buildAuditReport()));
        } catch {
          /* best-effort */
        }
      }

      let briefForPitch = null;
      if (wantsDeskMarketContext(parsed.data.message, parsed.data.includeMarket)) {
        try {
          briefForPitch = await moversForDesk();
          if (briefForPitch) ctxParts.push(marketBriefToContextText(briefForPitch));
        } catch {
          /* best-effort */
        }
      }

      if (smart) {
        ctxParts.unshift(
          buildPitchContextForLlm(parsed.data.message, briefForPitch, parsed.data.history),
        );
      }

      if (parsed.data.callTranscript && parsed.data.callTranscript.trim()) {
        ctxParts.push(
          `LIVE CALL TRANSCRIPT (agent ↔ client):\n${parsed.data.callTranscript.trim().slice(0, 40_000)}`,
        );
      }

      if (digests.length) ctxParts.push(digestsToContextText(digests));

      const result = await deskChat({
        modeOverlay: deskAssistOverlay(parsed.data.mode, smart, parsed.data.message, hasPayload),
        userMessage: parsed.data.message,
        contextText: ctxParts.join("\n\n"),
        history: parsed.data.history,
        temperature: parsed.data.mode === "sales_call" ? 0.35 : smart ? 0.35 : 0.45,
        fast: !smart,
        smart,
        maxPredict: deskAssistMaxPredict(parsed.data.mode, parsed.data.message, smart, hasPayload),
      });

      if (!result.ok) {
        const payloadFb = hasPayload ? resolveDeskPayloadFallback(digests) : null;
        const fallback =
          payloadFb ?? resolveDeskFallback(parsed.data.message, result.content, parsed.data.history);
        res.json({
          reply: `${fallback.body}\n\nEND`,
          ok: true,
          model: fallback.model,
          mode: parsed.data.mode,
          degraded: payloadFb ? "ollama offline — attachment digest only" : result.degraded,
          attachments: digests.map((d) => ({
            name: d.name,
            mime: d.mime,
            sizeBytes: d.sizeBytes,
            kind: d.kind,
            extractedChars: d.extractedChars,
            preview: d.preview,
            note: d.note,
          })),
        });
        return;
      }

      const slop = isLlmSlop(result.content) || isDeskRepeatLoop(result.content);
      res.json({
        reply: slop
          ? `${resolveDeskFallback(parsed.data.message, undefined, parsed.data.history).body}\n\nEND`
          : result.content,
        ok: result.ok,
        degraded: result.degraded,
        model: slop ? "pitch-engine" : result.model,
        mode: parsed.data.mode,
        attachments: digests.map((d) => ({
          name: d.name,
          mime: d.mime,
          sizeBytes: d.sizeBytes,
          kind: d.kind,
          extractedChars: d.extractedChars,
          preview: d.preview,
          note: d.note,
        })),
      });
    } catch (err) {
      logError("[desk/assist]", err);
      res.status(200).json({
        reply: withDisclaimer("Local AI engine unreachable. Try again in a moment."),
        ok: false,
        degraded: "assist failed",
      });
    }
  },
);

assistantRouter.post(
  "/assist/stream",
  expressJson({ limit: "25mb" }),
  requireStaffPermission("desk.ask"),
  async (req, res) => {
    const writeSse = (obj: object) => {
      res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    try {
      const parsed = assistSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Bad request." });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const hasPayload = hasDeskPayload(parsed.data);
      const smart = hasPayload || needsSmartDesk(parsed.data.message, parsed.data.history);

      const instant = !hasPayload ? await resolveDeskInstant(parsed.data.message, parsed.data.history) : null;
      if (instant) {
        writeSse({ t: instant.body });
        writeSse({ done: true, model: instant.model });
        res.end();
        return;
      }

      writeSse({ ping: 1 });

      const digests = await digestAttachments(parsed.data.attachments);
      const ctxParts: string[] = [];

      const guideCtx = crmGuideContext(parsed.data.message, !smart);
      if (guideCtx) ctxParts.push(guideCtx);

      if (parsed.data.includeAudit) {
        try {
          ctxParts.push(auditToContextTextCompact(buildAuditReport()));
        } catch {
          /* best-effort */
        }
      }

      let briefForPitch = null;
      if (wantsDeskMarketContext(parsed.data.message, parsed.data.includeMarket)) {
        try {
          briefForPitch = await moversForDesk();
          if (briefForPitch) ctxParts.push(marketBriefToContextText(briefForPitch));
        } catch {
          /* best-effort */
        }
      }

      if (smart) {
        ctxParts.unshift(
          buildPitchContextForLlm(parsed.data.message, briefForPitch, parsed.data.history),
        );
      }

      if (parsed.data.callTranscript?.trim()) {
        ctxParts.push(
          `LIVE CALL TRANSCRIPT (agent ↔ client):\n${parsed.data.callTranscript.trim().slice(0, 40_000)}`,
        );
      }

      if (digests.length) ctxParts.push(digestsToContextText(digests));

      let degraded: string | undefined;
      let streamed = "";
      let slopAbort = false;
      for await (const chunk of streamDeskAssist({
        mode: parsed.data.mode,
        message: parsed.data.message,
        contextText: ctxParts.join("\n\n"),
        history: parsed.data.history,
        temperature: parsed.data.mode === "sales_call" ? 0.35 : smart ? 0.35 : 0.45,
        maxPredict: deskAssistMaxPredict(parsed.data.mode, parsed.data.message, smart, hasPayload),
        smart,
        hasPayload,
      })) {
        if ("token" in chunk) {
          streamed += chunk.token;
          if (
            streamed.length >= 40 &&
            (isLlmSlop(streamed) || isDeskRepeatLoop(streamed))
          ) {
            slopAbort = true;
            break;
          }
          writeSse({ t: chunk.token });
        } else {
          degraded = chunk.error;
        }
      }

      if (degraded || slopAbort) {
        const payloadFb = hasPayload ? resolveDeskPayloadFallback(digests) : null;
        if (payloadFb || !hasPayload) {
          const fallback =
            payloadFb ??
            resolveDeskFallback(
              parsed.data.message,
              slopAbort ? undefined : streamed,
              parsed.data.history,
            );
          if (slopAbort) writeSse({ t: "\n\n" });
          for (const word of fallback.body.split(/(\s+)/)) {
            if (word) writeSse({ t: word });
          }
          writeSse({
            done: true,
            model: fallback.model,
            ...(payloadFb || degraded
              ? { degraded: payloadFb ? "ollama offline — attachment digest only" : degraded }
              : {}),
          });
          res.end();
          return;
        }
      }

      if (degraded) writeSse({ t: degraded });

      writeSse({ done: true, model: smart ? "qwen-smart" : undefined, ...(degraded ? { degraded } : {}) });
      res.end();
    } catch (err) {
      logError("[desk/assist/stream]", err);
      if (!res.headersSent) {
        res.status(200).json({
          reply: withDisclaimer("Local AI engine unreachable. Try again in a moment."),
          ok: false,
          degraded: "assist stream failed",
        });
        return;
      }
      try {
        writeSse({ t: "Local AI engine unreachable. Try again in a moment." });
        writeSse({ done: true, degraded: "assist stream failed" });
        res.end();
      } catch {
        /* connection already closed */
      }
    }
  },
);

/* ----------------------------- LEAD INBOX ----------------------------- */

const leadFilterSchema = z.object({
  status: z.enum(["new", "assigned", "dismissed", "converted"]).optional(),
  limit: z.coerce.number().int().positive().max(500).optional(),
});

assistantRouter.get("/leads", requireStaffPermission("desk.lead_inbox.view"), (req, res) => {
  const parsed = leadFilterSchema.safeParse(req.query);
  const leads = listChatLeads(parsed.success ? parsed.data : undefined);
  res.json({ leads, stats: leadStats() });
});

assistantRouter.get("/leads/:id", requireStaffPermission("desk.lead_inbox.view"), (req, res) => {
  const lead = getChatLead(req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Lead not found." });
    return;
  }
  res.json({ lead });
});

const assignLeadSchema = z.object({
  agentName: z.string().min(1).max(120),
});

assistantRouter.post(
  "/leads/:id/assign",
  requireStaffPermission("desk.lead_inbox.assign"),
  (req, res) => {
    const parsed = assignLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }
    const lead = assignChatLead({
      id: req.params.id,
      agentName: parsed.data.agentName,
      actorId: req.sessionUser?.id ?? null,
    });
    if (!lead) {
      res.status(404).json({ error: "Lead not found." });
      return;
    }
    res.json({ lead });
  },
);

assistantRouter.post(
  "/leads/:id/dismiss",
  requireStaffPermission("desk.lead_inbox.assign"),
  (req, res) => {
    const lead = dismissChatLead(req.params.id);
    if (!lead) {
      res.status(404).json({ error: "Lead not found." });
      return;
    }
    res.json({ lead });
  },
);

assistantRouter.post(
  "/leads/:id/recommend",
  requireStaffPermission("desk.lead_inbox.assign"),
  async (req, res) => {
    try {
      const lead = getChatLead(req.params.id);
      if (!lead) {
        res.status(404).json({ error: "Lead not found." });
        return;
      }
      const report = buildAuditReport();
      const result = await recommendAgent({ lead, agentLoad: report.agentLoad });
      res.json({ reply: result.reply, ok: result.ok, degraded: result.degraded });
    } catch (err) {
      logError("[desk/leads/recommend]", err);
      res.json({ reply: "Local AI engine offline.", ok: false, degraded: "recommend failed" });
    }
  },
);

/* ----------------------------- PSP HEALTH ----------------------------- */

assistantRouter.get("/psp-health", requireStaffPermission("desk.psp_health.view"), (_req, res) => {
  try {
    res.json({ report: buildPspHealthReport() });
  } catch (err) {
    logError("[desk/psp-health]", err);
    res.json({
      report: {
        generatedAt: new Date().toISOString(),
        totals: { methods: 0, pendingTotal: 0, pendingAmount: 0, last7dVolume: 0, last30dVolume: 0, overallSuccessRate: 0 },
        methods: [],
        stuckDeposits: [],
      },
      warning: "PSP report unavailable.",
    });
  }
});

/* --------------------------- COLLECTIONS BRIEF --------------------------- */

assistantRouter.post(
  "/collections-brief",
  requireStaffPermission("desk.collections_brief"),
  async (_req, res) => {
    try {
      const ctx = buildCollectionsContext();
      const result = await deskChat({
        modeOverlay: COLLECTIONS_BRIEF,
        userMessage: "Generate the collections brief now.",
        contextText: ctx,
        temperature: 0.25,
      });
      res.json({ reply: result.content, ok: result.ok, degraded: result.degraded, model: result.model });
    } catch (err) {
      logError("[desk/collections-brief]", err);
      res.json({
        reply: withDisclaimer("Local AI engine error. Try again in a moment."),
        ok: false,
        degraded: "collections-brief failed",
      });
    }
  },
);

/* ----------------------------- TASKS ----------------------------- */

assistantRouter.get("/tasks", requireStaffPermission("desk.tasks.view"), (req, res) => {
  const status = req.query.status as "open" | "completed" | "dismissed" | undefined;
  const tasks = listTasks({ status: status ?? "open", limit: 200 });
  res.json({ tasks, stats: taskStats() });
});

const createTaskSchema = z.object({
  kind: z.string().min(1).max(40).default("manual"),
  title: z.string().min(1).max(200),
  body: z.string().max(2_000).optional(),
  userId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  depositId: z.string().uuid().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  dueAt: z.string().datetime().optional(),
  assignedTo: z.string().max(120).optional(),
});

assistantRouter.post("/tasks", requireStaffPermission("desk.tasks.view"), (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  const task = createTask({
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    userId: parsed.data.userId,
    leadId: parsed.data.leadId,
    depositId: parsed.data.depositId,
    priority: parsed.data.priority,
    dueAt: parsed.data.dueAt,
    assignedTo: parsed.data.assignedTo,
  });
  if (!task) {
    res.status(409).json({ error: "Task already exists." });
    return;
  }
  res.json({ task });
});

assistantRouter.post(
  "/tasks/:id/complete",
  requireStaffPermission("desk.tasks.complete"),
  (req, res) => {
    const task = completeTask(req.params.id, req.sessionUser?.id ?? null);
    if (!task) {
      res.status(404).json({ error: "Task not found." });
      return;
    }
    res.json({ task });
  },
);

assistantRouter.post(
  "/tasks/:id/dismiss",
  requireStaffPermission("desk.tasks.complete"),
  (req, res) => {
    const task = dismissTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found." });
      return;
    }
    res.json({ task });
  },
);

assistantRouter.post(
  "/tasks/:id/reopen",
  requireStaffPermission("desk.tasks.complete"),
  (req, res) => {
    const task = reopenTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: "Task not found." });
      return;
    }
    res.json({ task });
  },
);

const assignTaskSchema = z.object({ assignedTo: z.string().max(120).nullable() });

assistantRouter.post(
  "/tasks/:id/assign",
  requireStaffPermission("desk.tasks.complete"),
  (req, res) => {
    const parsed = assignTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }
    const task = assignTask(req.params.id, parsed.data.assignedTo);
    if (!task) {
      res.status(404).json({ error: "Task not found." });
      return;
    }
    res.json({ task });
  },
);

assistantRouter.post(
  "/tasks/generate",
  requireStaffPermission("desk.tasks.view"),
  (_req, res) => {
    try {
      const result = generateAuditTasks();
      res.json(result);
    } catch (err) {
      logError("[desk/tasks/generate]", err);
      res.json({ created: 0, skipped: 0, warning: "Task generator unavailable." });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────
// Wallstreet AI — Mega Mind extensions (RBAC-scoped + owner-locked)
// ─────────────────────────────────────────────────────────────────────
import { requireOwnerOnly } from "../staffPermissions";
import { classifyAudience, audienceBanner, audienceUserFilter } from "../desk/audience";
import { buildAllForensics, buildForensicReport, forensicToContextText } from "../clientForensics";
import { buildMarketingReport, marketingReportToContextText } from "../marketingIntel";
import { buildAgentReport, agentReportToContextText } from "../agentPerformance";
import { listHouseRules, createHouseRule, updateHouseRule, deleteHouseRule, RULE_SCOPES, injectionForScope, type RuleScope } from "../houseRules";
import {
  listDripCampaigns, upsertDripCampaign, deleteDripCampaign, runCampaignOnce,
  listDripHistory, approveDripDraft, cancelDripDraft, getDripCampaign,
} from "../dripEngine";
import { proposeInstructionPlan, saveProposedInstruction, listInstructions, getInstruction, executeInstruction, cancelInstruction } from "../instructionEngine";
import { runAnomalyScan, listAnomalies, acknowledgeAnomaly } from "../anomalyDetect";
import { detectRings } from "../ringDetect";
import { buildAffiliateReport, snapshotAffiliateReport } from "../affiliateQuality";
import { getAllBeliefs, setBelief, resetBelief, BELIEF_KEYS, type BeliefKey, getBelief } from "../beliefSystem";
import { getDb } from "../db";

function scopedUserIds(req: import("express").Request): Set<string> | null {
  const info = classifyAudience(req);
  if (info.audience === "owner" || info.audience === "manager" || info.audience === "compliance") return null;
  const f = audienceUserFilter(info);
  const rows = getDb().prepare(`
    SELECT u.id FROM users u JOIN user_profiles p ON p.user_id = u.id
    WHERE u.role = 'user' ${f.sql}
  `).all(...f.params) as Array<{ id: string }>;
  return new Set(rows.map((r) => r.id));
}

// ── AUDIENCE INFO (used by the UI to hide buttons it shouldn't see) ──
assistantRouter.get("/audience", (req, res) => {
  const info = classifyAudience(req);
  res.json({ audience: info.audience, username: info.username, agentName: info.agentName, permissions: info.permissions });
});

// ── FORENSICS ─────────────────────────────────────────────────────────
assistantRouter.get("/forensics", requireStaffPermission("desk.forensics.view"), (req, res) => {
  try {
    const filter = scopedUserIds(req);
    res.json({ report: buildAllForensics(filter) });
  } catch (err) {
    logError("[desk/forensics]", err);
    res.json({
      report: { generatedAt: new Date().toISOString(), highRisk: [], kycCritical: [], badActors: [], totals: { scanned: 0, highRiskCount: 0, kycCriticalCount: 0, badActorCount: 0 } },
      warning: "Forensics engine unavailable.",
    });
  }
});

assistantRouter.get("/forensics/:userId", requireStaffPermission("desk.forensics.view"), (req, res) => {
  try {
    const filter = scopedUserIds(req);
    if (filter && !filter.has(req.params.userId)) { res.status(403).json({ error: "Out of your audience scope." }); return; }
    const r = buildForensicReport(req.params.userId);
    if (!r) { res.status(404).json({ error: "Client not found." }); return; }
    res.json({ forensic: r });
  } catch (err) {
    logError("[desk/forensics/:id]", err); res.status(500).json({ error: "Forensics failed." });
  }
});

assistantRouter.post("/forensics/analyze", requireStaffPermission("desk.forensics.view"), async (req, res) => {
  try {
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Bad request." }); return; }
    const filter = scopedUserIds(req);
    if (filter && !filter.has(parsed.data.userId)) { res.status(403).json({ error: "Out of your audience scope." }); return; }
    const r = buildForensicReport(parsed.data.userId);
    if (!r) { res.status(404).json({ error: "Client not found." }); return; }
    const info = classifyAudience(req);
    const out = await deskChat({
      modeOverlay: getBelief("forensics_analyze"),
      userMessage: "Narrate the forensic report for this client.",
      contextText: forensicToContextText(r),
      audienceBanner: audienceBanner(info),
      houseRulesBlock: injectionForScope("forensics"),
      temperature: 0.2,
    });
    res.json({ forensic: r, narrative: out.content, ok: out.ok, degraded: out.degraded });
  } catch (err) {
    logError("[desk/forensics/analyze]", err); res.status(500).json({ error: "Analyze failed." });
  }
});

// ── MARKETING INTELLIGENCE ────────────────────────────────────────────
assistantRouter.get("/marketing-intel", requireStaffPermission("desk.marketing_intel.view"), (req, res) => {
  try {
    const info = classifyAudience(req);
    const onlyPartner = info.audience === "marketer" ? (info.agentName || info.username) : null;
    res.json({ report: buildMarketingReport({ onlyPartner }) });
  } catch (err) {
    logError("[desk/marketing-intel]", err);
    res.json({ report: { generatedAt: new Date().toISOString(), totals: { campaigns: 0, leads: 0, depositors: 0, deposits: 0, avgConversionPct: 0 }, campaigns: [], warnings: [] }, warning: "Marketing engine unavailable." });
  }
});

assistantRouter.post("/marketing-intel/analyze", requireStaffPermission("desk.marketing_intel.view"), async (req, res) => {
  try {
    const info = classifyAudience(req);
    const onlyPartner = info.audience === "marketer" ? (info.agentName || info.username) : null;
    const report = buildMarketingReport({ onlyPartner });
    const out = await deskChat({
      modeOverlay: getBelief("marketing_analyze"),
      userMessage: "Analyze the campaign table.",
      contextText: marketingReportToContextText(report),
      audienceBanner: audienceBanner(info),
      houseRulesBlock: injectionForScope("marketing"),
      temperature: 0.25,
    });
    res.json({ report, narrative: out.content, ok: out.ok, degraded: out.degraded });
  } catch (err) {
    logError("[desk/marketing-intel/analyze]", err); res.status(500).json({ error: "Analyze failed." });
  }
});

// ── AGENT PERFORMANCE ─────────────────────────────────────────────────
assistantRouter.get("/agent-perf", requireStaffPermission("desk.agent_perf.view"), (req, res) => {
  try {
    const info = classifyAudience(req);
    const onlyAgent = info.audience === "agent" ? (info.agentName || info.username) : null;
    res.json({ report: buildAgentReport({ onlyAgent }) });
  } catch (err) {
    logError("[desk/agent-perf]", err);
    res.json({ report: { generatedAt: new Date().toISOString(), totals: { agents: 0, assignedLeads: 0, activeDepositors: 0, totalRevenue: 0 }, agents: [] }, warning: "Agent engine unavailable." });
  }
});

assistantRouter.post("/agent-perf/analyze", requireStaffPermission("desk.agent_perf.view"), async (req, res) => {
  try {
    const info = classifyAudience(req);
    const onlyAgent = info.audience === "agent" ? (info.agentName || info.username) : null;
    const report = buildAgentReport({ onlyAgent });
    const out = await deskChat({
      modeOverlay: getBelief("agent_perf_analyze"),
      userMessage: "Read the agent board.",
      contextText: agentReportToContextText(report),
      audienceBanner: audienceBanner(info),
      houseRulesBlock: injectionForScope("global"),
      temperature: 0.2,
    });
    res.json({ report, narrative: out.content, ok: out.ok, degraded: out.degraded });
  } catch (err) {
    logError("[desk/agent-perf/analyze]", err); res.status(500).json({ error: "Analyze failed." });
  }
});

// ── HOUSE RULES (Rule Room) — owner-only writes ──────────────────────
assistantRouter.get("/rules", requireStaffPermission("desk.house_rules.manage"), (_req, res) => {
  res.json({ rules: listHouseRules(), scopes: RULE_SCOPES });
});

const ruleSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  scope: z.enum(RULE_SCOPES as unknown as [RuleScope, ...RuleScope[]]),
  priority: z.number().int().min(0).max(1000).optional(),
  enabled: z.boolean().optional(),
});

assistantRouter.post("/rules", requireOwnerOnly, (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Bad request." }); return; }
  res.json({ rule: createHouseRule({ ...parsed.data, created_by: req.sessionUser?.username ?? null }) });
});

assistantRouter.patch("/rules/:id", requireOwnerOnly, (req, res) => {
  const parsed = ruleSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Bad request." }); return; }
  const r = updateHouseRule(req.params.id, parsed.data);
  if (!r) { res.status(404).json({ error: "Rule not found." }); return; }
  res.json({ rule: r });
});

assistantRouter.delete("/rules/:id", requireOwnerOnly, (req, res) => {
  res.json({ ok: deleteHouseRule(req.params.id) });
});

// ── BELIEF SYSTEM ("The Brain") — owner-only ─────────────────────────
assistantRouter.get("/belief", requireOwnerOnly, (_req, res) => {
  res.json({ beliefs: getAllBeliefs(), keys: BELIEF_KEYS });
});

const beliefSchema = z.object({
  key: z.enum(BELIEF_KEYS as unknown as [BeliefKey, ...BeliefKey[]]),
  body: z.string().min(1).max(20000),
});

assistantRouter.put("/belief", requireOwnerOnly, (req, res) => {
  const parsed = beliefSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Bad request." }); return; }
  setBelief(parsed.data.key, parsed.data.body, req.sessionUser?.username ?? null);
  res.json({ ok: true });
});

assistantRouter.delete("/belief/:key", requireOwnerOnly, (req, res) => {
  const k = req.params.key as BeliefKey;
  if (!(BELIEF_KEYS as readonly string[]).includes(k)) { res.status(400).json({ error: "Unknown belief key." }); return; }
  res.json({ ok: resetBelief(k) });
});

// ── DRIP ENGINE ──────────────────────────────────────────────────────
assistantRouter.get("/drip/campaigns", requireStaffPermission("desk.drip.manage"), (_req, res) => {
  res.json({ campaigns: listDripCampaigns() });
});

const campaignSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  trigger_type: z.enum(["kyc_chase", "no_deposit", "dormant", "wire_pending", "failed_deposit", "birthday", "custom"]),
  trigger_config: z.string().nullable().optional(),
  cadence_hours: z.string().min(1).max(120),
  prompt_template: z.string().min(1).max(4000),
  auto_send: z.boolean(),
  enabled: z.boolean(),
});

assistantRouter.post("/drip/campaigns", requireOwnerOnly, (req, res) => {
  const parsed = campaignSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Bad request." }); return; }
  res.json({ campaign: upsertDripCampaign({ ...parsed.data, trigger_config: parsed.data.trigger_config ?? null, created_by: req.sessionUser?.username ?? null }) });
});

assistantRouter.delete("/drip/campaigns/:id", requireOwnerOnly, (req, res) => {
  res.json({ ok: deleteDripCampaign(req.params.id) });
});

assistantRouter.post("/drip/campaigns/:id/run", requireOwnerOnly, async (req, res) => {
  const c = getDripCampaign(req.params.id);
  if (!c) { res.status(404).json({ error: "Campaign not found." }); return; }
  res.json({ result: await runCampaignOnce(c, { limit: 25 }) });
});

assistantRouter.get("/drip/queue", requireStaffPermission("desk.drip.approve"), (req, res) => {
  const status = (req.query.status as string | undefined) ?? "queued";
  res.json({ items: listDripHistory({ status: status as "queued" | "sent" | "failed" | "cancelled", limit: 200 }) });
});

assistantRouter.post("/drip/queue/:id/approve", requireStaffPermission("desk.drip.approve"), (req, res) => {
  res.json({ item: approveDripDraft({ id: req.params.id, approverId: req.sessionUser?.username ?? "approver" }) });
});

assistantRouter.post("/drip/queue/:id/cancel", requireStaffPermission("desk.drip.approve"), (req, res) => {
  res.json({ ok: cancelDripDraft(req.params.id) });
});

// ── INSTRUCTION ENGINE — owner-only propose/execute ──────────────────
assistantRouter.post("/instructions/propose", requireOwnerOnly, async (req, res) => {
  const parsed = z.object({ instruction: z.string().min(3).max(2000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Bad request." }); return; }
  const r = await proposeInstructionPlan(parsed.data.instruction);
  if ("error" in r) { res.json({ ok: false, error: r.error }); return; }
  const saved = saveProposedInstruction({
    instruction: parsed.data.instruction, plan: r.plan, affected: r.affected,
    actorId: req.sessionUser?.username ?? null,
  });
  res.json({ ok: true, record: saved, plan: r.plan, affected: r.affected });
});

assistantRouter.post("/instructions/:id/execute", requireOwnerOnly, (req, res) => {
  res.json(executeInstruction({ id: req.params.id, actorId: req.sessionUser?.username ?? null }));
});

assistantRouter.post("/instructions/:id/cancel", requireOwnerOnly, (req, res) => {
  res.json({ ok: cancelInstruction(req.params.id) });
});

assistantRouter.get("/instructions", requireStaffPermission("compliance.view"), (_req, res) => {
  res.json({ items: listInstructions(100) });
});

assistantRouter.get("/instructions/:id", requireStaffPermission("compliance.view"), (req, res) => {
  const r = getInstruction(req.params.id);
  if (!r) { res.status(404).json({ error: "Not found." }); return; }
  res.json({ item: r });
});

// ── ANOMALIES ────────────────────────────────────────────────────────
assistantRouter.get("/anomalies", requireStaffPermission("desk.anomaly.view"), (req, res) => {
  const ackParam = req.query.acknowledged;
  const ack = ackParam === "true" ? true : ackParam === "false" ? false : undefined;
  res.json({ items: listAnomalies({ acknowledged: ack, limit: 200 }) });
});

assistantRouter.post("/anomalies/scan", requireStaffPermission("desk.anomaly.view"), (_req, res) => {
  res.json({ items: runAnomalyScan() });
});

assistantRouter.post("/anomalies/:id/ack", requireStaffPermission("desk.anomaly.view"), (req, res) => {
  res.json({ ok: acknowledgeAnomaly({ id: req.params.id, actorId: req.sessionUser?.username ?? null }) });
});

// ── RING DETECTION ───────────────────────────────────────────────────
assistantRouter.get("/rings", requireStaffPermission("desk.ring.view"), (_req, res) => {
  res.json({ findings: detectRings() });
});

// ── AFFILIATE QUALITY ────────────────────────────────────────────────
assistantRouter.get("/affiliate", requireStaffPermission("desk.affiliate.view"), (req, res) => {
  const info = classifyAudience(req);
  const onlyPartner = info.audience === "marketer" ? (info.agentName || info.username) : null;
  const windowDays = Number(req.query.windowDays ?? 30);
  res.json({ report: buildAffiliateReport({ onlyPartner, windowDays }) });
});

assistantRouter.post("/affiliate/snapshot", requireOwnerOnly, (req, res) => {
  const windowDays = Number(req.query.windowDays ?? 30);
  const report = buildAffiliateReport({ windowDays });
  snapshotAffiliateReport(report);
  res.json({ ok: true, snapshotted: report.partners.length });
});
