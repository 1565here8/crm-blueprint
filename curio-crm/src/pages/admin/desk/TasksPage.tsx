import React, { useEffect, useState } from "react";
import { client, type DeskTask } from "../../../api/client";

function fmtAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function priorityClass(p: number) {
  if (p <= 1) return "bg-rose-600 text-white";
  if (p <= 2) return "bg-amber-500 text-black";
  return "bg-slate-700 text-slate-200";
}

export default function TasksPage() {
  const [status, setStatus] = useState<"open" | "completed" | "dismissed">("open");
  const [tasks, setTasks] = useState<DeskTask[]>([]);
  const [stats, setStats] = useState({ open: 0, completed: 0, dismissed: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setErr(null);
    try {
      const r = await client.deskTaskList(status);
      setTasks(r.tasks);
      setStats(r.stats);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [status]);

  async function createNew() {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await client.deskTaskCreate({ title: newTitle.trim(), body: newBody.trim() || undefined });
      setNewTitle("");
      setNewBody("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setGenerateMessage(null);
    setBusy(true);
    try {
      const r = await client.deskTaskGenerate();
      setGenerateMessage(r.warning ?? `${r.created} created · ${r.skipped} already existed`);
      await refresh();
    } catch (e) {
      setGenerateMessage(e instanceof Error ? e.message : "Generator failed");
    } finally {
      setBusy(false);
    }
  }

  async function complete(id: string) {
    setBusy(true);
    try {
      await client.deskTaskComplete(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function dismiss(id: string) {
    setBusy(true);
    try {
      await client.deskTaskDismiss(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function reopen(id: string) {
    setBusy(true);
    try {
      await client.deskTaskReopen(id);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Tasks &amp; Reminders</h1>
          <p className="text-sm text-slate-400">Operator action queue. Includes AI-generated tasks from audits and PSP health.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void generate()}
            disabled={busy}
            className="rounded-md border border-emerald-600 bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-50"
          >
            AI generate tasks
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        {(["open", "completed", "dismissed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-wider ${
              status === s ? "bg-teal-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {s} · {stats[s]}
          </button>
        ))}
      </div>

      {err && <div className="mb-3 rounded-md bg-rose-900/40 px-3 py-2 text-xs text-rose-200">{err}</div>}
      {generateMessage && (
        <div className="mb-3 rounded-md bg-emerald-900/40 px-3 py-2 text-xs text-emerald-200">{generateMessage}</div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 sm:grid-cols-[1fr_2fr_auto]">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task title"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
        />
        <input
          type="text"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Optional notes"
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
        />
        <button
          type="button"
          onClick={() => void createNew()}
          disabled={busy || !newTitle.trim()}
          className="rounded-md bg-teal-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2">Pri</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  Empty queue.
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-slate-800/60">
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${priorityClass(t.priority)}`}>P{t.priority}</span>
                </td>
                <td className="px-3 py-2 text-slate-400">{t.kind}</td>
                <td className="px-3 py-2 text-slate-100">
                  <div className="font-medium">{t.title}</div>
                  {t.body && <div className="text-[11px] text-slate-400">{t.body}</div>}
                </td>
                <td className="px-3 py-2 text-slate-500">{fmtAgo(t.created_at)} ago</td>
                <td className="px-3 py-2 text-right">
                  {t.status === "open" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void complete(t.id)}
                        disabled={busy}
                        className="mr-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] text-white disabled:opacity-50"
                      >
                        Done
                      </button>
                      <button
                        type="button"
                        onClick={() => void dismiss(t.id)}
                        disabled={busy}
                        className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void reopen(t.id)}
                      disabled={busy}
                      className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
