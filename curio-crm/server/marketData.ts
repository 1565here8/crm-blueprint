import type { AssetClass, Quote } from "./types";
import type { CatalogInstrument, MarketCategory } from "./marketCatalog";
import { CATALOG, getCatalogByCategory, getCatalogInstrument, MARKET_CATEGORIES } from "./marketCatalog";

export type QuoteSource = "binance" | "yahoo" | "alpaca" | "demo";

const CACHE_TTL_MS = 2_000;
const quoteCache = new Map<string, { quote: Quote; expires: number }>();

const DEMO_BASE: Record<string, number> = {
  AAPL: 227.5,
  MSFT: 415.2,
  TSLA: 248.9,
  SPY: 562.1,
  QQQ: 489.3,
  NVDA: 875.4,
  AMZN: 198.7,
  GOOGL: 175.3,
  META: 585.2,
  "BTC/USD": 97250,
  "ETH/USD": 3450,
  "SOL/USD": 185.5,
  "DOGE/USD": 0.18,
  "XRP/USD": 2.1,
  DOGE: 0.18,
  XRP: 2.1,
};

const BINANCE_MAP: Record<string, string> = {
  "BTC/USD": "BTCUSDT",
  "ETH/USD": "ETHUSDT",
  "SOL/USD": "SOLUSDT",
  "DOGE/USD": "DOGEUSDT",
  "XRP/USD": "XRPUSDT",
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  DOGE: "DOGEUSDT",
  XRP: "XRPUSDT",
};

export const WATCHLIST = {
  stocks: ["AAPL", "MSFT", "TSLA", "SPY", "QQQ", "NVDA", "AMZN", "GOOGL", "META"],
  crypto: ["BTC/USD", "ETH/USD", "SOL/USD", "DOGE/USD", "XRP/USD"],
};

export type WatchlistItem = Quote & {
  series: number[];
  changePct: number;
};

export type ScreenerItem = WatchlistItem & {
  id: string;
  name: string;
  displaySymbol: string;
  category: MarketCategory;
  tvSymbol: string;
  tradable: boolean;
};

const SERIES_CACHE_TTL_MS = 30_000;
const seriesCache = new Map<string, { series: number[]; expires: number }>();

function alpacaConfigured(): boolean {
  return Boolean(process.env.ALPACA_API_KEY && process.env.ALPACA_SECRET_KEY);
}

function alpacaHeaders(): HeadersInit {
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY!,
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY!,
  };
}

function normalizeSymbol(symbol: string, assetClass: AssetClass): string {
  const s = symbol.trim().toUpperCase();
  if (assetClass === "crypto" && !s.includes("/")) return `${s}/USD`;
  return s;
}

