/**
 * Vault routes — blind ciphertext storage + AI audit bridge.
 *
 * The server here is intentionally "legally blind": it accepts an
 * opaque ciphertext blob produced in the broker's browser, stores it,
 * and serves it back on demand. The server cannot read the contents
 * without the broker's session key — and the only endpoint that ever
 * receives a session key (`/audit`) overwrites it in RAM the
 * millisecond the LLM finishes.
 *
 * Surface:
 *   GET    /api/admin/vault/records          → list summaries (no plaintext)
 *   POST   /api/admin/vault/records          → store new ciphertext blob
 *   GET    /api/admin/vault/records/:id      → return ciphertext blob
 *   DELETE /api/admin/vault/records/:id      → delete blob
 *   GET    /api/admin/vault/summary          → totals for the broker
 *   POST   /api/admin/vault/audit            → AI bridge (session key, RAM-only)
 */

import { Router, json as expressJson } from "express";
import { z } from "zod";
import { requireAuth } from "../auth";
import { error as logError } from "../log";
import {
  blindAudit,
  countVaultRecords,
  createVaultRecord,
  deleteVaultRecord,
  getVaultRecord,
  listVaultRecords,
  sealResponse,
} from "../vault";
import { deskChat } from "../ollama";
import { ASSIST_MODE, SALES_CALL_REVIEW, withDisclaimer } from "../deskPrompts";

export const vaultRouter = Router();

vaultRouter.use(requireAuth);

const blobSchema = z.object({
  kind: z.enum([
    "kyc_document",
    "call_transcript",
    "client_note",
    "id_number",
    "source_of_funds",
    "wire_detail",
    "free_text",
  ]),
  alg: z.literal("AES-GCM-256"),
  v: z.literal(1),
  ciphertext: z.string().min(8).max(12_000_000),
  iv: z.string().min(8).max(32),
});

vaultRouter.get("/records", (req, res) => {
  const owner = req.sessionUser?.id;
  if (!owner) {
    res.status(401).json({ error: "no session" });
    return;
  }
  const kind = (req.query.kind as string | undefined)?.trim();
  res.json({ records: listVaultRecords(owner, { kind: kind || undefined }) });
});

vaultRouter.post(
  "/records",
  expressJson({ limit: "20mb" }),
  (req, res) => {
    const owner = req.sessionUser?.id;
    if (!owner) {
      res.status(401).json({ error: "no session" });
      return;
    }
    const parsed = blobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }
    try {
      const summary = createVaultRecord({ ownerId: owner, ...parsed.data });
      res.json({ record: summary });
    } catch (err) {
      logError("[vault/create]", err);
      res.status(400).json({ error: (err as Error).message });
    }
  },
);

vaultRouter.get("/records/:id", (req, res) => {
  const owner = req.sessionUser?.id;
  if (!owner) {
    res.status(401).json({ error: "no session" });
    return;
  }
  const row = getVaultRecord(owner, req.params.id);
  if (!row) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.json({
    record: {
      id: row.id,
      kind: row.kind,
      alg: row.alg,
      v: row.v,
      ciphertext: row.ciphertext,
      iv: row.iv,
      size_bytes: row.size_bytes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  });
});

vaultRouter.delete("/records/:id", (req, res) => {
  const owner = req.sessionUser?.id;
  if (!owner) {
    res.status(401).json({ error: "no session" });
    return;
  }
  res.json({ ok: deleteVaultRecord(owner, req.params.id) });
});

vaultRouter.get("/summary", (req, res) => {
  const owner = req.sessionUser?.id;
  if (!owner) {
    res.status(401).json({ error: "no session" });
    return;
  }
  res.json({ summary: countVaultRecords(owner) });
});

/* -------------------------- AI Audit Bridge --------------------------- */
/**
 * Single-shot endpoint that:
 *   1. Receives the broker's session JWK + the list of vaulted records
 *      to audit + the operator's instruction.
 *   2. Decrypts each ciphertext in RAM using the session key.
 *   3. Feeds the plaintext to the local LLM under the chosen mode.
 *   4. Zeroizes both plaintext buffers and the JWK 'k' field.
 *   5. Re-encrypts the LLM response with the session key so the
 *      server never holds the plaintext after the call returns.
 *
 * The session key NEVER touches disk. The route does not log the
 * payload. The encrypted response can only be read by the broker's
 * browser, which holds the master key in localStorage.
 */
const auditSchema = z.object({
  message: z.string().min(1).max(8_000),
  mode: z.enum(["assist", "sales_call"]).optional().default("assist"),
  recordIds: z.array(z.string().uuid()).min(1).max(12),
  sessionJwk: z.object({
    kty: z.literal("oct"),
    k: z.string().min(16).max(512),
    alg: z.string().optional(),
    ext: z.boolean().optional(),
    key_ops: z.array(z.string()).optional(),
  }),
});

vaultRouter.post(
  "/audit",
  expressJson({ limit: "1mb" }),
  async (req, res) => {
    const owner = req.sessionUser?.id;
    if (!owner) {
      res.status(401).json({ error: "no session" });
      return;
    }
    const parsed = auditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Bad request." });
      return;
    }
    const { message, mode, recordIds, sessionJwk } = parsed.data;

    try {
      // We make a shallow clone of the JWK so blindAudit can zeroize
      // its 'k' field without us losing the ability to seal the
      // response. We retain a second short-lived copy for sealResponse,
      // which itself zeroizes that copy.
      const auditJwk: JsonWebKey = { ...sessionJwk } as JsonWebKey;
      const sealJwk: JsonWebKey = { ...sessionJwk } as JsonWebKey;

      const llmReply = await blindAudit({
        ownerId: owner,
        recordIds,
        sessionJwk: auditJwk,
        audit: async (plaintexts) => {
          const overlay = mode === "sales_call" ? SALES_CALL_REVIEW : ASSIST_MODE;
          const contextText = [
            "VAULTED MATERIAL (decrypted in RAM, NOT persisted):",
            ...plaintexts.map((p, i) => `--- VAULT RECORD #${i + 1} ---\n${p.slice(0, 12_000)}`),
          ].join("\n\n");
          const r = await deskChat({
            modeOverlay: overlay,
            userMessage: message,
            contextText,
            temperature: mode === "sales_call" ? 0.3 : 0.45,
          });
          return r;
        },
      });

      // Belt-and-suspenders: also blank our local handle to the JWK 'k'.
      try {
        (sessionJwk as { k?: string }).k = "";
      } catch {
        /* ignore */
      }

      const sealed = await sealResponse(sealJwk, llmReply.content);

      res.json({
        ok: llmReply.ok,
        degraded: llmReply.degraded,
        model: llmReply.model,
        mode,
        // The plaintext response NEVER touches the wire.
        // The browser decrypts this with the same master key.
        sealed,
      });
    } catch (err) {
      logError("[vault/audit]", err);
      res.status(200).json({
        ok: false,
        degraded: "vault audit failed",
        sealed: null,
        plain: withDisclaimer("Vault audit failed in volatile memory. Try again."),
      });
    }
  },
);
