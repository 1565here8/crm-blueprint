/**
 * AdminDeskBubble — the floating Wallstreet AI copilot bubble.
 *
 * Mounts on every admin page (every role: super-admin, admin, agent,
 * marketer, affiliate, compliance). Sits bottom-right above all content.
 * Collapsed it is a single circular trigger. Expanded it is a small chat
 * panel that supports:
 *
 *   • Plain text questions to the operator-side AI.
 *   • File upload of any nature (text/csv/json/pdf/image/audio/binary).
 *     Text-like files are read in the browser; PDFs and binaries are
 *     base64-encoded and parsed on the server (pdf-parse for PDFs).
 *   • Voice recording via MediaRecorder + best-effort live transcription
 *     through the browser's Web Speech API. The recording is attached
 *     as an audio file; the transcript is sent inline so the AI can
 *     critique the call even when whisper isn't installed server-side.
 *   • Mode toggle: ASSIST (general copilot) ↔ SALES CALL REVIEW
 *     (sales-call forensics + coaching scorecard).
 *
 * The bubble never persists chat history or attachments anywhere except
 * volatile memory — closing the panel wipes everything.
 */

import {
  BrainCircuit,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Paperclip,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { client } from "../../api/client";
import { AiWallstreetConnect } from "./AiWallstreetConnect";
import { useAuth } from "../../context/AuthContext";
import { WALLSTREET_AI_NAME, WALLSTREET_AI_NAME_UPPER } from "../../lib/curioniLabs";

type ChatRole = "user" | "assistant";
type ChatMode = "assist" | "sales_call";

type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  contentText?: string;
  contentBase64?: string;
  kind: "text" | "pdf" | "audio" | "image" | "binary";
};

type ChatTurn = {
  id: string;
  role: ChatRole;
  body: string;
  degraded?: string;
  pending?: boolean;
};

const TERM_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const DESK_QUICK_PROMPTS = [
  "Demo tour",
  "Morning routine",
  "How do I approve a deposit?",
  "Explain payment gateways",
];
const MAX_BYTES_PER_FILE = 12 * 1024 * 1024;
const MAX_ATTACHMENTS = 6;
const DISCLAIMER_MARKER = "——————————————";

function stripDisclaimer(text: string): string {
  const i = text.indexOf(DISCLAIMER_MARKER);
  return (i >= 0 ? text.slice(0, i) : text).trim();
}

function formatDeskReply(text: string): string {
  return stripDisclaimer(text)
    .replace(/\nEND\s*$/i, "")
    .trim();
}
const TEXT_MIME_HINTS = [
  "text/",
  "application/json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "application/javascript",
  "application/typescript",
  "application/csv",
];
const TEXT_EXT_HINTS = new Set([
  "txt", "csv", "tsv", "json", "md", "log", "html", "htm",
  "xml", "yaml", "yml", "ini", "conf", "cfg", "rtf", "js", "ts",
  "tsx", "jsx", "py", "rb", "go", "java", "kt", "rs", "sh", "bat",
  "sql", "csv",
]);

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function classify(file: File): Attachment["kind"] {
  const mime = (file.type ?? "").toLowerCase();
  const ext = extOf(file.name);
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "webm", "flac", "aac"].includes(ext))
    return "audio";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"].includes(ext))
    return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (TEXT_EXT_HINTS.has(ext) || TEXT_MIME_HINTS.some((h) => mime.startsWith(h))) return "text";
  return "binary";
}

function fmtSize(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function readAsText(file: File): Promise<string> {
  return await file.text();
}

async function readAsBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/* ------------------- Web Speech API (live transcription) ------------------- */
// Minimal duck-typed handles to avoid pulling in @types/dom-speech-recognition.
type SREventResult = {
  transcript: string;
  confidence: number;
};
type SREvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<SREventResult> & { isFinal: boolean }>;
};
type SRInstance = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};
function getSpeechRecognitionCtor():
  | (new () => SRInstance)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SRInstance;
    webkitSpeechRecognition?: new () => SRInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* --------------------------------- Bubble --------------------------------- */

