import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "wallstreet.db");
if (!fs.existsSync(dbPath)) {
  console.log("No database yet — start the app once to create Admin automatically.");
  process.exit(0);
}

const db = new Database(dbPath);
const hash = bcrypt.hashSync("BabaSali", 12);
const result = db
  .prepare("UPDATE users SET username = ?, password_hash = ? WHERE role = 'admin'")
  .run("Admin", hash);

console.log(`Updated ${result.changes} admin account(s).`);
