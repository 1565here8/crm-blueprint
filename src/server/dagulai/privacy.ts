import { dagulaiMegamindComplete, dagulaiMegamindStream } from "./llm/megamindRouter";
import {
  corporateLaneEnabled,
  dagulaiCorporateOllamaHost,
  defaultInferenceLane,
  geminiConfigured,
  groqConfigured,
  xaiConfigured,
  getInferenceLaneConfig,
  launchPricingHint,
} from "./llm/inferenceLanes";
import { cloudPrivacyManifest, dagulaiNoVendorTraining } from "./llm/cloudPrivacy";
import { demoModeActive } from "./llm/demoFallback";
import { listTierCatalog } from "./llm/tiers";
import { dagulaiOllamaHost, dagulaiOllamaModel } from "./config";

export type DagulaiLlmMode = "cloud" | "corporate" | "local" | "private-cloud" | "auto" | "demo";

export type DagulaiPrivacyManifest = {
  product: "dagulai";
  domain: "dagulai.com";
  inferenceLane: "cloud" | "corporate";
  llmMode: DagulaiLlmMode;
  llmProvider: "gemini-cloud" | "demo-fallback" | "ollama-corporate" | "ollama-local" | "ollama-private-cloud";
  llmHost: string;
  llmModel: string;
  zeroVpsLaunchMode: boolean;
  corporateInHouseAvailable: boolean;
  demoMode: boolean;
  promptsLeaveDevice: boolean;
  privateCloud: boolean;
  chatPromptsPersisted: false;
  dataSold: false;
  usedForModelTraining: boolean;
  noVendorTraining: boolean;
  vendorStoreDisabled: boolean;
  thirdPartyAiVendors: boolean;
  minimalLogging: boolean;
  signalRetentionHours: number;
  exchangeKeysEncrypted: boolean;
  secureDefaults: boolean;
  pricingHint: ReturnType<typeof launchPricingHint>;
  notes: string[];
};

export type HybridPrivacyManifest = {
  hybrid: true;
  defaultLane: "cloud" | "corporate";
  demoMode: boolean;
  geminiConfigured: boolean;
  cloud: DagulaiPrivacyManifest;
  corporate: DagulaiPrivacyManifest;
  tiers: ReturnType<typeof listTierCatalog>;
};

const BLOCKED_PUBLIC_HOSTS = [
  "api.openai.com",
  "openai.com",
  "api.anthropic.com",
  "api.groq.com",
  "openrouter.ai",
  "api.together.xyz",
];

export function dagulaiMinimalLogging(): boolean {
  return process.env.DAGULAI_MINIMAL_LOGGING?.trim().toLowerCase() !== "false";
}

