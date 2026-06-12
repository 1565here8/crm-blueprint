import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { secureCompare } from "../utils/secureCompare";

export const csrfCookie = {
  name: "nc_csrf",
  options: {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};

export function issueCsrfToken(res: Response) {
  const token = randomBytes(32).toString("hex");
  res.cookie(csrfCookie.name, token, csrfCookie.options);
  return token;
}

const EXEMPT = new Set([
  "/api/auth/bootstrap",
  "/api/auth/admin-login",
  "/api/watch/check",
  "/api/watch/intel/run",
  "/api/dagulai/billing/webhook",
  "/api/dagulai/billing/btcpay/webhook",
]);

export function requireCsrfForMutation(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }
  if (EXEMPT.has(req.path)) {
    next();
    return;
  }
  if (!req.cookies?.nc_session) {
    next();
    return;
  }
  const cookieToken = req.cookies[csrfCookie.name] as string | undefined;
  const headerToken = req.header("x-csrf-token");
  if (!cookieToken || !headerToken || !secureCompare(cookieToken, headerToken)) {
    res.status(403).json({ error: "CSRF token missing or invalid." });
    return;
  }
  next();
}
