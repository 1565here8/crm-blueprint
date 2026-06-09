import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";

/** Licensed ElevenLabs premade voices — cinematic styles, not celebrity impersonation. */
export const DEMO_VOICE_PRESETS = {
  documentary: {
    label: "Documentary narrator",
    hint: "Deep calm authority — nature-doc / trailer style",
    elevenVoiceId: "onwK4e9ZLuTAKqWW03F9",
    browserPitch: 0.82,
    browserRate: 0.86,
  },
  executive: {
    label: "Executive briefing",
    hint: "Clear American presenter — boardroom walkthrough",
    elevenVoiceId: "pNInz6obpgDQGcFmaJgB",
    browserPitch: 0.92,
    browserRate: 0.9,
  },
  cinematic: {
    label: "Cinematic host",
    hint: "Rich baritone — premium product reveal",
    elevenVoiceId: "VR6AewLTigWG4xSOukaG",
    browserPitch: 0.78,
    browserRate: 0.84,
  },
} as const;

export type DemoVoicePresetId = keyof typeof DEMO_VOICE_PRESETS;

const MAX_CHARS = 2_500;

export const demoNarrationLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demo narration rate limit — try again in a minute." },
});

function presetId(raw: unknown): DemoVoicePresetId {
  if (typeof raw === "string" && raw in DEMO_VOICE_PRESETS) return raw as DemoVoicePresetId;
  return "documentary";
}

export function demoVoicesHandler(_req: Request, res: Response): void {
  const hd = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  res.json({
    hd,
    defaultPreset: "documentary" satisfies DemoVoicePresetId,
    presets: Object.entries(DEMO_VOICE_PRESETS).map(([id, p]) => ({
      id,
      label: p.label,
      hint: p.hint,
    })),
    note: "Licensed narrator styles only — not a celebrity impersonation.",
  });
}

export async function demoNarrationHandler(req: Request, res: Response): Promise<void> {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "Missing text.", fallback: true });
    return;
  }
  if (text.length > MAX_CHARS) {
    res.status(400).json({ error: `Text too long (max ${MAX_CHARS} chars).`, fallback: true });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({ fallback: true, reason: "ELEVENLABS_API_KEY not set on server." });
    return;
  }

  const preset = DEMO_VOICE_PRESETS[presetId(req.body?.preset)];
  const voiceId = process.env.ELEVENLABS_DEMO_VOICE_ID?.trim() || preset.elevenVoiceId;
  const modelId = process.env.ELEVENLABS_DEMO_MODEL?.trim() || "eleven_multilingual_v2";

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.78,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      res.status(502).json({
        fallback: true,
        reason: `ElevenLabs error ${upstream.status}`,
        detail: detail.slice(0, 200),
      });
      return;
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(audio);
  } catch (err) {
    res.status(502).json({
      fallback: true,
      reason: err instanceof Error ? err.message : "TTS request failed",
    });
  }
}
