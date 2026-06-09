import { Router } from "express";
import { z } from "zod";
import { requireAdmin, setSessionCookie, signSession } from "../auth";
import { requireAdminOrStaff, requireStaffPermission, listStaffUsers, setStaffRecord, createSubAdmin, SUBADMIN_PRESETS, STAFF_PERMISSIONS, STAFF_PERMISSION_GROUPS } from "../staffPermissions";
import {
  listDeskGroups,
  listDeskGroupsPaginated,
  listPlatformEvents,
  logPlatformEvent,
  purgePlatformCaches,
  refreshAgentPhonePrefixes,
  setAllGroupsIpsToAll,
} from "../superAdminOps";
import {
  getGroupPermissionCatalog,
  getGroupPermissions,
  listPermissionGroups,
  parseScope,
  setGroupPermissions,
} from "../groupPermissions";
import {
  exportHistoryLogsCsv,
  listHistoryLogs,
  logHistoryEvent,
  updateHistoryLogAnnotation,
} from "../historyLogs";
import { listSecurityViewLogs } from "../securityViewLogs";
import {
  createBalanceEvent,
  exportBalanceEventsCsv,
  listBalanceEvents,
  updateBalanceEvent,
  updateBalanceEventAnnotation,
} from "../balanceEvents";
import { listTrackPixels } from "../trackPixels";
import {
  createOAuthClient,
  getOAuthClient,
  listOAuthClients,
  toggleOAuthClientDisabled,
  updateOAuthClient,
} from "../oauthClients";
import {
  createAccountType,
  getAccountType,
  listAccountTypes,
  toggleAccountTypeActive,
  updateAccountType,
} from "../accountTypes";
import {
  bulkUpdateCryptoCommissionMatrix,
  getCryptoCommissionMatrix,
} from "../cryptoCommissions";
import {
  applySpreadExchangeToAll,
  applySpreadVenue,
  deleteSpreadClientOverride,
  getSpreadBundle,
  getSpreadPreviewChart,
  listSpreadVenues,
  patchSpreadClientOverride,
  restoreSpreadExchangeDefaults,
  SPREAD_ASSET_CLASSES,
  updateSpreadExchangeCell,
  updateSpreadExchangeRow,
  updateSpreadTier,
  updateSpreadVenue,
} from "../spreadProfiles";
import {
  createPromoCode,
  deletePromoCode,
  getPromoCode,
  getPromoCodeOptions,
  listPromoCodes,
} from "../promoCodes";
import {
  applyDeskDefaultToMember,
  bulkPatchMemberNotifications,
  copyMemberNotifications,
  getMemberNotificationMatrix,
  listMemberNotifications,
  patchMemberNotifications,
} from "../memberNotifications";
import {
  NOTIFICATION_CHANNELS,
} from "../../shared/memberNotificationsSchema";
import {
  AUTO_ASSIGN_RULE_TYPES,
  createAutoAssignRule,
  deleteAutoAssignRule,
  getAutoAssignOptions,
  getAutoAssignRule,
  listAutoAssignRules,
  reorderAutoAssignPrecedence,
  updateAutoAssignRule,
} from "../autoAssignRules";
import {
  createDesk,
  deleteDesk,
  getDesk,
  getDeskStats,
  listDesks,
  updateDesk,
} from "../desks";
import {
  createDepositLimit,
  deleteDepositLimit,
  DEPOSIT_LIMIT_TYPES,
  explainDepositLimitRule,
  getDepositLimit,
  getDepositLimitOptions,
  listDepositLimits,
  updateDepositLimit,
} from "../depositLimits";
import {
  bulkUpdateForexCommissionMatrix,
  FOREX_COMMISSION_CURRENCIES,
  getForexCommissionMatrix,
} from "../forexCommissions";
import {
  getPlatformCountry,
  listPlatformCountries,
  updatePlatformCountry,
} from "../platformCountries";
import { getMetaTraderBridgeBundle, setMetaTraderBridge } from "../metaTraderBridge";
import { getCommonSettingsBundle, getPreferencesBundle, setPlatformSettings, setPreferences } from "../platformSettings";
import { error as logError } from "../log";
import {
  addPaymentGatewayFile,
  createPaymentGatewayConfig,
  deletePaymentGatewayConfig,
  deletePaymentGatewayFile,
  listPaymentGatewayConfigs,
  listPaymentProcessors,
  savePaymentProcessors,
  updatePaymentGatewayConfig,
} from "../paymentGateways";
import {
  addLedgerEntry,
  countOpenPositions,
  createCrmEmail,
  createCrmNote,
  createMarketingApiKey,
  createMarketingCampaign,
  createMarketingPartner,
  createMarketingTracker,
  createWireRequest,
  listDepositRequests,
  processDepositRequest,
  deleteMarketingTracker,
  deleteTradeByNumber,
  getCashBalance,
  getUserById,
  listAdminLedger,
  listAllPositions,
  listCalendarEvents,
  listCrmEmails,
  listCrmNotes,
  listDepositors,
  listMarketingApiKeys,
  listMarketingCampaigns,
  listMarketingPartners,
  listMarketingTrackers,
  listPendingOrders,
  adminCancelPendingOrder,
  listSalesReport,
  listUsers,
  listWireRequests,
  processWireRequest,
  revokeMarketingApiKey,
  updateCommissionSetting,
  getCommissionSetting,
  getCrmBranding,
  updateCrmBranding,
  withdrawToCredits,
} from "../db";
import { closeTrade, openTrade, buildAdminTradingDesk, userSummary, updatePositionStops } from "../trading";
import { getOnlineStats, listOnlineVisitors } from "../presence";
import { getDashboardStats, resolvePeriod, type DashboardPeriod } from "../dashboard";
import { listActiveStatusNames } from "../clientStatuses";
import {
  createCrmUserWithProfile,
  getAdjacentUserIds,
  getCrmUser,
  importUsersFromCsv,
  listCrmUsers,
  bulkUpdateCrmStatus,
  bulkUpdateCrmUsers,
  deleteCrmUsers,
  listCrmUserIds,
  listAgentRoster,
  resolveCrmBulkUserIds,
  updateCrmUser,
} from "../crmUsers";
import type { PublicUser } from "../types";

const createUserSchema = z.object({
  username: z.string().min(2).max(64),
  password: z.string().min(6).max(128),
  initialBalance: z.number().min(0).max(1_000_000_000).optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  countryCode: z.string().max(80).optional(),
  agentName: z.string().max(120).optional(),
  crmStatus: z.string().max(40).optional(),
  param1: z.string().max(200).optional(),
  currency: z.enum(["USD", "EUR", "GBP"]).optional(),
});

const ledgerSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().positive().max(1_000_000_000),
  reason: z.string().max(120).optional(),
});

const openTradeSchema = z.object({
  userId: z.string().uuid(),
  symbol: z.string().min(1).max(32),
  assetClass: z.enum(["us_equity", "crypto"]),
  qty: z.number().positive().max(1_000_000),
  side: z.enum(["long", "short"]).default("long"),
});

const closeTradeSchema = z.object({
  positionId: z.string().uuid(),
  qty: z.number().positive().max(1_000_000).optional(),
});

function toPublicUser(userId: string): PublicUser {
  const user = getUserById(userId)!;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    cashBalance: getCashBalance(userId),
    credits: user.credits,
    openPositionCount: countOpenPositions(userId),
    createdAt: user.created_at,
  };
}

export const adminRouter = Router();

/** Staff with CRM permissions can read/write clients — not only role=admin accounts. */
adminRouter.use(requireAdminOrStaff);

const periodSchema = z.enum([
  "today",
  "this_week",
  "this_month",
  "last_month",
  "7d",
  "14d",
  "30d",
  "60d",
]);

adminRouter.get("/dashboard", async (req, res) => {
  try {
    const parsed = periodSchema.safeParse(req.query.period ?? "this_week");
    const period = (parsed.success ? parsed.data : "this_week") as DashboardPeriod;
    const stats = await getDashboardStats(period);
    res.json(stats);
  } catch (err) {
    logError("[admin/dashboard]", err);
    const msg = err instanceof Error ? err.message : "Dashboard load failed.";
    res.status(500).json({
      error: "Mission Control stats could not load. Use Retry — if it persists, check server logs for [admin/dashboard].",
      detail: msg.slice(0, 120),
    });
  }
});

adminRouter.get("/online", (_req, res) => {
  res.json({
    stats: getOnlineStats(),
    visitors: listOnlineVisitors(),
  });
});

adminRouter.get("/crm/depositors", requireStaffPermission("crm.users.view"), (_req, res) => {
  res.json({ depositors: listDepositors() });
});

adminRouter.get("/crm/sales-report", (req, res) => {
  const parsed = periodSchema.safeParse(req.query.period ?? "this_month");
  const period = (parsed.success ? parsed.data : "this_month") as DashboardPeriod;
  const { from, to } = resolvePeriod(period);
  res.json({ rows: listSalesReport(from, to), period: resolvePeriod(period).label });
});

