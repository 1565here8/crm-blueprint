import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { client, type AccountTypeInput, type AccountTypeRow } from "../../../api/client";
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

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function activeBadge(active: number) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
      Yes
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-200/60">
      No
    </span>
  );
}

function spreadLabel(bps: number) {
  if (bps === 0) return "No markup (raw feed)";
  return `${bps} basis points (${(bps / 100).toFixed(2)}%) added to spread`;
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Retail vs VIP vs IB",
    what: "Each row is a product tier — Retail for everyday clients, VIP for high-value, IB Partner for introducing brokers.",
    how: "New sign-ups inherit the tier's default leverage and deposit floor/ceiling unless overridden on the client file.",
    when: "Launching a campaign that needs different limits than your standard account.",
  },
  {
    title: "Default leverage",
    what: "Maximum margin multiplier applied when the client opens positions (e.g. 1:30 Retail, 1:200 VIP).",
    how: "Edit the tier — changes affect new accounts; existing clients keep their assigned leverage until you change it manually.",
    when: "Compliance asks you to cap leverage for a jurisdiction.",
  },
  {
    title: "Min / max deposit",
    what: "Cashier rejects deposits below the minimum or above the maximum for that tier.",
    how: "Set realistic bounds per product — VIP tiers often require higher minimums.",
    when: "Micro-deposits or card-testing fraud from one affiliate source.",
  },
  {
    title: "Spread markup (bps)",
    what: "Extra spread charged on top of the feed, in basis points (100 bps = 1%).",
    how: "Retail might carry +25 bps; VIP +10 bps. Zero means no tier markup.",
    when: "Revenue review — compare tier P&amp;L after a month.",
  },
  {
    title: "Bonus eligible & VIP tier",
    what: "Bonus eligible controls whether promo codes and deposit bonuses apply. VIP tier is a numeric rank for reporting and perks.",
    how: "Turn bonuses off for IB Partner tiers; set VIP tier 1–3 for loyalty programs.",
    when: "Partner says their IB clients should not receive retail welcome bonuses.",
  },
  {
    title: "Active",
    what: "Inactive tiers stay in the list for audit but cannot be assigned to new clients.",
    how: "Edit → uncheck Active, or use Show then Edit. Default tier should stay active.",
    when: "Retiring an old product without deleting history.",
  },
];

