/**
 * Security console — DNS, TLS, perimeter, and platform health snapshots.
 * No secrets in responses; hostnames sanitized against SSRF.
 */
import dns from "node:dns/promises";
import tls from "node:tls";
import type { Request } from "express";
import {
  checkAdminConsoleAccess,
  adminAllowlistFromSettings,
  staffAllowlistFromSettings,
  staffIpLockEnabled,
} from "./adminPerimeter";
import { getCommonSettingsBundle } from "./platformSettings";
import { getTenantStatus } from "./tenantStatus";
import { getVendorLicenseStatus } from "./vendorLicense";
import { listSecurityViewLogs } from "./securityViewLogs";
import { ollamaStatus } from "./ollama";
import { clientIp } from "./utils/clientIp";
import { isPublicSiteOffline } from "./publicSiteGate";
import { crmAdminBaseUrl, publicSiteBaseUrl } from "../shared/productHosts";
import { requestHostname } from "./requestHost";

const PUBLIC_IP_ENV = process.env.VPS_PUBLIC_IP?.trim() || process.env.SERVER_PUBLIC_IP?.trim() || "";

function isPrivateOrLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\./.test(h) || h === "0.0.0.0") return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

export function sanitizeHostname(raw: string): string | null {
  let input = raw.trim().toLowerCase();
  if (!input) return null;
  input = input.replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0] ?? "";
  if (!input || input.length > 253) return null;
  if (isPrivateOrLocalHost(input)) return null;
  const domainRe = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
  const ipv4Re = /^(?:\d{1,3}\.){3}\d{1,3}$/;
  if (domainRe.test(input) || ipv4Re.test(input)) return input;
  return null;
}

async function fetchVpsPublicIp(): Promise<string | null> {
  if (PUBLIC_IP_ENV) return PUBLIC_IP_ENV;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    return typeof data.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}

export type PerimeterSnapshot = {
  clientIp: string;
  forwardedFor: string | null;
  realIp: string | null;
  userAgent: string | null;
  vpsPublicIp: string | null;
  adminAllowlist: string[];
  staffAllowlist: string[];
  staffIpLock: boolean;
  adminAccess: { allowed: boolean; reason?: string };
  staffAccess: { allowed: boolean; reason?: string };
  envOverrides: { adminIpAllowlist: boolean; staffIpAllowlist: boolean };
};

export async function getPerimeterSnapshot(req: Request): Promise<PerimeterSnapshot> {
  const ip = clientIp(req);
  const settings = getCommonSettingsBundle();
  const adminList = adminAllowlistFromSettings(settings);
  const staffList = staffAllowlistFromSettings(settings);
  const staffLock = staffIpLockEnabled();

  const adminCheck = checkAdminConsoleAccess({ ip, role: "admin", isStaff: false });
  const staffCheck = checkAdminConsoleAccess({ ip, role: "user", isStaff: true });

  return {
    clientIp: ip,
    forwardedFor: typeof req.headers["x-forwarded-for"] === "string" ? req.headers["x-forwarded-for"] : null,
    realIp: typeof req.headers["x-real-ip"] === "string" ? req.headers["x-real-ip"] : null,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"].slice(0, 200) : null,
    vpsPublicIp: await fetchVpsPublicIp(),
    adminAllowlist: adminList,
    staffAllowlist: staffList,
    staffIpLock: staffLock,
    adminAccess: { allowed: adminCheck.allowed, reason: adminCheck.reason },
    staffAccess: { allowed: staffCheck.allowed, reason: staffCheck.reason },
    envOverrides: {
      adminIpAllowlist: Boolean(process.env.ADMIN_IP_ALLOWLIST?.trim()),
      staffIpAllowlist: Boolean(process.env.STAFF_IP_ALLOWLIST?.trim()),
    },
  };
}

export type DnsLookupResult =
  | { ok: true; domain: string; records: Record<string, string[]>; hints: string[]; queriedAt: string }
  | { ok: false; error: string };

export async function lookupDns(domainRaw: string): Promise<DnsLookupResult> {
  const domain = sanitizeHostname(domainRaw);
  if (!domain) return { ok: false, error: "Enter a valid public domain (e.g. admin.curionilabs.com)." };

  const records: Record<string, string[]> = {};
  const hints: string[] = [];
  const types: Array<{ key: string; fn: () => Promise<string[]> }> = [
    { key: "A", fn: () => dns.resolve4(domain).catch(() => []) },
    { key: "AAAA", fn: () => dns.resolve6(domain).catch(() => []) },
    { key: "CNAME", fn: () => dns.resolveCname(domain).catch(() => []) },
    { key: "MX", fn: async () => (await dns.resolveMx(domain).catch(() => [])).map((r) => `${r.priority} ${r.exchange}`) },
    { key: "TXT", fn: async () => (await dns.resolveTxt(domain).catch(() => [])).map((r) => r.join("")) },
    { key: "NS", fn: () => dns.resolveNs(domain).catch(() => []) },
  ];

  for (const t of types) {
    const vals = await t.fn();
    if (vals.length) records[t.key] = vals;
  }

  if (!Object.keys(records).length) {
    return { ok: false, error: `No DNS records found for ${domain}. Propagation may still be in progress.` };
  }

  if (records.A?.length && !records.AAAA?.length) {
    hints.push("IPv4 (A) resolves; no AAAA — IPv6 clients may use IPv4-only path.");
  }
  if (records.CNAME?.length && records.A?.length) {
    hints.push("Both CNAME and A present — some resolvers prefer one; verify apex vs www separately.");
  }
  if (!records.MX?.length) {
    hints.push("No MX records — fine for CRM hostnames; required only for mail on this domain.");
  }
  hints.push("DNS TTL changes can take up to 48h globally; compare from two networks if unsure.");

  return { ok: true, domain, records, hints, queriedAt: new Date().toISOString() };
}

