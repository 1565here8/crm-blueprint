import type { ChatMessage } from "./geminiChat";
import { redactCloudSecrets, xaiChatCompletionsBody, xaiResponsesBody } from "./cloudPrivacy";

export function xaiConfigured(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function dagulaiXaiModel(): string {
  return process.env.DAGULAI_XAI_MODEL?.trim() || "grok-4.3";
}

function xaiApiKey(): string {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) throw new Error("XAI_API_KEY not set — required for xAI Grok Megamind lane.");
  return key;
}

function toXaiInput(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function extractXaiText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const o = json as Record<string, unknown>;
  if (typeof o.output_text === "string" && o.output_text.trim()) return o.output_text.trim();

  const output = o.output;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.text === "string") parts.push(row.text);
      const content = row.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (c && typeof c === "object" && typeof (c as { text?: string }).text === "string") {
            parts.push((c as { text: string }).text);
          }
        }
      }
    }
    const joined = parts.join("").trim();
    if (joined) return joined;
  }

  const choices = (o as { choices?: Array<{ message?: { content?: string } }> }).choices;
  const legacy = choices?.[0]?.message?.content?.trim();
  return legacy ?? "";
}

export async function xaiChatComplete(messages: ChatMessage[]): Promise<string> {
  if (!xaiConfigured()) throw new Error("xAI Grok unavailable — set XAI_API_KEY.");

  const res = await fetch("https://api.x.ai/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${xaiApiKey()}`,
    },
    signal: AbortSignal.timeout(Number(process.env.DAGULAI_XAI_TIMEOUT_MS ?? 90_000)),
    body: JSON.stringify(
      xaiResponsesBody({
        model: dagulaiXaiModel(),
        input: toXaiInput(messages),
      }),
    ),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`xAI error ${res.status}: ${redactCloudSecrets(err.slice(0, 240))}`);
  }
  const json = await res.json();
  const text = extractXaiText(json);
  if (!text) throw new Error("xAI returned empty response.");
  return text;
}

export async function* xaiChatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  if (!xaiConfigured()) throw new Error("xAI Grok unavailable — set XAI_API_KEY.");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${xaiApiKey()}`,
    },
    body: JSON.stringify(
      xaiChatCompletionsBody({
        model: dagulaiXaiModel(),
        messages: toXaiInput(messages),
        temperature: 0.55,
        stream: true,
      }),
    ),
  });
  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => "");
    throw new Error(`xAI stream error ${res.status}: ${redactCloudSecrets(err.slice(0, 240))}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const chunk = json.choices?.[0]?.delta?.content;
        if (chunk) yield chunk;
      } catch {
        /* partial SSE */
      }
    }
  }
}
