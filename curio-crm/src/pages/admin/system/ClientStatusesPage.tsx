import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Users,
  X,
} from "lucide-react";
import {
  client,
  type ClientStatusAnalyticsResponse,
  type ClientStatusInput,
  type ClientStatusRow,
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

function ColorSwatch({ hex, size = 18 }: { hex: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-2 ring-white shadow-sm"
      style={{ width: size, height: size, backgroundColor: hex }}
      title={hex}
    />
  );
}

function activeBadge(active: number) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/60">
      Hidden
    </span>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Pipeline labels",
    what: "Each status is a sales funnel stage — New, Call Back, Hot, Depositor, etc.",
    how: "Reps pick a status from the dropdown on All Clients. Colours help the floor scan the grid.",
    when: "Onboarding a new desk or matching status names from an older CRM.",
  },
  {
    title: "Client counts",
    what: "The Clients column shows how many live accounts currently carry that label.",
    how: "Click the count to open All Clients filtered to that status — useful for callbacks and bulk edits.",
    when: "End-of-day review: which buckets are growing (No Answer vs Hot).",
  },
  {
    title: "Custom statuses",
    what: "Add your own labels beyond the 25 seeded defaults. Hidden statuses stay in history but drop from pickers.",
    how: "Add status → set name and colour → active Yes. Edit anytime; renaming updates every linked client.",
    when: "A partner asks for a campaign-specific stage like “Amazon VIP”.",
  },
  {
    title: "Analytics bar",
    what: "Distribution of clients across active statuses — width = share of book.",
    how: "Refresh after bulk status changes. Inactive statuses are excluded from the chart.",
    when: "Owner stand-up: “Where is the book stuck?”",
  },
  {
    title: "System defaults",
    what: "Built-in rows (New, No Answer, …) are protected system statuses — edit colour and order, not delete.",
    how: "Use Show for slug and timestamps. Toggle Active off to retire a default from new assignments.",
    when: "Migrating from another CRM while keeping familiar status names.",
  },
];

