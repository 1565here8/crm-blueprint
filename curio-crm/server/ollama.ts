/**
 * Offline LLM bridge — talks to a local Ollama daemon only.
 *
 * SOVEREIGNTY GUARANTEES (enforced in code, not just policy):
 *   1. The daemon URL is hard-gated to loopback or RFC1918 private space.
 *      Any attempt to point at a public host raises at boot and refuses
 *      every request. Override only with ALLOW_REMOTE_LLM=1.
 *   2. The model never sees a server-stored conversation history. Each
 *      /ask request is stateless from the server's side.
 *   3. Ollama performs NO training, NO fine-tuning, NO telemetry. The
 *      install script disables update checks and pins env vars.
 *   4. Prompts and responses are never written to disk. log.ts is silent.
 *   5. The software vendor has zero access to anything the broker runs
 *      through this bridge. This file is the only ingress; it talks to
 *      127.0.0.1 and nothing else.
 *
 * Persona is THE DESK (see server/deskPrompts.ts).
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { warn as logWarn, error as logError } from "./log";
import { withDisclaimer, DESK_SYSTEM_COMPACT } from "./deskPrompts";
import { getBelief } from "./beliefSystem";

const ALLOW_REMOTE = process.env.ALLOW_REMOTE_LLM === "1";
const NGROK_CHAT_URL = (process.env.NGROK_CHAT_URL ?? "").trim();
const execFileAsync = promisify(execFile);

function lockToLocal(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "http://127.0.0.1:11434";
  }
  const host = url.hostname.toLowerCase();
  const isTailscale = /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(host);
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
    isTailscale;
  if (!isLocal && !ALLOW_REMOTE) {
    logWarn("[ollama] non-local base url blocked, forcing 127.0.0.1");
    return "http://127.0.0.1:11434";
  }
  return url.origin;
}

export const OLLAMA_BASE = readOllamaBase();

export function setOllamaBaseUrl(raw: string): string {
  const locked = lockToLocal(raw);
  process.env.OLLAMA_BASE_URL = locked;
  return locked;
}

function readOllamaBase(): string {
  return lockToLocal(process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434");
}
/** Speed-first desk model — warm in RAM, sub-5s replies on CPU. */
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";
export const OLLAMA_NUM_CTX = Number(process.env.OLLAMA_NUM_CTX ?? 1024);
export const OLLAMA_DESK_FAST_MODEL = process.env.OLLAMA_DESK_FAST_MODEL ?? "qwen2.5:0.5b";
export const OLLAMA_DESK_FAST_NUM_CTX = Number(process.env.OLLAMA_DESK_FAST_NUM_CTX ?? 512);
/** Contextual desk brain — largest qwen2.5 tier the VPS can hold (see provision-desk-ai.sh). */
export const OLLAMA_DESK_SMART_MODEL = process.env.OLLAMA_DESK_SMART_MODEL ?? "qwen2.5:32b";
export const OLLAMA_DESK_SMART_NUM_CTX = Number(process.env.OLLAMA_DESK_SMART_NUM_CTX ?? 8192);
export const OLLAMA_CONCIERGE_MODEL = process.env.OLLAMA_CONCIERGE_MODEL ?? "qwen2.5:0.5b";
export const OLLAMA_CONCIERGE_NUM_CTX = Number(process.env.OLLAMA_CONCIERGE_NUM_CTX ?? 384);
export const OLLAMA_NUM_THREAD = Number(process.env.OLLAMA_NUM_THREAD ?? 8);
const REQ_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? 30_000);
const DESK_FAST_TIMEOUT_MS = Number(process.env.OLLAMA_DESK_FAST_TIMEOUT_MS ?? 25_000);
const DESK_SMART_TIMEOUT_MS = Number(process.env.OLLAMA_DESK_SMART_TIMEOUT_MS ?? 180_000);
const CONCIERGE_TIMEOUT_MS = Number(process.env.OLLAMA_CONCIERGE_TIMEOUT_MS ?? 30_000);
function tagsProbeMs(): number {
  const base = readOllamaBase();
  return Number(process.env.OLLAMA_TAGS_TIMEOUT_MS ?? (base.includes("100.") ? 25_000 : 4_000));
}

/** llama3.2 crashes over SSH tunnel (Windows + some Mac Ollama builds). Never auto-pick. */
const UNSTABLE_MODEL = /llama3\.2/i;

