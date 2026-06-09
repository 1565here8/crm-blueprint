/**
 * Staff Permissions — fine-grained ACL for non-admin operators.
 * Admin (role 'admin') has every permission implicitly. Anyone else
 * with is_staff = 1 has only the keys in their staff_permissions JSON.
 */
import type { NextFunction, Request, Response } from "express";
import { getDb } from "./db";
import { createCrmUserWithProfile, ensureUserProfilesSchema } from "./crmUsers";
import { readSession, requireAuth } from "./auth";
import { logPermissionDenied } from "./securityIntelligence";
import { clientIp } from "./utils/clientIp";

export const STAFF_PERMISSIONS = [
  "desk.operator_brief",
  "desk.agent_brief",
  "desk.client_pitch",
  "desk.ask",
  "desk.lead_inbox.view",
  "desk.lead_inbox.assign",
  "desk.psp_health.view",
  "desk.collections_brief",
  "desk.tasks.view",
  "desk.tasks.complete",
  "desk.forensics.view",
  "desk.marketing_intel.view",
  "desk.agent_perf.view",
  "desk.house_rules.manage",
  "desk.drip.manage",
  "desk.drip.approve",
  "desk.instruction.run",
  "desk.anomaly.view",
  "desk.ring.view",
  "desk.affiliate.view",
  "compliance.view",
  "crm.users.view",
  "crm.users.edit",
  "crm.users.create",
  "crm.notes.create",
  "crm.emails.create",
  "trading.open_trade",
  "trading.close_trade",
  "cashier.deposits.view",
  "cashier.withdrawals.view",
  "cashier.adjust",
  "marketing.view",
  "marketing.edit",
  "system.team.manage",
  "system.commissions.edit",
  "system.branding.edit",
] as const;

export type StaffPermissionKey = (typeof STAFF_PERMISSIONS)[number];

export const STAFF_PERMISSION_GROUPS: Array<{ label: string; keys: StaffPermissionKey[] }> = [
  { label: "The Desk (AI)", keys: ["desk.operator_brief", "desk.agent_brief", "desk.client_pitch", "desk.ask", "desk.collections_brief"] },
  { label: "Mega Mind", keys: ["desk.forensics.view", "desk.marketing_intel.view", "desk.agent_perf.view", "desk.anomaly.view", "desk.ring.view", "desk.affiliate.view"] },
  { label: "Rule Room / Drips / Instructions", keys: ["desk.house_rules.manage", "desk.drip.manage", "desk.drip.approve", "desk.instruction.run"] },
  { label: "Lead Inbox", keys: ["desk.lead_inbox.view", "desk.lead_inbox.assign"] },
  { label: "Money & PSPs", keys: ["desk.psp_health.view", "cashier.deposits.view", "cashier.withdrawals.view", "cashier.adjust"] },
  { label: "Tasks / Reminders", keys: ["desk.tasks.view", "desk.tasks.complete"] },
  { label: "Compliance", keys: ["compliance.view"] },
  { label: "CRM", keys: ["crm.users.view", "crm.users.edit", "crm.users.create", "crm.notes.create", "crm.emails.create"] },
  { label: "Trading Desk", keys: ["trading.open_trade", "trading.close_trade"] },
  { label: "Marketing", keys: ["marketing.view", "marketing.edit"] },
  { label: "Platform Admin", keys: ["system.team.manage", "system.commissions.edit", "system.branding.edit"] },
];

type StaffRow = { user_id: string; is_staff: number | null; staff_permissions: string | null };

function parsePerms(json: string | null | undefined): StaffPermissionKey[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((k): k is StaffPermissionKey => (STAFF_PERMISSIONS as readonly string[]).includes(k));
  } catch {
    return [];
  }
}

export function getStaffRecord(userId: string): { isStaff: boolean; permissions: StaffPermissionKey[] } {
  ensureUserProfilesSchema();
  const row = getDb()
    .prepare("SELECT user_id, is_staff, staff_permissions FROM user_profiles WHERE user_id = ?")
    .get(userId) as StaffRow | undefined;
  if (!row) return { isStaff: false, permissions: [] };
  return { isStaff: Boolean(row.is_staff), permissions: parsePerms(row.staff_permissions) };
}

export function setStaffRecord(args: { userId: string; isStaff: boolean; permissions: StaffPermissionKey[] }) {
  ensureUserProfilesSchema();
  const cleaned = args.permissions.filter((k) => (STAFF_PERMISSIONS as readonly string[]).includes(k));
  getDb()
    .prepare("UPDATE user_profiles SET is_staff = ?, staff_permissions = ? WHERE user_id = ?")
    .run(args.isStaff ? 1 : 0, JSON.stringify(cleaned), args.userId);
}

/** Preset permission bundles when admin creates a sub-admin */
export const SUBADMIN_PRESETS: Record<
  string,
  { label: string; description: string; permissions: StaffPermissionKey[] }
