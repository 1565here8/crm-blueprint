import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getDb, getCashBalance, getUserById, getUserByUsername, addLedgerEntry, createCrmNote } from "./db";
import { listOnlineVisitors } from "./presence";
import type { UserRole } from "./types";
import {
  buildCsvColumnMap,
  parseCsvMoney,
  parsePersonNames,
  rowToCrmFields,
} from "./csvImportMap";
import { isAccountCurrency } from "./crmConstants";
import { computeConversionRate, computePlayerValue } from "./crmPlayerMetrics";
import { syncProfileStatusFromName } from "./clientStatuses";

export type CrmUserRow = {
  id: string;
  displayId: number;
  online: boolean;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  phone2: string;
  email: string;
  countryCode: string;
  agentName: string;
  crmStatus: string;
  tradingStatus: string;
  param1: string;
  partner: string;
  campaign: string;
  affiliate: string;
  campaignId: string;
  cpa: string;
  cpl: string;
  comments: string;
  funnel: string;
  conversionRate: string;
  playerValue: string;
  importedSource: string;
  currency: string;
  desk: string;
  text1: string;
  address: string;
  address1: string;
  city: string;
  state: string;
  zipCode: string;
  nationality: string;
  birthday: string;
  role: UserRole;
  credits: number;
  cashBalance: number;
  createdAt: string;
  lastLoginAt: string | null;
  noteCount: number;
  lastNoteAt: string | null;
  totalDeposits: number;
  totalAdjustments: number;
  totalBonuses: number;
  approvedWithdrawals: number;
  pendingWithdrawals: number;
  totalVolume: number;
  totalClosedPnl: number;
  totalOpenPnl: number;
  equity: number;
  bonusBalance: number;
  extDocsRequired: boolean;
  exchangeSpread: number;
  computedPlayerValue: number;
  computedConversionRate: string;
};

function allocateDisplayId(database = getDb()): number {
  database.exec(`
    CREATE TABLE IF NOT EXISTS user_display_counter (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      next_number INTEGER NOT NULL DEFAULT 1
    );
    INSERT OR IGNORE INTO user_display_counter (id, next_number) VALUES (1, 1);
  `);
  const row = database.prepare("SELECT next_number FROM user_display_counter WHERE id = 1").get() as {
    next_number: number;
  };
  const num = row.next_number;
  database.prepare("UPDATE user_display_counter SET next_number = ? WHERE id = 1").run(num + 1);
  return num;
}

export function ensureUserProfilesSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_id INTEGER NOT NULL UNIQUE,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      phone2 TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      address1 TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT '',
      zip_code TEXT NOT NULL DEFAULT '',
      country_code TEXT NOT NULL DEFAULT '',
      nationality TEXT NOT NULL DEFAULT '',
      birthday TEXT NOT NULL DEFAULT '',
      currency TEXT NOT NULL DEFAULT 'USD',
      agent_name TEXT NOT NULL DEFAULT 'Admin Broker',
      desk TEXT NOT NULL DEFAULT '',
      crm_status TEXT NOT NULL DEFAULT 'New',
      trading_status TEXT NOT NULL DEFAULT 'Enabled',
      text1 TEXT NOT NULL DEFAULT '',
      partner TEXT NOT NULL DEFAULT '',
      campaign TEXT NOT NULL DEFAULT '',
      imported_source TEXT NOT NULL DEFAULT '',
      param1 TEXT NOT NULL DEFAULT '',
      last_login_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_user_profiles_display ON user_profiles(display_id);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
  `);
  try {
    getDb().exec(`ALTER TABLE user_profiles ADD COLUMN ext_docs_required INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
  try {
    getDb().exec(`ALTER TABLE user_profiles ADD COLUMN exchange_spread INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
  try {
    getDb().exec(`ALTER TABLE user_profiles ADD COLUMN is_staff INTEGER NOT NULL DEFAULT 0`);
  } catch {
    /* column exists */
  }
  try {
    getDb().exec(`ALTER TABLE user_profiles ADD COLUMN staff_permissions TEXT NOT NULL DEFAULT '[]'`);
  } catch {
    /* column exists */
  }
  for (const col of [
    "affiliate",
    "campaign_id",
    "cpa",
    "cpl",
    "comments",
    "funnel",
    "conversion_rate",
    "player_value",
  ]) {
    try {
      getDb().exec(`ALTER TABLE user_profiles ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
    } catch {
      /* column exists */
    }
  }
  try {
    getDb().exec(`ALTER TABLE user_profiles ADD COLUMN client_status_id INTEGER`);
  } catch {
    /* column exists */
  }
  backfillProfiles();
}

