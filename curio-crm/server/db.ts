import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID, createHash, randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import type { AssetClass, Execution, LedgerEntry, OrderSide, OrderType, Position, PositionSide, User, UserRole } from "./types";
import { log } from "./log";
import { initPaymentGatewayTables } from "./paymentGateways";
import { assertDepositWithinLimits, resolveDepositLimitContext } from "./depositLimits";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "wallstreet.db");

let db: Database.Database | null = null;

function getDb() {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    bootstrapAdmin(db);
  }
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      credits REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      amount_delta REAL NOT NULL,
      reason TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_entries(user_id);

    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      asset_class TEXT NOT NULL CHECK(asset_class IN ('us_equity', 'crypto')),
      qty REAL NOT NULL,
      side TEXT NOT NULL CHECK(side IN ('long', 'short')),
      entry_price REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      exit_price REAL,
      pnl REAL,
      opened_by TEXT REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, status);

    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      position_id TEXT REFERENCES positions(id),
      symbol TEXT NOT NULL,
      asset_class TEXT NOT NULL CHECK(asset_class IN ('us_equity', 'crypto')),
      side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
      order_type TEXT NOT NULL CHECK(order_type IN ('MARKET', 'LIMIT')),
      qty REAL NOT NULL,
      fill_price REAL NOT NULL,
      notional REAL NOT NULL,
      created_at TEXT NOT NULL,
      actor_id TEXT REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_executions_user ON executions(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS crm_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      body TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_emails (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      sent_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wire_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      bank_details TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      created_at TEXT NOT NULL,
      processed_at TEXT,
      processed_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS deposit_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      created_at TEXT NOT NULL,
      processed_at TEXT,
      processed_by TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS trade_counter (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      next_number INTEGER NOT NULL DEFAULT 100001
    );

    CREATE TABLE IF NOT EXISTS pending_orders (
      id TEXT PRIMARY KEY,
      trade_number INTEGER NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id),
      symbol TEXT NOT NULL,
      asset_class TEXT NOT NULL CHECK(asset_class IN ('us_equity', 'crypto')),
      qty REAL NOT NULL,
      side TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
      order_type TEXT NOT NULL CHECK(order_type IN ('MARKET', 'LIMIT')) DEFAULT 'LIMIT',
      limit_price REAL,
      position_id TEXT REFERENCES positions(id),
      status TEXT NOT NULL CHECK(status IN ('pending', 'cancelled', 'filled')) DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    INSERT OR IGNORE INTO trade_counter (id, next_number) VALUES (1, 100001);

    CREATE TABLE IF NOT EXISTS marketing_api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS marketing_trackers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      partner_name TEXT,
      platform TEXT NOT NULL CHECK(platform IN ('facebook', 'google', 'tiktok', 'custom')),
      pixel_id TEXT,
      postback_url TEXT,
      script_snippet TEXT,
      api_key_id TEXT REFERENCES marketing_api_keys(id),
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      partner_name TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      budget REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS marketing_partners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_email TEXT,
      commission_pct REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_commissions (
      asset_class TEXT PRIMARY KEY CHECK(asset_class IN ('us_equity', 'crypto')),
      commission_type TEXT NOT NULL DEFAULT 'percent' CHECK(commission_type IN ('percent', 'fixed_per_trade', 'fixed_per_lot')),
      value REAL NOT NULL DEFAULT 0,
      min_commission REAL NOT NULL DEFAULT 0,
      max_commission REAL NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_leads (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      message TEXT,
      country_code TEXT,
      city TEXT,
      timezone TEXT,
      language TEXT,
      source TEXT,
      page TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      assigned_agent TEXT,
      assigned_at TEXT,
      assigned_by TEXT,
      conversation TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_leads_status ON chat_leads(status);
    CREATE INDEX IF NOT EXISTS idx_chat_leads_created ON chat_leads(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_chat_leads_email ON chat_leads(email);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      user_id TEXT,
      lead_id TEXT,
      deposit_id TEXT,
      due_at TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to TEXT,
      priority INTEGER NOT NULL DEFAULT 3,
      dedupe_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      completed_by TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_kind ON tasks(kind);
    CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);
  `);

  seedCommissions(database);
  seedSystemSettings(database);
  migrateColumns(database);
  initPaymentGatewayTables();
}

function seedSystemSettings(database: Database.Database) {
  const now = new Date().toISOString();
  const defaults: Record<string, string> = {
    go_to_site_url: process.env.GO_TO_SITE_URL ?? "/",
    crm_brand_name: process.env.CRM_BRAND_NAME ?? "CURIONILABS",
    go_to_site_label: process.env.GO_TO_SITE_LABEL ?? "Go to site",
  };
  const stmt = database.prepare(
    "INSERT OR IGNORE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)",
  );
  for (const [key, value] of Object.entries(defaults)) {
    stmt.run(key, value, now);
  }
}

function seedCommissions(database: Database.Database) {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT OR IGNORE INTO system_commissions
       (asset_class, commission_type, value, min_commission, max_commission, enabled, updated_at)
       VALUES ('us_equity', 'percent', 0, 0, 0, 1, ?), ('crypto', 'percent', 0, 0, 0, 1, ?)`,
    )
    .run(now, now);
}

function allocateTradeNumber(database: Database.Database): number {
  const row = database.prepare("SELECT next_number FROM trade_counter WHERE id = 1").get() as {
    next_number: number;
  };
  const num = row.next_number;
  database.prepare("UPDATE trade_counter SET next_number = ? WHERE id = 1").run(num + 1);
  return num;
}

function migrateColumns(database: Database.Database) {
  const brandRow = database
    .prepare("SELECT value FROM system_settings WHERE key = 'crm_brand_name'")
    .get() as { value: string } | undefined;
  if (brandRow?.value === "TOROPROS" || brandRow?.value === "WALLSTREET SIM") {
    database
      .prepare("UPDATE system_settings SET value = ?, updated_at = ? WHERE key = 'crm_brand_name'")
      .run("CURIONILABS", new Date().toISOString());
  }

  const execCols = database.prepare("PRAGMA table_info(executions)").all() as { name: string }[];
  if (!execCols.some((c) => c.name === "notional")) {
    database.exec("ALTER TABLE executions ADD COLUMN notional REAL NOT NULL DEFAULT 0");
    database.exec("UPDATE executions SET notional = qty * fill_price WHERE notional = 0");
  }

  const cols = database.prepare("PRAGMA table_info(positions)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "trade_number")) {
    database.exec("ALTER TABLE positions ADD COLUMN trade_number INTEGER");
    database.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_positions_trade_number ON positions(trade_number)");
    const rows = database.prepare("SELECT id FROM positions ORDER BY opened_at ASC").all() as { id: string }[];
    for (const row of rows) {
      const num = allocateTradeNumber(database);
      database.prepare("UPDATE positions SET trade_number = ? WHERE id = ?").run(num, row.id);
    }
  }
  if (!cols.some((c) => c.name === "stop_loss")) {
    database.exec("ALTER TABLE positions ADD COLUMN stop_loss REAL");
  }
  if (!cols.some((c) => c.name === "take_profit")) {
    database.exec("ALTER TABLE positions ADD COLUMN take_profit REAL");
  }
}

function bootstrapAdmin(database: Database.Database) {
  const count = database.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  const username = process.env.ADMIN_USERNAME ?? "owner";
  const password = process.env.ADMIN_PASSWORD ?? "owner-change-me";
  const hash = bcrypt.hashSync(password, 12);
  const now = new Date().toISOString();

  if (count.c === 0) {
    database
      .prepare(
        "INSERT INTO users (id, username, password_hash, role, credits, created_at) VALUES (?, ?, ?, 'admin', 0, ?)",
      )
      .run(randomUUID(), username, hash, now);
    log("[wallstreet-sim] bootstrap admin account created");
    return;
  }

  // Keep SQLite admin in sync with .env when deploy rotates ADMIN_PASSWORD.
  if (process.env.ADMIN_PASSWORD?.trim()) {
    const admin = database
      .prepare("SELECT id, username, password_hash FROM users WHERE role = 'admin' LIMIT 1")
      .get() as { id: string; username: string; password_hash: string } | undefined;
    if (
      admin &&
      (admin.username !== username || !bcrypt.compareSync(password, admin.password_hash))
    ) {
      database
        .prepare("UPDATE users SET username = ?, password_hash = ? WHERE id = ?")
        .run(username, hash, admin.id);
      log("[wallstreet-sim] admin credentials synced from env");
    }
  }
}

export function getCashBalance(userId: string): number {
  const row = getDb()
    .prepare("SELECT COALESCE(SUM(amount_delta), 0) AS balance FROM ledger_entries WHERE user_id = ?")
    .get(userId) as { balance: number };
  return roundMoney(row.balance);
}

export function getUserByUsername(username: string): User | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)")
    .get(username.trim()) as User | undefined;
}

