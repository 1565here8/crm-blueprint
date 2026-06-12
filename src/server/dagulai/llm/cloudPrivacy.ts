/** Cloud LLM privacy — no training, minimize vendor retention & local exposure. */

export function dagulaiNoVendorTraining(): boolean {
  const off =
    process.env.DAGULAI_NO_VENDOR_TRAINING?.trim().toLowerCase() === "false" ||
    process.env.CLOUD_NO_TRAINING_ACTIVE?.trim().toLowerCase() === "false";
  return !off;
}

/** xAI: store=false — do not keep prompts/responses on xAI servers (30d default). */
export function xaiStoreOnServer(): boolean {
  if (!dagulaiNoVendorTraining()) return true;
  return process.env.DAGULAI_XAI_STORE?.trim().toLowerCase() === "true";
}

/** Strip API key material before logging or surfacing errors. */
export function redactCloudSecrets(text: string): string {
  let out = text;
  for (const name of ["XAI_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GROQ_API_KEY"]) {
    const val = process.env[name]?.trim();
    if (val && val.length > 8) out = out.split(val).join(`[${name}]`);
  }
  out = out.replace(/\b(AIza[A-Za-z0-9_-]{20,})\b/g, "[GEMINI_API_KEY]");
  out = out.replace(/\b(AQ\.[A-Za-z0-9_-]{20,})\b/g, "[API_KEY]");
  out = out.replace(/\b(xai-[A-Za-z0-9_-]{20,})\b/g, "[XAI_API_KEY]");
  return out;
}

export function cloudPrivacyManifest() {
  const noTrain = dagulaiNoVendorTraining();
  return {
    noVendorTraining: noTrain,
    chatPromptsPersisted: false as const,
    xaiStoreOnServer: xaiStoreOnServer(),
    geminiUsesFileOrCacheApi: false,
    notes: noTrain
      ? [
          "dagulai never INSERTs chat prompts to disk.",
          "Gemini: stateless generateContent only — no File API, no context cache, no Interactions store.",
          "Google paid API: prompts not used to train models (Gemini API Terms).",
          "xAI: store=false on every request — no 30-day server retention when Grok lane active.",
          "Pipeline: boolean flags only when minimal logging is on.",
        ]
      : [
          "DAGULAI_NO_VENDOR_TRAINING=false — vendor retention defaults apply.",
        ],
  };
}

export function geminiGenerationBody(base: Record<string, unknown>): Record<string, unknown> {
  return base;
}

export function xaiResponsesBody(base: Record<string, unknown>): Record<string, unknown> {
  if (!xaiStoreOnServer()) {
    return { ...base, store: false };
  }
  return base;
}

export function xaiChatCompletionsBody(base: Record<string, unknown>): Record<string, unknown> {
  if (!xaiStoreOnServer()) {
    return { ...base, store: false };
  }
  return base;
}