/**
 * Exchange Spread: integer -5..+5. Broker-only override of execution price.
 * Positive favors the trader (better entry/exit), negative causes loss.
 * Each unit = 0.1% applied symmetrically to BUY (entry) and SELL (exit) fills.
 */
export function getUserExchangeSpread(userId: string): number {
  ensureUserProfilesSchema();
  const row = getDb()
    .prepare("SELECT exchange_spread FROM user_profiles WHERE user_id = ?")
    .get(userId) as { exchange_spread: number } | undefined;
  if (!row) return 0;
  const v = Number(row.exchange_spread ?? 0);
  if (!Number.isFinite(v)) return 0;
  return Math.max(-5, Math.min(5, Math.round(v)));
}

function backfillProfiles() {
  const db = getDb();
  const users = db.prepare("SELECT id, username, created_at FROM users WHERE role = 'user'").all() as {
    id: string;
    username: string;
    created_at: string;
  }[];
  for (const u of users) {
    const exists = db.prepare("SELECT 1 FROM user_profiles WHERE user_id = ?").get(u.id);
    if (exists) continue;
    const displayId = allocateDisplayId(db);
    db.prepare(
      `INSERT INTO user_profiles (user_id, display_id, email, imported_source)
       VALUES (?, ?, ?, 'manual')`,
    ).run(u.id, displayId, `${u.username}@local`);
  }
}

function onlineUserIds(): Set<string> {
  return new Set(
    listOnlineVisitors()
      .filter((v) => v.userId)
      .map((v) => v.userId as string),
  );
}

/** Filter clients on a regional desk (direct desk_id or owner agent on desk). */
function regionalDeskClientFilter(deskId: number): { sql: string; params: (string | number)[] } {
  ensureUserProfilesSchema();
  const db = getDb();
  const hasDesk = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'crm_desk'")
    .get();
  if (!hasDesk) return { sql: " AND 1=0", params: [] };

  const desk = db.prepare("SELECT id FROM crm_desk WHERE id = ?").get(deskId) as { id: number } | undefined;
  if (!desk) return { sql: " AND 1=0", params: [] };

  const agentRows = db
    .prepare(
      `SELECT TRIM(COALESCE(NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), u.username)) AS agent_name
       FROM user_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.is_staff = 1 AND (
         p.desk_id = ? OR p.user_id IN (SELECT user_id FROM crm_desk_agent WHERE desk_id = ?)
       )`,
    )
    .all(deskId, deskId) as Array<{ agent_name: string }>;

  const names = agentRows.map((r) => r.agent_name).filter(Boolean);
  if (names.length === 0) return { sql: " AND p.desk_id = ?", params: [deskId] };
  const ph = names.map(() => "?").join(", ");
  return { sql: ` AND (p.desk_id = ? OR p.agent_name IN (${ph}))`, params: [deskId, ...names] };
}

