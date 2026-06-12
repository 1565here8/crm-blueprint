import type { Request } from "express";

export function clientIp(req: Request) {
  return req.ip || "unknown";
}
