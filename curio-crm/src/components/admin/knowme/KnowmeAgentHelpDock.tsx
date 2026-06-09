import { Brain, ChevronUp, ExternalLink, Loader2, Search, Sparkles, X, Zap } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { knowmeLocalAnswer } from "../../../../shared/knowmeLocal";
import {
  KNOWME_AGENT_STARTERS,
  KNOWME_AGENT_TOPIC_GROUPS,
  knowmeAgentNoMatchReply,
  knowmeWelcome,
} from "../../../../shared/knowmeExperience";
import { hasWikiMarkup } from "../../../../shared/crmWiki";
import { WikiRichMessage } from "./WikiRichMessage";

type DockMsg = { role: "user" | "assistant"; text: string };

/**
 * Floating agent help bar — preemptive Q&A only, no architecture, no live LLM.
 * Bottom-left so Wallstreet AI (management) stays bottom-right.
 */
export function KnowmeAgentHelpDock() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<DockMsg[]>([
    { role: "assistant", text: knowmeWelcome("agent") },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setInput("");
      const history = messages.map((m) => ({ role: m.role, content: m.text }));
      setMessages((m) => [...m, { role: "user", text: q }]);
      setBusy(true);
      try {
        const reply = knowmeLocalAnswer(q, history) ?? knowmeAgentNoMatchReply();
        setMessages((m) => [...m, { role: "assistant", text: reply }]);
      } finally {
        setBusy(false);
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
        );
      }
    },
    [busy, messages],
  );

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[45] flex flex-col items-start gap-2">
      {open ? (
        <div
          className="pointer-events-auto flex w-[min(100vw-2.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-emerald-300/40 bg-white shadow-2xl shadow-emerald-900/20 ring-1 ring-emerald-200/60"
          role="dialog"
          aria-label="KNOWME floor help"
        >
          <div className="flex items-center gap-2 border-b border-emerald-900/20 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/25 text-emerald-300">
              <Brain size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">KNOWME · Floor help</p>
              <p className="text-[10px] text-emerald-200/70">Verified answers · no live AI</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-200">
              <Zap size={9} className="mr-0.5 inline" />
              Instant
            </span>
            <button
              type="button"
              title="Close"
              aria-label="Close help"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[min(50vh,360px)] space-y-2 overflow-y-auto bg-gradient-to-b from-emerald-50/40 to-white p-3"
          >
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[92%] rounded-xl px-3 py-2 text-[13px] leading-snug ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" && hasWikiMarkup(msg.text) ? (
                    <WikiRichMessage
                      text={msg.text}
                      className="text-[13px]"
                      onTermClick={(_id, label) => void send(`explain ${label}`)}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                  )}
                </div>
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Looking up…
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-100 bg-white p-2.5">
            <div className="mb-2 flex max-h-16 flex-wrap gap-1 overflow-y-auto">
              {KNOWME_AGENT_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(s)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How do I…?"
                disabled={busy}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                aria-label="Ask floor help"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                title="Send"
                aria-label="Send"
                className="rounded-lg bg-emerald-600 px-2.5 py-2 text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <Search size={16} />
              </button>
            </form>
            <Link
              to="/admin/knowme"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-900"
            >
              <ExternalLink size={11} />
              Open full KNOWME · Visual Flows
            </Link>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={open ? "Close KNOWME help" : "KNOWME floor help"}
        aria-expanded={open ? "true" : "false"}
        className="pointer-events-auto group flex items-center gap-2 rounded-full border border-emerald-400/50 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          {open ? <ChevronUp size={18} /> : <Sparkles size={18} />}
        </span>
        <span className="hidden sm:inline">{open ? "Close help" : "KNOWME help"}</span>
        {!open ? (
          <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold md:inline">
            {KNOWME_AGENT_TOPIC_GROUPS.length} topics
          </span>
        ) : null}
      </button>
    </div>
  );
}
