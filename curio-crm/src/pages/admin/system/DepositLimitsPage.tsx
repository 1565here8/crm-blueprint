import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  client,
  type DepositLimitInput,
  type DepositLimitRow,
  type DepositLimitType,
} from "../../../api/client";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  PageHeader,
  Panel,
  StatChip,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

function fmtUtc(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function ftdBadge(ftd: number) {
  return ftd === 1 ? (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200/60">
      FTD
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/60">
      All
    </span>
  );
}

function typeBadge(t: DepositLimitType) {
  return t === "min" ? (
    <span className="inline-flex rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-semibold text-teal-900 ring-1 ring-teal-200/60">
      Min
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-900 ring-1 ring-rose-200/60">
      Max
    </span>
  );
}

function activeBadge(active: number) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
      Yes
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200/60">
      No
    </span>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Minimum deposits",
    what: "Stops $5 card testers and micro-deposits that clog cashier without real revenue.",
    how: "Set a higher min on card PSPs; leave wire/crypto separate if your processor allows.",
    when: "Affiliate traffic sends hundreds of tiny deposits.",
  },
  {
    title: "Maximum deposits",
    what: "Caps single attempts where KYC cannot verify high rollers or PSP exposure is limited.",
    how: "Pair with account-type tiers; raise max only after enhanced due diligence.",
    when: "Compliance says you cannot onboard whales without EDD.",
  },
  {
    title: "FTD flag",
    what: "FTD = first-time deposit only (no prior approved deposit). Repeat clients use rules with FTD off.",
    how: "Use FTD min for welcome funnels; use global min/max for ongoing cashier policy.",
    when: "First deposit bonus requires $100+ but repeat deposits can be $25+.",
  },
  {
    title: "PSP & region",
    what: "Limits can target a payment processor and ISO country list — unmatched rules do not apply.",
    how: "Example: $50 min on directPay for US; $10k USD max globally.",
    when: "One PSP has stricter acquirer rules than others.",
  },
];

