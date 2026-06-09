/**
 * Per-staff notification preferences (email / push / in-app).
 */
import { getDb } from "./db";
import { listStaffUsers } from "./staffPermissions";
import {
  buildDefaultMatrix,
  cellsToMatrix,
  DESK_DEFAULT_USER_ID,
  isValidNotificationChannel,
  isValidNotificationEvent,
  matrixToCells,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENTS,
  type NotificationChannel,
  type NotificationMatrix,
  type NotificationPrefCell,
} from "../shared/memberNotificationsSchema";

let schemaReady = false;

function ensureMemberNotificationsSchema(): void {
  if (schemaReady) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS crm_notification_pref (
      user_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      event_key TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, channel, event_key)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_notification_pref_user ON crm_notification_pref(user_id);
  `);
  schemaReady = true;
  seedDeskDefaultsIfEmpty();
}

function seedDeskDefaultsIfEmpty(): void {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS c FROM crm_notification_pref WHERE user_id = ?")
    .get(DESK_DEFAULT_USER_ID) as { c: number };
  if (row.c > 0) return;

  const now = new Date().toISOString();
  const matrix = buildDefaultMatrix(true);
  const ins = db.prepare(
    `INSERT INTO crm_notification_pref (user_id, channel, event_key, enabled, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const cell of matrixToCells(matrix)) {
      ins.run(DESK_DEFAULT_USER_ID, cell.channel, cell.eventKey, cell.enabled ? 1 : 0, now);
    }
  });
  tx();
}

function readMatrixForUser(userId: string): NotificationMatrix | null {
  ensureMemberNotificationsSchema();
  const rows = getDb()
    .prepare(
      `SELECT channel, event_key, enabled FROM crm_notification_pref WHERE user_id = ?`,
    )
    .all(userId) as Array<{ channel: string; event_key: string; enabled: number }>;

  if (rows.length === 0) return null;

  const cells: NotificationPrefCell[] = rows
    .filter((r) => isValidNotificationEvent(r.event_key) && isValidNotificationChannel(r.channel))
    .map((r) => ({
      eventKey: r.event_key,
      channel: r.channel as NotificationChannel,
      enabled: Boolean(r.enabled),
    }));

  return cellsToMatrix(cells);
}

function writeMatrixForUser(userId: string, matrix: NotificationMatrix): void {
  ensureMemberNotificationsSchema();
  const now = new Date().toISOString();
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM crm_notification_pref WHERE user_id = ?").run(userId);
    const ins = db.prepare(
      `INSERT INTO crm_notification_pref (user_id, channel, event_key, enabled, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const cell of matrixToCells(matrix)) {
      ins.run(userId, cell.channel, cell.eventKey, cell.enabled ? 1 : 0, now);
    }
  });
  tx();
}

function resolveMatrix(userId: string): NotificationMatrix {
  return readMatrixForUser(userId) ?? getDeskDefaultMatrix();
}

export function getDeskDefaultMatrix(): NotificationMatrix {
  return resolveMatrix(DESK_DEFAULT_USER_ID);
}

export function listMemberNotifications() {
  ensureMemberNotificationsSchema();
  const staff = listStaffUsers().filter((s) => s.isStaff);
  const deskDefault = getDeskDefaultMatrix();

  return {
    catalog: {
      events: NOTIFICATION_EVENTS,
      channels: NOTIFICATION_CHANNELS,
    },
    deskDefault,
    staff: staff.map((s) => ({
      userId: s.userId,
      displayId: s.displayId,
      username: s.username,
      name: s.name,
      email: s.email,
      matrix: resolveMatrix(s.userId),
      hasCustomPrefs: readMatrixForUser(s.userId) !== null,
    })),
  };
}

export function getMemberNotificationMatrix(userId: string): NotificationMatrix {
  if (userId === DESK_DEFAULT_USER_ID) return getDeskDefaultMatrix();
  const staff = listStaffUsers();
  if (!staff.some((s) => s.userId === userId && s.isStaff)) {
    throw new Error("Staff member not found.");
  }
  return resolveMatrix(userId);
}

export function patchMemberNotifications(args: {
  userId: string;
  cells: NotificationPrefCell[];
}): NotificationMatrix {
  if (args.userId === DESK_DEFAULT_USER_ID) {
    const matrix = cellsToMatrix(args.cells);
    writeMatrixForUser(DESK_DEFAULT_USER_ID, matrix);
    return matrix;
  }

  const staff = listStaffUsers();
  if (!staff.some((s) => s.userId === args.userId && s.isStaff)) {
    throw new Error("Staff member not found.");
  }

  const existing = resolveMatrix(args.userId);
  for (const cell of args.cells) {
    if (!isValidNotificationEvent(cell.eventKey) || !isValidNotificationChannel(cell.channel)) continue;
    if (!existing[cell.eventKey]) {
      existing[cell.eventKey] = { email: false, push: false, in_app: false };
    }
    existing[cell.eventKey][cell.channel] = Boolean(cell.enabled);
  }
  writeMatrixForUser(args.userId, existing);
  return existing;
}

export function bulkPatchMemberNotifications(args: {
  userIds: string[];
  cells: NotificationPrefCell[];
}): { updated: number } {
  let updated = 0;
  for (const userId of args.userIds) {
    try {
      patchMemberNotifications({ userId, cells: args.cells });
      updated += 1;
    } catch {
      /* skip invalid ids */
    }
  }
  return { updated };
}

export function copyMemberNotifications(args: {
  fromUserId: string;
  toUserId: string;
}): NotificationMatrix {
  const source = resolveMatrix(args.fromUserId);
  if (args.toUserId === DESK_DEFAULT_USER_ID) {
    writeMatrixForUser(DESK_DEFAULT_USER_ID, source);
    return source;
  }
  const staff = listStaffUsers();
  if (!staff.some((s) => s.userId === args.toUserId && s.isStaff)) {
    throw new Error("Target staff member not found.");
  }
  writeMatrixForUser(args.toUserId, { ...source });
  return source;
}

export function applyDeskDefaultToMember(userId: string): NotificationMatrix {
  const desk = getDeskDefaultMatrix();
  if (userId === DESK_DEFAULT_USER_ID) return desk;
  const staff = listStaffUsers();
  if (!staff.some((s) => s.userId === userId && s.isStaff)) {
    throw new Error("Staff member not found.");
  }
  writeMatrixForUser(userId, { ...desk });
  return desk;
}

/** Runtime check when dispatching alerts. */
export function isNotificationEnabled(
  userId: string,
  eventKey: string,
  channel: NotificationChannel,
): boolean {
  if (!isValidNotificationEvent(eventKey)) return false;
  const matrix = resolveMatrix(userId);
  return Boolean(matrix[eventKey]?.[channel]);
}
