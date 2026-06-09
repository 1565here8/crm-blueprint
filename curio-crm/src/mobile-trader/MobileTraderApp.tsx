import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Loader2,
  LogOut,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import {
  client,
  fmtMoney,
  fmtPct,
  fmtPrice,
  type MarketCategory,
  type PositionMark,
  type ScreenerItem,
  type UserSummary,
} from "../api/client";
import { TradingViewChart } from "../components/TradingViewChart";
import { useAuth } from "../context/AuthContext";
import { MobileSparkline } from "./MobileSparkline";

type Tab = "markets" | "trade" | "positions" | "account";
type ChartInterval = "5" | "15" | "60" | "D";

const CHART_INTERVALS: { id: ChartInterval; label: string }[] = [
  { id: "5", label: "5m" },
  { id: "15", label: "15m" },
  { id: "60", label: "1H" },
  { id: "D", label: "1D" },
];

const CATEGORY_LABELS: Record<MarketCategory, string> = {
  currencies: "FX",
  stocks: "Stocks",
  indexes: "Indices",
  commodities: "Commodities",
  crypto_usdt: "Crypto",
  crypto_eurt: "Crypto EUR",
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function MobileTraderApp() {
  const { user, loading, login, logout, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("trade");
  const [screener, setScreener] = useState<ScreenerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chartInterval, setChartInterval] = useState<ChartInterval>("15");
  const [screenerBusy, setScreenerBusy] = useState(true);

  const selected = useMemo(
    () => screener.find((s) => s.id === selectedId) ?? screener[0] ?? null,
    [screener, selectedId],
  );

  const loadScreener = useCallback(() => {
    void client
      .screenerAll()
      .then((d) => {
        const flat = Object.values(d.screener).flat().filter((i) => i.tradable);
        setScreener(flat);
        setSelectedId((prev) => prev ?? flat[0]?.id ?? null);
      })
      .finally(() => setScreenerBusy(false));
  }, []);

  useEffect(() => {
    if (!user || user.role === "admin" || user.isStaff) return;
    loadScreener();
  }, [user, loadScreener]);

  useEffect(() => {
    if (!user || user.role === "admin" || user.isStaff || !selectedId) return;
    const refresh = () => {
      void client.instrument(selectedId).then(({ instrument }) => {
        setScreener((prev) => prev.map((s) => (s.id === selectedId ? instrument : s)));
      });
    };
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [user, selectedId]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isIos && !standalone) setShowInstall(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      await login(username.trim(), password);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleInstall() {
    if (installEvt) {
      await installEvt.prompt();
      setShowInstall(false);
      return;
    }
    alert("Tap Share → Add to Home Screen to install Curioni Trader on this device.");
  }

  if (loading) {
    return (
      <div className="mobile-trader-app flex min-h-[100dvh] items-center justify-center bg-[#0c0818]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user || user.role === "admin" || user.isStaff) {
    return (
      <div className="mobile-trader-app flex min-h-[100dvh] flex-col bg-[#0c0818] px-6">
        {showInstall && (
          <InstallBanner onInstall={() => void handleInstall()} onDismiss={() => setShowInstall(false)} />
        )}
        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-8 text-center">
            <img src="/brand/curionilabs/mark.svg" alt="" className="mx-auto mb-4 h-16 w-16" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300/80">curionilabs.mobile.trader</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Curioni Labs Trader</h1>
            <p className="mt-2 text-sm text-slate-400">Trade FX, stocks &amp; crypto on any phone</p>
          </div>
          <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
            <input
              type="text"
              autoComplete="username"
              placeholder="Username or email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60"
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder:text-slate-500 outline-none focus:border-indigo-400/60"
            />
            {authError ? <p className="text-center text-sm text-rose-400">{authError}</p> : null}
            <button
              type="submit"
              disabled={authBusy || !username || !password}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white disabled:opacity-50"
            >
              {authBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              Sign in to trade
            </button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500">
            Simulated trading · Install app for fastest access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-trader-app flex min-h-[100dvh] flex-col bg-[#0c0818] text-white">
      {showInstall && (
        <InstallBanner onInstall={() => void handleInstall()} onDismiss={() => setShowInstall(false)} />
      )}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/brand/curionilabs/mark.svg" alt="" className="h-8 w-8" />
          <div>
            <p className="text-sm font-bold">Curioni Trader</p>
            <p className="text-[10px] text-slate-400">curionilabs.mobile.trader</p>
          </div>
        </div>
        <AccountPill user={user} />
      </header>

      <main className="flex-1 overflow-hidden">
        {tab === "markets" && (
          <MarketsTab
            screener={screener}
            busy={screenerBusy}
            selectedId={selected?.id ?? null}
            onPick={(item) => {
              setSelectedId(item.id);
              setTab("trade");
            }}
          />
        )}
        {tab === "trade" && (
          <TradeTab
            user={user}
            screener={screener}
            selected={selected}
            chartInterval={chartInterval}
            onIntervalChange={setChartInterval}
            onSelect={(id) => setSelectedId(id)}
            onRefresh={() => void refresh()}
          />
        )}
        {tab === "positions" && <PositionsTab user={user} onRefresh={() => void refresh()} />}
        {tab === "account" && <AccountTab user={user} onLogout={() => void logout()} />}
      </main>

      <nav className="mobile-trader-bottom-nav grid grid-cols-4 border-t border-white/10 bg-[#120a22]/95 backdrop-blur">
        <NavBtn active={tab === "markets"} label="Markets" onClick={() => setTab("markets")} />
        <NavBtn active={tab === "trade"} label="Trade" onClick={() => setTab("trade")} />
        <NavBtn
          active={tab === "positions"}
          label="Positions"
          badge={user.openPositions.length || undefined}
          onClick={() => setTab("positions")}
        />
        <NavBtn active={tab === "account"} label="Account" onClick={() => setTab("account")} />
      </nav>
    </div>
  );
}

function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div className="mobile-trader-install-banner flex items-center gap-3 border-b border-indigo-500/30 bg-indigo-950/80 px-4 py-3">
      <Download className="h-5 w-5 shrink-0 text-indigo-300" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install Curioni Trader</p>
        <p className="text-xs text-slate-400">Add to home screen — works on iPhone &amp; Android</p>
      </div>
      <button type="button" onClick={onInstall} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold">
        Install
      </button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss install banner" className="shrink-0 text-slate-500">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function NavBtn({
  active,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
        active ? "text-indigo-300" : "text-slate-500"
      }`}
    >
      <span className={`h-1 w-8 rounded-full ${active ? "bg-indigo-500" : "bg-transparent"}`} />
      {label}
      {badge ? (
        <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function AccountPill({ user }: { user: UserSummary }) {
  const cur = user.currency ?? "USD";
  return (
    <div className="rounded-xl bg-white/5 px-3 py-1.5 text-right">
      <p className="text-[10px] text-slate-400">Equity</p>
      <p className="text-sm font-bold text-emerald-300">{fmtMoney(cur, user.equity)}</p>
    </div>
  );
}

function MarketsTab({
  screener,
  busy,
  selectedId,
  onPick,
}: {
  screener: ScreenerItem[];
  busy: boolean;
  selectedId: string | null;
  onPick: (item: ScreenerItem) => void;
}) {
  const [search, setSearch] = useState("");

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return screener.slice(0, 100);
    return screener.filter(
      (i) =>
        i.displaySymbol.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        i.symbol.toLowerCase().includes(q),
    );
  }, [screener, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-inner">
          <Search className="h-4 w-4 text-indigo-300/70" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FX, stocks, crypto…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {busy && screener.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => {
              const active = item.id === selectedId;
              const up = item.changePct >= 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] ${
                      active
                        ? "border-indigo-400/40 bg-indigo-950/40 shadow-lg shadow-indigo-950/30"
                        : "border-white/5 bg-white/[0.03] active:bg-white/5"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold tracking-tight">{item.displaySymbol}</p>
                      <p className="truncate text-xs text-slate-500">{item.name}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        {CATEGORY_LABELS[item.category]}
                      </p>
                    </div>
                    <MobileSparkline series={item.series} positive={up} />
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold">{fmtPrice(item.mid)}</p>
                      <p className={`text-xs font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                        {fmtPct(item.changePct)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TradeTab({
  user,
  screener,
  selected,
  chartInterval,
  onIntervalChange,
  onSelect,
  onRefresh,
}: {
  user: UserSummary;
  screener: ScreenerItem[];
  selected: ScreenerItem | null;
  chartInterval: ChartInterval;
  onIntervalChange: (v: ChartInterval) => void;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const cur = user.currency ?? "USD";

  async function place(side: "BUY" | "SELL") {
    if (!selected) return;
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) {
      setMsg("Enter a valid quantity");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await client.placeOrder({
        symbol: selected.displaySymbol,
        assetClass: selected.category.startsWith("crypto") ? "crypto" : "us_equity",
        qty: n,
        side,
        orderType: "MARKET",
      });
      setMsg(`${side} ${selected.displaySymbol} filled`);
      onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Order rejected");
    } finally {
      setBusy(false);
    }
  }

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const up = selected.changePct >= 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tight">{selected.displaySymbol}</h2>
            <p className="truncate text-xs text-slate-400">{selected.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl font-bold tabular-nums">{fmtPrice(selected.mid)}</p>
            <p className={`flex items-center justify-end gap-1 text-sm font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
              {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {fmtPct(selected.changePct)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {screener.slice(0, 12).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
                s.id === selected.id
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-900/50"
                  : "bg-white/5 text-slate-400 ring-1 ring-white/10"
              }`}
            >
              {s.displaySymbol}
            </button>
          ))}
        </div>
      </div>

      <div className="mobile-trader-chart-panel relative min-h-0 flex-1 border-b border-white/10 bg-[#090612]">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 py-2">
          <div className="flex gap-1 rounded-lg bg-black/50 p-0.5 backdrop-blur-sm">
            {CHART_INTERVALS.map((iv) => (
              <button
                key={iv.id}
                type="button"
                onClick={() => onIntervalChange(iv.id)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                  chartInterval === iv.id ? "bg-indigo-600 text-white" : "text-slate-400"
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>
          <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-medium text-slate-500 backdrop-blur-sm">
            TradingView
          </span>
        </div>
        <TradingViewChart
          key={`${selected.tvSymbol}-${chartInterval}`}
          tvSymbol={selected.tvSymbol}
          interval={chartInterval}
          variant="mobile"
          theme="dark"
          className="mobile-trader-chart h-full min-h-[38dvh] w-full pt-10"
        />
      </div>

      <div className="shrink-0 space-y-3 overflow-y-auto px-4 py-3">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
          <span className="text-slate-500">Buying power</span>
          <span className="font-bold text-emerald-300">{fmtMoney(cur, user.buyingPower)}</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-500">Lots</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            aria-label="Trade quantity in lots"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-lg outline-none ring-indigo-500/30 focus:ring-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void place("BUY")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-700 py-4 text-lg font-black shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
            Buy
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void place("SELL")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-700 py-4 text-lg font-black shadow-lg shadow-rose-950/40 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowDown className="h-5 w-5" />}
            Sell
          </button>
        </div>

        {msg ? <p className="text-center text-sm font-medium text-indigo-300">{msg}</p> : null}
      </div>
    </div>
  );
}

function PositionsTab({ user, onRefresh }: { user: UserSummary; onRefresh: () => void }) {
  const [positions, setPositions] = useState<PositionMark[]>(user.openPositions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const cur = user.currency ?? "USD";

  useEffect(() => {
    setPositions(user.openPositions);
  }, [user.openPositions]);

  async function closePosition(pos: PositionMark) {
    setBusyId(pos.id);
    try {
      await client.placeOrder({
        symbol: pos.symbol,
        assetClass: pos.asset_class,
        qty: pos.qty,
        side: "SELL",
        orderType: "MARKET",
        positionId: pos.id,
      });
      onRefresh();
      const me = await client.me();
      setPositions(me.user.openPositions);
    } catch {
      /* toast via refresh */
    } finally {
      setBusyId(null);
    }
  }

  if (positions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500">
        <p className="text-lg font-semibold text-slate-300">No open positions</p>
        <p className="mt-2 text-sm">Open a trade from the Trade tab</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <ul className="space-y-3">
        {positions.map((pos) => (
          <li key={pos.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{pos.symbol}</p>
                <p className="text-xs text-slate-500">
                  {pos.side} · {pos.qty} @ {fmtPrice(pos.entry_price)}
                </p>
              </div>
              <p className={`font-semibold ${pos.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmtMoney(cur, pos.unrealizedPnl)}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Mark {fmtPrice(pos.mark)}</span>
              <span>{fmtPct(pos.unrealizedPnlPct)}</span>
            </div>
            <button
              type="button"
              disabled={busyId === pos.id}
              onClick={() => void closePosition(pos)}
              className="mt-3 w-full rounded-xl border border-rose-500/40 py-2 text-sm font-semibold text-rose-300 disabled:opacity-50"
            >
              {busyId === pos.id ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Close position"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountTab({ user, onLogout }: { user: UserSummary; onLogout: () => void }) {
  const cur = user.currency ?? "USD";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950/60 to-[#120a22] p-5">
        <p className="text-lg font-bold">{name}</p>
        <p className="text-sm text-slate-400">@{user.username}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Cash" value={fmtMoney(cur, user.cashBalance)} />
          <Stat label="Equity" value={fmtMoney(cur, user.equity)} />
          <Stat label="Buying power" value={fmtMoney(cur, user.buyingPower)} />
          <Stat
            label="Unrealized P/L"
            value={fmtMoney(cur, user.unrealizedPnl)}
            accent={user.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <Wallet className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="font-semibold">curionilabs.mobile.trader</p>
            <p className="text-xs text-slate-500">Installed PWA · v1.0</p>
          </div>
        </div>
      </div>

      <a
        href="/trade"
        className="mt-4 block rounded-2xl border border-white/10 py-3 text-center text-sm font-semibold text-indigo-300"
      >
        Open full desktop terminal
      </a>

      <button
        type="button"
        onClick={onLogout}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 py-3 text-sm text-slate-400"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${accent ?? "text-white"}`}>{value}</p>
    </div>
  );
}