function ShowDrawer({
  row,
  onClose,
  onEdit,
}: {
  row: AccountTypeRow;
  onClose: () => void;
  onEdit: () => void;
}) {
  let settingsNote = "None";
  if (row.settings_json) {
    try {
      settingsNote = JSON.stringify(JSON.parse(row.settings_json), null, 2);
    } catch {
      settingsNote = row.settings_json;
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-teal-700 to-teal-600 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-100">Account type</p>
            <h3 className="text-lg font-semibold">{row.name}</h3>
            <p className="mt-0.5 font-mono text-xs text-teal-100/90">#{row.id} · {row.slug}</p>
          </div>
          <button type="button" className="rounded-lg p-1 text-teal-100 hover:bg-white/10" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4">{activeBadge(row.active)}</div>

          <dl className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">In plain English</dt>
              <dd className="mt-1.5 text-slate-700">
                {row.description ||
                  `${row.name} clients trade at up to 1:${row.leverage_default} leverage with deposits between ${fmtMoney(row.min_deposit)} and ${fmtMoney(row.max_deposit)}.`}
              </dd>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">Default leverage</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">1:{row.leverage_default}</dd>
                <dd className="text-[11px] text-slate-400">Max margin multiplier for new accounts</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">VIP tier</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{row.vip_tier || "Standard (0)"}</dd>
                <dd className="text-[11px] text-slate-400">Higher = premium perks in reports</dd>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">Minimum deposit</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{fmtMoney(row.min_deposit)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Maximum deposit</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{fmtMoney(row.max_deposit)}</dd>
              </div>
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-500">Spread markup</dt>
              <dd className="mt-0.5 text-slate-800">{spreadLabel(row.spread_markup_bps)}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-slate-500">Deposit bonuses</dt>
              <dd className="mt-0.5 text-slate-800">
                {row.bonus_eligible ? "Eligible — promo codes and welcome bonuses apply" : "Not eligible — no retail bonuses"}
              </dd>
            </div>

            {settingsNote !== "None" ? (
              <div>
                <dt className="text-xs font-medium text-slate-500">Extra settings (JSON)</dt>
                <dd className="mt-1 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-slate-300">
                  <pre>{settingsNote}</pre>
                </dd>
              </div>
            ) : null}

            <div className="flex justify-between gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>Created {fmtUtc(row.created_at)} UTC</span>
              <span>Updated {fmtUtc(row.updated_at)} UTC</span>
            </div>
          </dl>

          <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50/50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Day-one checklist</p>
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-slate-600">
              <li>Confirm Default is active — every broker needs a fallback tier.</li>
              <li>Match leverage to your license (EU Retail often 1:30).</li>
              <li>Set min deposit above card-testing amounts (e.g. $250+).</li>
              <li>Disable bonuses on IB Partner if partners trade their own volume.</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" className={`${btnSecondary} flex-1`} onClick={onClose}>
            Close
          </button>
          <button type="button" className={`${btnPrimary} flex-1`} onClick={onEdit}>
            <Pencil size={14} className="mr-1 inline" />
            Edit tier
          </button>
        </div>
      </aside>
    </>
  );
}

function AccountTypeFormModal({
  title,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: AccountTypeRow;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: AccountTypeInput) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <Panel className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            onSubmit({
              name: String(fd.get("name") ?? ""),
              leverageDefault: Number(fd.get("leverageDefault")),
              minDeposit: Number(fd.get("minDeposit")),
              maxDeposit: Number(fd.get("maxDeposit")),
              spreadMarkupBps: Number(fd.get("spreadMarkupBps")),
              vipTier: Number(fd.get("vipTier")),
              description: String(fd.get("description") ?? ""),
              active: fd.get("active") === "on",
              bonusEligible: fd.get("bonusEligible") === "on",
            });
          }}
        >
          <label className="block text-xs font-medium text-slate-500">
            Name
            <input name="name" className={`${inputCls} mt-1`} defaultValue={initial?.name ?? ""} required />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Description (plain English)
            <textarea
              name="description"
              className={`${inputCls} mt-1 min-h-[72px]`}
              defaultValue={initial?.description ?? ""}
              placeholder="Who this tier is for and what limits apply…"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-500">
              Default leverage (1:X)
              <input
                name="leverageDefault"
                type="number"
                min={1}
                max={1000}
                className={`${inputCls} mt-1`}
                defaultValue={initial?.leverage_default ?? 100}
                required
              />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              VIP tier (0–10)
              <input
                name="vipTier"
                type="number"
                min={0}
                max={10}
                className={`${inputCls} mt-1`}
                defaultValue={initial?.vip_tier ?? 0}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-500">
              Min deposit (USD)
              <input
                name="minDeposit"
                type="number"
                min={0}
                step={1}
                className={`${inputCls} mt-1`}
                defaultValue={initial?.min_deposit ?? 100}
                required
              />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              Max deposit (USD)
              <input
                name="maxDeposit"
                type="number"
                min={0}
                step={1}
                className={`${inputCls} mt-1`}
                defaultValue={initial?.max_deposit ?? 50000}
                required
              />
            </label>
          </div>
          <label className="block text-xs font-medium text-slate-500">
            Spread markup (basis points)
            <input
              name="spreadMarkupBps"
              type="number"
              min={0}
              max={500}
              className={`${inputCls} mt-1`}
              defaultValue={initial?.spread_markup_bps ?? 0}
            />
            <span className="mt-1 block text-[11px] text-slate-400">100 bps = 1% added to the feed spread</span>
          </label>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="active" defaultChecked={initial ? !!initial.active : true} />
              Active (assignable to new clients)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="bonusEligible" defaultChecked={initial ? !!initial.bonus_eligible : true} />
              Bonus eligible
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Create tier"}
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

