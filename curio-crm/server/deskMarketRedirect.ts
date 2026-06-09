/**
 * Trade-pick guard — instant desk response with real movers, zero CNBC slop.
 */
import type { MarketBrief, MoverLine } from "./marketBrief";

export function isTradePickRequest(message: string): boolean {
  const m = message.toLowerCase().replace(/[^\w\s'?/]/g, " ");
  return (
    /tips? to trade|trade today|what to (buy|trade|short)|best (stock|crypto|coin|coins)|should i (buy|trade)|give me.*(stock|crypto|trade|coin|pick)|recommend.*(stock|crypto|coin)|pick.*(stock|crypto|coin)|(\d+\s+in\s+(stock|crypto))/.test(
      m,
    ) || /stock.*crypto|crypto.*stock/.test(m)
  );
}

/** Sales pitch / talk-track — NOT trade picks; handled by fast-path, not LLM. */
export function isSalesPitchRequest(message: string): boolean {
  const m = message.toLowerCase().replace(/[^\w\s'?/]/g, " ");
  return /pitch|talking point|what to say|cold call|close the deal|sales tip|good tip|tip to pitch|pitch today|any.*tip|how do i sell|objection|rebuttal|opener for/.test(
    m,
  );
}

function moverLine(line: MoverLine): string {
  const sign = line.changePct >= 0 ? "+" : "";
  const head = line.headline ? ` · ${line.headline}` : "";
  return `• ${line.displaySymbol} ${sign}${line.changePct.toFixed(2)}% — ${line.name}${head}`;
}

export function buildTradePickRedirectReply(brief: MarketBrief): { reply: string } {
  const stocks = brief.stocks.slice(0, 3).map(moverLine).join("\n") || "• feed loading — check Agent Brief";
  const crypto = brief.crypto.slice(0, 4).map(moverLine).join("\n") || "• feed loading";

  return {
    reply: `OUT OF SCOPE — I don't hand out pick lists. Direction is yours. Pipeline is mine.

MOVERS RIGHT NOW (tape — facts, not advice)
Stocks:
${stocks}

Crypto:
${crypto}

YOUR DESK
• Live Book → /admin/trading/open-trades
• Hot Leads → assign before the phone cools
• Agent Brief → /admin/desk for full tape

END`,
  };
}
