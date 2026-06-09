import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, Loader2, RefreshCw, Save } from "lucide-react";
import {
  client,
  type ForexCommissionCell,
  type ForexCommissionCurrency,
  type ForexCommissionMatrix,
} from "../../../api/client";
import { DataTable, ErrorBanner, inputCls, PageHeader, Panel } from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";
import { pushAdminToast } from "../../../lib/adminToastBus";

const CURRENCIES: ForexCommissionCurrency[] = [
  "USD",
  "EUR",
  "AUD",
  "GBP",
  "RUB",
  "CHF",
  "CNY",
  "JPY",
  "BTC",
];

const CURRENCY_SYMBOLS: Record<ForexCommissionCurrency, string> = {
  USD: "$",
  EUR: "€",
  AUD: "A$",
  GBP: "£",
  RUB: "₽",
  CHF: "Fr",
  CNY: "¥",
  JPY: "¥",
  BTC: "₿",
};

const TIER_LABELS: Record<number, string> = {
  0: "Tier 0 Default",
  1: "Tier 1 Standard",
  2: "Tier 2 Silver",
  3: "Tier 3 Gold",
  4: "Tier 4 VIP",
};

type CellKey = `${number}:${ForexCommissionCurrency}`;

function cellKey(tier: number, currency: ForexCommissionCurrency): CellKey {
  return `${tier}:${currency}`;
}

function stepFor(currency: ForexCommissionCurrency): string {
  if (currency === "BTC") return "0.0001";
  if (currency === "JPY" || currency === "RUB" || currency === "CNY") return "1";
  return "0.01";
}

function formatAmount(currency: ForexCommissionCurrency, raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (currency === "BTC") return n.toFixed(4);
  if (currency === "JPY" || currency === "RUB" || currency === "CNY") return String(Math.round(n));
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function previewText(tier: number, currency: ForexCommissionCurrency, amount: number): string {
  const sym = CURRENCY_SYMBOLS[currency];
  const formatted = formatAmount(currency, String(amount));
  return `Client on ${TIER_LABELS[tier] ?? `Tier ${tier}`} pays ${sym}${formatted}/side on ${currency} pairs`;
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Commission tiers",
    what: "Five fixed per-side fee ladders (0 Default → 4 VIP) — each cell is charged on open and close.",
    how: "Edit amounts inline, then Update to persist all cells at once. Tier links to Account Type via forex_commission_tier.",
    when: "Launching VIP pricing or repricing after liquidity review.",
  },
  {
    title: "Currency columns",
    what: "Fee is denominated in the account currency column — USD $2 on tier 0, BTC 0.0003 on tier 4 VIP.",
    how: "Use currency symbol prefix in each cell. JPY/RUB/CNY are whole units; BTC uses four decimals.",
    when: "Multi-currency book with localized cashier currencies.",
  },
  {
    title: "Live preview",
    what: "Hover or focus a cell to see the client-facing fee sentence before you save.",
    how: "Pick a tier row and currency column — preview updates as you type.",
    when: "Verifying VIP vs retail spread before pushing to production.",
  },
];

