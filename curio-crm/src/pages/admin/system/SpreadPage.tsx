import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2, RefreshCw, RotateCcw, Save, Search, TrendingUp } from "lucide-react";
import {
  client,
  type CrmUser,
  type SpreadAssetClass,
  type SpreadBundle,
  type SpreadExchangeCell,
  type SpreadTier,
  type SpreadUnit,
} from "../../../api/client";
import {
  btnPrimary,
  btnSecondary,
  DataTable,
  ErrorBanner,
  inputCls,
  PageHeader,
  Panel,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

type Scope = "platform" | "client" | "demo";
type Tab = "trades" | "exchange";

type TierDraft = { tradePercent: string; isPositive: boolean };
type CellKey = `${number}:${SpreadAssetClass}`;
type CellDraft = { value: string; unit: SpreadUnit };

const ASSET_CLASSES: SpreadAssetClass[] = [
  "currencies",
  "commodities",
  "indices",
  "stocks",
  "crypto_usd",
  "crypto_eur",
];

function cellToEffectivePercent(value: number, unit: SpreadUnit, tradePercent: number, isPositive: boolean): number {
  let base = unit === "percent" ? value : value * 0.01;
  base *= Math.max(0.01, tradePercent || 0.55);
  if (!isPositive) base = -Math.abs(base);
  return Math.round(base * 10000) / 10000;
}

function SpreadPreviewChart({
  points,
  tierLabel,
  scopeLabel,
}: {
  points: Array<{ label: string; effectivePercent: number }>;
  tierLabel: string;
  scopeLabel: string;
}) {
  const w = 640;
  const h = 180;
  const pad = { t: 24, r: 16, b: 36, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxAbs = Math.max(0.05, ...points.map((p) => Math.abs(p.effectivePercent)));
  const barW = innerW / Math.max(1, points.length);

  return (
    <Panel className="border-teal-100 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-4 text-white">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Live markup preview</p>
            <p className="text-[11px] text-slate-400">
              {scopeLabel} · tier <span className="text-teal-300">{tierLabel}</span>
            </p>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">Effective spread % by asset class</p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-3xl" role="img" aria-label="Spread preview chart">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = pad.t + innerH * (1 - f);
          return (
            <g key={f}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fill="rgba(148,163,184,0.6)" fontSize="9">
                {(maxAbs * f).toFixed(2)}%
              </text>
            </g>
          );
        })}
        <line
          x1={pad.l}
          y1={pad.t + innerH / 2}
          x2={w - pad.r}
          y2={pad.t + innerH / 2}
          stroke="rgba(45,212,191,0.35)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {points.map((p, i) => {
          const cx = pad.l + barW * i + barW / 2;
          const norm = p.effectivePercent / maxAbs;
          const barH = Math.abs(norm) * (innerH / 2 - 4);
          const y0 = pad.t + innerH / 2;
          const y1 = p.effectivePercent >= 0 ? y0 - barH : y0 + barH;
          const color = p.effectivePercent >= 0 ? "#2dd4bf" : "#f87171";
          return (
            <g key={p.label}>
              <rect
                x={cx - barW * 0.28}
                y={Math.min(y0, y1)}
                width={barW * 0.56}
                height={Math.max(2, barH)}
                rx={3}
                fill={color}
                opacity={0.9}
              />
              <text x={cx} y={h - 10} textAnchor="middle" fill="rgba(148,163,184,0.85)" fontSize="8">
                {p.label.replace("Crypto ", "C")}
              </text>
              <text x={cx} y={Math.min(y0, y1) - 4} textAnchor="middle" fill={color} fontSize="8" fontWeight="600">
                {p.effectivePercent.toFixed(3)}%
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Spread Trades tiers",
    what: "Named tiers (A–K + Neutral) with a trade-percent multiplier — tighter VIP tiers vs wider retail.",
    how: "Edit percent (0–1) and Is positive on each row, then Apply. Negative tiers invert markup for promo accounts.",
    when: "Launching VIP vs Retail products or repricing after liquidity review.",
  },
  {
    title: "Spread Exchange matrix",
    what: "Per-tier markup by asset class — pips for FX/commodities, percent for indices/stocks/crypto.",
    how: "Edit cells inline, Save row, or Apply To All for one column. Restore Default resets the full ladder.",
    when: "Crypto weekend widening or FX session changes.",
  },
  {
    title: "Scope bar",
    what: "Platform default applies everywhere. Client override targets one login. Demo mode sets paper-account spreads.",
    how: "Pick scope first — the preview chart updates live as you edit.",
    when: "VIP client negotiation or demo funnel with tighter spreads.",
  },
  {
    title: "Account type link",
    what: "Retail / VIP / IB account types map to spread tier slugs (see Account Type page).",
    how: "New clients inherit their account type tier unless you assign a client override here.",
    when: "Aligning product tiers with marketing names.",
  },
];

