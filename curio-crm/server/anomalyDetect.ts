/**
 * ANOMALY DETECTOR — compares today vs 7-day baseline.
 *
 * Run daily (and on demand from the admin UI). Persists findings to
 * anomaly_log for an "Anomalies" page in the admin.
 */
import { randomUUID } from "crypto";
import { getDb } from "./db";
import { ensureDeskExtensionSchema } from "./desk/schema";

export type AnomalyKind =
  | "signups_drop" | "signups_spike"
  | "deposits_drop" | "deposits_spike"
  | "withdrawals_spike"
  | "agent_silence"
  | "failed_deposits_spike";

export type Anomaly = {
  id: string;
  kind: AnomalyKind;
  severity: number;
  headline: string;
  detail_json: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
};

function countSince(sql: string, params: unknown[]): number {
  const r = getDb().prepare(sql).get(...params) as { c: number };
  return Number(r?.c ?? 0);
}

export function runAnomalyScan(): Anomaly[] {
  ensureDeskExtensionSchema();
  const db = getDb();
  const findings: Anomaly[] = [];
  const now = new Date().toISOString();

  const signupsToday = countSince(
    `SELECT COUNT(*) AS c FROM users WHERE role='user' AND created_at >= datetime('now','-1 day')`, [],
  );
  const signupsBaseline = countSince(
    `SELECT COUNT(*) AS c FROM users WHERE role='user'
       AND created_at >= datetime('now','-8 days') AND created_at < datetime('now','-1 day')`, [],
  ) / 7;

  const depToday = (db.prepare(
    `SELECT COALESCE(SUM(amount_delta),0) AS c FROM ledger_entries
       WHERE amount_delta > 0 AND reason LIKE '%credit%' AND created_at >= datetime('now','-1 day')`,
  ).get() as { c: number }).c;
  const depBaseline = (db.prepare(
    `SELECT COALESCE(SUM(amount_delta),0) AS c FROM ledger_entries
       WHERE amount_delta > 0 AND reason LIKE '%credit%'
       AND created_at >= datetime('now','-8 days') AND created_at < datetime('now','-1 day')`,
  ).get() as { c: number }).c / 7;

  const wdToday = (db.prepare(
    `SELECT COALESCE(SUM(ABS(amount_delta)),0) AS c FROM ledger_entries
       WHERE amount_delta < 0 AND reason LIKE '%withdraw%' AND created_at >= datetime('now','-1 day')`,
  ).get() as { c: number }).c;
  const wdBaseline = (db.prepare(
    `SELECT COALESCE(SUM(ABS(amount_delta)),0) AS c FROM ledger_entries
       WHERE amount_delta < 0 AND reason LIKE '%withdraw%'
       AND created_at >= datetime('now','-8 days') AND created_at < datetime('now','-1 day')`,
  ).get() as { c: number }).c / 7;

  const failedDeposits = countSince(
    `SELECT COUNT(*) AS c FROM deposit_requests
       WHERE status = 'pending' AND created_at >= datetime('now','-1 day')`, [],
  );

  const insert = (k: AnomalyKind, severity: number, headline: string, detail: unknown) => {
    const id = randomUUID();
    db.prepare(`INSERT INTO anomaly_log (id, kind, severity, headline, detail_json, acknowledged_by, acknowledged_at, created_at)
                VALUES (?,?,?,?,?,?,?,?)`,
    ).run(id, k, severity, headline, JSON.stringify(detail), null, null, now);
    findings.push({ id, kind: k, severity, headline, detail_json: JSON.stringify(detail), acknowledged_by: null, acknowledged_at: null, created_at: now });
  };

  if (signupsBaseline >= 3 && signupsToday >= signupsBaseline * 2 + 3) {
    insert("signups_spike", 2, `Signups +${Math.round((signupsToday / Math.max(1, signupsBaseline) - 1) * 100)}% vs 7d avg (${signupsToday} vs ${signupsBaseline.toFixed(1)})`, { today: signupsToday, baseline: signupsBaseline });
  }
  if (signupsBaseline >= 5 && signupsToday < signupsBaseline * 0.4) {
    insert("signups_drop", 3, `Signups down ${Math.round((1 - signupsToday / signupsBaseline) * 100)}% vs 7d avg`, { today: signupsToday, baseline: signupsBaseline });
  }

  if (depBaseline >= 100 && depToday >= depBaseline * 2 + 200) {
    insert("deposits_spike", 1, `Deposits spike: $${Math.round(depToday)} today vs $${Math.round(depBaseline)} avg`, { today: depToday, baseline: depBaseline });
  }
  if (depBaseline >= 200 && depToday < depBaseline * 0.4) {
    insert("deposits_drop", 4, `Deposits down ${Math.round((1 - depToday / depBaseline) * 100)}% vs 7d avg`, { today: depToday, baseline: depBaseline });
  }
  if (wdBaseline >= 100 && wdToday >= wdBaseline * 2.5 + 200) {
    insert("withdrawals_spike", 4, `Withdrawals spike: $${Math.round(wdToday)} today vs $${Math.round(wdBaseline)} avg`, { today: wdToday, baseline: wdBaseline });
  }
  if (failedDeposits >= 5) {
    insert("failed_deposits_spike", 3, `${failedDeposits} pending deposit requests in last 24h`, { failedDeposits });
  }

  const silentAgents = db.prepare(`
    SELECT COALESCE(NULLIF(TRIM(p.agent_name),''), 'Admin Broker') AS agent,
           MAX(n.created_at) AS last_at
    FROM user_profiles p
    LEFT JOIN crm_notes n ON n.user_id = p.user_id
    GROUP BY agent
    HAVING last_at IS NULL OR last_at < datetime('now','-1 day')
  `).all() as Array<{ agent: string; last_at: string | null }>;
  if (silentAgents.length >= 2) {
    insert("agent_silence", 2, `${silentAgents.length} agents silent in last 24h`, { agents: silentAgents.map((a) => a.agent) });
  }

  return findings;
}

export function listAnomalies(filter?: { acknowledged?: boolean; limit?: number }): Anomaly[] {
  ensureDeskExtensionSchema();
  const lim = Math.min(500, filter?.limit ?? 100);
  if (filter?.acknowledged === true) {
    return getDb().prepare("SELECT * FROM anomaly_log WHERE acknowledged_at IS NOT NULL ORDER BY created_at DESC LIMIT ?").all(lim) as Anomaly[];
  }
  if (filter?.acknowledged === false) {
    return getDb().prepare("SELECT * FROM anomaly_log WHERE acknowledged_at IS NULL ORDER BY created_at DESC LIMIT ?").all(lim) as Anomaly[];
  }
  return getDb().prepare("SELECT * FROM anomaly_log ORDER BY created_at DESC LIMIT ?").all(lim) as Anomaly[];
}

export function acknowledgeAnomaly(args: { id: string; actorId: string | null }): boolean {
  ensureDeskExtensionSchema();
  const now = new Date().toISOString();
  return getDb().prepare("UPDATE anomaly_log SET acknowledged_by=?, acknowledged_at=? WHERE id=? AND acknowledged_at IS NULL")
    .run(args.actorId, now, args.id).changes > 0;
}
