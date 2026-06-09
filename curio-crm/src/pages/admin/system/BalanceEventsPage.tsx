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
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { client, type BalanceEventRow, type BalanceEventUpsertBody } from "../../../api/client";
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
  type: string;
  user: string;
  search: string;
  flaggedOnly: boolean;
  negativeOnly: boolean;
};

type ColKey =
  | "id"
  | "date"
  | "type"
  | "user"
  | "prevCash"
  | "newCash"
  | "delta"
  | "prevBonus"
  | "newBonus"
  | "prevTotal"
  | "newTotal"
  | "note";

const ALL_COLS: { key: ColKey; label: string; default: boolean }[] = [
  { key: "id", label: "Id", default: true },
  { key: "date", label: "Date", default: true },
  { key: "type", label: "Type", default: true },
  { key: "user", label: "Client", default: true },
  { key: "prevCash", label: "Prev cash", default: true },
  { key: "newCash", label: "New cash", default: true },
  { key: "delta", label: "Delta", default: true },
  { key: "prevBonus", label: "Prev bonus", default: false },
  { key: "newBonus", label: "New bonus", default: false },
  { key: "prevTotal", label: "Prev total", default: false },
  { key: "newTotal", label: "New total", default: false },
  { key: "note", label: "Note", default: true },
];

const TYPE_PILLS = ["all", "deposit", "trade", "commission", "withdrawal", "bonus", "manual_adjustment"];

const TYPE_STYLES: Record<string, string> = {
  create_deposit: "bg-emerald-100 text-emerald-800 ring-emerald-200/60",
  create_trade: "bg-sky-100 text-sky-800 ring-sky-200/60",
  withdrawal: "bg-rose-100 text-rose-800 ring-rose-200/60",
  bonus: "bg-violet-100 text-violet-800 ring-violet-200/60",
  manual_adjustment: "bg-amber-100 text-amber-900 ring-amber-200/60",
};

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
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

function fmtBal(n: number) {
  return n.toFixed(8);
}

