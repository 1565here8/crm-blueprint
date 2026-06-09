import type { NextFunction, Request, Response } from "express";
import { isAdminHostname } from "../shared/adminHosts";
import { publicRebrandHtml, publicRebrandMessage } from "../shared/publicSiteOffline";
import { requestHostname } from "./requestHost";

/** Rebrand/offline flags — admin hosts unchanged; public site can be disabled per env. */
export function isPublicSiteOffline(host?: string): boolean {
  const rebranding = process.env.PUBLIC_SITE_REBRANDING === "1";
  const offline = process.env.PUBLIC_SITE_OFFLINE === "1";
  if (!rebranding && !offline) return false;
  if (host) {
    const h = host.toLowerCase();
    if (isAdminHostname(h)) return false;
  }
  return rebranding || offline;
}

const PUBLIC_API_ALLOW = new Set([
  "/api/health",
  "/api/ready",
  "/api/public/config",
  "/api/public/branding",
  "/api/public/demo-voices",
  "/api/public/demo-narration",
]);

export function publicSiteOfflineGate() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const host = requestHostname(req);
    if (!isPublicSiteOffline(host)) {
      next();
      return;
    }
    const p = req.path;
    if (PUBLIC_API_ALLOW.has(p)) {
      next();
      return;
    }
    if (p.startsWith("/api")) {
      res.status(503).json({ error: publicRebrandMessage(), offline: true, rebranding: true });
      return;
    }
    if (p.startsWith("/assets")) {
      next();
      return;
    }
    res.status(503).type("html").send(publicRebrandHtml());
  };
}