export function ForexCommissionsPage() {
  const [matrix, setMatrix] = useState<ForexCommissionMatrix | null>(null);
  const [drafts, setDrafts] = useState<Record<CellKey, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewTier, setPreviewTier] = useState(2);
  const [previewCurrency, setPreviewCurrency] = useState<ForexCommissionCurrency>("USD");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await client.adminGetForexCommissionMatrix();
      setMatrix(data);
      const next: Record<CellKey, string> = {};
      for (const cell of data.cells) {
        next[cellKey(cell.tier, cell.currency)] = String(cell.amount);
      }
      setDrafts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewAmount = useMemo(() => {
    const raw = drafts[cellKey(previewTier, previewCurrency)];
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, [drafts, previewTier, previewCurrency]);

  const dirty = useMemo(() => {
    if (!matrix) return false;
    return matrix.cells.some((c) => {
      const d = drafts[cellKey(c.tier, c.currency)];
      return d !== undefined && Number(d) !== c.amount;
    });
  }, [matrix, drafts]);

  async function saveAll() {
    setBusy(true);
    setError(null);
    pushAdminToast("Saving forex commissions…", "loading");
    try {
      const cells: ForexCommissionCell[] = [];
      for (const tier of [0, 1, 2, 3, 4] as const) {
        for (const currency of CURRENCIES) {
          const raw = drafts[cellKey(tier, currency)];
          const amount = Number(raw);
          if (!Number.isFinite(amount) || amount < 0) {
            throw new Error(`Invalid amount for ${currency} tier ${tier}.`);
          }
          cells.push({ tier, currency, amount });
        }
      }
      const data = await client.adminUpdateForexCommissionMatrix(cells);
      setMatrix(data);
      const next: Record<CellKey, string> = {};
      for (const cell of data.cells) {
        next[cellKey(cell.tier, cell.currency)] = String(cell.amount);
      }
      setDrafts(next);
      pushAdminToast("Forex commission matrix saved.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      setError(msg);
      pushAdminToast(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Forex Commissions"
        subtitle="Fixed per-side commission matrix by tier and account currency."
        actions={
          <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => void load()} disabled={busy}>
            <RefreshCw size={14} className="mr-1 inline" />
            Reload
          </button>
        }
      />

      <ErrorBanner message={error} />

      <Panel className="mb-4 border-teal-100 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Live preview</p>
              <p className="mt-1 text-base font-medium text-teal-200">
                {previewText(previewTier, previewCurrency, previewAmount)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Tier
              <select
                className="ml-2 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
                value={previewTier}
                onChange={(e) => setPreviewTier(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4].map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] uppercase tracking-widest text-slate-400">
              Currency
              <select
                className="ml-2 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white"
                value={previewCurrency}
                onChange={(e) => setPreviewCurrency(e.target.value as ForexCommissionCurrency)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {matrix?.updatedAt ? (
          <p className="mt-3 text-[11px] text-slate-500">Last saved: {new Date(matrix.updatedAt).toLocaleString()}</p>
        ) : null}
      </Panel>

      {!matrix ? (
        <Panel className="flex items-center justify-center gap-2 p-12 text-slate-500">
          <Loader2 size={18} className="animate-spin text-teal-600" />
          Loading matrix…
        </Panel>
      ) : (
        <>
          <DataTable>
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <th className="sticky left-0 z-10 bg-slate-900 px-4 py-3 text-left">Tier</th>
                  {CURRENCIES.map((c) => (
                    <th key={c} className="px-2 py-3 text-center">
                      {c}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left">Account types</th>
                </tr>
              </thead>
              <tbody>
                {matrix.tiers.map((tier) => (
                  <tr key={tier.tier} className="border-b border-slate-100 transition hover:bg-teal-50/30">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-800">
                      <span className="block text-xs font-semibold text-teal-700">{tier.label}</span>
                      <span className="text-[10px] text-slate-400">Row {tier.tier}</span>
                    </td>
                    {CURRENCIES.map((currency) => {
                      const key = cellKey(tier.tier, currency);
                      const sym = CURRENCY_SYMBOLS[currency];
                      return (
                        <td key={currency} className="px-1 py-2">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                              {sym}
                            </span>
                            <input
                              className={`${inputCls} !py-1.5 pl-6 pr-1 text-center text-xs`}
                              type="number"
                              step={stepFor(currency)}
                              min="0"
                              value={drafts[key] ?? ""}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              onFocus={() => {
                                setPreviewTier(tier.tier);
                                setPreviewCurrency(currency);
                              }}
                            />
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {tier.linkedAccountTypes.length > 0 ? (
                        tier.linkedAccountTypes.map((a) => (
                          <Link
                            key={a.id}
                            to="/admin/system/account-type"
                            className="mr-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-teal-700 hover:bg-teal-50"
                          >
                            {a.name}
                          </Link>
                        ))
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>

          <div className="mt-6">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={() => void saveAll()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Updating…
                </>
              ) : (
                <>
                  <Save size={18} />
                  Update
                </>
              )}
            </button>
            {dirty ? (
              <p className="mt-2 text-center text-xs text-amber-600">Unsaved changes — click Update to apply site-wide.</p>
            ) : null}
          </div>
        </>
      )}

      <PageBottomGuide
        intro="Tier × currency matrix for fixed per-side FX commissions. Linked account types inherit their row automatically."
        blocks={guideBlocks}
      />
    </div>
  );
}
