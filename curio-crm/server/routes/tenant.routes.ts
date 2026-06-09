/**
 * Tenant-status route — the broker (or the vendor with super-admin
 * credentials) reads and flips the master billing kill-switch here.
 *
 * Two surfaces:
 *   GET  /api/admin/system/tenant-status            → current status
 *   POST /api/admin/system/tenant-status            → flip is_active
 *
 * The POST surface is admin-only (the super-admin operator account).
 * In practice this is the only lever the software vendor needs to
 * suspend service when a broker stops paying — flip the flag, every
 * other admin and trading endpoint returns 402.
 *
 * Importantly this router is mounted OUTSIDE the `requireActiveTenant`
 * gate (see server/index.ts) so that a suspended broker can still
 * read their status and a paid-up broker can resume themselves
 * without locking themselves out.
 */

import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth";
import { error as logError } from "../log";
import { getTenantStatus, setTenantActive } from "../tenantStatus";
import { getVendorLicenseStatus } from "../vendorLicense";

export const tenantRouter = Router();

tenantRouter.get("/", (_req, res) => {
  try {
    res.json({ status: getTenantStatus(), vendorLicense: getVendorLicenseStatus() });
  } catch (err) {
    logError("[tenant-status/read]", err);
    res.status(500).json({ error: "status read failed" });
  }
});

const flipSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(280).optional(),
});

tenantRouter.post("/", requireAdmin, (req, res) => {
  const parsed = flipSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  try {
    const updated = setTenantActive({
      isActive: parsed.data.isActive,
      reason: parsed.data.reason ?? null,
      actor: req.sessionUser?.username ?? null,
    });
    res.json({ status: updated });
  } catch (err) {
    logError("[tenant-status/write]", err);
    res.status(500).json({ error: "status write failed" });
  }
});
