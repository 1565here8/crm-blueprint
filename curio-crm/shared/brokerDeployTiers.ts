/**
 * Broker deployment tiers — KNOWME sales pack + instant encyclopedia answers.
 * Full printable guide: BROKER-DEPLOY-TIERS.md (repo root).
 */

export type BrokerDeployTier = {
  id: string;
  name: string;
  tagline: string;
  whoInstalls: string;
  crmHost: string;
  ollamaHost: string;
  agentNeeds: string;
  ramNote: string;
  bestFor: string;
  pitchLine: string;
};

export const BROKER_DEPLOY_TIERS: BrokerDeployTier[] = [
  {
    id: "desk_lite",
    name: "Desk Lite",
    tagline: "Browser-only entry",
    whoInstalls: "You host CRM; broker opens Chrome",
    crmHost: "Your VPS (4–8 GB RAM, dedicated IP)",
    ollamaHost: "Off or cloud later",
    agentNeeds: "Any normal PC — no local AI",
    ramNote: "Agent PC: standard office spec",
    bestFor: "Pilot desks, AI deferred",
    pitchLine: "CRM in the cloud today — add intelligence when they are ready.",
  },
  {
    id: "desk_pro",
    name: "Desk Pro",
    tagline: "Cheapest real AI (recommended)",
    whoInstalls: "CRM on VPS + management installs Ollama once",
    crmHost: "Your VPS — Jersey-style dedicated host",
    ollamaHost: "Owner / ops manager PC or one office mini-PC",
    agentNeeds: "Browser only — all agents share one AI brain",
    ramNote: "16 GB RAM minimum on the one AI machine (8 GB = tiny models only)",
    bestFor: "5–50 agents, single office, lowest spend",
    pitchLine:
      "We host your CRM in the cloud; you run AI once on the manager PC. Agents just open a browser — no per-seat AI hardware.",
  },
  {
    id: "floor_enterprise",
    name: "Floor Enterprise",
    tagline: "Call-center grade",
    whoInstalls: "CRM central + one AI server per office",
    crmHost: "Your VPS or broker-dedicated server",
    ollamaHost: "One LAN server per floor (32–64 GB RAM)",
    agentNeeds: "Thin clients or normal PCs — no Ollama per desk",
    ramNote: "32–64 GB on the floor server — not on every agent PC",
    bestFor: "20+ agents, low latency, privacy on LAN",
    pitchLine: "One AI server for the whole floor — not forty separate installs.",
  },
  {
    id: "agent_elite",
    name: "Agent Elite",
    tagline: "Per-desk local AI",
    whoInstalls: "Ollama on each agent workstation",
    crmHost: "Central VPS",
    ollamaHost: "Each agent PC",
    agentNeeds: "32 GB RAM per seat + local Ollama",
    ramNote: "Only when broker pays for hardware — expensive at scale",
    bestFor: "Regulated shops that mandate on-desk inference",
    pitchLine: "Maximum isolation — quote hardware per seat explicitly.",
  },
  {
    id: "white_label_saas",
    name: "White-label SaaS",
    tagline: "Zero install for broker",
    whoInstalls: "You host CRM + Ollama",
    crmHost: "Your infrastructure",
    ollamaHost: "Your GPU/RAM server (32 GB+ for shared models)",
    agentNeeds: "Browser only",
    ramNote: "Your infra bill rises; broker install cost = zero",
    bestFor: "Brokers who refuse any local IT",
    pitchLine: "Fully managed — they log in; you operate models and uptime.",
  },
];

export const BROKER_RAM_MATRIX = [
  { ram: "8 GB", models: "phi3 mini, qwen2.5:0.5b", use: "Demo / dev only" },
  { ram: "16 GB", models: "llama3, mistral 7B–8B", use: "Desk Pro — one office AI host" },
  { ram: "32 GB", models: "13B or concurrent 7B users", use: "Floor server or Agent Elite seat" },
  { ram: "64 GB+", models: "Multiple models / heavier concurrency", use: "Enterprise floor or your SaaS host" },
] as const;

export const BROKER_DEPLOY_RULES = [
  "Do not put Ollama on every agent PC unless they pay for Agent Elite hardware.",
  "Cheapest winning setup: VPS CRM + one local Ollama machine (16 GB+) on management PC or office NUC.",
  "Call centers: one shared AI server (32–64 GB) on the LAN — not 40 separate installs.",
  "Agents never need 32 GB if AI is centralized — only the AI host does.",
  "Open port 11434 only to CRM via VPN/Tailscale — never expose Ollama to the public internet.",
  "Set OLLAMA_BASE_URL on the VPS .env to the broker AI host (Tailscale IP or office LAN).",
] as const;

export function formatBrokerDeployTiersAnswer(expanded = false): string {
  const lines: string[] = [
    "BROKER INSTALL PACKS — how to sell CurioCRM + Ollama",
    "",
    "One-line pitch (Desk Pro):",
    BROKER_DEPLOY_TIERS.find((t) => t.id === "desk_pro")!.pitchLine,
    "",
  ];

  for (const tier of BROKER_DEPLOY_TIERS) {
    lines.push(`▸ ${tier.name} — ${tier.tagline}`);
    lines.push(`  CRM: ${tier.crmHost}`);
    lines.push(`  Ollama: ${tier.ollamaHost}`);
    lines.push(`  Agents: ${tier.agentNeeds}`);
    lines.push(`  RAM: ${tier.ramNote}`);
    lines.push(`  Best for: ${tier.bestFor}`);
    if (expanded) lines.push(`  Pitch: ${tier.pitchLine}`);
    lines.push("");
  }

  lines.push("RAM vs models:");
  for (const row of BROKER_RAM_MATRIX) {
    lines.push(`  • ${row.ram} → ${row.models} (${row.use})`);
  }

  if (expanded) {
    lines.push("");
    lines.push("Operator rules:");
    for (const rule of BROKER_DEPLOY_RULES) {
      lines.push(`  • ${rule}`);
    }
    lines.push("");
    lines.push("Full printable guide: BROKER-DEPLOY-TIERS.md in the CurioCRM repo.");
    lines.push("KNOWME → Broker packs tab for the visual tier picker.");
  }

  return lines.join("\n");
}

export function matchesBrokerDeployQuery(q: string): boolean {
  const n = q.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return (
    /broker (install|deploy|pack|tier|host)|ollama (install|host|ram|local)|call center (pc|ram)|desk pro|floor enterprise|agent elite|white label saas|cheapest (broker|scenario)|per agent (pc|install)|management install|how (to|do) (brokers|sell)/.test(
      n,
    ) || /install ollama|host ollama|broker hardware|broker ram/.test(n)
  );
}
