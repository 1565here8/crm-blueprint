import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { adminRouter } from "./routes/admin.routes";
import { assistantRouter } from "./routes/assistant.routes";
import { authRouter } from "./routes/auth.routes";
import { conciergeRouter } from "./routes/concierge.routes";
import { marketRouter } from "./routes/market.routes";
import { userRouter } from "./routes/user.routes";
import { presenceRouter } from "./routes/presence.routes";
import { vaultRouter } from "./routes/vault.routes";
import { tenantRouter } from "./routes/tenant.routes";
import { securityRouter } from "./routes/security.routes";
import { requireActiveTenant } from "./tenantStatus";
import { requireAdminPerimeter } from "./adminPerimeter";
import { requireVendorLicense, startVendorLicenseHeartbeat } from "./vendorLicense";
import { getCrmBranding } from "./db";
import { log } from "./log";
import "./db";
import { ensureSpreadProfilesSchema } from "./spreadProfiles";
import { ensureDepositLimitsSchema } from "./depositLimits";
import { ensureCryptoCommissionsSchema } from "./cryptoCommissions";
import { ensureForexCommissionsSchema } from "./forexCommissions";
import "./desk/schema";
import { seedDefaultCampaignsIfEmpty, startDripScanner } from "./dripEngine";
import { startAutoAuditScheduler } from "./securityAutoAudit";
import { autoConnectOllamaOnBoot, startHostedAiKeeper, startMacTailscaleWatcher } from "./aiBridge";
import { syncMacDeskModelsEnv, warmDeskFastModel } from "./ollama";
import { clientIp } from "./utils/clientIp";
import { warmOllamaModel, warmDeskFastModel, ollamaStatus } from "./ollama";
import { globalErrorHandler, installProcessSafety } from "./processSafety";
import { buildMarketBriefFast } from "./marketBrief";
import { isAdminHostname } from "../shared/adminHosts";
import {
  isSearchIndexingEnabled,
  ROBOTS_ALLOW_ALL,
  ROBOTS_DISALLOW_ALL,
  X_ROBOTS_NOINDEX,
} from "../shared/searchIndexing";
import { isPublicSiteOffline, publicSiteOfflineGate } from "./publicSiteGate";
import { legacyHostRedirect } from "./legacyHostRedirect";
import { curionilabsHardDisconnect } from "./curionilabsHardDisconnect";
import { compromisedHostBlock } from "./compromisedHostBlock";
import {
  crmAdminBaseUrl,
  isCrmAdminHostname,
  isCurionilabsIsolation,
  isMobileTraderHost,
  publicSiteBaseUrl,
} from "../shared/productHosts";
import { requestHostname } from "./requestHost";
import { demoNarrationHandler, demoNarrationLimiter, demoVoicesHandler } from "./demoNarration";
import { requireAdmin, requireAuth } from "./auth";
import { macBridgeRouter } from "./routes/macBridge.routes";

ensureSpreadProfilesSchema();
ensureDepositLimitsSchema();
ensureCryptoCommissionsSchema();
ensureForexCommissionsSchema();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const isDev = process.env.NODE_ENV !== "production";

const curionilabsOnly = isCurionilabsIsolation();
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://www.curionilabs.com";
const ADMIN_URL =
  process.env.ADMIN_URL ?? "https://admin.curionilabs.com";

function corsOrigins(): Set<string> {
  const raw = process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    return new Set([
      PUBLIC_SITE_URL,
      ADMIN_URL,
      "https://curionilabs.com",
      "https://www.curionilabs.com",
      "https://hub.curionilabs.com",
      "https://trader.curionilabs.com",
    ]);
  }
  return new Set(list);
}

const allowedOrigins = corsOrigins();

const app = express();

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (isDev) {
        callback(null, true);
        return;
      }
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "5mb" }));
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }
  next(err);
});
app.use(cookieParser());

/** Retired vendor DNS → curionilabs.com (all subdomains, path preserved). */
app.use(legacyHostRedirect());



if (!isSearchIndexingEnabled()) {
  app.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", X_ROBOTS_NOINDEX);
    next();
  });
}

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain");
  res.send(isSearchIndexingEnabled() ? ROBOTS_ALLOW_ALL : ROBOTS_DISALLOW_ALL);
});

app.use(publicSiteOfflineGate());

/** Wrong host/path bookmarks → live CRM admin. */
app.use((req, res, next) => {
  const host = requestHostname(req);
  const p = req.path;
  const adminBase = crmAdminBaseUrl(host);
  res.setHeader("X-CRM-Admin-Url", adminBase);
  if (p === "/crm" || p.startsWith("/crm/")) {
    const tail = p.length > 4 ? p.slice(4) : "";
    res.redirect(302, `${adminBase}/admin${tail}`);
    return;
  }
  if ((p === "/admin" || p.startsWith("/admin/")) && !isCrmAdminHostname(host)) {
    const tail = p === "/admin" ? "" : p.slice("/admin".length);
    res.redirect(302, `${adminBase}/admin${tail}`);
    return;
  }
  next();
});

/** CRM admin hosts — operator console */
app.use((req, res, next) => {
  const host = requestHostname(req);
  if (!isAdminHostname(host)) {
    next();
    return;
  }
  const p = req.path;
  if (p.startsWith("/api") || p.startsWith("/assets") || /\.[a-z0-9]+$/i.test(p)) {
    next();
    return;
  }
  if (p === "/" || p === "/login" || p === "/signup" || p === "/about" || p === "/contact" || p.startsWith("/legal")) {
    res.redirect(302, "/admin");
    return;
  }
  next();
});
app.use(
  rateLimit({
    windowMs: 60_000,
    // CRM backoffice polls users/online/dashboard — 200/min was too low
    max: isDev ? 10_000 : 1_000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/api/health" || req.path === "/api/ready",
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "wallstreet-sim", ready: true });
});