> = {
  desk: {
    label: "Desk agent",
    description: "Leads, clients, cashier read — no platform settings.",
    permissions: [
      "desk.ask",
      "desk.lead_inbox.view",
      "desk.lead_inbox.assign",
      "desk.tasks.view",
      "desk.tasks.complete",
      "crm.users.view",
      "crm.notes.create",
      "crm.emails.create",
      "cashier.deposits.view",
      "cashier.withdrawals.view",
    ],
  },
  subadmin: {
    label: "Sub-admin",
    description: "Full desk + money + trading — no owner logs or kill-switch.",
    permissions: STAFF_PERMISSIONS.filter((k) => k !== "system.team.manage"),
  },
  platform: {
    label: "Platform sub-admin",
    description: "Sub-admin plus team access keys and branding.",
    permissions: [...STAFF_PERMISSIONS],
  },
};

export function createSubAdmin(args: {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  preset: keyof typeof SUBADMIN_PRESETS;
  permissions?: StaffPermissionKey[];
  actorId?: string | null;
}) {
  const preset = SUBADMIN_PRESETS[args.preset] ?? SUBADMIN_PRESETS.desk;
  const perms = args.permissions?.length ? args.permissions : preset.permissions;
  const user = createCrmUserWithProfile({
    username: args.username,
    password: args.password,
    firstName: args.firstName,
    lastName: args.lastName,
    email: args.email,
    initialBalance: 0,
    crmStatus: "Staff",
    importedSource: "subadmin",
    actorId: args.actorId ?? null,
  });
  setStaffRecord({
    userId: user.id,
    isStaff: true,
    permissions: perms.filter((k) => (STAFF_PERMISSIONS as readonly string[]).includes(k)),
  });
  return {
    userId: user.id,
    displayId: user.displayId,
    username: user.username,
    name: [args.firstName, args.lastName].filter(Boolean).join(" ") || args.username,
    email: args.email,
    isStaff: true,
    permissions: perms,
  };
}

export function listStaffUsers() {
  ensureUserProfilesSchema();
  const rows = getDb()
    .prepare(
      `SELECT u.id AS user_id, u.username, p.display_id, p.first_name, p.last_name, p.email, p.is_staff, p.staff_permissions
       FROM users u JOIN user_profiles p ON p.user_id = u.id
       WHERE u.role = 'user'
       ORDER BY p.is_staff DESC, p.display_id DESC LIMIT 500`,
    )
    .all() as Array<{
      user_id: string;
      username: string;
      display_id: number;
      first_name: string;
      last_name: string;
      email: string;
      is_staff: number | null;
      staff_permissions: string | null;
    }>;
  return rows.map((r) => ({
    userId: r.user_id,
    displayId: Number(r.display_id),
    username: r.username,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username,
    email: r.email,
    isStaff: Boolean(r.is_staff),
    permissions: parsePerms(r.staff_permissions),
  }));
}

export function requireStaffPermission(key: StaffPermissionKey) {
  return function gate(req: Request, res: Response, next: NextFunction) {
    requireAuth(req, res, () => {
      const s = req.sessionUser;
      if (!s) {
        res.status(401).json({ error: "Authentication required." });
        return;
      }
      if (s.role === "admin") {
        next();
        return;
      }
      const rec = getStaffRecord(s.id);
      if (!rec.isStaff || !rec.permissions.includes(key)) {
        logPermissionDenied({
          actor: s.username,
          permission: key,
          route: req.path,
          ip: clientIp(req),
        });
        res.status(403).json({ error: "Permission denied." });
        return;
      }
      next();
    });
  };
}

/**
 * Owner-only gate. ONLY the founder admin account passes. Staff with
 * matching permissions are still denied. Use for the secret-sauce
 * surfaces: rule authoring, drip template editing, instruction execution,
 * system-prompt viewing. The broker's brain config is a trade secret.
 */
export function requireOwnerOnly(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const s = req.sessionUser;
    if (!s || s.role !== "admin") {
      res.status(403).json({ error: "Owner-only surface." });
      return;
    }
    next();
  });
}

export function requireAdminOrStaff(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const s = req.sessionUser;
    if (!s) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (s.role === "admin") {
      next();
      return;
    }
    const rec = getStaffRecord(s.id);
    if (!rec.isStaff) {
      res.status(403).json({ error: "Staff access required." });
      return;
    }
    next();
  });
}

export function effectivePermissions(req: Request): {
  role: "admin" | "staff" | "user" | "anon";
  isAdmin: boolean;
  isStaff: boolean;
  permissions: StaffPermissionKey[];
} {
  const s = readSession(req);
  if (!s) return { role: "anon", isAdmin: false, isStaff: false, permissions: [] };
  if (s.role === "admin")
    return { role: "admin", isAdmin: true, isStaff: true, permissions: [...STAFF_PERMISSIONS] };
  const rec = getStaffRecord(s.id);
  return { role: rec.isStaff ? "staff" : "user", isAdmin: false, isStaff: rec.isStaff, permissions: rec.permissions };
}
