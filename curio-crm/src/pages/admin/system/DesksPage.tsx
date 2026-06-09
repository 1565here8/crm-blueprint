import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  client,
  type CrmDeskDetail,
  type CrmDeskInput,
  type CrmDeskListRow,
  type CrmDeskStats,
} from "../../../api/client";
import {
  AdminPageHeader,
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  Panel,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

const REGION_FLAGS: Record<string, string> = {
  DE: "🇩🇪",
  IN: "🇮🇳",
  GB: "🇬🇧",
  US: "🇺🇸",
  LATAM: "🌎",
  MENA: "🇸🇦",
};

function regionFlag(code: string) {
  return REGION_FLAGS[code.toUpperCase()] ?? "🌐";
}

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

const guideBlocks: GuideBlock[] = [
  {
    title: "Regional floors",
    what: "Desks split your sales floor by language and territory — German Desk only sees DACH leads, LATAM handles Spanish/Portuguese traffic.",
    how: "Create a desk, set timezone + language, assign agents. Client counts include direct desk assignment and clients owned by desk agents.",
    when: "Opening a new language team or reorganizing after hiring bilingual reps.",
  },
  {
    title: "Groups vs Desks",
    what: "Groups (System → Groups) are role permission buckets — admin, rep, retention. Desks are geographic/language teams.",
    how: "Map agents to a desk here; map their role group under Permissions for sidebar access.",
    when: "A German rep needs CRM access (Groups) and DACH clients (Desks).",
  },
  {
    title: "Auto Assign",
    what: "Language and country rules in Auto Assign pair with desk languages — route DE traffic to German Desk agents.",
    how: "Open Auto Assign → add a Language rule matching the desk language code (de, es, ar).",
    when: "Partner sends geo-targeted traffic you want on the right floor automatically.",
  },
];

function DarkStatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Panel className="border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 p-4 text-white">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </Panel>
  );
}

