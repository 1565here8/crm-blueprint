import React, { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Bitcoin,
  Coins,
  Globe2,
  LineChart,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  client,
  fmtPct,
  fmtPrice,
  type CatalogMeta,
  type MarketCategory,
  type ScreenerItem,
} from "../api/client";
import { Sparkline } from "./Sparkline";
import { TradingViewChart } from "./TradingViewChart";

const CATEGORY_ICONS: Record<MarketCategory, React.ReactNode> = {
  currencies: <Globe2 className="h-4 w-4" strokeWidth={1.5} />,
  stocks: <TrendingUp className="h-4 w-4" strokeWidth={1.5} />,
  commodities: <Coins className="h-4 w-4" strokeWidth={1.5} />,
  indexes: <BarChart3 className="h-4 w-4" strokeWidth={1.5} />,
  crypto_usdt: <Bitcoin className="h-4 w-4" strokeWidth={1.5} />,
  crypto_eurt: <Bitcoin className="h-4 w-4" strokeWidth={1.5} />,
};

type Props = {
  onSelectInstrument: (item: ScreenerItem) => void;
  selectedId: string | null;
};

export function MarketTerminal({ onSelectInstrument, selectedId }: Props) {
  const [catalog, setCatalog] = useState<CatalogMeta | null>(null);
  const [category, setCategory] = useState<MarketCategory>("crypto_usdt");
  const [instruments, setInstruments] = useState<ScreenerItem[]>([]);
  const [selected, setSelected] = useState<ScreenerItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategory = useCallback(async (cat: MarketCategory, keepSelection?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.screener(cat);
      setInstruments(data.instruments);
      const pick =
        data.instruments.find((i) => i.id === keepSelection) ??
        data.instruments.find((i) => i.id === selectedId) ??
        data.instruments[0] ??
        null;
      setSelected(pick);
      if (pick) onSelectInstrument(pick);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market data.");
    } finally {
      setLoading(false);
    }
  }, [onSelectInstrument, selectedId]);

  useEffect(() => {
    void client.catalog().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    void loadCategory(category, selectedId ?? undefined);
    const id = setInterval(() => void loadCategory(category, selected?.id), 8000);
    return () => clearInterval(id);
  }, [category, loadCategory, selected?.id, selectedId]);

  function pick(item: ScreenerItem) {
    setSelected(item);
    onSelectInstrument(item);
  }

  return (
    <div className="terminal-shell flex min-h-[680px] flex-col overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/40 lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800/80 bg-[#070708] lg:w-52 lg:border-b-0 lg:border-r">
        <div className="border-b border-zinc-800/60 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/90">
            Markets
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {catalog?.totalInstruments ?? "—"} instruments · live feeds
          </p>
        </div>
        <nav className="flex flex-row gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible">
          {(catalog?.categories ?? []).map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex min-w-[140px] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition lg:min-w-0 ${
                  active
                    ? "bg-amber-500/10 text-amber-100 ring-1 ring-amber-500/30"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <span className={active ? "text-amber-400" : "text-zinc-600"}>
                  {CATEGORY_ICONS[cat.id]}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{cat.label}</span>
                  <span className="hidden text-[10px] text-zinc-600 lg:block">{cat.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="flex w-full flex-col border-b border-zinc-800/80 lg:w-[340px] lg:border-b-0 lg:border-r xl:w-[380px]">
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {catalog?.categories.find((c) => c.id === category)?.label ?? category}
            </p>
            <p className="text-xs text-zinc-600">{instruments.length} symbols</p>
          </div>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-600" /> : null}
        </div>

        {error ? (
          <p className="px-4 py-6 text-sm text-red-400">{error}</p>
        ) : (
          <div className="terminal-scroll max-h-[420px] flex-1 overflow-y-auto lg:max-h-none">
            {instruments.map((item) => {
              const active = selected?.id === item.id;
              const up = item.changePct >= 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => pick(item)}
                  className={`flex w-full items-center gap-3 border-b border-zinc-900/80 px-4 py-3 text-left transition ${
                    active ? "bg-amber-500/[0.07]" : "hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-zinc-100">
                        {item.displaySymbol}
                      </span>
                      <span className="font-mono text-sm text-zinc-200">
                        {fmtPrice(item.mid)}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-zinc-600">{item.name}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Sparkline series={item.series} width={100} height={28} />
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                          up
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {fmtPct(item.changePct)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex min-h-[420px] flex-1 flex-col bg-[#09090b]">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/60 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                  <h2 className="font-mono text-lg font-bold tracking-tight text-white">
                    {selected.displaySymbol}
                  </h2>
                  <span className="rounded border border-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
                    {selected.source}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-500">{selected.name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-semibold text-white">
                  {fmtPrice(selected.mid)}
                </p>
                <p
                  className={`font-mono text-sm font-medium ${
                    selected.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {fmtPct(selected.changePct)} today
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-600">
                  Bid {fmtPrice(selected.bid)} · Ask {fmtPrice(selected.ask)}
                </p>
              </div>
            </div>
            <div className="relative flex-1">
              <TradingViewChart tvSymbol={selected.tvSymbol} interval="15" className="h-full min-h-[480px] w-full" />
            </div>
            <div className="border-t border-zinc-800/60 px-5 py-2">
              <p className="text-[10px] text-zinc-600">
                Professional chart by TradingView · Real-time data · Candlesticks, indicators & drawing tools
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-600">
            <TrendingUp className="h-10 w-10 opacity-40" strokeWidth={1} />
            <p className="text-sm">Select an instrument to open the live chart</p>
          </div>
        )}
      </section>
    </div>
  );
}
