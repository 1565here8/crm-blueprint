import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { SqlDriver } from "./driver";

/** SQLite via Node's built-in `node:sqlite` — no native rebuild when Node is upgraded. */
export class NodeBuiltinSqliteDriver implements SqlDriver {
  readonly dialect = "sqlite" as const;
  private readonly db: DatabaseSync;

  constructor(location: string) {
    if (location !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(location)), { recursive: true });
    }
    this.db = new DatabaseSync(location);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
  }

  async exec(sql: string, params: unknown[] = []) {
    if (params.length) {
      this.db.prepare(sql).run(...params as SQLInputValue[]);
    } else {
      this.db.exec(sql);
    }
  }

  async get<T>(sql: string, params: unknown[] = []) {
    return this.db.prepare(sql).get(...params as SQLInputValue[]) as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []) {
    return this.db.prepare(sql).all(...params as SQLInputValue[]) as T[];
  }

  async close() {
    this.db.close();
  }
}
