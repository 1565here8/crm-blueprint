import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { client, type OAuthClientRow } from "../../../api/client";
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function disabledBadge(disabled: number) {
  return disabled ? (
    <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 ring-1 ring-rose-200/60">
      Disabled
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
      Active
    </span>
  );
}

function PublicIdCell({ value }: { value: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const masked = `${value.slice(0, 8)}${"•".repeat(12)}${value.slice(-6)}`;

  return (
    <div className="flex max-w-[280px] items-center gap-1.5">
      <code className="truncate font-mono text-[11px] text-slate-600" title={revealed ? value : undefined}>
        {revealed ? value : masked}
      </code>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label={revealed ? "Hide public id" : "Reveal public id"}
        onClick={() => setRevealed((v) => !v)}
      >
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button
        type="button"
        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-teal-600"
        aria-label="Copy public id"
        onClick={() => void copy()}
      >
        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Affiliate / API partners",
    what: "Each row is an external system (affiliate network, landing page, or custom importer) allowed to post leads via API.",
    how: "Create a client when onboarding — share Public Id + secret with their developer once.",
    when: "New partner contract signed.",
  },
  {
    title: "Campaign ids (Camp. Ids)",
    what: "Comma-separated campaign numbers from Marketing → Campaigns — limits which funnels accept their traffic.",
    how: "Edit the row and list ids like 12,44. Wrong ids = leads rejected or mis-attributed.",
    when: "Partner says leads are missing.",
  },
  {
    title: "Disable vs delete",
    what: "Red badge blocks API access instantly; green means active. Rows stay for audit history.",
    how: "Edit → toggle Disabled, or use Show for quick review before flipping.",
    when: "Fraud spike from one source or integration broken.",
  },
];

export function OAuthClientsPage() {
  const [rows, setRows] = useState<OAuthClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewRow, setViewRow] = useState<OAuthClientRow | null>(null);
  const [editRow, setEditRow] = useState<OAuthClientRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ publicId: string; secret: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminOAuthClients({
        search: appliedSearch || undefined,
        page,
        limit,
        sortBy,
        sortDir,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load OAuth clients.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, limit, sortBy, sortDir]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const activeCount = rows.filter((r) => !r.disabled).length;

  async function saveEdit(id: number, patch: { name: string; campaignIds: string; disabled: boolean }) {
    setSaving(true);
    try {
      const { client: updated } = await client.adminUpdateOAuthClient(id, patch);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditRow(null);
      if (viewRow?.id === id) setViewRow(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function createClient(name: string, campaignIds: string, disabled: boolean) {
    setSaving(true);
    setError(null);
    try {
      const data = await client.adminCreateOAuthClient({ name, campaignIds, disabled });
      setCreatedCreds({ publicId: data.client.public_id, secret: data.clientSecret });
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

  return (
    <div>
      <PageHeader
        title="OAuth Clients"
        subtitle="Affiliate and API partner credentials — Public Id + campaign access"
        actions={
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button type="button" className={btnPrimary} onClick={() => setCreateOpen(true)}>
              <Plus size={14} className="mr-1 inline" />
              Create client
            </button>
          </div>
        }
      />

      <ErrorBanner message={error} />

      {createdCreds ? (
        <Panel className="mb-4 border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-900">
          <p className="font-semibold">New client created — copy credentials now (secret shown once):</p>
          <dl className="mt-2 space-y-1 font-mono text-xs">
            <div>
              <span className="text-emerald-700">Public Id: </span>
              {createdCreds.publicId}
            </div>
            <div>
              <span className="text-emerald-700">Secret: </span>
              {createdCreds.secret}
            </div>
          </dl>
          <button type="button" className={`${btnSecondary} mt-3`} onClick={() => setCreatedCreds(null)}>
            Dismiss
          </button>
        </Panel>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatChip label="Total clients" value={total} />
        <StatChip label="On this page" value={rows.length} />
        <StatChip label="Active (page)" value={activeCount} />
        <StatChip label="Page" value={`${page} / ${totalPages}`} />
      </div>

      <Panel className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search name, public id, campaign ids…"
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
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("id")}>
                  Id <ArrowDownUp size={10} className="inline opacity-50" />
                </th>
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("name")}>
                  Name
                </th>
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("public_id")}>
                  Public Id
                </th>
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("campaign_ids")}>
                  Camp. Ids
                </th>
                <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("created_at")}>
                  Date Created
                </th>
                <th className="cursor-pointer px-3 py-3 text-center" onClick={() => toggleSort("disabled")}>
                  Status
                </th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" size={24} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No OAuth clients match your search. Create one for a new affiliate partner.
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
                    <td className="px-3 py-2.5">
                      <PublicIdCell value={row.public_id} />
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 font-mono text-xs text-slate-600" title={row.campaign_ids}>
                      {row.campaign_ids || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{fmtDate(row.created_at)}</td>
                    <td className="px-3 py-2.5 text-center">{disabledBadge(row.disabled)}</td>
                    <td className="px-3 py-2.5 text-right">
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
          <Panel className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{viewRow.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">OAuth client #{viewRow.id}</p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setViewRow(null)}>
                <X size={18} />
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Public Id</dt>
                <dd className="mt-1">
                  <PublicIdCell value={viewRow.public_id} />
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Campaign ids</dt>
                <dd className="font-mono text-slate-800">{viewRow.campaign_ids || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Status</dt>
                <dd>{disabledBadge(viewRow.disabled)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Has secret</dt>
                <dd>{viewRow.secret_hash ? "Yes (stored hashed)" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-xs">{fmtDate(viewRow.created_at)} UTC</dd>
              </div>
            </dl>
            <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50/50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Partner tutorial (plain English)</p>
              <ol className="mt-2 list-inside list-decimal space-y-1.5 text-slate-600">
                <li>Send the partner their Public Id and secret from create time — you cannot read the secret again.</li>
                <li>They authenticate API calls with those credentials (see System → API Docs).</li>
                <li>Camp. ids must match campaigns you created under Marketing → Campaigns.</li>
                <li>If leads stop flowing, check Status is Active (green) and ids are correct.</li>
              </ol>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={btnSecondary} onClick={() => setViewRow(null)}>
                Close
              </button>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  setEditRow(viewRow);
                  setViewRow(null);
                }}
              >
                Edit client
              </button>
            </div>
          </Panel>
        </div>
      ) : null}

      {editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <Panel className="w-full max-w-md p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit {editRow.name}</h3>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setEditRow(null)}>
                <X size={18} />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void saveEdit(editRow.id, {
                  name: String(fd.get("name") ?? ""),
                  campaignIds: String(fd.get("campaignIds") ?? ""),
                  disabled: fd.get("disabled") === "on",
                });
              }}
            >
              <label className="block text-xs font-medium text-slate-500">
                Name
                <input name="name" className={`${inputCls} mt-1`} defaultValue={editRow.name} required />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Campaign ids
                <input
                  name="campaignIds"
                  className={`${inputCls} mt-1 font-mono`}
                  defaultValue={editRow.campaign_ids}
                  placeholder="12,44,101"
                />
                <span className="mt-1 block text-[11px] text-slate-400">Comma-separated campaign numbers</span>
              </label>
              <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
                <input type="checkbox" name="disabled" defaultChecked={!!editRow.disabled} />
                Disabled (blocks API access)
              </label>
              <p className="text-xs text-slate-400">
                Public Id: <span className="font-mono">{editRow.public_id.slice(0, 16)}…</span> (cannot change)
              </p>
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

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <Panel className="w-full max-w-md p-6">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create OAuth client</h3>
              <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setCreateOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                void createClient(
                  String(fd.get("name") ?? ""),
                  String(fd.get("campaignIds") ?? ""),
                  fd.get("disabled") === "on",
                );
              }}
            >
              <label className="block text-xs font-medium text-slate-500">
                Partner name
                <input name="name" className={`${inputCls} mt-1`} placeholder="e.g. Test Aff" required />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Campaign ids
                <input name="campaignIds" className={`${inputCls} mt-1 font-mono`} placeholder="12,44" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="disabled" />
                Start disabled
              </label>
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                A Public Id and secret will be generated. Copy both immediately — the secret is shown once.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={btnSecondary} onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      <PageBottomGuide
        intro="OAuth Clients are API keys for affiliates and lead importers — not Google/Microsoft login. Each partner gets a Public Id, a secret, and a list of campaign ids they may post into."
        blocks={guideBlocks}
      />
    </div>
  );
}
