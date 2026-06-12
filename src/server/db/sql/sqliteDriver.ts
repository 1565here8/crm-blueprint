import Database from "better-sqlite3";
import type { SqlDriver } from "./driver";

export class SqliteDriver implements SqlDriver {
  readonly dialect = "sqlite" as const;
  private readonly db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  async exec(sql: string, params: unknown[] = []) {
    this.db.prepare(sql).run(...params);
  }

  async get<T>(sql: string, params: unknown[] = []) {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []) {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async close() {
    this.db.close();
  }
}
