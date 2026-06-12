import { POPULAR_SYMBOLS } from "./marketData";
import { cacheStats, clearQuoteCache } from "./quoteCache";
import { clearRankCache } from "./cryptoRankEngine";
import { getDb } from "../db";
import { migrateDagulaiTables } from "./migrate";
import { initDagulaiSignalsDb, purgeExpiredDagulaiSignals } from "./signalsDb";
import { initDagulaiExchangeVault } from "./exchangeVault";
import { initDagulaiCopyTrading } from "./copy/copyTrading";
import { initPulseDb } from "./pulse/pulseDb";
import { initDagulaiSubscriptionsDb } from "./billing/subscriptionsDb";
import { initChatQuotaDb } from "./chat/quota";
import { initCryptoChargesDb } from "./billing/cryptoCheckout";
import { initBtcpayInvoicesDb } from "./billing/btcpayCheckout";
import { initBotsDb } from "./botFactory/botsDb";
import { analyzePendingPulseItems, pulseEnabled } from "./pulse/pulseService";
import { PULSE_FREEMIUM_DAILY } from "./pulse/quota";
import { dagulaiApiConfig, DAGULAI_VERSION } from "./config";
import { getDagulaiPrivacyManifest } from "./privacy";
import { getMegamindLaneStatus } from "./llm/megamindRouter";
import { defaultInferenceLane, geminiConfigured, corporateLaneEnabled, getHybridInferenceStatus } from "./llm/inferenceLanes";
import {
  getEarlyIntelRunnerStatus,
  startEarlyIntelBackgroundJobs,
  stopEarlyIntelBackgroundJobs,
} from "./earlyIntel/runner";
import { earlyIntelPollMs } from "./earlyIntel/sources";
import { getDagulaiChainMcpManifest } from "./chain/mcpManifest";
import { getDagulaiUnifiedMcpManifest } from "./mcp/unifiedManifest";
import { botForgeEnabled } from "./botFactory/mcpManifest";
import { chainVibeEnabled } from "./chain/config";

function legacyEnv(primary: string, fallback: string): string | undefined {
  return process.env[primary]?.trim() || process.env[fallback]?.trim() || undefined;
}

