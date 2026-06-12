import express, { type Express } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "node:path";
import { initDatabase, shutdownDatabase } from "../src/server/db";
import { asyncHandler } from "./middleware/errorHandler";
import { attachSession as attachSessionImpl } from "./middleware/auth";
import { requireCsrfForMutation } from "./middleware/csrf";
import { buildCorsMiddleware } from "./middleware/cors";
import { requestIdMiddleware } from "./middleware/requestId";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerHealthRoutes, registerAdminRoutes } from "./routes/health.routes";

function configureTrustProxy(app: Express) {
  const shouldTrust =
    process.env.NODE_ENV === "production" ||
    process.env.SERVE_CLIENT === "true" ||
    process.env.TRUST_PROXY?.trim();
  if (shouldTrust) {
    app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1) || 1);
  }
}

export async function createApp(): Promise<Express> {
  await initDatabase();

  const app = express();
  configureTrustProxy(app);

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production"
        ? {
            useDefaults: true,
            directives: {
              "script-src": ["'self'", "'unsafe-inline'"],
            },
          }
        : false,
    }),
  );
  app.use(buildCorsMiddleware());
  app.use(requestIdMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(asyncHandler(attachSessionImpl));
  app.use("/api", requireCsrfForMutation);

  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerAdminRoutes(app);
  app.use("/api", notFoundHandler);

  const distDir = path.resolve(process.cwd(), "dist");
  const { existsSync } = await import("node:fs");
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("/{*path}", (req, res, next) => {
      if (req.path.startsWith("/api")) { next(); return; }
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}

export async function shutdownApp() {
  await shutdownDatabase();
}
