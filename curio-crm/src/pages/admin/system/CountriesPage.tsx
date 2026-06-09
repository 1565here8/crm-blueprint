import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { client, type PlatformCountryRow } from "../../../api/client";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  Panel,
  StatChip,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-teal-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Allow visits / reg / trading",
    what: "Three independent gates — block registration for a country while keeping the marketing site open.",
    how: "Toggle inline. Changes save immediately.",
    when: "Compliance geo-blocks or pausing sign-ups from high-fraud regions.",
  },
  {
    title: "Phone prefix",
    what: "International dialling code used when refreshing agent CLIDs and signup forms.",
    how: "Click Edit on a row to change prefix or display name.",
    when: "Wrong prefix on outbound dial after import.",
  },
];

export function CountriesPage() {
  const [rows, setRows] = useState<PlatformCountryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<PlatformCountryRow | null>(null);
  const [viewRow, setViewRow] = useState<PlatformCountryRow | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminCountries({
        search: appliedSearch || undefined,
        page,
        limit,
        sortBy,
        sortDir,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, limit, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function patchCountry(id: number, patch: Parameters<typeof client.adminUpdateCountry>[1]) {
    setSaving(true);
    try {
      const { country } = await client.adminUpdateCountry(id, patch);
      setRows((prev) => prev.map((r) => (r.id === country.id ? country : r)));
      if (editRow?.id === id) setEditRow(country);
      if (viewRow?.id === id) setViewRow(country);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Country list</h2>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatChip label="Countries" value={total} />
        <StatChip label="Page" value={`${page} / ${totalPages}`} />
        <StatChip label="Showing" value={rows.length} />
      </div>

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search name, ISO, prefix…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setAppliedSearch(search);
                }
              }}
            />
          </div>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setPage(1);
              setAppliedSearch(search);
            }}
          >
            Search
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
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("id")}>
                  Id <ArrowDownUp size={10} className="inline opacity-50" />
                </th>
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("name")}>
                  Name
                </th>
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("iso")}>
                  Iso
                </th>
                <th className="px-3 py-3 text-center">Allow visits</th>
                <th className="px-3 py-3 text-center">Allow reg.</th>
                <th className="px-3 py-3 text-center">Allow trading</th>
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("phone_prefix")}>
                  Prefix
                </th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" size={24} />
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
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{row.name}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{row.iso}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Toggle
                        label="Allow visits"
                        checked={!!row.allow_visits}
                        onChange={(v) => void patchCountry(row.id, { allowVisits: v })}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Toggle
                        label="Allow registration"
                        checked={!!row.allow_reg}
                        onChange={(v) => void patchCountry(row.id, { allowReg: v })}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Toggle
                        label="Allow trading"
                        checked={!!row.allow_trading}
                        onChange={(v) => void patchCountry(row.id, { allowTrading: v })}
                      />
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{row.phone_prefix || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-teal-500"
                          onClick={() => setViewRow(row)}
                        >
                          <Eye size={12} className="inline" /> show
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                          onClick={() => setEditRow(row)}
                        >
                          <Pencil size={12} className="inline" /> edit
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
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </Panel>

      {viewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <Panel className="max-w-md w-full p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{viewRow.name}</h3>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setViewRow(null)}>
                <X size={18} />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">ISO</dt><dd className="font-mono">{viewRow.iso}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Prefix</dt><dd className="font-mono">{viewRow.phone_prefix || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Visits</dt><dd>{viewRow.allow_visits ? "Yes" : "No"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Registration</dt><dd>{viewRow.allow_reg ? "Yes" : "No"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Trading</dt><dd>{viewRow.allow_trading ? "Yes" : "No"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Updated</dt><dd className="text-xs">{viewRow.updated_at}</dd></div>
            </dl>
          </Panel>
        </div>
      ) : null}

      {editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <Panel className="max-w-md w-full p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit {editRow.iso}</h3>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setEditRow(null)}>
                <X size={18} />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void patchCountry(editRow.id, {
                  name: String(fd.get("name") ?? ""),
                  phonePrefix: String(fd.get("prefix") ?? ""),
                  allowVisits: fd.get("visits") === "on",
                  allowReg: fd.get("reg") === "on",
                  allowTrading: fd.get("trading") === "on",
                }).then(() => setEditRow(null));
              }}
            >
              <label className="block text-xs font-medium text-slate-500">
                Name
                <input name="name" className={`${inputCls} mt-1`} defaultValue={editRow.name} required />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Phone prefix
                <input name="prefix" className={`${inputCls} mt-1 font-mono`} defaultValue={editRow.phone_prefix} />
              </label>
              <div className="flex flex-wrap gap-4 pt-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="visits" defaultChecked={!!editRow.allow_visits} /> Allow visits
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="reg" defaultChecked={!!editRow.allow_reg} /> Allow reg.
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="trading" defaultChecked={!!editRow.allow_trading} /> Allow trading
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={btnSecondary} onClick={() => setEditRow(null)}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      <PageBottomGuide intro="Country allow and deny toggles — save instantly, no page reload." blocks={guideBlocks} />
    </div>
  );
}
