/**
 * CRM Track Pixels — outbound conversion / postback fire log (legacy broker CRM parity).
 */
import { getDb } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";

export type TrackPixelRow = {
  id: number;
  url: string | null;
  post_fields: string | null;
  created_at: string;
  type: string | null;
  pixel_type: string | null;
  pixel_function: string | null;
  response: string | null;
  response_status: string | null;
  deposit_id: string | null;
  transaction_id: string | null;
  user_id: string | null;
  tracking_type: string | null;
};

export type TrackPixelQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

let schemaReady = false;

function seedDemoRows(): void {
  const db = getDb();
  ensureUserProfilesSchema();
  const user = db.prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1").get() as { id: string } | undefined;
  const userId = user?.id ?? null;
  const ins = db.prepare(
    `INSERT INTO crm_track_pixel
     (url, post_fields, type, pixel_type, pixel_function, response, response_status,
      deposit_id, transaction_id, user_id, tracking_type, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const rows: Array<[
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string | null,
    string | null,
    string | null,
    string,
    string,
  ]> = [
    [
      "https://partner.example/postback",
      "click_id=abc123&status=lead",
      "postback",
      "server",
      "registration",
      '{"ok":true}',
      "200",
      null,
      null,
      userId,
      "registration",
      "2026-05-28T10:12:01.000Z",
    ],
    [
      "https://aff.network/pixel.gif",
      "amount=500&currency=USD",
      "pixel",
      "image",
      "ftd",
      '{"received":1}',
      "200",
      "dep-88421",
      "txn-99102",
      userId,
      "deposit",
      "2026-05-27T16:44:22.000Z",
    ],
    [
      "https://tracker.io/hit",
      "event=login",
      "postback",
      "server",
      "login",
      "timeout",
      "504",
      null,
      null,
      userId,
      "login",
      "2026-05-26T09:01:55.000Z",
    ],
  ];
  for (const r of rows) ins.run(...r);
}

export function ensureTrackPixelsSchema(): void {
  if (schemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_track_pixel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      post_fields TEXT,
      type TEXT,
      pixel_type TEXT,
      pixel_function TEXT,
      response TEXT,
      response_status TEXT,
      deposit_id TEXT,
      transaction_id TEXT,
      user_id TEXT,
      tracking_type TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_track_pixel_created ON crm_track_pixel(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_track_pixel_user ON crm_track_pixel(user_id);
    CREATE INDEX IF NOT EXISTS idx_track_pixel_deposit ON crm_track_pixel(deposit_id);
  `);

  const count = db.prepare("SELECT COUNT(*) AS c FROM crm_track_pixel").get() as { c: number };
  if (count.c === 0) seedDemoRows();

  schemaReady = true;
}

const SORT_COLS: Record<string, string> = {
  id: "id",
  created_at: "created_at",
  url: "url",
  type: "type",
  pixel_type: "pixel_type",
  pixel_function: "pixel_function",
  response_status: "response_status",
  user_id: "user_id",
  tracking_type: "tracking_type",
};

export function listTrackPixels(q: TrackPixelQuery): {
  rows: TrackPixelRow[];
  total: number;
  page: number;
  limit: number;
} {
  ensureTrackPixelsSchema();
  const db = getDb();
  const page = Math.max(1, q.page ?? 1);
  const limit = Math.min(100, Math.max(10, q.limit ?? 25));
  const offset = (page - 1) * limit;
  const sortCol = SORT_COLS[q.sortBy ?? ""] ?? "id";
  const sortDir = q.sortDir === "asc" ? "ASC" : "DESC";

  const where: string[] = ["1=1"];
  const params: unknown[] = [];

  if (q.search?.trim()) {
    where.push(
      `(url LIKE ? OR post_fields LIKE ? OR type LIKE ? OR pixel_type LIKE ? OR pixel_function LIKE ?
        OR response LIKE ? OR response_status LIKE ? OR deposit_id LIKE ? OR transaction_id LIKE ?
        OR user_id LIKE ? OR tracking_type LIKE ?)`,
    );
    const like = `%${q.search.trim()}%`;
    params.push(like, like, like, like, like, like, like, like, like, like, like);
  }

  const whereSql = where.join(" AND ");
  const total = (db.prepare(`SELECT COUNT(*) AS c FROM crm_track_pixel WHERE ${whereSql}`).get(...params) as {
    c: number;
  }).c;

  const rows = db
    .prepare(
      `SELECT id, url, post_fields, created_at, type, pixel_type, pixel_function,
              response, response_status, deposit_id, transaction_id, user_id, tracking_type
       FROM crm_track_pixel WHERE ${whereSql}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as TrackPixelRow[];

  return { rows, total, page, limit };
}
