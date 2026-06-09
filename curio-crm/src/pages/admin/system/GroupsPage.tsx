import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { client, type DeskGroupRow } from "../../../api/client";
import {
  AdminPageHeader,
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  Panel,
  StatChip,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

const guideBlocks: GuideBlock[] = [
  {
    title: "Desk groups",
    what: "Each row is a role bucket — admin, rep, retention manager, affiliate, etc.",
    how: "Click a group name to open its CRM + API permission matrix.",
    when: "Setting up a new sales floor or tightening API access per team.",
  },
  {
    title: "Id vs name",
    what: "Id is the stable slug used in auto-assign rules and API hooks. Name is what managers see.",
    how: "Search by either column. Sort by Id or Name from the table headers.",
    when: "Migrating group ids from an older CRM.",
  },
  {
    title: "Permissions page",
    what: "System → Permissions uses the same group list with a searchable picker.",
    how: "Open Permissions from the sidebar or click any group name here — both stay in sync.",
    when: "Bulk-editing API scopes without touching CRM sidebar toggles.",
  },
];

export default function GroupsPage() {
  const [rows, setRows] = useState<DeskGroupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminSystemGroups({
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

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  function runSearch() {
    setPage(1);
    setAppliedSearch(search);
  }

  return (
    <div>
      <AdminPageHeader
        title="Groups"
        subtitle="Desk role buckets — click a name to edit CRM and API permissions."
        actions={
          <Link to="/admin/system/permissions" className={btnSecondary}>
            <Shield size={14} className="mr-1.5 inline" />
            Open permissions
          </Link>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatChip label="Groups" value={total} />
        <StatChip label="Page" value={`${page} / ${totalPages}`} />
        <StatChip label="Showing" value={rows.length} />
      </div>

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search id or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
          </div>
          <button type="button" className={btnPrimary} onClick={runSearch}>
            Search
          </button>
          <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                Show {n}
              </option>
            ))}
          </select>
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("id")}>
                  Id <ArrowDownUp size={10} className="inline opacity-50" />
                </th>
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("name")}>
                  Name <ArrowDownUp size={10} className="inline opacity-50" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" size={24} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-500">
                    No groups match your search.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition hover:bg-teal-50/40 ${
                      i % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/system/permissions?group=${encodeURIComponent(row.id)}`}
                        className="inline-flex items-center gap-2 font-semibold text-teal-700 hover:text-teal-600 hover:underline"
                      >
                        <Shield size={14} className="opacity-70" />
                        {row.name}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing {total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
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

      <PageBottomGuide
        intro="Desk role buckets — start here, then open Permissions to set what each group may see."
        blocks={guideBlocks}
      />
    </div>
  );
}
