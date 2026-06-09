/**
 * Tenant status — the master billing kill-switch.
 *
 * Implements step 14 of the Zero-Knowledge Hosted CRM blueprint.
 *
 * One row per CRM tenant. `is_active = 0` instantly locks every admin
 * route and every client trading route the moment the broker stops
 * paying — the gatekeeper middleware checks the flag on every
 * authenticated admin request. This is the vendor's only lever once
 * the white-label CRM is in the broker's hands; it does not require
 * any access to the broker's data, only to a single boolean.
 *
 * Default tenant id is "primary" for the current single-tenant build.
 * The schema is multi-tenant ready so the same logic scales to the
 * Elon-style multi-broker deployment without a rewrite.
 */

import type { NextFunction, Request, Response } from "express";
import { getDb } from "./db";
import { error as logError } from "./log";

export const PRIMARY_TENANT_ID = "primary";

let schemaEnsured = false;
function ensureTenantStatusSchema(): void {
  if (schemaEnsured) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenant_status (
      tenant_id     TEXT PRIMARY KEY,
      is_active     INTEGER NOT NULL DEFAULT 1,
      reason        TEXT,
      paused_at     TEXT,
      resumed_at    TEXT,
      updated_at    TEXT NOT NULL,
      updated_by    TEXT
    );
  `);
  // Seed primary tenant as active if missing.
  const existing = db.prepare("SELECT tenant_id FROM tenant_status WHERE tenant_id = ?").get(PRIMARY_TENANT_ID);
  if (!existing) {
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO tenant_status (tenant_id, is_active, updated_at) VALUES (?, 1, ?)",
    ).run(PRIMARY_TENANT_ID, now);
  }
  schemaEnsured = true;
}

export type TenantStatus = {
  tenant_id: string;
  is_active: boolean;
  reason: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  updated_at: string;
  updated_by: string | null;
};

function rowToStatus(row: {
  tenant_id: string;
  is_active: number;
  reason: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  updated_at: string;
  updated_by: string | null;
}): TenantStatus {
  return { ...row, is_active: row.is_active === 1 };
}

export function getTenantStatus(tenantId = PRIMARY_TENANT_ID): TenantStatus {
  ensureTenantStatusSchema();
  const row = getDb()
    .prepare("SELECT * FROM tenant_status WHERE tenant_id = ?")
    .get(tenantId) as Parameters<typeof rowToStatus>[0] | undefined;
  if (!row) {
    return {
      tenant_id: tenantId,
      is_active: true,
      reason: null,
      paused_at: null,
      resumed_at: null,
      updated_at: new Date().toISOString(),
      updated_by: null,
    };
  }
  return rowToStatus(row);
}

export function setTenantActive(args: {
  tenantId?: string;
  isActive: boolean;
  reason?: string | null;
  actor?: string | null;
}): TenantStatus {
  ensureTenantStatusSchema();
  const tenantId = args.tenantId ?? PRIMARY_TENANT_ID;
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    `INSERT INTO tenant_status (tenant_id, is_active, reason, paused_at, resumed_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id) DO UPDATE SET
       is_active = excluded.is_active,
       reason = excluded.reason,
       paused_at = CASE WHEN excluded.is_active = 0 THEN excluded.paused_at ELSE tenant_status.paused_at END,
       resumed_at = CASE WHEN excluded.is_active = 1 THEN excluded.resumed_at ELSE tenant_status.resumed_at END,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  ).run(
    tenantId,
    args.isActive ? 1 : 0,
    args.reason ?? null,
    args.isActive ? null : now,
    args.isActive ? now : null,
    now,
    args.actor ?? null,
  );
  return getTenantStatus(tenantId);
}

/**
 * Middleware that gates every authenticated route on the broker's
 * `is_active` flag. Returns HTTP 402 Payment Required when revoked.
 *
 * Intentionally cheap: a single SQLite point-read on the indexed PK.
 */
export function requireActiveTenant(req: Request, res: Response, next: NextFunction): void {
  try {
    const status = getTenantStatus();
    if (!status.is_active) {
      res.status(402).json({
        error: "Service paused by operator hosting agreement.",
        reason: status.reason ?? "Account suspended.",
        pausedAt: status.paused_at,
      });
      return;
    }
    next();
  } catch (err) {
    logError("[tenant-status]", err);
    // Fail open ONLY for read-only diagnostic paths; otherwise fail closed.
    if (req.method === "GET" && req.path.endsWith("/tenant-status")) {
      next();
      return;
    }
    res.status(503).json({ error: "Tenant status check unavailable." });
  }
}
