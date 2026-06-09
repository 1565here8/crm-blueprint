/**
 * Schema bootstrap for THE DESK extensions:
 *   - house_rules            admin-authored prompt injections (the "Rule Room")
 *   - drip_campaigns         email drip campaigns (configurable templates)
 *   - drip_history           per-user drip send log
 *   - drip_state             per-user-per-campaign cadence tracker
 *   - instruction_history    open-instruction audit trail
 *   - lead_quality           per-lead 0..100 quality snapshot
 *   - anomaly_log            daily anomaly snapshots
 *   - affiliate_snapshots    per-partner quality rollups
 *
 * Idempotent. Safe to call on every boot.
 */
import { getDb } from "../db";

export function ensureDeskExtensionSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS house_rules (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      scope       TEXT NOT NULL DEFAULT 'global',
      priority    INTEGER NOT NULL DEFAULT 0,
      enabled     INTEGER NOT NULL DEFAULT 1,
      created_by  TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_house_rules_scope ON house_rules(scope, enabled);

    CREATE TABLE IF NOT EXISTS drip_campaigns (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL UNIQUE,
      trigger_type    TEXT NOT NULL,
      trigger_config  TEXT,
      cadence_hours   TEXT NOT NULL DEFAULT '24,48,72',
      prompt_template TEXT NOT NULL,
      auto_send       INTEGER NOT NULL DEFAULT 0,
      enabled         INTEGER NOT NULL DEFAULT 1,
      created_by      TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drip_history (
      id              TEXT PRIMARY KEY,
      campaign_id     TEXT NOT NULL,
      user_id         TEXT NOT NULL,
      attempt_number  INTEGER NOT NULL DEFAULT 1,
      subject         TEXT NOT NULL,
      body            TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'queued',
      scheduled_for   TEXT,
      sent_at         TEXT,
      approved_by     TEXT,
      created_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_drip_history_status ON drip_history(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_drip_history_user ON drip_history(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS drip_state (
      campaign_id      TEXT NOT NULL,
      user_id          TEXT NOT NULL,
      last_attempt     INTEGER NOT NULL DEFAULT 0,
      last_sent_at     TEXT,
      completed        INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (campaign_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS instruction_history (
      id              TEXT PRIMARY KEY,
      instruction     TEXT NOT NULL,
      plan_json       TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'proposed',
      affected_count  INTEGER NOT NULL DEFAULT 0,
      executed_by     TEXT,
      created_at      TEXT NOT NULL,
      executed_at     TEXT
    );

    CREATE TABLE IF NOT EXISTS lead_quality (
      lead_id     TEXT PRIMARY KEY,
      score       INTEGER NOT NULL DEFAULT 50,
      flags       TEXT NOT NULL DEFAULT '[]',
      recommended_agent TEXT,
      computed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anomaly_log (
      id              TEXT PRIMARY KEY,
      kind            TEXT NOT NULL,
      severity        INTEGER NOT NULL DEFAULT 1,
      headline        TEXT NOT NULL,
      detail_json     TEXT,
      acknowledged_by TEXT,
      acknowledged_at TEXT,
      created_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS affiliate_snapshots (
      id              TEXT PRIMARY KEY,
      partner         TEXT NOT NULL,
      window_days     INTEGER NOT NULL,
      leads           INTEGER NOT NULL DEFAULT 0,
      deposited       INTEGER NOT NULL DEFAULT 0,
      total_deposits  REAL NOT NULL DEFAULT 0,
      bad_lead_pct    REAL NOT NULL DEFAULT 0,
      quality_score   INTEGER NOT NULL DEFAULT 0,
      recommendation  TEXT,
      created_at      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_leads (
      id              TEXT PRIMARY KEY,
      session_id      TEXT,
      name            TEXT,
      email           TEXT,
      phone           TEXT,
      message         TEXT,
      country_code    TEXT,
      city            TEXT,
      timezone        TEXT,
      language        TEXT,
      source          TEXT,
      page            TEXT,
      status          TEXT NOT NULL DEFAULT 'new',
      assigned_agent  TEXT,
      assigned_at     TEXT,
      assigned_by     TEXT,
      conversation    TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_leads_status ON chat_leads(status, created_at DESC);
  `);
}

ensureDeskExtensionSchema();
