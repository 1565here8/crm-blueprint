import { Router } from "express";
import { z } from "zod";
import { readSession } from "../auth";
import { ensureAnonymousSessionId, getClientIp, upsertPresence } from "../presence";

export const presenceRouter = Router();

const heartbeatSchema = z.object({
  page: z.string().min(1).max(200),
  activity: z.string().max(120).optional(),
  campaign: z.string().max(120).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
});

presenceRouter.post("/heartbeat", (req, res) => {
  const parsed = heartbeatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid heartbeat." });
    return;
  }

  const sessionId = ensureAnonymousSessionId(req, res);
  const auth = readSession(req);

  const record = upsertPresence({
    sessionId,
    userId: auth?.id ?? null,
    username: auth?.username ?? null,
    role: auth?.role ?? null,
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"] ?? "unknown",
    currentPage: parsed.data.page,
    activity: parsed.data.activity,
    campaign: parsed.data.campaign ?? null,
    referrer: parsed.data.referrer ?? null,
  });

  res.json({ ok: true, sessionId: record.sessionId });
});