adminRouter.get("/crm/agents", (_req, res) => {
  const agents = listUsers()
    .filter((u) => u.role === "admin")
    .map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.created_at,
    }));
  res.json({ agents });
});

adminRouter.get("/crm/agents/roster", (_req, res) => {
  res.json(listAgentRoster());
});

adminRouter.get("/crm/notes", (_req, res) => {
  res.json({ notes: listCrmNotes() });
});

adminRouter.post("/crm/notes", (req, res) => {
  const schema = z.object({
    userId: z.string().uuid().nullable().optional(),
    body: z.string().min(1).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid note." });
    return;
  }
  const note = createCrmNote({
    userId: parsed.data.userId ?? null,
    body: parsed.data.body,
    authorId: req.sessionUser!.id,
  });
  res.status(201).json({ note });
});

adminRouter.get("/crm/emails", (_req, res) => {
  res.json({ emails: listCrmEmails() });
});

adminRouter.post("/crm/emails", (req, res) => {
  const schema = z.object({
    userId: z.string().uuid(),
    subject: z.string().min(1).max(200),
    body: z.string().min(1).max(5000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email." });
    return;
  }
  const email = createCrmEmail({
    userId: parsed.data.userId,
    subject: parsed.data.subject,
    body: parsed.data.body,
    authorId: req.sessionUser!.id,
  });
  res.status(201).json({ email });
});

adminRouter.get("/crm/calendar", (req, res) => {
  const month = typeof req.query.month === "string" ? req.query.month : null;
  let from: string;
  let to: string;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    from = new Date(y, m - 1, 1).toISOString();
    to = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
  } else {
    const range = resolvePeriod("this_month");
    from = range.from;
    to = range.to;
  }
  res.json({ events: listCalendarEvents(from, to) });
});

adminRouter.get("/cashier/deposits", (_req, res) => {
  res.json({
    entries: listAdminLedger({ reasons: ["admin_credit", "admin_initial_credit"] }),
  });
});

adminRouter.get("/cashier/bonuses", (_req, res) => {
  res.json({ entries: listAdminLedger({ reasons: ["admin_bonus"] }) });
});

adminRouter.get("/cashier/adjustments", (_req, res) => {
  res.json({ entries: listAdminLedger({ reasons: ["admin_adjustment"] }) });
});

adminRouter.get("/cashier/withdrawals", (_req, res) => {
  res.json({
    entries: listAdminLedger({ reasons: ["admin_debit", "withdraw_to_credits", "wire_withdrawal"] }),
  });
});

adminRouter.get("/cashier/ledger", (_req, res) => {
  res.json({ entries: listAdminLedger({ limit: 500 }) });
});

adminRouter.get("/cashier/wire-req", (_req, res) => {
  res.json({ requests: listWireRequests() });
});

adminRouter.get("/cashier/deposit-requests", (_req, res) => {
  res.json({ requests: listDepositRequests() });
});

adminRouter.post("/cashier/deposit-requests/:id/process", (req, res) => {
  const schema = z.object({ status: z.enum(["approved", "rejected"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  try {
    const request = processDepositRequest({
      id: req.params.id,
      status: parsed.data.status,
      actorId: req.sessionUser!.id,
    });
    res.json({ request });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

adminRouter.post("/cashier/wire-req", (req, res) => {
  const schema = z.object({
    userId: z.string().uuid(),
    amount: z.number().positive().max(1_000_000_000),
    bankDetails: z.string().min(3).max(500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid wire request." });
    return;
  }
  try {
    const request = createWireRequest({
      userId: parsed.data.userId,
      amount: parsed.data.amount,
      bankDetails: parsed.data.bankDetails,
    });
    res.status(201).json({ request });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

adminRouter.post("/cashier/wire-req/:id/process", (req, res) => {
  const schema = z.object({ status: z.enum(["approved", "rejected"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  try {
    const request = processWireRequest({
      id: req.params.id,
      status: parsed.data.status,
      actorId: req.sessionUser!.id,
    });
    res.json({ request });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed." });
  }
});

adminRouter.post("/cashier/bonus", (req, res) => {
  const parsed = ledgerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  addLedgerEntry({
    userId: parsed.data.userId,
    amountDelta: parsed.data.amount,
    reason: "admin_bonus",
    actorId: req.sessionUser!.id,
  });
  res.json({ user: toPublicUser(parsed.data.userId) });
});

adminRouter.post("/cashier/adjustment", (req, res) => {
  const schema = z.object({
    userId: z.string().uuid(),
    amount: z.number().min(-1_000_000_000).max(1_000_000_000).refine((n) => n !== 0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid adjustment." });
    return;
  }
  if (parsed.data.amount < 0) {
    const balance = getCashBalance(parsed.data.userId);
    if (balance < Math.abs(parsed.data.amount)) {
      res.status(400).json({ error: "Insufficient balance." });
      return;
    }
  }
  addLedgerEntry({
    userId: parsed.data.userId,
    amountDelta: parsed.data.amount,
    reason: "admin_adjustment",
    actorId: req.sessionUser!.id,
  });
  res.json({ user: toPublicUser(parsed.data.userId) });
});

adminRouter.get("/marketing/api-keys", (_req, res) => {
  res.json({ keys: listMarketingApiKeys() });
});

adminRouter.post("/marketing/api-keys", (req, res) => {
  const schema = z.object({ name: z.string().min(2).max(120) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name required." });
    return;
  }
  const { key, rawKey } = createMarketingApiKey(parsed.data.name);
  res.status(201).json({ key, rawKey, message: "Copy this key now — it won't be shown again." });
});

adminRouter.post("/marketing/api-keys/:id/revoke", (req, res) => {
  revokeMarketingApiKey(req.params.id);
  res.json({ ok: true });
});

adminRouter.get("/marketing/trackers", (_req, res) => {
  res.json({ trackers: listMarketingTrackers() });
});

adminRouter.post("/marketing/trackers", (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(120),
    partnerName: z.string().max(120).optional(),
    platform: z.enum(["facebook", "google", "tiktok", "custom"]),
    pixelId: z.string().max(200).optional(),
    postbackUrl: z.string().url().optional().or(z.literal("")),
    scriptSnippet: z.string().max(5000).optional(),
    apiKeyId: z.string().uuid().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tracker." });
    return;
  }
  const tracker = createMarketingTracker({
    name: parsed.data.name,
    partnerName: parsed.data.partnerName,
    platform: parsed.data.platform,
    pixelId: parsed.data.pixelId,
    postbackUrl: parsed.data.postbackUrl || undefined,
    scriptSnippet: parsed.data.scriptSnippet,
    apiKeyId: parsed.data.apiKeyId,
  });
  res.status(201).json({ tracker });
});

adminRouter.delete("/marketing/trackers/:id", (req, res) => {
  deleteMarketingTracker(req.params.id);
  res.json({ ok: true });
});

adminRouter.get("/marketing/campaigns", (_req, res) => {
  res.json({ campaigns: listMarketingCampaigns() });
});

adminRouter.post("/marketing/campaigns", (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(120),
    partnerName: z.string().max(120).optional(),
    budget: z.number().min(0).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid campaign." });
    return;
  }
  const campaign = createMarketingCampaign(parsed.data);
  res.status(201).json({ campaign });
});

adminRouter.get("/marketing/partners", (_req, res) => {
  res.json({ partners: listMarketingPartners() });
});

adminRouter.post("/marketing/partners", (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(120),
    contactEmail: z.string().email().optional(),
    commissionPct: z.number().min(0).max(100).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid partner." });
    return;
  }
  const partner = createMarketingPartner(parsed.data);
  res.status(201).json({ partner });
});

adminRouter.get("/system/commissions/:assetClass", (req, res) => {
  const assetClass = req.params.assetClass === "crypto" ? "crypto" : "us_equity";
  res.json({ setting: getCommissionSetting(assetClass) });
});

adminRouter.put("/system/commissions/:assetClass", (req, res) => {
  const assetClass = req.params.assetClass === "crypto" ? "crypto" : "us_equity";
  const schema = z.object({
    commissionType: z.enum(["percent", "fixed_per_trade", "fixed_per_lot"]),
    value: z.number().min(0).max(1_000_000),
    minCommission: z.number().min(0).max(1_000_000),
    maxCommission: z.number().min(0).max(1_000_000),
    enabled: z.boolean(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid commission settings." });
    return;
  }
  const setting = updateCommissionSetting(assetClass, parsed.data);
  res.json({ setting });
});

adminRouter.get("/system/forex-commissions", requireStaffPermission("system.commissions.edit"), (_req, res) => {
  res.json(getForexCommissionMatrix());
});

adminRouter.patch("/system/forex-commissions", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const schema = z.object({
    cells: z.array(
      z.object({
        tier: z.number().int().min(0).max(4),
        currency: z.enum(FOREX_COMMISSION_CURRENCIES),
        amount: z.number().min(0).max(1_000_000),
      }),
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid forex commission matrix." });
    return;
  }
  try {
    const matrix = bulkUpdateForexCommissionMatrix(parsed.data.cells);
    res.json(matrix);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update matrix." });
  }
});

adminRouter.get("/system/crypto-commissions", requireStaffPermission("system.commissions.edit"), (_req, res) => {
  res.json(getCryptoCommissionMatrix());
});

adminRouter.put("/system/crypto-commissions", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const schema = z.object({
    cells: z.array(
      z.object({
        tier: z.number().int().min(0).max(4),
        currency: z.enum(FOREX_COMMISSION_CURRENCIES),
        amount: z.number().min(0).max(1_000_000),
      }),
    ),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid crypto commission matrix." });
    return;
  }
  try {
    const matrix = bulkUpdateCryptoCommissionMatrix(parsed.data.cells);
    res.json(matrix);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update matrix." });
  }
});

const spreadAssetClassSchema = z.enum(SPREAD_ASSET_CLASSES);
const spreadUnitSchema = z.enum(["pip", "percent"]);

adminRouter.get("/system/spread", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const q = req.query;
  const demo = q.demo === "1" || q.demo === "true";
  const userId = typeof q.userId === "string" && q.userId.trim() ? q.userId.trim() : undefined;
  res.json(getSpreadBundle({ userId, demo }));
});

adminRouter.patch("/system/spread/tiers/:id", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid tier id." });
    return;
  }
  const parsed = z
    .object({
      tradePercent: z.number().min(-1).max(1).optional(),
      isPositive: z.boolean().optional(),
      name: z.string().min(1).max(32).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid tier patch." });
    return;
  }
  try {
    const tier = updateSpreadTier(id, parsed.data);
    res.json({ tier });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update tier." });
  }
});

adminRouter.patch("/system/spread/exchange", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const single = z
    .object({
      tierId: z.number().int().positive(),
      assetClass: spreadAssetClassSchema,
      value: z.number().min(0).max(9999),
      unit: spreadUnitSchema,
    })
    .safeParse(req.body);
  if (single.success) {
    try {
      const cell = updateSpreadExchangeCell(single.data);
      res.json({ cell });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Could not update cell." });
    }
    return;
  }

  const row = z
    .object({
      tierId: z.number().int().positive(),
      cells: z.array(
        z.object({
          assetClass: spreadAssetClassSchema,
          value: z.number().min(0).max(9999),
          unit: spreadUnitSchema,
        }),
      ),
    })
    .safeParse(req.body);
  if (!row.success) {
    res.status(400).json({ error: "Invalid exchange patch." });
    return;
  }
  try {
    const cells = updateSpreadExchangeRow(row.data.tierId, row.data.cells);
    res.json({ cells });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update row." });
  }
});

adminRouter.post("/system/spread/exchange/apply-to-all", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const parsed = z
    .object({
      assetClass: spreadAssetClassSchema,
      value: z.number().min(0).max(9999),
      unit: spreadUnitSchema,
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid apply-to-all payload." });
    return;
  }
  const updated = applySpreadExchangeToAll(parsed.data);
  res.json({ updated });
});

adminRouter.post("/system/spread/exchange/restore-defaults", requireStaffPermission("system.commissions.edit"), (_req, res) => {
  restoreSpreadExchangeDefaults();
  res.json({ ok: true, exchange: getSpreadBundle().exchange });
});

adminRouter.get("/system/spread/preview", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const q = req.query;
  const tierId = q.tierId ? Number(q.tierId) : undefined;
  const demo = q.demo === "1" || q.demo === "true";
  const userId = typeof q.userId === "string" && q.userId.trim() ? q.userId.trim() : undefined;
  const tierSlug = typeof q.tierSlug === "string" ? q.tierSlug : undefined;
  res.json(getSpreadPreviewChart({ tierId: Number.isFinite(tierId) ? tierId : undefined, tierSlug, userId, demo }));
});

adminRouter.patch("/system/spread/override", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const parsed = z
    .object({
      userId: z.string().nullable().optional(),
      demo: z.boolean().optional(),
      tierId: z.number().int().positive().nullable().optional(),
      overrides: z
        .object({
          tiers: z.record(z.object({ tradePercent: z.number().optional(), isPositive: z.boolean().optional() })).optional(),
          cells: z.record(z.record(z.object({ value: z.number(), unit: spreadUnitSchema }))).optional(),
        })
        .optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid override patch." });
    return;
  }
  try {
    const override = patchSpreadClientOverride(parsed.data);
    res.json({ override });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not save override." });
  }
});

adminRouter.delete("/system/spread/override", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const q = req.query;
  const demo = q.demo === "1" || q.demo === "true";
  const userId = typeof q.userId === "string" ? q.userId : undefined;
  deleteSpreadClientOverride({ userId, demo });
  res.json({ ok: true });
});

adminRouter.get("/system/spread/venues", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const q = req.query;
  res.json(
    listSpreadVenues({
      search: typeof q.search === "string" ? q.search : undefined,
      page: Number(q.page) || 1,
      limit: Number(q.limit) || 50,
    }),
  );
});

adminRouter.patch("/system/spread/venues/:id", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid venue id." });
    return;
  }
  const parsed = z
    .object({
      name: z.string().min(1).max(120).optional(),
      percent: z.number().min(0).max(100).optional(),
      isPositive: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid venue spread." });
    return;
  }
  try {
    res.json({ row: updateSpreadVenue(id, parsed.data) });
  } catch (e) {
    res.status(404).json({ error: e instanceof Error ? e.message : "Not found." });
  }
});

adminRouter.post("/system/spread/venues/:id/apply", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid venue id." });
    return;
  }
  try {
    res.json({ row: applySpreadVenue(id) });
  } catch (e) {
    res.status(404).json({ error: e instanceof Error ? e.message : "Not found." });
  }
});

adminRouter.get("/system/common", (_req, res) => {
  res.json({ branding: getCrmBranding() });
});

adminRouter.put("/system/common", (req, res) => {
  const schema = z.object({
    goToSiteUrl: z.string().min(1).max(500),
    crmBrandName: z.string().min(1).max(120),
    goToSiteLabel: z.string().min(1).max(64),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid branding settings." });
    return;
  }
  const branding = updateCrmBranding(parsed.data);
  res.json({ branding });
});

adminRouter.get("/system/payment-gateways", (_req, res) => {
  res.json({ gateways: listPaymentGatewayConfigs() });
});

adminRouter.post("/system/payment-gateways", (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(80),
    credentials: z.record(z.string(), z.string()),
    cardNumbers: z.string().max(4000),
    is3d: z.boolean(),
    description: z.string().max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payment gateway config." });
    return;
  }
  try {
    const gateway = createPaymentGatewayConfig(parsed.data);
    res.status(201).json({ gateway });
  } catch (err) {
    logError("[admin/payment-gateways/create]", err);
    res.status(409).json({ error: "Gateway name already exists." });
  }
});

adminRouter.put("/system/payment-gateways/:id", (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(80).optional(),
    credentials: z.record(z.string(), z.string()).optional(),
    cardNumbers: z.string().max(4000).optional(),
    is3d: z.boolean().optional(),
    description: z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payment gateway config." });
    return;
  }
  const gateway = updatePaymentGatewayConfig(req.params.id, parsed.data);
  if (!gateway) {
    res.status(404).json({ error: "Gateway not found." });
    return;
  }
  res.json({ gateway });
});

adminRouter.delete("/system/payment-gateways/:id", (req, res) => {
  const ok = deletePaymentGatewayConfig(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Gateway not found." });
    return;
  }
  res.json({ ok: true });
});

adminRouter.post("/system/payment-gateways/:id/files", (req, res) => {
  const schema = z.object({ fileName: z.string().min(1).max(255) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid file name." });
    return;
  }
  const file = addPaymentGatewayFile(req.params.id, parsed.data.fileName);
  if (!file) {
    res.status(404).json({ error: "Gateway not found." });
    return;
  }
  res.status(201).json({ file });
});

adminRouter.delete("/system/payment-gateways/:id/files/:fileId", (req, res) => {
  const ok = deletePaymentGatewayFile(req.params.fileId);
  if (!ok) {
    res.status(404).json({ error: "File not found." });
    return;
  }
  res.json({ ok: true });
});

adminRouter.get("/system/payment-processors", (_req, res) => {
  res.json({ processors: listPaymentProcessors() });
});

adminRouter.put("/system/payment-processors", (req, res) => {
  const rowSchema = z.object({
    id: z.string().optional(),
    gatewayName: z.string().min(1).max(80),
    enabled: z.boolean(),
    includeCountries: z.string().max(500),
    excludeCountries: z.string().max(500),
    tabPriority: z.number().int().min(0).max(9999),
    processorPriority: z.number().int().min(0).max(9999),
  });
  const schema = z.object({ processors: z.array(rowSchema) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid processor list." });
    return;
  }
  const processors = savePaymentProcessors(parsed.data.processors);
  res.json({ processors });
});

adminRouter.get("/crm/users/ids", requireStaffPermission("crm.users.view"), (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const agent = typeof req.query.agent === "string" ? req.query.agent : undefined;
  const deskId = Number(req.query.deskId);
  const ids = listCrmUserIds({
    search,
    status,
    agent,
    deskId: Number.isFinite(deskId) ? deskId : undefined,
  });
  res.json({ ids, total: ids.length });
});

adminRouter.get("/crm/users", (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const agent = typeof req.query.agent === "string" ? req.query.agent : undefined;
  const deskId = Number(req.query.deskId);
  const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
  res.json(
    listCrmUsers({
      page,
      limit,
      search,
      status,
      agent,
      deskId: Number.isFinite(deskId) ? deskId : undefined,
      sortBy,
      sortDir,
    }),
  );
});

adminRouter.get("/crm/statuses", (_req, res) => {
  res.json({ statuses: listActiveStatusNames() });
});

adminRouter.post("/crm/users/bulk-status", (req, res) => {
  const parsed = z
    .object({
      userIds: z.array(z.string().min(1).max(64)).min(1).max(5000),
      crmStatus: z.string().min(1).max(40),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid bulk update." });
    return;
  }
  try {
    const updated = bulkUpdateCrmStatus(parsed.data.userIds, parsed.data.crmStatus);
    const actor = req.sessionUser?.username ?? null;
    logHistoryEvent({
      actionType: "bulk_status_change",
      executedBy: actor,
      routeName: "admin/crm/users/bulk-status",
      detail: `Updated ${updated} client(s) to status "${parsed.data.crmStatus}".`,
      newStatus: parsed.data.crmStatus,
      meta: { count: updated, sampleIds: parsed.data.userIds.slice(0, 10) },
    });
    res.json({ updated });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bulk update failed." });
  }
});

const crmBulkPatchFieldsSchema = z
  .object({
    firstName: z.string().max(120).optional(),
    lastName: z.string().max(120).optional(),
    email: z.string().max(200).optional(),
    phone: z.string().max(40).optional(),
    phone2: z.string().max(40).optional(),
    countryCode: z.string().max(80).optional(),
    nationality: z.string().max(80).optional(),
    agentName: z.string().max(120).optional(),
    desk: z.string().max(80).optional(),
    crmStatus: z.string().max(40).optional(),
    tradingStatus: z.string().max(40).optional(),
    param1: z.string().max(200).optional(),
    partner: z.string().max(120).optional(),
    campaign: z.string().max(120).optional(),
    affiliate: z.string().max(120).optional(),
    campaignId: z.string().max(120).optional(),
      cpa: z.string().max(40).optional(),
      cpl: z.string().max(40).optional(),
      comments: z.string().max(2000).optional(),
      funnel: z.string().max(120).optional(),
      conversionRate: z.string().max(40).optional(),
      playerValue: z.string().max(40).optional(),
      importedSource: z.string().max(120).optional(),
    currency: z.enum(["USD", "EUR", "GBP"]).optional(),
    text1: z.string().max(500).optional(),
    address: z.string().max(300).optional(),
    address1: z.string().max(300).optional(),
    city: z.string().max(80).optional(),
    state: z.string().max(80).optional(),
    zipCode: z.string().max(20).optional(),
    birthday: z.string().max(20).optional(),
  })
  .refine((p) => Object.values(p).some((v) => v !== undefined && v !== ""), {
    message: "At least one field required.",
  });

const crmBulkPatchSchema = z.object({
  userIds: z.array(z.string().min(1).max(64)).min(1).max(5000),
  patch: crmBulkPatchFieldsSchema,
});

const crmScopedBulkPatchSchema = z.object({
  scope: z.enum(["checked", "page", "all"]),
  userIds: z.array(z.string().min(1).max(64)).max(5000).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(500).optional(),
  search: z.string().max(200).optional(),
  status: z.string().max(40).optional(),
  agent: z.string().max(120).optional(),
  patch: crmBulkPatchFieldsSchema,
});

function cleanBulkPatch(patch: Record<string, unknown>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== "") clean[k] = String(v);
  }
  return clean;
}

adminRouter.post("/crm/users/bulk-update-scoped", requireStaffPermission("crm.users.edit"), (req, res) => {
  const parsed = crmScopedBulkPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid bulk update payload.",
    });
    return;
  }
  try {
    const ids = resolveCrmBulkUserIds(parsed.data);
    if (ids.length === 0) {
      res.status(400).json({ error: "No users match the selected scope." });
      return;
    }
    const updated = bulkUpdateCrmUsers(ids, cleanBulkPatch(parsed.data.patch));
    res.json({ updated, targeted: ids.length });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bulk update failed." });
  }
});

const crmBulkPatchSchemaLegacy = crmBulkPatchSchema;

adminRouter.post("/crm/users/bulk-update", requireStaffPermission("crm.users.edit"), (req, res) => {
  const parsed = crmBulkPatchSchemaLegacy.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid bulk update payload.",
    });
    return;
  }
  try {
    const updated = bulkUpdateCrmUsers(parsed.data.userIds, cleanBulkPatch(parsed.data.patch));
    res.json({ updated, targeted: parsed.data.userIds.length });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bulk update failed." });
  }
});

adminRouter.post("/crm/users/bulk-delete", requireStaffPermission("crm.users.edit"), (req, res) => {
  const parsed = z
    .object({
      userIds: z.array(z.string().uuid()).min(1).max(2000),
      confirm: z.literal(true),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid delete request." });
    return;
  }
  try {
    const result = deleteCrmUsers(parsed.data.userIds);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bulk delete failed." });
  }
});

adminRouter.get("/crm/users/:id", (req, res) => {
  try {
    const user = getCrmUser(req.params.id);
    const adjacent = getAdjacentUserIds(req.params.id);
    res.json({ user, adjacent });
  } catch {
    res.status(404).json({ error: "User not found." });
  }
});

adminRouter.post("/crm/users/:id/impersonate", async (req, res) => {
  try {
    const target = getUserById(req.params.id);
    if (!target) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (target.role === "admin") {
      res.status(403).json({ error: "Cannot open the client portal as an admin account." });
      return;
    }
    const token = signSession({
      id: target.id,
      username: target.username,
      role: target.role,
      impersonatorId: req.sessionUser!.id,
    });
    setSessionCookie(res, token);
    let ownerName: string | null = null;
    try {
      ownerName = getCrmUser(target.id).agentName ?? null;
    } catch {
      /* non-crm user */
    }
    logHistoryEvent({
      actionType: "impersonate",
      executedBy: req.sessionUser!.username,
      routeName: "admin/crm/users/impersonate",
      actionedOn: target.username,
      actionedOnId: target.id,
      currentOwner: ownerName,
    });
    res.json({
      user: await userSummary(target.id),
      impersonating: true,
      impersonatorUsername: req.sessionUser!.username,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Impersonation failed." });
  }
});

const crmUserPatchSchema = z.object({
  username: z.string().min(2).max(64).optional(),
  password: z.string().min(6).max(128).optional(),
  firstName: z.string().max(120).optional(),
  lastName: z.string().max(120).optional(),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  phone2: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  address1: z.string().max(300).optional(),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  zipCode: z.string().max(20).optional(),
  countryCode: z.string().max(80).optional(),
  nationality: z.string().max(80).optional(),
  birthday: z.string().max(20).optional(),
  currency: z.enum(["USD", "EUR", "GBP"]).optional(),
  agentName: z.string().max(120).optional(),
  desk: z.string().max(80).optional(),
  crmStatus: z.string().max(40).optional(),
  tradingStatus: z.string().max(40).optional(),
  text1: z.string().max(500).optional(),
  partner: z.string().max(120).optional(),
  campaign: z.string().max(120).optional(),
  affiliate: z.string().max(120).optional(),
  campaignId: z.string().max(120).optional(),
      cpa: z.string().max(40).optional(),
      cpl: z.string().max(40).optional(),
      comments: z.string().max(2000).optional(),
      funnel: z.string().max(120).optional(),
      conversionRate: z.string().max(40).optional(),
      playerValue: z.string().max(40).optional(),
      importedSource: z.string().max(120).optional(),
  param1: z.string().max(200).optional(),
  extDocsRequired: z.boolean().optional(),
  exchangeSpread: z.coerce.number().int().min(-5).max(5).optional(),
});

adminRouter.patch("/crm/users/:id", (req, res) => {
  const parsed = crmUserPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile data." });
    return;
  }
  try {
    const before = getCrmUser(req.params.id);
    const user = updateCrmUser(req.params.id, parsed.data);
    const actor = req.sessionUser?.username ?? null;
    if (parsed.data.crmStatus !== undefined && parsed.data.crmStatus !== before.crmStatus) {
      logHistoryEvent({
        actionType: "status_change",
        executedBy: actor,
        routeName: "admin/crm/users/patch",
        actionedOn: before.username,
        actionedOnId: req.params.id,
        currentOwner: user.agentName ?? before.agentName ?? null,
        prevStatus: before.crmStatus,
        newStatus: user.crmStatus,
      });
    } else if (parsed.data.agentName !== undefined && parsed.data.agentName !== before.agentName) {
      logHistoryEvent({
        actionType: "owner_change",
        executedBy: actor,
        routeName: "admin/crm/users/patch",
        actionedOn: before.username,
        actionedOnId: req.params.id,
        currentOwner: user.agentName ?? null,
        prevOwner: before.agentName ?? null,
      });
    } else {
      const keys = Object.keys(parsed.data).filter((k) => k !== "password");
      if (keys.length > 0) {
        logHistoryEvent({
          actionType: "profile_update",
          executedBy: actor,
          routeName: "admin/crm/users/patch",
          actionedOn: before.username,
          actionedOnId: req.params.id,
          currentOwner: user.agentName ?? before.agentName ?? null,
          detail: `Updated fields: ${keys.join(", ")}`,
        });
      }
    }
    res.json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    res.status(400).json({ error: message });
  }
});

adminRouter.post("/crm/users/import", requireStaffPermission("crm.users.create"), async (req, res) => {
  const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
  if (!csv.trim()) {
    res.status(400).json({ error: "CSV body required (field: csv)." });
    return;
  }
  try {
    const result = await importUsersFromCsv(csv, req.sessionUser!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    res.status(400).json({ error: message });
  }
});

adminRouter.get("/users", (_req, res) => {
  const users = listUsers().map((u) => toPublicUser(u.id));
  res.json({ users });
});

adminRouter.post("/users", (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const user = createCrmUserWithProfile({
      username: parsed.data.username,
      password: parsed.data.password,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      countryCode: parsed.data.countryCode,
      agentName: parsed.data.agentName,
      crmStatus: parsed.data.crmStatus,
      param1: parsed.data.param1,
      currency: parsed.data.currency,
      initialBalance: parsed.data.initialBalance ?? 100_000,
      actorId: req.sessionUser!.id,
    });
    res.status(201).json({ user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create user failed.";
    res.status(409).json({ error: message });
  }
});

adminRouter.post("/ledger/credit", (req, res) => {
  const parsed = ledgerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  addLedgerEntry({
    userId: parsed.data.userId,
    amountDelta: parsed.data.amount,
    reason: parsed.data.reason ?? "admin_credit",
    actorId: req.sessionUser!.id,
  });
  res.json({ user: toPublicUser(parsed.data.userId) });
});

adminRouter.post("/ledger/debit", (req, res) => {
  const parsed = ledgerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const balance = getCashBalance(parsed.data.userId);
  if (balance < parsed.data.amount) {
    res.status(400).json({ error: "Insufficient balance to debit." });
    return;
  }

  addLedgerEntry({
    userId: parsed.data.userId,
    amountDelta: -parsed.data.amount,
    reason: parsed.data.reason ?? "admin_debit",
    actorId: req.sessionUser!.id,
  });
  res.json({ user: toPublicUser(parsed.data.userId) });
});

adminRouter.get("/trading/desk", async (req, res) => {
  const raw = String(req.query.userIds ?? "");
  const userIds = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const desk = await buildAdminTradingDesk(userIds);
    res.json(desk);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Desk load failed.";
    res.json({
      userCount: userIds.length,
      openPositions: [],
      pendingOrders: [],
      closedPositions: [],
      warning: message,
    });
  }
});

adminRouter.post("/trades/open", async (req, res) => {
  const parsed = openTradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const position = await openTrade({
      userId: parsed.data.userId,
      symbol: parsed.data.symbol,
      assetClass: parsed.data.assetClass,
      qty: parsed.data.qty,
      side: parsed.data.side,
      actorId: req.sessionUser!.id,
    });
    res.status(201).json({ position, user: toPublicUser(parsed.data.userId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Open trade failed.";
    res.status(400).json({ error: message });
  }
});

adminRouter.post("/trades/close", async (req, res) => {
  const parsed = closeTradeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const closed = await closeTrade({
      positionId: parsed.data.positionId,
      actorId: req.sessionUser!.id,
      qty: parsed.data.qty,
    });
    res.json({ position: closed, user: toPublicUser(closed.user_id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Close trade failed.";
    res.status(400).json({ error: message });
  }
});

adminRouter.get("/trading/positions", (req, res) => {
  const status = req.query.status === "closed" ? "closed" : req.query.status === "open" ? "open" : undefined;
  const userId = typeof req.query.userId === "string" && req.query.userId.trim() ? req.query.userId.trim() : undefined;
  res.json({ positions: listAllPositions(status, userId) });
});

adminRouter.get("/trading/pending", (req, res) => {
  const userId = typeof req.query.userId === "string" && req.query.userId.trim() ? req.query.userId.trim() : undefined;
  res.json({ orders: listPendingOrders("pending", userId) });
});

adminRouter.delete("/trading/pending/:id", requireStaffPermission("trading.open_trade"), (req, res) => {
  try {
    const order = adminCancelPendingOrder(req.params.id);
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Cancel failed." });
  }
});

adminRouter.patch("/trading/positions/:id/stops", requireStaffPermission("trading.open_trade"), (req, res) => {
  const parsed = z
    .object({
      userId: z.string().uuid(),
      stopLoss: z.number().positive().nullable().optional(),
      takeProfit: z.number().positive().nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const position = updatePositionStops(
      req.params.id,
      parsed.data.userId,
      parsed.data.stopLoss ?? null,
      parsed.data.takeProfit ?? null,
    );
    res.json({ position });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Update failed." });
  }
});

adminRouter.delete("/trading/trades/:tradeNumber", (req, res) => {
  const tradeNumber = Number(req.params.tradeNumber);
  if (!Number.isFinite(tradeNumber)) {
    res.status(400).json({ error: "Invalid trade number." });
    return;
  }
  try {
    const result = deleteTradeByNumber(tradeNumber, req.sessionUser!.id);
    res.json({ result });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Delete failed." });
  }
});

adminRouter.post("/withdraw/approve", (req, res) => {
  const parsed = ledgerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = withdrawToCredits({ userId: parsed.data.userId, amount: parsed.data.amount });
    res.json({ ...result, user: toPublicUser(parsed.data.userId) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdraw failed.";
    res.status(400).json({ error: message });
  }
});

/* ---------------------- Team & Permissions (admin only) ---------------------- */

adminRouter.get("/team/permissions/catalog", requireAdmin, (_req, res) => {
  res.json({ permissions: STAFF_PERMISSIONS, groups: STAFF_PERMISSION_GROUPS, presets: SUBADMIN_PRESETS });
});

adminRouter.get("/team/staff", requireAdmin, (_req, res) => {
  res.json({ staff: listStaffUsers() });
});

const staffUpdateSchema = z.object({
  userId: z.string().uuid(),
  isStaff: z.boolean(),
  permissions: z.array(z.string().max(64)).max(128),
});

adminRouter.post("/team/staff", requireAdmin, (req, res) => {
  const parsed = staffUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  try {
    setStaffRecord({
      userId: parsed.data.userId,
      isStaff: parsed.data.isStaff,
      permissions: parsed.data.permissions as unknown as (typeof STAFF_PERMISSIONS)[number][],
    });
    res.json({ ok: true });
  } catch (err) {
    logError("[admin/team/staff]", err);
    res.status(500).json({ error: "Could not update staff record." });
  }
});

const subAdminCreateSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  email: z.string().email().max(128),
  preset: z.enum(["desk", "subadmin", "platform"]),
});

adminRouter.post("/team/subadmins", requireAdmin, (req, res) => {
  const parsed = subAdminCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid sub-admin details." });
    return;
  }
  try {
    const member = createSubAdmin({ ...parsed.data, actorId: req.sessionUser?.id ?? null });
    res.status(201).json({ member });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create sub-admin.";
    res.status(409).json({ error: message });
  }
});

/* ---------------------- Desk groups & permissions ---------------------- */

adminRouter.get("/system/groups", requireStaffPermission("system.team.manage"), (req, res) => {
  const q = req.query;
  const result = listDeskGroupsPaginated({
    search: typeof q.search === "string" ? q.search : undefined,
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 10,
    sortBy: typeof q.sortBy === "string" ? q.sortBy : "id",
    sortDir: q.sortDir === "desc" ? "desc" : "asc",
  });
  res.json(result);
});

adminRouter.get("/system/permissions/groups", requireAdmin, (_req, res) => {
  res.json({ groups: listPermissionGroups() });
});

adminRouter.get("/system/permissions/catalog", requireAdmin, (req, res) => {
  const scope = parseScope(req.query.scope) ?? "crm";
  res.json(getGroupPermissionCatalog(scope));
});

adminRouter.get("/system/permissions/groups/:groupId", requireAdmin, (req, res) => {
  const scope = parseScope(req.query.scope) ?? "crm";
  const groupId = String(req.params.groupId ?? "");
  const groups = listPermissionGroups();
  if (!groups.some((g) => g.id === groupId)) {
    res.status(404).json({ error: "Desk group not found." });
    return;
  }
  res.json({
    groupId,
    scope,
    permissions: getGroupPermissions(groupId, scope),
    catalog: getGroupPermissionCatalog(scope),
  });
});

const groupPermPatchSchema = z.object({
  permissions: z.array(z.string().max(64)).max(256),
});

adminRouter.patch("/system/permissions/groups/:groupId", requireAdmin, (req, res) => {
  const scope = parseScope(req.query.scope) ?? "crm";
  const groupId = String(req.params.groupId ?? "");
  const parsed = groupPermPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  try {
    const result = setGroupPermissions({
      groupId,
      scope,
      permissions: parsed.data.permissions,
      actor: req.sessionUser?.username ?? null,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save permissions.";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

/* ---------------------- Member notifications (owner) ---------------------- */

adminRouter.get("/system/notifications", requireAdmin, (_req, res) => {
  res.json(listMemberNotifications());
});

adminRouter.get("/system/notifications/:userId", requireAdmin, (req, res) => {
  try {
    const matrix = getMemberNotificationMatrix(String(req.params.userId));
    res.json({ userId: req.params.userId, matrix });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Not found.";
    res.status(404).json({ error: message });
  }
});

const notificationCellSchema = z.object({
  eventKey: z.string().max(64),
  channel: z.enum(NOTIFICATION_CHANNELS),
  enabled: z.boolean(),
});

const notificationPatchSchema = z.object({
  cells: z.array(notificationCellSchema).max(256),
});

adminRouter.patch("/system/notifications/:userId", requireAdmin, (req, res) => {
  const parsed = notificationPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  try {
    const matrix = patchMemberNotifications({
      userId: String(req.params.userId),
      cells: parsed.data.cells,
    });
    res.json({ ok: true, userId: req.params.userId, matrix });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save.";
    res.status(message.includes("not found") ? 404 : 500).json({ error: message });
  }
});

adminRouter.patch("/system/notifications/bulk/update", requireAdmin, (req, res) => {
  const schema = z.object({
    userIds: z.array(z.string().uuid()).min(1).max(100),
    cells: z.array(notificationCellSchema).max(256),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  const result = bulkPatchMemberNotifications(parsed.data);
  res.json({ ok: true, ...result });
});

adminRouter.post("/system/notifications/copy", requireAdmin, (req, res) => {
  const schema = z.object({
    fromUserId: z.string().min(1).max(64),
    toUserId: z.string().uuid(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  try {
    const matrix = copyMemberNotifications(parsed.data);
    res.json({ ok: true, matrix });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Copy failed.";
    res.status(404).json({ error: message });
  }
});

adminRouter.post("/system/notifications/apply-default", requireAdmin, (req, res) => {
  const schema = z.object({ userId: z.string().uuid() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad request." });
    return;
  }
  try {
    const matrix = applyDeskDefaultToMember(parsed.data.userId);
    res.json({ ok: true, matrix });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Apply failed.";
    res.status(404).json({ error: message });
  }
});

/* ---------------------- Super Admin (owner only) ---------------------- */

const superAdmin = Router();
superAdmin.use(requireAdmin);

superAdmin.get("/groups", (_req, res) => {
  res.json({ groups: listDeskGroups() });
});

superAdmin.post("/groups/set-all-ips", (req, res) => {
  const actor = req.sessionUser?.username ?? null;
  const r = setAllGroupsIpsToAll(actor);
  res.json({
    ok: true,
    message: `Updated ${r.groupsUpdated} desk group(s) — all IPs set to All.`,
    ...r,
  });
});

superAdmin.post("/refresh-agent-phones", (req, res) => {
  const actor = req.sessionUser?.username ?? null;
  const r = refreshAgentPhonePrefixes(actor);
  res.json({
    ok: true,
    message: `Refreshed phone prefix / CLID on ${r.agentsUpdated} staff agent(s).`,
    ...r,
  });
});

superAdmin.post("/purge-cache", (req, res) => {
  const actor = req.sessionUser?.username ?? null;
  const r = purgePlatformCaches(actor);
  res.json({
    ok: true,
    message: `Purged caches: ${r.cachesCleared.join(", ")}.`,
    ...r,
  });
});

superAdmin.get("/events", (req, res) => {
  const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 80));
  const events = listPlatformEvents(kind, limit).map((e) => ({
    id: e.id,
    kind: e.kind,
    message: e.message,
    actor: e.actor,
    created_at: e.created_at,
  }));
  res.json({ events });
});

superAdmin.get("/history-logs", (req, res) => {
  const q = req.query;
  const result = listHistoryLogs({
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
    action: typeof q.action === "string" ? q.action : undefined,
    agent: typeof q.agent === "string" ? q.agent : undefined,
    user: typeof q.user === "string" ? q.user : undefined,
    search: typeof q.search === "string" ? q.search : undefined,
    comment: typeof q.comment === "string" ? q.comment : undefined,
    changedStatus: typeof q.changedStatus === "string" ? q.changedStatus : undefined,
    crmId: typeof q.crmId === "string" ? q.crmId : undefined,
    flagged: q.flagged === "1" || q.flagged === "true",
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 25,
    sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
    sortDir: q.sortDir === "asc" ? "asc" : "desc",
  });
  res.json(result);
});

superAdmin.get("/history-logs/export", (req, res) => {
  const q = req.query;
  const csv = exportHistoryLogsCsv({
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
    action: typeof q.action === "string" ? q.action : undefined,
    agent: typeof q.agent === "string" ? q.agent : undefined,
    user: typeof q.user === "string" ? q.user : undefined,
    search: typeof q.search === "string" ? q.search : undefined,
    flagged: q.flagged === "1" || q.flagged === "true",
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="history-logs-${Date.now()}.csv"`);
  res.send(csv);
});

superAdmin.patch("/history-logs/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid log id." });
    return;
  }
  const parsed = z
    .object({
      operatorNote: z.string().max(500).nullable().optional(),
      flagged: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid annotation." });
    return;
  }
  const row = updateHistoryLogAnnotation(id, parsed.data);
  if (!row) {
    res.status(404).json({ error: "Log not found." });
    return;
  }
  res.json({ row });
});

superAdmin.get("/balance-events", (req, res) => {
  const q = req.query;
  const result = listBalanceEvents({
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
    type: typeof q.type === "string" ? q.type : undefined,
    user: typeof q.user === "string" ? q.user : undefined,
    search: typeof q.search === "string" ? q.search : undefined,
    flagged: q.flagged === "1" || q.flagged === "true",
    negativeOnly: q.negativeOnly === "1" || q.negativeOnly === "true",
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 25,
    sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
    sortDir: q.sortDir === "asc" ? "asc" : "desc",
  });
  res.json(result);
});

superAdmin.get("/balance-events/export", (req, res) => {
  const q = req.query;
  const csv = exportBalanceEventsCsv({
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
    type: typeof q.type === "string" ? q.type : undefined,
    user: typeof q.user === "string" ? q.user : undefined,
    search: typeof q.search === "string" ? q.search : undefined,
    flagged: q.flagged === "1" || q.flagged === "true",
    negativeOnly: q.negativeOnly === "1" || q.negativeOnly === "true",
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="balance-events-${Date.now()}.csv"`);
  res.send(csv);
});

superAdmin.patch("/balance-events/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid event id." });
    return;
  }
  const parsed = z
    .object({
      operatorNote: z.string().max(500).nullable().optional(),
      flagged: z.boolean().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid annotation." });
    return;
  }
  const row = updateBalanceEventAnnotation(id, parsed.data);
  if (!row) {
    res.status(404).json({ error: "Event not found." });
    return;
  }
  res.json({ row });
});

const balanceEventBody = z.object({
  eventType: z.string().min(1).max(80),
  userId: z.string().min(1),
  prevCash: z.number(),
  newCash: z.number(),
  prevBonus: z.number().optional(),
  newBonus: z.number().optional(),
  ledgerRef: z.string().nullable().optional(),
  refNote: z.string().max(200).nullable().optional(),
  operatorNote: z.string().max(500).nullable().optional(),
  createdAt: z.string().optional(),
});

superAdmin.post("/balance-events", (req, res) => {
  const parsed = balanceEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid balance event." });
    return;
  }
  try {
    const row = createBalanceEvent({ ...parsed.data, actorId: req.sessionUser?.id ?? null });
    res.status(201).json({ row });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create event." });
  }
});

superAdmin.put("/balance-events/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid event id." });
    return;
  }
  const parsed = balanceEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid balance event." });
    return;
  }
  const row = updateBalanceEvent(id, parsed.data);
  if (!row) {
    res.status(404).json({ error: "Event not found." });
    return;
  }
  res.json({ row });
});

adminRouter.use("/super-admin", superAdmin);

/* ---------------------- Common / Countries (admin) ---------------------- */

adminRouter.get("/system/tracking/pixels", requireStaffPermission("marketing.view"), (req, res) => {
  const q = req.query;
  res.json(
    listTrackPixels({
      search: typeof q.search === "string" ? q.search : undefined,
      page: Number(q.page) || 1,
      limit: Number(q.limit) || 25,
      sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
      sortDir: q.sortDir === "asc" ? "asc" : "desc",
    }),
  );
});

const oauthClientBody = z.object({
  name: z.string().min(1).max(120),
  campaignIds: z.string().max(500).optional(),
  disabled: z.boolean().optional(),
});

const oauthClientPatchBody = z.object({
  name: z.string().min(1).max(120).optional(),
  campaignIds: z.string().max(500).optional(),
  disabled: z.boolean().optional(),
});

adminRouter.get("/system/oauth-clients", requireStaffPermission("system.team.manage"), (req, res) => {
  const q = req.query;
  res.json(
    listOAuthClients({
      search: typeof q.search === "string" ? q.search : undefined,
      page: Number(q.page) || 1,
      limit: Number(q.limit) || 10,
      sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
      sortDir: q.sortDir === "asc" ? "asc" : "desc",
    }),
  );
});

adminRouter.get("/system/oauth-clients/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid client id." });
    return;
  }
  const client = getOAuthClient(id);
  if (!client) {
    res.status(404).json({ error: "OAuth client not found." });
    return;
  }
  res.json({ client });
});

adminRouter.post("/system/oauth-clients", requireStaffPermission("system.team.manage"), (req, res) => {
  const parsed = oauthClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid OAuth client." });
    return;
  }
  try {
    const { client, clientSecret } = createOAuthClient(parsed.data);
    res.status(201).json({ client, clientSecret });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create client." });
  }
});

adminRouter.patch("/system/oauth-clients/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid client id." });
    return;
  }
  const parsed = oauthClientPatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid OAuth client." });
    return;
  }
  try {
    const client = updateOAuthClient(id, parsed.data);
    if (!client) {
      res.status(404).json({ error: "OAuth client not found." });
      return;
    }
    res.json({ client });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update client." });
  }
});

adminRouter.post("/system/oauth-clients/:id/toggle-disabled", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid client id." });
    return;
  }
  const client = toggleOAuthClientDisabled(id);
  if (!client) {
    res.status(404).json({ error: "OAuth client not found." });
    return;
  }
  res.json({ client });
});

const autoAssignRuleTypeEnum = z.enum(AUTO_ASSIGN_RULE_TYPES);

const autoAssignBody = z.object({
  ruleType: autoAssignRuleTypeEnum,
  targetKey: z.string().min(1).max(120),
  agentId: z.string().min(1).max(64),
  agentLabel: z.string().min(1).max(120),
  active: z.boolean().optional(),
  precedence: z.number().int().min(1).max(99).optional(),
});

const autoAssignPatchBody = z.object({
  ruleType: autoAssignRuleTypeEnum.optional(),
  targetKey: z.string().min(1).max(120).optional(),
  agentId: z.string().min(1).max(64).optional(),
  agentLabel: z.string().min(1).max(120).optional(),
  active: z.boolean().optional(),
  precedence: z.number().int().min(1).max(99).optional(),
});

const autoAssignReorderBody = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1).max(50),
});

