/**
 * CRM "Connect AI" — Jersey finds the admin's Mac on Tailscale.
 * Client Mac: Ollama + Tailscale apps only. No repo files on the Mac.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { ollamaStatus, setOllamaBaseUrl, warmDeskFastModel, syncMacDeskModelsEnv } from "./ollama";

const exec = promisify(execFile);

const PLACEHOLDER = /REPLACE\.WITH\.MAC|100\.REPLACE/i;
const MAC_BRIDGE =
  process.env.PRODUCT_ISOLATION === "curionilabs" ||
  process.env.AI_MAC_BRIDGE === "1" ||
  /curionilabs\.com/i.test(process.env.ADMIN_URL ?? "") ||
  /curionilabs\.com/i.test(process.env.CURIONI_PUBLIC_URL ?? "") ||
  (process.env.JERSEY_LOCAL_OLLAMA !== "1" && /127\.0\.0\.1:11434|localhost:11434/i.test(process.env.OLLAMA_BASE_URL ?? ""));

const MAC_OLLAMA_SHARE_FIX =
  "Run mac-ollama-connect.py on your Mac (tunnel). Keep that Terminal open, then Connect again.";

function envFile(): string {
  return process.env.ENV_FILE ?? path.join(process.cwd(), ".env");
}

function isAllowedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (h.startsWith("10.") || h.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(h)) return true;
  return false;
}

function normalizeBase(raw: string): string | null {
  try {
    const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
    if (!isAllowedHost(url.hostname)) return null;
    if (!url.port) url.port = "11434";
    return url.origin;
  } catch {
    return null;
  }
}

async function probe(base: string): Promise<boolean> {
  try {
    const r = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return false;
    const j = (await r.json()) as { models?: unknown[] };
    return (j.models?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

type TailscaleSnap = {
  ok: boolean;
  loginUrl?: string;
  peerBases: string[];
  macOnline: boolean;
};

async function tailscaleSnap(): Promise<TailscaleSnap> {
  try {
    const { stdout } = await exec("tailscale", ["status", "--json"], { timeout: 8_000 });
    const j = JSON.parse(stdout) as {
      BackendState?: string;
      AuthURL?: string;
      Peer?: Record<string, { TailscaleIPs?: string[]; Online?: boolean; OS?: string }>;
    };
    const peerBases: string[] = [];
    let macOnline = false;
    for (const peer of Object.values(j.Peer ?? {})) {
      const isMac = (peer.OS ?? "").toLowerCase().includes("mac");
      if (peer.Online !== false) {
        if (isMac) macOnline = true;
        for (const ip of peer.TailscaleIPs ?? []) {
          if (ip.startsWith("100.")) peerBases.push(`http://${ip}:11434`);
        }
      }
    }
    const ok = j.BackendState === "Running";
    return { ok, loginUrl: ok ? undefined : j.AuthURL, peerBases, macOnline };
  } catch {
    return { ok: false, peerBases: [], macOnline: false };
  }
}

async function ensureJerseyTailscale(): Promise<TailscaleSnap> {
  let snap = await tailscaleSnap();
  if (snap.ok) return snap;
  const key = process.env.TAILSCALE_AUTH_KEY?.trim();
  if (!key?.startsWith("tskey-")) return snap;
  try {
    await exec("tailscale", ["up", `--auth-key=${key}`, "--accept-routes", "--reset"], {
      timeout: 45_000,
    });
    snap = await tailscaleSnap();
  } catch {
    /* fall through */
  }
  return snap;
}