export function resolveUserForLogin(login: string): User | undefined {
  const trimmed = login.trim();
  const byUsername = getUserByUsername(trimmed);
  if (byUsername) return byUsername;

  const row = getDb()
    .prepare(
      `SELECT u.* FROM users u
       INNER JOIN user_profiles p ON p.user_id = u.id
       WHERE LOWER(p.email) = LOWER(?)`,
    )
    .get(trimmed) as User | undefined;
  return row;
}

export function touchUserLastLogin(userId: string) {
  getDb()
    .prepare("UPDATE user_profiles SET last_login_at = ? WHERE user_id = ?")
    .run(new Date().toISOString(), userId);
}

export function getUserProfileSummary(userId: string) {
  const row = getDb()
    .prepare(
      `SELECT display_id, first_name, last_name, email, currency, phone, country_code, crm_status,
              address, city, state, zip_code, nationality, birthday, ext_docs_required
       FROM user_profiles WHERE user_id = ?`,
    )
    .get(userId) as
    | {
        display_id: number;
        first_name: string;
        last_name: string;
        email: string;
        currency: string;
        phone: string;
        country_code: string;
        crm_status: string;
        address: string;
        city: string;
        state: string;
        zip_code: string;
        nationality: string;
        birthday: string;
        ext_docs_required: number;
      }
    | undefined;

  return {
    displayId: row?.display_id ?? 0,
    firstName: row?.first_name ?? "",
    lastName: row?.last_name ?? "",
    email: row?.email ?? "",
    currency: row?.currency ?? "USD",
    phone: row?.phone ?? "",
    countryCode: row?.country_code ?? "",
    crmStatus: row?.crm_status ?? "New",
    address: row?.address ?? "",
    city: row?.city ?? "",
    state: row?.state ?? "",
    zipCode: row?.zip_code ?? "",
    nationality: row?.nationality ?? "",
    birthday: row?.birthday ?? "",
    extDocsRequired: Boolean(Number(row?.ext_docs_required ?? 0)),
  };
}

export function getUserTradingStatus(userId: string): string {
  const row = getDb()
    .prepare("SELECT trading_status FROM user_profiles WHERE user_id = ?")
    .get(userId) as { trading_status: string } | undefined;
  return row?.trading_status ?? "Enabled";
}

export function computeTradeCommission(assetClass: AssetClass, notional: number, qty: number): number {
  const setting = getCommissionSetting(assetClass);
  if (!setting.enabled) return 0;
  let fee = 0;
  if (setting.commission_type === "percent") fee = notional * (setting.value / 100);
  else if (setting.commission_type === "fixed_per_trade") fee = setting.value;
  else if (setting.commission_type === "fixed_per_lot") fee = setting.value * qty;
  fee = Math.max(setting.min_commission, Math.min(setting.max_commission, fee));
  return roundMoney(fee);
}

export function getUserById(id: string): User | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

export function listUsers(): User[] {
  return getDb().prepare("SELECT * FROM users ORDER BY created_at ASC").all() as User[];
}

