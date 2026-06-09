/**
 * Per-desk-group permission matrix (CRM + API scopes) in SQLite.
 */
import { getDb } from "./db";
import { listDeskGroups } from "./superAdminOps";
import {
  catalogForScope,
  categoriesForScope,
  defaultGroupPermissions,
  isValidPermissionKey,
  type PermissionScope,
} from "../shared/groupPermissionsSchema";

let schemaReady = false;

function ensureGroupPermissionsSchema(): void {
  if (schemaReady) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS group_permissions (
      group_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (group_id, scope, permission_key)
    );
    CREATE INDEX IF NOT EXISTS idx_group_permissions_scope ON group_permissions(group_id, scope);
  `);
  schemaReady = true;
}

function parseScope(raw: unknown): PermissionScope | null {
  return raw === "crm" || raw === "api" ? raw : null;
}

export function listPermissionGroups() {
  return listDeskGroups().map((g) => ({ id: g.id, name: g.name }));
}

export function getGroupPermissionCatalog(scope: PermissionScope) {
  return {
    scope,
    categories: categoriesForScope(scope),
    permissions: catalogForScope(scope),
  };
}

export function getGroupPermissions(groupId: string, scope: PermissionScope): string[] {
  ensureGroupPermissionsSchema();
  const rows = getDb()
    .prepare(
      `SELECT permission_key FROM group_permissions
       WHERE group_id = ? AND scope = ? AND enabled = 1`,
    )
    .all(groupId, scope) as Array<{ permission_key: string }>;

  if (rows.length === 0) {
    return defaultGroupPermissions(scope, groupId);
  }
  return rows.map((r) => r.permission_key);
}

export function setGroupPermissions(args: {
  groupId: string;
  scope: PermissionScope;
  permissions: string[];
  actor?: string | null;
}): { permissions: string[] } {
  ensureGroupPermissionsSchema();
  const groups = listDeskGroups();
  if (!groups.some((g) => g.id === args.groupId)) {
    throw new Error("Desk group not found.");
  }

  const cleaned = [...new Set(args.permissions.filter((k) => isValidPermissionKey(k, args.scope)))];
  const now = new Date().toISOString();
  const db = getDb();

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM group_permissions WHERE group_id = ? AND scope = ?").run(args.groupId, args.scope);
    const ins = db.prepare(
      `INSERT INTO group_permissions (group_id, scope, permission_key, enabled, updated_at)
       VALUES (?, ?, ?, 1, ?)`,
    );
    for (const key of cleaned) ins.run(args.groupId, args.scope, key, now);
  });
  tx();

  return { permissions: cleaned };
}

export { parseScope };
