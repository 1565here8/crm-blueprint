import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { client, type HistoryLogRow } from "../../../api/client";
import { ErrorBanner } from "../../../components/admin/CrmShell";

type Filters = {
  dateMin: string;
  dateMax: string;
  from: string;
  to: string;
  type: string;
  comment: string;
  agent: string;
  user: string;
  changedStatus: string;
  crmId: string;
};

function defaultPeriod(): { dateMin: string; dateMax: string; from: string; to: string } {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const fmtDate = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  };
  const fmtDateTime = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${fmtDate(d)}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  };
  return {
    dateMin: fmtDate(yesterday),
    dateMax: fmtDate(now),
    from: `${fmtDate(yesterday)}T00:00`,
    to: `${fmtDate(now)}T23:59`,
  };
}

function dateToIsoStart(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

function dateToIsoEnd(date: string): string {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
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
    hour12: false,
  });
}

function LiveUtcClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-xs tabular-nums text-teal-400/90">
      {now.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
        hour12: false,
      })}{" "}
      UTC
    </span>
  );
}

function actionBadge(type: string) {
  return (
    <span className="inline-flex rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-teal-300/90">
      {type.replace(/_/g, " ")}
    </span>
  );
}

function cellVal(v: string | number | null | undefined) {
  if (v == null || v === "") return <span className="text-slate-600">—</span>;
  return <span className="text-slate-200">{String(v)}</span>;
}

function rowComments(r: HistoryLogRow) {
  return r.comments ?? r.detail ?? r.operator_note ?? null;
}

function rowPrev(r: HistoryLogRow) {
  return r.prev_value ?? r.prev_status ?? null;
}

function rowNew(r: HistoryLogRow) {
  return r.new_value ?? r.new_status ?? null;
}

const inputDark =
  "mt-1 w-full rounded-md border border-slate-700/80 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30";
const labelDark = "block text-[10px] font-semibold uppercase tracking-wider text-slate-500";