export function createUser(args: {
  username: string;
  password: string;
  role: UserRole;
  initialBalance?: number;
  actorId?: string;
}): User {
  const database = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(args.password, 12);

  const tx = database.transaction(() => {
    database
      .prepare(
        "INSERT INTO users (id, username, password_hash, role, credits, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      )
      .run(id, args.username, hash, args.role, now);

    if (args.initialBalance && args.initialBalance > 0) {
      addLedgerEntry({
        userId: id,
        amountDelta: args.initialBalance,
        reason: "admin_initial_credit",
        actorId: args.actorId ?? null,
      });
    }
  });

  tx();
  return getUserById(id)!;
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.password_hash);
}

export function addLedgerEntry(args: {
  userId: string;
  amountDelta: number;
  reason: string;
  actorId?: string | null;
}) {
  const prevCash = getCashBalance(args.userId);
  const ledgerId = randomUUID();
  const createdAt = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO ledger_entries (id, user_id, amount_delta, reason, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(ledgerId, args.userId, roundMoney(args.amountDelta), args.reason, args.actorId ?? null, createdAt);
  const newCash = roundMoney(prevCash + roundMoney(args.amountDelta));
  try {
    const { recordBalanceEventFromLedger } = require("./balanceEvents") as typeof import("./balanceEvents");
    recordBalanceEventFromLedger({
      userId: args.userId,
      amountDelta: args.amountDelta,
      reason: args.reason,
      actorId: args.actorId,
      ledgerRef: ledgerId,
      prevCash,
      newCash,
    });
  } catch {
    /* balance audit best-effort */
  }
}

export function getOpenPositions(userId: string): Position[] {
  return getDb()
    .prepare("SELECT * FROM positions WHERE user_id = ? AND status = 'open' ORDER BY opened_at DESC")
    .all(userId) as Position[];
}

export function getPositionById(id: string): Position | undefined {
  return getDb().prepare("SELECT * FROM positions WHERE id = ?").get(id) as Position | undefined;
}

export function logExecution(args: {
  userId: string;
  positionId: string | null;
  symbol: string;
  assetClass: AssetClass;
  side: OrderSide;
  orderType: OrderType;
  qty: number;
  fillPrice: number;
  actorId: string | null;
}): Execution {
  const notional = roundMoney(args.fillPrice * args.qty);
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO executions
       (id, user_id, position_id, symbol, asset_class, side, order_type, qty, fill_price, notional, created_at, actor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      args.userId,
      args.positionId,
      args.symbol,
      args.assetClass,
      args.side,
      args.orderType,
      args.qty,
      args.fillPrice,
      notional,
      now,
      args.actorId,
    );
  return getExecutionById(id)!;
}

function getExecutionById(id: string): Execution | undefined {
  return getDb().prepare("SELECT * FROM executions WHERE id = ?").get(id) as Execution | undefined;
}

export function getExecutions(userId: string, limit = 40): Execution[] {
  return getDb()
    .prepare("SELECT * FROM executions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as Execution[];
}

export function getClosedPositions(userId: string, limit = 40): Position[] {
  return getDb()
    .prepare("SELECT * FROM positions WHERE user_id = ? AND status = 'closed' ORDER BY closed_at DESC LIMIT ?")
    .all(userId, limit) as Position[];
}

export function getPositionCommissionTotal(
  userId: string,
  symbol: string,
  openedAt: string,
  closedAt: string | null,
): number {
  const end = closedAt ?? new Date().toISOString();
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount_delta)), 0) AS total FROM ledger_entries
       WHERE user_id = ? AND created_at >= ? AND created_at <= ?
       AND (reason = ? OR reason = ?)`,
    )
    .get(
      userId,
      openedAt,
      end,
      `commission_buy_${symbol}`,
      `commission_sell_${symbol}`,
    ) as { total: number };
  return roundMoney(row.total);
}

export function formatDisplayTradeId(tradeNumber: number, id: string): string {
  const suffix = id.replace(/-/g, "").slice(0, 6);
  return `${tradeNumber}x${suffix}`;
}

export type ClosedPositionRich = Position & {
  commission: number;
  displayTradeId: string;
};

export function listClosedPositionsRich(userId: string, limit = 50): ClosedPositionRich[] {
  return getClosedPositions(userId, limit).map((p) => ({
    ...p,
    commission: getPositionCommissionTotal(p.user_id, p.symbol, p.opened_at, p.closed_at),
    displayTradeId: formatDisplayTradeId(p.trade_number, p.id),
  }));
}

export function insertOpenPosition(args: {
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  qty: number;
  side: PositionSide;
  entryPrice: number;
  openedBy: string | null;
  notionalCost: number;
  orderType: OrderType;
  commission?: number;
}): { position: Position; execution: Execution } {
  const database = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const commission = args.commission ?? 0;
  let execution!: Execution;

  const tx = database.transaction(() => {
    const balance = getCashBalance(args.userId);
    const totalCost = roundMoney(args.notionalCost + commission);
    if (balance < totalCost) {
      throw new Error("Insufficient buying power.");
    }

    addLedgerEntry({
      userId: args.userId,
      amountDelta: -args.notionalCost,
      reason: `fill_buy_${args.symbol}`,
      actorId: args.openedBy,
    });
    if (commission > 0) {
      addLedgerEntry({
        userId: args.userId,
        amountDelta: -commission,
        reason: `commission_buy_${args.symbol}`,
        actorId: args.openedBy,
      });
    }

    const tradeNumber = allocateTradeNumber(database);

    database
      .prepare(
        `INSERT INTO positions
         (id, trade_number, user_id, symbol, asset_class, qty, side, entry_price, status, opened_at, closed_at, exit_price, pnl, opened_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, NULL, NULL, NULL, ?)`,
      )
      .run(
        id,
        tradeNumber,
        args.userId,
        args.symbol,
        args.assetClass,
        args.qty,
        args.side,
        args.entryPrice,
        now,
        args.openedBy,
      );

    execution = logExecution({
      userId: args.userId,
      positionId: id,
      symbol: args.symbol,
      assetClass: args.assetClass,
      side: "BUY",
      orderType: args.orderType,
      qty: args.qty,
      fillPrice: args.entryPrice,
      actorId: args.openedBy,
    });
  });

  tx();
  return { position: getPositionById(id)!, execution };
}

export function closePosition(args: {
  positionId: string;
  exitPrice: number;
  actorId: string | null;
  orderType: OrderType;
  commission?: number;
  closeQty?: number;
}): { position: Position; execution: Execution } {
  const database = getDb();
  const position = getPositionById(args.positionId);
  if (!position || position.status !== "open") {
    throw new Error("Position not found or already closed.");
  }

  const closeQty = args.closeQty ?? position.qty;
  if (closeQty <= 0 || closeQty > position.qty + 1e-9) {
    throw new Error("Invalid close quantity.");
  }

  const commission = args.commission ?? 0;
  const proceeds =
    position.side === "long"
      ? closeQty * args.exitPrice
      : closeQty * (2 * position.entry_price - args.exitPrice);

  const cost = closeQty * position.entry_price;
  const pnl = roundMoney(proceeds - cost - commission);
  let execution!: Execution;
  const partial = closeQty < position.qty - 1e-9;

  const tx = database.transaction(() => {
    addLedgerEntry({
      userId: position.user_id,
      amountDelta: roundMoney(proceeds - commission),
      reason: `fill_sell_${position.symbol}`,
      actorId: args.actorId,
    });
    if (commission > 0) {
      addLedgerEntry({
        userId: position.user_id,
        amountDelta: -commission,
        reason: `commission_sell_${position.symbol}`,
        actorId: args.actorId,
      });
    }

    if (partial) {
      database
        .prepare("UPDATE positions SET qty = ? WHERE id = ?")
        .run(roundMoney(position.qty - closeQty), position.id);
    } else {
      database
        .prepare(
          "UPDATE positions SET status = 'closed', closed_at = ?, exit_price = ?, pnl = ?, qty = ? WHERE id = ?",
        )
        .run(new Date().toISOString(), args.exitPrice, pnl, closeQty, position.id);
    }

    execution = logExecution({
      userId: position.user_id,
      positionId: position.id,
      symbol: position.symbol,
      assetClass: position.asset_class,
      side: "SELL",
      orderType: args.orderType,
      qty: closeQty,
      fillPrice: args.exitPrice,
      actorId: args.actorId,
    });
  });

  tx();
  return { position: getPositionById(position.id)!, execution };
}

export function withdrawToCredits(args: { userId: string; amount: number }): { creditsAdded: number; newCredits: number } {
  const database = getDb();
  const user = getUserById(args.userId);
  if (!user) throw new Error("User not found.");

  const balance = getCashBalance(args.userId);
  if (args.amount <= 0) throw new Error("Withdrawal amount must be positive.");
  if (balance < args.amount) throw new Error("Insufficient balance for withdrawal.");

  let newCredits = user.credits;

  const tx = database.transaction(() => {
    addLedgerEntry({
      userId: args.userId,
      amountDelta: -args.amount,
      reason: "withdraw_to_credits",
      actorId: args.userId,
    });

    newCredits = roundMoney(user.credits + args.amount);
    database.prepare("UPDATE users SET credits = ? WHERE id = ?").run(newCredits, args.userId);
  });

  tx();
  return { creditsAdded: args.amount, newCredits };
}

export function getLedger(userId: string, limit = 50) {
  return getDb()
    .prepare(
      "SELECT id, user_id, amount_delta, reason, actor_id, created_at FROM ledger_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(userId, limit) as LedgerEntry[];
}

export type UserDocument = {
  id: string;
  user_id: string;
  doc_type: string;
  file_name: string;
  status: "pending" | "approved" | "rejected";
  notes: string;
  uploaded_at: string;
};

export function ensureUserDocumentsSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS user_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      notes TEXT NOT NULL DEFAULT '',
      uploaded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_documents_user ON user_documents(user_id, uploaded_at DESC);
  `);
}