function persistEnvFlag(key: string, val: string): void {
  const envPath = envFile();
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const line = `${key}=${val}`;
  if (new RegExp(`^${key}=`, "m").test(text)) {
    text = text.replace(new RegExp(`^${key}=.*$`, "m"), line);
  } else {
    text = `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, text);
  process.env[key] = val;
}

async function stopJerseyLocalOllama(): Promise<void> {
  if (!MAC_BRIDGE) return;
  try {
    await exec("systemctl", ["stop", "ollama"], { timeout: 5_000 });
  } catch {
    /* ok */
  }
  try {
    await exec("pkill", ["-f", "ollama serve"], { timeout: 3_000 });
  } catch {
    /* ok */
  }
}

function hostedOllamaBase(): string | null {
  const raw = process.env.OLLAMA_HOSTED_URL?.trim();
  if (!raw || PLACEHOLDER.test(raw)) return null;
  return normalizeBase(raw);
}

/** Broker-facing setup — no code words. */
export function getBrokerAiSetup(): {
  mode: "hosted" | "local";
  ollamaDownloadUrl: string;
  headline: string;
  steps: string[];
} {
  if (hostedOllamaBase()) {
    return {
      mode: "hosted",
      ollamaDownloadUrl: "https://ollama.com/download",
      headline: "Street AI is included — no download. Open the desk and use it.",
      steps: ["AI runs on your private server 24/7.", "Admins never install anything."],
    };
  }
  return {
    mode: "local",
    ollamaDownloadUrl: "https://ollama.com/download",
    headline: "One-time office setup (IT does this once — not every admin).",
    steps: [
      "IT installs Ollama once on the office server or manager Mac — leave it running 24/7.",
      "Settings → Expose to network → ON.",
      "After that, every admin just opens the desk — no download, no wait.",
    ],
  };
}
async function activateMacAi(base: string): Promise<void> {
  await stopJerseyLocalOllama();
  persistOllamaBase(base);
  persistEnvFlag("JERSEY_LOCAL_OLLAMA", "0");
  setOllamaBaseUrl(base);
  try {
    await syncMacDeskModelsEnv();
  } catch {
    /* best-effort */
  }
}

/** Mac Tailscale (64GB) beats Jersey 2GB local every time. */
async function preferMacTailscale(): Promise<string | null> {
  if (!MAC_BRIDGE) return null;
  const ts = await ensureJerseyTailscale();
  for (const base of ts.peerBases) {
    if (await probe(base)) return base;
  }
  return null;
}

async function classifyLocalhost11434(): Promise<"mac" | "jersey" | null> {
  if (!(await probe("http://127.0.0.1:11434"))) return null;
  try {
    const r = await fetch("http://127.0.0.1:11434/api/tags", { signal: AbortSignal.timeout(5_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { models?: { name: string }[] };
    const names = (j.models ?? []).map((m) => m.name.toLowerCase());
    if (names.some((n) => /:7b|:14b|:32b|:3b|:8b/.test(n))) return "mac";
    if (names.some((n) => n.includes("0.5b"))) return "jersey";
    return "mac";
  } catch {
    return null;
  }
}

async function ensureJerseyLocalFallback(): Promise<boolean> {
  try {
    await exec("systemctl", ["enable", "ollama"], { timeout: 8_000 });
    await exec("systemctl", ["start", "ollama"], { timeout: 8_000 });
    await new Promise((r) => setTimeout(r, 3_000));
    return await probe("http://127.0.0.1:11434");
  } catch {
    return false;
  }
}

async function preferBestAiSource(): Promise<string | null> {
  const hosted = hostedOllamaBase();
  if (hosted && (await probe(hosted))) return hosted;

  const mac = await preferMacTailscale();
  if (mac) return mac;

  let localKind = await classifyLocalhost11434();
  if (!localKind && (await ensureJerseyLocalFallback())) {
    localKind = await classifyLocalhost11434();
  }
  if (localKind === "mac" || localKind === "jersey") return "http://127.0.0.1:11434";
  return null;
}

async function restartPm2(): Promise<boolean> {
  const names = [process.env.PM2_APP_NAME, "curiocrm", "curionilabs"].filter(
    (n): n is string => Boolean(n?.trim()),
  );
  for (const name of names) {
    try {
      await exec("pm2", ["restart", name, "--update-env"], { timeout: 30_000 });
      return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

function persistOllamaBase(winner: string): void {
  const envPath = envFile();
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const line = `OLLAMA_BASE_URL=${winner}`;
  if (/^OLLAMA_BASE_URL=/m.test(text)) {
    text = text.replace(/^OLLAMA_BASE_URL=.*$/m, line);
  } else {
    text = `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(envPath, text);
  setOllamaBaseUrl(winner);
}

const CLIENT_MAC_STEPS =
  "On Mac: open Ollama, run mac-ollama-connect.py on Desktop (2 files), keep Terminal open.";

export type AiBridgeResult = {
  ok: boolean;
  connected: boolean;
  message: string;
  restarted: boolean;
  baseUrl?: string;
  tailscaleLoginUrl?: string;
};

async function macConnectInstructions(): Promise<string> {
  const setup = getBrokerAiSetup();
  if (setup.mode === "hosted") {
    return "AI server not reachable — contact your CurioniLabs admin.";
  }
  const ts = await ensureJerseyTailscale();
  if (ts.macOnline) {
    return `${setup.steps.join(" ")} (Your computer is online — open Ollama and Expose to network ON.)`;
  }
  return setup.steps.join(" ");
}

export async function connectAiWallstreet(manualHost?: string, tunnelOnly = false): Promise<AiBridgeResult> {
  let winner: string | null = null;
  if (manualHost) {
    const b = normalizeBase(manualHost);
    if (b && (await probe(b))) winner = b;
  } else if (tunnelOnly) {
    if (await probe("http://127.0.0.1:11434")) winner = "http://127.0.0.1:11434";
    else winner = await preferMacTailscale();
  } else {
    winner = await preferBestAiSource();
  }

  if (!winner) {
    return {
      ok: false,
      connected: false,
      restarted: false,
      message: MAC_BRIDGE ? await macConnectInstructions() : "Ollama not reachable. Connect again.",
    };
  }

  const macDirect = winner.includes("100.");
  const macTunnel = winner.includes("127.0.0.1") && (await classifyLocalhost11434()) === "mac";
  if (macDirect || macTunnel) {
    await activateMacAi(winner);
  } else {
    persistOllamaBase(winner);
    persistEnvFlag("JERSEY_LOCAL_OLLAMA", "1");
  }

  void warmDeskFastModel();
  const st = await ollamaStatus();
  const via = macDirect ? "Mac (Tailscale)" : macTunnel ? "Mac (tunnel)" : "VPS fallback";
  return {
    ok: st.available,
    connected: st.available,
    restarted: false,
    baseUrl: winner,
    message: st.available
      ? `AI live on ${via} — ${st.model}.`
      : st.error ?? "Ollama found — warming up, try desk in a few seconds.",
  };
}

export async function autoConnectOllamaOnBoot(): Promise<void> {
  const winner = await preferBestAiSource();
  if (winner) {
    const macDirect = winner.includes("100.");
    const macTunnel = winner.includes("127.0.0.1") && (await classifyLocalhost11434()) === "mac";
    if (macDirect || macTunnel) await activateMacAi(winner);
    else {
      persistOllamaBase(winner);
      persistEnvFlag("JERSEY_LOCAL_OLLAMA", "1");
    }
    void warmDeskFastModel();
    return;
  }
  if (MAC_BRIDGE) {
    const r = await connectAiWallstreet(undefined, false);
    if (r.connected) void warmDeskFastModel();
  }
}

/** Keep hosted AI warm — brokers never click Connect. */
export function startHostedAiKeeper(): void {
  if (!hostedOllamaBase()) return;
  const tick = () => void autoConnectOllamaOnBoot();
  setInterval(tick, 3 * 60 * 1000);
  setTimeout(tick, 8_000);
}

/** Jersey polls Mac Tailscale — auto-switch when Mac Ollama is exposed. */
export function startMacTailscaleWatcher(): void {
  if (!MAC_BRIDGE) return;
  const tick = async () => {
    const mac = await preferMacTailscale();
    if (mac) {
      if (readOllamaBase() !== mac || process.env.JERSEY_LOCAL_OLLAMA === "1") {
        await activateMacAi(mac);
        void warmDeskFastModel();
      }
      return;
    }
    if (process.env.JERSEY_LOCAL_OLLAMA === "1") return;
    if (await probe("http://127.0.0.1:11434")) {
      try {
        await syncMacDeskModelsEnv();
      } catch {
        /* ok */
      }
    }
  };
  setInterval(() => void tick(), 25_000);
  setTimeout(() => void tick(), 6_000);
}

function readOllamaBase(): string {
  return process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
}