app.get("/api/ready", async (_req, res) => {
  try {
    const ollama = await ollamaStatus();
    res.json({
      ok: true,
      service: "wallstreet-sim",
      ollama: ollama.available,
      ollamaError: ollama.available ? undefined : ollama.error,
    });
  } catch {
    res.json({ ok: true, service: "wallstreet-sim", ollama: false, ollamaError: "status check failed" });
  }
});

app.get("/api/public/branding", (_req, res) => {
  res.json({ branding: getCrmBranding() });
});

app.get("/api/public/config", (req, res) => {
  const host = requestHostname(req);
  const offline = isPublicSiteOffline(host);
  const publicSiteUrl = publicSiteBaseUrl(host);
  const adminUrl = crmAdminBaseUrl(host);
  res.setHeader("X-CRM-Admin-Url", adminUrl);
  res.json({
    publicSiteUrl,
    adminUrl,
    adminPath: "/admin",
    apiBase: "/api",
    adminApiBase: "/api/admin",
    publicSiteOffline: offline,
    rebranding: offline,
  });
});

app.get("/api/public/demo-voices", demoVoicesHandler);
app.post("/api/public/demo-narration", demoNarrationLimiter, (req, res) => {
  void demoNarrationHandler(req, res);
});

app.use("/api/auth", authRouter);
app.use("/api/concierge", conciergeRouter);

/** Mac tunnel: Jersey localhost pushes model sync — no PM2 restart, no auth */
app.post("/api/internal/mac-sync", async (req, res) => {
  const ip = clientIp(req);
  if (ip !== "127.0.0.1" && ip !== "::1" && !ip.startsWith("::ffff:127.0.0.1")) {
    res.status(403).json({ error: "localhost only" });
    return;
  }
  try {
    const models = await syncMacDeskModelsEnv();
    void warmDeskFastModel();
    res.json({ ok: Boolean(models?.length), models: models ?? [] });
  } catch {
    res.json({ ok: false, models: [] });
  }
});

/** Mac tunnel connect — admin only, no tenant gate (must not 404) */
app.use("/api/mac-bridge", requireAuth, requireAdmin, macBridgeRouter);

/**
 * Master billing kill-switch. EVERY admin / user / trading / market
 * route is gated behind the tenant's `is_active` flag. The vendor
 * (us) flips this to false the moment the broker stops paying, and
 * the entire CRM + trading platform freezes — without us ever
 * touching the broker's actual data.
 *
 * Health checks, public branding, login and the tenant-status admin
 * endpoint itself stay reachable so an owner can pay-up and unfreeze.
 */
app.use("/api/admin/system/tenant-status", tenantRouter);
app.use("/api/admin/security", requireActiveTenant, requireVendorLicense, requireAdminPerimeter, securityRouter);
app.use("/api/admin/desk", requireActiveTenant, requireVendorLicense, requireAdminPerimeter, assistantRouter);
/** Alias: /api/desk/connect (without /admin) — Mac scripts, old URLs */
app.use("/api/desk", requireActiveTenant, requireVendorLicense, requireAdminPerimeter, assistantRouter);
app.use("/api/admin/vault", requireActiveTenant, requireVendorLicense, requireAdminPerimeter, vaultRouter);
app.use("/api/admin", requireActiveTenant, requireVendorLicense, requireAdminPerimeter, adminRouter);
app.use("/api/user", requireActiveTenant, requireVendorLicense, userRouter);
app.use("/api/market", requireActiveTenant, requireVendorLicense, marketRouter);
app.use("/api/presence", presenceRouter);

const dist = path.join(__dirname, "..", "dist");

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

app.use(
  "/assets",
  express.static(path.join(dist, "assets"), {
    immutable: true,
    maxAge: ONE_YEAR_SECONDS * 1000,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
    },
  }),
);

app.use(
  express.static(dist, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (/\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(filePath)) {
        res.setHeader("Cache-Control", `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
      }
    },
  }),
);

const mobileTraderHtml = path.join(dist, "mobile-trader", "index.html");

app.get(["/mobile", "/mobile/*"], (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(mobileTraderHtml, (err) => {
    if (err) next();
  });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const host = requestHostname(req);
  const shell = isMobileTraderHost(host) ? mobileTraderHtml : path.join(dist, "index.html");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.sendFile(shell, (err) => {
    if (err) next();
  });
});

app.use(globalErrorHandler);

seedDefaultCampaignsIfEmpty();
startDripScanner();
startAutoAuditScheduler();

const httpServer = app.listen(PORT, () => {
  log(`[wallstreet-sim] listening :${PORT} silent=${process.env.SILENT_MODE === "1" ? "yes" : "no"}`);
  startVendorLicenseHeartbeat();
  void warmOllamaModel();
  void buildMarketBriefFast(6_000);
  setTimeout(() => void autoConnectOllamaOnBoot(), 12_000);
  startHostedAiKeeper();
  startMacTailscaleWatcher();
  setInterval(() => void warmDeskFastModel(), 8 * 60 * 1000);
});
installProcessSafety(httpServer);
