import type { AssetClass } from "./types";
import {
  COMMODITY_INSTRUMENTS,
  CRYPTO_EUR_INSTRUMENTS,
  CRYPTO_USDT_INSTRUMENTS,
  FX_INSTRUMENTS,
  INDEX_INSTRUMENTS,
  STOCK_INSTRUMENTS,
} from "./marketCatalogInstruments";

export type MarketCategory =
  | "currencies"
  | "stocks"
  | "indexes"
  | "commodities"
  | "crypto_usdt"
  | "crypto_eurt";

export type CatalogInstrument = {
  id: string;
  displaySymbol: string;
  name: string;
  category: MarketCategory;
  tvSymbol: string;
  assetClass: AssetClass;
  tradable: boolean;
  yahooTicker?: string;
  binancePair?: string;
};

export const MARKET_CATEGORIES: Array<{
  id: MarketCategory;
  label: string;
  description: string;
}> = [
  { id: "currencies", label: "Currencies", description: "G10 majors, crosses & exotics" },
  { id: "stocks", label: "Stocks", description: "US & global equities & ETFs" },
  { id: "indexes", label: "Indices", description: "Global benchmarks" },
  { id: "commodities", label: "Commodities", description: "Metals, energy & agriculture" },
  { id: "crypto_usdt", label: "Crypto USDT", description: "USDT spot pairs" },
  { id: "crypto_eurt", label: "Crypto EURT", description: "EUR spot pairs" },
];

export const CATALOG: CatalogInstrument[] = [
  ...FX_INSTRUMENTS,
  ...STOCK_INSTRUMENTS,
  ...INDEX_INSTRUMENTS,
  ...COMMODITY_INSTRUMENTS,
  ...CRYPTO_USDT_INSTRUMENTS,
  ...CRYPTO_EUR_INSTRUMENTS,
];

export function getCatalogByCategory(category: MarketCategory): CatalogInstrument[] {
  return CATALOG.filter((i) => i.category === category);
}

export function getCatalogInstrument(id: string): CatalogInstrument | undefined {
  return CATALOG.find((i) => i.id === id);
}
