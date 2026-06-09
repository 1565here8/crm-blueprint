/**
 * Desk bubble routing — CRM instant paths; sales/pitch goes to smart LLM.
 */
import { deskFastPath, deskFastPathBody, deskAssistFallback } from "./deskFastPath";
import { buildPitchReply, isPitchOrMarketTipRequest, isLlmSlop } from "./deskPitchEngine";
import { isTradePickRequest } from "./deskMarketRedirect";
import { isCrmGuideQuestion } from "../shared/crmGuideKnowledge";
import { buildMarketBriefFast, type MarketBrief } from "./marketBrief";

export type DeskInstantReply = {
  body: string;
  model: "fast-path" | "fast-path-fallback" | "pitch-engine";
};

let briefCache: MarketBrief | null = null;
let briefCacheAt = 0;

export function clearDeskBriefCache(): void {
  briefCache = null;
  briefCacheAt = 0;
}

export async function moversForDesk(): Promise<MarketBrief | null> {
  if (briefCache && Date.now() - briefCacheAt < 90_000) return briefCache;
  try {
    briefCache = await buildMarketBriefFast(3_500);
    briefCacheAt = Date.now();
    return briefCache;
  } catch {
    return briefCache;
  }
}

/** CRM how-to only — instant, zero LLM. Sales questions need the smart model. */
export async function resolveDeskInstant(
  message: string,
  history?: { role: "user" | "assistant"; content: string }[],
): Promise<DeskInstantReply | null> {
  const hit = deskFastPath(message, history);
  if (hit) {
    const body = deskFastPathBody(message, history);
    if (body) return { body, model: "fast-path" };
  }
  return null;
}

/** Smart model only for pitch / market / trade picks — CRM stays instant or fast 0.5b. */
export function needsSmartDesk(message: string, _history?: { role: string; content: string }[]): boolean {
  if (deskFastPath(message)) return false;
  if (isCrmGuideQuestion(message)) return false;
  return isPitchOrMarketTipRequest(message) || isTradePickRequest(message);
}

export function wantsDeskMarketContext(message: string, includeMarket?: boolean): boolean {
  if (includeMarket) return true;
  if (isPitchOrMarketTipRequest(message)) return true;
  if (isTradePickRequest(message)) return true;
  return /market|stock|crypto|fx|forex|mover|tape|commodit|index|bitcoin|btc|eth|pitch|asset/.test(message);
}

export function resolveDeskFallback(
  message: string,
  llmText?: string,
  history?: { role: string; content: string }[],
): DeskInstantReply {
  if (llmText && !isLlmSlop(llmText)) {
    return { body: llmText.replace(/\n\nEND\s*$/i, "").trimEnd(), model: "fast-path-fallback" };
  }
  const hit = deskFastPath(message, history);
  if (hit) {
    const body = deskFastPathBody(message, history);
    if (body) return { body, model: "fast-path-fallback" };
  }
  if (isPitchOrMarketTipRequest(message) || isTradePickRequest(message)) {
    return {
      body: buildPitchReply(message, briefCache, history),
      model: "pitch-engine",
    };
  }
  const fb = deskAssistFallback(message, history);
  return {
    body: fb.reply.replace(/\n\nEND\s*$/i, "").trimEnd(),
    model: "fast-path-fallback",
  };
}

/** Only CRM navigation skips the LLM entirely. */
export function shouldSkipLlm(message: string): boolean {
  return Boolean(deskFastPath(message));
}
