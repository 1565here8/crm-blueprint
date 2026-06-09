import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Info,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Star,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  client,
  fmtMoney,
  fmtPct,
  fmtPrice,
  fmtUsd,
  type CatalogMeta,
  type ClosedPosition,
  type MarketCategory,
  type PendingOrder,
  type PositionMark,
  type ScreenerItem,
} from "../api/client";
import { TradingViewChart } from "./TradingViewChart";

const FAVORITES_KEY = "ws-desk-favorites";
const DEFAULT_EXPANDED: MarketCategory[] = ["currencies"];

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  currencies: "Currencies",
  stocks: "Stocks",
  indexes: "Indices",
  commodities: "Commodities",
  crypto_usdt: "Crypto USDT",
  crypto_eurt: "Crypto EURT",
};

type DeskTab = "open" | "pending" | "closed" | "news";

const SAMPLE_NEWS = [
  {
    id: "1",
    title: "TeamViewer Appoints Peter Ruchatz as Chief Marketing Officer",
    date: "Feb 3 2026 10:45",
    excerpt:
      "TeamViewer strengthens global marketing leadership as the company expands its digital engagement platform for enterprise clients.",
  },
  {
    id: "2",
    title: "Microsoft's Defense Deal And Clean Energy Push Reframe Long-Term Valuation",
    date: "Feb 3 2026 09:30",
    excerpt:
      "Analysts weigh cloud growth against new government contracts and sustainability investments heading into the next earnings cycle.",
  },
  {
    id: "3",
    title: "Euro Holds Steady Ahead of ECB Policy Signals",
    date: "Feb 3 2026 08:15",
    excerpt:
      "FX markets pause as traders await guidance on rate paths and inflation outlook across major currency pairs.",
  },
];

type OrderTypeUi = "MARKET" | "LIMIT";

type Props = {
  mode: "client" | "admin";
  currency?: string;
  chartTheme?: "light" | "dark";
  selectedUserIds?: string[];
  activeTradeUserId?: string;
  adminHeader?: React.ReactNode;
  onRefresh?: () => void;
};

