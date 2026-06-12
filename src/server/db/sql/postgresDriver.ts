import pg from "pg";
import type { SqlDriver } from "./driver";

const { Pool } = pg;

export class PostgresDriver implements SqlDriver {
  readonly dialect = "postgres" as const;
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    const maxRaw = Number(process.env.PG_POOL_MAX ?? 20);
    const max = Number.isFinite(maxRaw) && maxRaw >= 1 ? Math.min(Math.floor(maxRaw), 200) : 20;
    this.pool = new Pool({ connectionString, max });
  }

  async exec(sql: string, params: unknown[] = []) {
    await this.pool.query(sql, params);
  }

  async get<T>(sql: string, params: unknown[] = []) {
    const result = await this.pool.query(sql, params);
    return result.rows[0] as T | undefined;
  }

  async all<T>(sql: string, params: unknown[] = []) {
    const result = await this.pool.query(sql, params);
    return result.rows as T[];
  }

  async close() {
    await this.pool.end();
  }
}
