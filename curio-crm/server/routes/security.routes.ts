import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth";
import { asyncRoute } from "../processSafety";
import { listSecurityViewLogs } from "../securityViewLogs";
import { requestHostname } from "../requestHost";
import {
  buildSecurityReport,
  checkTls,
  getPerimeterSnapshot,
  getSecurityDashboard,
  lookupDns,
} from "../securityOps";
import {
  endpointAgentKeyValid,
  getThreatDashboard,
  listBehaviorAlerts,
  listEndpointEvents,
  listSecurityEvents,
  listVisitorWatch,
  logStaffSecurityTouch,
  recordEndpointEvent,
  setIpWatch,
} from "../securityIntelligence";
import {
  getLatestAutoAudit,
  getUserBehaviorReport,
  listAutoAudits,
  runAutoSecurityAudit,
} from "../securityAutoAudit";
export const securityRouter = Router();

securityRouter.use(requireAdmin);

securityRouter.use((req, _res, next) => {
  if (req.sessionUser?.username) {
    logStaffSecurityTouch(req, req.sessionUser.username);
  }
  next();
});

securityRouter.get(
  "/perimeter",
  asyncRoute(async (req, res) => {
    res.json(await getPerimeterSnapshot(req));
  }),
);

securityRouter.get(
  "/dashboard",
  asyncRoute(async (req, res) => {
    res.json(await getSecurityDashboard(req));
  }),
);

securityRouter.get(
  "/dns",
  asyncRoute(async (req, res) => {
    const domain = typeof req.query.domain === "string" ? req.query.domain : "";
    const result = await lookupDns(domain);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  }),
);

securityRouter.get(
  "/ssl",
  asyncRoute(async (req, res) => {
    const host = typeof req.query.host === "string" ? req.query.host : "";
    const portRaw = typeof req.query.port === "string" ? Number(req.query.port) : 443;
    const port = Number.isInteger(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : 443;
    const result = await checkTls(host, port);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  }),
);

securityRouter.get(
  "/audit-snapshot",
  asyncRoute(async (req, res) => {
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
    const logs = listSecurityViewLogs({ page: 1, limit });
    res.json({
      rows: logs.rows,
      total: logs.total,
      generatedAt: new Date().toISOString(),
    });
  }),
);

securityRouter.get(
  "/export",
  asyncRoute(async (req, res) => {
    const report = await buildSecurityReport(req);
    res.json(report);
  }),
);

securityRouter.get(
  "/auto-audits/latest",
  asyncRoute(async (_req, res) => {
    const latest = getLatestAutoAudit();
    if (!latest) {
      res.json({ run: null, message: "No audit yet — first run starts ~45s after server boot." });
      return;
    }
    res.json({ run: latest });
  }),
);

securityRouter.get(
  "/auto-audits",
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
    res.json(listAutoAudits({ page, limit }));
  }),
);

securityRouter.post(
  "/auto-audits/run",
  asyncRoute(async (req, res) => {
    const run = await runAutoSecurityAudit(requestHostname(req));
    res.json({ run });
  }),
);

securityRouter.get(
  "/user-behavior",
  asyncRoute(async (_req, res) => {
    res.json(getUserBehaviorReport());
  }),
);

securityRouter.get(
  "/threats",
  asyncRoute(async (req, res) => {
    res.json(await getThreatDashboard(req));
  }),
);

securityRouter.get(
  "/behavior-alerts",
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    res.json(listBehaviorAlerts({ page, limit }));
  }),
);

securityRouter.get(
  "/events",
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    const category =
      req.query.category === "threat" || req.query.category === "behavior" || req.query.category === "visitor"
        ? req.query.category
        : undefined;
    res.json(listSecurityEvents({ category, page, limit }));
  }),
);

securityRouter.get(
  "/visitor-watch",
  asyncRoute(async (req, res) => {
    const unwantedOnly = req.query.unwanted === "1";
    res.json(listVisitorWatch({ unwantedOnly }));
  }),
);

const ipWatchSchema = z.object({
  ip: z.string().min(7).max(45),
  unwanted: z.boolean(),
  label: z.string().max(64).optional(),
  notes: z.string().max(500).optional(),
});

securityRouter.post(
  "/visitor-watch",
  asyncRoute(async (req, res) => {
    const parsed = ipWatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid IP watch payload." });
      return;
    }
    const row = setIpWatch(parsed.data);
    if (!row) {
      res.status(404).json({ error: "IP not seen yet — wait for a login from that IP." });
      return;
    }
    res.json(row);
  }),
);

securityRouter.get(
  "/endpoint-events",
  asyncRoute(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
    res.json(listEndpointEvents({ page, limit }));
  }),
);

const endpointEventSchema = z.object({
  agentId: z.string().min(1).max(64),
  eventType: z.string().min(1).max(64),
  deviceLabel: z.string().max(200).optional(),
  workstationId: z.string().max(128).optional(),
  meta: z.record(z.unknown()).optional(),
});

securityRouter.post(
  "/endpoint-event",
  asyncRoute(async (req, res) => {
    const parsed = endpointEventSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid endpoint event payload." });
      return;
    }
    if (!endpointAgentKeyValid(req) && req.sessionUser?.role !== "admin") {
      res.status(403).json({
        error: "Endpoint events require admin session or X-Endpoint-Agent-Key header.",
      });
      return;
    }
    const row = recordEndpointEvent({
      agentId: parsed.data.agentId,
      eventType: parsed.data.eventType,
      deviceLabel: parsed.data.deviceLabel ?? null,
      workstationId: parsed.data.workstationId ?? null,
      meta: parsed.data.meta,
    });
    res.status(201).json(row);
  }),
);