function typeBadge(type: string) {
  const base = TYPE_STYLES[type] ?? (type.includes("commission") ? "bg-teal-100 text-teal-800 ring-teal-200/60" : "bg-slate-100 text-slate-600 ring-slate-200/60");
  return (
    <span className={`inline-flex max-w-[180px] truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${base}`} title={type}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function deltaCell(prev: number, next: number) {
  const d = next - prev;
  const pos = d >= 0;
  return (
    <span className={`font-mono text-xs tabular-nums ${pos ? "text-emerald-600" : "text-rose-600"}`}>
      {pos ? "+" : ""}
      {fmtBal(d)}
    </span>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Every wallet move, one row",
    what: "Each deposit, trade margin, commission, bonus, or adjustment writes a passbook line with before/after balances.",
    how: "Filter by client email, event type, or date. Green delta = cash up; red = cash down.",
    when: "Client dispute: \"my balance was $500 yesterday.\"",
  },
  {
    title: "Editor panel (owner only)",
    what: "Add or correct a row before syncing with finance — always attach a ticket ID in the note.",
    how: "Click Edit on a row or Add event. Numbers must chain: new cash ≈ prev cash + delta.",
    when: "Balance mismatch or manual_adjustment after compliance sign-off.",
  },
  {
    title: "Cross-check",
    what: "Immutable ledger lines link to Cashier → Full Ledger via ref_note.",
    how: "Open the client file → Money tab and match timestamps.",
    when: "Negative cash during open trades — verify demo vs real before editing.",
  },
];

const emptyForm = (): BalanceEventUpsertBody & { id?: number } => ({
  eventType: "create_deposit",
  userId: "",
  prevCash: 0,
  newCash: 0,
  prevBonus: 0,
  newBonus: 0,
  refNote: "",
  operatorNote: "",
});

export function BalanceEventsPage() {
  const initial = defaultRange();
  const [draft, setDraft] = useState<Filters>({
    from: initial.from,
    to: initial.to,
    type: "all",
    user: "",
    search: "",
    flaggedOnly: false,
    negativeOnly: false,
  });
  const [applied, setApplied] = useState(draft);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<BalanceEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, flagged: 0, deposits: 0, trades: 0, netCashDelta: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    () => new Set(ALL_COLS.filter((c) => c.default).map((c) => c.key)),
  );
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [savingNote, setSavingNote] = useState<number | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formBusy, setFormBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminBalanceEvents({
        from: applied.from ? new Date(applied.from).toISOString() : undefined,
        to: applied.to ? new Date(applied.to).toISOString() : undefined,
        type: applied.type,
        user: applied.user || undefined,
        search: applied.search || undefined,
        flagged: applied.flaggedOnly,
        negativeOnly: applied.negativeOnly,
        page,
        limit,
        sortBy,
        sortDir,
      });
      setRows(data.rows);
      setTotal(data.total);
      setEventTypes(data.eventTypes);
      setStats(data.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load balance events.");
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
    const next: Filters = {
      from: r.from,
      to: r.to,
      type: "all",
      user: "",
      search: "",
      flaggedOnly: false,
      negativeOnly: false,
    };
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

  async function saveNote(row: BalanceEventRow, note: string) {
    setSavingNote(row.id);
    try {
      const { row: updated } = await client.adminBalanceEventAnnotate(row.id, { operatorNote: note || null });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save note.");
    } finally {
      setSavingNote(null);
    }
  }

  async function toggleFlag(row: BalanceEventRow) {
    try {
      const { row: updated } = await client.adminBalanceEventAnnotate(row.id, { flagged: !row.flagged });
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
    if (applied.type !== "all") q.set("type", applied.type);
    if (applied.user) q.set("user", applied.user);
    if (applied.search) q.set("search", applied.search);
    if (applied.flaggedOnly) q.set("flagged", "1");
    if (applied.negativeOnly) q.set("negativeOnly", "1");
    window.open(`/api/admin/super-admin/balance-events/export?${q.toString()}`, "_blank");
  }

  function openEditor(row?: BalanceEventRow) {
    if (row) {
      setForm({
        id: row.id,
        eventType: row.event_type,
        userId: row.user_id,
        prevCash: row.prev_cash,
        newCash: row.new_cash,
        prevBonus: row.prev_bonus,
        newBonus: row.new_bonus,
        ledgerRef: row.ledger_ref,
        refNote: row.ref_note ?? "",
        operatorNote: row.operator_note ?? "",
        createdAt: row.created_at.slice(0, 19),
      });
    } else {
      setForm(emptyForm());
    }
    setEditorOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.userId.trim()) {
      setError("User ID is required.");
      return;
    }
    setFormBusy(true);
    setError(null);
    try {
      const body: BalanceEventUpsertBody = {
        eventType: form.eventType,
        userId: form.userId.trim(),
        prevCash: Number(form.prevCash),
        newCash: Number(form.newCash),
        prevBonus: Number(form.prevBonus ?? 0),
        newBonus: Number(form.newBonus ?? 0),
        ledgerRef: form.ledgerRef ?? null,
        refNote: form.refNote || null,
        operatorNote: form.operatorNote || null,
        createdAt: form.createdAt ? new Date(form.createdAt).toISOString() : undefined,
      };
      if (form.id) await client.adminBalanceEventUpdate(form.id, body);
      else await client.adminBalanceEventCreate(body);
      setEditorOpen(false);
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setFormBusy(false);
    }
  }

  const typePills = useMemo(() => {
    const extras = eventTypes.filter((t) => !TYPE_PILLS.includes(t) && !TYPE_PILLS.some((p) => p !== "all" && t.includes(p)));
    return [...TYPE_PILLS, ...extras.slice(0, 6)];
  }, [eventTypes]);

  return (
    <div>
      <PageHeader
        title="Balance events"
        subtitle="Wallet passbook — every cash move with before/after balances."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => openEditor()}>
              <Plus size={15} />
              <span className="ml-1.5">Add event</span>
            </button>
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatChip label="In range" value={stats.total} />
        <StatChip label="Deposits" value={stats.deposits} />
        <StatChip label="Trades" value={stats.trades} />
        <StatChip label="Net cash Δ" value={stats.netCashDelta.toFixed(2)} />
        <StatChip label="Flagged" value={stats.flagged} />
      </div>

      <Panel className="mb-4 overflow-visible p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-500">
            Range <span className="font-mono text-slate-700">{rangeLabel}</span> UTC
          </p>
          <div className="relative">
            <button type="button" className={btnSecondary} onClick={() => setColPickerOpen((v) => !v)}>
              <SlidersHorizontal size={14} />
              <span className="ml-1.5">Columns</span>
              <ChevronDown size={14} className="ml-1 opacity-60" />
            </button>
            {colPickerOpen ? (
              <div className="absolute right-0 z-20 mt-1 max-h-64 w-52 overflow-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
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
            <input type="datetime-local" className={`${inputCls} mt-1`} value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            To
            <input type="datetime-local" className={`${inputCls} mt-1`} value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Client
            <input className={`${inputCls} mt-1`} placeholder="Email or username…" value={draft.user} onChange={(e) => setDraft((d) => ({ ...d, user: e.target.value }))} />
          </label>
          <label className="block text-xs font-medium text-slate-500">
            Global search
            <div className="relative mt-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${inputCls} pl-9`} placeholder="Type, ref, note…" value={draft.search} onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
            </div>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <input type="checkbox" checked={draft.flaggedOnly} onChange={(e) => setDraft((d) => ({ ...d, flaggedOnly: e.target.checked }))} />
            Flagged only
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <input type="checkbox" checked={draft.negativeOnly} onChange={(e) => setDraft((d) => ({ ...d, negativeOnly: e.target.checked }))} />
            Negative balance
          </label>
          <button type="button" className={btnPrimary} onClick={applyFilters}>
            Search
          </button>
          <button type="button" className="rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {typePills.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setDraft((d) => ({ ...d, type: t }));
                setApplied((p) => ({ ...p, type: t }));
                setPage(1);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                applied.type === t ? "bg-teal-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t === "all" ? "All types" : t.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="w-16 px-2 py-3" />
                {visibleCols.has("id") ? (
                  <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("id")}>
                    Id <ArrowDownUp size={10} className="ml-0.5 inline opacity-50" />
                  </th>
                ) : null}
                {visibleCols.has("date") ? (
                  <th className="cursor-pointer px-3 py-3 whitespace-nowrap" onClick={() => toggleSort("created_at")}>
                    Date
                  </th>
                ) : null}
                {visibleCols.has("type") ? <th className="px-3 py-3">Type</th> : null}
                {visibleCols.has("user") ? <th className="px-3 py-3">Client</th> : null}
                {visibleCols.has("prevCash") ? <th className="px-3 py-3 text-right">Prev cash</th> : null}
                {visibleCols.has("newCash") ? <th className="px-3 py-3 text-right">New cash</th> : null}
                {visibleCols.has("delta") ? <th className="px-3 py-3 text-right">Δ</th> : null}
                {visibleCols.has("prevBonus") ? <th className="px-3 py-3 text-right">Prev bonus</th> : null}
                {visibleCols.has("newBonus") ? <th className="px-3 py-3 text-right">New bonus</th> : null}
                {visibleCols.has("prevTotal") ? <th className="px-3 py-3 text-right">Prev total</th> : null}
                {visibleCols.has("newTotal") ? <th className="px-3 py-3 text-right">New total</th> : null}
                {visibleCols.has("note") ? <th className="min-w-[120px] px-3 py-3">Note</th> : null}
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-16 text-center text-slate-400">
                    <Loader2 size={24} className="mx-auto animate-spin opacity-40" />
                    <p className="mt-2 text-sm">Loading balance passbook…</p>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-16 text-center">
                    <p className="text-slate-500">No balance events in this range.</p>
                    <p className="mt-1 text-xs text-slate-400">Widen dates or reset filters. New ledger moves appear here automatically.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const open = expandedId === row.id;
                  return (
                    <React.Fragment key={row.id}>
                      <tr className={`border-b border-slate-100 transition hover:bg-teal-50/30 ${row.flagged ? "bg-amber-50/40" : ""}`}>
                        <td className="px-2 py-2">
                          <button type="button" title={row.flagged ? "Unflag" : "Flag"} className={`rounded p-1 ${row.flagged ? "text-amber-500" : "text-slate-300 hover:text-amber-400"}`} onClick={() => void toggleFlag(row)}>
                            {row.flagged ? <Star size={14} fill="currentColor" /> : <Flag size={14} />}
                          </button>
                        </td>
                        {visibleCols.has("id") ? <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{row.id}</td> : null}
                        {visibleCols.has("date") ? <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-slate-600">{fmtUtc(row.created_at)}</td> : null}
                        {visibleCols.has("type") ? <td className="px-3 py-2.5">{typeBadge(row.event_type)}</td> : null}
                        {visibleCols.has("user") ? (
                          <td className="px-3 py-2.5">
                            <Link to={`/admin/crm/users/${row.user_id}`} className="block font-medium text-teal-600 hover:underline">
                              {row.user_email ?? row.user_label ?? row.user_id.slice(0, 8)}
                            </Link>
                          </td>
                        ) : null}
                        {visibleCols.has("prevCash") ? <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtBal(row.prev_cash)}</td> : null}
                        {visibleCols.has("newCash") ? <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtBal(row.new_cash)}</td> : null}
                        {visibleCols.has("delta") ? <td className="px-3 py-2.5 text-right">{deltaCell(row.prev_cash, row.new_cash)}</td> : null}
                        {visibleCols.has("prevBonus") ? <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtBal(row.prev_bonus)}</td> : null}
                        {visibleCols.has("newBonus") ? <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtBal(row.new_bonus)}</td> : null}
                        {visibleCols.has("prevTotal") ? <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtBal(row.prev_cash + row.prev_bonus)}</td> : null}
                        {visibleCols.has("newTotal") ? <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">{fmtBal(row.new_cash + row.new_bonus)}</td> : null}
                        {visibleCols.has("note") ? (
                          <td className="px-3 py-2.5">
                            <input
                              className="w-full min-w-[100px] rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-slate-600 outline-none focus:border-teal-300 focus:bg-white focus:ring-2 focus:ring-teal-500/15"
                              placeholder="Ticket / note…"
                              defaultValue={row.operator_note ?? ""}
                              disabled={savingNote === row.id}
                              onBlur={(e) => {
                                if (e.target.value !== (row.operator_note ?? "")) void saveNote(row, e.target.value);
                              }}
                              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                            />
                          </td>
                        ) : null}
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button type="button" className="rounded px-2 py-1 text-xs text-teal-700 hover:bg-teal-50" onClick={() => setExpandedId(open ? null : row.id)}>
                              show
                            </button>
                            <button type="button" className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" onClick={() => openEditor(row)}>
                              <Pencil size={12} className="inline" /> edit
                            </button>
                          </div>
                        </td>
                      </tr>
                      {open ? (
                        <tr className="border-b border-slate-50 bg-slate-50/80">
                          <td colSpan={14} className="px-6 py-3 text-xs text-slate-600">
                            {row.ref_note ? (
                              <p>
                                <span className="font-semibold text-slate-500">Ledger reason:</span> {row.ref_note}
                              </p>
                            ) : null}
                            {row.ledger_ref ? (
                              <p className="mt-1">
                                <span className="font-semibold text-slate-500">Ledger ref:</span>{" "}
                                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">{row.ledger_ref}</code>
                              </p>
                            ) : null}
                            <p className="mt-1">
                              <span className="font-semibold text-slate-500">User ID:</span> {row.user_id}
                            </p>
                            <Link to={`/admin/cashier/ledger`} className="mt-2 inline-block text-teal-700 hover:underline">
                              Open Full Ledger →
                            </Link>
                          </td>
                        </tr>
                      ) : null}
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
            <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-xs text-slate-500">entries · {total} total</span>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[4rem] text-center text-xs tabular-nums">{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Panel>

      {editorOpen ? (
        <Panel className="mt-4 border-teal-200/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">{form.id ? `Edit event #${form.id}` : "Add balance event"}</h3>
            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => setEditorOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => void submitForm(e)}>
            <label className="text-xs font-medium text-slate-500">
              Type
              <input className={`${inputCls} mt-1`} value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} placeholder="create_deposit" required />
            </label>
            <label className="text-xs font-medium text-slate-500">
              User ID
              <input className={`${inputCls} mt-1 font-mono text-xs`} value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} required />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Date (UTC)
              <input type="datetime-local" className={`${inputCls} mt-1`} value={form.createdAt?.replace(" ", "T").slice(0, 16) ?? ""} onChange={(e) => setForm((f) => ({ ...f, createdAt: e.target.value }))} />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Prev cash
              <input type="number" step="any" className={`${inputCls} mt-1 font-mono`} value={form.prevCash} onChange={(e) => setForm((f) => ({ ...f, prevCash: Number(e.target.value) }))} />
            </label>
            <label className="text-xs font-medium text-slate-500">
              New cash
              <input type="number" step="any" className={`${inputCls} mt-1 font-mono`} value={form.newCash} onChange={(e) => setForm((f) => ({ ...f, newCash: Number(e.target.value) }))} />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Prev / new bonus
              <div className="mt-1 flex gap-2">
                <input type="number" step="any" className={`${inputCls} font-mono`} value={form.prevBonus ?? 0} onChange={(e) => setForm((f) => ({ ...f, prevBonus: Number(e.target.value) }))} />
                <input type="number" step="any" className={`${inputCls} font-mono`} value={form.newBonus ?? 0} onChange={(e) => setForm((f) => ({ ...f, newBonus: Number(e.target.value) }))} />
              </div>
            </label>
            <label className="sm:col-span-2 text-xs font-medium text-slate-500">
              Ref note
              <input className={`${inputCls} mt-1`} value={form.refNote ?? ""} onChange={(e) => setForm((f) => ({ ...f, refNote: e.target.value }))} placeholder="manual_adjustment ticket #…" />
            </label>
            <label className="sm:col-span-3 text-xs font-medium text-slate-500">
              Operator note
              <input className={`${inputCls} mt-1`} value={form.operatorNote ?? ""} onChange={(e) => setForm((f) => ({ ...f, operatorNote: e.target.value }))} />
            </label>
            <div className="sm:col-span-3 flex gap-2 pt-1">
              <button type="submit" className={btnPrimary} disabled={formBusy}>
                {formBusy ? <Loader2 size={15} className="animate-spin" /> : null}
                <span className="ml-1">{form.id ? "Save changes" : "Create event"}</span>
              </button>
              <button type="button" className={btnSecondary} onClick={() => setEditorOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <PageBottomGuide intro="Immutable passbook rows — pair with Full Ledger when a client disputes their balance." blocks={guideBlocks} />
    </div>
  );
}
