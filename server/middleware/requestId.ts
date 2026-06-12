import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const id = (req.header("x-request-id") ?? randomUUID()).slice(0, 64);
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