export function listUserDocuments(userId: string): UserDocument[] {
  ensureUserDocumentsSchema();
  return getDb()
    .prepare("SELECT * FROM user_documents WHERE user_id = ? ORDER BY uploaded_at DESC")
    .all(userId) as UserDocument[];
}

export function createUserDocument(args: {
  userId: string;
  docType: string;
  fileName: string;
  notes?: string;
}): UserDocument {
  ensureUserDocumentsSchema();
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO user_documents (id, user_id, doc_type, file_name, status, notes, uploaded_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
    )
    .run(id, args.userId, args.docType, args.fileName, args.notes ?? "", now);
  return listUserDocuments(args.userId).find((d) => d.id === id)!;
}

export function listUserWireRequests(userId: string): WireRequest[] {
  return getDb()
    .prepare("SELECT * FROM wire_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(userId) as WireRequest[];
}

export type UserTransactionRow = {
  id: string;
  date: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BONUS" | "ADJUSTMENT";
  method: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  amount: number;
  currency: string;
};

const TX_METHOD: Record<string, string> = {
  admin_credit: "Bank Transfer",
  admin_initial_credit: "Initial Deposit",
  admin_bonus: "Bonus",
  admin_debit: "Manual Withdrawal",
  withdraw_to_credits: "Platform Credits",
  wire_withdrawal: "Wire Transfer",
  admin_adjustment: "Adjustment",
  client_deposit: "Client Deposit",
};

export function ledgerToTransactions(entries: LedgerEntry[], currency: string): UserTransactionRow[] {
  const depositReasons = new Set([
    "admin_credit",
    "admin_initial_credit",
    "admin_bonus",
    "admin_adjustment",
    "client_deposit",
  ]);
  const withdrawReasons = new Set(["admin_debit", "withdraw_to_credits", "wire_withdrawal"]);

  const rows: UserTransactionRow[] = [];
  for (const e of entries) {
    if (e.reason.startsWith("fill_") || e.reason.startsWith("commission_")) continue;

    let type: UserTransactionRow["type"] | null = null;
    if (e.amount_delta > 0 && depositReasons.has(e.reason)) {
      type = e.reason === "admin_bonus" ? "BONUS" : e.reason === "admin_adjustment" ? "ADJUSTMENT" : "DEPOSIT";
    } else if (e.amount_delta < 0 && withdrawReasons.has(e.reason)) {
      type = "WITHDRAWAL";
    }
    if (!type) continue;

    rows.push({
      id: e.id,
      date: e.created_at.slice(0, 10),
      type,
      method: TX_METHOD[e.reason] ?? e.reason.replace(/_/g, " "),
      status: "APPROVED",
      amount: Math.abs(e.amount_delta),
      currency,
    });
  }
  return rows;
}

ensureUserDocumentsSchema();

export function countOpenPositions(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM positions WHERE user_id = ? AND status = 'open'")
    .get(userId) as { c: number };
  return row.c;
}

export type CrmNote = {
  id: string;
  user_id: string | null;
  body: string;
  author_id: string;
  created_at: string;
  username?: string;
  authorName?: string;
};

export type CrmEmail = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  author_id: string | null;
  sent_at: string;
  username?: string;
  authorName?: string;
};