function toBinancePair(symbol: string): string | null {
  const normalized = normalizeSymbol(symbol, "crypto");
  if (BINANCE_MAP[normalized]) return BINANCE_MAP[normalized];
  const base = normalized.replace("/USD", "");
  return BINANCE_MAP[base] ?? `${base}USDT`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Stable synthetic price for catalog browse — no external API, no flicker on refresh. */
function seededDemoBase(symbol: string, assetClass: AssetClass): number {
  const normalized = normalizeSymbol(symbol, assetClass);
  const known = DEMO_BASE[normalized] ?? DEMO_BASE[normalized.replace("/USD", "").replace("/USDT", "").replace("/EUR", "")];
  if (known != null) return known;

  let h = 0;
  for (let i = 0; i < normalized.length; i++) h = (h * 31 + normalized.charCodeAt(i)) >>> 0;

  if (assetClass === "crypto") {
    if (normalized.includes("BTC")) return 97000 + (h % 5000);
    if (normalized.includes("ETH")) return 3400 + (h % 400);
    return 0.0001 + (h % 500_000) / 10_000;
  }
  if (normalized.includes("/")) {
    if (normalized.endsWith("/JPY")) return 140 + (h % 40);
    return 0.5 + (h % 250) / 100;
  }
  return 8 + (h % 992);
}

function demoQuote(symbol: string, assetClass: AssetClass, opts?: { stable?: boolean }): Quote {
  const normalized = normalizeSymbol(symbol, assetClass);
  const base = seededDemoBase(normalized, assetClass);
  const jitter = opts?.stable ? 1 : 1 + (Math.random() - 0.5) * 0.002;
  const mid = round(base * jitter);
  const spread = assetClass === "crypto" ? mid * 0.0005 : 0.02;
  return {
    symbol: normalized,
    assetClass,
    bid: round(mid - spread / 2),
    ask: round(mid + spread / 2),
    mid,
    source: "demo",
    timestamp: new Date().toISOString(),
  };
}

/** Binance public book ticker — free, no API key, 24/7 crypto. */
async function fetchBinanceQuoteByPair(pair: string, displaySymbol: string): Promise<Quote> {
  const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${encodeURIComponent(pair)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Binance quote failed (${res.status})`);

  const data = (await res.json()) as { bidPrice: string; askPrice: string };
  const bid = Number(data.bidPrice);
  const ask = Number(data.askPrice);
  if (!Number.isFinite(bid) || !Number.isFinite(ask)) throw new Error("Invalid Binance quote.");

  return {
    symbol: displaySymbol,
    assetClass: "crypto",
    bid,
    ask,
    mid: round((bid + ask) / 2),
    source: "binance",
    timestamp: new Date().toISOString(),
  };
}

async function fetchBinanceQuote(symbol: string): Promise<Quote> {
  const pair = toBinancePair(symbol);
  if (!pair) throw new Error("Unsupported crypto pair.");
  const normalized = normalizeSymbol(symbol, "crypto");
  return fetchBinanceQuoteByPair(pair, normalized);
}

/** Yahoo Finance chart API — free, no key, includes pre/post market prices. */
async function fetchYahooQuote(ticker: string, displaySymbol?: string): Promise<Quote> {
  const yahooTicker = ticker.trim().toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1m&range=1d&includePrePost=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 WallStreetSim/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Yahoo quote failed (${res.status})`);

  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: {
          regularMarketPrice?: number;
          preMarketPrice?: number;
          postMarketPrice?: number;
          regularMarketTime?: number;
          currency?: string;
        };
      }>;
    };
  };

  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) throw new Error("No Yahoo quote data.");

  const price =
    meta.postMarketPrice ??
    meta.preMarketPrice ??
    meta.regularMarketPrice ??
    null;

  if (price == null || !Number.isFinite(price)) throw new Error("No active US price.");

  const spread = Math.max(0.0001, price * 0.0001);
  return {
    symbol: displaySymbol ?? yahooTicker,
    assetClass: "us_equity",
    bid: round(price - spread / 2),
    ask: round(price + spread / 2),
    mid: round(price),
    source: "yahoo",
    timestamp: meta.regularMarketTime
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString(),
  };
}

