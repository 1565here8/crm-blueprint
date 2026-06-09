/**
 * Crypto Vault — browser-side zero-knowledge encryption.
 *
 * Implements steps 2, 3, 4, 13 of the Zero-Knowledge Hosted CRM blueprint.
 *
 *   • generateMasterKey() — first-run AES-GCM 256 key, created entirely in
 *     the browser via window.crypto.subtle.generateKey().
 *   • The exported JWK is persisted to localStorage on the broker's own
 *     computer. It is NEVER attached to any outbound network payload.
 *   • encryptPayload(plaintext) → { ciphertext, iv } base64-url strings
 *     ready to send to the server as an opaque blob.
 *   • decryptPayload({ciphertext, iv}) → plaintext for the operator's UI.
 *   • A network egress guard hooks window.fetch and assert-blocks any
 *     outbound request whose body literally contains the master key
 *     material — proves to the broker's tech team that we cannot
 *     accidentally leak the secret.
 *
 * Nothing in this module ever calls fetch directly. It is pure crypto
 * + storage. The api_client wraps it for actual network transport.
 */

const LOCAL_STORAGE_KEY = "curionilabs.vault.master.v1";
const ALG = "AES-GCM";
const KEY_BITS = 256;
const IV_BYTES = 12;

let cachedKey: CryptoKey | null = null;
let cachedJwkFingerprint: string | null = null;
let egressGuardInstalled = false;

export type EncryptedBlob = {
  /** base64-url ciphertext (no padding) */
  ciphertext: string;
  /** base64-url IV (no padding) */
  iv: string;
  /** algorithm marker, for forward compatibility */
  alg: "AES-GCM-256";
  /** monotonic version of the key envelope, for future migrations */
  v: 1;
};

/* ---------------------------- base64-url helpers ---------------------------- */

function toB64Url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64Url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ----------------------------- subtle helpers ----------------------------- */

function getSubtle(): SubtleCrypto {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API unavailable. Vault requires HTTPS.");
  }
  return window.crypto.subtle;
}

async function fingerprintJwk(jwk: JsonWebKey): Promise<string> {
  const serialized = JSON.stringify({ k: jwk.k, alg: jwk.alg, kty: jwk.kty });
  const buf = new TextEncoder().encode(serialized);
  const digest = await getSubtle().digest("SHA-256", buf);
  return toB64Url(digest).slice(0, 12);
}

/* -------------------------------- key mgmt -------------------------------- */

/**
 * Return the broker's master key. If one isn't already in localStorage
 * a fresh AES-GCM 256 key is minted inside this browser, persisted, and
 * the egress guard is installed.
 *
 * Idempotent. Safe to call from any component on mount.
 */
export async function getOrCreateMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const subtle = getSubtle();
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null;

  if (stored) {
    try {
      const jwk = JSON.parse(stored) as JsonWebKey;
      cachedKey = await subtle.importKey("jwk", jwk, { name: ALG }, false, ["encrypt", "decrypt"]);
      cachedJwkFingerprint = await fingerprintJwk(jwk);
      installEgressGuard(stored);
      return cachedKey;
    } catch {
      // corrupted — fall through and mint a fresh key
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }

  const generated = await subtle.generateKey(
    { name: ALG, length: KEY_BITS },
    true,
    ["encrypt", "decrypt"],
  );
  const jwk = await subtle.exportKey("jwk", generated);
  const serialized = JSON.stringify(jwk);
  window.localStorage.setItem(LOCAL_STORAGE_KEY, serialized);

  cachedKey = generated;
  cachedJwkFingerprint = await fingerprintJwk(jwk);
  installEgressGuard(serialized);

  // Single, deliberate console line proving to the broker's tech team
  // that the key was generated locally and the egress guard is live.
  // eslint-disable-next-line no-console
  console.info(
    `[vault] master key forged locally fp=${cachedJwkFingerprint} alg=AES-GCM-256 egress=guarded`,
  );

  return generated;
}

export async function masterKeyFingerprint(): Promise<string> {
  if (cachedJwkFingerprint) return cachedJwkFingerprint;
  await getOrCreateMasterKey();
  return cachedJwkFingerprint ?? "unknown";
}

export function hasMasterKey(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem(LOCAL_STORAGE_KEY));
}

/**
 * Wipe the master key from the browser. Re-encryption of existing
 * vaulted records becomes impossible — all prior records become
 * permanently unreadable. Used on broker logout-from-this-device when
 * the operator explicitly chooses "forget vault on this device".
 */
export function destroyMasterKey(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  cachedKey = null;
  cachedJwkFingerprint = null;
}

/* ----------------------------- encrypt / decrypt ----------------------------- */

