/**
 * Mac Ollama tunnel — dedicated routes (never 404 on wrong /admin/desk path).
 * Admin session required; no tenant/license gate (tunnel wire must always work).
 */
import { Router, json as expressJson } from "express";
import fs from "node:fs";
import path from "node:path";
import { connectAiWallstreet, getBrokerAiSetup } from "../aiBridge";
import { ollamaStatus, syncMacDeskModelsEnv, warmDeskFastModel } from "../ollama";

const KIT_FILES = ["mac-ollama-connect.py", "mac_ollama_bridge", "GO-LIVE-MAC-AI.command"] as const;

function kitDir(): string {
  return path.join(process.cwd(), "mac-ai-kit");
}

export const macBridgeRouter = Router();

/** Admin download — Mac kit (no AirDrop needed). */
macBridgeRouter.get("/kit/:name", (req, res) => {
  const name = req.params.name;
  if (!KIT_FILES.includes(name as (typeof KIT_FILES)[number])) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const file = path.join(kitDir(), name);
  if (!fs.existsSync(file)) {
    res.status(404).json({ error: "kit not deployed on server" });
    return;
  }
  if (name.endsWith(".command")) res.setHeader("content-type", "application/x-sh");
  res.setHeader("content-disposition", `attachment; filename="${name}"`);
  res.sendFile(file);
});

macBridgeRouter.get("/kit", (_req, res) => {
  res.json({
    files: KIT_FILES,
    hint: "Download each file to Mac Desktop (same folder), then double-click GO-LIVE-MAC-AI.command",
    urls: KIT_FILES.map((f) => `/api/mac-bridge/kit/${f}`),
  });
});
macBridgeRouter.get("/status", async (_req, res) => {
  try {
    res.json({ ...(await ollamaStatus()), setup: getBrokerAiSetup() });
  } catch {
    res.json({
      available: false,
      model: "unknown",
      baseUrl: "",
      installedModels: [],
      error: "status check failed",
    });
  }
});

macBridgeRouter.post("/sync", async (_req, res) => {
  try {
    const models = await syncMacDeskModelsEnv();
    void warmDeskFastModel();
    res.json({ ok: Boolean(models?.length), models: models ?? [] });
  } catch {
    res.json({ ok: false, models: [] });
  }
});

macBridgeRouter.post("/connect", expressJson(), async (req, res) => {
  try {
    const host = typeof req.body?.host === "string" ? req.body.host : undefined;
    res.json(await connectAiWallstreet(host, false));
  } catch {
    res.status(500).json({
      ok: false,
      connected: false,
      restarted: false,
      message: "Turn On AI failed — open Ollama on the manager PC, Expose to network ON, try again.",
    });
  }
});
