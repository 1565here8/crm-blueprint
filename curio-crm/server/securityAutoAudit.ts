/**
 * Auto security audits — scheduled website + CRM probes and user behavior analysis.
 * Runs on a timer; stores results locally for the Security console.
 */
import type { Request } from "express";
import { getDb } from "./db";
import { buildAllForensics, type ForensicsSummary } from "./clientForensics";
import { listHistoryLogs } from "./historyLogs";
import { listSecurityViewLogs } from "./securityViewLogs";
import {
  checkTls,
  getPerimeterSnapshot,
  getSecurityDashboard,
  lookupDns,
  type TlsCheckResult,
} from "./securityOps";
import {
  CURIONILABS_CRM_ADMIN_URL,
  CURIONILABS_PUBLIC_URL,
  normalizeHostname,
} from "../shared/productHosts";
import { runSecurityRulesEngine, type ThreatSeverity } from "./securityIntelligence";

function defaultAuditHost(): string {
  const admin = process.env.ADMIN_URL?.trim() || CURIONILABS_CRM_ADMIN_URL;
  try {
    return normalizeHostname(new URL(admin).hostname);
  } catch {
    return "admin.curionilabs.com";
  }
}

function resolveAuditHost(reqHost?: string): string {
  const raw = reqHost ? normalizeHostname(reqHost) : defaultAuditHost();
  return raw || defaultAuditHost();
}

function localHealthUrl(): string {
  const port = Number(process.env.PORT ?? 3001);
  return `http://127.0.0.1:${port}/api/health`;
}

export type AutoAuditFinding = {
  id: string;
  category: "website" | "crm" | "staff" | "client" | "perimeter";
  severity: ThreatSeverity;
  title: string;
  detail: string;
  target?: string | null;
};

export type WebsiteProbe = {
  label: string;
  url: string;
  ok: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
};

export type UserBehaviorInsight = {
  userId: string;
  role: "staff" | "client";
  riskScore: number;
  flags: string[];
  summary: string;
  actionCount24h: number;
  distinctIps24h: number;
  lastSeen: string | null;
  meta?: Record<string, unknown>;
};

export type AutoAuditRun = {
  id: number;
  startedAt: string;
  finishedAt: string;
  status: "ok" | "warn" | "fail";
  overallScore: number;
  summary: string;
  websiteChecks: WebsiteProbe[];
  findings: AutoAuditFinding[];
  staffBehavior: UserBehaviorInsight[];
  clientBehavior: UserBehaviorInsight[];
  forensicsTotals: ForensicsSummary["totals"] | null;
  nextRunAt: string | null;
  intervalHours: number;
};

let schemaReady = false;
let auditRunning = false;
let nextRunAt: string | null = null;
let schedulerHandle: ReturnType<typeof setInterval> | null = null;

function auditIntervalMs(): number {
  const hours = Math.min(24, Math.max(1, Number(process.env.SECURITY_AUTO_AUDIT_HOURS) || 6));
  return hours * 3_600_000;
}

function auditIntervalHours(): number {
  return auditIntervalMs() / 3_600_000;
}

function ensureSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_security_auto_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ok','warn','fail')),
      overall_score INTEGER NOT NULL,
      summary TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auto_audit_finished ON crm_security_auto_audits(finished_at DESC);
  `);
  schemaReady = true;
}

async function probeUrl(label: string, url: string): Promise<WebsiteProbe> {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "User-Agent": "CurioCRM-SecurityAudit/1.0" },
    });
    clearTimeout(t);
    return {
      label,
      url,
      ok: res.status >= 200 && res.status < 400,
      statusCode: res.status,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      label,
      url,
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message.slice(0, 160) : "probe failed",
    };
  }
}

function analyzeStaffBehavior(): UserBehaviorInsight[] {
  const since24Ms = Date.now() - 24 * 3_600_000;
  const since7dMs = Date.now() - 7 * 86_400_000;
  const logs = listSecurityViewLogs({ page: 1, limit: 500 });
  const history = listHistoryLogs({ page: 1, limit: 300 });
  const recentLogs = logs.rows.filter((row) => new Date(row.dateCreated).getTime() >= since24Ms);
  const recentHistory = history.rows.filter((row) => new Date(row.created_at).getTime() >= since24Ms);

  const byAgent = new Map<
    string,
    { ips: Set<string>; actions: number; lastSeen: string; logins: number; sensitive: number }
  >();

  for (const row of recentLogs) {
    const cur = byAgent.get(row.agentId) ?? {
      ips: new Set<string>(),
      actions: 0,
      lastSeen: row.dateCreated,
      logins: 0,
      sensitive: 0,
    };
    cur.actions += 1;
    if (row.ip) cur.ips.add(row.ip);
    if (row.action === "login") cur.logins += 1;
    if (row.dateCreated > cur.lastSeen) cur.lastSeen = row.dateCreated;
    byAgent.set(row.agentId, cur);
  }

  const sensitiveRoutes = ["payment", "permission", "impersonat", "export", "configuration", "super_admin"];
  for (const h of recentHistory) {
    const agent = h.executed_by ?? "unknown";
    const route = (h.route_name ?? "").toLowerCase();
    const action = (h.action_type ?? "").toLowerCase();
    const hit = sensitiveRoutes.some((s) => route.includes(s) || action.includes(s));
    if (!hit) continue;
    const cur = byAgent.get(agent) ?? {
      ips: new Set<string>(),
      actions: 0,
      lastSeen: h.created_at,
      logins: 0,
      sensitive: 0,
    };
    cur.sensitive += 1;
    if (h.created_at > cur.lastSeen) cur.lastSeen = h.created_at;
    byAgent.set(agent, cur);
  }

  const historicalIps = new Map<string, Set<string>>();
  const histLogs = listSecurityViewLogs({ page: 1, limit: 800 });
  for (const row of histLogs.rows) {
    if (!row.ip || new Date(row.dateCreated).getTime() < since7dMs) continue;
    const set = historicalIps.get(row.agentId) ?? new Set<string>();
    set.add(row.ip);
    historicalIps.set(row.agentId, set);
  }

  const insights: UserBehaviorInsight[] = [];
  for (const [userId, stats] of byAgent) {
    const flags: string[] = [];
    let risk = 0;

    if (stats.ips.size >= 3) {
      flags.push("multi_ip_24h");
      risk += 25;
    }
    if (stats.actions >= 150) {
      flags.push("high_activity_24h");
      risk += Math.min(30, Math.floor(stats.actions / 20));
    }
    if (stats.sensitive >= 5) {
      flags.push("sensitive_route_burst");
      risk += 20;
    }
    if (stats.logins >= 8) {
      flags.push("login_churn");
      risk += 15;
    }

    const knownIps = historicalIps.get(userId) ?? new Set<string>();
    const newIps = [...stats.ips].filter((ip) => !knownIps.has(ip));
    if (newIps.length > 0 && stats.ips.size >= 2) {
      flags.push("new_ip_detected");
      risk += 15;
    }

    if (flags.length === 0) continue;

    const summary =
      flags.includes("multi_ip_24h")
        ? `${stats.ips.size} IPs in 24h — verify travel or phished session.`
        : flags.includes("sensitive_route_burst")
          ? `${stats.sensitive} sensitive CRM actions in 24h.`
          : flags.includes("high_activity_24h")
            ? `${stats.actions} admin actions in 24h — unusually high.`
            : "Unusual staff activity pattern detected.";

    insights.push({
      userId,
      role: "staff",
      riskScore: Math.min(100, risk),
      flags,
      summary,
      actionCount24h: stats.actions,
      distinctIps24h: stats.ips.size,
      lastSeen: stats.lastSeen,
      meta: newIps.length ? { newIps: newIps.slice(0, 5) } : undefined,
    });
  }

  return insights.sort((a, b) => b.riskScore - a.riskScore).slice(0, 30);
}

function analyzeClientBehavior(forensics: ForensicsSummary): UserBehaviorInsight[] {
  const insights: UserBehaviorInsight[] = [];
  const seen = new Set<string>();

  const pushClient = (r: (typeof forensics.highRisk)[0], flags: string[], risk: number, summary: string) => {
    if (seen.has(r.userId)) return;
    seen.add(r.userId);
    insights.push({
      userId: r.userId,
      role: "client",
      riskScore: Math.min(100, risk),
      flags,
      summary,
      actionCount24h: r.closedTrades + r.openTrades + r.pendingTrades,
      distinctIps24h: 0,
      lastSeen: null,
      meta: {
        displayId: r.displayId,
        name: r.name,
        tradingRisk: r.tradingRisk,
        badActor: r.badActor,
        kycQuality: r.kycQuality,
      },
    });
  };

  for (const r of forensics.badActors.slice(0, 15)) {
    pushClient(r, r.badActorFlags.length ? r.badActorFlags : ["bad_actor"], r.badActor, `Bad-actor score ${r.badActor}/100.`);
  }
  for (const r of forensics.highRisk.slice(0, 15)) {
    pushClient(
      r,
      r.tradingFlags.length ? r.tradingFlags : ["trading_risk"],
      r.tradingRisk,
      `Trading risk ${r.tradingRisk}/100 — ${r.tradingFlags[0] ?? "pattern flagged"}.`,
    );
  }
  for (const r of forensics.kycCritical.slice(0, 10)) {
    pushClient(
      r,
      r.kycFlags.length ? r.kycFlags : ["kyc_gap"],
      100 - r.kycQuality,
      `KYC quality ${r.kycQuality}/100 with deposits.`,
    );
  }

  return insights.sort((a, b) => b.riskScore - a.riskScore).slice(0, 25);
}

function scoreFromFindings(findings: AutoAuditFinding[], websiteChecks: WebsiteProbe[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "critical") score -= 20;
    else if (f.severity === "high") score -= 12;
    else if (f.severity === "medium") score -= 6;
    else score -= 2;
  }
  for (const w of websiteChecks) {
    if (!w.ok) score -= 10;
    else if (w.latencyMs != null && w.latencyMs > 4000) score -= 4;
  }
  return Math.max(0, Math.min(100, score));
}

function overallStatus(score: number, findings: AutoAuditFinding[]): AutoAuditRun["status"] {
  if (findings.some((f) => f.severity === "critical") || score < 50) return "fail";
  if (findings.some((f) => f.severity === "high") || score < 75) return "warn";
  return "ok";
}

function tlsFinding(host: string, tls: TlsCheckResult): AutoAuditFinding | null {
  if (!tls.ok) {
    return {
      id: `tls_fail:${host}`,
      category: "website",
      severity: "high",
      title: `TLS check failed — ${host}`,
      detail: tls.error ?? "Could not verify certificate.",
      target: host,
    };
  }
  if (tls.daysRemaining != null && tls.daysRemaining < 14) {
    return {
      id: `tls_expiry:${host}`,
      category: "website",
      severity: tls.daysRemaining < 7 ? "critical" : "high",
      title: `Certificate expiring — ${host}`,
      detail: `${tls.daysRemaining} days remaining.`,
      target: host,
    };
  }
  return null;
}

export async function runAutoSecurityAudit(reqHost?: string): Promise<AutoAuditRun> {
  if (auditRunning) {
    const latest = getLatestAutoAudit();
    if (latest) return latest;
  }
  auditRunning = true;
  ensureSchema();
  const startedAt = new Date().toISOString();
  const findings: AutoAuditFinding[] = [];
  const host = resolveAuditHost(reqHost);

  runSecurityRulesEngine();

  let dashboard;
  try {
    dashboard = await getSecurityDashboard({ headers: { host } } as Request);
  } catch {
    dashboard = await getSecurityDashboard({ headers: { host: defaultAuditHost() } } as Request);
  }

  const adminUrl =
    dashboard.domains.adminUrl ??
    process.env.ADMIN_URL?.trim() ??
    CURIONILABS_CRM_ADMIN_URL;
  const publicUrl =
    dashboard.domains.publicSiteUrl ??
    process.env.PUBLIC_SITE_URL?.trim() ??
    CURIONILABS_PUBLIC_URL;

  const websiteChecks: WebsiteProbe[] = [];
  websiteChecks.push(await probeUrl("CRM health (local)", localHealthUrl()));
  if (adminUrl) {
    websiteChecks.push(await probeUrl("CRM admin", `${adminUrl.replace(/\/$/, "")}/api/health`));
  }
  if (publicUrl) {
    websiteChecks.push(await probeUrl("Public site", publicUrl));
  }

  for (const check of websiteChecks) {
    if (check.ok) continue;
    findings.push({
      id: `site_down:${check.label}`,
      category: "website",
      severity: "critical",
      title: `${check.label} unreachable`,
      detail: check.error ?? `HTTP ${check.statusCode ?? "?"}`,
      target: check.url,
    });
  }

  let adminHost = dashboard.domains.adminHost;
  let publicHost = dashboard.domains.publicHost;
  if (adminHost) {
    const tls = await checkTls(adminHost);
    const f = tlsFinding(adminHost, tls);
    if (f) findings.push(f);
    const dns = await lookupDns(adminHost);
    if (!dns.ok) {
      findings.push({
        id: `dns_fail:${adminHost}`,
        category: "website",
        severity: "high",
        title: `DNS lookup failed — ${adminHost}`,
        detail: dns.error ?? "No records.",
        target: adminHost,
      });
    }
  }
  if (publicHost && publicHost !== adminHost) {
    const tls = await checkTls(publicHost);
    const f = tlsFinding(publicHost, tls);
    if (f) findings.push(f);
  }

  try {
    const perimeter = await getPerimeterSnapshot({ headers: { host } } as Request);
    if (perimeter.adminAllowlist.length === 0) {
      findings.push({
        id: "perimeter_open_admin",
        category: "perimeter",
        severity: "medium",
        title: "No admin IP allowlist",
        detail: "Owner login accepts any IP — configure allowlist for production desks.",
      });
    }
    if (perimeter.staffIpLock && !perimeter.staffAccess.allowed) {
      findings.push({
        id: "perimeter_staff_blocked",
        category: "perimeter",
        severity: "low",
        title: "Staff IP lock active",
        detail: "Current probe host may not reflect staff travel — review allowlist.",
      });
    }
  } catch {
    /* optional */
  }

  if (dashboard.publicSiteOffline) {
    findings.push({
      id: "public_site_offline_flag",
      category: "website",
      severity: "medium",
      title: "Public site marked offline",
      detail: "Maintenance or gate flag is set — verify intentional.",
    });
  }

  if (!dashboard.tenant.is_active) {
    findings.push({
      id: "tenant_paused",
      category: "crm",
      severity: "high",
      title: "Tenant paused",
      detail: dashboard.tenant.reason ?? "Platform tenant inactive.",
    });
  }

  const staffBehavior = analyzeStaffBehavior();
  for (const s of staffBehavior.filter((x) => x.riskScore >= 40)) {
    findings.push({
      id: `staff:${s.userId}:${s.flags[0]}`,
      category: "staff",
      severity: s.riskScore >= 70 ? "high" : "medium",
      title: `Staff behavior — ${s.userId}`,
      detail: s.summary,
      target: s.userId,
    });
  }

  let forensicsTotals: ForensicsSummary["totals"] | null = null;
  let clientBehavior: UserBehaviorInsight[] = [];
  try {
    const forensics = buildAllForensics();
    forensicsTotals = forensics.totals;
    clientBehavior = analyzeClientBehavior(forensics);
    if (forensics.totals.badActorCount >= 3) {
      findings.push({
        id: "client_bad_actors",
        category: "client",
        severity: "medium",
        title: "Multiple high bad-actor clients",
        detail: `${forensics.totals.badActorCount} clients flagged — review forensics.`,
      });
    }
  } catch {
    /* forensics optional on empty DB */
  }

  const overallScore = scoreFromFindings(findings, websiteChecks);
  const status = overallStatus(overallScore, findings);
  const finishedAt = new Date().toISOString();
  const summary =
    findings.length === 0
      ? "All automated checks passed — no critical findings."
      : `${findings.length} finding(s); score ${overallScore}/100.`;

  const run: AutoAuditRun = {
    id: 0,
    startedAt,
    finishedAt,
    status,
    overallScore,
    summary,
    websiteChecks,
    findings,
    staffBehavior,
    clientBehavior,
    forensicsTotals,
    nextRunAt,
    intervalHours: auditIntervalHours(),
  };

  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO crm_security_auto_audits
       (started_at, finished_at, status, overall_score, summary, payload_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(startedAt, finishedAt, status, overallScore, summary, JSON.stringify(run));
  run.id = Number(result.lastInsertRowid);

  const keep = 50;
  db.prepare(
    `DELETE FROM crm_security_auto_audits WHERE id NOT IN
     (SELECT id FROM crm_security_auto_audits ORDER BY id DESC LIMIT ?)`,
  ).run(keep);

  auditRunning = false;
  return run;
}

function mapRunRow(r: Record<string, unknown>): AutoAuditRun {
  const payload = JSON.parse(String(r.payload_json)) as AutoAuditRun;
  return {
    ...payload,
    id: Number(r.id),
    startedAt: String(r.started_at),
    finishedAt: String(r.finished_at),
    status: r.status as AutoAuditRun["status"],
    overallScore: Number(r.overall_score),
    summary: String(r.summary),
    nextRunAt,
    intervalHours: auditIntervalHours(),
  };
}

export function listAutoAudits(query?: { page?: number; limit?: number }): {
  rows: AutoAuditRun[];
  total: number;
} {
  ensureSchema();
  const db = getDb();
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(50, Math.max(5, query?.limit ?? 20));
  const offset = (page - 1) * limit;
  const total = (db.prepare("SELECT COUNT(*) AS c FROM crm_security_auto_audits").get() as { c: number }).c;
  const rows = db
    .prepare(
      `SELECT id, started_at, finished_at, status, overall_score, summary, payload_json
       FROM crm_security_auto_audits ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as Array<Record<string, unknown>>;
  return { rows: rows.map(mapRunRow), total };
}