export function listDepositors() {
  return getDb()
    .prepare(
      `SELECT u.id, u.username, u.role, u.credits, u.created_at,
              COALESCE(SUM(CASE WHEN l.amount_delta > 0 THEN l.amount_delta ELSE 0 END), 0) AS totalDeposits,
              COUNT(CASE WHEN l.amount_delta > 0 THEN 1 END) AS depositCount,
              MAX(CASE WHEN l.amount_delta > 0 THEN l.created_at END) AS lastDepositAt,
              COALESCE(SUM(l.amount_delta), 0) AS cashNet
       FROM users u
       LEFT JOIN ledger_entries l ON l.user_id = u.id
       WHERE u.role = 'user'
       GROUP BY u.id
       HAVING totalDeposits > 0 OR cashNet > 0
       ORDER BY totalDeposits DESC, cashNet DESC`,
    )
    .all()
    .map((row) => ({
      id: (row as { id: string }).id,
      username: (row as { username: string }).username,
      role: (row as { role: UserRole }).role,
      credits: (row as { credits: number }).credits,
      cashBalance: getCashBalance((row as { id: string }).id),
      totalDeposits: roundMoney((row as { totalDeposits: number }).totalDeposits),
      depositCount: (row as { depositCount: number }).depositCount,
      lastDepositAt: (row as { lastDepositAt: string | null }).lastDepositAt,
      createdAt: (row as { created_at: string }).created_at,
    }));
}

export function listSalesReport(from: string, to: string) {
  return getDb()
    .prepare(
      `SELECT u.username,
              COALESCE(SUM(CASE WHEN l.amount_delta > 0 THEN l.amount_delta ELSE 0 END), 0) AS deposits,
              COALESCE(SUM(CASE WHEN l.amount_delta < 0 AND l.reason IN ('admin_debit','withdraw_to_credits') THEN ABS(l.amount_delta) ELSE 0 END), 0) AS withdrawals,
              COUNT(DISTINCT CASE WHEN l.amount_delta > 0 THEN l.id END) AS depositTxCount
       FROM users u
       LEFT JOIN ledger_entries l ON l.user_id = u.id AND l.created_at >= ? AND l.created_at <= ?
       WHERE u.role = 'user'
       GROUP BY u.id
       ORDER BY deposits DESC`,
    )
    .all(from, to)
    .map((row) => ({
      username: (row as { username: string }).username,
      deposits: roundMoney((row as { deposits: number }).deposits),
      withdrawals: roundMoney((row as { withdrawals: number }).withdrawals),
      net: roundMoney((row as { deposits: number }).deposits - (row as { withdrawals: number }).withdrawals),
      depositTxCount: (row as { depositTxCount: number }).depositTxCount,
    }));
}

export function listCrmNotes(): CrmNote[] {
  return getDb()
    .prepare(
      `SELECT n.*, u.username, a.username AS authorName
       FROM crm_notes n
       LEFT JOIN users u ON u.id = n.user_id
       JOIN users a ON a.id = n.author_id
       ORDER BY n.created_at DESC LIMIT 100`,
    )
    .all() as CrmNote[];
}

export function createCrmNote(args: { userId: string | null; body: string; authorId: string }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare("INSERT INTO crm_notes (id, user_id, body, author_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, args.userId, args.body, args.authorId, now);
  return listCrmNotes().find((n) => n.id === id)!;
}

export function listCrmEmails(): CrmEmail[] {
  return getDb()
    .prepare(
      `SELECT e.*, u.username, COALESCE(a.username, 'system') AS authorName
       FROM crm_emails e
       JOIN users u ON u.id = e.user_id
       LEFT JOIN users a ON a.id = e.author_id
       ORDER BY e.sent_at DESC LIMIT 100`,
    )
    .all() as CrmEmail[];
}

export function createCrmEmail(args: {
  userId: string;
  subject: string;
  body: string;
  authorId: string | null;
}) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO crm_emails (id, user_id, subject, body, author_id, sent_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, args.userId, args.subject, args.body, args.authorId, now);
  return listCrmEmails().find((e) => e.id === id)!;
}

