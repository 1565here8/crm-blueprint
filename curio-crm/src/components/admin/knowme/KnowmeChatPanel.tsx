import { Brain, Loader2, Search, Send, Zap } from "lucide-react";
import React, { useRef, useEffect } from "react";

import { hasWikiMarkup } from "../../../../shared/crmWiki";
import type { KnowmeMode } from "../../../../shared/knowmeExperience";
import { curioni, curioniKnowme } from "../../../lib/curioniDesign";
import { adminUi } from "../CrmShell";
import { WikiRichMessage } from "./WikiRichMessage";

export type KnowmeChatMsg = { role: "user" | "assistant"; text: string };

type Props = {
  mode: KnowmeMode;
  messages: KnowmeChatMsg[];
  starters: string[];
  input: string;
  busy: boolean;
  canLiveAi: boolean;
  onInputChange: (v: string) => void;
  onSend: (text: string) => void;
};

export function KnowmeChatPanel({
  mode,
  messages,
  starters,
  input,
  busy,
  canLiveAi,
  onInputChange,
  onSend,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!busy) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, busy]);

  const isAgent = mode === "agent";
  const headerGradient = isAgent ? curioniKnowme.chatHeaderAgent : curioniKnowme.chatHeader;

  return (
    <div className={`flex min-h-[480px] flex-col overflow-hidden ${curioni.panel} shadow-xl`}>
      <div className={`flex items-center gap-3 border-b border-white/10 bg-gradient-to-r ${headerGradient} px-4 py-3.5`}>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isAgent ? "bg-emerald-500/20 text-emerald-300" : "bg-curioni-accent/25 text-indigo-100"
          }`}
        >
          <Brain size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Ask KNOWME</p>
          <p className="text-[11px] text-white/55">
            {isAgent
              ? "Preemptive Q&A · verified answers only"
              : canLiveAi
                ? "Wiki instant · live AI when engine online"
                : "Wiki instant · encyclopedia mode"}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            isAgent
              ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30"
              : curioniKnowme.fastPathBadge
          }`}
        >
          <Zap size={10} />
          {isAgent ? "<100ms" : "Fast-path"}
        </span>
      </div>

      <div ref={scrollRef} className="knowme-chat-scroll flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-curioni-elevated to-curioni-surface p-4 max-h-[min(52vh,520px)]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? isAgent
                    ? curioniKnowme.userBubbleAgent
                    : curioniKnowme.userBubble
                  : "border border-curioni-line bg-curioni-surface text-curioni-ink shadow-sm"
              }`}
            >
              {msg.role === "assistant" && hasWikiMarkup(msg.text) ? (
                <WikiRichMessage text={msg.text} onTermClick={(_id, label) => onSend(`explain ${label}`)} />
              ) : (
                <span className="whitespace-pre-wrap">{msg.text}</span>
              )}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex items-center gap-2 text-sm text-curioni-muted">
            <Loader2 size={14} className="animate-spin" />
            {canLiveAi && !isAgent ? "Thinking…" : "Finding verified answer…"}
          </div>
        ) : null}
      </div>

      <div className="border-t border-curioni-line bg-curioni-surface p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSend(s)}
              disabled={busy}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:opacity-50 ${
                isAgent
                  ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100"
                  : "border-curioni-line bg-curioni-elevated text-curioni-muted hover:border-curioni-accent/40 hover:bg-indigo-50/80 hover:text-curioni-accent"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSend(input);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-curioni-muted" />
            <input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={
                isAgent
                  ? "Ask how to run a CRM task — instant verified answer…"
                  : "Ask about any CRM page, workflow, or module…"
              }
              className={`${adminUi.input} pl-9`}
              disabled={busy}
              aria-label="Ask KNOWME"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            title="Send"
            aria-label="Send message"
            className={`${adminUi.btnPrimary} ${isAgent ? "!bg-emerald-700 hover:!bg-emerald-600" : ""}`}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