adminRouter.get("/system/auto-assign", requireStaffPermission("system.team.manage"), (_req, res) => {
  res.json(listAutoAssignRules());
});

adminRouter.get("/system/auto-assign/options", requireStaffPermission("system.team.manage"), (_req, res) => {
  res.json({
    ...getAutoAssignOptions(),
    staff: listStaffUsers().filter((s) => s.isStaff),
    desks: listDesks({ page: 1, limit: 100, activeOnly: true }).rows.map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
      language: d.language,
      regionCode: d.region_code,
    })),
    ruleTypes: AUTO_ASSIGN_RULE_TYPES,
  });
});

adminRouter.get("/system/auto-assign/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid rule id." });
    return;
  }
  const rule = getAutoAssignRule(id);
  if (!rule) {
    res.status(404).json({ error: "Rule not found." });
    return;
  }
  res.json({ rule });
});

adminRouter.post("/system/auto-assign", requireStaffPermission("system.team.manage"), (req, res) => {
  const parsed = autoAssignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid auto-assign rule." });
    return;
  }
  try {
    const rule = createAutoAssignRule(parsed.data);
    res.status(201).json({ rule });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create rule." });
  }
});

adminRouter.patch("/system/auto-assign/reorder", requireStaffPermission("system.team.manage"), (req, res) => {
  const parsed = autoAssignReorderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid reorder payload." });
    return;
  }
  try {
    res.json(reorderAutoAssignPrecedence(parsed.data.orderedIds));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not reorder." });
  }
});

