/**
 * Market snapshot for THE DESK's 09:25 agent brief.
 *
 * Aggregates top movers across categories from the existing market data
 * pipeline plus 1 news headline per top mover, served entirely from cache.
 * No new external surfaces — uses the same Yahoo / Binance feeds we already
 * use for the public site. Cached for 90s so a 10-agent floor refreshing in
 * the same minute costs one fetch.
 */
import { buildCategoryScreener } from "./marketData";
import { fetchSymbolNews } from "./marketNews";
import { warn as logWarn } from "./log";
import type { MarketCategory } from "./marketCatalog";

export type MoverLine = {
  category: MarketCategory;
  displaySymbol: string;
  name: string;
  changePct: number;
  mid: number;
  headline?: string;
};

export type MarketBrief = {
  generatedAt: string;
  fx: MoverLine[];
  stocks: MoverLine[];
  crypto: MoverLine[];
  commodities: MoverLine[];
  indices: MoverLine[];
};

const CACHE_TTL_MS = 90_000;
let cached: { at: number; brief: MarketBrief } | null = null;

export function clearMarketBriefCache(): void {
  cached = null;
}

const CATEGORY_GROUPS: Array<{ key: keyof Omit<MarketBrief, "generatedAt">; categories: MarketCategory[]; topN: number }> = [
  { key: "fx", categories: ["currencies"], topN: 5 },
  { key: "stocks", categories: ["stocks"], topN: 5 },
  { key: "crypto", categories: ["crypto_usdt", "crypto_eurt"], topN: 5 },
  { key: "commodities", categories: ["commodities"], topN: 4 },
  { key: "indices", categories: ["indexes"], topN: 4 },
];

async function topMovers(categories: MarketCategory[], n: number): Promise<MoverLine[]> {
  const all: MoverLine[] = [];
  for (const cat of categories) {
    try {
      const items = await buildCategoryScreener(cat);
      for (const it of items) {
        all.push({
          category: cat,
          displaySymbol: it.displaySymbol,
          name: it.name,
          changePct: Number(it.changePct ?? 0),
          mid: Number(it.mid ?? 0),
        });
      }
    } catch (err) {
      logWarn("[brief] screener", cat, err instanceof Error ? err.message : err);
    }
  }
  all.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  return all.slice(0, n);
}

async function attachHeadline(line: MoverLine): Promise<MoverLine> {
  try {
    const news = await fetchSymbolNews(line.displaySymbol);
    const headline = news[0]?.title;
    if (headline) line.headline = headline.slice(0, 140);
  } catch {
    /* news is best-effort */
  }
  return line;
}

export async function buildMarketBrief(): Promise<MarketBrief> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.brief;
  const brief = await buildMarketBriefInternal(true);
  cached = { at: Date.now(), brief };
  return brief;
}

function emptyBrief(): MarketBrief {
  return {
    generatedAt: new Date().toISOString(),
    fx: [],
    stocks: [],
    crypto: [],
    commodities: [],
    indices: [],
  };
}

async function buildMarketBriefInternal(withNews: boolean): Promise<MarketBrief> {
  const groups = await Promise.all(
    CATEGORY_GROUPS.map(async (g) => {
      const movers = await topMovers(g.categories, g.topN);
      if (!withNews) return { key: g.key, lines: movers };
      const enriched = await Promise.all(movers.slice(0, 3).map(attachHeadline));
      return { key: g.key, lines: [...enriched, ...movers.slice(3)] };
    }),
  );
  const brief = emptyBrief();
  for (const g of groups) brief[g.key] = g.lines;
  return brief;
}

/** No news headlines, hard timeout — desk bubble must never wait 30s. */
export async function buildMarketBriefFast(maxMs = 4_000): Promise<MarketBrief> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.brief;
  const work = buildMarketBriefInternal(false).then((brief) => {
    cached = { at: Date.now(), brief };
    return brief;
  });
  return Promise.race([
    work,
    new Promise<MarketBrief>((resolve) => {
      setTimeout(() => resolve(cached?.brief ?? emptyBrief()), maxMs);
    }),
  ]);
}

/** Compact, LLM-friendly text view of the brief. */
export function marketBriefToContextText(brief: MarketBrief): string {
  const fmt = (l: MoverLine) => {
    const sign = l.changePct >= 0 ? "+" : "";
    const news = l.headline ? ` | news: ${l.headline}` : "";
    return `${l.displaySymbol} ${sign}${l.changePct.toFixed(2)}% mid=${l.mid}${news}`;
  };
  const block = (label: string, arr: MoverLine[]) =>
    `${label}:\n${arr.length ? arr.map((l) => "  " + fmt(l)).join("\n") : "  no data"}`;
  return [
    `MARKET SNAPSHOT @ ${brief.generatedAt}`,
    block("FX", brief.fx),
    block("STOCKS", brief.stocks),
    block("CRYPTO", brief.crypto),
    block("COMMODITIES", brief.commodities),
    block("INDICES", brief.indices),
  ].join("\n\n");
}