async function fetchAlpacaStockQuote(symbol: string): Promise<Quote> {
  const url = `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest?feed=iex`;
  const res = await fetch(url, { headers: alpacaHeaders(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Alpaca stock quote failed (${res.status})`);
  const data = (await res.json()) as { quote?: { bp: number; ap: number; t: string } };
  const q = data.quote;
  if (!q) throw new Error("No Alpaca quote.");
  return {
    symbol,
    assetClass: "us_equity",
    bid: q.bp,
    ask: q.ap,
    mid: round((q.bp + q.ap) / 2),
    source: "alpaca",
    timestamp: q.t,
  };
}

async function fetchAlpacaCryptoQuote(symbol: string): Promise<Quote> {
  const url = `https://data.alpaca.markets/v1beta3/crypto/us/latest/quotes?symbols=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, { headers: alpacaHeaders(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Alpaca crypto quote failed (${res.status})`);
  const data = (await res.json()) as { quotes?: Record<string, { bp: number; ap: number; t: string }> };
  const q = data.quotes?.[symbol];
  if (!q) throw new Error("No Alpaca crypto quote.");
  return {
    symbol,
    assetClass: "crypto",
    bid: q.bp,
    ask: q.ap,
    mid: round((q.bp + q.ap) / 2),
    source: "alpaca",
    timestamp: q.t,
  };
}

async function fetchQuoteUncached(symbol: string, assetClass: AssetClass): Promise<Quote> {
  const normalized = normalizeSymbol(symbol, assetClass);

  if (assetClass === "crypto") {
    try {
      return await fetchBinanceQuote(normalized);
    } catch (binanceErr) {
      if (alpacaConfigured()) {
        try {
          return await fetchAlpacaCryptoQuote(normalized);
        } catch {
          /* fall through */
        }
      }
      console.warn("[market]", binanceErr instanceof Error ? binanceErr.message : binanceErr);
      return demoQuote(normalized, assetClass);
    }
  }

  try {
    return await fetchYahooQuote(normalized);
  } catch (yahooErr) {
    if (alpacaConfigured()) {
      try {
        return await fetchAlpacaStockQuote(normalized);
      } catch {
        /* fall through */
      }
    }
    console.warn("[market]", yahooErr instanceof Error ? yahooErr.message : yahooErr);
    return demoQuote(normalized, assetClass);
  }
}

export async function getQuote(symbol: string, assetClass: AssetClass): Promise<Quote> {
  const catalogHit =
    CATALOG.find((c) => c.displaySymbol === symbol.trim() && c.assetClass === assetClass) ??
    CATALOG.find((c) => c.displaySymbol.toUpperCase() === symbol.trim().toUpperCase());
  if (catalogHit) {
    return getQuoteForInstrument(catalogHit);
  }

  const normalized = normalizeSymbol(symbol, assetClass);
  const key = `${assetClass}:${normalized}`;
  const cached = quoteCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.quote;

  const quote = await fetchQuoteUncached(normalized, assetClass);
  quoteCache.set(key, { quote, expires: Date.now() + CACHE_TTL_MS });
  return quote;
}

export async function searchSymbols(
  query: string,
): Promise<Array<{ symbol: string; assetClass: AssetClass; name: string }>> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const catalogHits = CATALOG.filter(
    (i) =>
      i.displaySymbol.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q) ||
      i.id.includes(q.replace(/[^a-z0-9]/g, "")),
  )
    .slice(0, 40)
    .map((i) => ({
      symbol: i.displaySymbol,
      assetClass: i.assetClass,
      name: i.name,
    }));

  if (catalogHits.length >= 8) return catalogHits;

  const qUp = q.toUpperCase();
  const stockHits = Object.keys(DEMO_BASE)
    .filter((s) => !s.includes("/") && s.includes(qUp))
    .map((symbol) => ({ symbol, assetClass: "us_equity" as const, name: symbol }));

  const cryptoHits = Object.keys(BINANCE_MAP)
    .filter((s) => s.includes("/") && s.includes(qUp.replace("/USD", "")))
    .map((symbol) => ({ symbol, assetClass: "crypto" as const, name: symbol.replace("/USD", "") }));

  if (q.length >= 1) {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 WallStreetSim/1.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          quotes?: Array<{ symbol: string; shortname?: string; quoteType?: string }>;
        };
        const yahoo = (data.quotes ?? [])
          .filter((x) => x.quoteType === "EQUITY" && x.symbol)
          .map((x) => ({
            symbol: x.symbol,
            assetClass: "us_equity" as const,
            name: x.shortname ?? x.symbol,
          }));
        if (yahoo.length) return [...catalogHits, ...yahoo].slice(0, 24);
      }
    } catch {
      /* local universe */
    }
  }

  return [...catalogHits, ...stockHits, ...cryptoHits].slice(0, 24);
}

export function isAlpacaConfigured(): boolean {
  return alpacaConfigured();
}