adminRouter.patch("/system/auto-assign/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid rule id." });
    return;
  }
  const parsed = autoAssignPatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid auto-assign rule." });
    return;
  }
  try {
    const rule = updateAutoAssignRule(id, parsed.data);
    if (!rule) {
      res.status(404).json({ error: "Rule not found." });
      return;
    }
    res.json({ rule });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update rule." });
  }
});

adminRouter.delete("/system/auto-assign/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid rule id." });
    return;
  }
  const ok = deleteAutoAssignRule(id);
  if (!ok) {
    res.status(404).json({ error: "Rule not found." });
    return;
  }
  res.json({ ok: true });
});

/* ---------------------- Regional desks ---------------------- */

const deskBody = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(64).optional(),
  regionCode: z.string().max(16).optional(),
  timezone: z.string().max(64).optional(),
  language: z.string().max(16).optional(),
  active: z.boolean().optional(),
  agentIds: z.array(z.string().min(1).max(64)).max(200).optional(),
});

const deskPatchBody = deskBody.partial();

adminRouter.get("/system/desks/stats", requireStaffPermission("system.team.manage"), (_req, res) => {
  res.json(getDeskStats());
});

adminRouter.get("/system/desks", requireStaffPermission("system.team.manage"), (req, res) => {
  const q = req.query;
  res.json(
    listDesks({
      search: typeof q.search === "string" ? q.search : undefined,
      page: Number(q.page) || 1,
      limit: Number(q.limit) || 10,
      sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
      sortDir: q.sortDir === "desc" ? "desc" : "asc",
      activeOnly: q.activeOnly === "1",
    }),
  );
});