export function getLatestAutoAudit(): AutoAuditRun | null {
  const { rows } = listAutoAudits({ page: 1, limit: 1 });
  return rows[0] ?? null;
}

export function getUserBehaviorReport(): {
  generatedAt: string;
  staff: UserBehaviorInsight[];
  clients: UserBehaviorInsight[];
} {
  ensureSchema();
  const latest = getLatestAutoAudit();
  if (latest) {
    return {
      generatedAt: latest.finishedAt,
      staff: latest.staffBehavior,
      clients: latest.clientBehavior,
    };
  }
  const staff = analyzeStaffBehavior();
  let clients: UserBehaviorInsight[] = [];
  try {
    clients = analyzeClientBehavior(buildAllForensics());
  } catch {
    /* empty DB */
  }
  return { generatedAt: new Date().toISOString(), staff, clients };
}

export function startAutoAuditScheduler(): void {
  if (schedulerHandle) return;
  const ms = auditIntervalMs();
  nextRunAt = new Date(Date.now() + 45_000).toISOString();

  setTimeout(() => {
    void runAutoSecurityAudit().then(() => {
      nextRunAt = new Date(Date.now() + ms).toISOString();
    });
  }, 45_000);

  schedulerHandle = setInterval(() => {
    nextRunAt = new Date(Date.now() + ms).toISOString();
    void runAutoSecurityAudit();
  }, ms);
}
