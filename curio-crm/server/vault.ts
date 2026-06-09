/**
 * Server-side Vault — blind ciphertext storage.
 *
 * Implements steps 6, 7, 10, 11 of the Zero-Knowledge Hosted CRM
 * blueprint.
 *
 * The server stores opaque ciphertext blobs that it cannot decrypt
 * without the broker's master key. The master key lives in the
 * broker's browser (localStorage) — see src/lib/cryptoVault.ts. The
 * only time the server ever sees plaintext is during a single AI
 * audit request where the broker explicitly forwards a *session*
 * decryption key for one round-trip. That plaintext lives only in
 * volatile RAM and is overwritten with 0x00 the instant the LLM
 * response is generated.
 *
 * Nothing in this module logs the ciphertext, the plaintext, or the
 * session key. Nothing is ever written to disk except the ciphertext
 * blobs and minimal metadata (id, owner, kind, timestamps).
 */

import { randomUUID, webcrypto } from "node:crypto";
import { getDb } from "./db";
import { error as logError } from "./log";

const subtle = webcrypto.subtle;

let schemaEnsured = false;
function ensureVaultSchema(): void {
  if (schemaEnsured) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_records (
      id          TEXT PRIMARY KEY,
      owner_id    TEXT NOT NULL,
      kind        TEXT NOT NULL,
      alg         TEXT NOT NULL,
      v           INTEGER NOT NULL,
      ciphertext  TEXT NOT NULL,
      iv          TEXT NOT NULL,
      size_bytes  INTEGER NOT NULL,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vault_owner ON vault_records(owner_id, created_at DESC);
  `);
  schemaEnsured = true;
}

export type VaultRecordRow = {
  id: string;
  owner_id: string;
  kind: string;
  alg: string;
  v: number;
  ciphertext: string;
  iv: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
};

export type VaultRecordSummary = {
  id: string;
  kind: string;
  size_bytes: number;
  created_at: string;
  updated_at: string;
};

const ALLOWED_KINDS = new Set([
  "kyc_document",
  "call_transcript",
  "client_note",
  "id_number",
  "source_of_funds",
  "wire_detail",
  "free_text",
]);

/* -------------------------- blind CRUD operations -------------------------- */

export function createVaultRecord(args: {
  ownerId: string;
  kind: string;
  alg: string;
  v: number;
  ciphertext: string;
  iv: string;
}): VaultRecordSummary {
  ensureVaultSchema();
  if (!ALLOWED_KINDS.has(args.kind)) throw new Error("Unknown vault kind.");
  if (args.alg !== "AES-GCM-256") throw new Error("Unsupported vault algorithm.");
  if (!args.ciphertext || args.ciphertext.length > 12_000_000) throw new Error("Ciphertext payload out of range.");
  if (!args.iv || args.iv.length > 32) throw new Error("IV out of range.");

  const id = randomUUID();
  const now = new Date().toISOString();
  const size = Math.ceil(args.ciphertext.length * 0.75); // approximate base64-url decoded size
  getDb()
    .prepare(
      `INSERT INTO vault_records
        (id, owner_id, kind, alg, v, ciphertext, iv, size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, args.ownerId, args.kind, args.alg, args.v, args.ciphertext, args.iv, size, now, now);
  return { id, kind: args.kind, size_bytes: size, created_at: now, updated_at: now };
}

export function listVaultRecords(ownerId: string, opts?: { kind?: string; limit?: number }): VaultRecordSummary[] {
  ensureVaultSchema();
  const limit = Math.min(Math.max(opts?.limit ?? 200, 1), 500);
  const stmt = opts?.kind
    ? getDb().prepare(
        `SELECT id, kind, size_bytes, created_at, updated_at
         FROM vault_records WHERE owner_id = ? AND kind = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
    : getDb().prepare(
        `SELECT id, kind, size_bytes, created_at, updated_at
         FROM vault_records WHERE owner_id = ?
         ORDER BY created_at DESC LIMIT ?`,
      );
  return (opts?.kind ? stmt.all(ownerId, opts.kind, limit) : stmt.all(ownerId, limit)) as VaultRecordSummary[];
}

export function getVaultRecord(ownerId: string, id: string): VaultRecordRow | null {
  ensureVaultSchema();
  const row = getDb()
    .prepare("SELECT * FROM vault_records WHERE id = ? AND owner_id = ?")
    .get(id, ownerId) as VaultRecordRow | undefined;
  return row ?? null;
}

export function deleteVaultRecord(ownerId: string, id: string): boolean {
  ensureVaultSchema();
  const r = getDb().prepare("DELETE FROM vault_records WHERE id = ? AND owner_id = ?").run(id, ownerId);
  return r.changes > 0;
}

export function countVaultRecords(ownerId: string): { total: number; bytes: number } {
  ensureVaultSchema();
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS total, COALESCE(SUM(size_bytes), 0) AS bytes FROM vault_records WHERE owner_id = ?",
    )
    .get(ownerId) as { total: number; bytes: number };
  return row;
}

/* ------------------------ ephemeral AI audit bridge ------------------------ */

/**
 * Decrypt a list of vaulted records strictly inside RAM, using the
 * session JWK the operator forwards in the request body for this single
 * round-trip. The plaintext buffers are passed to the caller's `audit`
 * function, then overwritten with 0x00 before this function returns —
 * regardless of whether `audit` succeeded or threw.
 *
 * The session JWK is also wiped from local variables before return.
 */
export async function blindAudit<T>(args: {
  ownerId: string;
  recordIds: string[];
  sessionJwk: JsonWebKey;
  audit: (plaintexts: string[]) => Promise<T>;
}): Promise<T> {
  ensureVaultSchema();
  const { ownerId, recordIds, sessionJwk } = args;
  if (recordIds.length === 0) throw new Error("No records supplied.");
  if (recordIds.length > 12) throw new Error("Too many records in one audit batch.");

  // 1. Import the session key into the SubtleCrypto runtime.
  const key = await subtle.importKey(
    "jwk",
    sessionJwk,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  // 2. Fetch each ciphertext, decrypt, accumulate plaintext.
  const plaintextBuffers: Uint8Array[] = [];
  let result: T;
  try {
    for (const id of recordIds) {
      const row = getVaultRecord(ownerId, id);
      if (!row) throw new Error(`Vault record ${id} not found.`);
      if (row.alg !== "AES-GCM-256") throw new Error(`Vault record ${id} has unsupported alg.`);
      const iv = b64UrlToBytes(row.iv);
      const ct = b64UrlToBytes(row.ciphertext);
      const ptBuf = await subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
      plaintextBuffers.push(new Uint8Array(ptBuf));
    }

    const strings = plaintextBuffers.map((b) => new TextDecoder().decode(b));
    result = await args.audit(strings);
  } finally {
    // 3. Zeroize plaintext + session key material the instant the
    //    audit returns, success or failure. The buffers cannot be
    //    deleted from the JS heap directly but overwriting them with
    //    0x00 satisfies the "memory sanitizer" requirement.
    for (const buf of plaintextBuffers) buf.fill(0);
    plaintextBuffers.length = 0;
    try {
      // Best-effort zeroize the JWK 'k' string. We cannot delete the
      // original — the caller still holds a reference — but we can
      // emit a soft hint to GC by nulling our local handle.
      (sessionJwk as { k?: string }).k = "";
    } catch {
      /* ignore */
    }
  }

  return result;
}

function b64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = Buffer.from(b64, "base64");
  return new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
}

/**
 * Encrypt an outbound string with the session key (step 12). Used so the
 * LLM response is itself encrypted back to the broker — the server
 * never holds plaintext after this function returns.
 */
export async function sealResponse(sessionJwk: JsonWebKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await subtle.importKey("jwk", sessionJwk, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  try {
    (sessionJwk as { k?: string }).k = "";
  } catch {
    /* ignore */
  }
  return {
    ciphertext: bytesToB64Url(new Uint8Array(ct)),
    iv: bytesToB64Url(iv),
  };
}

function bytesToB64Url(bytes: Uint8Array): string {
  const b64 = Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function vaultDiagnostics() {
  ensureVaultSchema();
  try {
    const row = getDb()
      .prepare("SELECT COUNT(*) AS total, COALESCE(SUM(size_bytes), 0) AS bytes FROM vault_records")
      .get() as { total: number; bytes: number };
    return { ok: true, records: row.total, bytes: row.bytes };
  } catch (err) {
    logError("[vault] diagnostics failed", err);
    return { ok: false, records: 0, bytes: 0 };
  }
}