adminRouter.get("/system/desks/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid desk id." });
    return;
  }
  const desk = getDesk(id);
  if (!desk) {
    res.status(404).json({ error: "Desk not found." });
    return;
  }
  res.json({ desk });
});

adminRouter.post("/system/desks", requireStaffPermission("system.team.manage"), (req, res) => {
  const parsed = deskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid desk payload." });
    return;
  }
  try {
    const desk = createDesk(parsed.data);
    res.status(201).json({ desk });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create desk." });
  }
});

adminRouter.patch("/system/desks/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid desk id." });
    return;
  }
  const parsed = deskPatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid desk payload." });
    return;
  }
  try {
    const desk = updateDesk(id, parsed.data);
    if (!desk) {
      res.status(404).json({ error: "Desk not found." });
      return;
    }
    res.json({ desk });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update desk." });
  }
});

adminRouter.delete("/system/desks/:id", requireStaffPermission("system.team.manage"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid desk id." });
    return;
  }
  try {
    const ok = deleteDesk(id);
    if (!ok) {
      res.status(404).json({ error: "Desk not found." });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: e instanceof Error ? e.message : "Could not delete desk." });
  }
});

const accountTypeBody = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().max(64).optional(),
  active: z.boolean().optional(),
  leverageDefault: z.number().min(1).max(1000).optional(),
  minDeposit: z.number().min(0).optional(),
  maxDeposit: z.number().min(0).optional(),
  spreadMarkupBps: z.number().min(0).max(500).optional(),
  bonusEligible: z.boolean().optional(),
  vipTier: z.number().min(0).max(10).optional(),
  description: z.string().max(2000).optional(),
  settings: z.record(z.unknown()).optional(),
});

