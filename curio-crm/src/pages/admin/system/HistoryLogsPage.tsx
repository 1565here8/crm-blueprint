import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Flag,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import { client, type HistoryLogRow } from "../../../api/client";
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

type Filters = {
  from: string;
  to: string;
  action: string;
  agent: string;
  user: string;
  search: string;
  flaggedOnly: boolean;
};

type ColKey =
  | "id"
  | "timestamp"
  | "action"
  | "executedBy"
  | "route"
  | "actionedOn"
  | "currentOwner"
  | "prevOwner"
  | "prevStatus"
  | "newStatus"
  | "note";

const ALL_COLS: { key: ColKey; label: string; default: boolean }[] = [
  { key: "id", label: "Log Id", default: true },
  { key: "timestamp", label: "Timestamp", default: true },
  { key: "action", label: "Action", default: true },
  { key: "executedBy", label: "Executed By", default: true },
  { key: "route", label: "Route", default: false },
  { key: "actionedOn", label: "Actioned On", default: true },
  { key: "currentOwner", label: "Current Owner", default: true },
  { key: "prevOwner", label: "Prev Owner", default: false },
  { key: "prevStatus", label: "Prev Status", default: true },
  { key: "newStatus", label: "New Status", default: true },
  { key: "note", label: "Note", default: true },
];

const ACTION_STYLES: Record<string, string> = {
  login: "bg-sky-100 text-sky-800 ring-sky-200/60",
  status_change: "bg-violet-100 text-violet-800 ring-violet-200/60",
  bulk_status_change: "bg-purple-100 text-purple-800 ring-purple-200/60",
  owner_change: "bg-amber-100 text-amber-900 ring-amber-200/60",
  profile_update: "bg-slate-100 text-slate-700 ring-slate-200/60",
  impersonate: "bg-rose-100 text-rose-800 ring-rose-200/60",
  maintenance: "bg-teal-100 text-teal-800 ring-teal-200/60",
};

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 60 * 1000);
  const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  return { from: fmt(from), to: fmt(to) };
}

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

function actionBadge(type: string) {
  const cls = ACTION_STYLES[type] ?? "bg-slate-100 text-slate-600 ring-slate-200/60";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Filter like a pro",
    what: "Date range defaults to the last 30 minutes UTC — widen it to see older desk activity.",
    how: "Use Action pills, agent/user fields, or the global search box. Toggle Flagged only for items you marked.",
    when: "Compliance review or tracing who changed a client status before a callback.",
  },
  {
    title: "Editable notes (not the log itself)",
    what: "Audit rows are immutable. You can add operator notes and flags for follow-up.",
    how: "Click a note cell, type, press Enter or click away to save. Star toggles flagged.",
    when: "Mark a suspicious login or bulk status change for manager review.",
  },
  {
    title: "Export",
    what: "CSV respects your current filters (up to 5,000 rows).",
    how: "Export CSV in the header — open in Excel or share with compliance.",
    when: "Monthly audit pack or dispute with a partner.",
  },
];

