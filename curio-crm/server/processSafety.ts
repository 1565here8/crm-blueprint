/**
 * Process-level safety net — the server must never crash from a single error.
 *
 * Three layers of defense:
 *  1. process.on("uncaughtException") / "unhandledRejection" → log and stay alive
 *  2. asyncRoute() wrapper → any thrown error in a route flows to Express error handler
 *  3. globalErrorHandler() → final Express middleware that returns JSON, never throws
 *
 * Plus: gracefulShutdown() for SIGTERM/SIGINT so pm2 reload drains connections cleanly.
 */
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import type { Server } from "http";
import { messageForServerStatus } from "../shared/maintenanceCopy";
import { error as logErr, log } from "./log";

let shuttingDown = false;
let registered = false;

export function installProcessSafety(server?: Server): void {
  if (registered) return;
  registered = true;

  process.on("uncaughtException", (err) => {
    logErr("[process] uncaughtException:", err instanceof Error ? err.message : String(err));
  });

  process.on("unhandledRejection", (reason) => {
    logErr(
      "[process] unhandledRejection:",
      reason instanceof Error ? reason.message : String(reason),
    );
  });

  process.on("warning", (warn) => {
    if (warn.name !== "DeprecationWarning") {
      logErr("[process] warning:", warn.message);
    }
  });

  if (!server) return;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`[process] ${signal} received — draining connections`);
    server.close(() => {
      log("[process] HTTP server closed cleanly");
      process.exit(0);
    });
    // Force exit if drain takes too long (pm2 will restart us)
    setTimeout(() => {
      logErr("[process] drain timeout, forcing exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

/**
 * Wrap an async Express route handler so any rejected promise reaches
 * the global error middleware instead of becoming an unhandledRejection.
 *
 * Usage: router.get("/foo", asyncRoute(async (req, res) => { ... }))
 */
export function asyncRoute(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Final Express middleware — must be registered LAST. Catches any error
 * thrown synchronously or passed to next(err). Never throws.
 */
export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status =
    typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
      ? err.status
      : 500;

  const rawMessage = err instanceof Error ? err.message : "Internal error";
  const safeMessage = rawMessage
    .replace(/password|secret|token|@[\w.-]+/gi, "[redacted]")
    .slice(0, 200);

  logErr(
    `[express] ${req.method} ${req.path} -> ${status}: ${safeMessage}`,
    err instanceof Error ? err.stack : undefined,
  );

  if (res.headersSent) return;

  const publicMessage =
    status >= 500
      ? messageForServerStatus(status)
      : process.env.NODE_ENV === "production"
        ? safeMessage.replace(/\bat\s+[\w./\\-]+:\d+:\d+\b/g, "").trim() || "Request failed."
        : safeMessage;

  res.status(status).json({
    error: publicMessage,
  });
};
