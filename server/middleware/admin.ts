import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "./auth";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.session?.role !== "admin") {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    next();
  });
}
