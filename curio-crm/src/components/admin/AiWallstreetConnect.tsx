import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { client } from "../../api/client";

type Props = {
  onConnected?: () => void;
  compact?: boolean;
};

type Setup = {
  mode: "hosted" | "local";
  headline: string;
  steps: string[];
};

const DEFAULT_SETUP: Setup = {
  mode: "local",
  headline: "One-time office setup — IT does this once, not every admin.",
  steps: [
    "IT installs Ollama on the office server once — leave it running 24/7.",
    "After setup, admins open the desk with zero download.",
  ],
};

export function AiWallstreetConnect({ onConnected, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [setup, setSetup] = useState<Setup>(DEFAULT_SETUP);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await client.deskStatus();
      if (s.setup) setSetup(s.setup);
      setLive(s.available);
      if (s.available) onConnected?.();
      return s;
    } catch {
      return null;
    }
  }, [onConnected]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (setup.mode !== "hosted" || live) return;
    setBusy(true);
    void client
      .deskConnect({ tunnel: false })
      .then((r) => setMsg(r.message))
      .finally(() => {
        setBusy(false);
        void refresh();
      });
  }, [setup.mode, live, refresh]);

  const connect = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await client.deskConnect({ tunnel: false });
      setMsg(r.message);
      await refresh();
    } catch {
      setMsg("Office AI offline — ask IT to keep Ollama running on the server.");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  if (live) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          <CheckCircle2 size={12} /> AI ready
        </span>
      );
    }
    return (
      <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-[12px] text-emerald-200">
        <CheckCircle2 size={14} className="mr-1 inline text-emerald-400" />
        Street AI is on — use the desk normally. No download needed.
      </div>
    );
  }

  if (setup.mode === "hosted") {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-[12px] text-emerald-200">
        {busy ? (
          <>
            <Loader2 size={14} className="mr-1 inline animate-spin" /> Starting AI server…
          </>
        ) : (
          <>AI server waking up — usually ready in seconds, not minutes.</>
        )}
        {msg ? <p className="mt-1 text-[11px] text-emerald-300/90">{msg}</p> : null}
      </div>
    );
  }

  const btn = (
    <button
      type="button"
      onClick={() => void connect()}
      disabled={busy}
      className={
        compact
          ? "inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-50"
          : "mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/25 px-5 py-2.5 text-[13px] font-bold uppercase tracking-wider text-emerald-50 hover:bg-emerald-500/35 disabled:opacity-50"
      }
    >
      {busy ? <Loader2 size={compact ? 12 : 18} className="animate-spin" /> : <Sparkles size={compact ? 12 : 18} />}
      {busy ? "Connecting…" : "Connect office AI"}
    </button>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {btn}
        {msg ? <span className="text-[10px] text-emerald-300/90">{msg}</span> : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
      <p className="text-[13px] font-semibold text-amber-100">Office AI — one-time setup</p>
      <p className="mt-1 text-[12px] text-amber-200/80">{setup.headline}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] text-amber-100/90">
        {setup.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {btn}
      {msg ? <p className="mt-2 text-[11px] text-emerald-300">{msg}</p> : null}
    </div>
  );
}