export function TradingDesk({
  mode,
  currency = "USD",
  chartTheme,
  selectedUserIds = [],
  activeTradeUserId,
  adminHeader,
  onRefresh,
}: Props) {
  const broker = mode === "client";
  const tvTheme = chartTheme ?? (broker ? "light" : "dark");
  const fmtAcct = (n: number) => (broker ? fmtMoney(currency, n) : fmtUsd(n));
  const [catalog, setCatalog] = useState<CatalogMeta | null>(null);
  const [screener, setScreener] = useState<Record<MarketCategory, ScreenerItem[]> | null>(null);
  const [selected, setSelected] = useState<ScreenerItem | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<MarketCategory>>(new Set(DEFAULT_EXPANDED));
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites());
  const [lots, setLots] = useState("1");
  const [orderType, setOrderType] = useState<OrderTypeUi>("MARKET");
  const [limitPrice, setLimitPrice] = useState("");
  const [tab, setTab] = useState<DeskTab>("open");
  const [loading, setLoading] = useState(true);
  const [tradePending, setTradePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [infoRow, setInfoRow] = useState<PositionMark | PendingOrder | ClosedPosition | null>(null);

  const [openPositions, setOpenPositions] = useState<PositionMark[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);

  const loadMarket = useCallback(async () => {
    try {
      const data = await client.screenerAll();
      setScreener(data.screener);
      setSelected((prev) => {
        if (prev) {
          for (const cat of Object.values(data.screener)) {
            const hit = cat.find((i) => i.id === prev.id);
            if (hit) return { ...hit, ...prev };
          }
        }
        return data.screener.currencies[0] ?? data.screener.crypto_usdt[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Market load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSelectedLive = useCallback(async (id: string) => {
    try {
      const { instrument } = await client.instrument(id);
      setSelected(instrument);
      setScreener((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        const cat = instrument.category;
        next[cat] = next[cat].map((i) => (i.id === id ? instrument : i));
        return next;
      });
    } catch {
      /* live quote refresh is best-effort */
    }
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      if (mode === "admin") {
        const desk = await client.adminTradingDesk(selectedUserIds);
        setOpenPositions(desk.openPositions);
        setPendingOrders(desk.pendingOrders);
        setClosedPositions(desk.closedPositions);
      } else {
        const [me, pending, history] = await Promise.all([
          client.me(),
          client.pending(),
          client.history(),
        ]);
        setOpenPositions(me.user.openPositions);
        setPendingOrders(pending.orders);
        setClosedPositions(history.closedPositions);
      }
      onRefresh?.();
    } catch {
      /* positions refresh is best-effort */
    }
  }, [mode, selectedUserIds, onRefresh]);

  useEffect(() => {
    void client.catalog().then(setCatalog).catch(() => null);
    void loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    if (!selected?.id) return;
    void refreshSelectedLive(selected.id);
    const id = setInterval(() => void refreshSelectedLive(selected.id), 8000);
    return () => clearInterval(id);
  }, [selected?.id, refreshSelectedLive]);

  useEffect(() => {
    void loadPositions();
    const id = setInterval(() => void loadPositions(), 5000);
    return () => clearInterval(id);
  }, [loadPositions]);

  const filteredScreener = useMemo(() => {
    if (!screener) return null;
    const q = search.trim().toLowerCase();
    const out = {} as Record<MarketCategory, ScreenerItem[]>;
    for (const cat of Object.keys(screener) as MarketCategory[]) {
      const items = screener[cat];
      out[cat] = q
        ? items.filter(
            (i) =>
              i.displaySymbol.toLowerCase().includes(q) ||
              i.name.toLowerCase().includes(q),
          )
        : items;
    }
    return out;
  }, [screener, search]);

  function toggleFavorite(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function toggleCategory(cat: MarketCategory) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const tradeUserId = mode === "admin" ? activeTradeUserId ?? selectedUserIds[0] : undefined;

  const orderPreview = useMemo(() => {
    if (!selected?.tradable) return null;
    const qty = Number(lots);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    const px =
      orderType === "LIMIT" && limitPrice.trim()
        ? Number(limitPrice)
        : selected.ask;
    if (!Number.isFinite(px) || px <= 0) return null;
    return { qty, estNotional: px * qty, estPrice: px };
  }, [selected, lots, orderType, limitPrice]);

  async function executeTrade(side: "BUY" | "SELL") {
    if (!selected?.tradable) return;
    const qty = Number(lots);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Enter a valid lot size.");
      return;
    }
    const limit = orderType === "LIMIT" ? Number(limitPrice) : undefined;
    if (orderType === "LIMIT" && (!limit || !Number.isFinite(limit) || limit <= 0)) {
      setError("Enter a valid limit price.");
      return;
    }

    if (mode === "admin") {
      if (!tradeUserId) {
        setError("Load one client (Set Users) before trading.");
        return;
      }
      if (selectedUserIds.length > 1) {
        setError("Trading is for the active client only. Reset or load a single user.");
        return;
      }
      setTradePending(true);
      setError(null);
      try {
        if (side === "BUY") {
          await client.adminOpenTrade({
            userId: tradeUserId,
            symbol: selected.displaySymbol,
            assetClass: selected.assetClass,
            qty,
          });
          setToast(`Opened BUY ${qty} ${selected.displaySymbol}`);
        } else {
          const pos = openPositions.find(
            (p) => p.symbol === selected.displaySymbol && p.user_id === tradeUserId,
          );
          if (!pos) throw new Error("No open position to sell for this symbol.");
          const sellQty = Math.min(qty, pos.qty);
          await client.adminCloseTrade(pos.id, sellQty < pos.qty ? sellQty : undefined);
          setToast(`Closed ${sellQty} ${selected.displaySymbol}`);
        }
        await loadPositions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Trade failed.");
      } finally {
        setTradePending(false);
      }
      return;
    }

    setTradePending(true);
    setError(null);
    try {
      if (side === "BUY") {
        const data = await client.placeOrder({
          symbol: selected.displaySymbol,
          assetClass: selected.assetClass,
          qty,
          side: "BUY",
          orderType,
          limitPrice: limit,
        });
        if (data.fill) {
          setToast(`FILLED BUY ${data.fill.qty} ${data.fill.symbol} @ ${fmtAcct(data.fill.price)}`);
        } else {
          setToast("Buy order queued (limit).");
          setTab("pending");
        }
      } else {
        const pos = openPositions.find((p) => p.symbol === selected.displaySymbol);
        if (!pos) throw new Error("No open position to sell.");
        const sellQty = Math.min(qty, pos.qty);
        const data = await client.placeOrder({
          symbol: selected.displaySymbol,
          assetClass: selected.assetClass,
          qty: sellQty,
          side: "SELL",
          orderType,
          limitPrice: limit,
          positionId: pos.id,
        });
        if (data.fill) {
          setToast(`FILLED SELL ${data.fill.qty} ${data.fill.symbol} @ ${fmtAcct(data.fill.price)}`);
        } else {
          setToast("Sell limit order queued.");
          setTab("pending");
        }
      }
      await loadPositions();
      if (broker && orderType === "MARKET") setTab(side === "SELL" ? "closed" : "open");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trade failed.");
    } finally {
      setTradePending(false);
    }
  }

  async function closePosition(pos: PositionMark) {
    setTradePending(true);
    setError(null);
    try {
      if (mode === "admin") {
        await client.adminCloseTrade(pos.id);
      } else {
        const sellQty = Number(lots);
        const qty =
          Number.isFinite(sellQty) && sellQty > 0 && sellQty < pos.qty ? sellQty : pos.qty;
        await client.placeOrder({
          symbol: pos.symbol,
          assetClass: pos.asset_class,
          qty,
          side: "SELL",
          orderType: "MARKET",
          positionId: pos.id,
        });
      }
      setToast(`Closed ${pos.symbol}`);
      await loadPositions();
      if (broker) setTab("closed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Close failed.");
    } finally {
      setTradePending(false);
    }
  }

  async function cancelPendingOrder(orderId: string) {
    setTradePending(true);
    setError(null);
    try {
      if (mode === "admin") {
        await client.adminCancelPending(orderId);
      } else {
        await client.cancelPending(orderId);
      }
      setToast("Order cancelled.");
      await loadPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setTradePending(false);
    }
  }

  async function setPositionStops(pos: PositionMark) {
    const slRaw = window.prompt("Stop loss price (empty = clear)", String((pos as PositionMark & { stop_loss?: number }).stop_loss ?? ""));
    if (slRaw === null) return;
    const tpRaw = window.prompt("Take profit price (empty = clear)", String((pos as PositionMark & { take_profit?: number }).take_profit ?? ""));
    if (tpRaw === null) return;
    const stopLoss = slRaw.trim() ? Number(slRaw) : null;
    const takeProfit = tpRaw.trim() ? Number(tpRaw) : null;
    if (stopLoss != null && !Number.isFinite(stopLoss)) {
      setError("Invalid stop loss.");
      return;
    }
    if (takeProfit != null && !Number.isFinite(takeProfit)) {
      setError("Invalid take profit.");
      return;
    }
    setTradePending(true);
    try {
      if (mode === "admin" && tradeUserId) {
        await client.adminSetPositionStops(pos.id, { userId: tradeUserId, stopLoss, takeProfit });
      } else {
        await client.setPositionStops(pos.id, { stopLoss, takeProfit });
      }
      setToast("SL/TP saved — auto-close when price hits.");
      await loadPositions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "SL/TP update failed.");
    } finally {
      setTradePending(false);
    }
  }

  const categories = catalog?.categories ?? [];

  return (
    <div
      className={
        broker
          ? "flex flex-col overflow-hidden border-t border-slate-200 bg-white"
          : "flex flex-col overflow-hidden rounded-lg border border-slate-700/80 bg-[#0f1419] shadow-xl"
      }
    >
      {adminHeader}

      {error ? (
        <div
          className={
            broker
              ? "border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
              : "border-b border-red-900/40 bg-red-950/30 px-4 py-2 text-sm text-red-300"
          }
        >
          {error}
        </div>
      ) : null}
      {toast ? (
        <div
          className={
            broker
              ? "border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800"
              : "border-b border-emerald-900/40 bg-emerald-950/20 px-4 py-2 text-sm text-emerald-300"
          }
        >
          {toast}
          <button
            type="button"
            className={`ml-3 ${broker ? "text-emerald-600 hover:text-emerald-900" : "text-emerald-500 hover:text-white"}`}
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      <div
        className={`flex min-h-0 flex-1 flex-col lg:flex-row ${broker ? "lg:h-[calc(100vh-140px)]" : "min-h-[620px]"}`}
      >
        {/* Left sidebar — asset list (full height) */}
        <aside
          className={
            broker
              ? "flex w-full shrink-0 flex-col self-stretch border-b border-slate-200 bg-white lg:w-[280px] lg:border-b-0 lg:border-r"
              : "flex w-full shrink-0 flex-col border-b border-slate-700/60 bg-[#151c28] lg:w-[280px] lg:border-b-0 lg:border-r"
          }
        >
          <div className={`border-b p-2 ${broker ? "border-slate-200" : "border-slate-700/50"}`}>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className={
                  broker
                    ? "w-full rounded border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#5eb8e8] focus:outline-none"
                    : "w-full rounded border border-slate-600/60 bg-[#0f1419] py-2 pl-8 pr-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
                }
              />
            </div>
          </div>

          <div
            className={`grid grid-cols-[1fr_56px_56px_24px] gap-0 border-b px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
              broker ? "border-slate-200 text-slate-400" : "border-slate-700/50 text-slate-500"
            }`}
          >
            <span>Asset</span>
            <span className="text-right">Bid</span>
            <span className="text-right">Ask</span>
            <span />
          </div>

          <div className="terminal-scroll max-h-[320px] flex-1 overflow-y-auto lg:max-h-none lg:overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : (
              categories.map((cat) => {
                const items = filteredScreener?.[cat.id] ?? [];
                if (items.length === 0 && search) return null;
                const isOpen = expanded.has(cat.id);
                return (
                  <div key={cat.id}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={
                        broker
                          ? "flex w-full items-center gap-1.5 border-b border-slate-100 bg-[#eef4fb] px-2 py-2 text-left text-xs font-semibold text-[#1a3a7a] hover:bg-[#e3edf8]"
                          : "flex w-full items-center gap-1.5 border-b border-slate-800/80 bg-[#1a2332] px-2 py-2 text-left text-xs font-semibold text-slate-300 hover:bg-[#1e2a3a]"
                      }
                    >
                      {isOpen ? (
                        <Minus className={`h-3 w-3 ${broker ? "text-[#5eb8e8]" : "text-sky-400"}`} />
                      ) : (
                        <Plus className={`h-3 w-3 ${broker ? "text-[#5eb8e8]" : "text-sky-400"}`} />
                      )}
                      {CATEGORY_LABELS[cat.id] ?? cat.label}
                      <span className={`ml-auto text-[10px] font-normal ${broker ? "text-slate-400" : "text-slate-600"}`}>
                        {items.length}
                      </span>
                    </button>
                    {isOpen
                      ? items.map((item) => {
                          const active = selected?.id === item.id;
                          const fav = favorites.has(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelected(item)}
                              className={`grid w-full grid-cols-[1fr_56px_56px_24px] items-center gap-0 border-b px-2 py-1.5 text-left transition ${
                                broker
                                  ? active
                                    ? "border-slate-100 bg-[#e8f4fc]"
                                    : "border-slate-50 hover:bg-slate-50"
                                  : active
                                    ? "border-slate-800/40 bg-sky-900/30"
                                    : "border-slate-800/40 hover:bg-slate-800/40"
                              }`}
                            >
                              <span
                                className={`truncate font-mono text-[11px] font-medium ${
                                  broker ? "text-slate-800" : "text-slate-200"
                                }`}
                              >
                                {item.displaySymbol}
                              </span>
                              <span className="text-right font-mono text-[11px] text-red-400">
                                {fmtPrice(item.bid)}
                              </span>
                              <span className="text-right font-mono text-[11px] text-emerald-400">
                                {fmtPrice(item.ask)}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => toggleFavorite(item.id, e)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") toggleFavorite(item.id, e as unknown as React.MouseEvent);
                                }}
                                className="flex justify-center"
                              >
                                <Star
                                  className={`h-3 w-3 ${fav ? "fill-amber-400 text-amber-400" : broker ? "text-slate-300" : "text-slate-600"}`}
                                />
                              </span>
                            </button>
                          );
                        })
                      : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center column: chart + positions panel */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <section className={`flex min-h-0 flex-1 flex-col ${broker ? "bg-white" : "bg-[#0c1017]"}`}>
          {selected ? (
            <>
              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 ${
                  broker ? "border-slate-200" : "border-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <h2 className={`font-mono text-base font-bold ${broker ? "text-slate-800" : "text-white"}`}>
                    {selected.displaySymbol}
                  </h2>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                      broker ? "bg-slate-100 text-slate-500" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    1m
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Market Open
                  </span>
                </div>
                <div className={`flex items-center gap-2 font-mono text-xs ${broker ? "text-slate-500" : "text-slate-400"}`}>
                  <span className="text-red-500">Bid {fmtPrice(selected.bid)}</span>
                  <span className={broker ? "text-slate-300" : "text-slate-600"}>|</span>
                  <span className="text-emerald-600">Ask {fmtPrice(selected.ask)}</span>
                  <span
                    className={`ml-2 ${selected.changePct >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {fmtPct(selected.changePct)}
                  </span>
                </div>
              </div>

              <div className={`relative min-h-[240px] flex-1 ${broker ? "min-h-[300px]" : "min-h-[360px]"}`}>
                <TradingViewChart
                  tvSymbol={selected.tvSymbol}
                  interval="1"
                  theme={tvTheme}
                  className="absolute inset-0 h-full w-full"
                />
              </div>

              <div
                className={`flex flex-wrap items-center gap-3 border-t px-4 py-3 ${
                  broker ? "border-slate-200 bg-slate-50" : "border-slate-700/50 bg-[#151c28]"
                }`}
              >
                <label className={`flex items-center gap-2 text-xs ${broker ? "text-slate-500" : "text-slate-400"}`}>
                  Lots
                  <input
                    value={lots}
                    onChange={(e) => setLots(e.target.value)}
                    className={
                      broker
                        ? "w-20 rounded border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-800 focus:border-[#5eb8e8] focus:outline-none"
                        : "w-20 rounded border border-slate-600 bg-[#0f1419] px-2 py-1.5 font-mono text-sm text-white focus:border-sky-500 focus:outline-none"
                    }
                  />
                </label>
                <label className={`flex items-center gap-2 text-xs ${broker ? "text-slate-500" : "text-slate-400"}`}>
                  Type
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderTypeUi)}
                    className={
                      broker
                        ? "rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800"
                        : "rounded border border-slate-600 bg-[#0f1419] px-2 py-1.5 text-xs text-white"
                    }
                  >
                    <option value="MARKET">Market</option>
                    <option value="LIMIT">Limit</option>
                  </select>
                </label>
                {orderType === "LIMIT" ? (
                  <label className={`flex items-center gap-2 text-xs ${broker ? "text-slate-500" : "text-slate-400"}`}>
                    Limit
                    <input
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={fmtPrice(selected.ask)}
                      className={
                        broker
                          ? "w-24 rounded border border-slate-200 bg-white px-2 py-1.5 font-mono text-sm text-slate-800"
                          : "w-24 rounded border border-slate-600 bg-[#0f1419] px-2 py-1.5 font-mono text-sm text-white"
                      }
                    />
                  </label>
                ) : null}
                {orderPreview ? (
                  <span className={`text-[10px] ${broker ? "text-slate-500" : "text-slate-500"}`}>
                    Est. ~{fmtAcct(orderPreview.estNotional)} @ {fmtPrice(orderPreview.estPrice)}
                  </span>
                ) : null}
                <button
                  type="button"
                  disabled={tradePending || !selected.tradable}
                  onClick={() => void executeTrade("BUY")}
                  className="min-w-[120px] rounded bg-emerald-600 px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:opacity-40"
                >
                  Buy
                </button>
                <button
                  type="button"
                  disabled={tradePending || !selected.tradable}
                  onClick={() => void executeTrade("SELL")}
                  className="min-w-[120px] rounded bg-red-600 px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-900/30 hover:bg-red-500 disabled:opacity-40"
                >
                  Sell
                </button>
                {!selected.tradable ? (
                  <span className={`text-xs ${broker ? "text-slate-400" : "text-slate-500"}`}>Analysis only</span>
                ) : null}
              </div>
            </>
          ) : (
            <div className={`flex flex-1 items-center justify-center text-sm ${broker ? "text-slate-400" : "text-slate-600"}`}>
              Select an instrument from the sidebar
            </div>
          )}
          </section>

          {/* Bottom positions panel — under chart only (Toropros architecture) */}
          <div
            className={`flex shrink-0 flex-col border-t ${
              broker
                ? "h-[220px] border-slate-200 bg-white sm:h-[260px] lg:h-[280px]"
                : "border-slate-700/60 bg-[#151c28] min-h-[200px] max-h-[40vh] lg:max-h-none lg:min-h-[240px]"
            }`}
          >
            <div className={`flex shrink-0 border-b ${broker ? "border-slate-200" : "border-slate-700/50"}`}>
              {(
                [
                  ["open", "Open Positions", openPositions.length],
                  ["pending", "Pending Positions", pendingOrders.length],
                  ["closed", "Closed Positions", closedPositions.length],
                  ...(broker ? [["news", "News", 0] as const] : []),
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider transition ${
                    tab === key
                      ? broker
                        ? "border-b-2 border-[#5eb8e8] bg-white text-[#1a3a7a]"
                        : "border-b-2 border-sky-500 bg-[#1a2332] text-sky-300"
                      : broker
                        ? "text-slate-400 hover:text-slate-600"
                        : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {label}
                  {count > 0 ? ` (${count})` : ""}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {tab === "open" ? (
                <PositionsTable
                  rows={openPositions}
                  mode={mode}
                  broker={broker}
                  fmtAcct={fmtAcct}
                  tradePending={tradePending}
                  tradeUserId={tradeUserId}
                  onClose={(p) => void closePosition(p)}
                  onSetStops={(p) => void setPositionStops(p)}
                  onInfo={setInfoRow}
                />
              ) : null}
              {tab === "pending" ? (
                <PendingTable
                  rows={pendingOrders}
                  mode={mode}
                  broker={broker}
                  tradePending={tradePending}
                  onCancel={(id) => void cancelPendingOrder(id)}
                  onInfo={setInfoRow}
                />
              ) : null}
              {tab === "closed" ? (
                <ClosedTable
                  rows={closedPositions}
                  mode={mode}
                  broker={broker}
                  currency={currency}
                  fmtAcct={fmtAcct}
                  onInfo={setInfoRow}
                />
              ) : null}
              {tab === "news" && broker ? <NewsPanel symbol={selected?.displaySymbol ?? "SPY"} /> : null}
            </div>
          </div>
        </div>
      </div>

      {infoRow ? (
        <InfoModal row={infoRow} broker={broker} currency={currency} onClose={() => setInfoRow(null)} />
      ) : null}
    </div>
  );
}

function PositionsTable(props: {
  rows: PositionMark[];
  mode: "client" | "admin";
  broker: boolean;
  fmtAcct: (n: number) => string;
  tradePending: boolean;
  tradeUserId?: string;
  onClose: (p: PositionMark) => void;
  onSetStops: (p: PositionMark) => void;
  onInfo: (p: PositionMark) => void;
}) {
  if (props.rows.length === 0) {
    return <EmptyTab label="No Open Positions" broker={props.broker} />;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className={`text-left uppercase ${props.broker ? "text-slate-400" : "text-slate-500"}`}>
          {props.mode === "admin" ? <th className="px-3 py-2">User</th> : null}
          <th className="px-3 py-2">Open Date</th>
          <th className="px-3 py-2">Lots #</th>
          <th className="px-3 py-2">Asset</th>
          <th className="px-3 py-2">Buy/Sell</th>
          <th className="px-3 py-2">Price</th>
          <th className="px-3 py-2">Mark</th>
          <th className="px-3 py-2">P&amp;L</th>
          <th className="px-3 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((p) => (
          <tr
            key={p.id}
            className={`border-t ${props.broker ? "border-slate-100 text-slate-700" : "border-slate-800/60 text-slate-300"}`}
          >
            {props.mode === "admin" ? (
              <td className="px-3 py-2 text-slate-400">
                {(p as PositionMark & { username?: string }).username ?? p.user_id.slice(0, 8)}
              </td>
            ) : null}
            <td className="px-3 py-2 font-mono">{formatDt(p.opened_at)}</td>
            <td className="px-3 py-2">{p.qty} / {p.qty.toFixed(4)}</td>
            <td className="px-3 py-2 font-mono font-semibold">{p.symbol}</td>
            <td className="px-3 py-2">
              {props.broker ? (
                <BuySellBadge side="Buy" broker />
              ) : (
                <span className="rounded bg-emerald-900/40 px-2 py-0.5 font-bold text-emerald-400">Buy</span>
              )}
            </td>
            <td className="px-3 py-2 font-mono">{fmtPrice(p.entry_price)}</td>
            <td className="px-3 py-2 font-mono">{fmtPrice(p.mark)}</td>
            <td
              className={`px-3 py-2 font-mono ${p.unrealizedPnl >= 0 ? "text-emerald-600" : "text-red-500"}`}
            >
              {props.fmtAcct(p.unrealizedPnl)}
            </td>
            <td className="px-3 py-2">
              <div className="flex justify-end gap-1.5">
                <ActionBtn tone="red" onClick={() => props.onClose(p)} disabled={props.tradePending}>
                  Close
                </ActionBtn>
                <ActionBtn tone="blue" onClick={() => props.onSetStops(p)} disabled={props.tradePending}>
                  SL/TP
                </ActionBtn>
                <ActionBtn tone="sky" onClick={() => props.onInfo(p)}>
                  Info
                </ActionBtn>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PendingTable(props: {
  rows: PendingOrder[];
  mode: "client" | "admin";
  broker: boolean;
  tradePending: boolean;
  onCancel: (id: string) => void;
  onInfo: (p: PendingOrder) => void;
}) {
  if (props.rows.length === 0) return <EmptyTab label="No Pending Positions" broker={props.broker} />;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className={`text-left uppercase ${props.broker ? "text-slate-400" : "text-slate-500"}`}>
          {props.mode === "admin" ? <th className="px-3 py-2">User</th> : null}
          <th className="px-3 py-2">Created</th>
          <th className="px-3 py-2">Asset</th>
          <th className="px-3 py-2">Side</th>
          <th className="px-3 py-2">Type</th>
          <th className="px-3 py-2">Qty</th>
          <th className="px-3 py-2">Limit</th>
          <th className="px-3 py-2 text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((o) => (
          <tr
            key={o.id}
            className={`border-t ${props.broker ? "border-slate-100 text-slate-700" : "border-slate-800/60 text-slate-300"}`}
          >
            {props.mode === "admin" ? (
              <td className="px-3 py-2">{o.username ?? o.user_id.slice(0, 8)}</td>
            ) : null}
            <td className="px-3 py-2 font-mono">{formatDt(o.created_at)}</td>
            <td className="px-3 py-2 font-mono">{o.symbol}</td>
            <td className={`px-3 py-2 font-bold ${o.side === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
              {o.side}
            </td>
            <td className="px-3 py-2">{o.order_type}</td>
            <td className="px-3 py-2">{o.qty}</td>
            <td className="px-3 py-2">{o.limit_price != null ? fmtPrice(o.limit_price) : "—"}</td>
            <td className="px-3 py-2 text-right">
              <div className="flex justify-end gap-1">
                <ActionBtn tone="red" onClick={() => props.onCancel(o.id)} disabled={props.tradePending}>
                  Cancel
                </ActionBtn>
                <ActionBtn tone="sky" onClick={() => props.onInfo(o)}>Info</ActionBtn>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClosedTable(props: {
  rows: ClosedPosition[];
  mode: "client" | "admin";
  broker: boolean;
  currency: string;
  fmtAcct: (n: number) => string;
  onInfo: (p: ClosedPosition) => void;
}) {
  if (props.rows.length === 0) {
    return <EmptyTab label="No Closed Positions" broker={props.broker} />;
  }

  const dt = props.broker ? formatBrokerDt : formatDt;

  return (
    <table className="w-full min-w-[900px] text-xs">
      <thead className={props.broker ? "sticky top-0 bg-slate-50" : ""}>
        <tr className={`text-left uppercase ${props.broker ? "text-slate-400" : "text-slate-500"}`}>
          {props.mode === "admin" ? <th className="px-3 py-2.5 font-semibold">User</th> : null}
          <th className="px-3 py-2.5 font-semibold">ID</th>
          <th className="px-3 py-2.5 font-semibold">Open Date</th>
          <th className="px-3 py-2.5 font-semibold">Asset</th>
          <th className="px-3 py-2.5 font-semibold">Buy/Sell</th>
          <th className="px-3 py-2.5 font-semibold">Open Price</th>
          <th className="px-3 py-2.5 font-semibold">Commission</th>
          <th className="px-3 py-2.5 font-semibold">PNL</th>
          <th className="px-3 py-2.5 font-semibold">Close Date</th>
          <th className="px-3 py-2.5 text-right font-semibold">Full Info</th>
        </tr>
      </thead>
      <tbody>
        {props.rows.map((p) => {
          const isBuy = p.side === "long";
          const tradeId =
            p.displayTradeId ??
            (p.trade_number ? `${p.trade_number}x${p.id.replace(/-/g, "").slice(0, 6)}` : p.id.slice(0, 8));
          return (
            <tr
              key={p.id}
              className={`border-t ${props.broker ? "border-slate-100 text-slate-700 hover:bg-slate-50/80" : "border-slate-800/60 text-slate-300"}`}
            >
              {props.mode === "admin" ? (
                <td className="px-3 py-2">{p.username ?? p.user_id.slice(0, 8)}</td>
              ) : null}
              <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{tradeId}</td>
              <td className="px-3 py-2 font-mono whitespace-nowrap">{dt(p.opened_at)}</td>
              <td className="px-3 py-2 font-semibold text-slate-800">{p.symbol}</td>
              <td className="px-3 py-2">
                <BuySellBadge side={isBuy ? "Buy" : "Sell"} broker={props.broker} />
              </td>
              <td className="px-3 py-2 font-mono">{fmtPrice(p.entry_price)}</td>
              <td className="px-3 py-2 font-mono text-slate-600">
                {fmtCommission(props.currency, p.commission ?? 0)}
              </td>
              <td
                className={`px-3 py-2 font-mono font-semibold ${(p.pnl ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {p.pnl != null ? props.fmtAcct(p.pnl) : "—"}
              </td>
              <td className="px-3 py-2 font-mono whitespace-nowrap">{dt(p.closed_at)}</td>
              <td className="px-3 py-2 text-right">
                {props.broker ? (
                  <BrokerInfoBtn onClick={() => props.onInfo(p)} />
                ) : (
                  <ActionBtn tone="sky" onClick={() => props.onInfo(p)}>
                    Info
                  </ActionBtn>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function BuySellBadge({ side, broker }: { side: "Buy" | "Sell"; broker: boolean }) {
  const isBuy = side === "Buy";
  if (broker) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-semibold ${isBuy ? "text-emerald-600" : "text-red-500"}`}
      >
        {isBuy ? <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} /> : <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.5} />}
        {side}
      </span>
    );
  }
  return (
    <span
      className={`rounded px-2 py-0.5 font-bold ${isBuy ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}
    >
      {side}
    </span>
  );
}

function BrokerInfoBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-[#5eb8e8] px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-[#4aa8da]"
    >
      Info
    </button>
  );
}

function ActionBtn(props: {
  children: React.ReactNode;
  tone: "red" | "blue" | "sky";
  onClick: () => void;
  disabled?: boolean;
}) {
  const colors = {
    red: "bg-red-700 hover:bg-red-600",
    blue: "bg-blue-700 hover:bg-blue-600",
    sky: "bg-sky-800 hover:bg-sky-700",
  };
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={`rounded px-3 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-40 ${colors[props.tone]}`}
    >
      {props.children}
    </button>
  );
}

function EmptyTab({ label, broker }: { label: string; broker?: boolean }) {
  return (
    <p className={`py-8 text-center text-sm ${broker ? "text-slate-400" : "text-slate-600"}`}>{label}</p>
  );
}

function NewsPanel({ symbol }: { symbol: string }) {
  const [items, setItems] = useState<Array<{ title: string; date: string; excerpt: string; id: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void client
      .marketNews(symbol)
      .then((r) =>
        setItems(r.items.slice(0, 6).map((n) => ({ id: n.id, title: n.title, date: n.date, excerpt: n.excerpt }))),
      )
      .catch(() => setItems(SAMPLE_NEWS))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading && items.length === 0) {
    return <p className="p-4 text-xs text-slate-500">Loading news for {symbol}…</p>;
  }

  const list = items.length ? items : SAMPLE_NEWS;

  return (
    <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
      {list.map((item) => (
        <article
          key={item.id}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
        >
          <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200" />
          <div className="p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.date}</p>
            <h3 className="mt-1 text-sm font-bold leading-snug text-slate-800">{item.title}</h3>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">{item.excerpt}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function InfoModal(props: {
  row: PositionMark | PendingOrder | ClosedPosition;
  broker?: boolean;
  currency?: string;
  onClose: () => void;
}) {
  const isClosed = "closed_at" in props.row && props.row.status === "closed";
  const closed = isClosed ? (props.row as ClosedPosition) : null;

  if (props.broker && closed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a3a7a]">Full Info</h3>
            <button type="button" onClick={props.onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoField label="Trade ID" value={closed.displayTradeId ?? closed.id.slice(0, 12)} />
            <InfoField label="Asset" value={closed.symbol} />
            <InfoField label="Side" value={closed.side === "long" ? "Buy" : "Sell"} />
            <InfoField label="Quantity" value={String(closed.qty)} />
            <InfoField label="Open Price" value={fmtPrice(closed.entry_price)} />
            <InfoField label="Close Price" value={closed.exit_price != null ? fmtPrice(closed.exit_price) : "—"} />
            <InfoField label="Commission" value={fmtCommission(props.currency ?? "USD", closed.commission ?? 0)} />
            <InfoField
              label="PNL"
              value={closed.pnl != null ? fmtMoney(props.currency ?? "USD", closed.pnl) : "—"}
            />
            <InfoField label="Open Date" value={formatBrokerDt(closed.opened_at)} />
            <InfoField label="Close Date" value={formatBrokerDt(closed.closed_at)} />
          </dl>
          <button
            type="button"
            onClick={props.onClose}
            className="mt-5 w-full rounded-full bg-[#5eb8e8] py-2.5 text-sm font-semibold text-white hover:bg-[#4aa8da]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-slate-600 bg-[#1a2332] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Info className="h-4 w-4 text-sky-400" />
            Trade Info
          </h3>
          <button type="button" onClick={props.onClose} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <pre className="overflow-x-auto rounded bg-[#0f1419] p-3 font-mono text-[11px] text-slate-300">
          {JSON.stringify(props.row, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function formatDt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(",", "");
}

function formatBrokerDt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtCommission(currency: string, n: number) {
  const amount = n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${amount} ${currency}`;
}

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Admin header bar matching Toropros open-trades filter row */
export function AdminTradingHeader(props: {
  userCount: number;
  customerId: string;
  exclude: boolean;
  activeClient?: string;
  onCustomerIdChange: (v: string) => void;
  onExcludeChange: (v: boolean) => void;
  onSetUsers: () => void;
  onReset: () => void;
}) {
  return (
    <div className="border-b border-slate-700/60 bg-[#1a2332] px-4 py-3">
      <h1 className="mb-1 text-lg font-semibold text-white">
        Open Trades ({props.userCount} Users)
      </h1>
      {props.activeClient ? (
        <p className="mb-3 text-xs text-teal-300">
          Active client for trading: <strong className="text-white">{props.activeClient}</strong>
        </p>
      ) : (
        <p className="mb-3 text-xs text-slate-500">Set a customer ID to trade on their book.</p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-400">
          Customer Id
          <input
            value={props.customerId}
            onChange={(e) => props.onCustomerIdChange(e.target.value)}
            placeholder="Display ID or UUID"
            className="mt-1 block w-48 rounded border border-slate-600 bg-[#0f1419] px-3 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 pb-1.5 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={props.exclude}
            onChange={(e) => props.onExcludeChange(e.target.checked)}
            className="rounded border-slate-600"
          />
          Exclude
        </label>
        <button
          type="button"
          onClick={props.onSetUsers}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-blue-500"
        >
          <Zap className="h-3.5 w-3.5" />
          Set Users
        </button>
        <button
          type="button"
          onClick={props.onReset}
          className="flex items-center gap-1.5 rounded bg-red-700 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-red-600"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
    </div>
  );
}
