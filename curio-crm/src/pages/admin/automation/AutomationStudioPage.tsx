import { Loader2, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client, type DripCampaign, type DripHistoryItem } from "../../../api/client";
import { SequenceCanvas } from "../../../components/admin/curioni/SequenceCanvas";
import { AdminPageHeader, DataTable, ErrorBanner, Panel, TableHead, adminUi } from "../../../components/admin/CrmShell";
import { DRIP_TRIGGER_META, curioni } from "../../../lib/curioniDesign";
import { useAuth } from "../../../context/AuthContext";
import { isPrimaryAdmin } from "../../../components/admin/adminNavConfig";

const TRIGGERS = Object.keys(DRIP_TRIGGER_META) as DripCampaign["trigger_type"][];

export function AutomationStudioPage() {
  const { user } = useAuth();
  const isOwner = isPrimaryAdmin(user);
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([]);
  const [queue, setQueue] = useState<DripHistoryItem[]>([]);
  const [selected, setSelected] = useState<DripCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editor, setEditor] = useState<Partial<DripCampaign> | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, q] = await Promise.all([
        client.adminDripCampaigns(),
        client.adminDripQueue("queued"),
      ]);
      setCampaigns(c.campaigns);
      setQueue(q.items);
      setSelected((prev) => prev ?? c.campaigns[0] ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runNow(id: string) {
    setBusy(id);
    try {
      await client.adminDripRunCampaign(id);
      const q = await client.adminDripQueue("queued");
      setQueue(q.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(null);
    }
  }

  async function approve(id: string) {
    setBusy(`q-${id}`);
    try {
      await client.adminDripApprove(id);
      const q = await client.adminDripQueue("queued");
      setQueue(q.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveCampaign() {
    if (!editor?.name?.trim() || !editor.prompt_template?.trim()) return;
    setBusy("save");
    try {
      const { campaign } = await client.adminDripUpsertCampaign({
        id: editor.id,
        name: editor.name.trim(),
        trigger_type: editor.trigger_type ?? "dormant",
        trigger_config: editor.trigger_config ?? null,
        cadence_hours: editor.cadence_hours ?? "24,48,72",
        prompt_template: editor.prompt_template.trim(),
        auto_send: Boolean(editor.auto_send),
        enabled: editor.enabled !== false,
      });
      await load();
      setSelected(campaign);
      setEditor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this sequence?")) return;
    await client.adminDripDeleteCampaign(id);
    if (selected?.id === id) setSelected(null);
    await load();
  }

  return (
    <div>
      <AdminPageHeader
        title="Automation Studio"
        subtitle="AI-powered sequences — triggers, branches, and approval queue. Local engine drafts; you stay in control."
        actions={
          isOwner ? (
            <button
              type="button"
              className={adminUi.btnPrimary}
              onClick={() =>
                setEditor({
                  name: "New sequence",
                  trigger_type: "dormant",
                  cadence_hours: "24,48,168",
                  prompt_template: "Write a short, compliant re-engagement email for this client. Reference their last activity.",
                  auto_send: false,
                  enabled: true,
                })
              }
            >
              <Plus size={16} className="mr-1 inline" /> New sequence
            </button>
          ) : null
        }
      />
      <ErrorBanner message={error} />

      <div className="mb-4 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${curioni.chipOk}`}>
          {campaigns.filter((c) => c.enabled).length} live
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${curioni.chipWarn}`}>
          {queue.length} awaiting approval
        </span>
        <Link to="/admin/system/dynamic-status" className="text-xs font-semibold text-violet-600 hover:underline">
          Pipeline rules →
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="xl:col-span-3 p-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sequences</p>
          </div>
          <ul className="max-h-[420px] divide-y divide-slate-50 overflow-y-auto">
            {campaigns.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className={`w-full px-4 py-3 text-left transition ${
                    selected?.id === c.id ? "bg-violet-50" : "hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {DRIP_TRIGGER_META[c.trigger_type]?.label ?? c.trigger_type}
                    {c.enabled ? " · Live" : " · Paused"}
                  </p>
                </button>
              </li>
            ))}
            {campaigns.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-slate-400">No campaigns — owner can seed defaults on server start.</li>
            ) : null}
          </ul>
        </Panel>

        <div className="xl:col-span-5">
          {selected ? (
            <>
              <SequenceCanvas campaign={selected} runLabel={`Run #${queue.length + 1}`} activeStep={2} />
              {isOwner ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === selected.id}
                    onClick={() => void runNow(selected.id)}
                    className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {busy === selected.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    Run now (25 clients)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditor({ ...selected })}
                    className={adminUi.btnSecondary + " text-xs py-2"}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(selected.id)}
                    className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <Panel className="flex min-h-[280px] items-center justify-center p-8 text-sm text-slate-400">
              Select a sequence
            </Panel>
          )}
        </div>

        <Panel className="xl:col-span-4 overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-cyan-50 px-4 py-3">
            <Sparkles size={16} className="text-violet-600" />
            <p className="text-sm font-semibold text-slate-800">AI approval queue</p>
          </div>
          <ul className="max-h-[380px] divide-y divide-slate-50 overflow-y-auto">
            {queue.map((item) => (
              <li key={item.id} className="px-4 py-3 text-xs">
                <p className="font-semibold text-slate-800">{item.subject}</p>
                <p className="mt-1 line-clamp-2 text-slate-500">{item.body}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy === `q-${item.id}`}
                    onClick={() => void approve(item.id)}
                    className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Approve & send
                  </button>
                  <Link
                    to={`/admin/crm/users/${item.user_id}`}
                    className="rounded border border-slate-200 px-2 py-1 font-semibold text-violet-600 hover:bg-violet-50"
                  >
                    Client 360°
                  </Link>
                </div>
              </li>
            ))}
            {queue.length === 0 ? (
              <li className="px-4 py-10 text-center text-slate-400">Queue empty — drafts appear when sequences run.</li>
            ) : null}
          </ul>
        </Panel>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Panel className="max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
            <h3 className="text-lg font-semibold text-slate-900">{editor.id ? "Edit sequence" : "New sequence"}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-500">
                Name
                <input
                  className={`mt-1 ${adminUi.input}`}
                  value={editor.name ?? ""}
                  onChange={(e) => setEditor((x) => ({ ...x, name: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-500">
                Trigger
                <select
                  className={`mt-1 ${adminUi.input}`}
                  value={editor.trigger_type ?? "dormant"}
                  onChange={(e) =>
                    setEditor((x) => ({ ...x, trigger_type: e.target.value as DripCampaign["trigger_type"] }))
                  }
                >
                  {TRIGGERS.map((t) => (
                    <option key={t} value={t}>
                      {DRIP_TRIGGER_META[t]?.label ?? t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-500">
                Cadence (hours, comma-separated)
                <input
                  className={`mt-1 ${adminUi.input}`}
                  value={editor.cadence_hours ?? ""}
                  onChange={(e) => setEditor((x) => ({ ...x, cadence_hours: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-slate-500">
                AI prompt template
                <textarea
                  className={`mt-1 min-h-[100px] ${adminUi.input}`}
                  value={editor.prompt_template ?? ""}
                  onChange={(e) => setEditor((x) => ({ ...x, prompt_template: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editor.auto_send)}
                  onChange={(e) => setEditor((x) => ({ ...x, auto_send: e.target.checked }))}
                />
                Auto-send (skip approval queue)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editor.enabled !== false}
                  onChange={(e) => setEditor((x) => ({ ...x, enabled: e.target.checked }))}
                />
                Enabled
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => void saveCampaign()} disabled={busy === "save"} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">
                {busy === "save" ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditor(null)} className={adminUi.btnSecondary}>
                Cancel
              </button>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
