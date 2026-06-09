/**
 * CRM OAuth Clients — affiliate / API partner credentials (legacy broker CRM parity).
 */
import { createHash, randomBytes } from "crypto";
import { getDb } from "./db";

export type OAuthClientRow = {
  id: number;
  name: string;
  public_id: string;
  campaign_ids: string;
  disabled: number;
  secret_hash: string | null;
  created_at: string;
  meta_json: string | null;
};

export type OAuthClientQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export type OAuthClientCreateInput = {
  name: string;
  campaignIds?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};

export type OAuthClientUpdateInput = {
  name?: string;
  campaignIds?: string;
  disabled?: boolean;
  meta?: Record<string, unknown>;
};

let schemaReady = false;

function generatePublicId(): string {
  return randomBytes(32).toString("hex");
}

function generateClientSecret(): string {
  return randomBytes(24).toString("hex");
}

function hashSecret(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function rowToClient(row: OAuthClientRow): OAuthClientRow {
  return { ...row };
}

function seedSampleRows(): void {
  const db = getDb();
  const ins = db.prepare(
    `INSERT INTO crm_oauth_client
     (name, public_id, campaign_ids, disabled, secret_hash, created_at, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const samples: Array<[string, string, string, number, string | null, string, string | null]> = [
    ["Test Aff", generatePublicId(), "12,44", 0, null, "2024-03-15T09:22:11.000Z", null],
    ["testapi", generatePublicId(), "7", 0, hashSecret("demo-secret-testapi"), "2024-04-02T14:05:33.000Z", null],
    ["Amazon", generatePublicId(), "101,102,103", 0, null, "2024-05-10T08:00:00.000Z", null],
    ["Vertical", generatePublicId(), "55", 1, null, "2024-06-18T16:30:45.000Z", null],
    ["Potatoes", generatePublicId(), "3,9", 0, null, "2025-01-07T11:11:11.000Z", null],
  ];
  for (const r of samples) ins.run(...r);
}

export function ensureOAuthClientsSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_oauth_client (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      public_id TEXT NOT NULL UNIQUE,
      campaign_ids TEXT NOT NULL DEFAULT '',
      disabled INTEGER NOT NULL DEFAULT 0,
      secret_hash TEXT,
      created_at TEXT NOT NULL,
      meta_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_client_name ON crm_oauth_client(name);
    CREATE INDEX IF NOT EXISTS idx_oauth_client_public ON crm_oauth_client(public_id);
    CREATE INDEX IF NOT EXISTS idx_oauth_client_created ON crm_oauth_client(created_at DESC);
  `);

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_oauth_client").get() as { c: number };
  if (count.c === 0) seedSampleRows();

  schemaReady = true;
}

const SORT_COLS: Record<string, string> = {
  id: "id",
  name: "name",
  public_id: "public_id",
  campaign_ids: "campaign_ids",
  disabled: "disabled",
  created_at: "created_at",
};

export function listOAuthClients(q: OAuthClientQuery): {
  rows: OAuthClientRow[];
  total: number;
  page: number;
  limit: number;
} {
  ensureOAuthClientsSchema();
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(10, q.limit ?? 10));
  const offset = (page - 1) * limit;
  const sortCol = SORT_COLS[q.sortBy ?? ""] ?? "id";
  const sortDir = q.sortDir === "asc" ? "ASC" : "DESC";

  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (q.search?.trim()) {
    where.push("(name LIKE ? OR public_id LIKE ? OR campaign_ids LIKE ?)");
    const like = `%${q.search.trim()}%`;
    params.push(like, like, like);
  }

  const whereSql = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_oauth_client WHERE ${whereSql}`).get(...params) as {
    c: number;
  }).c;

  const rows = db
    .prepare(
      `SELECT id, name, public_id, campaign_ids, disabled, secret_hash, created_at, meta_json
       FROM crm_oauth_client WHERE ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as OAuthClientRow[];

  return { rows, total, page, limit };
}

export function getOAuthClient(id: number): OAuthClientRow | null {
  ensureOAuthClientsSchema();
  const row = getDb()
    .prepare(
      `SELECT id, name, public_id, campaign_ids, disabled, secret_hash, created_at, meta_json
       FROM crm_oauth_client WHERE id = ?`,
    )
    .get(id) as OAuthClientRow | undefined;
  return row ? rowToClient(row) : null;
}

export function createOAuthClient(input: OAuthClientCreateInput): { client: OAuthClientRow; clientSecret: string } {
  ensureOAuthClientsSchema();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required.");

  const publicId = generatePublicId();
  const clientSecret = generateClientSecret();
  const now = new Date().toISOString();
  const campaignIds = (input.campaignIds ?? "").trim();
  const disabled = input.disabled ? 1 : 0;
  const metaJson = input.meta ? JSON.stringify(input.meta) : null;

  const r = getDb()
    .prepare(
      `INSERT INTO crm_oauth_client
       (name, public_id, campaign_ids, disabled, secret_hash, created_at, meta_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(name, publicId, campaignIds, disabled, hashSecret(clientSecret), now, metaJson);

  const client = getOAuthClient(Number(r.lastInsertRowid));
  if (!client) throw new Error("Could not create OAuth client.");
  return { client, clientSecret };
}

export function updateOAuthClient(id: number, input: OAuthClientUpdateInput): OAuthClientRow | null {
  ensureOAuthClientsSchema();
  const existing = getOAuthClient(id);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) throw new Error("Name is required.");

  const campaignIds = input.campaignIds !== undefined ? input.campaignIds.trim() : existing.campaign_ids;
  const disabled = input.disabled !== undefined ? (input.disabled ? 1 : 0) : existing.disabled;
  const metaJson =
    input.meta !== undefined ? (input.meta ? JSON.stringify(input.meta) : null) : existing.meta_json;

  getDb()
    .prepare(
      `UPDATE crm_oauth_client
       SET name = ?, campaign_ids = ?, disabled = ?, meta_json = ?
       WHERE id = ?`,
    )
    .run(name, campaignIds, disabled, metaJson, id);

  return getOAuthClient(id);
}

export function toggleOAuthClientDisabled(id: number): OAuthClientRow | null {
  ensureOAuthClientsSchema();
  const existing = getOAuthClient(id);
  if (!existing) return null;

  const next = existing.disabled ? 0 : 1;
  getDb().prepare("UPDATE crm_oauth_client SET disabled = ? WHERE id = ?").run(next, id);
  return getOAuthClient(id);
}
