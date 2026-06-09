/**
 * When Ollama is down but the operator attached files, return a digest-only
 * reply so demos never end on a blank error.
 */
import type { AttachmentDigest } from "./deskAttachments";
import type { DeskInstantReply } from "./deskRouteMessage";

export function resolveDeskPayloadFallback(digests: AttachmentDigest[]): DeskInstantReply | null {
  if (!digests.length) return null;

  const lines = digests.map((d) => {
    const head =
      d.extractedChars > 0
        ? d.preview.replace(/\s+/g, " ").trim()
        : (d.note ?? "no text extracted");
    return `• ${d.name} (${d.kind}, ${d.extractedChars} chars): ${head}`;
  });

  return {
    body: [
      "Local AI engine offline — attachment digest only (no model run).",
      "",
      ...lines,
      "",
      "CRM fast-path still works: demo tour · morning routine · pass the test · knowme · pending in · permissions",
    ].join("\n"),
    model: "fast-path-fallback",
  };
}