const accountTypePatchBody = accountTypeBody.partial();

adminRouter.get("/system/account-types", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const q = req.query;
  res.json(
    listAccountTypes({
      search: typeof q.search === "string" ? q.search : undefined,
      page: Number(q.page) || 1,
      limit: Number(q.limit) || 10,
      sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
      sortDir: q.sortDir === "desc" ? "desc" : "asc",
      activeOnly: q.activeOnly === "1" || q.activeOnly === "true",
    }),
  );
});

adminRouter.get("/system/account-types/:id", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid account type id." });
    return;
  }
  const accountType = getAccountType(id);
  if (!accountType) {
    res.status(404).json({ error: "Account type not found." });
    return;
  }
  res.json({ accountType });
});

adminRouter.post("/system/account-types", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const parsed = accountTypeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account type." });
    return;
  }
  try {
    const accountType = createAccountType(parsed.data);
    res.status(201).json({ accountType });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create account type." });
  }
});

adminRouter.patch("/system/account-types/:id", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid account type id." });
    return;
  }
  const parsed = accountTypePatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid account type." });
    return;
  }
  try {
    const accountType = updateAccountType(id, parsed.data);
    if (!accountType) {
      res.status(404).json({ error: "Account type not found." });
      return;
    }
    res.json({ accountType });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update account type." });
  }
});