export function dagulaiRequireAuth(): boolean {
  const raw = process.env.DAGULAI_REQUIRE_AUTH?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function dagulaiSignalRetentionHours(): number {
  const raw = Number(process.env.DAGULAI_SIGNAL_TTL_HOURS ?? 72);
  return Number.isFinite(raw) && raw > 0 ? Math.min(raw, 8760) : 72;
}

export function dagulaiRequireTrustedLlm(): boolean {
  return process.env.DAGULAI_REQUIRE_TRUSTED_LLM?.trim().toLowerCase() !== "false";
}

function isBlockedPublicHost(hostname: string) {
  const h = hostname.toLowerCase();
  return BLOCKED_PUBLIC_HOSTS.some((b) => h === b || h.endsWith(`.${b}`));
}

function validateCorporateOllamaHost(hostUrl: string) {
  let hostname: string;
  try {
    hostname = new URL(hostUrl).hostname;
  } catch {
    throw new Error(`Invalid Ollama host URL: ${hostUrl}`);
  }
  if (isBlockedPublicHost(hostname)) {
    throw new Error(`Blocked host ${hostname} for corporate lane.`);
  }
}

export function vaultMasterKeyConfigured(): boolean {
  const key = process.env.DAGULAI_VAULT_MASTER_KEY?.trim();
  return Boolean(key && key.length >= 32);
}

function mapProvider(cfg: ReturnType<typeof getInferenceLaneConfig>): DagulaiPrivacyManifest["llmProvider"] {
  if (cfg.provider === "gemini-cloud") return "gemini-cloud";
  if (cfg.provider === "groq-cloud") return "gemini-cloud";
  if (cfg.provider === "xai-cloud") return "gemini-cloud";
  if (cfg.provider === "demo-fallback") return "demo-fallback";
  return "ollama-corporate";
}

function laneNotes(cfg: ReturnType<typeof getInferenceLaneConfig>): string[] {
  if (cfg.lane === "cloud" && cfg.provider === "groq-cloud") {
    return [
      "Megamind Cloud: prompts sent to Groq (Llama 70B) — disclosed third-party vendor.",
      "No Google account required. Free tier available at console.groq.com.",
      "Chat prompts never INSERTed to database.",
    ];
  }
  if (cfg.lane === "cloud" && cfg.provider === "xai-cloud") {
    return [
      "Megamind Cloud: prompts sent to xAI Grok — disclosed third-party vendor.",
      "store=false on every API call — xAI does not retain request/response on server.",
      "xAI does not train on API data without permission (xAI API Terms).",
      "Chat prompts never INSERTed to dagulai database.",
      ...cloudPrivacyManifest().notes.slice(1),
    ];
  }
  if (cfg.lane === "cloud" && cfg.provider === "gemini-cloud") {
    return [
      "Megamind Cloud: prompts sent to Google Gemini — disclosed third-party vendor.",
      "Stateless generateContent only — no File API, context cache, or Interactions store.",
      "Google paid API: prompts not used to train models (Gemini API Terms).",
      "Chat prompts never INSERTed to dagulai database.",
    ];
  }
  if (cfg.lane === "cloud" && cfg.provider === "demo-fallback") {
    return [
      "Demo mode: 4D math template replies — no external LLM, no API key required.",
      "Add GEMINI_API_KEY or GROQ_API_KEY to upgrade Megamind Cloud.",
      "Chat prompts never INSERTed to database.",
    ];
  }
  return [
    "Megamind Private: decentralized Ollama on your VPS — no third-party AI vendor.",
    "Premium corporate tier — prompts stay on your infrastructure.",
    "Chat prompts never INSERTed to database.",
    corporateLaneEnabled()
      ? "Corporate private AI available — Megamind Enterprise."
      : "Enable DAGULAI_CORPORATE_LANE_ENABLED when VPS is ready.",
  ];
}

export function getDagulaiPrivacyManifest(lane?: "cloud" | "corporate"): DagulaiPrivacyManifest {
  const resolved = lane ?? defaultInferenceLane();
  const cfg = getInferenceLaneConfig(resolved);
  const minimal = dagulaiMinimalLogging();
  const provider = mapProvider(cfg);
  const cloudPrivacy = cloudPrivacyManifest();

  return {
    product: "dagulai",
    domain: "dagulai.com",
    inferenceLane: cfg.lane,
    llmMode:
      cfg.provider === "demo-fallback"
        ? "demo"
        : cfg.lane === "cloud"
          ? "cloud"
          : "corporate",
    llmProvider: provider,
    llmHost: cfg.host,
    llmModel: cfg.model,
    zeroVpsLaunchMode: cfg.lane === "cloud",
    corporateInHouseAvailable: corporateLaneEnabled(),
    demoMode: cfg.demoMode,
    promptsLeaveDevice: cfg.lane === "corporate" || cfg.provider === "demo-fallback",
    privateCloud: cfg.corporateInHouse,
    chatPromptsPersisted: false,
    dataSold: false,
    usedForModelTraining: !dagulaiNoVendorTraining(),
    noVendorTraining: cloudPrivacy.noVendorTraining,
    vendorStoreDisabled: cfg.provider === "xai-cloud" ? !cloudPrivacy.xaiStoreOnServer : true,
    thirdPartyAiVendors: cfg.thirdPartyVendor,
    minimalLogging: minimal,
    signalRetentionHours: dagulaiSignalRetentionHours(),
    exchangeKeysEncrypted: vaultMasterKeyConfigured(),
    secureDefaults:
      cfg.lane === "cloud"
        ? geminiConfigured() || cfg.demoMode
        : corporateLaneEnabled(),
    pricingHint: launchPricingHint(),
    notes: laneNotes(cfg),
  };
}

export function getHybridPrivacyManifest(): HybridPrivacyManifest {
  const cloudCfg = getInferenceLaneConfig("cloud");
  return {
    hybrid: true,
    defaultLane: defaultInferenceLane(),
    demoMode: cloudCfg.demoMode,
    geminiConfigured: geminiConfigured(),
    cloud: getDagulaiPrivacyManifest("cloud"),
    corporate: getDagulaiPrivacyManifest("corporate"),
    tiers: listTierCatalog(),
  };
}

export function assertDagulaiTrustedLlm() {
  const lane = defaultInferenceLane();
  if (lane === "cloud") {
    if (!geminiConfigured() && !groqConfigured() && !xaiConfigured() && !demoModeActive()) {
      throw new Error("Cloud lane: set GEMINI_API_KEY, GROQ_API_KEY, XAI_API_KEY, or enable DAGULAI_DEMO_LLM.");
    }
    return;
  }
  validateCorporateOllamaHost(dagulaiCorporateOllamaHost());
}

export async function dagulaiLlmComplete(
  options: import("../../api/ollamaChat").OllamaChatOptions & {
    userRole?: string | null;
    tier?: string | null;
  },
): Promise<string> {
  return dagulaiMegamindComplete(options);
}

export async function* dagulaiLlmStream(
  options: import("../../api/ollamaChat").OllamaChatOptions & {
    userRole?: string | null;
    tier?: string | null;
  },
): AsyncGenerator<string> {
  yield* dagulaiMegamindStream(options);
}

export function sanitizeSignalForStorage(args: {
  brutalMarketReality: string | null;
  rawStew: unknown;
}): { brutalMarketReality: string | null; rawStew: string | null } {
  if (!dagulaiMinimalLogging()) {
    return {
      brutalMarketReality: args.brutalMarketReality,
      rawStew: JSON.stringify(args.rawStew),
    };
  }
  return {
    brutalMarketReality: args.brutalMarketReality
      ? args.brutalMarketReality.slice(0, 120) + (args.brutalMarketReality.length > 120 ? "…" : "")
      : null,
    rawStew: null,
  };
}

/** Legacy exports for corporate Ollama host resolution */
export function resolveDagulaiOllamaHost(): string {
  return defaultInferenceLane() === "corporate"
    ? dagulaiCorporateOllamaHost()
    : dagulaiOllamaHost();
}

export { dagulaiOllamaModel };