function ledgerSum(userId: string, reasons: string[], positive: boolean): number {
  if (reasons.length === 0) return 0;
  const ph = reasons.map(() => "?").join(", ");
  const sign = positive ? ">" : "<";
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(ABS(amount_delta)), 0) AS t FROM ledger_entries
       WHERE user_id = ? AND reason IN (${ph}) AND amount_delta ${sign} 0`,
    )
    .get(userId, ...reasons) as { t: number };
  return round(row.t);
}

function buildRow(userId: string, online: Set<string>): CrmUserRow | null {
  const db = getDb();
  const u = getUserById(userId);
  if (!u || u.role !== "user") return null;
  const p = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId) as Record<
    string,
    string | number | null
  > | null;
  if (!p) return null;

  const noteStats = db
    .prepare(
      `SELECT COUNT(*) AS c, MAX(created_at) AS last_at FROM crm_notes WHERE user_id = ?`,
    )
    .get(userId) as { c: number; last_at: string | null };

  const cash = getCashBalance(userId);
  const closedPnl = db
    .prepare(`SELECT COALESCE(SUM(pnl), 0) AS p FROM positions WHERE user_id = ? AND status = 'closed'`)
    .get(userId) as { p: number };
  const openCost = db
    .prepare(
      `SELECT COALESCE(SUM(qty * entry_price), 0) AS c FROM positions WHERE user_id = ? AND status = 'open'`,
    )
    .get(userId) as { c: number };
  const volume = db
    .prepare(`SELECT COALESCE(SUM(notional), 0) AS v FROM executions WHERE user_id = ?`)
    .get(userId) as { v: number };

  const firstName = String(p.first_name ?? "");
  const lastName = String(p.last_name ?? "");

  return {
    id: u.id,
    displayId: Number(p.display_id),
    online: online.has(u.id),
    username: u.username,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || u.username,
    phone: String(p.phone ?? ""),
    phone2: String(p.phone2 ?? ""),
    email: String(p.email ?? ""),
    countryCode: String(p.country_code ?? ""),
    agentName: String(p.agent_name ?? "Admin Broker"),
    crmStatus: String(p.crm_status ?? "New"),
    tradingStatus: String(p.trading_status ?? "Enabled"),
    param1: String(p.param1 ?? ""),
    partner: String(p.partner ?? ""),
    campaign: String(p.campaign ?? ""),
    affiliate: String(p.affiliate ?? ""),
    campaignId: String(p.campaign_id ?? ""),
    cpa: String(p.cpa ?? ""),
    cpl: String(p.cpl ?? ""),
    comments: String(p.comments ?? ""),
    funnel: String(p.funnel ?? ""),
    conversionRate: String(p.conversion_rate ?? ""),
    playerValue: String(p.player_value ?? ""),
    importedSource: String(p.imported_source ?? ""),
    currency: String(p.currency ?? "USD"),
    desk: String(p.desk ?? ""),
    text1: String(p.text1 ?? ""),
    address: String(p.address ?? ""),
    address1: String(p.address1 ?? ""),
    city: String(p.city ?? ""),
    state: String(p.state ?? ""),
    zipCode: String(p.zip_code ?? ""),
    nationality: String(p.nationality ?? ""),
    birthday: String(p.birthday ?? ""),
    role: u.role,
    credits: u.credits,
    cashBalance: cash,
    createdAt: u.created_at,
    lastLoginAt: p.last_login_at ? String(p.last_login_at) : null,
    noteCount: noteStats.c,
    lastNoteAt: noteStats.last_at,
    totalDeposits: ledgerSum(userId, ["admin_credit", "admin_initial_credit"], true),
    totalAdjustments: ledgerSum(userId, ["admin_adjustment"], true),
    totalBonuses: ledgerSum(userId, ["admin_bonus"], true),
    approvedWithdrawals: ledgerSum(userId, ["admin_debit", "withdraw_to_credits", "wire_withdrawal"], false),
    pendingWithdrawals: (() => {
      const row = db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS t FROM wire_requests WHERE user_id = ? AND status = 'pending'`,
        )
        .get(userId) as { t: number };
      return round(Number(row.t));
    })(),
    totalVolume: round(Number(volume.v)),
    totalClosedPnl: round(Number(closedPnl.p)),
    totalOpenPnl: round(-Number(openCost.c)),
    equity: round(cash + Number(openCost.c)),
    bonusBalance: 0,
    extDocsRequired: Boolean(Number(p.ext_docs_required ?? 0)),
    exchangeSpread: Math.max(-5, Math.min(5, Math.round(Number(p.exchange_spread ?? 0)))),
    computedPlayerValue: computePlayerValue({
      totalDeposits: ledgerSum(userId, ["admin_credit", "admin_initial_credit"], true),
      totalAdjustments: ledgerSum(userId, ["admin_adjustment"], true),
      totalBonuses: ledgerSum(userId, ["admin_bonus"], true),
      approvedWithdrawals: ledgerSum(
        userId,
        ["admin_debit", "withdraw_to_credits", "wire_withdrawal"],
        false,
      ),
      cpa: String(p.cpa ?? ""),
      cpl: String(p.cpl ?? ""),
    }),
    computedConversionRate: computeConversionRate({
      totalDeposits: ledgerSum(userId, ["admin_credit", "admin_initial_credit"], true),
      crmStatus: String(p.crm_status ?? ""),
    }),
  };
}