export function usesFreeLiveFeeds(): boolean {
  return true;
}

function demoSeries(mid: number, points = 90): number[] {
  const out: number[] = [];
  let price = mid * (1 - (Math.random() - 0.5) * 0.01);
  for (let i = 0; i < points; i++) {
    price *= 1 + (Math.random() - 0.5) * 0.004;
    out.push(round(price));
  }
  out[out.length - 1] = mid;
  return out;
}

function changeFromSeries(series: number[]): number {
  const valid = series.filter((p) => Number.isFinite(p) && p > 0);
  if (valid.length < 2) return 0;
  const first = valid[0];
  const last = valid[valid.length - 1];
  return round(((last - first) / first) * 100);
}

async function fetchYahooSeries(symbol: string): Promise<number[]> {
  const ticker = symbol.trim().toUpperCase();
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1m&range=1d&includePrePost=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 WallStreetSim/1.0" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Yahoo chart failed (${res.status})`);

  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };

  const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  const series = closes.filter((p): p is number => p != null && Number.isFinite(p));
  if (series.length < 2) throw new Error("Insufficient Yahoo chart data.");
  return series;
}

async function fetchBinanceSeriesByPair(pair: string): Promise<number[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(pair)}&interval=1m&limit=120`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Binance klines failed (${res.status})`);

  const data = (await res.json()) as Array<[number, string, string, string, string, ...unknown[]]>;
  const series = data.map((k) => Number(k[4])).filter((p) => Number.isFinite(p));
  if (series.length < 2) throw new Error("Insufficient Binance chart data.");
  return series;
}

async function fetchBinanceSeries(symbol: string): Promise<number[]> {
  const pair = toBinancePair(symbol);
  if (!pair) throw new Error("Unsupported crypto pair.");
  return fetchBinanceSeriesByPair(pair);
}

export async function getChartSeries(
  symbol: string,
  assetClass: AssetClass,
  mid: number,
): Promise<number[]> {
  const normalized = normalizeSymbol(symbol, assetClass);
  const key = `${assetClass}:${normalized}`;
  const cached = seriesCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.series;

  let series: number[];
  try {
    series =
      assetClass === "crypto"
        ? await fetchBinanceSeries(normalized)
        : await fetchYahooSeries(normalized);
  } catch {
    series = demoSeries(mid);
  }

  seriesCache.set(key, { series, expires: Date.now() + SERIES_CACHE_TTL_MS });
  return series;
}

export async function buildWatchlistItem(
  symbol: string,
  assetClass: AssetClass,
): Promise<WatchlistItem> {
  const quote = await getQuote(symbol, assetClass);
  const series = await getChartSeries(quote.symbol, assetClass, quote.mid);
  const liveSeries =
    series.length > 0
      ? [...series.slice(0, -1), quote.mid]
      : demoSeries(quote.mid);
  return {
    ...quote,
    series: liveSeries,
    changePct: changeFromSeries(liveSeries),
  };
}

export async function buildWatchlist(): Promise<WatchlistItem[]> {
  const symbols = [
    ...WATCHLIST.stocks.map((symbol) => ({ symbol, assetClass: "us_equity" as const })),
    ...WATCHLIST.crypto.map((symbol) => ({ symbol, assetClass: "crypto" as const })),
  ];
  return Promise.all(symbols.map((s) => buildWatchlistItem(s.symbol, s.assetClass)));
}

async function getQuoteForInstrument(inst: CatalogInstrument): Promise<Quote> {
  const cacheKey = `catalog:${inst.id}`;
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.quote;

  let quote: Quote;
  if (inst.binancePair) {
    quote = await fetchBinanceQuoteByPair(inst.binancePair, inst.displaySymbol);
  } else if (inst.yahooTicker) {
    quote = await fetchYahooQuote(inst.yahooTicker, inst.displaySymbol);
  } else {
    quote = demoQuote(inst.displaySymbol, inst.assetClass);
  }

  quoteCache.set(cacheKey, { quote, expires: Date.now() + CACHE_TTL_MS });
  return quote;
}

