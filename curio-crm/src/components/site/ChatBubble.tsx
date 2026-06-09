import React, { useEffect, useMemo, useRef, useState } from "react";
import { publicConciergeTagline } from "../../../shared/demoCopy";
import { isPublicDemoSkin } from "../../lib/publicBrand";
import { client } from "../../api/client";
import { getPublicBrand } from "../../lib/publicBrand";

type Turn = { role: "user" | "assistant"; content: string };

function generateSessionId(): string {
  const KEY = `${getPublicBrand().domain}.concierge.sid`;
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sid_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `sid_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

const QUICK_PROMPTS = [
  "Hi Aria",
  "How do I open an account?",
  "How do I deposit?",
  "Speak to someone",
];

export function ChatBubble() {
  const brand = getPublicBrand();
  const welcome = useMemo<Turn>(
    () => ({
      role: "assistant",
      content: `Hi — I'm Aria, your concierge at ${brand.name}. ${publicConciergeTagline(isPublicDemoSkin())} Ask how to launch your desk, or leave your name and email for a callback.`,
    }),
    [brand.name],
  );
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>(() => [welcome]);
  const [busy, setBusy] = useState(false);
  const [degraded, setDegraded] = useState<string | null>(null);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [contactDraft, setContactDraft] = useState({ name: "", email: "", phone: "" });
  const [showContact, setShowContact] = useState(false);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const sessionId = useMemo(generateSessionId, []);

  useEffect(() => {
    if (!open) return;
    void fetch("/api/concierge/warm", { credentials: "include" }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [turns, open]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    setBusy(true);
    setDegraded(null);
    try {
      const result = await client.conciergeChat({
        sessionId,
        message: text,
        history: turns.slice(-12),
        page: window.location.pathname,
      });
      setTurns((prev) => [...prev, { role: "assistant", content: result.reply }]);
      if (result.degraded) setDegraded(result.degraded);
    } catch (err) {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry — I cannot reach our desk right now. Please leave your name, email and phone using the form below and we'll be in touch.",
        },
      ]);
      setDegraded(err instanceof Error ? err.message : "network");
      setShowContact(true);
    } finally {
      setBusy(false);
    }
  }

  async function submitLead() {
    if (busy) return;
    if (!contactDraft.email) {
      setLeadMessage("Please leave your email so we can reach you.");
      return;
    }
    setBusy(true);
    try {
      const result = await client.conciergeLead({
        sessionId,
        name: contactDraft.name || undefined,
        email: contactDraft.email || undefined,
        phone: contactDraft.phone || undefined,
        conversation: turns.slice(-20),
        page: window.location.pathname,
        source: "concierge_widget",
      });
      setLeadMessage(result.message);
      if (result.ok) {
        setLeadCaptured(true);
        setShowContact(false);
      }
    } catch (err) {
      setLeadMessage("Could not save details. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end">
      {open && (
        <div className="pointer-events-auto mb-3 flex w-[22rem] max-w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold leading-tight">Aria · {brand.name} Concierge</p>
              <p className="text-[10px] uppercase tracking-wider text-teal-100/90">
                Instant replies · ask anything
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/10 px-2 py-1 text-sm font-bold hover:bg-white/20"
            >
              ×
            </button>
          </header>

          <div ref={scrollerRef} className="max-h-[26rem] flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${
                    t.role === "user"
                      ? "rounded-br-sm bg-teal-600 text-white"
                      : "rounded-bl-sm bg-white text-slate-700"
                  }`}
                >
                  {t.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[12px] text-slate-500 shadow-sm animate-pulse">
                  Aria is typing…
                </div>
              </div>
            )}
            {degraded && !busy && (
              <div className="rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
                Aria is a little slow right now — you can still leave your details below and we&apos;ll call you back.
              </div>
            )}
          </div>

          {showContact && !leadCaptured && (
            <div className="border-t border-slate-200 bg-white px-3 py-3 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Launching a desk? Name and email — that&apos;s all we need
              </p>
              <input
                type="text"
                placeholder="Your name"
                value={contactDraft.name}
                onChange={(e) => setContactDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={contactDraft.email}
                onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400"
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={contactDraft.phone}
                onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400"
              />
              {leadMessage && <p className="text-[11px] text-slate-500">{leadMessage}</p>}
              <button
                type="button"
                onClick={submitLead}
                disabled={busy}
                className="w-full rounded-md bg-teal-600 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Saving…" : "Request a call back"}
              </button>
            </div>
          )}

          {leadCaptured && (
            <div className="border-t border-slate-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
              ✓ Thank you — a specialist will reach out within one business day.
            </div>
          )}

          <div className="border-t border-slate-200 bg-white px-2 py-2">
            <div className="mb-2 flex flex-wrap gap-1">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(q)}
                  className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[10px] font-medium text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                disabled={busy}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded-md bg-teal-600 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                Send
              </button>
            </form>
            {!showContact && !leadCaptured && (
              <button
                type="button"
                onClick={() => setShowContact(true)}
                className="mt-1 w-full text-[11px] text-teal-600 underline-offset-2 hover:underline"
              >
                Leave your contact details
              </button>
            )}
            <p className="mt-1 text-[10px] leading-tight text-slate-400">
              Information only. Not financial advice. Capital at risk.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Close concierge" : "Open concierge"}
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg ring-1 ring-black/10 transition hover:scale-105 hover:bg-teal-500"
      >
        {open ? (
          <span className="text-xl font-bold">×</span>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
