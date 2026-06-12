import { dagulaiGeminiModel, geminiConfigured } from "./inferenceLanes";
import { geminiGenerationBody, redactCloudSecrets } from "./cloudPrivacy";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function geminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY not set — required for cloud Megamind lane.");
  return key;
}

function toGeminiContents(messages: ChatMessage[]) {
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }
  if (system && contents[0]?.role === "user") {
    contents[0].parts[0]!.text = `[SYSTEM]\n${system}\n\n${contents[0].parts[0]!.text}`;
  } else if (system) {
    contents.unshift({ role: "user", parts: [{ text: `[SYSTEM]\n${system}` }] });
  }
  return contents;
}

export async function geminiChatComplete(messages: ChatMessage[]): Promise<string> {
  if (!geminiConfigured()) {
    throw new Error("Cloud Megamind unavailable — set GEMINI_API_KEY for launch lane.");
  }
  const model = dagulaiGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(Number(process.env.DAGULAI_GEMINI_TIMEOUT_MS ?? 60_000)),
    body: JSON.stringify(
      geminiGenerationBody({
        contents: toGeminiContents(messages),
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: Number(process.env.DAGULAI_GEMINI_MAX_TOKENS ?? 2048),
        },
      }),
    ),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${redactCloudSecrets(err.slice(0, 200))}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned empty response.");
  return text;
}

export async function* geminiChatStream(messages: ChatMessage[]): AsyncGenerator<string> {
  if (!geminiConfigured()) {
    throw new Error("Cloud Megamind unavailable — set GEMINI_API_KEY.");
  }
  const model = dagulaiGeminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiApiKey()}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      geminiGenerationBody({
        contents: toGeminiContents(messages),
        generationConfig: { temperature: 0.55, maxOutputTokens: 2048 },
      }),
    ),
  });

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini stream error ${res.status}: ${redactCloudSecrets(err.slice(0, 200))}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (chunk) yield chunk;
      } catch {
        // skip malformed sse
      }
    }
  }
}
