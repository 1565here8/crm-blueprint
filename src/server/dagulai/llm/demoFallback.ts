import type { ChatMessage } from "./geminiChat";

function extractBlock(text: string, header: string): string {
  const idx = text.indexOf(header);
  if (idx === -1) return "";
  const rest = text.slice(idx + header.length);
  const next = rest.search(/\n=== /);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function parse4DFromContext(context: string) {
  const symbolMatch = context.match(/Symbol:\s*(\S+)/);
  const compositeMatch = context.match(/Composite:\s*([\d.]+)/);
  const biasMatch = context.match(/Bias:\s*(\w+)/i);
  const taskMatch = context.match(/=== TRADER QUESTION ===\s*([\s\S]*?)(?:\n===|$)/);
  return {
    symbol: symbolMatch?.[1] ?? "BTC",
    composite: compositeMatch?.[1] ?? "—",
    bias: biasMatch?.[1]?.toUpperCase() ?? "NEUTRAL",
    question: taskMatch?.[1]?.trim() || null,
  };
}

/** Deterministic Megamind reply when GEMINI_API_KEY absent — uses 4D context only. */
export function demoMegamindComplete(messages: ChatMessage[]): string {
  const userContent =
    messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n") || "";

  const ctx = extractBlock(userContent, "=== 4D ANALYSIS (math) ===") || userContent;
  const market = extractBlock(userContent, "=== MARKET CONTEXT ===");
  const parsed = parse4DFromContext(userContent);

  const lines = [
    `[DEMO MODE — add GEMINI_API_KEY for live Gemini Flash]`,
    ``,
    `**${parsed.symbol} Megamind read** · Composite ${parsed.composite}/100 · Bias **${parsed.bias}**`,
    ``,
  ];

  if (market) {
    const priceLine = market.split("\n").find((l) => l.includes("@"));
    if (priceLine) lines.push(`Market: ${priceLine.trim()}`);
  }

  lines.push(
    ``,
    `**4D summary**`,
    `- Trend & momentum drive the composite; flow confirms or denies the move.`,
    `- Cross-asset correlation: watch benchmark divergence before sizing.`,
    `- Risk/reward: prop-style — size down if composite < 55 or bias is NEUTRAL.`,
    ``,
    `**Action tips (education only)**`,
    `- Define stop before entry; no revenge trades.`,
    `- If demo data: treat as structure practice, not live signal.`,
    `- Upgrade to Megamind Cloud ($49+) for Gemini-powered chat.`,
    `- Megamind Private ($399+) = decentralized in-house AI, zero vendor.`,
  );

  if (parsed.question) {
    lines.push(``, `**Your question:** ${parsed.question.slice(0, 200)}`);
    lines.push(`Answer grounded on 4D math above — not financial advice.`);
  }

  return lines.join("\n");
}

export async function* demoMegamindStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const full = demoMegamindComplete(messages);
  const chunkSize = 48;
  for (let i = 0; i < full.length; i += chunkSize) {
    yield full.slice(i, i + chunkSize);
  }
}

export function demoModeActive(): boolean {
  return process.env.DAGULAI_DEMO_LLM?.trim().toLowerCase() !== "false";
}