export function listCalendarEvents(from: string, to: string) {
  const registrations = getDb()
    .prepare(
      `SELECT id, username, created_at FROM users WHERE role = 'user' AND created_at >= ? AND created_at <= ?`,
    )
    .all(from, to) as { id: string; username: string; created_at: string }[];

  const deposits = getDb()
    .prepare(
      `SELECT l.created_at, l.amount_delta, u.username
       FROM ledger_entries l JOIN users u ON u.id = l.user_id
       WHERE l.amount_delta > 0 AND l.created_at >= ? AND l.created_at <= ?
       ORDER BY l.created_at DESC LIMIT 50`,
    )
    .all(from, to) as { created_at: string; amount_delta: number; username: string }[];

  const notes = getDb()
    .prepare(
      `SELECT n.created_at, n.body, u.username
       FROM crm_notes n LEFT JOIN users u ON u.id = n.user_id
       WHERE n.created_at >= ? AND n.created_at <= ?
       ORDER BY n.created_at DESC LIMIT 30`,
    )
    .all(from, to) as { created_at: string; body: string; username: string | null }[];

  const events: { date: string; type: string; title: string; detail: string }[] = [];

  for (const r of registrations) {
    events.push({
      date: r.created_at,
      type: "registration",
      title: `New user: ${r.username}`,
      detail: "Client registered",
    });
  }
  for (const d of deposits) {
    events.push({
      date: d.created_at,
      type: "deposit",
      title: `Deposit: ${d.username}`,
      detail: `$${roundMoney(d.amount_delta).toLocaleString()}`,
    });
  }
  for (const n of notes) {
    events.push({
      date: n.created_at,
      type: "note",
      title: n.username ? `Note: ${n.username}` : "General note",
      detail: n.body.slice(0, 80),
    });
  }

  events.sort((a, b) => b.date.localeCompare(a.date));
  return events;
}

export type LedgerRow = {
  id: string;
  user_id: string;
  username: string;
  amount_delta: number;
  reason: string;
  actor_id: string | null;
  actorName: string | null;
  created_at: string;
};

export function listAdminLedger(args: { reasons?: string[]; limit?: number }): LedgerRow[] {
  const limit = args.limit ?? 200;
  if (args.reasons && args.reasons.length > 0) {
    const placeholders = args.reasons.map(() => "?").join(", ");
    return getDb()
      .prepare(
        `SELECT l.*, u.username, a.username AS actorName
         FROM ledger_entries l
         JOIN users u ON u.id = l.user_id
         LEFT JOIN users a ON a.id = l.actor_id
         WHERE l.reason IN (${placeholders})
         ORDER BY l.created_at DESC LIMIT ?`,
      )
      .all(...args.reasons, limit) as LedgerRow[];
  }
  return getDb()
    .prepare(
      `SELECT l.*, u.username, a.username AS actorName
       FROM ledger_entries l
       JOIN users u ON u.id = l.user_id
       LEFT JOIN users a ON a.id = l.actor_id
       ORDER BY l.created_at DESC LIMIT ?`,
    )
    .all(limit) as LedgerRow[];
}

export type WireRequest = {
  id: string;
  user_id: string;
  amount: number;
  bank_details: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  username?: string;
};

export function listWireRequests(): WireRequest[] {
  return getDb()
    .prepare(
      `SELECT w.*, u.username FROM wire_requests w
       JOIN users u ON u.id = w.user_id
       ORDER BY w.created_at DESC LIMIT 100`,
    )
    .all() as WireRequest[];
}

export function createWireRequest(args: { userId: string; amount: number; bankDetails: string }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO wire_requests (id, user_id, amount, bank_details, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    )
    .run(id, args.userId, roundMoney(args.amount), args.bankDetails, now);
  return listWireRequests().find((w) => w.id === id)!;
}

export function processWireRequest(args: {
  id: string;
  status: "approved" | "rejected";
  actorId: string;
}) {
  const req = getDb().prepare("SELECT * FROM wire_requests WHERE id = ?").get(args.id) as WireRequest | undefined;
  if (!req) throw new Error("Wire request not found.");
  if (req.status !== "pending") throw new Error("Request already processed.");

  const now = new Date().toISOString();
  const tx = getDb().transaction(() => {
    if (args.status === "approved") {
      const balance = getCashBalance(req.user_id);
      if (balance < req.amount) throw new Error("Insufficient balance for wire withdrawal.");
      addLedgerEntry({
        userId: req.user_id,
        amountDelta: -req.amount,
        reason: "wire_withdrawal",
        actorId: args.actorId,
      });
    }
    getDb()
      .prepare("UPDATE wire_requests SET status = ?, processed_at = ?, processed_by = ? WHERE id = ?")
      .run(args.status, now, args.actorId, args.id);
  });
  tx();
  return listWireRequests().find((w) => w.id === args.id)!;
}

export type DepositRequest = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  username?: string;
};