export function listCrmUsers(args: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  agent?: string;
  deskId?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}) {
  ensureUserProfilesSchema();
  const page = Math.max(1, args.page ?? 1);
  const limit = Math.min(500, Math.max(1, args.limit ?? 10));
  const offset = (page - 1) * limit;
  const search = args.search?.trim().toLowerCase() ?? "";
  const sortDir = args.sortDir === "asc" ? "ASC" : "DESC";

  const sortMap: Record<string, string> = {
    display_id: `p.display_id ${sortDir}`,
    name: `p.first_name ${sortDir}, p.last_name ${sortDir}`,
    registration: `u.created_at ${sortDir}`,
    status: `p.crm_status ${sortDir}, p.display_id DESC`,
  };
  const orderBy = sortMap[args.sortBy ?? "display_id"] ?? sortMap.display_id;

  const db = getDb();
  let where = "WHERE u.role = 'user'";
  const params: (string | number)[] = [];

  if (search) {
    where += ` AND (
      LOWER(u.username) LIKE ? OR LOWER(p.email) LIKE ? OR LOWER(p.phone) LIKE ?
      OR LOWER(p.first_name) LIKE ? OR LOWER(p.last_name) LIKE ?
      OR CAST(p.display_id AS TEXT) LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q, q, q);
  }

  if (args.status?.trim()) {
    where += " AND p.crm_status = ?";
    params.push(args.status.trim());
  }

  if (args.agent?.trim()) {
    where += " AND p.agent_name = ?";
    params.push(args.agent.trim());
  }

  if (args.deskId !== undefined && Number.isFinite(args.deskId)) {
    const deskFilter = regionalDeskClientFilter(args.deskId);
    where += deskFilter.sql;
    params.push(...deskFilter.params);
  }

  const total = db
    .prepare(
      `SELECT COUNT(*) AS c FROM users u
       JOIN user_profiles p ON p.user_id = u.id ${where}`,
    )
    .get(...params) as { c: number };

  const dateRange = db
    .prepare(
      `SELECT MIN(u.created_at) AS minAt, MAX(u.created_at) AS maxAt FROM users u
       JOIN user_profiles p ON p.user_id = u.id ${where}`,
    )
    .get(...params) as { minAt: string | null; maxAt: string | null };

  const ids = db
    .prepare(
      `SELECT u.id FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       ${where}
       ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as { id: string }[];

  const online = onlineUserIds();
  const users = ids.map((r) => buildRow(r.id, online)).filter(Boolean) as CrmUserRow[];

  const agents = db
    .prepare(`SELECT DISTINCT agent_name FROM user_profiles ORDER BY agent_name`)
    .all()
    .map((r) => String((r as { agent_name: string }).agent_name))
    .filter(Boolean);

  return {
    users,
    total: total.c,
    page,
    limit,
    dateRange: { from: dateRange.minAt, to: dateRange.maxAt },
    agents,
  };
}

/** Agent names on client profiles + how many clients each owns (for Desk Team + assign UI). */
export function listAgentRoster(): {
  agents: Array<{ name: string; clientCount: number }>;
  totalClients: number;
} {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT TRIM(agent_name) AS name, COUNT(*) AS clientCount
       FROM user_profiles
       GROUP BY TRIM(agent_name)
       ORDER BY clientCount DESC`,
    )
    .all() as Array<{ name: string; clientCount: number }>;
  const totalClients = rows.reduce((s, r) => s + Number(r.clientCount), 0);
  return { agents: rows, totalClients };
}

/** All client IDs matching filters — for select-all bulk operations (cap 5000). */
export function listCrmUserIds(args: {
  search?: string;
  status?: string;
  agent?: string;
  deskId?: number;
  max?: number;
}): string[] {
  ensureUserProfilesSchema();
  const cap = Math.min(5000, Math.max(1, args.max ?? 5000));
  const search = args.search?.trim().toLowerCase() ?? "";
  const db = getDb();
  let where = "WHERE u.role = 'user'";
  const params: string[] = [];

  if (search) {
    where += ` AND (
      LOWER(u.username) LIKE ? OR LOWER(p.email) LIKE ? OR LOWER(p.phone) LIKE ?
      OR LOWER(p.first_name) LIKE ? OR LOWER(p.last_name) LIKE ?
      OR CAST(p.display_id AS TEXT) LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q, q, q);
  }
  if (args.status?.trim()) {
    where += " AND p.crm_status = ?";
    params.push(args.status.trim());
  }
  if (args.agent?.trim()) {
    where += " AND p.agent_name = ?";
    params.push(args.agent.trim());
  }
  if (args.deskId !== undefined && Number.isFinite(args.deskId)) {
    const deskFilter = regionalDeskClientFilter(args.deskId);
    where += deskFilter.sql;
    params.push(...(deskFilter.params as string[]));
  }

  const rows = db
    .prepare(
      `SELECT u.id FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       ${where}
       ORDER BY p.display_id DESC
       LIMIT ?`,
    )
    .all(...params, cap) as { id: string }[];
  return rows.map((r) => r.id);
}

export function bulkUpdateCrmStatus(userIds: string[], crmStatus: string): number {
  return bulkUpdateCrmUsers(userIds, { crmStatus });
}

