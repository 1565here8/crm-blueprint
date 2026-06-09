/**
 * Super Admin maintenance — owner-only platform tools (legacy broker CRM parity).
 */
import { getDb } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";
import { ensureDeskGroupsSchema, listDeskGroups, listDeskGroupsPaginated, setAllGroupsIpsToAll as setAllGroupsIpsToAllDesk } from "./deskGroups";
import { clearMarketBriefCache } from "./marketBrief";
import { clearDeskBriefCache } from "./deskRouteMessage";
import { logHistoryEvent } from "./historyLogs";

const DIAL_PREFIX: Record<string, string> = {
  US: "+1",
  GB: "+44",
  IL: "+972",
  DE: "+49",
  FR: "+33",
  ES: "+34",
  IT: "+39",
  AU: "+61",
  CA: "+1",
  BR: "+55",
  IN: "+91",
};

let schemaReady = false;

function ensureSuperAdminSchema(): void {
  if (schemaReady) return;
  ensureUserProfilesSchema();
  const db = getDb();
  ensureDeskGroupsSchema();
  db.exec(`
    CREATE TABLE IF NOT EXISTS platform_event_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      meta_json TEXT,
      actor TEXT,
      created_at TEXT NOT NULL
    );
  `);
  for (const col of ["dial_prefix", "dial_clid"]) {
    try {
      db.exec(`ALTER TABLE user_profiles ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
    } catch {
      /* column exists */
    }
  }
  schemaReady = true;
}

export function logPlatformEvent(args: {
  kind: string;
  message: string;
  meta?: Record<string, unknown>;
  actor?: string | null;
}): void {
  ensureSuperAdminSchema();
  getDb()
    .prepare(
      "INSERT INTO platform_event_log (kind, message, meta_json, actor, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      args.kind,
      args.message.slice(0, 500),
      args.meta ? JSON.stringify(args.meta) : null,
      args.actor ?? null,
      new Date().toISOString(),
    );
}

export function setAllGroupsIpsToAll(actor?: string | null): { groupsUpdated: number } {
  ensureSuperAdminSchema();
  const r = setAllGroupsIpsToAllDesk();
  logPlatformEvent({
    kind: "history",
    message: "Set all desk group IP allowlists to All.",
    meta: { groupsUpdated: r.groupsUpdated },
    actor,
  });
  logHistoryEvent({
    actionType: "maintenance",
    executedBy: actor,
    routeName: "superAdminOps/setAllGroupsIpsToAll",
    detail: "Set all desk group IP allowlists to All.",
    meta: { groupsUpdated: r.groupsUpdated },
  });
  return { groupsUpdated: r.groupsUpdated };
}

export function refreshAgentPhonePrefixes(actor?: string | null): { agentsUpdated: number } {
  ensureSuperAdminSchema();
  const rows = getDb()
    .prepare(
      `SELECT user_id, phone, country_code
       FROM user_profiles
       WHERE is_staff = 1`,
    )
    .all() as Array<{ user_id: string; phone: string; country_code: string }>;
  const upd = getDb().prepare(
    "UPDATE user_profiles SET dial_prefix = ?, dial_clid = ? WHERE user_id = ?",
  );
  let agentsUpdated = 0;
  for (const row of rows) {
    const cc = (row.country_code || "").trim().toUpperCase();
    const prefix = DIAL_PREFIX[cc] ?? "";
    const phone = (row.phone || "").replace(/\D/g, "");
    const clid = prefix && phone ? `${prefix}${phone.slice(0, 12)}` : prefix || phone.slice(0, 15);
    upd.run(prefix, clid, row.user_id);
    agentsUpdated++;
  }
  logPlatformEvent({
    kind: "history",
    message: "Refreshed phone prefixes / CLIDs for all staff agents.",
    meta: { agentsUpdated },
    actor,
  });
  logHistoryEvent({
    actionType: "maintenance",
    executedBy: actor,
    routeName: "superAdminOps/refreshAgentPhonePrefixes",
    detail: "Refreshed phone prefixes / CLIDs for all staff agents.",
    meta: { agentsUpdated },
  });
  return { agentsUpdated };
}

export function purgePlatformCaches(actor?: string | null): { cachesCleared: string[] } {
  clearMarketBriefCache();
  clearDeskBriefCache();
  const cachesCleared = ["market_brief", "desk_movers"];
  logPlatformEvent({
    kind: "history",
    message: "Purged in-memory platform caches (market brief + desk movers).",
    meta: { cachesCleared },
    actor,
  });
  logHistoryEvent({
    actionType: "maintenance",
    executedBy: actor,
    routeName: "superAdminOps/purgePlatformCaches",
    detail: "Purged in-memory platform caches (market brief + desk movers).",
    meta: { cachesCleared },
  });
  return { cachesCleared };
}

export { listDeskGroups, listDeskGroupsPaginated } from "./deskGroups";

export type PlatformLogRow = {
  id: number;
  kind: string;
  message: string;
  meta_json: string | null;
  actor: string | null;
  created_at: string;
};

export function listPlatformEvents(kind?: string, limit = 80): PlatformLogRow[] {
  ensureSuperAdminSchema();
  if (kind) {
    return getDb()
      .prepare(
        `SELECT id, kind, message, meta_json, actor, created_at
         FROM platform_event_log WHERE kind = ?
         ORDER BY id DESC LIMIT ?`,
      )
      .all(kind, limit) as PlatformLogRow[];
  }
  return getDb()
    .prepare(
      `SELECT id, kind, message, meta_json, actor, created_at
       FROM platform_event_log ORDER BY id DESC LIMIT ?`,
    )
    .all(limit) as PlatformLogRow[];
}
