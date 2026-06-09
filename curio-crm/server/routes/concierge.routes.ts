/**
 * Public concierge routes — no admin auth required.
 *
 * Rate-limited per IP because this hits the local Ollama daemon. The
 * daemon is bound to loopback so there's no abuse surface beyond CPU,
 * but we still cap calls to keep the floor responsive.
 *
 * The visitor's IP is read for rate-limiting only; it is never stored
 * with the lead. Only city/country/timezone/language are persisted.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  captureLead,
  conciergeChat,
  extractContactFromMessage,
  visitorContextFromRequest,
  type ChatTurn,
} from "../concierge";
import { warmConciergeModel } from "../ollama";
import { error as logError } from "../log";

export const conciergeRouter = Router();

conciergeRouter.get("/warm", (_req, res) => {
  void warmConciergeModel().then((ok) => res.json({ ok }));
});

const chatLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const leadLimiter = rateLimit({
  windowMs: 60_000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
});

const chatSchema = z.object({
  sessionId: z.string().min(1).max(120),
  message: z.string().min(1).max(2_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2_000),
      }),
    )
    .max(20)
    .optional(),
  page: z.string().max(240).optional(),
});

conciergeRouter.post("/chat", chatLimiter, async (req, res) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }
    const visitor = visitorContextFromRequest(req);
    const result = await conciergeChat({
      message: parsed.data.message,
      history: (parsed.data.history ?? []) as ChatTurn[],
      visitor,
      page: parsed.data.page ?? null,
    });
    res.json({
      reply: result.reply,
      ok: result.ok,
      degraded: result.degraded,
      visitor: {
        city: visitor.city,
        countryCode: visitor.countryCode,
        language: visitor.language,
      },
    });
  } catch (err) {
    logError("[concierge/chat]", err);
    res.json({
      reply:
        "Apologies — our concierge is offline for a moment. Please leave your name, email and phone here and we'll reach out shortly.",
      ok: false,
      degraded: "chat failed",
    });
  }
});

const leadSchema = z.object({
  sessionId: z.string().min(1).max(120),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().min(5).max(40).optional(),
  message: z.string().max(2_000).optional(),
  conversation: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2_000),
      }),
    )
    .max(40)
    .optional(),
  page: z.string().max(240).optional(),
  source: z.string().max(120).optional(),
});

conciergeRouter.post("/lead", leadLimiter, (req, res) => {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }
    let email = parsed.data.email ?? null;
    let phone = parsed.data.phone ?? null;
    if ((!email || !phone) && parsed.data.message) {
      const found = extractContactFromMessage(parsed.data.message);
      if (!email) email = found.email;
      if (!phone) phone = found.phone;
    }
    if (!email && !phone) {
      res.status(400).json({ error: "Please leave at least an email or phone so we can reach you." });
      return;
    }
    const visitor = visitorContextFromRequest(req);
    const lead = captureLead({
      sessionId: parsed.data.sessionId,
      name: parsed.data.name,
      email: email ?? undefined,
      phone: phone ?? undefined,
      message: parsed.data.message,
      conversation: parsed.data.conversation as ChatTurn[] | undefined,
      visitor,
      page: parsed.data.page ?? null,
      source: parsed.data.source ?? "concierge_widget",
    });
    res.json({
      ok: true,
      leadId: lead.id,
      message: "Thank you — a specialist will reach out within one business day.",
    });
  } catch (err) {
    logError("[concierge/lead]", err);
    res.status(200).json({
      ok: false,
      message: "We could not save your details right now. Please try again in a moment.",
    });
  }
});