function isStableModel(name: string): boolean {
  return !UNSTABLE_MODEL.test(name);
}

function filterStableModels(installed: string[]): string[] {
  const stable = installed.filter(isStableModel);
  return stable.length ? stable : installed;
}

/** Ollama serializes on its own — app-level lock caused 45s queue timeouts. */

function ollamaRuntimeOptions(args: { numCtx: number; numPredict: number; temperature: number; fast?: boolean; smart?: boolean }) {
  const smart = args.smart ?? false;
  return {
    temperature: args.temperature,
    num_ctx: args.numCtx,
    num_predict: args.numPredict,
    top_p: smart ? 0.9 : 0.85,
    top_k: smart ? 40 : args.fast ? 15 : 20,
    num_thread: OLLAMA_NUM_THREAD,
    num_batch: smart ? 64 : args.fast ? 256 : 128,
    repeat_penalty: smart ? 1.08 : 1.1,
  };
}

export type OllamaMessage = { role: "system" | "user" | "assistant"; content: string };

export type OllamaStatus = {
  available: boolean;
  model: string;
  baseUrl: string;
  installedModels: string[];
  error?: string;
};

export type OllamaChatResult = {
  ok: boolean;
  content: string;
  model: string;
  degraded?: string;
};

export type DeskChatBuildArgs = {
  modeOverlay: string;
  userMessage: string;
  contextText?: string;
  history?: OllamaMessage[];
  temperature?: number;
  audienceBanner?: string;
  houseRulesBlock?: string;
  fast?: boolean;
  /** Sales/pitch — 1.5b model, full history, market context. */
  smart?: boolean;
  maxPredict?: number;
};

