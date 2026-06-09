import { Router } from "express";
import { z } from "zod";
import {
  buildCategoryScreener,
  buildFullScreener,
  buildWatchlist,
  getInstrumentDetail,
  getMarketCatalogMeta,
  getQuote,
  searchSymbols,
  isAlpacaConfigured,
  usesFreeLiveFeeds,
} from "../marketData";
import { getMarketStatus } from "../marketHours";
import { requireAuth } from "../auth";

export const marketRouter = Router();

const categorySchema = z.enum([
  "currencies",
  "stocks",
  "indexes",
  "commodities",
  "crypto_usdt",
  "crypto_eurt",
]);

marketRouter.get("/status", (_req, res) => {
  res.json({
    ...getMarketStatus(),
    freeLiveFeeds: usesFreeLiveFeeds(),
    alpacaConfigured: isAlpacaConfigured(),
    demoFallback: true,
  });
});

marketRouter.get("/catalog", requireAuth, (_req, res) => {
  res.json(getMarketCatalogMeta());
});

marketRouter.get("/screener-all", requireAuth, async (_req, res) => {
  try {
    const screener = await buildFullScreener();
    res.json({ screener, market: getMarketStatus() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screener failed.";
    res.status(502).json({ error: message });
  }
});

marketRouter.get("/screener/:category", requireAuth, async (req, res) => {
  const parsed = categorySchema.safeParse(req.params.category);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid category." });
    return;
  }
  try {
    const live = req.query.live === "1";
    const instruments = await buildCategoryScreener(parsed.data, {
      live,
      liveCap: live ? 24 : 0,
    });
    res.json({ category: parsed.data, instruments, market: getMarketStatus() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screener failed.";
    res.status(502).json({ error: message });
  }
});

marketRouter.get("/instrument/:id", requireAuth, async (req, res) => {
  try {
    const instrument = await getInstrumentDetail(req.params.id);
    if (!instrument) {
      res.status(404).json({ error: "Instrument not found." });
      return;
    }
    res.json({ instrument });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Instrument load failed.";
    res.status(502).json({ error: message });
  }
});

marketRouter.get("/watchlist", requireAuth, async (_req, res) => {
  const items = await buildWatchlist();
  res.json({ quotes: items, market: getMarketStatus() });
});

marketRouter.get("/quote", requireAuth, async (req, res) => {
  const parsed = z
    .object({
      symbol: z.string().min(1),
      assetClass: z.enum(["us_equity", "crypto"]),
    })
    .safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({ error: "symbol and assetClass required." });
    return;
  }

  try {
    const quote = await getQuote(parsed.data.symbol, parsed.data.assetClass);
    res.json({ quote });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Quote failed.";
    res.status(502).json({ error: message });
  }
});

marketRouter.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q ?? "");
  const results = await searchSymbols(q);
  res.json({ results });
});

marketRouter.get("/news", requireAuth, async (req, res) => {
  const symbol = String(req.query.symbol ?? "SPY").trim();
  try {
    const { fetchSymbolNews } = await import("../marketNews");
    const items = await fetchSymbolNews(symbol);
    res.json({ symbol, items });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "News unavailable." });
  }
});