/** Resolve user IDs for scoped bulk operations on the server (avoids huge client payloads). */
export function resolveCrmBulkUserIds(args: {
  scope: "checked" | "page" | "all";
  userIds?: string[];
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  agent?: string;
  deskId?: number;
}): string[] {
  if (args.scope === "checked") {
    return (args.userIds ?? []).filter(Boolean);
  }
  if (args.scope === "page") {
    const page = Math.max(1, args.page ?? 1);
    const limit = Math.min(500, Math.max(1, args.limit ?? 10));
    const listed = listCrmUsers({
      page,
      limit,
      search: args.search,
      status: args.status,
      agent: args.agent,
      deskId: args.deskId,
    });
    return listed.users.map((u) => u.id);
  }
  return listCrmUserIds({
    search: args.search,
    status: args.status,
    agent: args.agent,
    deskId: args.deskId,
  });
}

export type CrmUserBulkPatch = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phone2: string;
  countryCode: string;
  nationality: string;
  agentName: string;
  desk: string;
  crmStatus: string;
  tradingStatus: string;
  param1: string;
  partner: string;
  campaign: string;
  affiliate: string;
  campaignId: string;
  cpa: string;
  cpl: string;
  comments: string;
  funnel: string;
  conversionRate: string;
  playerValue: string;
  importedSource: string;
  currency: string;
  text1: string;
  address: string;
  address1: string;
  city: string;
  state: string;
  zipCode: string;
  birthday: string;
}>;

export function bulkUpdateCrmUsers(userIds: string[], patch: CrmUserBulkPatch): number {
  ensureUserProfilesSchema();
  if (userIds.length === 0) throw new Error("No users selected.");

  const columnMap: Partial<Record<keyof CrmUserBulkPatch, string>> = {
    firstName: "first_name",
    lastName: "last_name",
    email: "email",
    phone: "phone",
    phone2: "phone2",
    countryCode: "country_code",
    nationality: "nationality",
    agentName: "agent_name",
    desk: "desk",
    crmStatus: "crm_status",
    tradingStatus: "trading_status",
    param1: "param1",
    partner: "partner",
    campaign: "campaign",
    affiliate: "affiliate",
    campaignId: "campaign_id",
    cpa: "cpa",
    cpl: "cpl",
    comments: "comments",
    funnel: "funnel",
    conversionRate: "conversion_rate",
    playerValue: "player_value",
    importedSource: "imported_source",
    currency: "currency",
    text1: "text1",
    address: "address",
    address1: "address1",
    city: "city",
    state: "state",
    zipCode: "zip_code",
    birthday: "birthday",
  };

  const setParts: string[] = [];
  const setParams: string[] = [];
  for (const [key, col] of Object.entries(columnMap) as [keyof CrmUserBulkPatch, string][]) {
    const val = patch[key];
    if (val !== undefined && val !== "") {
      setParts.push(`${col} = ?`);
      setParams.push(String(val));
    }
  }
  if (setParts.length === 0) throw new Error("No fields to update.");

  const db = getDb();
  let totalChanges = 0;
  const CHUNK = 400;
  const setClause = setParts.join(", ");

  const tx = db.transaction(() => {
    for (let i = 0; i < userIds.length; i += CHUNK) {
      const chunk = userIds.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => "?").join(",");
      const result = db
        .prepare(
          `UPDATE user_profiles
           SET ${setClause}
           WHERE user_id IN (${placeholders})
             AND user_id IN (SELECT id FROM users WHERE role = 'user')`,
        )
        .run(...setParams, ...chunk);
      totalChanges += result.changes;
    }
  });
  tx();
  if (patch.crmStatus !== undefined && patch.crmStatus !== "") {
    for (const uid of userIds) syncProfileStatusFromName(uid, patch.crmStatus);
  }
  return totalChanges;
}

/** Hard-delete CRM client accounts and related rows (not admins). */
export function deleteCrmUsers(userIds: string[]): { deleted: number; skipped: number } {
  ensureUserProfilesSchema();
  const db = getDb();
  let deleted = 0;
  let skipped = 0;

  const purgeUser = db.transaction((id: string) => {
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
    for (const t of tables) {
      try {
        db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(id);
      } catch {
        /* table may not exist in older DBs */
      }
    }
    for (const t of ["desk_tasks", "drip_history", "vault_records"]) {
      try {
        db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).run(id);
      } catch {
        /* optional extension tables */
      }
    }
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });

  const tx = db.transaction(() => {
    for (const id of userIds) {
      const u = getUserById(id);
      if (!u || u.role !== "user") {
        skipped += 1;
        continue;
      }
      purgeUser(id);
      deleted += 1;
    }
  });
  tx();
  return { deleted, skipped };
}

