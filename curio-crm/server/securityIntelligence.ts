/**
 * Security intelligence — threat scoring, behavior rules, IP watch, endpoint events.
 * Web CRM honest limits: USB/physical events require CurioCRM Endpoint Agent POST.
 */
import type { Request } from "express";
import { getDb } from "./db";
import { getCommonSettingsBundle } from "./platformSettings";
import { listSecurityViewLogs } from "./securityViewLogs";
import { listHistoryLogs } from "./historyLogs";
import { getSecurityDashboard, checkTls, getPerimeterSnapshot } from "./securityOps";
import { clientIp } from "./utils/clientIp";

export type ThreatSeverity = "critical" | "high" | "medium" | "low";

export type SecurityEventRow = {
  id: number;
  category: "threat" | "behavior" | "visitor";
  severity: ThreatSeverity;
  ruleId: string;
  actor: string | null;
  action: string;
  reason: string;
  ip: string | null;
  userAgent: string | null;
  metaJson: string | null;
  fingerprintBrowser: string | null;
  fingerprintOs: string | null;
  createdAt: string;
  dedupeKey: string;
};

export type EndpointEventRow = {
  id: number;
  agentId: string;
  eventType: string;
  deviceLabel: string | null;
  workstationId: string | null;
  metaJson: string | null;
  createdAt: string;
};

export type IpWatchRow = {
  ip: string;
  unwanted: boolean;
  label: string | null;
  notes: string | null;
  visitCount: number;
  firstSeen: string;
  lastSeen: string;
  userAgentSample: string | null;
  browserClass: string | null;
  osClass: string | null;
  lastActor: string | null;
};

let schemaReady = false;

function ensureSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_security_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('threat','behavior','visitor')),
      severity TEXT NOT NULL CHECK(severity IN ('critical','high','medium','low')),
      rule_id TEXT NOT NULL,
      actor TEXT,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      meta_json TEXT,
      fingerprint_browser TEXT,
      fingerprint_os TEXT,
      created_at TEXT NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE
    );
    CREATE INDEX IF NOT EXISTS idx_sec_events_created ON crm_security_events(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sec_events_category ON crm_security_events(category);

    CREATE TABLE IF NOT EXISTS crm_endpoint_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      device_label TEXT,
      workstation_id TEXT,
      meta_json TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_endpoint_created ON crm_endpoint_events(created_at DESC);

    CREATE TABLE IF NOT EXISTS crm_security_ip_watch (
      ip TEXT PRIMARY KEY,
      unwanted INTEGER NOT NULL DEFAULT 0,
      label TEXT,
      notes TEXT,
      visit_count INTEGER NOT NULL DEFAULT 0,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      user_agent_sample TEXT,
      browser_class TEXT,
      os_class TEXT,
      last_actor TEXT
    );

    CREATE TABLE IF NOT EXISTS crm_security_login_fail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      username_attempt TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_fail_ip ON crm_security_login_fail(ip, created_at DESC);
  `);
  schemaReady = true;
}

export function parseUserAgentFingerprint(ua: string | null | undefined): {
  browserClass: string;
  osClass: string;
} {
  const s = (ua ?? "").slice(0, 400);
  if (!s) return { browserClass: "Unknown", osClass: "Unknown" };
  let browserClass = "Other browser";
  if (/Edg\//i.test(s)) browserClass = "Edge";
  else if (/Chrome\//i.test(s) && !/Edg/i.test(s)) browserClass = "Chrome";
  else if (/Firefox\//i.test(s)) browserClass = "Firefox";
  else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) browserClass = "Safari";
  else if (/curl|wget|python-requests/i.test(s)) browserClass = "Script/bot";

  let osClass = "Other OS";
  if (/Windows NT 10/i.test(s)) osClass = "Windows 10/11";
  else if (/Windows/i.test(s)) osClass = "Windows";
  else if (/Mac OS X|Macintosh/i.test(s)) osClass = "macOS";
  else if (/Android/i.test(s)) osClass = "Android";
  else if (/iPhone|iPad/i.test(s)) osClass = "iOS";
  else if (/Linux/i.test(s)) osClass = "Linux";

  return { browserClass, osClass };
}

export function logFailedLoginAttempt(ip: string, usernameAttempt?: string): void {
  ensureSchema();
  const db = getDb();
  const created_at = new Date().toISOString();
  db.prepare(
    "INSERT INTO crm_security_login_fail (ip, username_attempt, created_at) VALUES (?, ?, ?)",
  ).run(ip, usernameAttempt?.slice(0, 128) ?? null, created_at);
  pruneOldLoginFails();
}

function pruneOldLoginFails(): void {
  const db = getDb();
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  db.prepare("DELETE FROM crm_security_login_fail WHERE created_at < ?").run(cutoff);
}

export function logPermissionDenied(opts: {
  actor: string;
  permission: string;
  route: string;
  ip?: string | null;
}): void {
  upsertSecurityEvent({
    category: "behavior",
    severity: "medium",
    ruleId: "permission_denied",
    actor: opts.actor,
    action: opts.route,
    reason: `Staff attempted ${opts.permission} without permission.`,
    ip: opts.ip ?? null,
    dedupeKey: `perm:${opts.actor}:${opts.permission}:${new Date().toISOString().slice(0, 13)}`,
  });
}

function upsertSecurityEvent(opts: {
  category: SecurityEventRow["category"];
  severity: ThreatSeverity;
  ruleId: string;
  actor: string | null;
  action: string;
  reason: string;
  ip: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
  dedupeKey: string;
  fingerprintBrowser?: string | null;
  fingerprintOs?: string | null;
}): void {
  ensureSchema();
  const db = getDb();
  const fp = parseUserAgentFingerprint(opts.userAgent ?? undefined);
  const created_at = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO crm_security_events
       (category, severity, rule_id, actor, action, reason, ip, user_agent, meta_json,
        fingerprint_browser, fingerprint_os, created_at, dedupe_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      opts.category,
      opts.severity,
      opts.ruleId,
      opts.actor,
      opts.action,
      opts.reason,
      opts.ip,
      opts.userAgent ?? null,
      opts.meta ? JSON.stringify(opts.meta) : null,
      opts.fingerprintBrowser ?? fp.browserClass,
      opts.fingerprintOs ?? fp.osClass,
      created_at,
      opts.dedupeKey,
    );
  } catch {
    /* duplicate dedupe_key — same alert window */
  }
}

function offHoursConfig(): { enabled: boolean; startHour: number; endHour: number } {
  const s = getCommonSettingsBundle();
  const enabled = s["security.off_hours_enabled"] === "1";
  const startHour = Math.min(23, Math.max(0, Number(s["security.off_hours_start"] ?? "22") || 22));
  const endHour = Math.min(23, Math.max(0, Number(s["security.off_hours_end"] ?? "6") || 6));
  return { enabled, startHour, endHour };
}

function isOffHours(date: Date, cfg: ReturnType<typeof offHoursConfig>): boolean {
  if (!cfg.enabled) return false;
  const h = date.getUTCHours();
  if (cfg.startHour < cfg.endHour) {
    return h >= cfg.startHour && h < cfg.endHour;
  }
  return h >= cfg.startHour || h < cfg.endHour;
}

export function touchIpVisitor(opts: {
  ip: string;
  actor?: string | null;
  userAgent?: string | null;
}): void {
  ensureSchema();
  const db = getDb();
  const fp = parseUserAgentFingerprint(opts.userAgent);
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT ip FROM crm_security_ip_watch WHERE ip = ?").get(opts.ip) as
    | { ip: string }
    | undefined;
  if (existing) {
    db.prepare(
      `UPDATE crm_security_ip_watch SET visit_count = visit_count + 1, last_seen = ?,
       last_actor = COALESCE(?, last_actor), user_agent_sample = COALESCE(?, user_agent_sample),
       browser_class = ?, os_class = ?
       WHERE ip = ?`,
    ).run(now, opts.actor ?? null, opts.userAgent?.slice(0, 300) ?? null, fp.browserClass, fp.osClass, opts.ip);
  } else {
    db.prepare(
      `INSERT INTO crm_security_ip_watch
       (ip, unwanted, visit_count, first_seen, last_seen, user_agent_sample, browser_class, os_class, last_actor)
       VALUES (?, 0, 1, ?, ?, ?, ?, ?, ?)`,
    ).run(
      opts.ip,
      now,
      now,
      opts.userAgent?.slice(0, 300) ?? null,
      fp.browserClass,
      fp.osClass,
      opts.actor ?? null,
    );
  }
}

function syncIpVisitorsFromLogs(): void {
  const logs = listSecurityViewLogs({ page: 1, limit: 200 });
  for (const row of logs.rows) {
    if (!row.ip) continue;
    touchIpVisitor({ ip: row.ip, actor: row.agentId, userAgent: null });
  }
}

export function runSecurityRulesEngine(): void {
  ensureSchema();
  const db = getDb();
  syncIpVisitorsFromLogs();

  const window15 = new Date(Date.now() - 15 * 60_000).toISOString();
  const failRows = db
    .prepare(
      `SELECT ip, COUNT(*) AS c FROM crm_security_login_fail
       WHERE created_at >= ? GROUP BY ip HAVING c >= 5`,
    )
    .all(window15) as Array<{ ip: string; c: number }>;
  for (const row of failRows) {
    upsertSecurityEvent({
      category: "threat",
      severity: "high",
      ruleId: "failed_login_spike",
      actor: null,
      action: "login_failures",
      reason: `${row.c} failed login attempts from this IP in 15 minutes.`,
      ip: row.ip,
      dedupeKey: `fail_spike:${row.ip}:${new Date().toISOString().slice(0, 13)}`,
    });
  }

  const offCfg = offHoursConfig();
  if (offCfg.enabled) {
    const recent = listSecurityViewLogs({ page: 1, limit: 100 });
    for (const row of recent.rows) {
      if (row.action !== "login" && row.action !== "login_ip_blocked") continue;
      const t = new Date(row.dateCreated);
      if (!isOffHours(t, offCfg)) continue;
      upsertSecurityEvent({
        category: "behavior",
        severity: "medium",
        ruleId: "off_hours_login",
        actor: row.agentId,
        action: row.action,
        reason: `Staff login outside configured UTC quiet hours (${offCfg.startHour}:00–${offCfg.endHour}:00).`,
        ip: row.ip,
        dedupeKey: `offhrs:${row.agentId}:${row.dateCreated.slice(0, 16)}`,
      });
    }
  }

  const viewLogs = listSecurityViewLogs({ page: 1, limit: 150 });
  for (const row of viewLogs.rows) {
    if (row.action === "login_ip_blocked" || row.action === "admin_ip_blocked") {
      upsertSecurityEvent({
        category: "threat",
        severity: "high",
        ruleId: "ip_blocked_login",
        actor: row.agentId,
        action: row.action,
        reason: "Login or admin session blocked by IP allowlist — possible phishy access or travel.",
        ip: row.ip,
        dedupeKey: `ipblk:${row.id}`,
      });
    }
  }

  const history = listHistoryLogs({ page: 1, limit: 100 });
  const sensitiveRoutes = [
    "payment-gateway",
    "payment_gateways",
    "permissions",
    "impersonat",
    "configuration",
    "team-permissions",
    "export",
  ];
  const sensitiveActions = ["impersonate", "export", "super_admin"];
  for (const h of history.rows) {
    const route = (h.route_name ?? "").toLowerCase();
    const action = (h.action_type ?? "").toLowerCase();
    const by = h.executed_by ?? "unknown";
    const hit =
      sensitiveRoutes.some((s) => route.includes(s)) ||
      sensitiveActions.some((s) => action.includes(s));
    if (!hit) continue;
    const isStaff = by !== "admin" && !by.startsWith("owner");
    upsertSecurityEvent({
      category: "behavior",
      severity: route.includes("payment") || action.includes("impersonat") ? "critical" : "high",
      ruleId: "sensitive_admin_action",
      actor: by,
      action: `${h.action_type}${h.route_name ? ` @ ${h.route_name}` : ""}`,
      reason: isStaff
        ? "Non-owner staff touched payment, permissions, impersonation, or owner configuration."
        : "Sensitive platform change — verify with broker.",
      ip: null,
      meta: { actionedOn: h.actioned_on, route: h.route_name },
      dedupeKey: `hist:${h.id}`,
    });
  }

  const unwanted = db
    .prepare("SELECT ip, visit_count, last_actor FROM crm_security_ip_watch WHERE unwanted = 1")
    .all() as Array<{ ip: string; visit_count: number; last_actor: string | null }>;
  for (const u of unwanted) {
    upsertSecurityEvent({
      category: "visitor",
      severity: "high",
      ruleId: "unwanted_ip_seen",
      actor: u.last_actor,
      action: "visitor_watch",
      reason: `Marked unwanted IP returned (${u.visit_count} visits).`,
      ip: u.ip,
      dedupeKey: `unwanted:${u.ip}:${new Date().toISOString().slice(0, 10)}`,
    });
  }
}

export type ThreatDashboard = {
  generatedAt: string;
  safetyScore: number;
  scoreBreakdown: Array<{ label: string; points: number; max: number; note: string }>;
  activeThreats: SecurityEventRow[];
  threatCounts: Record<ThreatSeverity, number>;
  offHours: ReturnType<typeof offHoursConfig>;
  endpointAgentRequired: boolean;
};

export async function getThreatDashboard(req: Request): Promise<ThreatDashboard> {
  runSecurityRulesEngine();
  const dashboard = await getSecurityDashboard(req);
  const perimeter = await getPerimeterSnapshot(req);
  const breakdown: ThreatDashboard["scoreBreakdown"] = [];
  let score = 100;

  const perimeterPts = perimeter.adminAllowlist.length > 0 ? 20 : 10;
  breakdown.push({
    label: "Perimeter",
    points: perimeterPts,
    max: 20,
    note: perimeter.adminAllowlist.length ? "Admin IP allowlist configured" : "No admin allowlist — open owner login",
  });
  score -= 20 - perimeterPts;

  let sslPts = 15;
  const host = dashboard.domains.adminHost;
  if (host) {
    const tls = await checkTls(host);
    if (tls.ok && tls.daysRemaining != null) {
      if (tls.daysRemaining < 7) sslPts = 0;
      else if (tls.daysRemaining < 30) sslPts = 8;
      breakdown.push({
        label: "SSL/TLS",
        points: sslPts,
        max: 15,
        note: `${tls.daysRemaining ?? "?"} days remaining on ${host}`,
      });
    } else {
      sslPts = 5;
      breakdown.push({ label: "SSL/TLS", points: sslPts, max: 15, note: "Could not verify certificate" });
    }
  } else {
    breakdown.push({ label: "SSL/TLS", points: 10, max: 15, note: "ADMIN_URL host not set" });
    sslPts = 10;
  }
  score -= 15 - sslPts;

  const licenseOk =
    dashboard.vendorLicense.mode === "ok" ||
    dashboard.vendorLicense.mode === "off" ||
    dashboard.vendorLicense.mode === "grace";
  const licPts = licenseOk ? 20 : 0;
  breakdown.push({
    label: "License",
    points: licPts,
    max: 20,
    note: dashboard.vendorLicense.reason ?? dashboard.vendorLicense.mode ?? "vendor",
  });
  if (!licenseOk) score -= 20;

  const tenantPts = dashboard.tenant.is_active ? 15 : 0;
  breakdown.push({
    label: "Tenant",
    points: tenantPts,
    max: 15,
    note: dashboard.tenant.reason ?? (dashboard.tenant.is_active ? "Active" : "Paused"),
  });
  if (!tenantPts) score -= 15;

  ensureSchema();
  const db = getDb();
  const failRecent = (
    db.prepare("SELECT COUNT(*) AS c FROM crm_security_login_fail WHERE created_at >= ?").get(
      new Date(Date.now() - 24 * 86_400_000).toISOString(),
    ) as { c: number }
  ).c;
  const failPenalty = Math.min(15, failRecent * 2);
  breakdown.push({
    label: "Failed logins (24h)",
    points: Math.max(0, 15 - failPenalty),
    max: 15,
    note: `${failRecent} failed attempts`,
  });
  score -= failPenalty;

  const events = listSecurityEvents({ category: "threat", limit: 50 });
  const suspPenalty = Math.min(15, events.rows.length * 3);
  breakdown.push({
    label: "Active threats",
    points: Math.max(0, 15 - suspPenalty),
    max: 15,
    note: `${events.rows.length} open threat events`,
  });
  score -= suspPenalty;

  const activeThreats = listSecurityEvents({ limit: 30 }).rows;
  const threatCounts: Record<ThreatSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const e of activeThreats) threatCounts[e.severity]++;

  return {
    generatedAt: new Date().toISOString(),
    safetyScore: Math.max(0, Math.min(100, Math.round(score))),
    scoreBreakdown: breakdown,
    activeThreats,
    threatCounts,
    offHours: offHoursConfig(),
    endpointAgentRequired: true,
  };
}

function mapEventRow(r: Record<string, unknown>): SecurityEventRow {
  return {
    id: Number(r.id),
    category: r.category as SecurityEventRow["category"],
    severity: r.severity as ThreatSeverity,
    ruleId: String(r.rule_id),
    actor: r.actor != null ? String(r.actor) : null,
    action: String(r.action),
    reason: String(r.reason),
    ip: r.ip != null ? String(r.ip) : null,
    userAgent: r.user_agent != null ? String(r.user_agent) : null,
    metaJson: r.meta_json != null ? String(r.meta_json) : null,
    fingerprintBrowser: r.fingerprint_browser != null ? String(r.fingerprint_browser) : null,
    fingerprintOs: r.fingerprint_os != null ? String(r.fingerprint_os) : null,
    createdAt: String(r.created_at),
    dedupeKey: String(r.dedupe_key),
  };
}

export function listSecurityEvents(query?: {
  category?: SecurityEventRow["category"];
  page?: number;
  limit?: number;
}): { rows: SecurityEventRow[]; total: number } {
  ensureSchema();
  const db = getDb();
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(200, Math.max(1, query?.limit ?? 50));
  const offset = (page - 1) * limit;
  const where: string[] = [];
  const params: unknown[] = [];
  if (query?.category) {
    where.push("category = ?");
    params.push(query.category);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_security_events ${clause}`).get(...params) as { c: number })
    .c;
  const rows = db
    .prepare(
      `SELECT id, category, severity, rule_id, actor, action, reason, ip, user_agent, meta_json,
              fingerprint_browser, fingerprint_os, created_at, dedupe_key
       FROM crm_security_events ${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Record<string, unknown>[];
  return { rows: rows.map(mapEventRow), total };
}

export function listBehaviorAlerts(query?: { page?: number; limit?: number }) {
  return listSecurityEvents({ category: "behavior", page: query?.page, limit: query?.limit });
}

export function listVisitorWatch(query?: { unwantedOnly?: boolean }): { rows: IpWatchRow[] } {
  ensureSchema();
  const db = getDb();
  syncIpVisitorsFromLogs();
  const clause = query?.unwantedOnly ? "WHERE unwanted = 1" : "";
  const rows = db
    .prepare(
      `SELECT ip, unwanted, label, notes, visit_count, first_seen, last_seen,
              user_agent_sample, browser_class, os_class, last_actor
       FROM crm_security_ip_watch ${clause} ORDER BY last_seen DESC LIMIT 200`,
    )
    .all() as Array<Record<string, unknown>>;
  return {
    rows: rows.map((r) => ({
      ip: String(r.ip),
      unwanted: Boolean(r.unwanted),
      label: r.label != null ? String(r.label) : null,
      notes: r.notes != null ? String(r.notes) : null,
      visitCount: Number(r.visit_count),
      firstSeen: String(r.first_seen),
      lastSeen: String(r.last_seen),
      userAgentSample: r.user_agent_sample != null ? String(r.user_agent_sample) : null,
      browserClass: r.browser_class != null ? String(r.browser_class) : null,
      osClass: r.os_class != null ? String(r.os_class) : null,
      lastActor: r.last_actor != null ? String(r.last_actor) : null,
    })),
  };
}

export function setIpWatch(opts: {
  ip: string;
  unwanted: boolean;
  label?: string | null;
  notes?: string | null;
}): IpWatchRow | null {
  ensureSchema();
  const db = getDb();
  touchIpVisitor({ ip: opts.ip });
  db.prepare(
    `UPDATE crm_security_ip_watch SET unwanted = ?, label = COALESCE(?, label), notes = COALESCE(?, notes) WHERE ip = ?`,
  ).run(opts.unwanted ? 1 : 0, opts.label ?? null, opts.notes ?? null, opts.ip);
  const row = listVisitorWatch().rows.find((r) => r.ip === opts.ip);
  return row ?? null;
}

export function recordEndpointEvent(opts: {
  agentId: string;
  eventType: string;
  deviceLabel?: string | null;
  workstationId?: string | null;
  meta?: Record<string, unknown>;
}): EndpointEventRow {
  ensureSchema();
  const db = getDb();
  const created_at = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO crm_endpoint_events (agent_id, event_type, device_label, workstation_id, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      opts.agentId.slice(0, 64),
      opts.eventType.slice(0, 64),
      opts.deviceLabel?.slice(0, 200) ?? null,
      opts.workstationId?.slice(0, 128) ?? null,
      opts.meta ? JSON.stringify(opts.meta) : null,
      created_at,
    );
  if (opts.eventType.includes("usb")) {
    upsertSecurityEvent({
      category: "threat",
      severity: "medium",
      ruleId: "endpoint_usb",
      actor: opts.agentId,
      action: opts.eventType,
      reason: `Endpoint agent reported ${opts.eventType}${opts.deviceLabel ? `: ${opts.deviceLabel}` : ""}.`,
      ip: null,
      meta: { workstationId: opts.workstationId },
      dedupeKey: `usb:${opts.agentId}:${created_at.slice(0, 19)}`,
    });
  }
  return {
    id: Number(result.lastInsertRowid),
    agentId: opts.agentId,
    eventType: opts.eventType,
    deviceLabel: opts.deviceLabel ?? null,
    workstationId: opts.workstationId ?? null,
    metaJson: opts.meta ? JSON.stringify(opts.meta) : null,
    createdAt: created_at,
  };
}

export function listEndpointEvents(query?: { page?: number; limit?: number }): {
  rows: EndpointEventRow[];
  total: number;
} {
  ensureSchema();
  const db = getDb();
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(100, Math.max(1, query?.limit ?? 50));
  const offset = (page - 1) * limit;
  const total = (db.prepare("SELECT COUNT(*) AS c FROM crm_endpoint_events").get() as { c: number }).c;
  const rows = db
    .prepare(
      `SELECT id, agent_id AS agentId, event_type AS eventType, device_label AS deviceLabel,
              workstation_id AS workstationId, meta_json AS metaJson, created_at AS createdAt
       FROM crm_endpoint_events ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as EndpointEventRow[];
  return { rows, total };
}

export function endpointAgentKeyValid(req: Request): boolean {
  const expected = process.env.ENDPOINT_AGENT_KEY?.trim();
  if (!expected) return false;
  const got = req.headers["x-endpoint-agent-key"];
  return typeof got === "string" && got === expected;
}

export function logStaffSecurityTouch(req: Request, actor: string): void {
  const ip = clientIp(req);
  const ua = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;
  touchIpVisitor({ ip, actor, userAgent: ua });
}
