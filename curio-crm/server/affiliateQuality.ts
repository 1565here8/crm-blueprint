/**
 * AFFILIATE QUALITY — per-partner rollup of lead quality, fraud rate,
 * deposit conversion and lifetime value. Snapshots stored daily in
 * affiliate_snapshots for trend tracking.
 */
import { randomUUID } from "crypto";
import { getDb } from "./db";
import { ensureDeskExtensionSchema } from "./desk/schema";
import { ensureUserProfilesSchema } from "./crmUsers";

export type AffiliateRow = {
  partner: string;
  leads: number;
  deposited: number;
  totalDeposits: number;
  conversionPct: number;
  avgDeposit: number;
  badLeadPct: number;
  qualityScore: number;
  recommendation: "scale" | "hold" | "watch" | "kill";
};

export type AffiliateReport = {
  generatedAt: string;
  windowDays: number;
  partners: AffiliateRow[];
};

const DISPOSABLE = new Set([
  "mailinator.com","tempmail.com","10minutemail.com","guerrillamail.com",
  "throwaway.email","yopmail.com","trashmail.com","dispostable.com",
  "fakeinbox.com","getnada.com","sharklasers.com","maildrop.cc",
]);

function isBadEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (!e) return true;
  if (!/^[\w.+-]+@([\w-]+\.)+[a-z]{2,}$/i.test(e)) return true;
  if (e.endsWith("@local")) return true;
  const domain = e.split("@")[1] ?? "";
  return DISPOSABLE.has(domain);
}

export function buildAffiliateReport(opts?: { windowDays?: number; onlyPartner?: string | null }): AffiliateReport {
  ensureUserProfilesSchema();
  const windowDays = Math.min(365, Math.max(1, opts?.windowDays ?? 30));
  const db = getDb();
  const rows = db.prepare(`
    SELECT u.id AS user_id, COALESCE(p.partner,'(direct)') AS partner,
           COALESCE(p.email,'') AS email,
           (SELECT COALESCE(SUM(amount_delta),0) FROM ledger_entries le
             WHERE le.user_id = u.id AND le.amount_delta > 0 AND le.reason LIKE '%credit%') AS dep
    FROM users u JOIN user_profiles p ON p.user_id = u.id
    WHERE u.role = 'user' AND u.created_at >= datetime('now','-' || ? || ' days')
  `).all(windowDays) as Array<{ user_id: string; partner: string; email: string; dep: number }>;

  type B = { partner: string; leads: number; deposited: number; total: number; bad: number };
  const buckets = new Map<string, B>();
  for (const r of rows) {
    if (opts?.onlyPartner != null && r.partner !== opts.onlyPartner) continue;
    let b = buckets.get(r.partner);
    if (!b) { b = { partner: r.partner, leads: 0, deposited: 0, total: 0, bad: 0 }; buckets.set(r.partner, b); }
    b.leads += 1;
    if (Number(r.dep) > 0) { b.deposited += 1; b.total += Number(r.dep); }
    if (isBadEmail(r.email)) b.bad += 1;
  }

  const partners: AffiliateRow[] = [];
  for (const b of buckets.values()) {
    const conv = b.leads ? (b.deposited / b.leads) * 100 : 0;
    const avgDep = b.deposited ? b.total / b.deposited : 0;
    const badPct = b.leads ? (b.bad / b.leads) * 100 : 0;
    const quality = Math.max(0, Math.min(100, Math.round(50 + conv * 1.2 + avgDep / 50 - badPct * 1.5)));
    let rec: AffiliateRow["recommendation"];
    if (b.leads < 5) rec = "watch";
    else if (badPct >= 40 || (conv < 1 && b.leads >= 50)) rec = "kill";
    else if (conv >= 15 && badPct < 10 && avgDep >= 250) rec = "scale";
    else if (conv >= 5) rec = "hold";
    else rec = "watch";
    partners.push({
      partner: b.partner, leads: b.leads, deposited: b.deposited,
      totalDeposits: Math.round(b.total),
      conversionPct: Math.round(conv * 10) / 10,
      avgDeposit: Math.round(avgDep),
      badLeadPct: Math.round(badPct),
      qualityScore: quality,
      recommendation: rec,
    });
  }
  partners.sort((a, b) => b.qualityScore - a.qualityScore);
  return { generatedAt: new Date().toISOString(), windowDays, partners };
}

export function snapshotAffiliateReport(report: AffiliateReport): void {
  ensureDeskExtensionSchema();
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`INSERT INTO affiliate_snapshots
    (id, partner, window_days, leads, deposited, total_deposits, bad_lead_pct, quality_score, recommendation, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const p of report.partners) {
    stmt.run(randomUUID(), p.partner, report.windowDays, p.leads, p.deposited, p.totalDeposits, p.badLeadPct, p.qualityScore, p.recommendation, now);
  }
}
