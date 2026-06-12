/** Launch lane: fast cloud Gemini (zero VPS). Corporate lane: private decentralized Ollama. */

import { resolveUserTier, tierInferenceLane, type DagulaiTier, listTierCatalog } from "./tiers";
import { demoModeActive } from "./demoFallback";
import { groqConfigured, dagulaiGroqModel } from "./groqChat";
import { xaiConfigured, dagulaiXaiModel } from "./xaiChat";

export { groqConfigured, xaiConfigured };
import { ollamaChatComplete } from "../../../api/ollamaChat";

export type DagulaiInferenceLane = "cloud" | "corporate";

export type LlmProviderId =
  | "gemini-cloud"
  | "groq-cloud"
  | "xai-cloud"
  | "demo-fallback"
  | "ollama-corporate"
  | "ollama-local-fallback";

export type InferenceLaneConfig = {
  lane: DagulaiInferenceLane;
  label: string;
  zeroVpsCost: boolean;
  provider: LlmProviderId;
  model: string;
  host: string;
  thirdPartyVendor: boolean;
  promptsLeaveDevice: boolean;
  corporateInHouse: boolean;
  demoMode: boolean;
};

export function defaultInferenceLane(): DagulaiInferenceLane {
  const raw = process.env.DAGULAI_INFERENCE_LANE?.trim().toLowerCase();
  if (raw === "corporate" || raw === "private") return "corporate";
  return "cloud";
}

export function corporateLaneEnabled(): boolean {
  return (
    process.env.DAGULAI_CORPORATE_LANE_ENABLED?.trim().toLowerCase() === "true" ||
    Boolean(process.env.DAGULAI_CORPORATE_OLLAMA_URL?.trim())
  );
}

export function geminiConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim(),
  );
}

export function ollamaLocalReachable(): boolean {
  return Boolean(process.env.OLLAMA_HOST?.trim() || process.env.DAGULAI_ALLOW_LOCAL_OLLAMA === "true");
}