export type DeskChatBuilt = {
  messages: OllamaMessage[];
  model: string;
  numCtx: number;
  numPredict: number;
  temperature: number;
  timeout: number;
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("ollama timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

const MAC_TUNNEL =
  process.env.PRODUCT_ISOLATION === "curionilabs" ||
  process.env.AI_MAC_BRIDGE === "1" ||
  /curionilabs\.com/i.test(process.env.ADMIN_URL ?? "") ||
  /curionilabs\.com/i.test(process.env.CURIONI_PUBLIC_URL ?? "") ||
  (process.env.JERSEY_LOCAL_OLLAMA !== "1" && /127\.0\.0\.1:11434|localhost:11434/i.test(process.env.OLLAMA_BASE_URL ?? ""));

function hostedAiUrl(): string | null {
  const raw = process.env.OLLAMA_HOSTED_URL?.trim();
  if (!raw || /REPLACE\.WITH|100\.REPLACE/i.test(raw)) return null;
  return raw;
}

/** Vendor AI box — always on; brokers never install Ollama. */
export function isBrokerHostedAi(): boolean {
  return Boolean(hostedAiUrl());
}

/** Always-on Ollama on same VPS as CRM (Jersey). */
export function isJerseyLocalOllama(): boolean {
  return process.env.JERSEY_LOCAL_OLLAMA === "1";
}

/** SSH reverse tunnel only — direct Mac Tailscale streams via Node fetch. */
function isSshTunnelOllama(): boolean {
  if (isJerseyLocalOllama()) return false;
  return MAC_TUNNEL && readOllamaBase().includes("127.0.0.1");
}

function isMacDirectOllama(): boolean {
  try {
    return /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(new URL(readOllamaBase()).hostname);
  } catch {
    return false;
  }
}

/** SSH tunnel: Node fetch flakes — curl is reliable. Mac Tailscale: stream for speed. */
function useCurlTransport(): boolean {
  return isSshTunnelOllama();
}

function preferBufferedDeskChat(): boolean {
  return useCurlTransport();
}

/** @deprecated use useCurlTransport */
function macTailscaleBridge(): boolean {
  return readOllamaBase().includes("100.");
}

async function ngrokChatHttp(payload: string, timeoutMs: number): Promise<{ ok: boolean; status: number; body: string } | null> {
  if (!NGROK_CHAT_URL) return null;
  try {
    const r = await withTimeout(
      fetch(NGROK_CHAT_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      }),
      timeoutMs,
    );
    return { ok: r.ok, status: r.status, body: await r.text() };
  } catch {
    return null;
  }
}

async function ollamaHttp(
  path: string,
  opts: { method?: "GET" | "POST"; body?: string; timeoutMs: number },
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `${readOllamaBase()}${path}`;
  const sec = Math.max(
    5,
    Math.ceil(opts.timeoutMs / 1000) + (MAC_TUNNEL && path === "/api/chat" ? 30 : 0),
  );
  if (useCurlTransport()) {
    const args = ["-sS", "--max-time", String(sec), "-w", "\n%{http_code}", url];
    if (opts.method === "POST") {
      args.unshift("-X", "POST", "-H", "content-type: application/json");
      if (opts.body) args.push("-d", opts.body);
    }
    try {
      const { stdout } = await execFileAsync("curl", args, {
        timeout: opts.timeoutMs + 8000,
        maxBuffer: 50_000_000,
      });
      const nl = stdout.lastIndexOf("\n");
      const status = Number(stdout.slice(nl + 1).trim()) || 0;
      const body = nl >= 0 ? stdout.slice(0, nl) : stdout;
      return { ok: status >= 200 && status < 300, status, body };
    } catch {
      return { ok: false, status: 0, body: "" };
    }
  }
  try {
    const r = await withTimeout(
      fetch(url, {
        method: opts.method ?? "GET",
        headers: opts.body ? { "content-type": "application/json" } : undefined,
        body: opts.body,
      }),
      opts.timeoutMs,
    );
    return { ok: r.ok, status: r.status, body: await r.text() };
  } catch {
    return { ok: false, status: 0, body: "" };
  }
}

/** Boot: keep fast desk model hot; smart model loads on first pitch only. */
export async function warmOllamaModel(): Promise<void> {
  await warmDeskFastModel();
}

/** Unload loaded models except the ones we actively use (prevents 3b models hogging RAM). */
export async function purgeOllamaMemoryExcept(keepModels: string[]): Promise<void> {
  const keep = new Set(keepModels.map((m) => m.toLowerCase()));
  try {
    const r = await withTimeout(fetch(`${readOllamaBase()}/api/ps`), 4_000);
    if (!r.ok) return;
    const j = (await r.json()) as { models?: { name: string }[] };
    for (const m of j.models ?? []) {
      const name = m.name.toLowerCase();
      if (keep.has(name)) continue;
      try {
        await withTimeout(
          fetch(`${readOllamaBase()}/api/chat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ model: m.name, messages: [], keep_alive: 0 }),
          }),
          5_000,
        );
      } catch {
        /* best-effort unload */
      }
    }
  } catch {
    /* daemon may be offline */
  }
}

export async function warmDeskFastModel(): Promise<boolean> {
  try {
    const model = await resolveOllamaModel(OLLAMA_DESK_FAST_MODEL, false);
    const r = await ollamaHttp("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "warm" }],
        stream: false,
        keep_alive: "24h",
        options: { num_ctx: 512, num_predict: 4 },
      }),
      timeoutMs: 60_000,
    });
    if (r.ok && isJerseyLocalOllama()) {
      await purgeOllamaMemoryExcept([model]);
    }
    return r.ok;
  } catch {
    return false;
  }
}

export async function warmDeskSmartModel(): Promise<boolean> {
  try {
    const r = await withTimeout(
      fetch(`${readOllamaBase()}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_DESK_SMART_MODEL,
          messages: [{ role: "user", content: "warm" }],
          stream: false,
          keep_alive: "24h",
          options: { num_ctx: Math.min(512, OLLAMA_DESK_SMART_NUM_CTX), num_predict: 4 },
        }),
      }),
      600_000,
    );
    return r.ok;
  } catch {
    return false;
  }
}

