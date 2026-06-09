/**
 * Zero-knowledge logging layer.
 *
 * In production the entire system is silent by default. No PII, no client
 * data, no marketing events, no funds movements, no phone numbers, no IPs
 * touch disk. The platform vendor has no telemetry of any kind.
 *
 * Override (for the broker operator only, never on by default):
 *   LOG_LEVEL=warn       → only warnings + errors, PII-scrubbed
 *   LOG_LEVEL=error      → only errors, PII-scrubbed
 *   LOG_LEVEL=debug      → everything, PII-scrubbed (dev only)
 *   SILENT_MODE=0        → re-enable defaults
 */
const logLevel = (process.env.LOG_LEVEL ?? "").trim().toLowerCase();
const silentFlag = process.env.SILENT_MODE !== "0";
const isProd = process.env.NODE_ENV === "production";

const explicitlyOpenedUp =
  logLevel === "warn" || logLevel === "error" || logLevel === "debug";

export const isSilent = (() => {
  if (silentFlag && !explicitlyOpenedUp) return true;
  if (isProd && !explicitlyOpenedUp) return true;
  return false;
})();

const PII_PATTERNS: { re: RegExp; rep: string }[] = [
  { re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gi, rep: "[email]" },
  { re: /\+?\d[\d\s().-]{6,}\d/g, rep: "[phone]" },
  { re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, rep: "[ip]" },
  { re: /\b[a-f0-9]{24,}\b/gi, rep: "[hash]" },
  { re: /password=[^\s,;]+/gi, rep: "password=[redacted]" },
  { re: /token=[^\s,;]+/gi, rep: "token=[redacted]" },
  { re: /authorization:\s*\S+/gi, rep: "authorization: [redacted]" },
];

function scrubString(s: string): string {
  let out = s;
  for (const p of PII_PATTERNS) out = out.replace(p.re, p.rep);
  return out.slice(0, 240);
}

function sanitize(parts: unknown[]): unknown[] {
  return parts.map((p) => {
    if (p == null) return p;
    if (p instanceof Error) return scrubString(p.message || "error");
    if (typeof p === "string") return scrubString(p);
    try {
      return scrubString(JSON.stringify(p));
    } catch {
      return "[unloggable]";
    }
  });
}

type Writer = (...args: unknown[]) => void;

function write(kind: "log" | "warn" | "error", args: unknown[]) {
  if (isSilent) return;
  if (isProd && kind === "log") return;
  if (logLevel === "error" && kind !== "error") return;
  if (logLevel === "warn" && kind === "log") return;
  console[kind](...sanitize(args));
}

export const log: Writer = (...args) => write("log", args);
export const warn: Writer = (...args) => write("warn", args);
export const error: Writer = (...args) => write("error", args);

/** Process cannot start. One short PII-scrubbed line, then exit. */
export function fatal(message: string): never {
  process.stderr.write(`${scrubString(String(message))}\n`);
  process.exit(1);
}