export function AdminDeskBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>("assist");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legalText, setLegalText] = useState<string | null>(null);
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  // recording / transcription state
  const [recording, setRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunks = useRef<Blob[]>([]);
  const sttRef = useRef<SRInstance | null>(null);
  const finalTranscriptRef = useRef("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // Don't show the bubble for non-staff (e.g. impersonated clients) —
  // AdminLayout is itself staff-only, but be defensive.
  const canUseDesk =
    user?.role === "admin" ||
    user?.isStaff ||
    (user?.permissions ?? []).includes("desk.ask");
  const sttSupported = useMemo(() => getSpeechRecognitionCtor() != null, []);

  useEffect(() => {
    const warmed = sessionStorage.getItem("desk-warm");
    if (warmed) return;
    sessionStorage.setItem("desk-warm", "1");
    void fetch("/api/admin/desk/warm", { credentials: "include" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open || legalText) return;
    void fetch("/api/admin/desk/disclaimer", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { disclaimer?: string }) => setLegalText(d.disclaimer ?? null))
      .catch(() => null);
  }, [open, legalText]);

  useEffect(() => {
    if (!open || !canUseDesk) return;
    void client
      .deskStatus()
      .then((s) => setEngineOnline(s.available))
      .catch(() => setEngineOnline(false));
  }, [open, canUseDesk]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [open, turns, liveTranscript]);

  useEffect(() => {
    return () => {
      // best-effort teardown when component unmounts
      try { recorderRef.current?.stop(); } catch { /* ignore */ }
      try { sttRef.current?.abort(); } catch { /* ignore */ }
    };
  }, []);

  /* ------------------------------ files ------------------------------ */

  const onFilesPicked = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    const incoming = Array.from(fileList);
    const slots = MAX_ATTACHMENTS - attachments.length;
    if (slots <= 0) {
      setError(`Attachment cap is ${MAX_ATTACHMENTS}.`);
      return;
    }
    const next: Attachment[] = [];
    for (const f of incoming.slice(0, slots)) {
      if (f.size > MAX_BYTES_PER_FILE) {
        setError(`"${f.name}" is over ${fmtSize(MAX_BYTES_PER_FILE)}.`);
        continue;
      }
      const kind = classify(f);
      try {
        if (kind === "text") {
          const txt = await readAsText(f);
          next.push({
            id: crypto.randomUUID(),
            name: f.name, mime: f.type || "text/plain", size: f.size, kind,
            contentText: txt,
          });
        } else {
          const b64 = await readAsBase64(f);
          next.push({
            id: crypto.randomUUID(),
            name: f.name, mime: f.type || "application/octet-stream", size: f.size, kind,
            contentBase64: b64,
          });
        }
      } catch (err) {
        setError(`Could not read "${f.name}".`);
      }
    }
    if (next.length) setAttachments((cur) => [...cur, ...next]);
  }, [attachments.length]);

  const dropAttachment = useCallback((id: string) => {
    setAttachments((cur) => cur.filter((a) => a.id !== id));
  }, []);

  /* ----------------------------- recording ----------------------------- */

  const startRecording = useCallback(async () => {
    setError(null);
    setLiveTranscript("");
    finalTranscriptRef.current = "";
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone API unavailable in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderChunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recorderChunks.current.push(e.data);
      };
      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(recorderChunks.current, { type: "audio/webm" });
          if (blob.size > 0 && blob.size <= MAX_BYTES_PER_FILE) {
            const file = new File([blob], `call-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`, {
              type: "audio/webm",
            });
            const b64 = await readAsBase64(file);
            setAttachments((cur) => [
              ...cur.slice(0, MAX_ATTACHMENTS - 1),
              {
                id: crypto.randomUUID(),
                name: file.name,
                mime: file.type,
                size: file.size,
                kind: "audio",
                contentBase64: b64,
              },
            ]);
          }
        } catch {
          /* swallow — best effort */
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);

      // Best-effort live transcription via Web Speech API (Chromium/Edge).
      const Ctor = getSpeechRecognitionCtor();
      if (Ctor) {
        const sr = new Ctor();
        sr.lang = "en-US";
        sr.continuous = true;
        sr.interimResults = true;
        sr.onresult = (e) => {
          let interim = "";
          let finalAdd = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            const transcript = r[0]?.transcript ?? "";
            if (r.isFinal) finalAdd += transcript + " ";
            else interim += transcript;
          }
          if (finalAdd) finalTranscriptRef.current += finalAdd;
          setLiveTranscript((finalTranscriptRef.current + " " + interim).trim());
        };
        sr.onerror = () => { /* swallow */ };
        sr.onend = () => { sttRef.current = null; };
        try { sr.start(); sttRef.current = sr; } catch { /* swallow */ }
      }
    } catch (err) {
      setError("Microphone permission denied.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    recorderRef.current = null;
    try { sttRef.current?.stop(); } catch { /* ignore */ }
    setRecording(false);
  }, []);

  /* ------------------------------- send ------------------------------- */

  const send = useCallback(async (textOverride?: string) => {
    if (busy) return;
    const text = (textOverride ?? input).trim();
    if (!text && attachments.length === 0 && !liveTranscript.trim()) return;
    if (recording) stopRecording();

    setError(null);
    const userTurn: ChatTurn = {
      id: crypto.randomUUID(),
      role: "user",
      body: composeUserDisplay(text, attachments, liveTranscript),
    };
    const assistantPlaceholder: ChatTurn = {
      id: crypto.randomUUID(),
      role: "assistant",
      body: "",
      pending: true,
    };
    setTurns((cur) => [...cur, userTurn, assistantPlaceholder]);
    setInput("");

    const history = turns.slice(-4).map((t) => ({
      role: t.role,
      content: stripDisclaimer(t.body).slice(0, 400),
    }));

    const callTranscript = liveTranscript.trim() || undefined;
    const payload = {
      message: text || "(operator submitted attachments / call recording — please review)",
      mode,
      callTranscript,
      includeAudit: false,
      includeMarket:
        !/how do i|how to|approve|deposit|withdraw|lead|status|permission|demo|tour|walk|crm|admin/i.test(
          text,
        ) && /market|pitch|tip|crypto|stock|mover|tape|what.*(buy|sell|trade)/i.test(text),
      history,
      attachments: attachments.map((a) => ({
        name: a.name,
        mime: a.mime,
        size: a.size,
        contentText: a.contentText ?? null,
        contentBase64: a.contentBase64 ?? null,
      })),
    };

    setBusy(true);
    try {
      let streamed = "";
      const streamRes = await client.deskAssistStream(payload, {
        onToken: (token) => {
          streamed += token;
          setTurns((cur) =>
            cur.map((t) =>
              t.id === assistantPlaceholder.id ? { ...t, body: streamed, pending: true } : t,
            ),
          );
        },
      });
      const fullBody = streamed.trim()
        ? streamed.trimEnd()
        : "Local AI engine unreachable. Try again in a moment.";
      setTurns((cur) =>
        cur.map((t) =>
          t.id === assistantPlaceholder.id
            ? { ...t, body: fullBody, pending: false, degraded: streamRes.degraded }
            : t,
        ),
      );
      // clear the consumed attachments + live transcript after a successful send
      setAttachments([]);
      setLiveTranscript("");
      finalTranscriptRef.current = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Engine unreachable.";
      setTurns((cur) =>
        cur.map((t) =>
          t.id === assistantPlaceholder.id
            ? { ...t, body: msg, pending: false, degraded: "send failed" }
            : t,
        ),
      );
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [busy, input, attachments, liveTranscript, recording, mode, turns, stopRecording]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const wipe = useCallback(() => {
    setTurns([]);
    setAttachments([]);
    setLiveTranscript("");
    finalTranscriptRef.current = "";
    setInput("");
    setError(null);
  }, []);

  if (!canUseDesk) return null;

  /* ------------------------------- render ------------------------------- */

  return (
    <>
      {/* Floating trigger */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full border border-emerald-500/40 bg-black px-4 py-3 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.35)] transition hover:bg-emerald-950 hover:shadow-[0_0_45px_rgba(16,185,129,0.55)]"
          title={WALLSTREET_AI_NAME}
          style={{ fontFamily: TERM_FONT }}
        >
          <BrainCircuit size={18} className="text-emerald-400" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{WALLSTREET_AI_NAME_UPPER}</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)]" />
        </button>
      ) : null}

      {/* Panel */}
      {open ? (
        <div
          className="fixed bottom-5 right-5 z-[60] flex h-[640px] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-black text-emerald-200 shadow-[0_25px_60px_rgba(0,0,0,0.65)]"
          style={{ fontFamily: TERM_FONT }}
          role="dialog"
          aria-label={`${WALLSTREET_AI_NAME} assistant`}
        >
          {/* header */}
          <div className="flex items-center justify-between border-b border-emerald-500/25 bg-gradient-to-r from-black via-emerald-950/30 to-black px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30">
                <BrainCircuit size={14} className="text-emerald-300" />
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                  {WALLSTREET_AI_NAME_UPPER}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-emerald-500/70">
                  sovereign · offline · no training
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={wipe}
                className="rounded-md p-1.5 text-emerald-500/70 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                title="Clear chat"
              >
                <Sparkles size={14} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-emerald-500/70 transition hover:bg-rose-500/10 hover:text-rose-300"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* mode tabs */}
          <div className="flex gap-1 border-b border-emerald-500/15 bg-black px-2 py-1.5">
            <ModeTab
              active={mode === "assist"}
              icon={<MessageSquare size={11} />}
              label="Assist"
              onClick={() => setMode("assist")}
            />
            <ModeTab
              active={mode === "sales_call"}
              icon={<Mic size={11} />}
              label="Sales Call Review"
              onClick={() => setMode("sales_call")}
            />
          </div>

          {engineOnline === false || (typeof window !== "undefined" && window.location.hostname.includes("curionilabs")) ? (
            <div className="border-b border-amber-500/30 bg-amber-950/40 px-3 py-2 text-[10px] leading-snug text-amber-200">
              {engineOnline === false ? (
                <p>AI offline — run mac-ollama-connect.py on your Mac, then Connect:</p>
              ) : (
                <p>Mac live AI — reconnect if the desk stops responding:</p>
              )}
              <div className="mt-2">
                <AiWallstreetConnect
                  compact
                  onConnected={() => {
                    void client.deskStatus().then((s) => setEngineOnline(s.available));
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* log */}
          <div
            ref={logRef}
            className="flex-1 space-y-3 overflow-y-auto bg-black px-3 py-3 text-[12px] leading-snug"
          >
            {turns.length === 0 ? (
              <EmptyState mode={mode} sttSupported={sttSupported} />
            ) : (
              turns.map((t) => <Bubble key={t.id} turn={t} />)
            )}
            {liveTranscript ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
                  live transcript {recording ? "· recording" : "· captured"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-amber-100">{liveTranscript}</p>
              </div>
            ) : null}
          </div>

          {/* attachments tray */}
          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 border-t border-emerald-500/15 bg-black/80 px-3 py-2">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200"
                >
                  <Paperclip size={10} />
                  <span className="max-w-[140px] truncate">{a.name}</span>
                  <span className="text-emerald-500/60">{fmtSize(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => dropAttachment(a.id)}
                    className="rounded p-0.5 text-emerald-500/70 hover:bg-rose-500/20 hover:text-rose-300"
                    aria-label={`Remove ${a.name}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {/* error strip */}
          {error ? (
            <div className="border-t border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-[11px] text-rose-300">
              {error}
            </div>
          ) : null}

          {/* input */}
          <div className="border-t border-emerald-500/25 bg-black px-2 py-2">
            {turns.length === 0 && mode === "assist" ? (
              <div className="mb-2 flex flex-wrap gap-1">
                {DESK_QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={busy}
                    onClick={() => void send(q)}
                    className="rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5 text-[9px] text-emerald-300 transition hover:bg-emerald-500/15"
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex items-end gap-1.5">
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-1.5 text-emerald-400 transition hover:bg-emerald-500/15"
                  title="Attach file (any type)"
                  disabled={busy || attachments.length >= MAX_ATTACHMENTS}
                >
                  <Paperclip size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void onFilesPicked(e.target.files);
                    if (e.target) e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={
                    recording
                      ? "rounded-md border border-rose-500/50 bg-rose-500/15 p-1.5 text-rose-300 transition hover:bg-rose-500/25"
                      : "rounded-md border border-emerald-500/30 bg-emerald-500/5 p-1.5 text-emerald-400 transition hover:bg-emerald-500/15"
                  }
                  title={recording ? "Stop recording" : "Record voice / call audio"}
                  disabled={busy}
                >
                  {recording ? <Square size={14} /> : sttSupported ? <Mic size={14} /> : <MicOff size={14} />}
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={2}
                placeholder={
                  mode === "sales_call"
                    ? "Paste a call transcript, record live, or describe the call…"
                    : "Ask the desk. Drop files. Hit enter."
                }
                className="flex-1 resize-none rounded-md border border-emerald-500/30 bg-black px-2 py-1.5 text-[12px] text-emerald-200 placeholder:text-emerald-700 outline-none focus:border-emerald-400"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || (!input.trim() && attachments.length === 0 && !liveTranscript.trim())}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-40"
                title="Send"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[9px] text-emerald-700">
              local · no telemetry · attachments wiped on close · enter sends, shift+enter newline
            </p>
            {turns.length > 0 && legalText ? (
              <details className="mt-2 rounded border border-emerald-500/20 bg-emerald-950/30 px-2 py-1 text-[9px] text-emerald-600">
                <summary className="cursor-pointer select-none font-semibold text-emerald-500/80">
                  Legal &amp; sovereignty notice (once per session)
                </summary>
                <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed text-emerald-700/90">
                  {legalText}
                </p>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ----------------------------- presentational ----------------------------- */

function composeUserDisplay(text: string, attachments: Attachment[], transcript: string): string {
  const lines: string[] = [];
  if (text) lines.push(text);
  if (attachments.length) {
    lines.push("");
    lines.push("[attached]");
    for (const a of attachments) lines.push(`  • ${a.name} (${a.kind}, ${fmtSize(a.size)})`);
  }
  if (transcript) {
    lines.push("");
    lines.push("[transcript]");
    lines.push(transcript.length > 320 ? transcript.slice(0, 320) + "…" : transcript);
  }
  return lines.join("\n");
}

function ModeTab({
  active, icon, label, onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-500/40"
          : "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500/60 transition hover:bg-emerald-500/5 hover:text-emerald-300"
      }
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EmptyState({ mode, sttSupported }: { mode: ChatMode; sttSupported: boolean }) {
  return (
    <div className="space-y-2 text-[11px] text-emerald-500/70">
      {mode === "assist" ? (
        <>
          <p>Ask anything operational. Drop KYC PDFs, statements, CSVs, screenshots, contracts — the desk reads them.</p>
          <p className="text-emerald-500/40">
            • "score this passport for forgery cues" • "find duplicates in this lead csv" • "summarise this wire confirmation"
          </p>
        </>
      ) : (
        <>
          <p>Run a sales-call forensics review. Paste a transcript, upload an audio file, or hit the mic and read the call back.</p>
          <p className="text-emerald-500/40">
            {sttSupported
              ? "Live transcription is available in this browser."
              : "Live transcription not supported in this browser — paste the transcript or upload audio."}
          </p>
        </>
      )}
    </div>
  );
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const own = turn.role === "user";
  return (
    <div className={own ? "ml-6" : "mr-6"}>
      <p
        className={
          own
            ? "mb-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500/60"
            : "mb-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400/80"
        }
      >
        {own ? "operator" : "desk"}
      </p>
      <div
        className={
          own
            ? "rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1.5 text-[12px] text-emerald-100"
            : "rounded-md border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1.5 text-[12px] text-emerald-200"
        }
      >
        {turn.pending ? (
          <span className="inline-flex items-center gap-2 text-emerald-500/60">
            <Loader2 size={12} className="animate-spin" /> thinking…
          </span>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-[inherit]">{formatDeskReply(turn.body)}</pre>
        )}
        {turn.degraded ? (
          <p className="mt-1 text-[10px] text-amber-400/80">⚠ {turn.degraded}</p>
        ) : null}
      </div>
    </div>
  );
}