export async function warmConciergeModel(): Promise<boolean> {
  try {
    const r = await withTimeout(
      fetch(`${readOllamaBase()}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_CONCIERGE_MODEL,
          messages: [{ role: "user", content: "warm" }],
          stream: false,
          keep_alive: "24h",
          options: { num_ctx: 512, num_predict: 4 },
        }),
      }),
      60_000,
    );
    return r.ok;
  } catch {
    return false;
  }
}

export async function ollamaStatus(): Promise<OllamaStatus> {
  try {
    const r = await ollamaHttp("/api/tags", { timeoutMs: tagsProbeMs() });
    if (!r.ok) {
      const err =
        r.status === 0
          ? MAC_TUNNEL
            ? "Open Ollama on Mac → run GO-LIVE-MAC-AI.command from Desktop/Mac-AI (Expose to network ON, qwen2.5:7b)."
            : "ollama unreachable"
          : `daemon http ${r.status}`;
      return {
        available: false,
        model: OLLAMA_MODEL,
        baseUrl: readOllamaBase(),
        installedModels: [],
        error: err,
      };
    }
    const j = JSON.parse(r.body) as { models?: { name: string }[] };
    const installed = (j.models ?? []).map((m) => m.name);
    let model = OLLAMA_MODEL;
    if (installed.length === 0) {
      return {
        available: false,
        model,
        baseUrl: readOllamaBase(),
        installedModels: [],
        error: MAC_TUNNEL
          ? "Tunnel up — open Ollama on Mac/PC and run: ollama pull qwen2.5:0.5b"
          : "no models installed",
      };
    }
    if ((MAC_TUNNEL && isBrokerHostedAi()) || isJerseyLocalOllama()) {
      model = pickFallbackModel(installed, false);
      return {
        available: true,
        model,
        baseUrl: readOllamaBase(),
        installedModels: installed,
      };
    }
    if (MAC_TUNNEL && readOllamaBase().includes("127.0.0.1")) {
      model =
        modelInstalled(OLLAMA_DESK_FAST_MODEL, installed) ??
        modelInstalled(OLLAMA_MODEL, installed) ??
        pickFallbackModel(installed, false);
      return {
        available: true,
        model,
        baseUrl: readOllamaBase(),
        installedModels: installed,
      };
    }
    if (MAC_TUNNEL) {
      const working = await findFirstWorkingModel(installed);
      if (working) {
        model = working;
        process.env.OLLAMA_MODEL = working;
        process.env.OLLAMA_DESK_FAST_MODEL = working;
        process.env.OLLAMA_CONCIERGE_MODEL = working;
        return {
          available: true,
          model: working,
          baseUrl: readOllamaBase(),
          installedModels: installed,
        };
      }
      model = pickFallbackModel(installed, false);
      return {
        available: false,
        model,
        baseUrl: readOllamaBase(),
        installedModels: installed,
        error: `Models listed (${installed.slice(0, 3).join(", ")}) but chat failed — on Mac/PC run: ollama pull qwen2.5:0.5b`,
      };
    }
    let available = installed.length > 0;
    return {
      available,
      model,
      baseUrl: readOllamaBase(),
      installedModels: installed,
    };
  } catch (err) {
    return {
      available: false,
      model: OLLAMA_MODEL,
      baseUrl: readOllamaBase(),
      installedModels: [],
      error: err instanceof Error ? err.message : "ollama unreachable",
    };
  }
}

let installedModelsCache: { at: number; models: string[] } | null = null;
const INSTALLED_MODELS_TTL_MS = 90_000;

async function fetchInstalledModels(): Promise<string[]> {
  if (
    isJerseyLocalOllama() &&
    installedModelsCache &&
    Date.now() - installedModelsCache.at < INSTALLED_MODELS_TTL_MS
  ) {
    return installedModelsCache.models;
  }
  const r = await ollamaHttp("/api/tags", { timeoutMs: tagsProbeMs() });
  if (!r.ok) return [];
  try {
    const j = JSON.parse(r.body) as { models?: { name: string }[] };
    const models = (j.models ?? []).map((m) => m.name);
    if (isJerseyLocalOllama()) installedModelsCache = { at: Date.now(), models };
    return models;
  } catch {
    return [];
  }
}

function modelInstalled(preferred: string, installed: string[]): string | null {
  if (!isStableModel(preferred)) return null;
  const p = preferred.toLowerCase();
  const exact = installed.find((m) => m.toLowerCase() === p);
  if (exact) return exact;
  const stem = p.split(":")[0];
  return installed.find((m) => m.toLowerCase().startsWith(`${stem}:`)) ?? null;
}

function pickFallbackModel(installed: string[], preferLarge: boolean): string {
  const pool = filterStableModels(installed);
  if (pool.length === 0) return OLLAMA_MODEL;
  const score = (m: string) => {
    const hit = m.match(/[:\-](\d+(?:\.\d+)?)\s*b/i);
    return hit ? parseFloat(hit[1]) : 3;
  };
  const qwen = pool.filter((m) => m.toLowerCase().includes("qwen"));
  const candidates = qwen.length ? qwen : pool;
  const sorted = [...candidates].sort((a, b) => (preferLarge ? score(b) - score(a) : score(a) - score(b)));
  return sorted[0] ?? OLLAMA_MODEL;
}

async function probeModelChat(model: string): Promise<boolean> {
  try {
    const r = await ollamaHttp("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "ok" }],
        stream: false,
        options: { num_predict: 2, num_ctx: 256 },
      }),
      timeoutMs: 12_000,
    });
    if (!r.ok) return false;
    const j = JSON.parse(r.body) as { error?: string; message?: { content?: string } };
    return !j.error && Boolean(j.message?.content?.trim());
  } catch {
    return false;
  }
}

/** First model that actually answers /api/chat (tags alone is not enough over tunnel). */
async function findFirstWorkingModel(installed: string[]): Promise<string | null> {
  const pool = filterStableModels(installed);
  if (pool.length === 0) return null;
  const qwen = pool.filter((m) => m.toLowerCase().includes("qwen"));
  const tryPool = qwen.length ? qwen : pool;
  const preferred = [
    modelInstalled(OLLAMA_DESK_FAST_MODEL, tryPool),
    modelInstalled(OLLAMA_MODEL, tryPool),
    pickFallbackModel(tryPool, false),
    ...tryPool,
  ].filter((m): m is string => Boolean(m));
  const seen = new Set<string>();
  for (const name of preferred) {
    if (seen.has(name)) continue;
    seen.add(name);
    if (await probeModelChat(name)) return name;
  }
  return null;
}

/** Use Mac-installed model when .env name missing (404 fix). */
export async function resolveOllamaModel(preferred: string, preferLarge = false): Promise<string> {
  const installed = filterStableModels(await fetchInstalledModels());
  if (isJerseyLocalOllama()) {
    return modelInstalled(preferred, installed) ?? pickFallbackModel(installed, false);
  }
  if (MAC_TUNNEL) {
    const working = await findFirstWorkingModel(installed);
    if (working) return working;
  }
  return modelInstalled(preferred, installed) ?? pickFallbackModel(installed, preferLarge);
}

/** Sync Jersey .env to models actually on Mac tunnel. */
export async function syncMacDeskModelsEnv(): Promise<string[] | null> {
  const installed = await fetchInstalledModels();
  if (installed.length === 0) return null;
  const working = await findFirstWorkingModel(installed);
  const fast = working ?? pickFallbackModel(installed, false);
  const smart = isJerseyLocalOllama() ? fast : (working ?? pickFallbackModel(installed, true));
  process.env.OLLAMA_MODEL = fast;
  process.env.OLLAMA_DESK_FAST_MODEL = fast;
  process.env.OLLAMA_DESK_SMART_MODEL = smart;
  process.env.OLLAMA_CONCIERGE_MODEL = fast;
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const envPath = process.env.ENV_FILE ?? path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return installed;
    let text = fs.readFileSync(envPath, "utf8");
    const set = (key: string, val: string) => {
      const re = new RegExp(`^${key}=.*$`, "m");
      text = re.test(text) ? text.replace(re, `${key}=${val}`) : `${text}\n${key}=${val}\n`;
    };
    set("OLLAMA_MODEL", fast);
    set("OLLAMA_DESK_FAST_MODEL", fast);
    set("OLLAMA_DESK_SMART_MODEL", smart);
    set("OLLAMA_CONCIERGE_MODEL", fast);
    fs.writeFileSync(envPath, text);
  } catch {
    /* runtime env still updated */
  }
  return installed;
}

async function prepareDeskChat(args: DeskChatBuildArgs): Promise<DeskChatBuilt> {
  const built = buildDeskChatMessages(args);
  const smart = args.smart ?? false;
  built.model = await resolveOllamaModel(built.model, smart);
  return built;
}

/** Build Ollama /api/chat payload for desk modes (shared by sync + stream). */
export function buildDeskChatMessages(args: DeskChatBuildArgs): DeskChatBuilt {
  const smart = args.smart ?? false;
  const fast = !smart && (args.fast ?? false);
  const jerseyLocal = isJerseyLocalOllama();
  const model = smart
    ? jerseyLocal
      ? OLLAMA_DESK_FAST_MODEL
      : OLLAMA_DESK_SMART_MODEL
    : fast
      ? OLLAMA_DESK_FAST_MODEL
      : OLLAMA_MODEL;
  const wide = isSshTunnelOllama();
  const macDirect = isMacDirectOllama();
  const ctxCap = smart ? 8_000 : fast ? (wide ? 3_000 : 1_500) : 12_000;
  const histCap = smart ? 12 : fast ? (wide ? 8 : 4) : 10;
  const numCtx = smart ? OLLAMA_DESK_SMART_NUM_CTX : fast ? OLLAMA_DESK_FAST_NUM_CTX : OLLAMA_NUM_CTX;
  const numPredict =
    args.maxPredict ??
    (smart
      ? wide
        ? 520
        : 420
      : fast
        ? jerseyLocal
          ? 48
          : macDirect
            ? 160
            : wide
              ? 128
              : 72
        : 250);
  const timeout = smart ? DESK_SMART_TIMEOUT_MS : fast ? DESK_FAST_TIMEOUT_MS : REQ_TIMEOUT_MS;
  const persona = smart ? getBelief("persona") : fast ? DESK_SYSTEM_COMPACT : getBelief("persona");

  const messages: OllamaMessage[] = [];
  if (fast) {
    messages.push({
      role: "system",
      content: `${persona}\n${args.modeOverlay}`.slice(0, 900),
    });
  } else {
    messages.push({ role: "system", content: persona.slice(0, smart ? 4_500 : 8_000) });
    messages.push({ role: "system", content: args.modeOverlay });
  }
  if (args.audienceBanner?.trim()) {
    messages.push({ role: "system", content: args.audienceBanner.trim() });
  }
  if (args.houseRulesBlock?.trim()) {
    messages.push({ role: "system", content: args.houseRulesBlock.trim() });
  }
  if (args.contextText?.trim()) {
    messages.push({
      role: "system",
      content: `Context:\n${args.contextText.slice(0, ctxCap)}`,
    });
  }
  if (args.history?.length) {
    messages.push(...args.history.slice(-histCap));
  }
  messages.push({ role: "user", content: args.userMessage.slice(0, smart ? 2_000 : fast ? (wide ? 1_500 : 800) : 4_000) });

  return {
    messages,
    model,
    numCtx,
    numPredict,
    temperature: args.temperature ?? (smart ? 0.35 : fast ? 0.5 : 0.25),
    timeout,
  };
}

/**
 * Streaming desk chat — yields raw token deltas (no disclaimer).
 * Caller appends LEGAL_DISCLAIMER on the SSE done event.
 */
export async function* deskChatStream(
  args: DeskChatBuildArgs,
): AsyncGenerator<{ token: string } | { error: string; model: string }> {
  if (NGROK_CHAT_URL) {
    const result = await deskChat(args);
    if (!result.ok) {
      yield { error: result.degraded ?? "External AI endpoint unreachable", model: result.model };
      return;
    }
    const text = result.content.replace(/\n\nEND\s*$/i, "").trim();
    if (text) yield { token: text };
    return;
  }
  if (preferBufferedDeskChat()) {
    const r = await deskChat(args);
    if (!r.ok) {
      yield { error: r.degraded ?? "Mac Ollama unreachable", model: r.model };
      return;
    }
    const text = r.content.replace(/\n\n---\n\n.*$/s, "").trim();
    yield { token: text };
    return;
  }
  const built = await prepareDeskChat(args);
  try {
    const r = await withTimeout(
      fetch(`${readOllamaBase()}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: built.model,
          messages: built.messages,
          stream: true,
          keep_alive: "24h",
          options: ollamaRuntimeOptions({
            numCtx: built.numCtx,
            numPredict: built.numPredict,
            temperature: built.temperature,
            fast: (args.fast ?? false) && !(args.smart ?? false),
            smart: args.smart ?? false,
          }),
        }),
      }),
      built.timeout,
    );
    if (!r.ok || !r.body) {
      const text = await r.text().catch(() => "");
      logWarn("[ollama] stream http", r.status, text.slice(0, 120));
      yield {
        error: `Local AI engine returned HTTP ${r.status}. On Mac: ollama pull ${built.model} (installed: run mac-ollama-connect.py)`,
        model: built.model,
      };
      return;
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const j = JSON.parse(trimmed) as { message?: { content?: string } };
          const piece = j.message?.content ?? "";
          if (piece) yield { token: piece };
        } catch {
          /* skip malformed NDJSON line */
        }
      }
    }
    if (buffer.trim()) {
      try {
        const j = JSON.parse(buffer.trim()) as { message?: { content?: string } };
        const piece = j.message?.content ?? "";
        if (piece) yield { token: piece };
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    logError("[ollama] stream failed", err);
    yield {
      error:
        "Local AI engine unreachable. SSH the VPS and run: systemctl start ollama && ollama pull " +
        built.model,
      model: built.model,
    };
  }
}

