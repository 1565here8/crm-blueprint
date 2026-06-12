import type { ChatMessage } from "./geminiChat";

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function dagulaiGroqModel(): string {
  return process.env.DAGULAI_GROQ_MODEL?.trim() || "llama-3.1-8b-instant";
}

function groqApiKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error("GROQ_API_KEY not set — required for Groq Megamind lane.");
  return key;
}

function toOpenAiMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export async function groqChatComplete(messages: ChatMessage[]): Promise<string> {
  if (!groqConfigured()) {
    throw new Error("Groq unavailable — set GROQ_API_KEY.");
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${groqApiKey()}`,
    },
    signal: AbortSignal.timeout(Number(process.env.DAGULAI_GROQ_TIMEOUT_MS ?? 60_000)),
    body: JSON.stringify({
      model: dagulaiGroqModel(),
      messages: toOpenAiMessages(messages),
      temperature: 0.55,
      max_tokens: Number(process.env.DAGULAI_GROQ_MAX_TOKENS ?? 2048),
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Groq returned empty response.");
  return text;
}

export async function* groqChatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  if (!groqConfigured()) {
    throw new Error("Groq unavailable — set GROQ_API_KEY.");
  }
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${groqApiKey()}`,
    },
    body: JSON.stringify({
      model: dagulaiGroqModel(),
      messages: toOpenAiMessages(messages),
      temperature: 0.55,
      max_tokens: Number(process.env.DAGULAI_GROQ_MAX_TOKENS ?? 2048),
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq stream error ${res.status}: ${err.slice(0, 200)}`);
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
        /* partial SSE line */
      }
    }
  }
}
