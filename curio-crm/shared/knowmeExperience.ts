/**
 * KNOWME experience tiers — owner demo vs management desk vs agent preemptive Q&A.
 */

export type KnowmeMode = "owner" | "management" | "agent";

export type KnowmeTopicGroup = {
  id: string;
  label: string;
  emoji: string;
  prompts: string[];
};

export const KNOWME_AGENT_TOPIC_GROUPS: KnowmeTopicGroup[] = [
  {
    id: "money",
    label: "Money",
    emoji: "💰",
    prompts: ["How do I approve a deposit?", "Pending In queue", "Payment gateways", "Withdrawals"],
  },
  {
    id: "clients",
    label: "Clients",
    emoji: "👤",
    prompts: ["Hot Leads", "All Clients search", "Client file overview", "Morning routine"],
  },
  {
    id: "desk",
    label: "Desk",
    emoji: "📞",
    prompts: ["Live Book", "Desk team", "Click-to-call flow", "Assign leads"],
  },
  {
    id: "learn",
    label: "Learn",
    emoji: "📖",
    prompts: ["Explain PSP deposit flow", "Affiliate trackers", "Demo tour", "Golden path slide 1"],
  },
];

export const KNOWME_OWNER_STARTERS = [
  "Broker install tiers",
  "AI architecture — 10 vs 90 users",
  "Demo tour",
  "Cheapest broker scenario",
];

export const KNOWME_AGENT_STARTERS = [
  "Morning routine",
  "How do I approve a deposit?",
  "Hot Leads",
  "Explain PSP deposit flow",
];

export const KNOWME_MANAGEMENT_STARTERS = [
  "Broker install tiers",
  "Desk Pro vs call center",
  "Demo tour",
  "Morning routine",
];

export function resolveKnowmeMode(input: {
  isPrimaryAdmin: boolean;
  hasDeskAsk: boolean;
}): KnowmeMode {
  if (input.isPrimaryAdmin) return "owner";
  if (input.hasDeskAsk) return "management";
  return "agent";
}

export function knowmeWelcome(mode: KnowmeMode): string {
  switch (mode) {
    case "owner":
      return "I'm KNOWME — your sovereign CRM classroom. Visual Flows, wiki answers, and live Wallstreet AI when Ollama is on. Use the AI tiers panel to explain the 10 management + 90 agent split to brokers. Tap teal links like Wikipedia.";
    case "management":
      return "I'm KNOWME — instant CRM answers plus Visual Flows. Most replies are verified in under 100 ms. Open Wallstreet AI (bottom-right) for live drafts when Ollama is online.";
    case "agent":
      return "I'm KNOWME — your floor help desk. Every answer is pre-approved and instant (no live AI on your tier). Pick a topic below or ask how to run Pending In, Hot Leads, or deposits. Tap teal links to go deeper.";
  }
}

export function knowmeStarters(mode: KnowmeMode): string[] {
  switch (mode) {
    case "owner":
      return KNOWME_OWNER_STARTERS;
    case "management":
      return KNOWME_MANAGEMENT_STARTERS;
    case "agent":
      return KNOWME_AGENT_STARTERS;
  }
}

export function knowmePageSubtitle(mode: KnowmeMode): string {
  switch (mode) {
    case "owner":
      return "Owner demo — visual flows, AI tier architecture, management-grade guide chat.";
    case "management":
      return "Supervisor guide — instant encyclopedia + optional live desk AI.";
    case "agent":
      return "Floor help — verified preemptive Q&A only. Answers in milliseconds, compliance-safe.";
  }
}

export function knowmeAgentNoMatchReply(): string {
  return [
    "No verified answer for that yet.",
    "",
    "Try a topic chip above, Visual Flows, or ask your manager to add it to the overnight Q&A batch.",
    "",
    "Agents cannot use live AI generation — only supervisors with Wallstreet AI can draft custom text.",
  ].join("\n");
}