adminRouter.post("/system/account-types/:id/toggle-active", requireStaffPermission("system.commissions.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid account type id." });
    return;
  }
  const accountType = toggleAccountTypeActive(id);
  if (!accountType) {
    res.status(404).json({ error: "Account type not found." });
    return;
  }
  res.json({ accountType });
});

const clientStatusBody = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().max(64).optional(),
  colorHex: z.string().max(16).optional(),
  sortOrder: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const clientStatusPatchBody = clientStatusBody.partial();

adminRouter.get("/system/statuses/analytics", requireAdmin, (_req, res) => {
  res.json(getStatusCounts());
});

adminRouter.get("/system/statuses", requireAdmin, (req, res) => {
  const q = req.query;
  res.json(
    listClientStatuses({
      search: typeof q.search === "string" ? q.search : undefined,
      page: Number(q.page) || 1,
      limit: Number(q.limit) || 10,
      sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
      sortDir: q.sortDir === "desc" ? "desc" : "asc",
      activeOnly: q.activeOnly === "1" || q.activeOnly === "true",
    }),
  );
});

adminRouter.get("/system/statuses/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid status id." });
    return;
  }
  const status = getClientStatus(id);
  if (!status) {
    res.status(404).json({ error: "Status not found." });
    return;
  }
  res.json({ status });
});