export function listUserDepositRequests(userId: string): DepositRequest[] {
  return getDb()
    .prepare("SELECT * FROM deposit_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(userId) as DepositRequest[];
}

export function listDepositRequests(): DepositRequest[] {
  return getDb()
    .prepare(
      `SELECT d.*, u.username FROM deposit_requests d
       JOIN users u ON u.id = d.user_id
       ORDER BY d.created_at DESC LIMIT 100`,
    )
    .all() as DepositRequest[];
}

export function createDepositRequest(args: {
  userId: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
  currency?: string;
  countryCode?: string;
  pspProcessorId?: string;
  campaignId?: string;
}) {
  const profile = resolveDepositLimitContext(args.userId);
  assertDepositWithinLimits({
    userId: args.userId,
    amount: args.amount,
    currency: args.currency ?? profile.currency,
    countryCode: args.countryCode ?? profile.countryCode,
    pspProcessorId: args.pspProcessorId,
    campaignId: args.campaignId,
  });

  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO deposit_requests (id, user_id, amount, method, reference, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      id,
      args.userId,
      roundMoney(args.amount),
      args.method,
      args.reference ?? null,
      args.notes ?? null,
      now,
    );
  return listDepositRequests().find((d) => d.id === id)!;
}

export function processDepositRequest(args: {
  id: string;
  status: "approved" | "rejected";
  actorId: string;
}) {
  const req = getDb().prepare("SELECT * FROM deposit_requests WHERE id = ?").get(args.id) as
    | DepositRequest
    | undefined;
  if (!req) throw new Error("Deposit request not found.");
  if (req.status !== "pending") throw new Error("Request already processed.");

  if (args.status === "approved") {
    const profile = resolveDepositLimitContext(req.user_id);
    assertDepositWithinLimits({
      userId: req.user_id,
      amount: req.amount,
      currency: profile.currency,
      countryCode: profile.countryCode,
    });
  }

  const now = new Date().toISOString();
  const tx = getDb().transaction(() => {
    if (args.status === "approved") {
      addLedgerEntry({
        userId: req.user_id,
        amountDelta: req.amount,
        reason: "client_deposit",
        actorId: args.actorId,
      });
    }
    getDb()
      .prepare("UPDATE deposit_requests SET status = ?, processed_at = ?, processed_by = ? WHERE id = ?")
      .run(args.status, now, args.actorId, args.id);
  });
  tx();
  return listDepositRequests().find((d) => d.id === args.id)!;
}

export function insertPendingOrder(args: {
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  qty: number;
  side: OrderSide;
  orderType: OrderType;
  limitPrice?: number;
  positionId?: string;
}): { id: string; trade_number: number } {
  const database = getDb();
  const id = randomUUID();
  const tradeNumber = allocateTradeNumber(database);
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO pending_orders
       (id, trade_number, user_id, symbol, asset_class, qty, side, order_type, limit_price, position_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(
      id,
      tradeNumber,
      args.userId,
      args.symbol,
      args.assetClass,
      args.qty,
      args.side,
      args.orderType,
      args.limitPrice ?? null,
      args.positionId ?? null,
      now,
    );
  return { id, trade_number: tradeNumber };
}

export function getPendingOrderById(id: string) {
  return getDb().prepare("SELECT * FROM pending_orders WHERE id = ?").get(id) as
    | import("./types").PendingOrder
    | undefined;
}

export function cancelPendingOrder(id: string, userId: string) {
  const row = getPendingOrderById(id);
  if (!row || row.user_id !== userId) throw new Error("Pending order not found.");
  if (row.status !== "pending") throw new Error("Order is not pending.");
  getDb().prepare("UPDATE pending_orders SET status = 'cancelled' WHERE id = ?").run(id);
  return { ...row, status: "cancelled" as const };
}

export function adminCancelPendingOrder(id: string) {
  const row = getPendingOrderById(id);
  if (!row) throw new Error("Pending order not found.");
  if (row.status !== "pending") throw new Error("Order is not pending.");
  getDb().prepare("UPDATE pending_orders SET status = 'cancelled' WHERE id = ?").run(id);
  return { ...row, status: "cancelled" as const };
}

export function markPendingOrderFilled(id: string) {
  getDb().prepare("UPDATE pending_orders SET status = 'filled' WHERE id = ?").run(id);
}

export function listUserPendingOrders(userId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM pending_orders WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC`,
    )
    .all(userId);
}

export function listPendingOrders(status: "pending" | "all" = "pending", userId?: string) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (status === "pending") clauses.push("p.status = 'pending'");
  if (userId) {
    clauses.push("p.user_id = ?");
    params.push(userId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT p.*, u.username FROM pending_orders p
       JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC LIMIT 200`,
    )
    .all(...params);
}

export function listPositionsForUsers(userIds: string[], status?: "open" | "closed") {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => "?").join(",");
  const statusClause = status ? " AND p.status = ?" : "";
  const params = status ? [...userIds, status] : userIds;
  return getDb()
    .prepare(
      `SELECT p.*, u.username FROM positions p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id IN (${placeholders})${statusClause}
       ORDER BY p.opened_at DESC LIMIT 500`,
    )
    .all(...params);
}

export function listPendingOrdersForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  const placeholders = userIds.map(() => "?").join(",");
  return getDb()
    .prepare(
      `SELECT p.*, u.username FROM pending_orders p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id IN (${placeholders}) AND p.status = 'pending'
       ORDER BY p.created_at DESC LIMIT 200`,
    )
    .all(...userIds);
}

export function listAllPositions(status?: "open" | "closed", userId?: string) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (status) {
    clauses.push("p.status = ?");
    params.push(status);
  }
  if (userId) {
    clauses.push("p.user_id = ?");
    params.push(userId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT p.*, u.username FROM positions p
       JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.opened_at DESC LIMIT 500`,
    )
    .all(...params);
}

export function getPositionByTradeNumber(tradeNumber: number) {
  return getDb()
    .prepare("SELECT * FROM positions WHERE trade_number = ?")
    .get(tradeNumber) as Position | undefined;
}

export function deleteTradeByNumber(tradeNumber: number, actorId: string | null) {
  const database = getDb();
  const pending = database
    .prepare("SELECT * FROM pending_orders WHERE trade_number = ? AND status = 'pending'")
    .get(tradeNumber);
  if (pending) {
    database.prepare("DELETE FROM pending_orders WHERE trade_number = ?").run(tradeNumber);
    return { kind: "pending" as const, tradeNumber };
  }

  const position = getPositionByTradeNumber(tradeNumber);
  if (!position) throw new Error(`Trade #${tradeNumber} not found.`);

  const tx = database.transaction(() => {
    if (position.status === "open") {
      const refund = roundMoney(position.qty * position.entry_price);
      addLedgerEntry({
        userId: position.user_id,
        amountDelta: refund,
        reason: `admin_delete_trade_${tradeNumber}`,
        actorId,
      });
    } else {
      const proceeds = roundMoney(position.qty * (position.exit_price ?? position.entry_price));
      const cost = roundMoney(position.qty * position.entry_price);
      addLedgerEntry({
        userId: position.user_id,
        amountDelta: roundMoney(cost - proceeds),
        reason: `admin_delete_trade_${tradeNumber}`,
        actorId,
      });
    }
    database.prepare("DELETE FROM executions WHERE position_id = ?").run(position.id);
    database.prepare("DELETE FROM positions WHERE id = ?").run(position.id);
    database.prepare("UPDATE pending_orders SET status = 'cancelled' WHERE position_id = ?").run(position.id);
  });
  tx();
  return { kind: "position" as const, tradeNumber, status: position.status };
}

export type MarketingApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  enabled: number;
  created_at: string;
  last_used_at: string | null;
};