function ShowDrawer({
  row,
  explanation,
  onClose,
  onEdit,
}: {
  row: DepositLimitRow;
  explanation: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-teal-700 to-teal-600 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-teal-100">Rule #{row.id}</p>
            <h3 className="text-lg font-semibold">Deposit limit</h3>
          </div>
          <button type="button" className="rounded p-1 text-teal-100 hover:bg-white/10" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-slate-700">
          <p className="mb-4 rounded-lg border border-teal-100 bg-teal-50/80 p-3 leading-relaxed text-slate-800">
            {explanation}
          </p>
          <dl className="space-y-3">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Type</dt>
              <dd>{typeBadge(row.limit_type)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">FTD</dt>
              <dd>{ftdBadge(row.ftd_only)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-semibold text-slate-900">
                {row.visual_amount || row.amount} ({row.currency})
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">PSP</dt>
              <dd>{row.psp_processor_name ?? "All processors"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Countries</dt>
              <dd className="text-right">
                {row.country_codes_list.length ? row.country_codes_list.join(", ") : "Global"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Campaign</dt>
              <dd className="font-mono text-xs">{row.campaign_id ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Active</dt>
              <dd>{activeBadge(row.active)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="tabular-nums text-xs">{fmtUtc(row.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Updated</dt>
              <dd className="tabular-nums text-xs">{fmtUtc(row.updated_at)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" className={`${btnPrimary} flex-1`} onClick={onEdit}>
            <Pencil size={14} className="mr-1 inline" />
            Edit rule
          </button>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

function LimitFormModal({
  title,
  initial,
  options,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: DepositLimitRow | null;
  options: {
    processors: Array<{ id: string; gatewayName: string }>;
    currencies: string[];
    campaigns: Array<{ id: string; name: string }>;
    countries: Array<{ iso: string; name: string }>;
  };
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: DepositLimitInput) => void;
}) {
  const [limitType, setLimitType] = useState<DepositLimitType>(initial?.limit_type ?? "min");
  const [ftdOnly, setFtdOnly] = useState(initial?.ftd_only === 1);
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [visualAmount, setVisualAmount] = useState(initial?.visual_amount ?? "");
  const [pspId, setPspId] = useState(initial?.psp_processor_id ?? "");
  const [campaignId, setCampaignId] = useState(initial?.campaign_id ?? "");
  const [active, setActive] = useState(initial?.active !== 0);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(
    initial?.country_codes_list ?? [],
  );
  const [countryPick, setCountryPick] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    setError(null);
    onSubmit({
      limitType,
      ftdOnly,
      currency: currency.trim().toUpperCase(),
      amount: num,
      visualAmount: visualAmount.trim() || undefined,
      pspProcessorId: pspId || null,
      countryCodes: selectedCountries.length ? selectedCountries : null,
      campaignId: campaignId || null,
      active,
    });
  }

  function addCountry() {
    const iso = countryPick.trim().toUpperCase();
    if (!iso || selectedCountries.includes(iso)) return;
    setSelectedCountries((prev) => [...prev, iso].sort());
    setCountryPick("");
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <form
          className="my-8 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
          onSubmit={submit}
        >
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <ErrorBanner message={error} />

          <div className="mb-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Type</span>
              <select className={inputCls} value={limitType} onChange={(e) => setLimitType(e.target.value as DepositLimitType)}>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Currency</span>
              <input
                className={inputCls}
                list="deposit-limit-currencies"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={8}
              />
              <datalist id="deposit-limit-currencies">
                {options.currencies.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
          </div>

          <label className="mb-3 flex items-center gap-2">
            <input type="checkbox" checked={ftdOnly} onChange={(e) => setFtdOnly(e.target.checked)} />
            <span className="text-sm text-slate-700">First-time deposit only (FTD)</span>
          </label>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Amount</span>
              <input
                className={inputCls}
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Visual amount</span>
              <input
                className={inputCls}
                placeholder="e.g. $50"
                value={visualAmount}
                onChange={(e) => setVisualAmount(e.target.value)}
              />
            </label>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Payment processor (optional)</span>
            <select className={inputCls} value={pspId} onChange={(e) => setPspId(e.target.value)}>
              <option value="">All PSPs</option>
              {options.processors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.gatewayName}
                </option>
              ))}
            </select>
          </label>

          <div className="mb-3">
            <span className="mb-1 block text-xs font-medium text-slate-500">Countries (optional)</span>
            <div className="flex gap-2">
              <select className={`${inputCls} flex-1`} value={countryPick} onChange={(e) => setCountryPick(e.target.value)}>
                <option value="">Add country…</option>
                {options.countries.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.iso} — {c.name}
                  </option>
                ))}
              </select>
              <button type="button" className={btnSecondary} onClick={addCountry}>
                Add
              </button>
            </div>
            {selectedCountries.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedCountries.map((iso) => (
                  <button
                    key={iso}
                    type="button"
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-rose-100"
                    onClick={() => setSelectedCountries((prev) => prev.filter((c) => c !== iso))}
                  >
                    {iso} ×
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Empty = global (all regions).</p>
            )}
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Campaign (optional)</span>
            <select className={inputCls} value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
              <option value="">Any campaign</option>
              {options.campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-4 flex items-center gap-2">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-sm text-slate-700">Active</span>
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export function DepositLimitsPage() {
  const [rows, setRows] = useState<DepositLimitRow[]>([]);
  const [options, setOptions] = useState<{
    processors: Array<{ id: string; gatewayName: string }>;
    currencies: string[];
    campaigns: Array<{ id: string; name: string }>;
    countries: Array<{ iso: string; name: string }>;
  }>({ processors: [], currencies: ["USD"], campaigns: [], countries: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [pspFilter, setPspFilter] = useState("");
  const [limitTypeFilter, setLimitTypeFilter] = useState<"" | DepositLimitType>("");
  const [ftdFilter, setFtdFilter] = useState<"" | "1" | "0">("");
  const [viewRow, setViewRow] = useState<DepositLimitRow | null>(null);
  const [viewExplanation, setViewExplanation] = useState("");
  const [editRow, setEditRow] = useState<DepositLimitRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, opts] = await Promise.all([
        client.adminDepositLimits({
          search: appliedSearch || undefined,
          currency: currencyFilter || undefined,
          limitType: limitTypeFilter || undefined,
          ftdOnly: ftdFilter === "1" ? true : ftdFilter === "0" ? false : undefined,
          pspProcessorId: pspFilter || undefined,
        }),
        client.adminDepositLimitOptions(),
      ]);
      setRows(list.rows);
      setOptions(opts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load deposit limits.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, currencyFilter, limitTypeFilter, ftdFilter, pspFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const mins = rows.filter((r) => r.limit_type === "min" && r.active).length;
    const maxs = rows.filter((r) => r.limit_type === "max" && r.active).length;
    const ftd = rows.filter((r) => r.ftd_only === 1).length;
    return { mins, maxs, ftd };
  }, [rows]);

  async function openShow(row: DepositLimitRow) {
    try {
      const { row: full, explanation } = await client.adminDepositLimit(row.id);
      setViewRow(full);
      setViewExplanation(explanation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load rule.");
    }
  }

  async function saveCreate(data: DepositLimitInput) {
    setSaving(true);
    setError(null);
    try {
      await client.adminCreateDepositLimit(data);
      setCreateOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id: number, data: DepositLimitInput) {
    setSaving(true);
    setError(null);
    try {
      await client.adminUpdateDepositLimit(id, data);
      setEditRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: DepositLimitRow) {
    if (!window.confirm(`Delete deposit limit #${row.id}? This cannot be undone.`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      await client.adminDeleteDepositLimit(row.id);
      if (viewRow?.id === row.id) setViewRow(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Deposit Limits"
        subtitle="Min/max per currency, PSP, region, and FTD — enforced on client deposit requests and cashier approval."
        actions={
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-1 inline" />
              Create rule
            </button>
          </div>
        }
      />

      <p className="mb-4 rounded-lg border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
        <strong>Tutorial:</strong> Set $50 min on card PSP so micro-deposits never hit your desk. Set $10k max
        where KYC cannot handle whales.
      </p>

      <ErrorBanner message={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Rules" value={rows.length} />
        <StatChip label="Active mins" value={stats.mins} />
        <StatChip label="Active maxs" value={stats.maxs} />
        <StatChip label="FTD rules" value={stats.ftd} />
      </div>

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search id, currency, PSP, campaign…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setAppliedSearch(search.trim());
              }}
            />
          </div>
          <button type="button" className={btnPrimary} onClick={() => setAppliedSearch(search.trim())}>
            Search
          </button>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
          >
            <option value="">All currencies</option>
            {options.currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            value={pspFilter}
            onChange={(e) => setPspFilter(e.target.value)}
          >
            <option value="">All PSPs</option>
            {options.processors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.gatewayName}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            value={limitTypeFilter}
            onChange={(e) => setLimitTypeFilter(e.target.value as "" | DepositLimitType)}
          >
            <option value="">Min & max</option>
            <option value="min">Minimum only</option>
            <option value="max">Maximum only</option>
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            value={ftdFilter}
            onChange={(e) => setFtdFilter(e.target.value as "" | "1" | "0")}
          >
            <option value="">FTD + repeat</option>
            <option value="1">FTD only</option>
            <option value="0">Repeat / all deposits</option>
          </select>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">Id</th>
                <th className="px-4 py-3">Ftd</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Visual</th>
                <th className="px-4 py-3">Currency</th>
                <th className="px-4 py-3">Date Created</th>
                <th className="px-4 py-3">Date Updated</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" size={24} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No deposit limits match your filters.{" "}
                    <button type="button" className="text-teal-600 hover:underline" onClick={() => setCreateOpen(true)}>
                      Create one
                    </button>
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition hover:bg-teal-50/30 ${
                      i % 2 === 1 ? "bg-slate-50/40" : ""
                    } ${row.active ? "" : "opacity-60"}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-4 py-2.5">{ftdBadge(row.ftd_only)}</td>
                    <td className="px-4 py-2.5">{typeBadge(row.limit_type)}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-slate-800">{row.amount}</td>
                    <td className="px-4 py-2.5 text-slate-600">{row.visual_amount || "—"}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{row.currency}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums text-slate-500">{fmtUtc(row.created_at)}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums text-slate-500">{fmtUtc(row.updated_at)}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                      {row.campaign_id ? row.campaign_id.slice(0, 8) + "…" : "—"}
                      {row.psp_processor_name ? (
                        <div className="text-slate-400">{row.psp_processor_name}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500"
                          onClick={() => void openShow(row)}
                        >
                          <Eye size={12} className="inline" /> Show
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                          onClick={() => setEditRow(row)}
                        >
                          <Pencil size={12} className="inline" /> Edit
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row)}
                        >
                          <Trash2 size={12} className="inline" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="mt-3 text-xs text-slate-500">
        Related:{" "}
        <Link to="/admin/system/payment-gateways/processors" className="text-teal-600 hover:underline">
          Payment processors
        </Link>
        {" · "}
        <Link to="/admin/cashier/deposit-requests" className="text-teal-600 hover:underline">
          Deposit requests
        </Link>
        {" · "}
        <Link to="/admin/system/account-type" className="text-teal-600 hover:underline">
          Account types
        </Link>
      </p>

      {viewRow ? (
        <ShowDrawer
          row={viewRow}
          explanation={viewExplanation}
          onClose={() => setViewRow(null)}
          onEdit={() => {
            setEditRow(viewRow);
            setViewRow(null);
          }}
        />
      ) : null}

      {editRow ? (
        <LimitFormModal
          title={`Edit limit #${editRow.id}`}
          initial={editRow}
          options={options}
          saving={saving}
          onClose={() => setEditRow(null)}
          onSubmit={(data) => void saveEdit(editRow.id, data)}
        />
      ) : null}

      {createOpen ? (
        <LimitFormModal
          title="New deposit limit"
          initial={null}
          options={options}
          saving={saving}
          onClose={() => setCreateOpen(false)}
          onSubmit={(data) => void saveCreate(data)}
        />
      ) : null}

      <PageBottomGuide
        intro="Deposit limits depend on PSP and region — some clients are not eligible above $100 on card. Minimums stop micro-deposits; maximums protect you when KYC cannot verify high rollers."
        blocks={guideBlocks}
      />
    </div>
  );
}
