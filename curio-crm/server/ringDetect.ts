/**
 * RING DETECTION — spots coordinated abuse across multiple accounts.
 *
 * Signals (all pure-local SQL):
 *   - same-hour deposit cluster: 4+ clients deposit identical amount in same hour
 *   - shared affiliate/campaign signup burst: 5+ signups in 15-minute window from same partner
 *   - shared email-local pattern: 3+ accounts with identical email local part across domains
 *   - identical full name across multiple accounts
 *   - bonus-after-bonus chains: clients linked by referrer/campaign all claimed bonus then withdrew
 */
import { getDb } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";

export type RingFinding = {
  kind: "deposit_cluster" | "signup_burst" | "email_pattern" | "name_collision" | "bonus_chain";
  severity: number;
  headline: string;
  details: Record<string, unknown>;
};

export function detectRings(): RingFinding[] {
  ensureUserProfilesSchema();
  const db = getDb();
  const findings: RingFinding[] = [];

  const depCluster = db.prepare(`
    SELECT strftime('%Y-%m-%dT%H:00', created_at) AS hour, amount_delta AS amount, COUNT(*) AS c,
           GROUP_CONCAT(user_id) AS users
    FROM ledger_entries
    WHERE amount_delta > 0 AND reason LIKE '%credit%'
    GROUP BY hour, amount
    HAVING c >= 4
    ORDER BY c DESC
    LIMIT 20
  `).all() as Array<{ hour: string; amount: number; c: number; users: string }>;
  for (const row of depCluster) {
    findings.push({
      kind: "deposit_cluster",
      severity: row.c >= 6 ? 5 : 3,
      headline: `${row.c} deposits of $${row.amount} at ${row.hour}`,
      details: { hour: row.hour, amount: row.amount, count: row.c, users: row.users.split(",") },
    });
  }

  const burst = db.prepare(`
    SELECT COALESCE(NULLIF(p.partner,''),'(none)') AS partner,
           strftime('%Y-%m-%dT%H:%M', u.created_at) AS bucket,
           COUNT(*) AS c
    FROM users u JOIN user_profiles p ON p.user_id = u.id
    WHERE u.role = 'user'
    GROUP BY partner, bucket
    HAVING c >= 5
    ORDER BY c DESC
    LIMIT 20
  `).all() as Array<{ partner: string; bucket: string; c: number }>;
  for (const row of burst) {
    findings.push({
      kind: "signup_burst",
      severity: row.c >= 10 ? 5 : 3,
      headline: `${row.c} signups via ${row.partner} in minute ${row.bucket}`,
      details: { partner: row.partner, minute: row.bucket, count: row.c },
    });
  }

  const emailLocal = db.prepare(`
    SELECT LOWER(SUBSTR(email, 1, INSTR(email,'@')-1)) AS local, COUNT(*) AS c
    FROM user_profiles
    WHERE email LIKE '%@%' AND INSTR(email,'@')>1
    GROUP BY local
    HAVING c >= 3 AND LENGTH(local) >= 4
    ORDER BY c DESC LIMIT 15
  `).all() as Array<{ local: string; c: number }>;
  for (const row of emailLocal) {
    findings.push({
      kind: "email_pattern",
      severity: row.c >= 5 ? 4 : 2,
      headline: `${row.c} accounts share email local "${row.local}"`,
      details: { localPart: row.local, count: row.c },
    });
  }

  const nameColl = db.prepare(`
    SELECT TRIM(LOWER(first_name || ' ' || last_name)) AS name, COUNT(*) AS c
    FROM user_profiles
    WHERE TRIM(first_name) <> '' AND TRIM(last_name) <> ''
    GROUP BY name
    HAVING c >= 3
    ORDER BY c DESC LIMIT 15
  `).all() as Array<{ name: string; c: number }>;
  for (const row of nameColl) {
    findings.push({
      kind: "name_collision",
      severity: row.c >= 5 ? 4 : 2,
      headline: `${row.c} accounts with identical name "${row.name}"`,
      details: { name: row.name, count: row.c },
    });
  }

  const bonusChain = db.prepare(`
    SELECT COALESCE(NULLIF(p.partner,''),'(none)') AS partner, COUNT(DISTINCT u.id) AS c
    FROM users u JOIN user_profiles p ON p.user_id = u.id
    JOIN ledger_entries lb ON lb.user_id = u.id AND lb.reason LIKE '%bonus%'
    JOIN ledger_entries lw ON lw.user_id = u.id AND lw.amount_delta < 0 AND lw.reason LIKE '%withdraw%'
    WHERE lw.created_at > lb.created_at
    GROUP BY partner
    HAVING c >= 3
    ORDER BY c DESC LIMIT 15
  `).all() as Array<{ partner: string; c: number }>;
  for (const row of bonusChain) {
    findings.push({
      kind: "bonus_chain",
      severity: row.c >= 5 ? 5 : 3,
      headline: `${row.c} accounts via ${row.partner} did bonus-then-withdraw`,
      details: { partner: row.partner, count: row.c },
    });
  }

  return findings.sort((a, b) => b.severity - a.severity);
}
