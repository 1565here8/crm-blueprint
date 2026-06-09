import { getDb } from "./db";
import { PREFERENCE_DEFAULTS } from "../shared/platformPreferencesSchema";

let ready = false;

function ensure(): void {
  if (ready) return;
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);
  ready = true;
}

export function getPlatformSettings(keys: string[]): Record<string, string> {
  ensure();
  const out: Record<string, string> = {};
  const stmt = getDb().prepare("SELECT key, value FROM platform_settings WHERE key = ?");
  for (const k of keys) {
    const row = stmt.get(k) as { value: string } | undefined;
    out[k] = row?.value ?? "";
  }
  return out;
}

export function setPlatformSettings(patch: Record<string, string>): Record<string, string> {
  ensure();
  const now = new Date().toISOString();
  const upsert = getDb().prepare(
    "INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  );
  for (const [key, value] of Object.entries(patch)) {
    upsert.run(key.slice(0, 80), value.slice(0, 2000), now);
  }
  return getPlatformSettings(Object.keys(patch));
}

export const COMMON_SETTING_DEFAULTS: Record<string, string> = {
  "common.default_currency": "USD",
  "common.default_timezone": "UTC",
  "common.date_format": "DD/MM/YYYY",
  "common.release_pdf_url": "",
  "common.release_pdf_title": "Platform release notes",
  "common.session_timeout_hours": "12",
  "common.staff_ip_lock": "0",
  "common.admin_ip_allowlist": "",
  "common.staff_ip_allowlist": "",
  "common.login_attempt_limit": "10",
  "security.off_hours_enabled": "0",
  "security.off_hours_start": "22",
  "security.off_hours_end": "6",
};

export function getCommonSettingsBundle(): Record<string, string> {
  ensure();
  const keys = Object.keys(COMMON_SETTING_DEFAULTS);
  const cur = getPlatformSettings(keys);
  return { ...COMMON_SETTING_DEFAULTS, ...cur };
}

export function getPreferencesBundle(): Record<string, string> {
  ensure();
  const keys = Object.keys(PREFERENCE_DEFAULTS);
  const cur = getPlatformSettings(keys);
  return { ...PREFERENCE_DEFAULTS, ...cur };
}

export function setPreferences(patch: Record<string, string>): Record<string, string> {
  const allowed = new Set(Object.keys(PREFERENCE_DEFAULTS));
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (allowed.has(k)) filtered[k] = v;
  }
  setPlatformSettings(filtered);
  return getPreferencesBundle();
}
