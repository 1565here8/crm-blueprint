import path from "node:path";
import type { AdminMetrics, ID, Job, JobStatus, NetworkCoreMode } from "./models";
import type { SqlDriver } from "./sql/driver";
import { PostgresDriver } from "./sql/postgresDriver";
import { SCHEMA } from "./sql/schema";
import { createSqliteDriver } from "./sql/createSqliteDriver";
import { SqliteDriver } from "./sql/sqliteDriver";

const BOOTSTRAP_WINDOW_MS = 24 * 60 * 60 * 1000;
const REVOKED_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isoNow() {
  return new Date().toISOString();
}

function makeId(prefix: string): ID {
  return `${prefix}_${crypto.randomUUID()}`;
}

function starterTokenBalance() {
  const raw = Number(process.env.STARTER_TOKENS ?? 100);
  return Number.isFinite(raw) && raw >= 0 ? Math.min(Math.floor(raw), 1000) : 100;
}

function bootstrapLimitPerIp() {
  const raw = Number(process.env.BOOTSTRAP_MAX_PER_IP ?? 3);
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), 20) : 3;
}

type UserRow = {
  id: string;
  created_at: string;
  token_balance: number;
  tokens_updated_at: string;
  created_from_ip: string | null;
};

export class NetworkCoreStore {
  constructor(private readonly driver: SqlDriver) {}

  static async create(driver: SqlDriver) {
    const store = new NetworkCoreStore(driver);
    await store.migrate();
    await store.pruneRevokedTokens();
    return store;
  }

  private async migrate() {
    for (const statement of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
      await this.driver.exec(statement);
    }
  }

  async close() {
    await this.driver.close();
  }

  async pruneRevokedTokens() {
    const cutoff = new Date(Date.now() - REVOKED_TOKEN_TTL_MS).toISOString();
    const sql =
      this.driver.dialect === "postgres"
        ? "DELETE FROM revoked_tokens WHERE revoked_at < $1"
        : "DELETE FROM revoked_tokens WHERE revoked_at < ?";
    await this.driver.exec(sql, [cutoff]);
  }

  async revokeToken(jti: string) {
    if (!jti) return;
    const now = isoNow();
    if (this.driver.dialect === "postgres") {
      await this.driver.exec(
        "INSERT INTO revoked_tokens (jti, revoked_at) VALUES ($1, $2) ON CONFLICT (jti) DO NOTHING",
        [jti, now],
      );
    } else {
      await this.driver.exec(
        "INSERT OR IGNORE INTO revoked_tokens (jti, revoked_at) VALUES (?, ?)",
        [jti, now],
      );
    }
  }

  async isTokenRevoked(jti: string | undefined) {
    if (!jti) return false;
    const sql =
      this.driver.dialect === "postgres"
        ? "SELECT jti FROM revoked_tokens WHERE jti = $1"
        : "SELECT jti FROM revoked_tokens WHERE jti = ?";
    return Boolean(await this.driver.get<{ jti: string }>(sql, [jti]));
  }

  private async getUserRow(userId: ID) {
    const sql =
      this.driver.dialect === "postgres"
        ? "SELECT id, created_at, token_balance, tokens_updated_at, created_from_ip FROM users WHERE id = $1"
        : "SELECT id, created_at, token_balance, tokens_updated_at, created_from_ip FROM users WHERE id = ?";
    return this.driver.get<UserRow>(sql, [userId]);
  }

  async getUser(userId: ID) {
    const row = await this.getUserRow(userId);
    if (!row) return null;
    return {
      user: { id: row.id, createdAt: row.created_at },
      tokens: { userId: row.id, balance: row.token_balance, updatedAt: row.tokens_updated_at },
    };
  }

  async reserveBootstrapSlot(ip: string) {
    const key = ip || "unknown";
    const now = Date.now();
    const limit = bootstrapLimitPerIp();
    const row = await this.driver.get<{ count: number; window_start: number }>(
      this.driver.dialect === "postgres"
        ? "SELECT count, window_start FROM ip_bootstrap WHERE ip = $1"
        : "SELECT count, window_start FROM ip_bootstrap WHERE ip = ?",
      [key],
    );

    if (!row || now - row.window_start > BOOTSTRAP_WINDOW_MS) {
      if (this.driver.dialect === "postgres") {
        await this.driver.exec(
          `INSERT INTO ip_bootstrap (ip, count, window_start) VALUES ($1, 1, $2)
           ON CONFLICT (ip) DO UPDATE SET count = 1, window_start = $2`,
          [key, now],
        );
      } else {
        await this.driver.exec(
          "INSERT OR REPLACE INTO ip_bootstrap (ip, count, window_start) VALUES (?, 1, ?)",
          [key, now],
        );
      }
      return true;
    }

    if (row.count >= limit) return false;

    if (this.driver.dialect === "postgres") {
      const updated = await this.driver.get<{ count: number }>(
        `UPDATE ip_bootstrap SET count = count + 1 WHERE ip = $1 AND count < $2 RETURNING count`,
        [key, limit],
      );
      return Boolean(updated);
    }

    await this.driver.exec("UPDATE ip_bootstrap SET count = count + 1 WHERE ip = ? AND count < ?", [
      key,
      limit,
    ]);
    const after = await this.driver.get<{ count: number }>(
      "SELECT count FROM ip_bootstrap WHERE ip = ?",
      [key],
    );
    return Boolean(after && after.count > row.count);
  }