export type MarketingTracker = {
  id: string;
  name: string;
  partner_name: string | null;
  platform: string;
  pixel_id: string | null;
  postback_url: string | null;
  script_snippet: string | null;
  api_key_id: string | null;
  enabled: number;
  created_at: string;
  api_key_name?: string;
};

export function listMarketingApiKeys(): MarketingApiKey[] {
  return getDb()
    .prepare("SELECT id, name, key_prefix, enabled, created_at, last_used_at FROM marketing_api_keys ORDER BY created_at DESC")
    .all() as MarketingApiKey[];
}

export function createMarketingApiKey(name: string): { key: MarketingApiKey; rawKey: string } {
  const rawKey = `wss_${randomBytes(24).toString("hex")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      "INSERT INTO marketing_api_keys (id, name, key_prefix, key_hash, enabled, created_at) VALUES (?, ?, ?, ?, 1, ?)",
    )
    .run(id, name, rawKey.slice(0, 16), keyHash, now);
  const key = listMarketingApiKeys().find((k) => k.id === id)!;
  return { key, rawKey };
}

export function revokeMarketingApiKey(id: string) {
  getDb().prepare("UPDATE marketing_api_keys SET enabled = 0 WHERE id = ?").run(id);
}

export function listMarketingTrackers(): MarketingTracker[] {
  return getDb()
    .prepare(
      `SELECT t.*, k.name AS api_key_name FROM marketing_trackers t
       LEFT JOIN marketing_api_keys k ON k.id = t.api_key_id
       ORDER BY t.created_at DESC`,
    )
    .all() as MarketingTracker[];
}

export function createMarketingTracker(args: {
  name: string;
  partnerName?: string;
  platform: string;
  pixelId?: string;
  postbackUrl?: string;
  scriptSnippet?: string;
  apiKeyId?: string;
}) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO marketing_trackers
       (id, name, partner_name, platform, pixel_id, postback_url, script_snippet, api_key_id, enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    )
    .run(
      id,
      args.name,
      args.partnerName ?? null,
      args.platform,
      args.pixelId ?? null,
      args.postbackUrl ?? null,
      args.scriptSnippet ?? null,
      args.apiKeyId ?? null,
      now,
    );
  return listMarketingTrackers().find((t) => t.id === id)!;
}

export function deleteMarketingTracker(id: string) {
  getDb().prepare("DELETE FROM marketing_trackers WHERE id = ?").run(id);
}

export function listMarketingCampaigns() {
  return getDb().prepare("SELECT * FROM marketing_campaigns ORDER BY created_at DESC").all();
}

export function createMarketingCampaign(args: { name: string; partnerName?: string; budget?: number }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare("INSERT INTO marketing_campaigns (id, name, partner_name, status, budget, created_at) VALUES (?, ?, ?, 'active', ?, ?)")
    .run(id, args.name, args.partnerName ?? null, args.budget ?? 0, now);
  return listMarketingCampaigns().find((c) => (c as { id: string }).id === id);
}

export function listMarketingPartners() {
  return getDb().prepare("SELECT * FROM marketing_partners ORDER BY created_at DESC").all();
}

export function createMarketingPartner(args: { name: string; contactEmail?: string; commissionPct?: number }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare("INSERT INTO marketing_partners (id, name, contact_email, commission_pct, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, args.name, args.contactEmail ?? null, args.commissionPct ?? 0, now);
  return listMarketingPartners().find((p) => (p as { id: string }).id === id);
}

export type CommissionSetting = {
  asset_class: "us_equity" | "crypto";
  commission_type: "percent" | "fixed_per_trade" | "fixed_per_lot";
  value: number;
  min_commission: number;
  max_commission: number;
  enabled: number;
  updated_at: string;
};

export function getCommissionSetting(assetClass: "us_equity" | "crypto"): CommissionSetting {
  const row = getDb()
    .prepare("SELECT * FROM system_commissions WHERE asset_class = ?")
    .get(assetClass) as CommissionSetting | undefined;
  if (!row) throw new Error("Commission setting not found.");
  return row;
}

export function updateCommissionSetting(
  assetClass: "us_equity" | "crypto",
  args: {
    commissionType: CommissionSetting["commission_type"];
    value: number;
    minCommission: number;
    maxCommission: number;
    enabled: boolean;
  },
): CommissionSetting {
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE system_commissions SET commission_type = ?, value = ?, min_commission = ?, max_commission = ?, enabled = ?, updated_at = ?
       WHERE asset_class = ?`,
    )
    .run(
      args.commissionType,
      args.value,
      args.minCommission,
      args.maxCommission,
      args.enabled ? 1 : 0,
      now,
      assetClass,
    );
  return getCommissionSetting(assetClass);
}

export type CrmBranding = {
  goToSiteUrl: string;
  crmBrandName: string;
  goToSiteLabel: string;
};

export function getCrmBranding(): CrmBranding {
  return {
    goToSiteUrl: getSystemSetting("go_to_site_url", "/"),
    crmBrandName: getSystemSetting("crm_brand_name", "CURIONILABS"),
    goToSiteLabel: getSystemSetting("go_to_site_label", "Go to site"),
  };
}

export function updateCrmBranding(args: Partial<CrmBranding>): CrmBranding {
  const now = new Date().toISOString();
  const db = getDb();
  if (args.goToSiteUrl != null) {
    setSystemSetting(db, "go_to_site_url", normalizeSiteUrl(args.goToSiteUrl), now);
  }
  if (args.crmBrandName != null) {
    setSystemSetting(db, "crm_brand_name", args.crmBrandName.trim(), now);
  }
  if (args.goToSiteLabel != null) {
    setSystemSetting(db, "go_to_site_label", args.goToSiteLabel.trim(), now);
  }
  return getCrmBranding();
}

function getSystemSetting(key: string, fallback: string): string {
  const row = getDb().prepare("SELECT value FROM system_settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? fallback;
}

function setSystemSetting(db: Database.Database, key: string, value: string, updatedAt: string) {
  db.prepare(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(key, value, updatedAt);
}

function normalizeSiteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed === "/") return "/";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `https://${trimmed}`;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export { getDb };