async function getChartSeriesForInstrument(inst: CatalogInstrument, mid: number): Promise<number[]> {
  const key = `catalog-series:${inst.id}`;
  const cached = seriesCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.series;

  let series: number[];
  try {
    if (inst.binancePair) {
      series = await fetchBinanceSeriesByPair(inst.binancePair);
    } else if (inst.yahooTicker) {
      series = await fetchYahooSeries(inst.yahooTicker);
    } else {
      series = demoSeries(mid);
    }
  } catch {
    series = demoSeries(mid);
  }

  seriesCache.set(key, { series, expires: Date.now() + SERIES_CACHE_TTL_MS });
  return series;
}

function buildScreenerItemLite(inst: CatalogInstrument): ScreenerItem {
  const quote = demoQuote(inst.displaySymbol, inst.assetClass, { stable: true });
  const series = demoSeries(quote.mid);
  return {
    ...quote,
    symbol: inst.displaySymbol,
    id: inst.id,
    name: inst.name,
    displaySymbol: inst.displaySymbol,
    category: inst.category,
    tvSymbol: inst.tvSymbol,
    tradable: inst.tradable,
    series,
    changePct: changeFromSeries(series),
  };
}

async function buildScreenerItem(inst: CatalogInstrument, live = true): Promise<ScreenerItem> {
  if (!live) return buildScreenerItemLite(inst);

  try {
    const quote = await getQuoteForInstrument(inst);
    const series = await getChartSeriesForInstrument(inst, quote.mid);
    const liveSeries =
      series.length > 0 ? [...series.slice(0, -1), quote.mid] : demoSeries(quote.mid);
    return {
      ...quote,
      id: inst.id,
      name: inst.name,
      displaySymbol: inst.displaySymbol,
      category: inst.category,
      tvSymbol: inst.tvSymbol,
      tradable: inst.tradable,
      series: liveSeries,
      changePct: changeFromSeries(liveSeries),
    };
  } catch (err) {
    console.warn("[market]", inst.displaySymbol, err instanceof Error ? err.message : err);
    return buildScreenerItemLite(inst);
  }
}

/** Bulk screener: demo quotes only — safe for 500+ symbols, no API storm. */
export async function buildCategoryScreener(
  category: MarketCategory,
  opts?: { live?: boolean; liveCap?: number },
): Promise<ScreenerItem[]> {
  const instruments = getCatalogByCategory(category);
  const live = opts?.live ?? false;
  const liveCap = opts?.liveCap ?? 0;

  if (!live) {
    return instruments.map(buildScreenerItemLite);
  }

  const batchSize = 6;
  const results: ScreenerItem[] = [];
  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize);
    const items = await Promise.all(
      batch.map((inst, j) => buildScreenerItem(inst, i + j < liveCap)),
    );
    results.push(...items);
  }
  return results;
}

export async function buildFullScreener(): Promise<Record<MarketCategory, ScreenerItem[]>> {
  const out = {} as Record<MarketCategory, ScreenerItem[]>;
  for (const cat of MARKET_CATEGORIES) {
    out[cat.id] = await buildCategoryScreener(cat.id, { live: false });
  }
  return out;
}

export function getMarketCatalogMeta() {
  return {
    categories: MARKET_CATEGORIES,
    instruments: CATALOG.map((i) => ({
      id: i.id,
      displaySymbol: i.displaySymbol,
      name: i.name,
      category: i.category,
      tvSymbol: i.tvSymbol,
      tradable: i.tradable,
      assetClass: i.assetClass,
    })),
    totalInstruments: CATALOG.length,
  };
}

export async function getInstrumentDetail(id: string): Promise<ScreenerItem | null> {
  const inst = getCatalogInstrument(id);
  if (!inst) return null;
  return buildScreenerItem(inst);
}
