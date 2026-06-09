import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  client,
  type CommissionMatrix,
  type CommissionMatrixCell,
  type CommissionMatrixCurrency,
} from "../../../api/client";
import { ErrorBanner } from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

const CURRENCIES: CommissionMatrixCurrency[] = [
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

const SYMBOLS: Record<CommissionMatrixCurrency, string> = {
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

type CellKey = `${number}:${CommissionMatrixCurrency}`;

function cellKey(tier: number, currency: CommissionMatrixCurrency): CellKey {
  return `${tier}:${currency}`;
}

const inputDark =
  "w-full min-w-0 rounded-md border border-slate-700/80 bg-slate-950/60 py-1.5 pl-7 pr-2 text-sm tabular-nums text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30";

const guideBlocks: GuideBlock[] = [
  {
    title: "Tier rows",
    what: "Rows 0–4 are fixed per-side crypto fees by client tier (default, standard, silver, gold, VIP).",
    how: "Tier 0 applies when no account-type mapping exists. Link tiers on Account Types → crypto commission tier.",
    when: "Launching a VIP product with lower crypto fees than retail.",
  },
  {
    title: "Currency columns",
    what: "Fee amount in the account currency (or BTC for BTC-denominated pairs).",
    how: "Enter values with the symbol prefix; save once with Update — all cells persist together.",
    when: "EUR desk wants € fees while US desk keeps $ fees on the same tier ladder.",
  },
  {
    title: "Permissions",
    what: "Requires Fees & trading status (system.commissions.edit) on the staff group.",
    how: "System → Permissions → enable for Platform Admin or owner group only.",
    when: "Junior reps should not change house revenue tables.",
  },
];

export function CryptoCommissionsPage() {
  const [matrix, setMatrix] = useState<CommissionMatrix | null>(null);
  const [drafts, setDrafts] = useState<Record<CellKey, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const data = await client.adminGetCryptoCommissionMatrix();
      setMatrix(data);
      const next: Record<CellKey, string> = {};
      for (const c of data.cells) {
        next[cellKey(c.tier, c.currency)] = formatDraft(c.currency, c.amount);
      }
      setDrafts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tiers = matrix?.tiers ?? [];

  const cellsPayload = useMemo((): CommissionMatrixCell[] => {
    const out: CommissionMatrixCell[] = [];
    for (const tier of tiers) {
      for (const currency of CURRENCIES) {
        const raw = drafts[cellKey(tier.tier, currency)] ?? "0";
        const amount = Number(raw);
        if (!Number.isFinite(amount) || amount < 0) continue;
        out.push({ tier: tier.tier, currency, amount });
      }
    }
    return out;
  }, [drafts, tiers]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const data = await client.adminUpdateCryptoCommissionMatrix(cellsPayload);
      setMatrix(data);
      const next: Record<CellKey, string> = {};
      for (const c of data.cells) {
        next[cellKey(c.tier, c.currency)] = formatDraft(c.currency, c.amount);
      }
      setDrafts(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="-mx-1 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Crypto Commissions</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Tier × currency matrix — per-side crypto fees applied on each trade.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-600/40 hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      <ErrorBanner message={error} />
      {saved ? (
        <p className="rounded-lg border border-teal-800/40 bg-teal-950/30 px-3 py-2 text-sm text-teal-300">
          Commission matrix saved.
        </p>
      ) : null}

      <form onSubmit={(e) => void save(e)} className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0c1017] shadow-inner shadow-black/30">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="sticky left-0 z-10 bg-[#0c1017] px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">Tier</th>
                {CURRENCIES.map((c) => (
                  <th key={c} className="px-2 py-3 text-center font-mono text-slate-400">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.tier} className="border-b border-slate-800/80 hover:bg-slate-900/40">
                  <td className="sticky left-0 z-10 bg-[#0c1017] px-3 py-2.5 font-mono text-slate-500">{tier.tier}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-slate-200">{tier.label}</span>
                    {tier.linkedAccountTypes.length > 0 ? (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {tier.linkedAccountTypes.map((a) => a.name).join(", ")}
                      </p>
                    ) : null}
                  </td>
                  {CURRENCIES.map((currency) => {
                    const key = cellKey(tier.tier, currency);
                    const sym = SYMBOLS[currency];
                    return (
                      <td key={currency} className="px-2 py-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            {sym}
                          </span>
                          <input
                            className={inputDark}
                            type="number"
                            min={0}
                            step={currency === "BTC" ? "0.0001" : currency === "JPY" || currency === "RUB" ? "1" : "0.01"}
                            value={drafts[key] ?? ""}
                            onChange={(e) => {
                              setDrafts((d) => ({ ...d, [key]: e.target.value }));
                              setSaved(false);
                            }}
                            aria-label={`Tier ${tier.tier} ${currency}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {matrix?.updatedAt ? (
          <p className="text-xs text-slate-500">
            Last updated: {new Date(matrix.updatedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          Update
        </button>
      </form>

      <PageBottomGuide
        heading="Crypto commissions — broker guide"
        intro="Fixed per-side crypto fees by tier and wallet currency."
        blocks={guideBlocks}
      />
    </div>
  );
}

function formatDraft(currency: CommissionMatrixCurrency, amount: number): string {
  if (currency === "BTC") return amount.toFixed(4);
  if (currency === "JPY" || currency === "RUB" || currency === "CNY") return String(Math.round(amount));
  return amount % 1 === 0 ? String(amount) : amount.toFixed(2);
}
