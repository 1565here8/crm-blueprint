import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Loader2,
  Send,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { client, type DeskAuditReport, type DeskMarketBrief } from "../../../api/client";
import { AiWallstreetConnect } from "../../../components/admin/AiWallstreetConnect";
import { WALLSTREET_AI_NAME, WALLSTREET_AI_NAME_UPPER } from "../../../lib/curioniLabs";

type Reply = { text: string; ok: boolean; degraded?: string };

const TERM_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

function TerminalBox({
  title,
  busy,
  reply,
  empty,
  height = 360,
}: {
  title: string;
  busy: boolean;
  reply: Reply | null;
  empty: string;
  height?: number;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-emerald-500/20 bg-black">
      <div className="flex items-center justify-between border-b border-emerald-500/20 bg-black/60 px-3 py-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400">{title}</span>
        {busy ? <Loader2 size={13} className="animate-spin text-emerald-400" /> : null}
      </div>
      <pre
        className="flex-1 overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-[12px] leading-[1.45] text-emerald-300"
        style={{ fontFamily: TERM_FONT, minHeight: height }}
      >
        {reply?.text ?? (busy ? "Generating…" : empty)}
      </pre>
      {reply?.degraded ? (
        <div className="flex items-center gap-1.5 border-t border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-[11px] text-amber-300">
          <AlertTriangle size={12} /> {reply.degraded}
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({
  available,
  model,
  installed,
}: {
  available: boolean;
  model: string;
  installed: string[];
}) {
  const ok = available && installed.some((m) => m.startsWith(model.split(":")[0]));
  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-[11px]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-400"}`}
      />
      <span className="font-bold text-emerald-300">{model}</span>
      <span className="text-emerald-500/70">·</span>
      <span className={ok ? "text-emerald-400" : "text-rose-300"}>
        {ok ? "online" : available ? "model not pulled" : "engine offline"}
      </span>
    </div>
  );
}

function StatNumber({
  icon: Icon,
  label,
  value,
  emphasis,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: string | number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-black/60 px-3 py-2">
      <Icon size={14} className="text-emerald-400" />
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-wider text-emerald-500/70">{label}</p>
        <p
          className={`tabular-nums ${emphasis ? "text-amber-300" : "text-emerald-200"} text-sm font-bold`}
          style={{ fontFamily: TERM_FONT }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function DeskPage() {
  const [status, setStatus] = useState<{
    available: boolean;
    model: string;
    installedModels: string[];
    error?: string;
  } | null>(null);

  const [audit, setAudit] = useState<DeskAuditReport | null>(null);
  const [marketBrief, setMarketBrief] = useState<DeskMarketBrief | null>(null);

  const [operatorBrief, setOperatorBrief] = useState<Reply | null>(null);
  const [agentBrief, setAgentBrief] = useState<Reply | null>(null);

  const [busyOp, setBusyOp] = useState(false);
  const [busyAgent, setBusyAgent] = useState(false);

  const [askText, setAskText] = useState("");
  const [askReply, setAskReply] = useState<Reply | null>(null);
  const [busyAsk, setBusyAsk] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await client.deskStatus();
      setStatus(s);
    } catch {
      setStatus({ available: false, model: "unknown", installedModels: [], error: "boot failed" });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [s, a, b] = await Promise.all([
          client.deskStatus(),
          client.deskAudit(),
          client.deskMarketBrief(),
        ]);
        if (!mounted) return;
        setStatus(s);
        setAudit(a.report);
        setMarketBrief(b.brief);
      } catch {
        if (mounted) setStatus({ available: false, model: "unknown", installedModels: [], error: "boot failed" });
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function runOperatorBrief() {
    setBusyOp(true);
    setOperatorBrief(null);
    try {
      const r = await client.deskOperatorBrief();
      setOperatorBrief({ text: r.reply, ok: r.ok, degraded: r.degraded });
    } catch {
      setOperatorBrief({ text: "Engine error.", ok: false, degraded: "request failed" });
    } finally {
      setBusyOp(false);
    }
  }

  async function runAgentBrief() {
    setBusyAgent(true);
    setAgentBrief(null);
    try {
      const r = await client.deskAgentBrief();
      setAgentBrief({ text: r.reply, ok: r.ok, degraded: r.degraded });
      if (r.snapshot) setMarketBrief(r.snapshot);
    } catch {
      setAgentBrief({ text: "Engine error.", ok: false, degraded: "request failed" });
    } finally {
      setBusyAgent(false);
    }
  }

  async function runAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!askText.trim() || busyAsk) return;
    setBusyAsk(true);
    setAskReply(null);
    try {
      const r = await client.deskAsk({ message: askText.trim(), includeAudit: false, includeMarket: false });
      setAskReply({ text: r.reply, ok: r.ok, degraded: r.degraded });
    } catch {
      setAskReply({ text: "Engine error.", ok: false, degraded: "request failed" });
    } finally {
      setBusyAsk(false);
    }
  }

  const totals = audit?.totals;
  const movers = useMemo(() => {
    if (!marketBrief) return [];
    return [
      ...marketBrief.fx,
      ...marketBrief.stocks,
      ...marketBrief.crypto,
      ...marketBrief.commodities,
      ...marketBrief.indices,
    ]
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 6);
  }, [marketBrief]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-black via-slate-950 to-black p-4 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
              <BrainCircuit size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">{WALLSTREET_AI_NAME}</p>
              <h1 className="font-bold text-white" style={{ fontFamily: TERM_FONT, fontSize: 22 }}>
                {WALLSTREET_AI_NAME_UPPER}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              available={Boolean(status?.available)}
              model={status?.model ?? "qwen2.5:3b"}
              installed={status?.installedModels ?? []}
            />
            {typeof window !== "undefined" && window.location.hostname.includes("curionilabs") ? (
              <AiWallstreetConnect compact onConnected={() => void refreshStatus()} />
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-black/60 px-2.5 py-1 text-[10px] text-emerald-300">
              <ShieldCheck size={11} /> sovereign · offline · no training
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          <StatNumber icon={Users} label="Users" value={totals?.users ?? "—"} />
          <StatNumber icon={Activity} label="Online" value={totals?.online ?? "—"} />
          <StatNumber icon={TrendingUp} label="Depositors" value={totals?.depositors ?? "—"} />
          <StatNumber icon={AlertTriangle} label="Flagged" value={totals?.flaggedLeads ?? "—"} emphasis />
          <StatNumber icon={Users} label="Silent agents" value={totals?.silentAgents ?? "—"} />
          <StatNumber icon={Zap} label="Top mover" value={movers[0] ? `${movers[0].displaySymbol} ${(movers[0].changePct >= 0 ? "+" : "") + movers[0].changePct.toFixed(2)}%` : "—"} />
        </div>
      </div>

      {status && !status.available ? (
        <AiWallstreetConnect onConnected={() => void refreshStatus()} />
      ) : typeof window !== "undefined" && window.location.hostname.includes("curionilabs") ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-200/90">
          Mac AI tunnel: run <strong className="text-emerald-100">mac-ollama-connect.py</strong> on your Mac and keep Terminal open.
          Reconnect anytime with the button above.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500">Operator Pipeline Brief</h2>
            <button
              type="button"
              onClick={runOperatorBrief}
              disabled={busyOp}
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {busyOp ? "Generating…" : "Generate"}
            </button>
          </div>
          <TerminalBox
            title="OPERATOR BRIEF"
            busy={busyOp}
            reply={operatorBrief}
            empty="Press GENERATE to summon the morning pipeline brief.\nCold audit. Numbers first. No commentary."
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500">Agent Sales Brief — 09:25</h2>
            <button
              type="button"
              onClick={runAgentBrief}
              disabled={busyAgent}
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {busyAgent ? "Generating…" : "Generate"}
            </button>
          </div>
          <TerminalBox
            title="AGENT FLOOR BRIEF"
            busy={busyAgent}
            reply={agentBrief}
            empty="Press GENERATE to print talking points for the floor.\nGrouped by FX / STOCKS / CRYPTO / COMMODITIES / INDICES."
          />
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-black p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500">Ask The Desk</h2>
          <span className="text-[10px] text-emerald-500/70">stateless · audit+market context auto-attached</span>
        </div>
        <form onSubmit={runAsk} className="flex gap-2">
          <input
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            placeholder="e.g. who are the top 5 dead investors and which agent owns each"
            className="flex-1 rounded-md border border-emerald-500/30 bg-black px-3 py-2 text-[13px] text-emerald-200 placeholder:text-emerald-700 outline-none focus:border-emerald-400"
            style={{ fontFamily: TERM_FONT }}
            disabled={busyAsk}
          />
          <button
            type="submit"
            disabled={!askText.trim() || busyAsk}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-[12px] font-bold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {busyAsk ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Ask
          </button>
        </form>
        <div className="mt-2">
          <TerminalBox title="REPLY" busy={busyAsk} reply={askReply} empty="—" height={180} />
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-black p-3">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-500">Top of Book — Live Cache</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ fontFamily: TERM_FONT }}>
            <thead className="border-b border-emerald-500/20 text-[10px] uppercase tracking-wider text-emerald-500/70">
              <tr>
                <th className="px-2 py-1 text-left">Symbol</th>
                <th className="px-2 py-1 text-left">Name</th>
                <th className="px-2 py-1 text-right">Mid</th>
                <th className="px-2 py-1 text-right">Δ %</th>
                <th className="px-2 py-1 text-left">News</th>
              </tr>
            </thead>
            <tbody className="text-emerald-200">
              {movers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-emerald-700">no data</td>
                </tr>
              ) : (
                movers.map((m) => {
                  const up = m.changePct >= 0;
                  return (
                    <tr key={`${m.category}-${m.displaySymbol}`} className="border-b border-emerald-500/10 last:border-0">
                      <td className="px-2 py-1.5 font-bold">{m.displaySymbol}</td>
                      <td className="px-2 py-1.5 text-emerald-400/80">{m.name}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{m.mid}</td>
                      <td className={`px-2 py-1.5 text-right tabular-nums font-bold ${up ? "text-emerald-400" : "text-rose-400"}`}>
                        {up ? "+" : ""}
                        {m.changePct.toFixed(2)}%
                      </td>
                      <td className="px-2 py-1.5 text-emerald-400/70 truncate max-w-[420px]">{m.headline ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        {WALLSTREET_AI_NAME_UPPER} runs entirely on this server. The local engine performs no training, no telemetry and no retention.
        Every reply carries the system disclaimer. The operator alone is responsible for any decision taken on its output.
      </p>
    </div>
  );
}
