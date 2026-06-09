import type { Request } from "express";

/** Client IP behind nginx / Cloudflare (trust proxy must be set). */
export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return req.ip || "unknown";
}