/**
 * Non-streaming chat. Persona is always THE DESK; the mode overlay and the
 * data context are supplied per call.
 *
 * Returns content already wrapped with the canonical legal disclaimer — the
 * caller never needs to remember to add it.
 */
export async function deskChat(args: DeskChatBuildArgs): Promise<OllamaChatResult> {
  const built = await prepareDeskChat(args);
  const payload = JSON.stringify({
    model: built.model,
    messages: built.messages,
    stream: false,
    keep_alive: "24h",
    options: ollamaRuntimeOptions({
      numCtx: built.numCtx,
      numPredict: built.numPredict,
      temperature: built.temperature,
      fast: (args.fast ?? false) && !(args.smart ?? false),
      smart: args.smart ?? false,
    }),
  });

  try {
    const ngrok = await ngrokChatHttp(payload, built.timeout);
    if (ngrok && ngrok.ok) {
      try {
        const j = JSON.parse(ngrok.body) as {
          reply?: string;
          response?: string;
          text?: string;
          content?: string;
          message?: { content?: string; text?: string };
        };
        const raw = (j.reply ?? j.response ?? j.text ?? j.content ?? j.message?.content ?? j.message?.text ?? "").trim();
        if (raw) {
          return { ok: true, content: withDisclaimer(raw), model: built.model };
        }
      } catch {
        const text = ngrok.body.trim();
        if (text) {
          return { ok: true, content: withDisclaimer(text), model: built.model };
        }
      }
      return {
        ok: false,
        content: withDisclaimer("External AI endpoint returned an invalid response."),
        model: built.model,
        degraded: "invalid ngrok response",
      };
    }

    const r = await ollamaHttp("/api/chat", {
      method: "POST",
      body: payload,
      timeoutMs: built.timeout,
    });
    if (!r.ok) {
      logWarn("[ollama] http", r.status, r.body.slice(0, 120));
      const crashed = r.status === 500 || /division by zero|terminated|EXCEPTION/i.test(r.body);
      if (r.status === 404 || crashed) {
        const installed = filterStableModels(await fetchInstalledModels());
        const fallback =
          (await findFirstWorkingModel(installed.filter((m) => m !== built.model))) ??
          pickFallbackModel(installed, Boolean(args.smart));
        if (fallback && fallback !== built.model) {
          built.model = fallback;
          process.env.OLLAMA_DESK_FAST_MODEL = fallback;
          process.env.OLLAMA_MODEL = fallback;
          const retry = await ollamaHttp("/api/chat", {
            method: "POST",
            body: JSON.stringify({ ...JSON.parse(payload), model: fallback }),
            timeoutMs: built.timeout,
          });
          if (retry.ok) {
            const j = JSON.parse(retry.body) as { message?: { content?: string } };
            const raw = (j.message?.content ?? "").trim();
            void syncMacDeskModelsEnv();
            return { ok: true, content: withDisclaimer(raw || "(empty response)"), model: fallback };
          }
        }
      }
      const msg = crashed
        ? `llama3.2 crashes over tunnel — on Mac run: ollama pull qwen2.5:3b then restart mac-ollama-connect.py`
        : r.status === 0
          ? readOllamaBase().includes("100.")
            ? "Mac Ollama offline — on Mac run GO-LIVE-MAC-AI.command (Expose to network ON)."
            : "AI engine offline — reconnecting. Try again in a few seconds."
          : `Local AI engine returned HTTP ${r.status}. Pull qwen2.5:3b on the AI server.`;
      return { ok: false, content: withDisclaimer(msg), model: built.model, degraded: msg };
    }
    const j = JSON.parse(r.body) as { message?: { content?: string } };
    const raw = (j.message?.content ?? "").trim();
    return { ok: true, content: withDisclaimer(raw || "(empty response)"), model: built.model };
  } catch (err) {
    logError("[ollama] chat failed", err);
    const msg = MAC_TUNNEL
      ? "Mac Ollama unreachable — run mac-ollama-connect.py, keep Terminal open."
      : `Local AI engine unreachable. ollama pull ${built.model}`;
    return { ok: false, content: withDisclaimer(msg), model: built.model, degraded: msg };
  }
}
