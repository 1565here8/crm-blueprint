import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sessionCookie, signSessionToken, verifySessionToken } from "../auth/jwt";
import { getDb, initDatabase, revokeSessionToken } from "../../src/server/db";
import { issueCsrfToken } from "../middleware/csrf";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { asyncHandler } from "../middleware/errorHandler";
import { clientIp } from "../utils/clientIp";
import { secureCompare } from "../utils/secureCompare";

const AdminLoginBody = z.object({ secret: z.string().min(8).max(256) });

function setSession(res: Response, token: string) {
  res.cookie(sessionCookie.name, token, sessionCookie.options);
  issueCsrfToken(res);
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/csrf", (_req, res) => {
    res.json({ csrfToken: issueCsrfToken(res) });
  });

  app.post(
    "/api/auth/bootstrap",
    asyncHandler(async (req, res) => {
      if (req.session?.sub) {
        const cookieToken = req.cookies?.nc_session as string | undefined;
        if (cookieToken) {
          const prior = verifySessionToken(cookieToken);
          if (prior?.jti) await revokeSessionToken(prior.jti);
        }
        const token = signSessionToken({ sub: req.session.sub, role: req.session.role });
        setSession(res, token);
        const user = await getDb().getUser(req.session.sub);
        if (!user) {
          res.status(401).json({ error: "Session invalid." });
          return;
        }
        res.json({ user: { ...user.user, tokens: user.tokens.balance, role: req.session.role } });
        return;
      }

      const ip = clientIp(req);
      const userId = crypto.randomUUID();
      try {
        const created = await getDb().createUser(userId, ip);
        const token = signSessionToken({ sub: userId, role: "user" });
        setSession(res, token);
        res.json({ user: { ...created.user, tokens: created.tokens.balance, role: "user" } });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("Bootstrap limit")) {
          res.status(429).json({ error: "Account creation limit reached for this network." });
          return;
        }
        if (msg.includes("Database not initialized") || msg.includes("sqlite")) {
          res.status(503).json({
            error: "Database not ready. Close the app, run start-app.bat again (repairs SQLite).",
          });
          return;
        }
        throw err;
      }
    }),
  );

  app.post(
    "/api/auth/admin-login",
    asyncHandler(async (req, res) => {
      const parsed = AdminLoginBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request body." });
        return;
      }
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret || adminSecret.length < 16) {
        res.status(503).json({ error: "Admin login is not configured." });
        return;
      }
      if (!secureCompare(parsed.data.secret, adminSecret)) {
        res.status(401).json({ error: "Invalid admin credentials." });
        return;
      }
      const adminId = "platform-admin";
      await getDb().ensureAdminUser(adminId);
      const token = signSessionToken({ sub: adminId, role: "admin" });
      setSession(res, token);
      const user = await getDb().getUser(adminId);
      res.json({ user: { ...user!.user, tokens: user!.tokens.balance, role: "admin" } });
    }),
  );

  app.post(
    "/api/auth/logout",
    asyncHandler(async (req, res) => {
      const cookieToken = req.cookies?.nc_session as string | undefined;
      if (cookieToken) {
        const claims = verifySessionToken(cookieToken);
        if (claims?.jti) await revokeSessionToken(claims.jti);
      }
      res.clearCookie(sessionCookie.name, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      issueCsrfToken(res);
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await getDb().getUser(req.session!.sub);
      if (!user) {
        res.status(401).json({ error: "Session invalid." });
        return;
      }
      res.json({
        user: {
          ...user.user,
          tokens: user.tokens.balance,
          role: req.session!.role,
        },
      });
    }),
  );
}

export async function ensureDatabaseReady() {
  await initDatabase();
}
