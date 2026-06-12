import type { Express } from "express";
import { getDb } from "../../src/server/db";
import { getBillingConfig, getDeploymentConfig } from "../../src/server/deploymentConfig";
import { snapshotMetrics } from "../../src/server/metrics";
import { asyncHandler } from "../middleware/errorHandler";

export function registerHealthRoutes(app: Express) {
  app.get("/api/health", asyncHandler(async (_req, res) => {
    try {
      await getDb().getAdminMetrics();
      res.json({
        ok: true,
        mode: "local",
        provider: "ollama",
        database: "sqlite",
      });
    } catch (err) {
      res.status(503).json({
        ok: false,
        error: err instanceof Error ? err.message : "Health check failed.",
      });
    }
  }));

  app.get("/api/deployment", (_req, res) => {
    res.json(getDeploymentConfig());
  });

  app.get("/api/billing", (_req, res) => {
    res.json(getBillingConfig());
  });

  app.get("/api/metrics", (_req, res) => {
    res.json(snapshotMetrics());
  });
}

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/metrics", asyncHandler(async (_req, res) => {
    try {
      res.json(await getDb().getAdminMetrics());
    } catch (err) {
      res.json({ error: err instanceof Error ? err.message : "Failed" });
    }
  }));
}
