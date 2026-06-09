import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  clearSessionCookie,
  readSession,
  requireAuth,
  setSessionCookie,
  signSession,
} from "../auth";
import { getUserByUsername, verifyPassword, resolveUserForLogin, touchUserLastLogin, getUserById } from "../db";
import { isAlpacaConfigured, usesFreeLiveFeeds } from "../marketData";
import { getMarketStatus } from "../marketHours";
import { registerPublicClient } from "../crmUsers";
import { error as logError } from "../log";
import { getStaffRecord } from "../staffPermissions";
import { logHistoryEvent } from "../historyLogs";
import { logSecurityViewEvent } from "../securityViewLogs";
import { logFailedLoginAttempt, touchIpVisitor } from "../securityIntelligence";
import { checkAdminConsoleAccess } from "../adminPerimeter";
import { clientIp } from "../utils/clientIp";

import { userSummary } from "../trading";

const registerSchema = z.object({
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(1).max(64),
  email: z.string().email().max(128),
  password: z.string().min(8).max(128),
  countryCode: z.string().min(2).max(3),
  phone: z.string().min(6).max(32),
  promoCode: z.string().max(32).optional(),
  currency: z.enum(["USD", "EUR", "GBP"]).optional(),
  acceptedTerms: z.literal(true),
  notUsCitizen: z.literal(true),
  campaign: z.string().max(64).optional(),
});

const loginSchema = z.object({
  username: z.string().min(2).max(128),
  password: z.string().min(4).max(128),
});

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Wait a few minutes and try again." },
});

authRouter.get("/session", async (req, res) => {
  try {
    const session = readSession(req);
    if (!session) {
      res.json({ authenticated: false });
      return;
    }
    const impersonating = Boolean(session.impersonatorId);
    const impersonator = session.impersonatorId ? getUserById(session.impersonatorId) : undefined;
    const summary = await userSummary(session.id);
    const staff = session.role === "admin"
      ? { isAdmin: true, isStaff: true, permissions: [] as string[] }
      : (() => {
          const rec = getStaffRecord(session.id);
          return { isAdmin: false, isStaff: rec.isStaff, permissions: rec.permissions as string[] };
        })();
    res.json({
      authenticated: true,
      user: { ...summary, ...staff },
      impersonating,
      impersonatorUsername: impersonator?.username,
      freeLiveFeeds: usesFreeLiveFeeds(),
      alpacaConfigured: isAlpacaConfigured(),
      market: getMarketStatus(),
      platform: {
        paymentGateway: false,
        note: "No card or bank deposits. Admin funds accounts directly.",
      },
    });
  } catch (err) {
    logError("[auth/session]", err);
    res.status(500).json({ error: "Session check failed. Please retry." });
  }
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid credentials payload." });
      return;
    }

    const ip = clientIp(req);
    const user = resolveUserForLogin(parsed.data.username);
    if (!user || !verifyPassword(user, parsed.data.password)) {
      logFailedLoginAttempt(ip, parsed.data.username);
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }
    const staffRec = getStaffRecord(user.id);
    const access = checkAdminConsoleAccess({
      ip,
      role: user.role,
      isStaff: user.role === "admin" || staffRec.isStaff,
    });
    if (!access.allowed) {
      if (user.role === "admin" || staffRec.isStaff) {
        logSecurityViewEvent({
          agentId: user.username,
          action: "login_ip_blocked",
          ip,
        });
      }
      res.status(403).json({ error: access.reason ?? "Login blocked from this network." });
      return;
    }

    const token = signSession({ id: user.id, username: user.username, role: user.role });
    setSessionCookie(res, token);
    try {
      touchUserLastLogin(user.id);
    } catch {
      /* profile may not exist for legacy admin accounts */
    }
    if (user.role === "admin" || staffRec.isStaff) {
      logHistoryEvent({
        actionType: "login",
        executedBy: user.username,
        routeName: "auth/login",
        actionedOn: user.username,
        actionedOnId: user.id,
      });
      logSecurityViewEvent({
        agentId: user.username,
        action: "login",
        ip,
      });
      touchIpVisitor({
        ip,
        actor: user.username,
        userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
      });
    }
    const staff =
      user.role === "admin"
        ? { isAdmin: true, isStaff: true, permissions: [] as string[] }
        : (() => {
            const rec = getStaffRecord(user.id);
            return { isAdmin: false, isStaff: rec.isStaff, permissions: rec.permissions as string[] };
          })();
    res.json({
      user: { ...(await userSummary(user.id)), ...staff },
      freeLiveFeeds: usesFreeLiveFeeds(),
      alpacaConfigured: isAlpacaConfigured(),
      market: getMarketStatus(),
      platform: {
        paymentGateway: false,
        note: "No card or bank deposits. Admin funds accounts directly.",
      },
    });
  } catch (err) {
    logError("[auth/login]", err);
    res.status(500).json({ error: "Login failed. Please retry." });
  }
});

authRouter.post("/register", loginLimiter, async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid registration data. Check all required fields." });
      return;
    }

    const profile = registerPublicClient(parsed.data);
    const user = getUserByUsername(profile.username);
    if (!user) {
      res.status(500).json({ error: "Registration failed." });
      return;
    }

    const token = signSession({ id: user.id, username: user.username, role: user.role });
    setSessionCookie(res, token);
    try {
      touchUserLastLogin(user.id);
    } catch {
      /* profile exists for CRM users */
    }
    res.status(201).json({
      user: await userSummary(user.id),
      freeLiveFeeds: usesFreeLiveFeeds(),
      alpacaConfigured: isAlpacaConfigured(),
      market: getMarketStatus(),
      profile: {
        displayId: profile.displayId,
        email: profile.email,
        crmStatus: profile.crmStatus,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed.";
    const status = message.includes("already") ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

authRouter.post("/stop-impersonate", requireAuth, async (req, res) => {
  try {
    const session = req.sessionUser!;
    if (!session.impersonatorId) {
      res.status(400).json({ error: "Not viewing as a client." });
      return;
    }
    const admin = getUserById(session.impersonatorId);
    if (!admin || admin.role !== "admin") {
      clearSessionCookie(res);
      res.status(403).json({ error: "Original admin session is no longer valid." });
      return;
    }
    const token = signSession({ id: admin.id, username: admin.username, role: admin.role });
    setSessionCookie(res, token);
    res.json({
      user: await userSummary(admin.id),
      impersonating: false,
      freeLiveFeeds: usesFreeLiveFeeds(),
      alpacaConfigured: isAlpacaConfigured(),
      market: getMarketStatus(),
    });
  } catch (err) {
    logError("[auth/stop-impersonate]", err);
    res.status(500).json({ error: "Could not return to admin session." });
  }
});

authRouter.post("/logout", requireAuth, (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
