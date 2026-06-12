export interface SqlDriver {
  readonly dialect: "postgres" | "sqlite";
  exec(sql: string, params?: unknown[]): Promise<void>;
  get<T>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}