export function getCrmUser(userId: string) {
  ensureUserProfilesSchema();
  const online = onlineUserIds();
  const row = buildRow(userId, online);
  if (!row) throw new Error("User not found.");
  return row;
}

export function getAdjacentUserIds(userId: string): { prevId: string | null; nextId: string | null } {
  ensureUserProfilesSchema();
  const db = getDb();
  const cur = db.prepare("SELECT display_id FROM user_profiles WHERE user_id = ?").get(userId) as
    | { display_id: number }
    | undefined;
  if (!cur) return { prevId: null, nextId: null };
  const prev = db
    .prepare(
      `SELECT user_id FROM user_profiles WHERE display_id < ? ORDER BY display_id DESC LIMIT 1`,
    )
    .get(cur.display_id) as { user_id: string } | undefined;
  const next = db
    .prepare(
      `SELECT user_id FROM user_profiles WHERE display_id > ? ORDER BY display_id ASC LIMIT 1`,
    )
    .get(cur.display_id) as { user_id: string } | undefined;
  return { prevId: prev?.user_id ?? null, nextId: next?.user_id ?? null };
}

export function updateCrmUser(
  userId: string,
  patch: Partial<{
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phone2: string;
    address: string;
    address1: string;
    city: string;
    state: string;
    zipCode: string;
    countryCode: string;
    nationality: string;
    birthday: string;
    currency: string;
    agentName: string;
    desk: string;
    crmStatus: string;
    tradingStatus: string;
    text1: string;
    partner: string;
    campaign: string;
    affiliate: string;
    campaignId: string;
    cpa: string;
    cpl: string;
    comments: string;
    funnel: string;
    conversionRate: string;
    playerValue: string;
    importedSource: string;
    param1: string;
    extDocsRequired: boolean;
    exchangeSpread: number;
  }>,
) {
  ensureUserProfilesSchema();
  const db = getDb();
  const u = getUserById(userId);
  if (!u || u.role !== "user") throw new Error("User not found.");

  const tx = db.transaction(() => {
    if (patch.username && patch.username !== u.username) {
      if (getUserByUsername(patch.username)) throw new Error("Username already taken.");
      db.prepare("UPDATE users SET username = ? WHERE id = ?").run(patch.username.trim(), userId);
    }
    if (patch.password) {
      const hash = bcrypt.hashSync(patch.password, 12);
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);
    }

    const fields: [string, string | undefined][] = [
      ["first_name", patch.firstName],
      ["last_name", patch.lastName],
      ["email", patch.email],
      ["phone", patch.phone],
      ["phone2", patch.phone2],
      ["address", patch.address],
      ["address1", patch.address1],
      ["city", patch.city],
      ["state", patch.state],
      ["zip_code", patch.zipCode],
      ["country_code", patch.countryCode],
      ["nationality", patch.nationality],
      ["birthday", patch.birthday],
      ["currency", patch.currency],
      ["agent_name", patch.agentName],
      ["desk", patch.desk],
      ["crm_status", patch.crmStatus],
      ["trading_status", patch.tradingStatus],
      ["text1", patch.text1],
      ["partner", patch.partner],
      ["campaign", patch.campaign],
      ["affiliate", patch.affiliate],
      ["campaign_id", patch.campaignId],
      ["cpa", patch.cpa],
      ["cpl", patch.cpl],
      ["comments", patch.comments],
      ["funnel", patch.funnel],
      ["conversion_rate", patch.conversionRate],
      ["player_value", patch.playerValue],
      ["imported_source", patch.importedSource],
      ["param1", patch.param1],
    ];

    for (const [col, val] of fields) {
      if (val !== undefined) {
        db.prepare(`UPDATE user_profiles SET ${col} = ? WHERE user_id = ?`).run(val, userId);
      }
    }
    if (patch.extDocsRequired !== undefined) {
      db.prepare("UPDATE user_profiles SET ext_docs_required = ? WHERE user_id = ?").run(
        patch.extDocsRequired ? 1 : 0,
        userId,
      );
    }
    if (patch.exchangeSpread !== undefined) {
      const clamped = Math.max(-5, Math.min(5, Math.round(Number(patch.exchangeSpread))));
      db.prepare("UPDATE user_profiles SET exchange_spread = ? WHERE user_id = ?").run(clamped, userId);
    }
  });

  tx();
  if (patch.crmStatus !== undefined) {
    syncProfileStatusFromName(userId, patch.crmStatus);
  }
  return getCrmUser(userId);
}

