import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "wallstreet.db"));
db.pragma("foreign_keys = ON");

const rows = db
  .prepare(
    `SELECT u.id FROM users u
     JOIN user_profiles p ON p.user_id = u.id
     WHERE u.role = 'user' AND (
       LOWER(u.username) LIKE '%import%' OR LOWER(p.imported_source) LIKE '%csv%'
     )`,
  )
  .all();

const ids = rows.map((r) => r.id);
console.log("found", ids.length);

const tables = [
  "pending_orders",
  "executions",
  "positions",
  "ledger_entries",
  "crm_notes",
  "crm_emails",
  "deposit_requests",
  "wire_requests",
];

const purge = db.transaction((id) => {
  for (const t of tables) {
    try {
      db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(id);
    } catch {
      /* optional table */
    }
  }
  for (const t of ["desk_tasks", "drip_history"]) {
    try {
      db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(id);
    } catch {
      /* optional */
    }
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
});

const tx = db.transaction(() => {
  for (const id of ids) purge(id);
});
tx();

const left = db
  .prepare(
    `SELECT COUNT(*) AS c FROM users u WHERE u.role = 'user' AND LOWER(u.username) LIKE '%import%'`,
  )
  .get();
console.log(JSON.stringify({ deleted: ids.length, importUsersRemaining: left.c }));