export function AccountTypesPage() {
  const [rows, setRows] = useState<AccountTypeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<AccountTypeRow | null>(null);
  const [editRow, setEditRow] = useState<AccountTypeRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminAccountTypes({
        search: appliedSearch || undefined,
        page,
        limit,
        sortBy,
        sortDir,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load account types.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, limit, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeCount = rows.filter((r) => r.active).length;

  async function saveEdit(id: number, data: AccountTypeInput) {
    setSaving(true);
    try {
      const { accountType } = await client.adminUpdateAccountType(id, data);
      setRows((prev) => prev.map((r) => (r.id === accountType.id ? accountType : r)));
      setEditRow(null);
      if (viewRow?.id === id) setViewRow(accountType);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function createType(data: AccountTypeInput) {
    setSaving(true);
    setError(null);
    try {
      await client.adminCreateAccountType(data);
      setCreateOpen(false);
      setPage(1);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  function applySearch() {
    setPage(1);
    setAppliedSearch(search.trim());
  }

  return (
    <div>
      <PageHeader
        title={`Account Types (${total})`}
        subtitle="Product tiers — Retail vs VIP vs IB controls default leverage and deposit limits for new clients."
        actions={
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-1 inline" />
              Add account type
            </button>
          </div>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Total tiers" value={total} />
        <StatChip label="Active (page)" value={activeCount} />
        <StatChip label="Default tier" value={rows.find((r) => r.slug === "default")?.name ?? "Default"} />
        <StatChip label="Page" value={`${page} / ${totalPages}`} />
      </div>

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search name, slug, description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
            />
          </div>
          <button type="button" className={btnPrimary} onClick={applySearch}>
            Search
          </button>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            onClick={() => {
              setSearch("");
              setAppliedSearch("");
              setPage(1);
            }}
          >
            Clear
          </button>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                Show {n}
              </option>
            ))}
          </select>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("id")}>
                  Id <ArrowDownUp size={10} className="inline opacity-50" />
                </th>
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("name")}>
                  Name <ArrowDownUp size={10} className="inline opacity-50" />
                </th>
                <th className="cursor-pointer px-4 py-3 text-center" onClick={() => toggleSort("active")}>
                  Active <ArrowDownUp size={10} className="inline opacity-50" />
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" size={24} />
                    <p className="mt-2 text-sm">Loading account types…</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No account types match your search.{" "}
                    <button type="button" className="text-teal-600 hover:underline" onClick={() => setCreateOpen(true)}>
                      Add one
                    </button>
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition hover:bg-teal-50/30 ${
                      i % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{row.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">
                        1:{row.leverage_default} · {fmtMoney(row.min_deposit)}–{fmtMoney(row.max_deposit)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">{activeBadge(row.active)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500"
                          onClick={() => setViewRow(row)}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing {(page - 1) * limit + (rows.length ? 1 : 0)} to {Math.min(page * limit, total)} of {total} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded border border-slate-200 p-1.5 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-[4rem] text-center tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded border border-slate-200 p-1.5 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </Panel>

      <p className="mt-3 text-xs text-slate-500">
        Related:{" "}
        <Link to="/admin/system/min-max-deposits" className="text-teal-600 hover:underline">
          Min/Max Deposits
        </Link>
        {" · "}
        <Link to="/admin/system/forex-commissions" className="text-teal-600 hover:underline">
          Forex Commissions
        </Link>
        {" · "}
        <Link to="/admin/system/spread" className="text-teal-600 hover:underline">
          Spread
        </Link>
      </p>

      {viewRow ? (
        <ShowDrawer
          row={viewRow}
          onClose={() => setViewRow(null)}
          onEdit={() => {
            setEditRow(viewRow);
            setViewRow(null);
          }}
        />
      ) : null}

      {editRow ? (
        <AccountTypeFormModal
          title={`Edit ${editRow.name}`}
          initial={editRow}
          saving={saving}
          onClose={() => setEditRow(null)}
          onSubmit={(data) => void saveEdit(editRow.id, data)}
        />
      ) : null}

      {createOpen ? (
        <AccountTypeFormModal
          title="Add account type"
          saving={saving}
          onClose={() => setCreateOpen(false)}
          onSubmit={(data) => void createType(data)}
        />
      ) : null}

      <PageBottomGuide
        intro="Account types are product tiers — Retail vs VIP vs IB controls default leverage, spread markup, and deposit limits for new clients. Use Show for a plain-English summary; Edit to change limits before a campaign goes live."
        blocks={guideBlocks}
      />
    </div>
  );
}
