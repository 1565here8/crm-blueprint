import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../auth/jwt";
import { isSessionTokenRevoked } from "../../src/server/db";

export const attachSession = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const cookieToken = req.cookies?.nc_session as string | undefined;
    let token: string | undefined = cookieToken;

    if (process.env.NODE_ENV !== "production") {
      const bearer = req.header("authorization");
      if (bearer?.startsWith("Bearer ")) token = bearer.slice(7).trim();
    }

    if (token) {
      const claims = verifySessionToken(token);
      if (claims && !(await isSessionTokenRevoked(claims.jti))) {
        req.session = claims;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.sub) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}
