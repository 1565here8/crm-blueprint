/**
 * KNOWME / Wallstreet AI deployment tiers — admin demo + agent preemptive Q&A.
 * Single source for UI panels, wiki articles, and instant answers (no LLM).
 */

export type KnowmeAiTierId = "management" | "agent" | "enterprise";

export type KnowmeAiTier = {
  id: KnowmeAiTierId;
  label: string;
  audience: string;
  engine: string;
  latency: string;
  hardware: string;
  canDo: string[];
  cannotDo: string[];
};

export const KNOWME_AI_TIERS: KnowmeAiTier[] = [
  {
    id: "management",
    label: "Management tier (~10 users)",
    audience: "Owners, supervisors, compliance — this admin demo",
    engine: "Live Ollama on GPU laptop (or vLLM on-prem server)",
    latency: "2–5 s — real generation for drafts and analysis",
    hardware: "RTX 4060+ laptop, or shared 4×4090 + vLLM for full desk",
    canDo: [
      "Draft custom emails and call scripts from live client notes",
      "Operator / collections briefs with narrative reasoning",
      "Explain non-standard CRM edge cases when Ollama is online",
      "Pair with KNOWME wiki + Visual Flows for onboarding CEOs",
    ],
    cannotDo: [
      "Serve 100 simultaneous live generations on one Ollama instance",
      "Replace compliance-approved agent scripts (agents use preemptive Q&A)",
      "Run without GPU when you need sub-second creative drafts at scale",
    ],
  },
  {
    id: "agent",
    label: "Agent tier (~90 users)",
    audience: "Floor sales agents — preemptive Q&A only",
    engine: "Semantic lookup — encyclopedia + desk fast-path (zero GPU)",
    latency: "<100 ms — verified answers, no on-the-fly generation",
    hardware: "Any office PC — CPU + local/network vector cache",
    canDo: [
      "Instant answers to top 500–1,000 pre-approved questions",
      "CRM how-to: Pending In, Hot Leads, spreads, permissions (wiki links)",
      "Demo tour, morning routine, golden-path flows via KNOWME slides",
      "Queue unknown questions for management review overnight",
    ],
    cannotDo: [
      "Invent policy language or hallucinate coverage terms",
      "Analyze a specific client's private notes without management tier",
      "Use live LLM when desk.ask / Ollama is reserved for supervisors",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise tier (optional)",
    audience: "100+ concurrent live AI — insurance-scale compliance",
    engine: "vLLM (recommended) or 3–5 Ollama instances behind Nginx",
    latency: "Sub-second at scale with PagedAttention / load balancing",
    hardware: "4× RTX 4090 (96 GB VRAM), 256 GB RAM, 10 GbE — Ubuntu server",
    canDo: [
      "80–120 concurrent live requests with Llama 70B (quantized) on vLLM",
      "Data sovereignty — PII never leaves the building",
      "Fine-tune LoRA on your policy library",
    ],
    cannotDo: [
      "Run on a single consumer PC with raw Ollama for 100 users",
      "Match agent-tier safety if you expose live generation to all 90 agents",
    ],
  },
];

export const KNOWME_OLLAMA_VS_VLLM = {
  problem:
    "Standard Ollama degrades after ~10–20 concurrent users — latency jumps from ms to seconds.",
  ollamaFix:
    "Run 3–5 Ollama instances on different ports/GPUs + Nginx round-robin, or use OLLAMA_NUM_PARALLEL per instance.",
  vllmAdvantage:
    "vLLM PagedAttention handles ~5–10× more concurrent users on the same GPUs — industry default for production.",
  hybridDefault:
    "Budget path: 10 management laptops with Ollama + 90 agents on preemptive Q&A (this CRM's default split).",
};

export function formatKnowmeArchitectureAnswer(): string {
  const mgmt = KNOWME_AI_TIERS.find((t) => t.id === "management")!;
  const agent = KNOWME_AI_TIERS.find((t) => t.id === "agent")!;
  const lines = [
    "[[knowme|KNOWME]] AI architecture — 10 management + 90 agents",
    "",
    "**This admin demo** uses the **management tier**: wiki + Visual Flows always work; live [[street_ai|Wallstreet AI]] when Ollama is online.",
    "",
    `**${mgmt.label}** (${mgmt.engine})`,
    ...mgmt.canDo.map((c) => `• Can: ${c}`),
    ...mgmt.cannotDo.map((c) => `• Cannot: ${c}`),
    "",
    `**${agent.label}** (${agent.engine})`,
    ...agent.canDo.map((c) => `• Can: ${c}`),
    ...agent.cannotDo.map((c) => `• Cannot: ${c}`),
    "",
    "**Scale-up:** " + KNOWME_OLLAMA_VS_VLLM.vllmAdvantage,
    "**Budget default:** " + KNOWME_OLLAMA_VS_VLLM.hybridDefault,
  ];
  return lines.join("\n");
}

export function matchesKnowmeArchitectureQuery(q: string): boolean {
  const m = q.toLowerCase();
  return (
    /ollama|vllm|v-llm|100 user|concurrent|gpu|rtx|management tier|agent tier|preemptive|pre-emptive|semantic cache|hybrid ai|ai architecture|who gets live|live ai|power tier|standard tier/.test(
      m,
    ) || /what can knowme|what can.?t knowme|what cannot/.test(m)
  );
}
