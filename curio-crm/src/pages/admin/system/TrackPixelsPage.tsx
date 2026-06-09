import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { client, type TrackPixelRow } from "../../../api/client";
import {
  btnSecondary,
  ErrorBanner,
  inputCls,
  PageHeader,
  Panel,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

function fmtUtc(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
}

function statusBadge(status: string | null) {
  if (!status) return <span className="text-slate-400">—</span>;
  const n = Number(status);
  const ok = !Number.isNaN(n) && n >= 200 && n < 300;
  const cls = ok
    ? "bg-emerald-100 text-emerald-800 ring-emerald-200/60"
    : n >= 400
      ? "bg-rose-100 text-rose-800 ring-rose-200/60"
      : "bg-amber-100 text-amber-900 ring-amber-200/60";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ring-1 ${cls}`}>
      {status}
    </span>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Id",
    what: "Internal row number — cite this when opening a ticket with tech support.",
    how: "Sort by Id (newest first by default) to see the latest fires at the top.",
    when: "Partner asks “which postback failed on Tuesday?”",
  },
  {
    title: "Url",
    what: "The partner endpoint we called (postback URL or pixel address).",
    how: "Copy from the table or search partial hostnames.",
    when: "Confirming the correct tracker URL after a campaign change.",
  },
  {
    title: "PostFields",
    what: "Query string or body fields we sent (click id, amount, status, etc.).",
    how: "Read left to right; compare with the partner’s spec sheet.",
    when: "Partner says they never received click_id — check it was in PostFields.",
  },
  {
    title: "Date Created",
    what: "When the fire happened (UTC).",
    how: "Use with Search to narrow by user or deposit id, then scan timestamps.",
    when: "Matching a client deposit time to an FTD pixel.",
  },
  {
    title: "Type & Pixel Type",
    what: "Type is how we fired (e.g. postback vs pixel). Pixel Type is delivery style (server, image, iframe).",
    how: "Filter mentally: server postbacks vs image pixels behave differently on failures.",
    when: "Debugging why a browser pixel fired but server postback did not.",
  },
  {
    title: "Function",
    what: "Business event that triggered the fire (registration, login, ftd, deposit, etc.).",
    how: "Search the function name if the partner only cares about FTD lines.",
    when: "Affiliate invoice disputes — prove which events were sent.",
  },
  {
    title: "Response & Response Status",
    what: "Raw partner reply snippet and HTTP status (200 = OK).",
    how: "Red/non-2xx statuses need escalation; 200 with empty body may still be accepted.",
    when: "Postback returns 403 or timeout — forward row Id to integrations.",
  },
  {
    title: "DepositId & TransactionId",
    what: "Links to cashier records when money moved.",
    how: "Cross-check in Pending In / Credits In if amounts look wrong.",
    when: "FTD pixel fired but finance cannot find the deposit.",
  },
  {
    title: "UserId",
    what: "Client account tied to this fire (when known).",
    how: "Click through to Client File for full profile and campaign tags.",
    when: "Support asks “was this user attributed to partner X?”",
  },
  {
    title: "TrackingType",
    what: "High-level bucket (registration, deposit, login, etc.) — mirrors Function for reporting.",
    how: "Use Search across TrackingType and Function for the same keyword.",
    when: "Building a quick list of all deposit-related fires.",
  },
];

const COLS: { key: string; label: string; sort?: string }[] = [
  { key: "id", label: "Id", sort: "id" },
  { key: "url", label: "Url", sort: "url" },
  { key: "post_fields", label: "PostFields" },
  { key: "created_at", label: "Date Created", sort: "created_at" },
  { key: "type", label: "Type", sort: "type" },
  { key: "pixel_type", label: "Pixel Type", sort: "pixel_type" },
  { key: "pixel_function", label: "Function", sort: "pixel_function" },
  { key: "response", label: "Response" },
  { key: "response_status", label: "Response Status", sort: "response_status" },
  { key: "deposit_id", label: "DepositId" },
  { key: "transaction_id", label: "TransactionId" },
  { key: "user_id", label: "UserId", sort: "user_id" },
  { key: "tracking_type", label: "TrackingType", sort: "tracking_type" },
];

export function TrackPixelsPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<TrackPixelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminTrackPixels({
        search: appliedSearch || undefined,
        page,
        limit,
        sortBy,
        sortDir,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load track pixels.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, limit, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function applySearch() {
    setPage(1);
    setAppliedSearch(search.trim());
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  return (
    <div>
      <PageHeader
        title={`Track Pixels (${total})`}
        subtitle="Outbound partner fires — search, paginate, and verify postbacks."
        actions={
          <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            <span className="ml-1.5">Refresh</span>
          </button>
        }
      />

      <ErrorBanner message={error} />

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-xs font-medium text-slate-500">Search</span>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="URL, user id, deposit id, status…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applySearch();
                }}
              />
            </div>
          </label>
          <button type="button" className={btnSecondary} onClick={applySearch}>
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
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-3 whitespace-nowrap ${c.sort ? "cursor-pointer" : ""}`}
                    onClick={c.sort ? () => toggleSort(c.sort!) : undefined}
                  >
                    {c.label}
                    {c.sort ? <ArrowDownUp size={10} className="ml-0.5 inline opacity-50" /> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-16 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto animate-spin opacity-40" />
                    <p className="mt-2 text-sm">Loading track pixels…</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-16 text-center text-slate-500">
                    No data available in table
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 transition hover:bg-teal-50/30">
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 font-mono text-[11px] text-slate-600" title={row.url ?? ""}>
                      {row.url ?? "—"}
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 font-mono text-[11px] text-slate-600" title={row.post_fields ?? ""}>
                      {row.post_fields ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-600">{fmtUtc(row.created_at)}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.type ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.pixel_type ?? "—"}</td>
                    <td className="px-3 py-2.5 text-slate-700">{row.pixel_function ?? "—"}</td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 font-mono text-[11px] text-slate-500" title={row.response ?? ""}>
                      {row.response ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">{statusBadge(row.response_status)}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{row.deposit_id ?? "—"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{row.transaction_id ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {row.user_id ? (
                        <Link to={`/admin/crm/users/${row.user_id}`} className="font-mono text-xs text-teal-600 hover:underline">
                          {row.user_id.slice(0, 8)}…
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{row.tracking_type ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Show</span>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">entries</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[4rem] text-center text-xs tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Panel>

      <PageBottomGuide
        intro="Read-only log of partner pixels and postbacks — column guide for day-one staff."
        blocks={guideBlocks}
      />
    </div>
  );
}