export function EventLogsPage() {
  const initial = defaultPeriod();
  const [draft, setDraft] = useState<Filters>({
    dateMin: initial.dateMin,
    dateMax: initial.dateMax,
    from: initial.from,
    to: initial.to,
    type: "all",
    comment: "",
    agent: "",
    user: "",
    changedStatus: "",
    crmId: "",
  });
  const [applied, setApplied] = useState(draft);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<HistoryLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, uniqueAgents: 0, statusChanges: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fromIso = applied.from
        ? new Date(applied.from).toISOString()
        : dateToIsoStart(applied.dateMin);
      const toIso = applied.to ? new Date(applied.to).toISOString() : dateToIsoEnd(applied.dateMax);
      const data = await client.adminHistoryLogs({
        from: fromIso,
        to: toIso,
        action: applied.type,
        agent: applied.agent || undefined,
        user: applied.user || undefined,
        comment: applied.comment || undefined,
        changedStatus: applied.changedStatus || undefined,
        crmId: applied.crmId || undefined,
        page,
        limit,
        sortBy,
        sortDir,
      });
      setRows(data.rows);
      setTotal(data.total);
      setActionTypes(data.actionTypes);
      setStats({
        total: data.stats.total,
        uniqueAgents: data.stats.uniqueAgents ?? 0,
        statusChanges: data.stats.statusChanges,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load event logs.");
    } finally {
      setLoading(false);
    }
  }, [applied, page, limit, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const periodLabel = useMemo(
    () => `${applied.dateMin} → ${applied.dateMax}`,
    [applied.dateMin, applied.dateMax],
  );

  function applyFilters() {
    setPage(1);
    setApplied({ ...draft });
  }

  function resetFilters() {
    const r = defaultPeriod();
    const next: Filters = {
      dateMin: r.dateMin,
      dateMax: r.dateMax,
      from: r.from,
      to: r.to,
      type: "all",
      comment: "",
      agent: "",
      user: "",
      changedStatus: "",
      crmId: "",
    };
    setDraft(next);
    setApplied(next);
    setPage(1);
  }

  function syncPeriodDates(dateMin: string, dateMax: string) {
    setDraft((d) => ({
      ...d,
      dateMin,
      dateMax,
      from: `${dateMin}T00:00`,
      to: `${dateMax}T23:59`,
    }));
  }

  function exportCsv() {
    const fromIso = applied.from
      ? new Date(applied.from).toISOString()
      : dateToIsoStart(applied.dateMin);
    const toIso = applied.to ? new Date(applied.to).toISOString() : dateToIsoEnd(applied.dateMax);
    const q = new URLSearchParams();
    q.set("from", fromIso);
    q.set("to", toIso);
    if (applied.type !== "all") q.set("action", applied.type);
    if (applied.agent) q.set("agent", applied.agent);
    if (applied.user) q.set("user", applied.user);
    if (applied.comment) q.set("comment", applied.comment);
    if (applied.changedStatus) q.set("changedStatus", applied.changedStatus);
    if (applied.crmId) q.set("crmId", applied.crmId);
    window.open(`/api/admin/super-admin/history-logs/export?${q.toString()}`, "_blank");
  }

  function toggleSort(col: string) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  const typeOptions = ["all", ...actionTypes];

  return (
    <div className="-mx-1 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Event Logs</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Mission-control audit stream — every CRM action, timestamped UTC.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-teal-600/40 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700/50 bg-teal-950/40 px-3 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-900/40"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Events in range", value: stats.total },
          { label: "Unique agents", value: stats.uniqueAgents },
          { label: "Status changes", value: stats.statusChanges },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-slate-800 bg-[#0c1017] px-3 py-2.5 shadow-inner shadow-black/20"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
            <p className="mt-0.5 font-mono text-2xl tabular-nums text-teal-400">{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="sticky top-0 z-10 rounded-xl border border-slate-800 bg-[#0c1017] shadow-lg shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Period</span>
            <span className="font-mono text-sm text-slate-200">{periodLabel}</span>
          </div>
          <LiveUtcClock />
        </div>

        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelDark}>
            Date from
            <input
              type="date"
              className={inputDark}
              value={draft.dateMin}
              onChange={(e) => syncPeriodDates(e.target.value, draft.dateMax)}
            />
          </label>
          <label className={labelDark}>
            Date to
            <input
              type="date"
              className={inputDark}
              value={draft.dateMax}
              onChange={(e) => syncPeriodDates(draft.dateMin, e.target.value)}
            />
          </label>
          <label className={labelDark}>
            Type
            <select
              className={inputDark}
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t === "all" ? "All types" : t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-500"
            >
              <Search size={14} />
              Search
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-rose-800/60 hover:text-rose-400"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-xs font-medium text-slate-400 transition hover:text-teal-400"
          >
            <span>Advanced filters</span>
            {advancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {advancedOpen ? (
            <div className="grid gap-3 border-t border-slate-800/60 px-4 pb-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelDark}>
                Date created min
                <input
                  type="datetime-local"
                  className={inputDark}
                  value={draft.from}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                />
              </label>
              <label className={labelDark}>
                Date created max
                <input
                  type="datetime-local"
                  className={inputDark}
                  value={draft.to}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                />
              </label>
              <label className={labelDark}>
                Comment
                <input
                  className={inputDark}
                  placeholder="Text in comments…"
                  value={draft.comment}
                  onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
                />
              </label>
              <label className={labelDark}>
                Responsible agent
                <input
                  className={inputDark}
                  placeholder="Agent username…"
                  value={draft.agent}
                  onChange={(e) => setDraft((d) => ({ ...d, agent: e.target.value }))}
                />
              </label>
              <label className={labelDark}>
                Lead / user email
                <input
                  className={inputDark}
                  placeholder="Client email…"
                  value={draft.user}
                  onChange={(e) => setDraft((d) => ({ ...d, user: e.target.value }))}
                />
              </label>
              <label className={labelDark}>
                Changed status
                <input
                  className={inputDark}
                  placeholder="e.g. New → Deposited"
                  value={draft.changedStatus}
                  onChange={(e) => setDraft((d) => ({ ...d, changedStatus: e.target.value }))}
                />
              </label>
              <label className={labelDark}>
                CRM id
                <input
                  className={inputDark}
                  placeholder="User or record id…"
                  value={draft.crmId}
                  onChange={(e) => setDraft((d) => ({ ...d, crmId: e.target.value }))}
                />
              </label>
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0c1017] shadow-lg shadow-black/30">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <th
                  className="cursor-pointer whitespace-nowrap px-3 py-2.5 hover:text-teal-400"
                  onClick={() => toggleSort("created_at")}
                >
                  Date created
                </th>
                <th className="whitespace-nowrap px-3 py-2.5">Type</th>
                <th className="whitespace-nowrap px-3 py-2.5">Executed by</th>
                <th className="whitespace-nowrap px-3 py-2.5">Actioned on</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right">Amount</th>
                <th className="whitespace-nowrap px-3 py-2.5">Currency</th>
                <th className="whitespace-nowrap px-3 py-2.5">Prev value</th>
                <th className="whitespace-nowrap px-3 py-2.5">New value</th>
                <th className="min-w-[160px] px-3 py-2.5">Comments</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-500">
                    <Loader2 size={22} className="mx-auto animate-spin opacity-40" />
                    <p className="mt-2 font-mono text-xs">Loading event stream…</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="text-slate-400">No events in this period.</p>
                    <p className="mt-1 text-xs text-slate-600">Widen the date range or reset filters.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-800/60 transition hover:bg-slate-800/30"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] tabular-nums text-slate-400">
                      {fmtUtc(row.created_at)}
                    </td>
                    <td className="px-3 py-2">{actionBadge(row.action_type)}</td>
                    <td className="px-3 py-2 text-slate-300">{row.executed_by ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.actioned_on_id ? (
                        <Link
                          to={`/admin/crm/users/${row.actioned_on_id}`}
                          className="text-teal-400 hover:text-teal-300 hover:underline"
                        >
                          {row.actioned_on ?? row.crm_id ?? row.actioned_on_id.slice(0, 8)}
                        </Link>
                      ) : (
                        cellVal(row.actioned_on ?? row.crm_id)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-slate-300">
                      {row.amount != null ? row.amount.toLocaleString(undefined, { maximumFractionDigits: 8 }) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs uppercase text-slate-400">
                      {row.currency ?? "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-xs text-slate-400" title={rowPrev(row) ?? ""}>
                      {rowPrev(row) ?? "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-xs text-slate-200" title={rowNew(row) ?? ""}>
                      {rowNew(row) ?? "—"}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-xs text-slate-500" title={rowComments(row) ?? ""}>
                      {rowComments(row) ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-slate-300"
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
            <span className="font-mono tabular-nums">{total.toLocaleString()} total</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              className="rounded border border-slate-700 p-1 text-slate-400 disabled:opacity-30"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="min-w-[4rem] text-center font-mono tabular-nums text-slate-400">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              className="rounded border border-slate-700 p-1 text-slate-400 disabled:opacity-30"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
