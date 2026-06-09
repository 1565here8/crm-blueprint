import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.CURIONILABS_DB ?? path.join(__dirname, "..", "data", "enquiries.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS broker_enquiries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company TEXT NOT NULL,
        market TEXT,
        message TEXT,
        created_at TEXT NOT NULL
      )
    `);
  }
  return db;
}

export type BrokerEnquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string;
  market: string | null;
  message: string | null;
  created_at: string;
};

export function insertEnquiry(row: Omit<BrokerEnquiry, "created_at"> & { created_at?: string }): BrokerEnquiry {
  const created_at = row.created_at ?? new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO broker_enquiries (id, name, email, phone, company, market, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(row.id, row.name, row.email, row.phone ?? null, row.company, row.market ?? null, row.message ?? null, created_at);
  return getDb().prepare("SELECT * FROM broker_enquiries WHERE id = ?").get(row.id) as BrokerEnquiry;
}