  async createUser(userId: ID, ip: string) {
    if (!(await this.reserveBootstrapSlot(ip))) {
      throw new Error("Bootstrap limit exceeded for this IP.");
    }
    const now = isoNow();
    const balance = starterTokenBalance();
    if (this.driver.dialect === "postgres") {
      await this.driver.exec(
        `INSERT INTO users (id, created_at, token_balance, tokens_updated_at, created_from_ip)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [userId, now, balance, now, ip || "unknown"],
      );
    } else {
      await this.driver.exec(
        `INSERT OR IGNORE INTO users (id, created_at, token_balance, tokens_updated_at, created_from_ip)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, now, balance, now, ip || "unknown"],
      );
    }
    const user = await this.getUser(userId);
    if (!user) throw new Error("Failed to create user.");
    return user;
  }

  async ensureAdminUser(userId: ID) {
    const existing = await this.getUser(userId);
    if (existing) return existing;
    const now = isoNow();
    const balance = starterTokenBalance();
    if (this.driver.dialect === "postgres") {
      await this.driver.exec(
        `INSERT INTO users (id, created_at, token_balance, tokens_updated_at) VALUES ($1, $2, $3, $4)`,
        [userId, now, balance, now],
      );
    } else {
      await this.driver.exec(
        "INSERT INTO users (id, created_at, token_balance, tokens_updated_at) VALUES (?, ?, ?, ?)",
        [userId, now, balance, now],
      );
    }
    return (await this.getUser(userId))!;
  }

  estimateTokenCost(query: string) {
    const chars = query.trim().length;
    return Math.max(5, Math.min(2000, Math.ceil(chars / 4)));
  }

  async tryConsumeTokens(userId: ID, amount: number) {
    const cost = Math.max(0, Math.floor(amount));
    const existing = await this.getUserRow(userId);
    if (!existing) return { success: false as const, balance: 0 };
    if (cost === 0) return { success: true as const, balance: existing.token_balance };

    const now = isoNow();
    if (this.driver.dialect === "postgres") {
      const row = await this.driver.get<{ token_balance: number }>(
        `UPDATE users SET token_balance = token_balance - $1, tokens_updated_at = $2
         WHERE id = $3 AND token_balance >= $1 RETURNING token_balance`,
        [cost, now, userId],
      );
      if (!row) return { success: false as const, balance: existing.token_balance };
      await this.driver.exec(
        "INSERT INTO admin_transactions (id, user_id, tokens_delta, reason, created_at) VALUES ($1, $2, $3, $4, $5)",
        [makeId("tx"), userId, -cost, `usage_charge:${cost}`, now],
      );
      return { success: true as const, balance: row.token_balance };
    }

    const before = await this.getUserRow(userId);
    if (!before || before.token_balance < cost) {
      return { success: false as const, balance: before?.token_balance ?? 0 };
    }
    await this.driver.exec(
      "UPDATE users SET token_balance = token_balance - ?, tokens_updated_at = ? WHERE id = ? AND token_balance >= ?",
      [cost, now, userId, cost],
    );
    const after = await this.getUserRow(userId);
    if (!after || after.token_balance !== before.token_balance - cost) {
      return { success: false as const, balance: after?.token_balance ?? before.token_balance };
    }
    await this.driver.exec(
      "INSERT INTO admin_transactions (id, user_id, tokens_delta, reason, created_at) VALUES (?, ?, ?, ?, ?)",
      [makeId("tx"), userId, -cost, `usage_charge:${cost}`, now],
    );
    return { success: true as const, balance: after.token_balance };
  }

  async refundTokens(userId: ID, amount: number) {
    const credit = Math.max(0, Math.floor(amount));
    if (credit === 0) return;
    const row = await this.getUserRow(userId);
    if (!row) return;
    const now = isoNow();
    if (this.driver.dialect === "postgres") {
      await this.driver.exec(
        "UPDATE users SET token_balance = token_balance + $1, tokens_updated_at = $2 WHERE id = $3",
        [credit, now, userId],
      );
    } else {
      await this.driver.exec(
        "UPDATE users SET token_balance = token_balance + ?, tokens_updated_at = ? WHERE id = ?",
        [credit, now, userId],
      );
    }
    await this.driver.exec(
      this.driver.dialect === "postgres"
        ? "INSERT INTO admin_transactions (id, user_id, tokens_delta, reason, created_at) VALUES ($1, $2, $3, $4, $5)"
        : "INSERT INTO admin_transactions (id, user_id, tokens_delta, reason, created_at) VALUES (?, ?, ?, ?, ?)",
      [makeId("tx"), userId, credit, `usage_refund:${credit}`, now],
    );
  }

  async appendTextHistory(entry: { userId: ID; role: "user" | "assistant"; content: string }) {
    if (!(await this.getUserRow(entry.userId))) throw new Error("Unknown user.");
    const now = isoNow();
    const params = [makeId("log"), entry.userId, entry.role, entry.content, now];
    if (this.driver.dialect === "postgres") {
      await this.driver.exec(
        "INSERT INTO text_history (id, user_id, role, content, created_at) VALUES ($1, $2, $3, $4, $5)",
        params,
      );
    } else {
      await this.driver.exec(
        "INSERT INTO text_history (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        params,
      );
    }
  }

  async createJob(job: { userId: ID; mode: NetworkCoreMode; status: JobStatus }): Promise<Job> {
    const created: Job = {
      id: makeId("job"),
      userId: job.userId,
      mode: job.mode,
      status: job.status,
      createdAt: isoNow(),
    };
    if (this.driver.dialect === "postgres") {
      await this.driver.exec(
        "INSERT INTO jobs (id, user_id, mode, status, created_at) VALUES ($1, $2, $3, $4, $5)",
        [created.id, created.userId, created.mode, created.status, created.createdAt],
      );
    } else {
      await this.driver.exec(
        "INSERT INTO jobs (id, user_id, mode, status, created_at) VALUES (?, ?, ?, ?, ?)",
        [created.id, created.userId, created.mode, created.status, created.createdAt],
      );
    }
    return created;
  }

  async finishJob(jobId: ID, status: JobStatus, errorMessage?: string) {
    const now = isoNow();
    if (this.driver.dialect === "postgres") {
      await this.driver.exec(
        "UPDATE jobs SET status = $1, finished_at = $2, error_message = $3 WHERE id = $4",
        [status, now, errorMessage ?? null, jobId],
      );
    } else {
      await this.driver.exec(
        "UPDATE jobs SET status = ?, finished_at = ?, error_message = ? WHERE id = ?",
        [status, now, errorMessage ?? null, jobId],
      );
    }
  }

  getDriver(): SqlDriver {
    return this.driver;
  }

  async getAdminMetrics(): Promise<AdminMetrics> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const isPg = this.driver.dialect === "postgres";

    const userCount = await this.driver.get<{ count: number }>(
      isPg ? "SELECT COUNT(*)::int AS count FROM users" : "SELECT COUNT(*) AS count FROM users",
    );
    const jobSummary = await this.driver.get<{ total: number; failed: number }>(
      isPg
        ? `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'failed')::int AS failed FROM jobs`
        : `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed FROM jobs`,
    );
    const queueRows = await this.driver.all<{
      mode: string;
      queued: number;
      running: number;
      completed30m: number;
    }>(
      isPg
        ? `SELECT mode,
             COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
             COUNT(*) FILTER (WHERE status = 'running')::int AS running,
             COUNT(*) FILTER (WHERE status = 'completed' AND finished_at >= $1)::int AS completed30m
           FROM jobs GROUP BY mode`
        : `SELECT mode,
             SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued,
             SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
             SUM(CASE WHEN status = 'completed' AND finished_at >= ? THEN 1 ELSE 0 END) AS completed30m
           FROM jobs GROUP BY mode`,
      [thirtyMinutesAgo],
    );
    const txRows = await this.driver.all<{
      id: string;
      user_id: string;
      tokens_delta: number;
      reason: string;
      created_at: string;
    }>(
      isPg
        ? "SELECT id, user_id, tokens_delta, reason, created_at FROM admin_transactions ORDER BY created_at DESC LIMIT 30"
        : "SELECT id, user_id, tokens_delta, reason, created_at FROM admin_transactions ORDER BY created_at DESC LIMIT 30",
    );

    const byMode = new Map(queueRows.map((r) => [r.mode, r]));
    return {
      summary: {
        registeredUsers: userCount?.count ?? 0,
        totalJobs: jobSummary?.total ?? 0,
        failedJobs: jobSummary?.failed ?? 0,
      },
      jobQueues: (["cloud", "local", "mesh"] as NetworkCoreMode[]).map((mode) => {
        const row = byMode.get(mode);
        return {
          mode,
          queued: row?.queued ?? 0,
          running: row?.running ?? 0,
          completed30m: row?.completed30m ?? 0,
        };
      }),
      transactionHistory: txRows.map((tx) => ({
        id: tx.id,
        userId: tx.user_id,
        tokensDelta: tx.tokens_delta,
        reason: tx.reason,
        createdAt: tx.created_at,
      })),
    };
  }
}

export function resolveDefaultSqlitePath() {
  const dir = process.env.DATA_DIR?.trim() || ".data";
  return process.env.DB_PATH?.trim() || path.join(dir, "store.sqlite");
}

export async function createDatabaseDriver(): Promise<SqlDriver> {
  const url = process.env.DATABASE_URL?.trim();
  if (url?.startsWith("postgres://") || url?.startsWith("postgresql://")) {
    return new PostgresDriver(url);
  }
  return createSqliteDriver(resolveDefaultSqlitePath());
}

export async function createDatabase() {
  return NetworkCoreStore.create(await createDatabaseDriver());
}

export async function createEphemeralDatabase() {
  return NetworkCoreStore.create(new SqliteDriver(":memory:"));
}
