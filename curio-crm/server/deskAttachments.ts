/**
 * Desk attachments — turn arbitrary admin-uploaded artefacts into safe,
 * PII-scrubbed, truncated text the local LLM can reason over.
 *
 * The frontend sends each attachment as a small JSON record so we never
 * need multer or multipart parsing:
 *
 *   {
 *     name: "kyc-passport.pdf",
 *     mime: "application/pdf",
 *     size: 124312,
 *     contentText?: "...utf-8 already extracted in the browser...",
 *     contentBase64?: "...base64 blob, used for pdf / audio / image..."
 *   }
 *
 * Server logic:
 *  - If contentText present → trust it (the browser parsed the file).
 *  - Else if PDF → run pdf-parse.
 *  - Else if audio → keep metadata only (call transcript field handles
 *    speech-to-text on the client side, or via local whisper if installed).
 *  - Else if image → metadata only; current LLM is text-only.
 *  - Else → first N kilobytes as utf-8 best-effort.
 *
 * Every extracted block is PII-scrubbed and clamped before reaching the
 * model. Zero attachment data is persisted to disk by this module.
 */

import { error as logError } from "./log";

// Lazy require for pdf-parse so the module does NOT touch disk on boot.
type PdfParseFn = (buf: Buffer) => Promise<{ text: string; numpages?: number }>;
let pdfParser: PdfParseFn | null = null;
async function loadPdfParser(): Promise<PdfParseFn | null> {
  if (pdfParser) return pdfParser;
  try {
    const mod = (await import("pdf-parse")) as unknown as
      | { default: PdfParseFn }
      | PdfParseFn;
    pdfParser = typeof mod === "function" ? (mod as PdfParseFn) : (mod as { default: PdfParseFn }).default;
    return pdfParser;
  } catch (err) {
    logError("[attachments] pdf-parse unavailable", err);
    return null;
  }
}

const MAX_TEXT_CHARS_PER_FILE = 12_000;
const MAX_BINARY_BYTES = 12 * 1024 * 1024;

const PII_PATTERNS: { re: RegExp; rep: string }[] = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, rep: "[ssn]" },
  { re: /\b(?:\d[ -]*?){13,19}\b/g, rep: "[pan]" }, // card-like
];

function scrubExtractedText(s: string): string {
  let out = s;
  for (const p of PII_PATTERNS) out = out.replace(p.re, p.rep);
  // Collapse runs of whitespace to keep prompts compact.
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ");
  if (out.length > MAX_TEXT_CHARS_PER_FILE) {
    out = out.slice(0, MAX_TEXT_CHARS_PER_FILE) + `\n[... truncated, original ${s.length} chars]`;
  }
  return out.trim();
}

export type AttachmentInput = {
  name: string;
  mime: string;
  size: number;
  contentText?: string | null;
  contentBase64?: string | null;
};

export type AttachmentDigest = {
  name: string;
  mime: string;
  sizeBytes: number;
  kind: "text" | "pdf" | "audio" | "image" | "binary";
  extractedChars: number;
  preview: string; // small head excerpt for the UI
  note?: string;   // human-readable note (e.g. "binary, not parsed")
  body: string;    // PII-scrubbed text block that goes into the LLM context
};

