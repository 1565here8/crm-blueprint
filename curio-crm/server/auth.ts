import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SessionUser } from "./types";

const COOKIE = "ws_session";

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars).");
  }
  return secret;
}

export function signSession(user: SessionUser): string {
  return jwt.sign(user, sessionSecret(), { expiresIn: "7d" });
}

export function readSession(req: Request): SessionUser | null {
  const token = req.cookies?.[COOKIE] as string | undefined;
  if (!token) return null;
  try {
    return jwt.verify(token, sessionSecret()) as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  req.sessionUser = session;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.sessionUser?.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    next();
  });
}

declare global {
  namespace Express {
    interface Request {
      sessionUser?: SessionUser;
    }
  }
}

export { COOKIE };