export function dagulaiEnabled(): boolean {
  const raw = legacyEnv("DAGULAI_ENABLED", "AIOFWALLSTREET_ENABLED")?.toLowerCase();
  return raw !== "false";
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let purgeTimer: ReturnType<typeof setInterval> | null = null;

export function getDagulaiPollMs(): number {
  const raw = Number(legacyEnv("DAGULAI_QUOTE_POLL_MS", "AIOF_QUOTE_POLL_MS") ?? 0);
  return Number.isFinite(raw) && raw >= 250 ? raw : 0;
}

export async function initDagulaiModule(): Promise<void> {
  if (!dagulaiEnabled()) return;

  try {
    const driver = getDb().getDriver();
    await migrateDagulaiTables(driver);
    initDagulaiSignalsDb(driver);
    initDagulaiExchangeVault(driver);
    initDagulaiCopyTrading(driver);
    initPulseDb(driver);
    initDagulaiSubscriptionsDb(driver);
    initChatQuotaDb(driver);
    initCryptoChargesDb(driver);
    initBtcpayInvoicesDb(driver);
    initBotsDb(driver);
    await purgeExpiredDagulaiSignals();
    if (pulseEnabled()) {
      void analyzePendingPulseItems(8);
    }
  } catch (e) {
    console.warn("[dagulai] vault init failed (app continues):", e instanceof Error ? e.message : e);
  }

  startEarlyIntelBackgroundJobs();

  const pollMs = getDagulaiPollMs();
  if (pollMs > 0) {
    pollTimer = setInterval(() => {
      clearQuoteCache();
      clearRankCache();
    }, pollMs);
    pollTimer.unref?.();
  }

  purgeTimer = setInterval(() => {
    purgeExpiredDagulaiSignals().catch(() => {});
  }, 60 * 60 * 1000);
  purgeTimer.unref?.();

  const intel = getEarlyIntelRunnerStatus();
  // eslint-disable-next-line no-console
  console.log(
    `[dagulai] ${DAGULAI_LOG_NAME} enabled · quote cache ${cacheStats().ttlMs}ms` +
      (pollMs ? ` · quote poll ${pollMs}ms` : "") +
      ` · early intel poll ${intel.pollMs}ms`,
  );
}

const DAGULAI_LOG_NAME = "dagulai.com";

export function shutdownDagulaiModule(): void {
  if (pollTimer) clearInterval(pollTimer);
  if (purgeTimer) clearInterval(purgeTimer);
  pollTimer = null;
  purgeTimer = null;
  stopEarlyIntelBackgroundJobs();
  clearQuoteCache();
  clearRankCache();
}

export function getDagulaiStatusPayload() {
  const finnhub = Boolean(process.env.FINNHUB_API_KEY?.trim());
  const apis = dagulaiApiConfig();
  const privacy = getDagulaiPrivacyManifest();
  const earlyIntel = getEarlyIntelRunnerStatus();
  const chainMcp = getDagulaiChainMcpManifest();
  return {
    product: "DagulAI",
    brand: "dagulai",
    domain: "dagulai.com",
    version: DAGULAI_VERSION,
    tagline: "The future of wealth — Megamind intelligence for markets that move billions",
    enabled: dagulaiEnabled(),
    privacy,
    megamind: {
      defaultLane: defaultInferenceLane(),
      cloudReady: geminiConfigured() || getMegamindLaneStatus("cloud").demoMode,
      corporateAvailable: corporateLaneEnabled(),
      cloud: getMegamindLaneStatus("cloud"),
      corporate: getMegamindLaneStatus("corporate"),
      tiers: getHybridInferenceStatus().tiers,
    },
    assets: POPULAR_SYMBOLS,
    dataSources: {
      crypto: "CoinGecko (live)",
      stocks: finnhub ? "Finnhub (live)" : "Demo until FINNHUB_API_KEY set",
    },
    latency: {
      quoteCacheMs: cacheStats().ttlMs,
      quotePollMs: getDagulaiPollMs(),
      intelPollMs: earlyIntelPollMs(),
      vpsHint: "VPS: DAGULAI_QUOTE_CACHE_MS=250 · DAGULAI_INTEL_POLL_MS=800 for state-of-the-art speed",
    },
    earlyIntel,
    pulseDesk: {
      enabled: pulseEnabled(),
      tagline: "Which assets, direct and indirect, and how — on every headline",
      freemiumLimitPerDay: PULSE_FREEMIUM_DAILY,
      premiumTiers: ["analyst", "strategist", "megamind", "corporate", "retainer"],
    },
    chainKitchen: {
      enabled: chainVibeEnabled(),
      baseMcpUrl: chainMcp.baseMcp.url,
      templates: chainMcp.templates.length,
      vibeCoding: true,
    },
    botForge: {
      enabled: botForgeEnabled(),
      mcp: "/api/dagulai/bots/mcp",
      unifiedMcp: "/api/dagulai/mcp",
      phase: 2,
      tagline: "Build · Deploy · Enjoy — trading bots from prompts",
    },
    mcp: getDagulaiUnifiedMcpManifest(),
    modules: {
      megamind4d: true,
      cryptoRank: true,
      intelligencePipeline: true,
      botScanner: true,
      botForge: botForgeEnabled(),
      earlyIntel: earlyIntel.enabled,
      chainVibe: chainVibeEnabled(),
      copyArena: true,
    },
    streams: {
      cryptorank: apis.cryptorank.enabled,
      santiment: apis.santiment.enabled,
      lunarcrush: apis.lunarcrush.enabled,
      myfxbook: apis.myfxbook.enabled,
      earlyIntel: earlyIntel.enabled,
      chainVibe: chainVibeEnabled(),
    },
    dimensions: [
      "D1 Trend & Momentum",
      "D2 Flow & Liquidity",
      "D3 Cross-Asset Correlation",
      "D4 Risk / Reward",
    ],
    disclaimer: "Analysis and education only — not financial advice.",
  };
}
