import { Headphones, Plus, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client, type DeskTask } from "../../../api/client";
import { CurioniStatCard } from "../../../components/admin/curioni/CurioniStatCard";
import { ErrorBanner } from "../../../components/admin/CrmShell";
import { CrmHero, CrmPageLayout } from "../../../components/admin/crm/CrmPageLayout";
import { curioni } from "../../../lib/curioniDesign";

const CATEGORIES = [
  { key: "all", label: "All tickets" },
  { key: "kyc", label: "KYC" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Payouts" },
  { key: "trading", label: "Trading" },
  { key: "general", label: "General" },
] as const;

function inferCategory(task: DeskTask): (typeof CATEGORIES)[number]["key"] {
  const t = `${task.title} ${task.body ?? ""}`.toLowerCase();
  if (t.includes("kyc") || t.includes("doc") || t.includes("verify")) return "kyc";
  if (t.includes("deposit") || t.includes("psp") || t.includes("card") || t.includes("wire in")) return "deposit";
  if (t.includes("withdraw") || t.includes("payout") || t.includes("wire out")) return "withdrawal";
  if (t.includes("trade") || t.includes("position") || t.includes("mt4") || t.includes("mt5")) return "trading";
  return "general";
}

function fmtAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function priorityLabel(p: number) {
  if (p <= 1) return { text: "Urgent", cls: "bg-rose-500/12 text-rose-800 ring-rose-500/25" };
  if (p <= 2) return { text: "High", cls: "bg-amber-500/12 text-amber-900 ring-amber-500/25" };
  return { text: "Normal", cls: "bg-slate-200/80 text-slate-600 ring-slate-300/80" };
}

export function SupportDeskPage() {
  const [status, setStatus] = useState<"open" | "completed" | "dismissed">("open");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["key"]>("all");
  const [tasks, setTasks] = useState<DeskTask[]>([]);
  const [stats, setStats] = useState({ open: 0, completed: 0, dismissed: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const r = await client.deskTaskList(status);
      setTasks(r.tasks);
      setStats(r.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [status]);

  const filtered = tasks.filter((t) => category === "all" || inferCategory(t) === category);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      await client.deskTaskCreate({ title: title.trim(), body: body.trim() || undefined, priority: 2 });
      setTitle("");
      setBody("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
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

  return (
    <CrmPageLayout wide>
      <CrmHero
        eyebrow="Support · LXCRM parity"
        title="Support Desk"
        subtitle="Smart ticketing layer on desk tasks — full client context, priority queue, KYC and payout categories."
        actions={
          <Link
            to="/admin/broker-os"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200"
          >
            Broker OS map
          </Link>
        }
      />
      <ErrorBanner message={error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CurioniStatCard label="Open tickets" value={String(stats.open)} icon={Headphones} tone="rose" />
        <CurioniStatCard label="Resolved" value={String(stats.completed)} tone="emerald" />
        <CurioniStatCard label="Dismissed" value={String(stats.dismissed)} tone="slate" />
        <CurioniStatCard label="Queue view" value={status} to="/admin/desk/tasks" tone="violet" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <form onSubmit={createTicket} className={`lg:col-span-1 rounded-2xl border border-slate-200 bg-white p-5 ${curioni.panelGlow}`}>
          <p className="text-sm font-semibold text-slate-900">New ticket</p>
          <p className="mt-1 text-xs text-slate-500">Creates a desk task with support metadata.</p>
          <label className="mt-4 block text-xs font-medium text-slate-600">
            Subject
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="KYC docs pending — client #4821"
              required
            />
          </label>
          <label className="mt-3 block text-xs font-medium text-slate-600">
            Notes
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Client uploaded passport — verify address match."
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Plus size={16} />
            Open ticket
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {(["open", "completed", "dismissed"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  status === s ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-violet-600"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  category === c.key ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No tickets in this view. Run Automation Studio or generate desk tasks from Mission Control.
              </p>
            ) : (
              filtered.map((task) => {
                const pri = priorityLabel(task.priority);
                const cat = inferCategory(task);
                return (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm transition hover:border-violet-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ${pri.cls}`}>
                            {pri.text}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                            {cat}
                          </span>
                        </div>
                        {task.body ? <p className="mt-1 text-xs text-slate-500">{task.body}</p> : null}
                        <p className="mt-2 text-[10px] text-slate-400">
                          {fmtAgo(task.created_at)}
                          {task.assigned_to ? ` · Agent ${task.assigned_to}` : ""}
                        </p>
                      </div>
                      {status === "open" ? (
                        <button
                          type="button"
                          onClick={() => void complete(task.id)}
                          disabled={busy}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                          Resolve
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-xl border border-cyan-200/60 bg-cyan-50/50 px-4 py-3 text-xs text-cyan-900`}>
        <strong>LXCRM gap:</strong> Full ticket threading + VOIP pop on answer ships next. Today: desk tasks + client file + Comms Center.
        <Link to="/admin/crm/comms" className="ml-2 font-semibold underline">
          Open Comms Center
        </Link>
      </div>
    </CrmPageLayout>
  );
}
