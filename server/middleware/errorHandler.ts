import type { NextFunction, Request, Response, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found." });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : "Internal server error.";
  const status = err instanceof HttpError ? err.status : 500;
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ level: "error", requestId: req.requestId, message }));
  if (!res.headersSent) {
    const isDev = process.env.NODE_ENV !== "production";
    const hint =
      err instanceof HttpError
        ? message
        : isDev && /ERR_DLOPEN|better-sqlite3|Database not initialized/i.test(message)
          ? "Database module broken. Run: npm run repair-native then restart start-app.bat"
          : isDev
            ? message
            : "Internal server error.";
    res.status(status).json({
      error: hint,
      ...(err instanceof HttpError ? err.extra : {}),
    });
  }
}