export function dagulaiGeminiModel(): string {
  return process.env.DAGULAI_GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

export function dagulaiCorporateOllamaHost(): string {
  return (
    process.env.DAGULAI_CORPORATE_OLLAMA_URL?.trim() ||
    process.env.DAGULAI_PRIVATE_CLOUD_URL?.trim() ||
    process.env.OLLAMA_HOST?.trim() ||
    "http://127.0.0.1:11434"
  ).replace(/\/$/, "");
}

export function dagulaiCorporateOllamaModel(): string {
  return (
    process.env.DAGULAI_CORPORATE_OLLAMA_MODEL?.trim() ||
    process.env.DAGULAI_OLLAMA_MODEL?.trim() ||
    process.env.OLLAMA_MODEL?.trim() ||
    "llama3.2:3b"
  );
}

function cloudPickOrder(): Array<"xai" | "groq" | "gemini"> {
  const prefer = process.env.DAGULAI_CLOUD_PREFER?.trim().toLowerCase();
  if (prefer === "xai") return ["xai", "groq", "gemini"];
  if (prefer === "groq") return ["groq", "gemini", "xai"];
  if (prefer === "gemini") return ["gemini", "groq", "xai"];
  return ["gemini", "groq", "xai"];
}

export function resolveCloudProvider(): LlmProviderId {
  const hasGemini = geminiConfigured();
  const hasGroq = groqConfigured();
  const hasXai = xaiConfigured();
  for (const pick of cloudPickOrder()) {
    if (pick === "xai" && hasXai) return "xai-cloud";
    if (pick === "groq" && hasGroq) return "groq-cloud";
    if (pick === "gemini" && hasGemini) return "gemini-cloud";
  }
  if (demoModeActive()) return "demo-fallback";
  return "demo-fallback";
}

/** Megamind Cloud — Gemini, Groq LPU, or xAI Grok. Ollama is Edge/Private only. */
export function fastCloudConfigured(): boolean {
  return geminiConfigured() || groqConfigured() || xaiConfigured();
}

export function resolveInferenceLane(opts?: {
  requestedLane?: string | null;
  userRole?: string | null;
  tier?: string | null;
}): DagulaiInferenceLane {
  const userTier = resolveUserTier({ tier: opts?.tier, userRole: opts?.userRole });
  const tierLane = tierInferenceLane(userTier);

  const wantCorporate =
    opts?.requestedLane?.toLowerCase() === "corporate" ||
    tierLane === "corporate" ||
    opts?.userRole === "corporate";

  if (wantCorporate && corporateLaneEnabled()) return "corporate";
  return "cloud";
}

export function getInferenceLaneConfig(lane?: DagulaiInferenceLane): InferenceLaneConfig {
  const resolved = lane ?? defaultInferenceLane();

  if (resolved === "corporate") {
    return {
      lane: "corporate",
      label: "Megamind Private — decentralized in-house AI",
      zeroVpsCost: false,
      provider: "ollama-corporate",
      model: dagulaiCorporateOllamaModel(),
      host: dagulaiCorporateOllamaHost(),
      thirdPartyVendor: false,
      promptsLeaveDevice: true,
      corporateInHouse: true,
      demoMode: false,
    };
  }

  const provider = resolveCloudProvider();
  const groqCloud = provider === "groq-cloud";
  const xaiCloud = provider === "xai-cloud";
  return {
    lane: "cloud",
    label: provider === "gemini-cloud"
      ? "Megamind Cloud — Gemini Flash"
      : groqCloud
        ? "Megamind Cloud — Groq LPU (ultra-fast)"
        : xaiCloud
          ? "Megamind Cloud — xAI Grok"
          : "Megamind Cloud — demo mode (add GEMINI, GROQ, or XAI key)",
    zeroVpsCost: true,
    provider,
    model: provider === "gemini-cloud"
      ? dagulaiGeminiModel()
      : groqCloud
        ? dagulaiGroqModel()
        : xaiCloud
          ? dagulaiXaiModel()
          : "4D-math-template",
    host: provider === "gemini-cloud"
      ? "generativelanguage.googleapis.com"
      : groqCloud
        ? "api.groq.com"
        : xaiCloud
          ? "api.x.ai"
          : "dagulai-local-demo",
    thirdPartyVendor: provider === "gemini-cloud" || groqCloud || xaiCloud,
    promptsLeaveDevice: provider !== "demo-fallback",
    corporateInHouse: false,
    demoMode: provider === "demo-fallback",
  };
}

export function launchPricingHint() {
  return {
    cloud: {
      tier: "Guest / Analyst / Strategist",
      product: "Megamind Cloud",
      infra: "Gemini Flash, Groq LPU, or xAI Grok — fast cloud API (required for cloud lane)",
      speed: "Low-latency cloud inference",
      priceFromUsd: 49,
    },
    pocket: {
      tier: "Pocket Premium (individuals)",
      product: "Megamind Edge",
      infra: "Ollama on your phone or laptop — prompts stay on your device",
      speed: "Private on-device inference",
      priceFromUsd: 99,
    },
    corporate: {
      tier: "Megamind (individuals) / Corporate Enterprise",
      product: "Megamind Private",
      infra: "Fully decentralized Ollama — your node, no third-party AI",
      speed: "Dedicated private inference + SLA",
      priceFromUsd: 399,
    },
    retainer: {
      tier: "White-Glove Retainer",
      product: "AllMagus Tailored",
      infra: "Dedicated VPS + private LLM we operate — tuned to client needs",
      speed: "Custom SLA, models, and compliance",
      priceFromUsd: 5000,
    },
  };
}

export function getHybridInferenceStatus() {
  const cloud = getInferenceLaneConfig("cloud");
  const corporate = getInferenceLaneConfig("corporate");
  return {
    defaultLane: defaultInferenceLane(),
    demoMode: cloud.demoMode,
    geminiConfigured: geminiConfigured(),
    groqConfigured: groqConfigured(),
    xaiConfigured: xaiConfigured(),
    corporateAvailable: corporateLaneEnabled(),
    tiers: listTierCatalog(),
    cloud,
    corporate,
    pricing: launchPricingHint(),
  };
}

/** Probe local Ollama once for corporate fallback (non-throwing). */
export async function tryLocalOllamaComplete(
  messages: Parameters<typeof ollamaChatComplete>[0]["messages"],
): Promise<string | null> {
  if (!ollamaLocalReachable()) return null;
  try {
    return await ollamaChatComplete({
      host: dagulaiCorporateOllamaHost(),
      model: dagulaiCorporateOllamaModel(),
      messages,
      keepAlive: "0",
    });
  } catch {
    return null;
  }
}

export { resolveUserTier, type DagulaiTier, listTierCatalog };