function classify(mime: string, name: string): AttachmentDigest["kind"] {
  const lower = (mime ?? "").toLowerCase();
  const ext = (name.split(".").pop() ?? "").toLowerCase();
  if (lower.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg", "webm", "flac", "aac"].includes(ext)) return "audio";
  if (lower.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff"].includes(ext)) return "image";
  if (lower === "application/pdf" || ext === "pdf") return "pdf";
  if (
    lower.startsWith("text/") ||
    lower.includes("json") ||
    lower.includes("xml") ||
    lower.includes("yaml") ||
    lower.includes("csv") ||
    lower.includes("markdown") ||
    lower.includes("javascript") ||
    lower.includes("typescript") ||
    ["txt", "csv", "tsv", "json", "yaml", "yml", "md", "html", "htm", "log", "xml", "ini", "conf", "cfg", "rtf"].includes(ext)
  ) {
    return "text";
  }
  return "binary";
}

function decodeBase64(b64: string | null | undefined): Buffer | null {
  if (!b64) return null;
  const stripped = b64.startsWith("data:") ? b64.slice(b64.indexOf(",") + 1) : b64;
  try {
    const buf = Buffer.from(stripped, "base64");
    if (buf.byteLength === 0 || buf.byteLength > MAX_BINARY_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

export async function digestAttachment(input: AttachmentInput): Promise<AttachmentDigest> {
  const name = (input.name || "attachment").slice(0, 200);
  const mime = (input.mime || "application/octet-stream").slice(0, 120);
  const size = Math.max(0, Math.floor(input.size || 0));
  const kind = classify(mime, name);

  // 1. Text content delivered straight from the browser.
  if (input.contentText && typeof input.contentText === "string" && input.contentText.trim().length > 0) {
    const body = scrubExtractedText(input.contentText);
    return {
      name, mime, sizeBytes: size, kind: kind === "binary" ? "text" : kind,
      extractedChars: body.length,
      preview: body.slice(0, 240),
      body: `--- ATTACHMENT: ${name} (${mime}, ${formatSize(size)}) ---\n${body}\n--- END ${name} ---`,
    };
  }

  // 2. Binary payloads — base64 decoded, then per-kind parsing.
  const buf = decodeBase64(input.contentBase64 ?? null);
  if (!buf) {
    return {
      name, mime, sizeBytes: size, kind,
      extractedChars: 0,
      preview: "",
      note: "no content body",
      body: `--- ATTACHMENT: ${name} (${mime}, ${formatSize(size)}) — no content payload, metadata only ---`,
    };
  }

  if (kind === "pdf") {
    const parser = await loadPdfParser();
    if (!parser) {
      return {
        name, mime, sizeBytes: size, kind,
        extractedChars: 0, preview: "",
        note: "pdf parser unavailable",
        body: `--- ATTACHMENT: ${name} (PDF, ${formatSize(size)}) — pdf parser not loaded ---`,
      };
    }
    try {
      const parsed = await parser(buf);
      const body = scrubExtractedText(parsed.text || "");
      return {
        name, mime, sizeBytes: size, kind,
        extractedChars: body.length,
        preview: body.slice(0, 240),
        note: parsed.numpages ? `${parsed.numpages} pages` : undefined,
        body: `--- ATTACHMENT: ${name} (PDF${parsed.numpages ? `, ${parsed.numpages} pages` : ""}, ${formatSize(size)}) ---\n${body}\n--- END ${name} ---`,
      };
    } catch (err) {
      logError("[attachments] pdf parse failed", err);
      return {
        name, mime, sizeBytes: size, kind,
        extractedChars: 0, preview: "",
        note: "pdf parse failed",
        body: `--- ATTACHMENT: ${name} (PDF, ${formatSize(size)}) — could not extract text (scanned image PDF?) ---`,
      };
    }
  }

  if (kind === "audio") {
    return {
      name, mime, sizeBytes: size, kind,
      extractedChars: 0, preview: "",
      note: "audio file — transcription required",
      body: `--- ATTACHMENT: ${name} (AUDIO, ${formatSize(size)}) — raw audio received; transcript NOT yet produced server-side. If a transcript was submitted in the message body, use that. Otherwise note that the audio is queued for review. ---`,
    };
  }

  if (kind === "image") {
    return {
      name, mime, sizeBytes: size, kind,
      extractedChars: 0, preview: "",
      note: "image — visual content not analysed by text-only model",
      body: `--- ATTACHMENT: ${name} (IMAGE, ${formatSize(size)}) — file received; current model cannot see images. Describe what is needed from this image and the operator will supply text. ---`,
    };
  }

  // text-as-binary fallback
  if (kind === "text") {
    const body = scrubExtractedText(buf.toString("utf8"));
    return {
      name, mime, sizeBytes: size, kind,
      extractedChars: body.length,
      preview: body.slice(0, 240),
      body: `--- ATTACHMENT: ${name} (${mime}, ${formatSize(size)}) ---\n${body}\n--- END ${name} ---`,
    };
  }

  // unknown binary
  return {
    name, mime, sizeBytes: size, kind: "binary",
    extractedChars: 0, preview: "",
    note: "binary, not parsed",
    body: `--- ATTACHMENT: ${name} (${mime}, ${formatSize(size)}) — binary file, not parsed ---`,
  };
}

export async function digestAttachments(
  inputs: AttachmentInput[] | undefined,
  cap = 6,
): Promise<AttachmentDigest[]> {
  if (!inputs || inputs.length === 0) return [];
  const sliced = inputs.slice(0, cap);
  const out: AttachmentDigest[] = [];
  for (const a of sliced) {
    try {
      out.push(await digestAttachment(a));
    } catch (err) {
      logError("[attachments] digest failure", err);
    }
  }
  return out;
}

export function digestsToContextText(digests: AttachmentDigest[]): string {
  if (digests.length === 0) return "";
  return ["ATTACHMENTS:", ...digests.map((d) => d.body)].join("\n\n");
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
