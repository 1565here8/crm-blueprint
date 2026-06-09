/**
 * Sales/pitch intelligence — profile parsing + LLM context assembly.
 * Templates are fallback only when the smart model fails or slops.
 */
import type { MarketBrief } from "./marketBrief";

export type ClientProfile = { age?: number; city?: string; gender?: string };

function norm(message: string): string {
  return message.toLowerCase().replace(/[^\w\s'?/]/g, " ");
}

export function isPitchOrMarketTipRequest(message: string): boolean {
  const m = norm(message);
  return (
    /pitch|talking point|what to say|cold call|sales tip|good tip|tip to|pitch today|any.*tip|how do i sell|objection|rebuttal|opener|convince|approach.*client|talk.*client|market tip|what pick|pick.*suggest|pick.*today|what asset|which asset|what crypto|which crypto|crypto to pitch|assets to pitch|best.*pitch|pitch.*market|suggest.*market/.test(
      m,
    ) && !/approve deposit|pending in|hot lead|bulk|crm users|import csv/.test(m)
  );
}

const CITY_ALIASES: Record<string, string> = {
  leningrad: "Leningrad",
  "st petersburg": "St Petersburg",
  petersburg: "St Petersburg",
  moscow: "Moscow",
  kiev: "Kyiv",
  kyiv: "Kyiv",
  london: "London",
  "tel aviv": "Tel Aviv",
  dubai: "Dubai",
  berlin: "Berlin",
  paris: "Paris",
  rome: "Rome",
  madrid: "Madrid",
  "new york": "New York",
  miami: "Miami",
};

export function parseProfile(text: string): ClientProfile {
  const m = norm(text);
  const ageM = m.match(/\b(\d{2})\s*(year|yo|y\.o|male|female|man|woman)\b/);
  const ageAlt = m.match(/\b(\d{2})\s*(year old|years old)\b/);
  const age = ageM ? Number(ageM[1]) : ageAlt ? Number(ageAlt[1]) : undefined;
  let gender: string | undefined;
  if (/\b(male|man)\b/.test(m)) gender = "male";
  if (/\b(female|woman)\b/.test(m)) gender = "female";
  const cityKey = Object.keys(CITY_ALIASES).find((c) => m.includes(c));
  const city = cityKey ? CITY_ALIASES[cityKey] : undefined;
  return { age, city, gender };
}

/** Scan current message + prior turns for client hints the operator mentioned. */
export function parseProfileFromThread(
  message: string,
  history?: { role: string; content: string }[],
): ClientProfile {
  const merged = [message, ...(history ?? []).map((h) => h.content)].join(" ");
  return parseProfile(merged);
}

function profileLine(p: ClientProfile): string {
  const bits: string[] = [];
  if (p.age) bits.push(`${p.age} years old`);
  if (p.gender) bits.push(p.gender);
  if (p.city) bits.push(`from ${p.city}`);
  return bits.length ? bits.join(", ") : "not specified — ask on the call";
}

function threadSummary(history?: { role: string; content: string }[]): string {
  if (!history?.length) return "No prior turns in this session.";
  return history
    .slice(-6)
    .map((h) => `${h.role.toUpperCase()}: ${h.content.replace(/\s+/g, " ").slice(0, 220)}`)
    .join("\n");
}

/** Rich context block injected before the LLM — not shown to the operator. */
export function buildPitchContextForLlm(
  message: string,
  brief: MarketBrief | null,
  history?: { role: string; content: string }[],
): string {
  const profile = parseProfileFromThread(message, history);
  const parts = [
    "OPERATOR THREAD (read for continuity):",
    threadSummary(history),
    "",
    "CLIENT PROFILE (parsed from thread — treat as fact if present):",
    profileLine(profile),
    "",
    "OPERATOR QUESTION NOW:",
    message.trim(),
  ];
  if (brief) {
    parts.push("", "MARKET SNAPSHOT (cite real numbers only — small-talk hooks, not buy lists):");
    const fmt = (sym: string, pct: number) => `${sym} ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
    if (brief.stocks.length) {
      parts.push("Stocks: " + brief.stocks.slice(0, 4).map((s) => fmt(s.displaySymbol, s.changePct)).join(" · "));
    }
    if (brief.crypto.length) {
      parts.push("Crypto: " + brief.crypto.slice(0, 4).map((c) => fmt(c.displaySymbol, c.changePct)).join(" · "));
    }
  }
  return parts.join("\n");
}

function tapeHook(brief: MarketBrief | null): string {
  if (!brief) return "• Pull live tape: Agent Brief on /admin/desk";
  const lines: string[] = [];
  for (const s of brief.stocks.slice(0, 2)) {
    const sign = s.changePct >= 0 ? "+" : "";
    lines.push(`• ${s.displaySymbol} ${sign}${s.changePct.toFixed(1)}% — small-talk only, not a recommendation`);
  }
  for (const c of brief.crypto.slice(0, 2)) {
    const sign = c.changePct >= 0 ? "+" : "";
    lines.push(`• ${c.displaySymbol} ${sign}${c.changePct.toFixed(1)}% — mention volatility, don't push coins`);
  }
  return lines.length ? lines.join("\n") : "• Tape quiet — lead with their goal, not tickers";
}

function ageAngle(age?: number): string {
  if (!age) return "Discovery first — income goal vs growth vs hedging.";
  if (age >= 55) return "Angle: capital preservation, familiar large-cap names, small size, no leverage day one.";
  if (age >= 40) return "Angle: balanced — diversification story, retirement timeline, controlled risk.";
  return "Angle: education + demo account, session times, avoid hype coins.";
}

function cityAngle(city?: string): string {
  if (!city) return "";
  if (/Leningrad|St Petersburg|Moscow|Kyiv/.test(city)) {
    return "Tone: direct, respect time, USD/EUR account clarity, avoid slang.";
  }
  if (/Dubai|Tel Aviv/.test(city)) return "Tone: premium service, fast execution, mobile platform.";
  return "Tone: match local business hours for callbacks.";
}

/** Structured fallback when smart model fails — uses parsed thread context. */
export function buildPitchReply(
  message: string,
  brief: MarketBrief | null,
  history?: { role: string; content: string }[],
): string {
  const p = parseProfileFromThread(message, history);
  const profile = [p.age ? `${p.age}yo` : null, p.gender, p.city].filter(Boolean).join(" · ") || "General lead";

  return `SALES CALL PLAYBOOK — ${profile}

OPENER (say this)
"What made you register — protecting capital, side income, or active sessions?"

DISCOVERY (2 questions max)
• Timeline — when do you want to be live?
• Size comfort — demo first or funded starter?

${ageAngle(p.age)}
${cityAngle(p.city)}

DO NOT
• Name coins/stocks to buy — compliance + you'll sound like retail chatbot
• Promise returns · leverage pitch on call one

TAPE FOR SMALL TALK ONLY (not advice)
${tapeHook(brief)}

CLOSE
Book callback with date/time · set Status on Client File · Notes = what they said verbatim

DESK
Hot Leads → /admin/desk/leads · Client File → Notes · Pending In before re-pitch`;
}

/** Reject ChatGPT-style slop from tiny local models. */
export function isLlmSlop(text: string): boolean {
  const t = text.slice(0, 320).toLowerCase();
  return (
    /certainly|here are a few|here are some|great question|as an ai|i'd be happy to|let me know if|hope this helps|personalize your pitch|highlight benefits|important to remember|when pitching|i recommend you|you should consider/.test(
      t,
    ) || /\*\*[^*]+\*\*/.test(text.slice(0, 240))
  );
}

/** Tiny Ollama models sometimes spam forbidden sales phrases — cut stream early. */
export function isDeskRepeatLoop(text: string): boolean {
  const t = text.toLowerCase();
  if ((t.match(/act\s+now/g) ?? []).length >= 2) return true;
  if (/(act\s+now\s+){2,}/.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 12) return false;
  const tail = words.slice(-8).join(" ");
  const head = words.slice(0, 8).join(" ");
  return tail === head;
}
