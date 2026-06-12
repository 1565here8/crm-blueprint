export type AssetClass = "stock" | "crypto";

export type OhlcBar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type MarketQuote = {
  symbol: string;
  assetClass: AssetClass;
  name: string;
  currency: "USD";
  price: number;
  change24hPct: number;
  bars: OhlcBar[];
  source: "live" | "demo";
  fetchedAt: number;
  latencyMs: number;
};

export type DimensionScore = {
  id: "d1_trend" | "d2_flow" | "d3_correlation" | "d4_risk";
  label: string;
  score: number;
  signal: "bullish" | "bearish" | "neutral";
  summary: string;
  metrics: Record<string, number>;
};

export type FourDAnalysis = {
  symbol: string;
  assetClass: AssetClass;
  compositeScore: number;
  bias: "long" | "short" | "neutral";
  dimensions: DimensionScore[];
  tips: string[];
  optimizations: string[];
  analyzedAt: number;
  computeMs: number;
};