function slugUsername(base: string): string {
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "user";
}

function uniqueUsername(base: string): string {
  let name = slugUsername(base);
  let n = 0;
  while (getUserByUsername(name)) {
    n += 1;
    name = `${slugUsername(base)}${n}`;
  }
  return name;
}

function stripCsvBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function detectCsvDelimiter(headerLine: string): "," | ";" | "\t" {
  const comma = (headerLine.match(/,/g) ?? []).length;
  const semi = (headerLine.match(/;/g) ?? []).length;
  const tab = (headerLine.match(/\t/g) ?? []).length;
  if (semi > comma && semi >= tab) return ";";
  if (tab > comma && tab >= semi) return "\t";
  return ",";
}

function parseCsvLine(line: string, delimiter: "," | ";" | "\t" = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQ = !inQ;
      }
      continue;
    }
    if (ch === delimiter && !inQ) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

type CsvImportRow = {
  line: number;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  agentName: string;
  crmStatus: string;
  param1: string;
  partner: string;
  campaign: string;
  currency: string;
  initialBalance: number;
};

/** Bulk import uses fewer bcrypt rounds so large files finish before Cloudflare times out. */
const CSV_IMPORT_BCRYPT_ROUNDS = 8;

export async function importUsersFromCsv(csv: string, actorId: string | null) {
  ensureUserProfilesSchema();
  const normalized = stripCsvBom(csv.trim());
  const lines = normalized.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must include a header row and at least one data row.");

  const delimiter = detectCsvDelimiter(lines[0]);
  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const sampleRows = lines.slice(1, 9).map((l) => parseCsvLine(l, delimiter));
  const { map: colMap, labels: columnMapping } = buildCsvColumnMap(rawHeaders, sampleRows);

  const hasIdentity =
    [...colMap.values()].some((f) =>
      ["email", "username", "name", "first_name", "phone"].includes(f),
    ) ||
    sampleRows.some((row) =>
      row.some((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || v.replace(/\D/g, "").length >= 7),
    );

  if (!hasIdentity) {
    throw new Error(
      "Could not map any columns. Include headers like Name, Surname, Email, Phone — any order — or rows with email/phone values.",
    );
  }

  const pending: CsvImportRow[] = [];
  const errors: { line: number; error: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCsvLine(lines[i], delimiter);
      if (values.every((v) => !v.trim())) continue;

      const fields = rowToCrmFields(values, colMap);
      const { firstName, lastName } = parsePersonNames(fields);
      const email = (fields.email ?? "").toLowerCase();
      const phone = fields.phone ?? "";
      const rawUsername = fields.username ?? "";

      if (!email && !phone && !firstName && !lastName && !rawUsername) {
        errors.push({ line: i + 1, error: "Row has no mappable name, email, phone, or username." });
        continue;
      }

      const username = rawUsername
        ? uniqueUsername(slugUsername(rawUsername) || rawUsername)
        : uniqueUsername(
            (email && email.split("@")[0]) ||
              slugUsername(`${firstName}${lastName}`) ||
              slugUsername(firstName) ||
              (phone ? `u${phone.replace(/\D/g, "").slice(-10)}` : "") ||
              `lead${i}`,
          );

      if (getUserByUsername(username)) {
        errors.push({ line: i + 1, error: `Username "${username}" already exists.` });
        continue;
      }

      const currencyRaw = (fields.currency ?? "").toUpperCase();
      const currency = isAccountCurrency(currencyRaw) ? currencyRaw : "USD";

      pending.push({
        line: i + 1,
        username,
        password: fields.password || "ChangeMe123!",
        firstName,
        lastName,
        email,
        phone,
        countryCode: fields.country_code ?? "",
        agentName: fields.agent_name || "Admin Broker",
        crmStatus: fields.crm_status || "New",
        param1: fields.param1 ?? "",
        partner: fields.partner ?? "",
        campaign: fields.campaign ?? "",
        currency,
        initialBalance: parseCsvMoney(fields.initial_balance),
      });
    } catch (err) {
      errors.push({ line: i + 1, error: err instanceof Error ? err.message : "Import failed" });
    }
  }

  const hashed = await Promise.all(
    pending.map(async (row) => ({
      row,
      hash: await bcrypt.hash(row.password, CSV_IMPORT_BCRYPT_ROUNDS),
    })),
  );

  const created: CrmUserRow[] = [];
  const db = getDb();
  const tx = db.transaction(() => {
    for (const { row, hash } of hashed) {
      try {
        const id = randomUUID();
        const now = new Date().toISOString();
        const displayId = allocateDisplayId(db);

        db.prepare(
          "INSERT INTO users (id, username, password_hash, role, credits, created_at) VALUES (?, ?, ?, 'user', 0, ?)",
        ).run(id, row.username, hash, now);

        db.prepare(
          `INSERT INTO user_profiles
           (user_id, display_id, first_name, last_name, email, phone, country_code, agent_name,
            crm_status, param1, partner, campaign, imported_source, currency)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          id,
          displayId,
          row.firstName,
          row.lastName,
          row.email,
          row.phone,
          row.countryCode,
          row.agentName,
          row.crmStatus,
          row.param1,
          row.partner,
          row.campaign,
          `CSV line ${row.line}`,
          row.currency,
        );

        if (row.initialBalance > 0) {
          addLedgerEntry({
            userId: id,
            amountDelta: row.initialBalance,
            reason: "admin_initial_credit",
            actorId,
          });
        }

        const built = buildRow(id, new Set());
        if (built) created.push(built);
      } catch (err) {
        errors.push({ line: row.line, error: err instanceof Error ? err.message : "Import failed" });
      }
    }
  });
  tx();

  return { imported: created.length, users: created, errors, columnMapping };
}

export function registerPublicClient(args: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: string;
  phone: string;
  promoCode?: string;
  campaign?: string;
  currency?: string;
}) {
  ensureUserProfilesSchema();
  const email = args.email.trim().toLowerCase();
  const existing = getDb()
    .prepare("SELECT user_id FROM user_profiles WHERE LOWER(email) = ?")
    .get(email) as { user_id: string } | undefined;
  if (existing) throw new Error("This email is already registered. Please log in instead.");

  let username = email;
  if (getUserByUsername(username)) {
    username = `${email.split("@")[0]}_${Date.now().toString(36)}`;
  }

  const user = createCrmUserWithProfile({
    username,
    password: args.password,
    firstName: args.firstName,
    lastName: args.lastName,
    email,
    phone: args.phone,
    countryCode: args.countryCode,
    crmStatus: "Registered",
    param1: args.promoCode ?? "",
    campaign: args.campaign ?? "",
    currency: args.currency,
    importedSource: "website",
    actorId: null,
  });
  if (!user) throw new Error("Registration failed.");

  recordWebsiteSignup(user.id, { campaign: args.campaign, promoCode: args.promoCode });

  return getCrmUser(user.id);
}

export function createCrmUserWithProfile(args: {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  agentName?: string;
  crmStatus?: string;
  param1?: string;
  campaign?: string;
  initialBalance?: number;
  currency?: string;
  importedSource?: string;
  actorId?: string | null;
}) {
  ensureUserProfilesSchema();
  const db = getDb();
  if (getUserByUsername(args.username)) throw new Error("Username already taken.");

  const currency = isAccountCurrency(args.currency ?? "USD") ? args.currency! : "USD";

  const id = randomUUID();
  const now = new Date().toISOString();
  const hash = bcrypt.hashSync(args.password, 12);
  const displayId = allocateDisplayId(db);

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO users (id, username, password_hash, role, credits, created_at) VALUES (?, ?, ?, 'user', 0, ?)",
    ).run(id, args.username, hash, now);

    db.prepare(
      `INSERT INTO user_profiles
       (user_id, display_id, first_name, last_name, email, phone, country_code, agent_name, crm_status, param1, campaign, currency, imported_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      displayId,
      args.firstName ?? "",
      args.lastName ?? "",
      args.email ?? "",
      args.phone ?? "",
      args.countryCode ?? "",
      args.agentName ?? "Admin Broker",
      args.crmStatus ?? "New",
      args.param1 ?? "",
      args.campaign ?? "",
      currency,
      args.importedSource ?? "manual",
    );

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
  return getCrmUser(id);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function recordWebsiteSignup(userId: string, meta: { campaign?: string; promoCode?: string }) {
  const admin = getDb()
    .prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
    .get() as { id: string } | undefined;
  if (!admin) return;

  const parts = ["Client registered via website."];
  if (meta.campaign) parts.push(`Campaign: ${meta.campaign}`);
  if (meta.promoCode) parts.push(`Promo code: ${meta.promoCode}`);

  createCrmNote({ userId, body: parts.join(" "), authorId: admin.id });
}

// Initialize schema on module load
ensureUserProfilesSchema();