function DeskModal({
  initial,
  staffOptions,
  onClose,
  onSaved,
}: {
  initial: CrmDeskDetail | null;
  staffOptions: Array<{ userId: string; name: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [regionCode, setRegionCode] = useState(initial?.region_code ?? "");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "UTC");
  const [language, setLanguage] = useState(initial?.language ?? "en");
  const [active, setActive] = useState(initial?.active !== 0);
  const [agentIds, setAgentIds] = useState<string[]>(initial?.agents.map((a) => a.userId) ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAgent(id: string) {
    setAgentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: CrmDeskInput = {
      name: name.trim(),
      regionCode: regionCode.trim(),
      timezone: timezone.trim(),
      language: language.trim(),
      active,
      agentIds,
    };
    try {
      if (initial) {
        await client.adminUpdateDesk(initial.id, body);
      } else {
        await client.adminCreateDesk(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save desk.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          onSubmit={(e) => void submit(e)}
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{initial ? `Edit ${initial.name}` : "New desk"}</h3>
            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <ErrorBanner message={error} />

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Name</span>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </label>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Region code</span>
                <input
                  className={inputCls}
                  placeholder="DE, GB, LATAM…"
                  value={regionCode}
                  onChange={(e) => setRegionCode(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Language</span>
                <input
                  className={inputCls}
                  placeholder="de, en, es…"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                />
              </label>
            </div>

            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Timezone</span>
              <input
                className={inputCls}
                placeholder="Europe/Berlin"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </label>

            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active — visible for assignment and auto-routing
            </label>

            <div className="mb-2">
              <span className="mb-2 block text-xs font-medium text-slate-500">Assign agents</span>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {staffOptions.length === 0 ? (
                  <p className="text-sm text-slate-400">No staff — create sub-admins under Access Keys first.</p>
                ) : (
                  staffOptions.map((s) => (
                    <label key={s.userId} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={agentIds.includes(s.userId)}
                        onChange={() => toggleAgent(s.userId)}
                      />
                      <span className="text-sm text-slate-800">{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : initial ? "Save" : "Create desk"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function ShowDrawer({
  row,
  onClose,
  onEdit,
}: {
  row: CrmDeskDetail;
  onClose: () => void;
  onEdit: () => void;
}) {
  const clientsUrl = `/admin/crm/users?deskId=${row.id}`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 to-teal-800 px-5 py-4 text-white">
          <div>
            <p className="text-2xl leading-none">{regionFlag(row.region_code)}</p>
            <h3 className="mt-1 text-lg font-semibold">{row.name}</h3>
            <p className="text-xs text-slate-300">
              {row.region_code} · {row.language} · {row.timezone}
            </p>
          </div>
          <button type="button" className="rounded p-1 text-slate-300 hover:bg-white/10" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Agents</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{row.agent_count}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-slate-400">Clients</p>
              <p className="text-xl font-bold tabular-nums text-slate-900">{row.client_count}</p>
            </div>
          </div>

          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Desk team</h4>
          {row.agents.length === 0 ? (
            <p className="mb-4 text-sm text-slate-500">No agents assigned yet.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {row.agents.map((a) => (
                <li
                  key={a.userId}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-800">{a.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      a.online ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {a.online ? "Online" : "Offline"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link to={clientsUrl} className={`${btnPrimary} inline-flex w-full justify-center`}>
            View {row.client_count} clients in All Clients
          </Link>

          <p className="mt-4 text-xs text-slate-500">
            Created {fmtUtc(row.created_at)} · Updated {fmtUtc(row.updated_at)}
          </p>
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-4">
          <button type="button" className={`${btnSecondary} flex-1`} onClick={onClose}>
            Close
          </button>
          <button type="button" className={`${btnPrimary} flex-1`} onClick={onEdit}>
            <Pencil size={14} className="mr-1.5 inline" />
            Edit
          </button>
        </div>
      </aside>
    </>
  );
}

export default function DesksPage() {
  const [rows, setRows] = useState<CrmDeskListRow[]>([]);
  const [stats, setStats] = useState<CrmDeskStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState<CrmDeskDetail | null>(null);
  const [showRow, setShowRow] = useState<CrmDeskDetail | null>(null);
  const [staffOptions, setStaffOptions] = useState<Array<{ userId: string; name: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, stat, staff] = await Promise.all([
        client.adminSystemDesks({
          search: appliedSearch || undefined,
          page,
          limit,
          sortBy,
          sortDir,
        }),
        client.adminDeskStats(),
        client.adminTeamStaffList(),
      ]);
      setRows(list.rows);
      setTotal(list.total);
      setStats(stat);
      setStaffOptions(staff.staff.filter((s) => s.isStaff).map((s) => ({ userId: s.userId, name: s.name })));
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

  async function openShow(id: number) {
    try {
      const { desk } = await client.adminDesk(id);
      setShowRow(desk);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load desk.");
    }
  }

  async function openEdit(id: number) {
    try {
      const { desk } = await client.adminDesk(id);
      setEditRow(desk);
      setModalOpen(true);
      setShowRow(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load desk.");
    }
  }

  async function handleDelete(row: CrmDeskListRow) {
    if (!window.confirm(`Delete "${row.name}"? Only empty desks can be removed.`)) return;
    try {
      await client.adminDeleteDesk(row.id);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const sortIcon = useMemo(
    () => (col: string) =>
      sortBy === col ? (
        <ArrowDownUp size={12} className={sortDir === "desc" ? "rotate-180" : ""} />
      ) : null,
    [sortBy, sortDir],
  );

  return (
    <div>
      <AdminPageHeader
        title="Desks"
        subtitle="Regional language floors — German, UK, LATAM, and more."
        actions={
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setEditRow(null);
              setModalOpen(true);
            }}
          >
            <Plus size={14} className="mr-1.5 inline" />
            New desk
          </button>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DarkStatCard label="Total desks" value={stats?.totalDesks ?? "—"} hint={`${stats?.activeDesks ?? 0} active`} />
        <DarkStatCard label="Agents online" value={stats?.agentsOnline ?? "—"} hint="Staff on desk floors now" />
        <DarkStatCard label="Clients assigned" value={stats?.clientsAssigned ?? "—"} hint="Across active desks" />
      </div>

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search name, region, language…"
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
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("id")}>
                  <span className="inline-flex items-center gap-1">Id {sortIcon("id")}</span>
                </th>
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center gap-1">Name {sortIcon("name")}</span>
                </th>
                <th className="px-4 py-3"># Agents</th>
                <th className="px-4 py-3"># Clients</th>
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("created_at")}>
                  <span className="inline-flex items-center gap-1">Date created {sortIcon("created_at")}</span>
                </th>
                <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("updated_at")}>
                  <span className="inline-flex items-center gap-1">Date updated {sortIcon("updated_at")}</span>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 size={20} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <Globe2 size={28} className="mx-auto mb-2 text-slate-300" />
                    No desks yet — create German, UK, or LATAM floors to split traffic.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 transition hover:bg-teal-50/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="font-semibold text-teal-700 hover:underline"
                        onClick={() => void openShow(row.id)}
                      >
                        <span className="mr-1.5">{regionFlag(row.region_code)}</span>
                        {row.name}
                      </button>
                      {!row.active ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          Inactive
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      <Users size={12} className="mr-1 inline text-slate-400" />
                      {row.agent_count}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{row.client_count}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtUtc(row.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtUtc(row.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="mr-2 text-teal-600 hover:underline" onClick={() => void openEdit(row.id)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-rose-600 hover:underline"
                        onClick={() => void handleDelete(row)}
                      >
                        <Trash2 size={12} className="inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <span>
            {total} desk{total === 1 ? "" : "s"} · page {page} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </Panel>

      <PageBottomGuide
        intro="Desks split your floor by language — German Desk only sees DACH leads."
        blocks={guideBlocks}
      />

      {modalOpen ? (
        <DeskModal
          initial={editRow}
          staffOptions={staffOptions}
          onClose={() => {
            setModalOpen(false);
            setEditRow(null);
          }}
          onSaved={() => void load()}
        />
      ) : null}

      {showRow ? (
        <ShowDrawer
          row={showRow}
          onClose={() => setShowRow(null)}
          onEdit={() => void openEdit(showRow.id)}
        />
      ) : null}
    </div>
  );
}
