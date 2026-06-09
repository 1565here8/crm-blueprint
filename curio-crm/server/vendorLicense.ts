import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { setTenantActive, getTenantStatus } from "./tenantStatus";
import { getPlatformSettings, setPlatformSettings } from "./platformSettings";
import { log } from "./log";

const SETTINGS_KEYS = [
  "vendor.license_ok",
  "vendor.license_reason",
  "vendor.license_last_ok_at",
  "vendor.license_last_check_at",
  "vendor.license_mode",
] as const;

export type VendorLicenseMode = "off" | "ok" | "grace" | "revoked" | "offline";

export type VendorLicenseStatus = {
  configured: boolean;
  mode: VendorLicenseMode;
  reason: string | null;
  lastOkAt: string | null;
  lastCheckAt: string | null;
  tenantActive: boolean;
  heartbeatUrl: string | null;
  tenantId: string | null;
  buildVersion: string;
  graceHours: number;
};

function readSettings(): Record<string, string> {
  return getPlatformSettings([...SETTINGS_KEYS]);
}

function writeSettings(patch: Record<string, string>): void {
  setPlatformSettings(patch);
}

export function vendorLicenseConfigured(): boolean {
  const url = process.env.VENDOR_LICENSE_URL?.trim();
  const key = process.env.VENDOR_LICENSE_KEY?.trim();
  const tenant = process.env.VENDOR_TENANT_ID?.trim();
  if (process.env.VENDOR_LICENSE_ENABLED === "0") return false;
  return Boolean(url && key && tenant);
}

export function crmBuildVersion(): string {
  return process.env.CRM_BUILD_VERSION?.trim() || process.env.npm_package_version || "0.1.0";
}

function graceMs(): number {
  const hours = Number(process.env.VENDOR_LICENSE_GRACE_HOURS ?? 72);
  return Math.max(1, hours) * 60 * 60 * 1000;
}

function heartbeatIntervalMs(): number {
  const min = Number(process.env.VENDOR_HEARTBEAT_INTERVAL_MIN ?? 60);
  return Math.max(15, min) * 60 * 1000;
}

function publicDomain(): string {
  const adminUrl = process.env.ADMIN_URL?.trim();
  if (adminUrl) {
    try {
      return new URL(adminUrl).hostname;
    } catch {
      /* fall through */
    }
  }
  return "unknown";
}

function signPayload(args: {
  tenantId: string;
  licenseKey: string;
  domain: string;
  buildVersion: string;
  timestamp: number;
}): string {
  const base = `${args.tenantId}:${args.licenseKey}:${args.domain}:${args.buildVersion}:${args.timestamp}`;
  return crypto.createHmac("sha256", args.licenseKey).update(base).digest("hex");
}

export function getVendorLicenseStatus(): VendorLicenseStatus {
  const s = readSettings();
  const tenant = getTenantStatus();
  return {
    configured: vendorLicenseConfigured(),
    mode: (s["vendor.license_mode"] as VendorLicenseMode) || (vendorLicenseConfigured() ? "grace" : "off"),
    reason: s["vendor.license_reason"] || null,
    lastOkAt: s["vendor.license_last_ok_at"] || null,
    lastCheckAt: s["vendor.license_last_check_at"] || null,
    tenantActive: tenant.is_active,
    heartbeatUrl: process.env.VENDOR_LICENSE_URL?.trim() || null,
    tenantId: process.env.VENDOR_TENANT_ID?.trim() || null,
    buildVersion: crmBuildVersion(),
    graceHours: Number(process.env.VENDOR_LICENSE_GRACE_HOURS ?? 72),
  };
}

export function isVendorLicenseBlocking(): { blocked: boolean; reason?: string } {
  if (!vendorLicenseConfigured()) return { blocked: false };
  const s = readSettings();
  const mode = (s["vendor.license_mode"] as VendorLicenseMode) || "grace";
  if (mode === "ok" || mode === "grace") return { blocked: false };
  return {
    blocked: true,
    reason:
      s["vendor.license_reason"] ||
      (mode === "revoked"
        ? "Hosting agreement paused by Curioni Labs."
        : "Cannot reach Curioni Labs license service — grace period expired."),
  };
}

export function requireVendorLicense(req: Request, res: Response, next: NextFunction): void {
  const vendor = isVendorLicenseBlocking();
  if (vendor.blocked) {
    res.status(402).json({
      error: "Curioni Labs hosting license inactive.",
      reason: vendor.reason ?? "License check failed.",
      code: "vendor_license",
    });
    return;
  }
  next();
}

async function postHeartbeat(): Promise<void> {
  if (!vendorLicenseConfigured()) return;

  const url = process.env.VENDOR_LICENSE_URL!.trim();
  const licenseKey = process.env.VENDOR_LICENSE_KEY!.trim();
  const tenantId = process.env.VENDOR_TENANT_ID!.trim();
  const domain = publicDomain();
  const buildVersion = crmBuildVersion();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload({ tenantId, licenseKey, domain, buildVersion, timestamp });
  const now = new Date().toISOString();

  writeSettings({
    "vendor.license_last_check_at": now,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Crm-License-Key": licenseKey,
      },
      body: JSON.stringify({
        tenantId,
        domain,
        buildVersion,
        timestamp,
        signature,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const body = (await res.json().catch(() => ({}))) as {
      active?: boolean;
      reason?: string;
      minBuildVersion?: string;
    };

    if (!res.ok) {
      throw new Error(body.reason || `License check HTTP ${res.status}`);
    }

    if (body.active === false) {
      writeSettings({
        "vendor.license_ok": "0",
        "vendor.license_mode": "revoked",
        "vendor.license_reason": body.reason || "License revoked by Curioni Labs.",
        "vendor.license_last_check_at": now,
      });
      setTenantActive({
        isActive: false,
        reason: body.reason || "Curioni Labs license revoked.",
        actor: "vendor-license",
      });
      log("[vendor-license] revoked by control plane");
      return;
    }

    writeSettings({
      "vendor.license_ok": "1",
      "vendor.license_mode": "ok",
      "vendor.license_reason": "",
      "vendor.license_last_ok_at": now,
      "vendor.license_last_check_at": now,
    });

    const tenant = getTenantStatus();
    if (!tenant.is_active && tenant.updated_by === "vendor-license") {
      setTenantActive({
        isActive: true,
        reason: "License restored by Curioni Labs.",
        actor: "vendor-license",
      });
    }
  } catch (err) {
    const s = readSettings();
    const lastOk = s["vendor.license_last_ok_at"];
    const withinGrace =
      !lastOk || Date.now() - new Date(lastOk).getTime() <= graceMs();

    writeSettings({
      "vendor.license_ok": withinGrace ? "1" : "0",
      "vendor.license_mode": withinGrace ? "grace" : "offline",
      "vendor.license_reason": withinGrace
        ? "Curioni Labs license service unreachable — operating on grace period."
        : "Curioni Labs license service unreachable — grace period expired.",
      "vendor.license_last_check_at": now,
    });

    if (!withinGrace) {
      setTenantActive({
        isActive: false,
        reason: "License heartbeat failed — contact Curioni Labs.",
        actor: "vendor-license",
      });
    }

    log(
      `[vendor-license] heartbeat failed (${withinGrace ? "grace" : "blocked"}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

export function startVendorLicenseHeartbeat(): void {
  if (!vendorLicenseConfigured()) {
    writeSettings({
      "vendor.license_mode": "off",
      "vendor.license_ok": "1",
      "vendor.license_reason": "",
    });
    return;
  }

  void postHeartbeat();
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => void postHeartbeat(), heartbeatIntervalMs());
}
