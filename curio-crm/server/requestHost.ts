import type { Request } from "express";
import { normalizeHostname } from "../shared/productHosts";

/** Host from proxy/nginx (X-Forwarded-Host) or Express — used for product redirects. */
export function requestHostname(req: Request): string {
  const forwarded = req.get("x-forwarded-host");
  const raw = forwarded?.split(",")[0]?.trim() || req.hostname || req.get("host") || "";
  return normalizeHostname(raw);
}