adminRouter.post("/system/statuses", requireAdmin, (req, res) => {
  const parsed = clientStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  try {
    const status = createClientStatus(parsed.data);
    res.status(201).json({ status });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create status." });
  }
});

adminRouter.patch("/system/statuses/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid status id." });
    return;
  }
  const parsed = clientStatusPatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  try {
    const status = updateClientStatus(id, parsed.data);
    if (!status) {
      res.status(404).json({ error: "Status not found." });
      return;
    }
    res.json({ status });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update status." });
  }
});

adminRouter.post("/system/statuses/:id/toggle-active", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid status id." });
    return;
  }
  const status = toggleClientStatusActive(id);
  if (!status) {
    res.status(404).json({ error: "Status not found." });
    return;
  }
  res.json({ status });
});

const promoPurposeEnum = z.enum(["investor", "affiliate", "bonus", "demo", "custom"]);

const promoCodeBody = z.object({
  code: z.string().min(1).max(32),
  purpose: promoPurposeEnum.optional(),
  label: z.string().max(120).optional(),
  bonusAmount: z.number().min(0).nullable().optional(),
  bonusPercent: z.number().min(0).max(100).nullable().optional(),
  assignGroupId: z.string().max(64).nullable().optional(),
  assignAccountTypeId: z.number().int().positive().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().max(40).nullable().optional(),
});

adminRouter.get("/system/promo-codes", requireStaffPermission("marketing.edit"), (_req, res) => {
  res.json(listPromoCodes());
});

adminRouter.get("/system/promo-codes/options", requireStaffPermission("marketing.edit"), (_req, res) => {
  res.json(getPromoCodeOptions());
});

adminRouter.get("/system/promo-codes/:id", requireStaffPermission("marketing.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid promo code id." });
    return;
  }
  const promoCode = getPromoCode(id);
  if (!promoCode) {
    res.status(404).json({ error: "Promo code not found." });
    return;
  }
  res.json({ promoCode });
});

adminRouter.post("/system/promo-codes", requireStaffPermission("marketing.edit"), (req, res) => {
  const parsed = promoCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid promo code." });
    return;
  }
  try {
    const promoCode = createPromoCode(parsed.data);
    res.status(201).json({ promoCode });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create promo code." });
  }
});

adminRouter.delete("/system/promo-codes/:id", requireStaffPermission("marketing.edit"), (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid promo code id." });
    return;
  }
  try {
    const ok = deletePromoCode(id);
    if (!ok) {
      res.status(404).json({ error: "Promo code not found." });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not delete promo code." });
  }
});

const depositLimitPerm = requireStaffPermission("cashier.deposits.view");

const depositLimitBody = z.object({
  limitType: z.enum(DEPOSIT_LIMIT_TYPES),
  ftdOnly: z.boolean().optional(),
  currency: z.string().min(1).max(8),
  amount: z.number().positive(),
  visualAmount: z.string().max(64).optional(),
  pspProcessorId: z.string().uuid().nullable().optional(),
  countryCodes: z.array(z.string().min(2).max(3)).nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

const depositLimitPatchBody = depositLimitBody.partial();

adminRouter.get("/system/deposit-limits", depositLimitPerm, (req, res) => {
  const q = req.query;
  res.json(
    listDepositLimits({
      search: typeof q.search === "string" ? q.search : undefined,
      currency: typeof q.currency === "string" ? q.currency : undefined,
      limitType:
        q.limitType === "min" || q.limitType === "max" ? q.limitType : undefined,
      ftdOnly: q.ftdOnly === "1" ? true : q.ftdOnly === "0" ? false : undefined,
      pspProcessorId: typeof q.pspProcessorId === "string" ? q.pspProcessorId : undefined,
      activeOnly: q.activeOnly === "1" ? true : q.activeOnly === "0" ? false : undefined,
    }),
  );
});

adminRouter.get("/system/deposit-limits/options", depositLimitPerm, (_req, res) => {
  res.json(getDepositLimitOptions());
});

adminRouter.get("/system/deposit-limits/:id", depositLimitPerm, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid deposit limit id." });
    return;
  }
  const row = getDepositLimit(id);
  if (!row) {
    res.status(404).json({ error: "Deposit limit not found." });
    return;
  }
  res.json({ row, explanation: explainDepositLimitRule(row) });
});

adminRouter.post("/system/deposit-limits", depositLimitPerm, (req, res) => {
  const parsed = depositLimitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid deposit limit." });
    return;
  }
  try {
    const row = createDepositLimit(parsed.data);
    res.status(201).json({ row, explanation: explainDepositLimitRule(row) });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not create deposit limit." });
  }
});

adminRouter.patch("/system/deposit-limits/:id", depositLimitPerm, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid deposit limit id." });
    return;
  }
  const parsed = depositLimitPatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid deposit limit." });
    return;
  }
  try {
    const row = updateDepositLimit(id, parsed.data);
    res.json({ row, explanation: explainDepositLimitRule(row) });
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : "Could not update deposit limit." });
  }
});

adminRouter.delete("/system/deposit-limits/:id", depositLimitPerm, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid deposit limit id." });
    return;
  }
  const ok = deleteDepositLimit(id);
  if (!ok) {
    res.status(404).json({ error: "Deposit limit not found." });
    return;
  }
  res.json({ ok: true });
});

adminRouter.get("/system/countries", requireAdmin, (req, res) => {
  const q = req.query;
  res.json(
    listPlatformCountries({
      search: typeof q.search === "string" ? q.search : undefined,
      page: Number(q.page) || 1,
      limit: Number(q.limit) || 10,
      sortBy: typeof q.sortBy === "string" ? q.sortBy : undefined,
      sortDir: q.sortDir === "desc" ? "desc" : "asc",
    }),
  );
});

adminRouter.get("/system/countries/:id", requireAdmin, (req, res) => {
  const row = getPlatformCountry(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: "Country not found." });
    return;
  }
  res.json({ country: row });
});

adminRouter.patch("/system/countries/:id", requireAdmin, (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(120).optional(),
      allowVisits: z.boolean().optional(),
      allowReg: z.boolean().optional(),
      allowTrading: z.boolean().optional(),
      phonePrefix: z.string().max(8).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid country data." });
    return;
  }
  const row = updatePlatformCountry(Number(req.params.id), parsed.data);
  if (!row) {
    res.status(404).json({ error: "Country not found." });
    return;
  }
  res.json({ country: row });
});

adminRouter.get("/system/common-settings", requireAdmin, (_req, res) => {
  res.json({ settings: getCommonSettingsBundle() });
});

adminRouter.put("/system/common-settings", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid settings." });
    return;
  }
  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (typeof v === "string") patch[k] = v;
  }
  setPlatformSettings(patch);
  res.json({ settings: getCommonSettingsBundle() });
});

adminRouter.get("/integrations/metatrader", requireAdmin, (_req, res) => {
  res.json({ settings: getMetaTraderBridgeBundle() });
});

adminRouter.put("/integrations/metatrader", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid settings." });
    return;
  }
  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (typeof v === "string") patch[k] = v;
  }
  res.json({ settings: setMetaTraderBridge(patch) });
});

adminRouter.get("/system/preferences", requireAdmin, (_req, res) => {
  res.json({ settings: getPreferencesBundle() });
});

adminRouter.put("/system/preferences", requireAdmin, (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Invalid preferences." });
    return;
  }
  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (typeof v === "string") patch[k] = v;
  }
  res.json({ settings: setPreferences(patch) });
});

adminRouter.get("/system/common/security/view-logs", requireAdmin, (req, res) => {
  const q = req.query;
  const result = listSecurityViewLogs({
    userId: typeof q.userId === "string" ? q.userId : undefined,
    from: typeof q.from === "string" ? q.from : undefined,
    to: typeof q.to === "string" ? q.to : undefined,
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 50,
  });
  res.json(result);
});

/** Surface process errors to Super Admin when logging is enabled */
export function recordSuperAdminError(message: string, meta?: Record<string, unknown>): void {
  try {
    logPlatformEvent({ kind: "error", message, meta });
  } catch {
    /* best-effort */
  }
}
