/** Jersey only — (re)create mobile demo client. Never touches admin or other users. */
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";

const username = "demo";
const password = "demo123";
const db = new Database("data/wallstreet.db");
const hash = bcrypt.hashSync(password, 12);
const now = new Date().toISOString();
const row = db.prepare("SELECT id FROM users WHERE username = ?").get(username);

if (row) {
  db.prepare("UPDATE users SET password_hash = ?, role = 'user' WHERE username = ?").run(hash, username);
} else {
  const id = randomUUID();
  db.prepare(
    "INSERT INTO users (id, username, password_hash, role, credits, created_at) VALUES (?, ?, ?, 'user', 0, ?)",
  ).run(id, username, hash, now);
  try {
    db.prepare(
      "INSERT INTO ledger_entries (id, user_id, amount_delta, reason, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(randomUUID(), id, 10000, "demo_seed", null, now);
  } catch {
    /* ledger optional */
  }
}

console.log(`[jersey] mobile demo: ${username} / ${password}`);