export function SpreadPage() {
  const [tab, setTab] = useState<Tab>("trades");
  const [scope, setScope] = useState<Scope>("platform");
  const [demoMode, setDemoMode] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<CrmUser[]>([]);
  const [selectedClient, setSelectedClient] = useState<CrmUser | null>(null);
  const [bundle, setBundle] = useState<SpreadBundle | null>(null);
  const [tierDrafts, setTierDrafts] = useState<Record<number, TierDraft>>({});
  const [cellDrafts, setCellDrafts] = useState<Record<CellKey, CellDraft>>({});
  const [previewTierId, setPreviewTierId] = useState<number | null>(null);
  const [showTierId, setShowTierId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const effectiveScope: Scope = demoMode ? "demo" : scope;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminGetSpread({
        demo: effectiveScope === "demo",
        userId: effectiveScope === "client" ? selectedClient?.id : undefined,
      });
      setBundle(data);
      const td: Record<number, TierDraft> = {};
      for (const t of data.tiers) {
        td[t.id] = { tradePercent: String(t.trade_percent), isPositive: Boolean(t.is_positive) };
      }
      setTierDrafts(td);
      const cd: Record<CellKey, CellDraft> = {};
      for (const c of data.exchange) {
        cd[`${c.tier_id}:${c.asset_class}`] = { value: String(c.value), unit: c.unit };
      }
      setCellDrafts(cd);
      if (!previewTierId && data.tiers.length) {
        setPreviewTierId(data.tiers.find((t) => t.slug === "neutral")?.id ?? data.tiers[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [effectiveScope, selectedClient?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (effectiveScope !== "client" || clientSearch.trim().length < 2) {
      setClientResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void client.adminCrmUsers({ search: clientSearch.trim(), limit: 8 }).then((r) => setClientResults(r.users));
    }, 280);
    return () => window.clearTimeout(t);
  }, [clientSearch, effectiveScope]);

  const tiers = bundle?.tiers ?? [];
  const assetLabels = useMemo(() => {
    const map = new Map<SpreadAssetClass, string>();
    for (const a of bundle?.assetClasses ?? []) map.set(a.id, a.label);
    return map;
  }, [bundle]);

  const previewPoints = useMemo(() => {
    const tierId = previewTierId ?? tiers.find((t) => t.slug === "neutral")?.id ?? tiers[0]?.id;
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return [];
    const draft = tierDrafts[tier.id];
    const tradePercent = Number(draft?.tradePercent ?? tier.trade_percent);
    const isPositive = draft?.isPositive ?? Boolean(tier.is_positive);
    return ASSET_CLASSES.map((ac) => {
      const key = `${tier.id}:${ac}` as CellKey;
      const cellDraft = cellDrafts[key];
      const platform = bundle?.exchange.find((c) => c.tier_id === tier.id && c.asset_class === ac);
      const value = Number(cellDraft?.value ?? platform?.value ?? 0);
      const unit = cellDraft?.unit ?? platform?.unit ?? "percent";
      return {
        label: assetLabels.get(ac) ?? ac,
        effectivePercent: cellToEffectivePercent(value, unit, tradePercent, isPositive),
      };
    });
  }, [previewTierId, tiers, tierDrafts, cellDrafts, bundle, assetLabels]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function applyTier(tier: SpreadTier) {
    const draft = tierDrafts[tier.id];
    if (!draft) return;
    if (effectiveScope === "client" && !selectedClient) {
      setError("Pick a client before saving a client override.");
      return;
    }
    setBusy(`tier-${tier.id}`);
    try {
      if (effectiveScope === "platform") {
        await client.adminPatchSpreadTier(tier.id, {
          tradePercent: Number(draft.tradePercent),
          isPositive: draft.isPositive,
        });
        flash(`Tier ${tier.name} saved to platform.`);
      } else {
        await client.adminPatchSpreadOverride({
          demo: effectiveScope === "demo",
          userId: selectedClient?.id ?? null,
          tierId: tier.id,
          overrides: {
            tiers: {
              [tier.slug]: {
                tradePercent: Number(draft.tradePercent),
                isPositive: draft.isPositive,
              },
            },
          },
        });
        flash(`Tier ${tier.name} override saved.`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveExchangeRow(tier: SpreadTier) {
    if (effectiveScope === "client" && !selectedClient) {
      setError("Pick a client before saving a client override.");
      return;
    }
    setBusy(`row-${tier.id}`);
    try {
      const cells = ASSET_CLASSES.map((ac) => {
        const key = `${tier.id}:${ac}` as CellKey;
        const d = cellDrafts[key];
        const platform = bundle?.exchange.find((c) => c.tier_id === tier.id && c.asset_class === ac);
        return {
          assetClass: ac,
          value: Number(d?.value ?? platform?.value ?? 0),
          unit: (d?.unit ?? platform?.unit ?? "percent") as SpreadUnit,
        };
      });
      if (effectiveScope === "platform") {
        await client.adminPatchSpreadExchange({ tierId: tier.id, cells });
        flash(`Exchange row ${tier.name} saved.`);
      } else {
        const cellMap: Partial<Record<SpreadAssetClass, { value: number; unit: SpreadUnit }>> = {};
        for (const c of cells) cellMap[c.assetClass] = { value: c.value, unit: c.unit };
        await client.adminPatchSpreadOverride({
          demo: effectiveScope === "demo",
          userId: selectedClient?.id ?? null,
          tierId: tier.id,
          overrides: { cells: { [tier.slug]: cellMap } },
        });
        flash(`Exchange override for ${tier.name} saved.`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function applyColumnToAll(ac: SpreadAssetClass) {
    const neutral = tiers.find((t) => t.slug === "neutral") ?? tiers[0];
    if (!neutral) return;
    const key = `${neutral.id}:${ac}` as CellKey;
    const d = cellDrafts[key];
    const platform = bundle?.exchange.find((c) => c.tier_id === neutral.id && c.asset_class === ac);
    const value = Number(d?.value ?? platform?.value ?? 0);
    const unit = (d?.unit ?? platform?.unit ?? "percent") as SpreadUnit;
    setBusy(`col-${ac}`);
    try {
      if (effectiveScope === "platform") {
        await client.adminApplySpreadExchangeToAll({ assetClass: ac, value, unit });
        flash(`${assetLabels.get(ac)} applied to all tiers.`);
      } else {
        setError("Apply To All is platform-wide only — switch to Platform default scope.");
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed.");
    } finally {
      setBusy(null);
    }
  }

  async function restoreDefaults() {
    if (effectiveScope !== "platform") {
      setError("Restore Default resets platform tables — switch to Platform default scope.");
      return;
    }
    if (!window.confirm("Restore all spread exchange cells to factory defaults?")) return;
    setBusy("restore");
    try {
      await client.adminRestoreSpreadExchangeDefaults();
      flash("Exchange matrix restored to defaults.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed.");
    } finally {
      setBusy(null);
    }
  }

  const scopeLabel =
    effectiveScope === "demo"
      ? "Demo account"
      : effectiveScope === "client" && selectedClient
        ? `${selectedClient.firstName} ${selectedClient.lastName}`.trim() || selectedClient.email
        : "Platform default";

  const previewTier = tiers.find((t) => t.id === previewTierId) ?? tiers[0];

  return (
    <div>
      <PageHeader
        title="Spread"
        subtitle="Tier multipliers and per-asset markup — platform-wide, per client, or demo paper accounts."
        actions={
          <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={`mr-1.5 inline ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      <ErrorBanner message={error} />
      {toast ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-100">{toast}</p>
      ) : null}

      <Panel className="mb-5 p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Scope</p>
        <div className="flex flex-wrap items-center gap-3">
          {(["platform", "client"] as const).map((s) => (
            <button
              key={s}
              type="button"
              disabled={demoMode}
              onClick={() => {
                setScope(s);
                setDemoMode(false);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                effectiveScope === s
                  ? "bg-teal-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              } ${demoMode ? "opacity-50" : ""}`}
            >
              {s === "platform" ? "Platform default" : "Pick client"}
            </button>
          ))}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => {
                setDemoMode(e.target.checked);
                if (e.target.checked) setScope("demo");
              }}
            />
            Demo account
          </label>
        </div>

        {effectiveScope === "client" ? (
          <div className="relative mt-3 max-w-md">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search client by name or email…"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
            {selectedClient ? (
              <p className="mt-2 text-sm text-teal-700">
                Selected:{" "}
                <strong>
                  {selectedClient.firstName} {selectedClient.lastName}
                </strong>{" "}
                ({selectedClient.email})
                <button type="button" className="ml-2 text-slate-400 underline" onClick={() => setSelectedClient(null)}>
                  clear
                </button>
              </p>
            ) : null}
            {clientResults.length > 0 && !selectedClient ? (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {clientResults.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-50"
                      onClick={() => {
                        setSelectedClient(u);
                        setClientSearch("");
                        setClientResults([]);
                      }}
                    >
                      {u.firstName} {u.lastName} — {u.email}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {!loading && previewTier ? (
        <div className="mb-5">
          <SpreadPreviewChart points={previewPoints} tierLabel={previewTier.name} scopeLabel={scopeLabel} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-500">Preview tier:</span>
            {tiers.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreviewTierId(t.id)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  previewTierId === t.id
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1">
        {(["trades", "exchange"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-white text-teal-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "trades" ? "Spread Trades" : "Spread Exchange"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-slate-500">
          <Loader2 className="animate-spin" size={18} /> Loading spread tables…
        </div>
      ) : tab === "trades" ? (
        <DataTable>
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Id</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Percent</th>
                <th className="px-4 py-3 text-left">Is positive</th>
                <th className="px-4 py-3 text-left">Account type</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => {
                const draft = tierDrafts[tier.id] ?? {
                  tradePercent: String(tier.trade_percent),
                  isPositive: Boolean(tier.is_positive),
                };
                return (
                  <tr key={tier.id} className="border-b border-slate-100 hover:bg-teal-50/30">
                    <td className="px-4 py-3 font-mono text-slate-500">{tier.id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{tier.name}</td>
                    <td className="px-4 py-3">
                      <input
                        className={`${inputCls} max-w-[88px] py-1.5`}
                        type="number"
                        step="0.01"
                        min="-1"
                        max="1"
                        value={draft.tradePercent}
                        onChange={(e) =>
                          setTierDrafts((prev) => ({
                            ...prev,
                            [tier.id]: { ...draft, tradePercent: e.target.value },
                          }))
                        }
                        onFocus={() => setPreviewTierId(tier.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className={`${inputCls} max-w-[96px] py-1.5`}
                        value={draft.isPositive ? "yes" : "no"}
                        onChange={(e) =>
                          setTierDrafts((prev) => ({
                            ...prev,
                            [tier.id]: { ...draft, isPositive: e.target.value === "yes" },
                          }))
                        }
                        onFocus={() => setPreviewTierId(tier.id)}
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{tier.account_type_name ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          className={btnSecondary + " !px-2.5 !py-1.5"}
                          onClick={() => setShowTierId(showTierId === tier.id ? null : tier.id)}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className={btnPrimary + " !px-3 !py-1.5"}
                          disabled={busy === `tier-${tier.id}`}
                          onClick={() => void applyTier(tier)}
                        >
                          {busy === `tier-${tier.id}` ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => void restoreDefaults()}>
              <RotateCcw size={14} className="mr-1.5 inline" />
              Restore to default
            </button>
            {ASSET_CLASSES.map((ac) => (
              <button
                key={ac}
                type="button"
                className={btnSecondary + " !text-xs"}
                disabled={busy === `col-${ac}`}
                onClick={() => void applyColumnToAll(ac)}
              >
                Apply {assetLabels.get(ac)} to all
              </button>
            ))}
          </div>
          <DataTable>
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-900 px-3 py-3 text-left">Tier</th>
                  {ASSET_CLASSES.map((ac) => (
                    <th key={ac} className="min-w-[120px] px-2 py-3 text-center">
                      {assetLabels.get(ac) ?? ac}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right">Save row</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id} className="border-b border-slate-100 hover:bg-teal-50/20">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-800">{tier.name}</td>
                    {ASSET_CLASSES.map((ac) => {
                      const key = `${tier.id}:${ac}` as CellKey;
                      const platform = bundle?.exchange.find(
                        (c: SpreadExchangeCell) => c.tier_id === tier.id && c.asset_class === ac,
                      );
                      const draft = cellDrafts[key] ?? {
                        value: String(platform?.value ?? 0),
                        unit: (platform?.unit ?? "percent") as SpreadUnit,
                      };
                      return (
                        <td key={ac} className="px-1 py-2">
                          <div className="flex flex-col gap-1">
                            <input
                              className={`${inputCls} !py-1 text-center text-xs`}
                              type="number"
                              step="0.01"
                              min="0"
                              value={draft.value}
                              onChange={(e) =>
                                setCellDrafts((prev) => ({
                                  ...prev,
                                  [key]: { ...draft, value: e.target.value },
                                }))
                              }
                              onFocus={() => setPreviewTierId(tier.id)}
                            />
                            <select
                              className={`${inputCls} !py-0.5 text-[10px]`}
                              value={draft.unit}
                              onChange={(e) =>
                                setCellDrafts((prev) => ({
                                  ...prev,
                                  [key]: { ...draft, unit: e.target.value as SpreadUnit },
                                }))
                              }
                            >
                              <option value="pip">pip</option>
                              <option value="percent">%</option>
                            </select>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className={btnPrimary + " !px-2.5 !py-1.5"}
                        disabled={busy === `row-${tier.id}`}
                        onClick={() => void saveExchangeRow(tier)}
                      >
                        {busy === `row-${tier.id}` ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <Save size={13} className="mr-1 inline" />
                            Save
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </>
      )}

      {showTierId && bundle ? (
        <Panel className="mt-4 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Tier detail — {tiers.find((t) => t.id === showTierId)?.name}
          </p>
          <pre className="mt-2 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-600">
            {JSON.stringify(
              tiers.filter((t) => t.id === showTierId),
              null,
              2,
            )}
          </pre>
        </Panel>
      ) : null}

      <PageBottomGuide
        intro="Spread markup by tier — platform edits hit every client unless a client or demo override exists."
        blocks={guideBlocks}
      />
    </div>
  );
}