export function HistoryLogsPage() {
  const initial = defaultRange();
  const [draft, setDraft] = useState<Filters>({
    from: initial.from,
    to: initial.to,
    action: "all",
    agent: "",
    user: "",
    search: "",
    flaggedOnly: false,
  });
  const [applied, setApplied] = useState(draft);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<HistoryLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, flagged: 0, logins: 0, statusChanges: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => new Set(ALL_COLS.filter((c) => c.default).map((c) => c.key)),
  );
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [savingNote, setSavingNote] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminHistoryLogs({
        from: applied.from ? new Date(applied.from).toISOString() : undefined,
        to: applied.to ? new Date(applied.to).toISOString() : undefined,
        action: applied.action,
        agent: applied.agent || undefined,
        user: applied.user || undefined,
        search: applied.search || undefined,
        flagged: applied.flaggedOnly,
        page,
        limit,
        sortBy,
        sortDir,
      });
      setRows(data.rows);
      setTotal(data.total);
      setActionTypes(data.actionTypes);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load history logs.");
    } finally {
      setLoading(false);
    }
  }, [applied, page, limit, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeLabel = useMemo(() => {
    if (!applied.from && !applied.to) return "All time";
    const f = applied.from ? fmtUtc(new Date(applied.from).toISOString()) : "…";
    const t = applied.to ? fmtUtc(new Date(applied.to).toISOString()) : "…";
    return `${f} → ${t}`;
  }, [applied.from, applied.to]);

  function applyFilters() {
    setPage(1);
    setApplied({ ...draft });
  }

  function resetFilters() {
    const r = defaultRange();
    const next = { from: r.from, to: r.to, action: "all", agent: "", user: "", search: "", flaggedOnly: false };
    setDraft(next);
    setApplied(next);
    setPage(1);
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  async function saveNote(row: HistoryLogRow, note: string) {
    setSavingNote(row.id);
    try {
      const { row: updated } = await client.adminHistoryLogAnnotate(row.id, { operatorNote: note || null });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note.");
    } finally {
      setSavingNote(null);
    }
  }

  async function toggleFlag(row: HistoryLogRow) {
    try {
      const { row: updated } = await client.adminHistoryLogAnnotate(row.id, { flagged: !row.flagged });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setStats((s) => ({ ...s, flagged: s.flagged + (updated.flagged ? 1 : -1) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update flag.");
    }
  }

  function exportCsv() {
    const q = new URLSearchParams();
    if (applied.from) q.set("from", new Date(applied.from).toISOString());
    if (applied.to) q.set("to", new Date(applied.to).toISOString());
    if (applied.action !== "all") q.set("action", applied.action);
    if (applied.agent) q.set("agent", applied.agent);
    if (applied.user) q.set("user", applied.user);
    if (applied.search) q.set("search", applied.search);
    if (applied.flaggedOnly) q.set("flagged", "1");
    window.open(`/api/admin/super-admin/history-logs/export?${q.toString()}`, "_blank");
  }

  const actionPills = ["all", ...actionTypes];

  return (
    <div>
      <PageHeader
        title="History Logs"
        subtitle="Operator audit trail — filter, annotate, and export."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              <span className="ml-1.5">Refresh</span>
            </button>
            <button type="button" className={btnSecondary} onClick={exportCsv}>
              <Download size={15} />
              <span className="ml-1.5">Export CSV</span>
            </button>
          </>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="In range" value={stats.total} />
        <StatChip label="Logins" value={stats.logins} />
        <StatChip label="Status / owner" value={stats.statusChanges} />
        <StatChip label="Flagged" value={stats.flagged} />
      </div>

      <Panel className="mb-4 overflow-visible p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">
            Range <span className="font-mono text-slate-700">{rangeLabel}</span> UTC
          </p>
          <div className="relative">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setColPickerOpen((v) => !v)}
            >
              <SlidersHorizontal size={14} />
              <span className="ml-1.5">Columns</span>
              <ChevronDown size={14} className="ml-1 opacity-60" />
            </button>
            {colPickerOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {ALL_COLS.map((c) => (
                  <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={visibleCols.has(c.key)}
                      onChange={() => {
                        setVisibleCols((prev) => {
                          const next = new Set(prev);
                          if (next.has(c.key)) next.delete(c.key);
                          else next.add(c.key);
                          return next;
                        });
                      }}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-slate-500">
            From
            <input
              type="datetime-local"
              className={`${inputCls} mt-1`}
              value={draft.from}
              onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            To
            <input
              type="datetime-local"
              className={`${inputCls} mt-1`}
              value={draft.to}
              onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Agents
            <input
              className={`${inputCls} mt-1`}
              placeholder="Owner or executor…"
              value={draft.agent}
              onChange={(e) => setDraft((d) => ({ ...d, agent: e.target.value }))}
            />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Users / leads
            <input
              className={`${inputCls} mt-1`}
              placeholder="Username or email…"
              value={draft.user}
              onChange={(e) => setDraft((d) => ({ ...d, user: e.target.value }))}
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search detail, route, notes…"
              value={draft.search}
              onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={draft.flaggedOnly}
              onChange={(e) => setDraft((d) => ({ ...d, flaggedOnly: e.target.checked }))}
            />
            Flagged only
          </label>
          <button type="button" className={btnPrimary} onClick={applyFilters}>
            Search
          </button>
          <button type="button" className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {actionPills.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setDraft((d) => ({ ...d, action: a }));
                setApplied((p) => ({ ...p, action: a }));
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                applied.action === a
                  ? "bg-teal-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {a === "all" ? "All actions" : a.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="w-10 px-2 py-3" />
                {visibleCols.has("id") ? (
                  <th className="cursor-pointer px-3 py-3 whitespace-nowrap" onClick={() => toggleSort("id")}>
                    Log Id <ArrowDownUp size={10} className="ml-0.5 inline opacity-50" />
                  </th>
                ) : null}
                {visibleCols.has("timestamp") ? (
                  <th className="cursor-pointer px-3 py-3 whitespace-nowrap" onClick={() => toggleSort("created_at")}>
                    Timestamp
                  </th>
                ) : null}
                {visibleCols.has("action") ? <th className="px-3 py-3">Action</th> : null}
                {visibleCols.has("executedBy") ? <th className="px-3 py-3">Executed By</th> : null}
                {visibleCols.has("route") ? <th className="px-3 py-3">Route</th> : null}
                {visibleCols.has("actionedOn") ? <th className="px-3 py-3">Actioned On</th> : null}
                {visibleCols.has("currentOwner") ? <th className="px-3 py-3">Current Owner</th> : null}
                {visibleCols.has("prevOwner") ? <th className="px-3 py-3">Prev Owner</th> : null}
                {visibleCols.has("prevStatus") ? <th className="px-3 py-3">Prev Status</th> : null}
                {visibleCols.has("newStatus") ? <th className="px-3 py-3">New Status</th> : null}
                {visibleCols.has("note") ? <th className="px-3 py-3 min-w-[140px]">Note</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto animate-spin opacity-40" />
                    <p className="mt-2 text-sm">Loading audit trail…</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <p className="text-slate-500">No logs in this range.</p>
                    <p className="mt-1 text-xs text-slate-400">Widen the date window or reset filters. Logins and CRM edits appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const open = expandedId === row.id;
                  let meta: unknown = null;
                  if (row.meta_json) {
                    try {
                      meta = JSON.parse(row.meta_json);
                    } catch {
                      meta = row.meta_json;
                    }
                  }
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`border-b border-slate-100 transition hover:bg-teal-50/30 ${
                          row.flagged ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            title={row.flagged ? "Unflag" : "Flag for review"}
                            className={`rounded p-1 ${row.flagged ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`}
                            onClick={() => void toggleFlag(row)}
                          >
                            {row.flagged ? <Star size={14} fill="currentColor" /> : <Flag size={14} />}
                          </button>
                        </td>
                        {visibleCols.has("id") ? (
                          <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{row.id}</td>
                        ) : null}
                        {visibleCols.has("timestamp") ? (
                          <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-600">
                            {fmtUtc(row.created_at)}
                          </td>
                        ) : null}
                        {visibleCols.has("action") ? (
                          <td className="px-3 py-2.5">{actionBadge(row.action_type)}</td>
                        ) : null}
                        {visibleCols.has("executedBy") ? (
                          <td className="px-3 py-2.5 font-medium text-slate-700">{row.executed_by ?? "—"}</td>
                        ) : null}
                        {visibleCols.has("route") ? (
                          <td className="max-w-[140px] truncate px-3 py-2.5 font-mono text-[11px] text-slate-500" title={row.route_name ?? ""}>
                            {row.route_name ?? "—"}
                          </td>
                        ) : null}
                        {visibleCols.has("actionedOn") ? (
                          <td className="px-3 py-2.5">
                            {row.actioned_on_id ? (
                              <Link
                                to={`/admin/crm/users/${row.actioned_on_id}`}
                                className="font-medium text-teal-600 hover:underline"
                              >
                                {row.actioned_on ?? row.actioned_on_id.slice(0, 8)}
                              </Link>
                            ) : (
                              <span className="text-slate-600">{row.actioned_on ?? "—"}</span>
                            )}
                          </td>
                        ) : null}
                        {visibleCols.has("currentOwner") ? (
                          <td className="px-3 py-2.5 text-slate-600">{row.current_owner ?? "—"}</td>
                        ) : null}
                        {visibleCols.has("prevOwner") ? (
                          <td className="px-3 py-2.5 text-slate-500">{row.prev_owner ?? "—"}</td>
                        ) : null}
                        {visibleCols.has("prevStatus") ? (
                          <td className="px-3 py-2.5 text-slate-500">{row.prev_status ?? "—"}</td>
                        ) : null}
                        {visibleCols.has("newStatus") ? (
                          <td className="px-3 py-2.5 font-medium text-slate-700">{row.new_status ?? "—"}</td>
                        ) : null}
                        {visibleCols.has("note") ? (
                          <td className="px-3 py-2.5">
                            <input
                              className="w-full min-w-[120px] rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-slate-600 outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
                              placeholder="Add note…"
                              defaultValue={row.operator_note ?? ""}
                              disabled={savingNote === row.id}
                              onBlur={(e) => {
                                if (e.target.value !== (row.operator_note ?? "")) {
                                  void saveNote(row, e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              }}
                            />
                          </td>
                        ) : null}
                      </tr>
                      {(row.detail || row.route_name || meta) && (
                        <tr className="border-b border-slate-50 bg-slate-50/60">
                          <td colSpan={12} className="px-4 py-0">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 py-2 text-left text-xs text-slate-500 hover:text-teal-700"
                              onClick={() => setExpandedId(open ? null : row.id)}
                            >
                              <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
                              {open ? "Hide details" : "Show details"}
                              {row.detail ? <span className="truncate text-slate-600">— {row.detail}</span> : null}
                            </button>
                            {open ? (
                              <div className="pb-3 pl-6 text-xs text-slate-600">
                                {row.route_name ? (
                                  <p>
                                    <span className="font-semibold text-slate-500">Route:</span>{" "}
                                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">{row.route_name}</code>
                                  </p>
                                ) : null}
                                {row.detail ? <p className="mt-1">{row.detail}</p> : null}
                                {meta ? (
                                  <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-white p-2 font-mono text-[10px] text-slate-500">
                                    {JSON.stringify(meta, null, 2)}
                                  </pre>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
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
            <span className="text-xs text-slate-500">
              entries · {total} total
            </span>
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

      <PageBottomGuide intro="Immutable audit rows with editable annotations — who changed what on each client." blocks={guideBlocks} />
    </div>
  );
}