export type TlsCheckResult =
  | {
      ok: true;
      host: string;
      valid: boolean;
      issuer: string | null;
      subject: string | null;
      validFrom: string | null;
      validTo: string | null;
      daysRemaining: number | null;
      altNames: string[];
      protocol: string | null;
    }
  | { ok: false; error: string };

function parseCertDate(d: unknown): string | null {
  if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
  if (typeof d === "string") {
    const dt = new Date(d);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }
  return null;
}

export function checkTls(hostRaw: string, port = 443): Promise<TlsCheckResult> {
  const host = sanitizeHostname(hostRaw);
  if (!host) return Promise.resolve({ ok: false, error: "Enter a valid public hostname." });

  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false, timeout: 8000 },
      () => {
        const cert = socket.getPeerCertificate();
        const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
        const daysRemaining =
          validTo && !Number.isNaN(validTo.getTime())
            ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000)
            : null;
        const altNames = Array.isArray(cert.subjectaltname)
          ? cert.subjectaltname.split(", ").map((s) => s.replace(/^DNS:/, ""))
          : cert.subjectaltname
            ? String(cert.subjectaltname)
                .split(", ")
                .map((s) => s.replace(/^DNS:/, ""))
            : [];

        resolve({
          ok: true,
          host,
          valid: socket.authorized,
          issuer: cert.issuer?.O ?? cert.issuer?.CN ?? null,
          subject: cert.subject?.CN ?? null,
          validFrom: parseCertDate(cert.valid_from),
          validTo: validTo?.toISOString() ?? null,
          daysRemaining,
          altNames: altNames.filter(Boolean).slice(0, 20),
          protocol: socket.getProtocol() ?? null,
        });
        socket.end();
      },
    );
    socket.on("error", (err) => {
      resolve({ ok: false, error: err.message.slice(0, 200) });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "TLS handshake timed out." });
    });
  });
}

export type SecurityDashboard = {
  generatedAt: string;
  health: { ok: boolean; service: string };
  ready: { ok: boolean; ollama: boolean; ollamaError?: string };
  vendorLicense: ReturnType<typeof getVendorLicenseStatus>;
  tenant: ReturnType<typeof getTenantStatus>;
  publicSiteOffline: boolean;
  maintenanceMessage: string | null;
  rateLimits: {
    apiPerMinute: number;
    loginPer15Min: number;
    note: string;
  };
  domains: {
    adminUrl: string | null;
    publicSiteUrl: string | null;
    adminHost: string | null;
    publicHost: string | null;
  };
  session: {
    staffIpLock: boolean;
    sessionTimeoutHours: string;
    loginAttemptLimit: string;
  };
};

export async function getSecurityDashboard(req: Request): Promise<SecurityDashboard> {
  const settings = getCommonSettingsBundle();
  const host = requestHostname(req);
  let ollama = { available: false as boolean, error: undefined as string | undefined };
  try {
    const st = await ollamaStatus();
    ollama = { available: st.available, error: st.error };
  } catch {
    ollama = { available: false, error: "status check failed" };
  }

  const adminUrl = crmAdminBaseUrl(host);
  const publicSiteUrl = publicSiteBaseUrl(host);
  let adminHost: string | null = null;
  let publicHost: string | null = null;
  try {
    adminHost = new URL(adminUrl).hostname;
  } catch {
    /* ignore */
  }
  try {
    publicHost = new URL(publicSiteUrl).hostname;
  } catch {
    /* ignore */
  }

  const isDev = process.env.NODE_ENV !== "production";

  return {
    generatedAt: new Date().toISOString(),
    health: { ok: true, service: "wallstreet-sim" },
    ready: { ok: true, ollama: ollama.available, ollamaError: ollama.error },
    vendorLicense: getVendorLicenseStatus(),
    tenant: getTenantStatus(),
    publicSiteOffline: isPublicSiteOffline(host),
    maintenanceMessage: null,
    rateLimits: {
      apiPerMinute: isDev ? 10_000 : 1_000,
      loginPer15Min: 30,
      note: "Global API limit per IP; login limiter on /api/auth/login.",
    },
    domains: { adminUrl, publicSiteUrl, adminHost, publicHost },
    session: {
      staffIpLock: settings["common.staff_ip_lock"] === "1",
      sessionTimeoutHours: settings["common.session_timeout_hours"],
      loginAttemptLimit: settings["common.login_attempt_limit"],
    },
  };
}

export async function buildSecurityReport(req: Request): Promise<Record<string, unknown>> {
  const dashboard = await getSecurityDashboard(req);
  const perimeter = await getPerimeterSnapshot(req);
  const adminHost = dashboard.domains.adminHost;
  const publicHost = dashboard.domains.publicHost;
  const tlsChecks: TlsCheckResult[] = [];
  if (adminHost) tlsChecks.push(await checkTls(adminHost));
  if (publicHost && publicHost !== adminHost) tlsChecks.push(await checkTls(publicHost));

  const dnsChecks: DnsLookupResult[] = [];
  if (adminHost) dnsChecks.push(await lookupDns(adminHost));
  if (publicHost && publicHost !== adminHost) dnsChecks.push(await lookupDns(publicHost));

  const audit = listSecurityViewLogs({ page: 1, limit: 25 });

  return {
    exportedAt: new Date().toISOString(),
    dashboard,
    perimeter,
    tls: tlsChecks,
    dns: dnsChecks,
    recentAudit: audit.rows,
    buildVersion: dashboard.vendorLicense.buildVersion,
  };
}
