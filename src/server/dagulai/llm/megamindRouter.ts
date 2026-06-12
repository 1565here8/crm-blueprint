import type { OllamaChatOptions } from "../../../api/ollamaChat";
import { ollamaChatComplete, ollamaChatStream } from "../../../api/ollamaChat";
import { geminiChatComplete, geminiChatStream, type ChatMessage } from "./geminiChat";
import { groqChatComplete, groqChatStream } from "./groqChat";
import { xaiChatComplete, xaiChatStream } from "./xaiChat";
import { demoMegamindComplete, demoMegamindStream } from "./demoFallback";
import {
  type DagulaiInferenceLane,
  corporateLaneEnabled,
  getInferenceLaneConfig,
  resolveInferenceLane,
  resolveCloudProvider,
  dagulaiCorporateOllamaHost,
  dagulaiCorporateOllamaModel,
  geminiConfigured,
  groqConfigured,
  fastCloudConfigured,
} from "./inferenceLanes";

export type DagulaiLlmRequest = OllamaChatOptions & {
  lane?: DagulaiInferenceLane;
  userRole?: string | null;
  tier?: string | null;
};

function toMessages(options: OllamaChatOptions): ChatMessage[] {
  return options.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function pickLane(options: DagulaiLlmRequest): DagulaiInferenceLane {
  if (options.lane) return options.lane;
  return resolveInferenceLane({
    requestedLane: options.lane,
    userRole: options.userRole,
    tier: options.tier,
  });
}

async function cloudComplete(messages: ChatMessage[]): Promise<string> {
  const provider = resolveCloudProvider();
  if (provider === "gemini-cloud") {
    return geminiChatComplete(messages);
  }
  if (provider === "groq-cloud") {
    return groqChatComplete(messages);
  }
  if (provider === "xai-cloud") {
    return xaiChatComplete(messages);
  }
  return demoMegamindComplete(messages);
}

async function* cloudStream(messages: ChatMessage[]): AsyncGenerator<string> {
  const provider = resolveCloudProvider();
  if (provider === "gemini-cloud") {
    yield* geminiChatStream(messages);
    return;
  }
  if (provider === "groq-cloud") {
    yield* groqChatStream(messages);
    return;
  }
  if (provider === "xai-cloud") {
    yield* xaiChatStream(messages);
    return;
  }
  yield* demoMegamindStream(messages);
}

export async function dagulaiMegamindComplete(options: DagulaiLlmRequest): Promise<string> {
  const lane = pickLane(options);
  const messages = toMessages(options);

  if (lane === "cloud") {
    return cloudComplete(messages);
  }

  try {
    return await ollamaChatComplete({
      ...options,
      host: dagulaiCorporateOllamaHost(),
      model: dagulaiCorporateOllamaModel(),
      keepAlive: process.env.OLLAMA_KEEP_ALIVE ?? "5m",
    });
  } catch {
    return cloudComplete(messages);
  }
}

export async function* dagulaiMegamindStream(
  options: DagulaiLlmRequest,
): AsyncGenerator<string> {
  const lane = pickLane(options);
  const messages = toMessages(options);

  if (lane === "cloud") {
    yield* cloudStream(messages);
    return;
  }

  try {
    yield* ollamaChatStream({
      ...options,
      host: dagulaiCorporateOllamaHost(),
      model: dagulaiCorporateOllamaModel(),
      keepAlive: process.env.OLLAMA_KEEP_ALIVE ?? "5m",
    });
  } catch {
    yield* cloudStream(messages);
  }
}

export function getMegamindLaneStatus(lane?: DagulaiInferenceLane) {
  const cfg = getInferenceLaneConfig(lane ?? resolveInferenceLane());
  return {
    ...cfg,
    ready:
      cfg.lane === "cloud"
        ? fastCloudConfigured() || cfg.demoMode
        : corporateLaneEnabled(),
  };
}