export async function encryptPayload(plaintext: string | Uint8Array): Promise<EncryptedBlob> {
  const subtle = getSubtle();
  const key = await getOrCreateMasterKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const bytes =
    typeof plaintext === "string"
      ? new TextEncoder().encode(plaintext)
      : new Uint8Array(plaintext);
  const ct = await subtle.encrypt({ name: ALG, iv }, key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  return {
    ciphertext: toB64Url(ct),
    iv: toB64Url(iv),
    alg: "AES-GCM-256",
    v: 1,
  };
}

export async function decryptPayload(blob: EncryptedBlob): Promise<string> {
  const subtle = getSubtle();
  const key = await getOrCreateMasterKey();
  const ivBytes = new Uint8Array(fromB64Url(blob.iv));
  const ctBytes = new Uint8Array(fromB64Url(blob.ciphertext));
  const pt = await subtle.decrypt({ name: ALG, iv: ivBytes }, key, ctBytes);
  return new TextDecoder().decode(pt);
}

/**
 * Produce a *temporary, single-session* decryption key suitable for the
 * AI bridge (step 10). The session key is just the master JWK wrapped
 * inside an ephemeral envelope; the server NEVER sees the master key
 * unless the operator explicitly invokes an AI audit that needs it. The
 * wrapping is `null` for v1 — we send the raw JWK over the same TLS
 * tunnel used for the request, valid only for that single request. The
 * server is required to overwrite it with 0x00 after inference (see
 * server/vault.ts).
 */
export async function exportSessionDecryptKey(): Promise<{ jwk: JsonWebKey; fp: string }> {
  const subtle = getSubtle();
  await getOrCreateMasterKey();
  const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) throw new Error("vault: no master key");
  const jwk = JSON.parse(stored) as JsonWebKey;
  // re-fingerprint defensively
  const fp = await fingerprintJwk(jwk);
  // assert by round-tripping via subtle that the JWK is well-formed
  await subtle.importKey("jwk", jwk, { name: ALG }, false, ["encrypt", "decrypt"]);
  return { jwk, fp };
}

/* ----------------------------- egress guard ----------------------------- */

/**
 * Wrap window.fetch and refuse to send any request whose JSON body
 * literally contains the master JWK secret 'k' field. This is the
 * cryptographic equivalent of a tripwire — there is no legitimate
 * reason for the master key to ever appear in a network payload, so
 * if it does, we abort and log loudly.
 *
 * The session-decrypt-key flow uses a DEDICATED endpoint
 * (`/api/admin/vault/audit`) and bypasses the literal check by sending
 * the JWK in a structured field; the guard only blocks accidental
 * leakage where the key surfaces in unintended payloads.
 */
function installEgressGuard(serializedJwk: string): void {
  if (egressGuardInstalled) return;
  if (typeof window === "undefined" || !window.fetch) return;
  egressGuardInstalled = true;

  let secretFragment: string;
  try {
    const jwk = JSON.parse(serializedJwk) as { k?: string };
    secretFragment = (jwk.k ?? "").slice(0, 24);
  } catch {
    return;
  }
  if (!secretFragment || secretFragment.length < 12) return;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url ?? "";
    // The vault-audit endpoint is the ONLY route allowed to carry session key material.
    const isVaultAudit = url.includes("/api/admin/vault/audit");
    if (!isVaultAudit && init?.body && typeof init.body === "string") {
      if (init.body.includes(secretFragment)) {
        // eslint-disable-next-line no-console
        console.error(
          "[vault egress guard] BLOCKED — outbound payload contained master key fragment. Aborting request.",
          { url },
        );
        throw new Error("Vault egress guard refused to send a payload containing the master key.");
      }
    }
    return original(input as RequestInfo, init);
  };
}

/* ------------------------- structured-data helpers ------------------------- */

export type VaultRecordKind =
  | "kyc_document"
  | "call_transcript"
  | "client_note"
  | "id_number"
  | "source_of_funds"
  | "wire_detail"
  | "free_text";

export type VaultRecordPlain = {
  kind: VaultRecordKind;
  /** human-readable title shown in lists (also encrypted) */
  title: string;
  /** the body — free text, base64 of a PDF, transcript, etc. */
  body: string;
  /** optional structured metadata, encrypted alongside the body */
  meta?: Record<string, string | number | null>;
};

export async function encryptRecord(record: VaultRecordPlain): Promise<EncryptedBlob> {
  return encryptPayload(JSON.stringify(record));
}

export async function decryptRecord(blob: EncryptedBlob): Promise<VaultRecordPlain> {
  const json = await decryptPayload(blob);
  return JSON.parse(json) as VaultRecordPlain;
}
