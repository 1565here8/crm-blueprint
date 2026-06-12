/** Pricing tiers → inference lane mapping */

export type DagulaiTier = "guest" | "sprout" | "analyst" | "strategist" | "megamind" | "corporate" | "retainer";

export type TierConfig = {
  id: DagulaiTier;
  label: string;
  priceUsd: number | null;
  inferenceLane: "cloud" | "corporate";
  llmProduct: "Megamind Cloud" | "Megamind Private";
  features: string[];
};

export const DAGULAI_TIERS: Record<DagulaiTier, TierConfig> = {
  guest: {
    id: "guest",
    label: "Guest",
    priceUsd: null,
    inferenceLane: "cloud",
    llmProduct: "Megamind Cloud",
    features: ["4D quote preview", "Demo Megamind chat", "Pulse Desk — 7 impact briefs/day"],
  },
  sprout: {
    id: "sprout",
    label: "Sprout",
    priceUsd: 9,
    inferenceLane: "cloud",
    llmProduct: "Megamind Cloud",
    features: ["Unlimited Pulse impact briefs", "Demo Megamind chat", "Sprout tour + Wisdom"],
  },
  analyst: {
    id: "analyst",
    label: "Analyst",
    priceUsd: 49,
    inferenceLane: "cloud",
    llmProduct: "Megamind Cloud",
    features: ["Gemini or Groq cloud chat", "4D reads", "Pulse Desk unlimited", "Ultra-fast LPU/Gemini"],
  },
  strategist: {
    id: "strategist",
    label: "Strategist",
    priceUsd: 149,
    inferenceLane: "cloud",
    llmProduct: "Megamind Cloud",
    features: ["Full pipeline", "Copy Arena", "Broker vault", "Priority cloud lane"],
  },
  megamind: {
    id: "megamind",
    label: "Megamind",
    priceUsd: 399,
    inferenceLane: "corporate",
    llmProduct: "Megamind Private",
    features: ["Private Ollama node", "Fully decentralized", "No third-party AI", "For individuals"],
  },
  corporate: {
    id: "corporate",
    label: "Corporate Enterprise",
    priceUsd: null,
    inferenceLane: "corporate",
    llmProduct: "Megamind Private",
    features: [
      "Corporate fully decentralized AI",
      "Dedicated in-house Ollama",
      "Custom compliance",
      "SLA + autopilot hooks",
    ],
  },
  retainer: {
    id: "retainer",
    label: "White-Glove Retainer",
    priceUsd: 5000,
    inferenceLane: "corporate",
    llmProduct: "Megamind Private",
    features: [
      "We provision & operate your dedicated VPS",
      "Private LLM tailored to your domain",
      "Custom models, RAG, and compliance",
      "SLA — isolated infra, no shared tenants",
    ],
  },
};

export function normalizeTier(raw?: string | null): DagulaiTier | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t in DAGULAI_TIERS) return t as DagulaiTier;
  if (t === "enterprise") return "corporate";
  if (t === "private") return "megamind";
  if (t === "white-glove" || t === "whiteglove") return "retainer";
  return null;
}

export function resolveUserTier(opts?: {
  tier?: string | null;
  userRole?: string | null;
}): DagulaiTier {
  const fromHeader = normalizeTier(opts?.tier);
  if (fromHeader) return fromHeader;
  if (opts?.userRole === "retainer") return "retainer";
  if (opts?.userRole === "corporate" || opts?.userRole === "admin") return "corporate";
  if (opts?.userRole === "megamind") return "megamind";
  return "guest";
}

export function tierInferenceLane(tier: DagulaiTier): "cloud" | "corporate" {
  return DAGULAI_TIERS[tier].inferenceLane;
}

export function listTierCatalog() {
  return Object.values(DAGULAI_TIERS);
}
