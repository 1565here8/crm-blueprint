import { createRequire } from "node:module";
import type { SqlDriver } from "./driver";
import { SqliteDriver } from "./sqliteDriver";

const _require = createRequire(import.meta.url);

function canLoadBetterSqlite3(): boolean {
  try {
    _require("better-sqlite3");
    return true;
  } catch {
    return false;
  }
}

export function createSqliteDriver(dbPath: string): SqlDriver {
  if (canLoadBetterSqlite3()) {
    return new SqliteDriver(dbPath);
  }
  throw new Error(
    "better-sqlite3 is required for SQLite support on this Node version. " +
    "Run: npm install better-sqlite3",
  );
}
