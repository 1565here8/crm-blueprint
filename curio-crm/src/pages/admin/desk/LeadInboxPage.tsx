import React, { useEffect, useMemo, useState } from "react";
import { client, type ChatLead } from "../../../api/client";
import { AgentAssignSelect } from "../../../components/admin/crm/AgentAssignSelect";

function fmtAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LeadInboxPage() {
  const [status, setStatus] = useState<"new" | "assigned" | "dismissed" | "converted">("new");
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<ChatLead | null>(null);
  const [recommend, setRecommend] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assignTo, setAssignTo] = useState("");
  const [agentOptions, setAgentOptions] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void client
      .adminAgentRoster()
      .then((r) => setAgentOptions(r.agents.map((a) => a.name)))
      .catch(() => setAgentOptions([]));
  }, []);

  async function refresh() {
    setBusy(true);
    setErr(null);
    try {
      const r = await client.deskLeadList(status);
      setLeads(r.leads);
      setStats(r.stats);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [status]);

  async function doRecommend(id: string) {
    setRecommend(null);
    setBusy(true);
    try {
      const r = await client.deskLeadRecommend(id);
      setRecommend(r.reply);
    } catch (e) {
      setRecommend(e instanceof Error ? e.message : "Could not get recommendation");
    } finally {
      setBusy(false);
    }
  }

  async function doAssign(id: string) {
    if (!assignTo.trim()) return;
    setBusy(true);
    try {
      await client.deskLeadAssign(id, assignTo.trim());
      setAssignTo("");
      setSelected(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function doDismiss(id: string) {
    setBusy(true);
    try {
      await client.deskLeadDismiss(id);
      setSelected(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Dismiss failed");
    } finally {
      setBusy(false);
    }
  }

  const tabs = useMemo(
    () =>
      (["new", "assigned", "dismissed", "converted"] as const).map((k) => ({
        k,
        n: stats[k] ?? 0,
      })),
    [stats],
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Lead Inbox</h1>
          <p className="text-sm text-slate-400">
            Entrance signups (name + email), concierge chat, and walkthrough requests — assign from here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "…" : "Refresh"}
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        {tabs.map(({ k, n }) => (
          <button
            key={k}
            type="button"
            onClick={() => setStatus(k)}
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-wider ${
              status === k ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {k} · {n}
          </button>
        ))}
      </div>

      {err && <div className="mb-3 rounded-md bg-rose-900/40 px-3 py-2 text-xs text-rose-200">{err}</div>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">Captured</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2">Geo</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No leads in this state.
                  </td>
                </tr>
              )}
              {leads.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className={`cursor-pointer border-b border-slate-800/60 hover:bg-slate-800/60 ${
                    selected?.id === l.id ? "bg-slate-800/80" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-slate-300">{fmtAgo(l.created_at)}</td>
                  <td className="px-3 py-2 font-medium text-white">{l.name || "—"}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {l.email || ""}
                    {l.email && l.phone ? " · " : ""}
                    {l.phone || ""}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {[l.city, l.country_code].filter(Boolean).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a lead to see details and assign an agent.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{selected.name || "Unnamed lead"}</h2>
                <p className="text-xs text-slate-400">Captured {fmtAgo(selected.created_at)} · status {selected.status}</p>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="text-slate-200">{selected.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="text-slate-200">{selected.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">City</dt>
                  <dd className="text-slate-200">{selected.city || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Country</dt>
                  <dd className="text-slate-200">{selected.country_code || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Language</dt>
                  <dd className="text-slate-200">{selected.language || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Timezone</dt>
                  <dd className="text-slate-200">{selected.timezone || "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Page</dt>
                  <dd className="break-all text-slate-200">{selected.page || "—"}</dd>
                </div>
              </dl>

              {selected.message && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Visitor message</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-950/40 p-2 text-xs text-slate-200">{selected.message}</p>
                </div>
              )}

              {selected.conversation && (
                <details className="rounded-md bg-slate-950/40 p-2">
                  <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-slate-400">
                    Conversation transcript
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-slate-300">
                    {selected.conversation}
                  </pre>
                </details>
              )}

              <div className="flex flex-wrap items-end gap-2 border-t border-slate-800 pt-3">
                <label className="min-w-[12rem] flex-1 text-xs text-slate-400">
                  Owner agent
                  <div className="mt-1">
                    <AgentAssignSelect
                      agents={agentOptions}
                      value={assignTo}
                      onChange={setAssignTo}
                      disabled={busy}
                      allowEmpty={false}
                      placeholder="Pick agent…"
                      className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                  </div>
                </label>
                <button
                  type="button"
                  disabled={busy || !assignTo.trim()}
                  onClick={() => void doAssign(selected.id)}
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Assign to agent
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void doRecommend(selected.id)}
                  className="rounded-md border border-emerald-600 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-600/10 disabled:opacity-50"
                >
                  AI recommend
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void doDismiss(selected.id)}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-50"
                >
                  Dismiss
                </button>
              </div>

              {recommend && (
                <div className="rounded-md border border-emerald-700/50 bg-emerald-950/30 p-3 text-xs">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-emerald-400">AI recommendation</p>
                  <pre className="whitespace-pre-wrap text-emerald-100">{recommend}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
