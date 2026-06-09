/**
 * Admin perimeter — restrict staff console to approved office IPs.
 * Broker data stays on their VPS; this only gates who may open /admin.
 */
import type { NextFunction, Request, Response } from "express";
import { getCommonSettingsBundle } from "./platformSettings";
import { logSecurityViewEvent } from "./securityViewLogs";
import { clientIp } from "./utils/clientIp";

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) + v;
  }
  return n >>> 0;
}

function ipMatchesRule(ip: string, rule: string): boolean {
  const trimmed = rule.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") return true;
  if (trimmed === ip) return true;

  const [base, bitsRaw] = trimmed.split("/");
  if (bitsRaw !== undefined) {
    const bits = Number(bitsRaw);
    const ipInt = ipv4ToInt(ip);
    const baseInt = ipv4ToInt(base);
    if (ipInt === null || baseInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
      return false;
    }
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
  }
  return false;
}

export function ipAllowed(ip: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  return allowlist.some((rule) => ipMatchesRule(ip, rule));
}

export function adminAllowlistFromSettings(settings?: Record<string, string>): string[] {
  const env = parseAllowlist(process.env.ADMIN_IP_ALLOWLIST);
  if (env.length > 0) return env;
  const s = settings ?? getCommonSettingsBundle();
  return parseAllowlist(s["common.admin_ip_allowlist"]);
}

export function staffAllowlistFromSettings(settings?: Record<string, string>): string[] {
  const env = parseAllowlist(process.env.STAFF_IP_ALLOWLIST);
  if (env.length > 0) return env;
  const s = settings ?? getCommonSettingsBundle();
  return parseAllowlist(s["common.staff_ip_allowlist"]);
}

function adminAllowlist(): string[] {
  return adminAllowlistFromSettings();
}

function staffAllowlist(): string[] {
  return staffAllowlistFromSettings();
}

export function staffIpLockEnabled(): boolean {
  return getCommonSettingsBundle()["common.staff_ip_lock"] === "1";
}

export type AdminAccessCheck = {
  allowed: boolean;
  reason?: string;
};

export function checkAdminConsoleAccess(args: {
  ip: string;
  role: "admin" | "user";
  isStaff: boolean;
}): AdminAccessCheck {
  if (args.role === "admin") {
    const list = adminAllowlist();
    if (list.length > 0 && !ipAllowed(args.ip, list)) {
      return { allowed: false, reason: "Admin console blocked from this IP address." };
    }
    return { allowed: true };
  }

  if (args.isStaff && staffIpLockEnabled()) {
    const list = staffAllowlist();
    if (list.length > 0 && !ipAllowed(args.ip, list)) {
      return { allowed: false, reason: "Staff login blocked — IP not on the desk allowlist." };
    }
  }

  return { allowed: true };
}

export function requireAdminPerimeter(req: Request, res: Response, next: NextFunction): void {
  const session = req.sessionUser;
  if (!session || session.role !== "admin") {
    next();
    return;
  }
  const ip = clientIp(req);
  const check = checkAdminConsoleAccess({ ip, role: "admin", isStaff: false });
  if (!check.allowed) {
    logSecurityViewEvent({
      agentId: session.username,
      action: "admin_ip_blocked",
      ip,
    });
    res.status(403).json({ error: check.reason ?? "Admin access blocked from this network." });
    return;
  }
  next();
}