function AnalyticsPanel({ data }: { data: ClientStatusAnalyticsResponse | null }) {
  const max = useMemo(() => {
    if (!data?.rows.length) return 1;
    return Math.max(1, ...data.rows.map((r) => r.client_count));
  }, [data]);

  if (!data) {
    return (
      <Panel className="mb-4 p-4">
        <p className="text-sm text-slate-500">Loading distribution…</p>
      </Panel>
    );
  }

  const top = data.rows.filter((r) => r.client_count > 0).slice(0, 12);

  return (
    <Panel className="mb-4 overflow-hidden p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Pipeline distribution</h3>
          <p className="text-xs text-slate-500">
            {data.totalClients.toLocaleString()} clients across {data.rows.length} active statuses
            {data.unassigned > 0 ? ` · ${data.unassigned} unmatched label` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.rows.slice(0, 4).map((r) => (
            <Link
              key={r.id}
              to={`/admin/crm/users?status=${encodeURIComponent(r.name)}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-800"
            >
              <ColorSwatch hex={r.color_hex} size={10} />
              {r.name}
              <span className="font-bold text-slate-900">{r.client_count}</span>
            </Link>
          ))}
        </div>
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-slate-500">No clients assigned to active statuses yet.</p>
      ) : (
        <div className="space-y-2">
          {top.map((r) => {
            const pct = Math.round((r.client_count / max) * 100);
            return (
              <Link
                key={r.id}
                to={`/admin/crm/users?status=${encodeURIComponent(r.name)}`}
                className="group block rounded-lg px-1 py-0.5 hover:bg-slate-50"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 font-medium text-slate-700 group-hover:text-teal-800">
                    <ColorSwatch hex={r.color_hex} size={12} />
                    {r.name}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">{r.client_count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: r.color_hex }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function ShowDrawer({
  row,
  onClose,
  onEdit,
}: {
  row: ClientStatusRow;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-violet-700 to-indigo-600 px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-100">Client status</p>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ColorSwatch hex={row.color_hex} size={16} />
              {row.name}
            </h3>
            <p className="mt-0.5 font-mono text-xs text-violet-100/90">
              #{row.id} · {row.slug}
            </p>
          </div>
          <button type="button" className="rounded-lg p-1 text-violet-100 hover:bg-white/10" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {activeBadge(row.active)}
            {row.is_system ? (
              <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800">
                System default
              </span>
            ) : null}
          </div>

          <dl className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clients on this label</dt>
              <dd className="mt-1.5 flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <Link
                  to={`/admin/crm/users?status=${encodeURIComponent(row.name)}`}
                  className="text-lg font-bold text-teal-700 hover:underline"
                >
                  {(row.client_count ?? 0).toLocaleString()} clients
                </Link>
              </dd>
              <dd className="mt-1 text-[11px] text-slate-400">Opens All Clients filtered to this status</dd>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-slate-500">Sort order</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{row.sort_order}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Colour</dt>
                <dd className="mt-0.5 flex items-center gap-2 font-mono text-xs text-slate-700">
                  <ColorSwatch hex={row.color_hex} />
                  {row.color_hex}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Date created</dt>
                <dd className="mt-0.5 text-slate-700">{fmtUtc(row.created_at)} UTC</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">Last updated</dt>
                <dd className="mt-0.5 text-slate-700">{fmtUtc(row.updated_at)} UTC</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" className={`${btnSecondary} flex-1`} onClick={onClose}>
            Close
          </button>
          <button type="button" className={`${btnPrimary} flex-1`} onClick={onEdit}>
            <Pencil size={14} className="mr-1 inline" />
            Edit
          </button>
        </div>
      </aside>
    </>
  );
}

function StatusFormModal({
  title,
  initial,
  saving,
  onClose,
  onSave,
}: {
  title: string;
  initial: ClientStatusInput;
  saving: boolean;
  onClose: () => void;
  onSave: (data: ClientStatusInput) => void;
}) {
  const [form, setForm] = useState<ClientStatusInput>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button type="button" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Name</span>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Call Back"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Colour</span>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"
                  value={form.colorHex ?? "#64748b"}
                  onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
                />
                <input
                  className={`${inputCls} font-mono text-sm`}
                  value={form.colorHex ?? "#64748b"}
                  onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
                  placeholder="#64748b"
                />
                <ColorSwatch hex={form.colorHex ?? "#64748b"} size={28} />
              </div>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Sort order</span>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active !== false}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="rounded border-slate-300 text-teal-600"
              />
              <span className="font-medium text-slate-700">Active (visible in client pickers)</span>
            </label>
          </div>

          <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
            <button type="button" className={`${btnSecondary} flex-1`} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className={`${btnPrimary} flex-1`}
              disabled={saving || !form.name.trim()}
              onClick={() => onSave(form)}
            >
              {saving ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ClientStatusesPage() {
  const [rows, setRows] = useState<ClientStatusRow[]>([]);
  const [analytics, setAnalytics] = useState<ClientStatusAnalyticsResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState("sort_order");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<ClientStatusRow | null>(null);
  const [editRow, setEditRow] = useState<ClientStatusRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageClientTotal = rows.reduce((s, r) => s + (r.client_count ?? 0), 0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, stats] = await Promise.all([
        client.adminClientStatuses({
          search: appliedSearch || undefined,
          page,
          limit,
          sortBy,
          sortDir,
        }),
        client.adminClientStatusAnalytics(),
      ]);
      setRows(list.rows);
      setTotal(list.total);
      setAnalytics(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, limit, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveEdit(id: number, data: ClientStatusInput) {
    setSaving(true);
    try {
      const { status } = await client.adminUpdateClientStatus(id, data);
      setRows((prev) => prev.map((r) => (r.id === status.id ? status : r)));
      setEditRow(null);
      if (viewRow?.id === id) setViewRow(status);
      const stats = await client.adminClientStatusAnalytics();
      setAnalytics(stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function createStatus(data: ClientStatusInput) {
    setSaving(true);
    setError(null);
    try {
      await client.adminCreateClientStatus(data);
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
        title={`Statuses (${total})`}
        subtitle="Client pipeline labels — colours and counts sync to All Clients and bulk status tools."
        actions={
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-1 inline" />
              Add status
            </button>
          </div>
        }
      />

      <ErrorBanner message={error} />

      <AnalyticsPanel data={analytics} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Total statuses" value={total} />
        <StatChip label="Clients (book)" value={analytics?.totalClients ?? "—"} />
        <StatChip label="On this page" value={pageClientTotal} />
        <StatChip label="Page" value={`${page} / ${totalPages}`} />
      </div>

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search name or slug…"
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
            className={inputCls}
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

      <Panel className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {[
                ["id", "Id"],
                ["name", "Name"],
                ["color_hex", "Color"],
                ["client_count", "Clients"],
                ["created_at", "Date Created"],
                ["updated_at", "Last Updated"],
              ].map(([col, label]) => (
                <th key={col} className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-slate-800"
                    onClick={() => toggleSort(col)}
                  >
                    {label}
                    {sortBy === col ? <ArrowDownUp size={12} className={sortDir === "desc" ? "rotate-180" : ""} /> : null}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">Show</th>
              <th className="px-4 py-3 font-semibold">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  <Loader2 size={20} className="mx-auto animate-spin" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                  No statuses match your search.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ColorSwatch hex={row.color_hex} />
                      <span className="font-medium text-slate-900">{row.name}</span>
                      {!row.active ? (
                        <span className="text-[10px] uppercase text-slate-400">hidden</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{row.color_hex}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/crm/users?status=${encodeURIComponent(row.name)}`}
                      className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-sm font-semibold text-teal-800 ring-1 ring-teal-100 hover:bg-teal-100"
                    >
                      <Users size={12} />
                      {(row.client_count ?? 0).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{fmtUtc(row.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{fmtUtc(row.updated_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
                      title="Show"
                      onClick={() => setViewRow(row)}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
                      title="Edit"
                      onClick={() => setEditRow(row)}
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            {total === 0 ? "0 entries" : `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}`}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              className={btnSecondary}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Panel>

      <PageBottomGuide blocks={guideBlocks} />

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
        <StatusFormModal
          title={`Edit — ${editRow.name}`}
          initial={{
            name: editRow.name,
            colorHex: editRow.color_hex,
            sortOrder: editRow.sort_order,
            active: !!editRow.active,
          }}
          saving={saving}
          onClose={() => setEditRow(null)}
          onSave={(data) => void saveEdit(editRow.id, data)}
        />
      ) : null}

      {createOpen ? (
        <StatusFormModal
          title="Add client status"
          initial={{ name: "", colorHex: "#64748b", sortOrder: total + 1, active: true }}
          saving={saving}
          onClose={() => setCreateOpen(false)}
          onSave={(data) => void createStatus(data)}
        />
      ) : null}
    </div>
  );
}

export default ClientStatusesPage;
