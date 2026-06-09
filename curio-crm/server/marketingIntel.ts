/**
 * MARKETING INTELLIGENCE — per-campaign / per-partner ROI + lead quality.
 *
 * Pure local SQLite reads. The LLM may narrate the report, but every
 * number is deterministic and reproducible from the database snapshot.
 *
 * Per campaign:
 *   - leads, depositors, deposit conversion %
 *   - total deposits, avg deposit, time-to-first-deposit (median minutes)
 *   - KYC pass rate (clients with id+poa approved)
 *   - bad-lead rate (bad email / bad phone / disposable / gibberish name)
 *   - LLM-ready recommendation slot ("scale" / "watch" / "kill")
 */
import { getDb } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";

export type CampaignStats = {
  campaign: string;
  partner: string;
  leads: number;
  depositors: number;
  depositConversionPct: number;
  totalDeposits: number;
  avgDeposit: number;
  medianTimeToDepositMinutes: number | null;
  kycPassPct: number;
  badLeadPct: number;
  recommendation: "scale" | "hold" | "watch" | "kill";
  notes: string[];
};

export type MarketingReport = {
  generatedAt: string;
  totals: {
    campaigns: number;
    leads: number;
    depositors: number;
    deposits: number;
    avgConversionPct: number;
  };
  campaigns: CampaignStats[];
  warnings: string[];
};

type Row = {
  user_id: string;
  campaign: string;
  partner: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  created_at: string;
};

type DepRow = { user_id: string; total: number; first_at: string | null };
type DocRow = { user_id: string; doc_type: string; status: string };

const DISPOSABLE = new Set([
  "mailinator.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
  "throwaway.email", "yopmail.com", "trashmail.com", "dispostable.com",
  "fakeinbox.com", "getnada.com", "sharklasers.com", "maildrop.cc",
]);

function isBadEmail(e: string): boolean {
  const t = e.trim().toLowerCase();
  if (!t) return true;
  if (!/^[\w.+-]+@([\w-]+\.)+[a-z]{2,}$/i.test(t)) return true;
  if (t.endsWith("@local")) return true;
  const domain = t.split("@")[1] ?? "";
  if (DISPOSABLE.has(domain)) return true;
  const local = t.split("@")[0] ?? "";
  if (/(.)\1{4,}/.test(local)) return true;
  return false;
}

function isBadPhone(p: string): boolean {
  const d = p.replace(/\D+/g, "");
  if (!d) return true;
  if (d.length < 7) return true;
  if (/^(\d)\1+$/.test(d)) return true;
  return false;
}

function isGibberishName(n: string): boolean {
  const t = n.trim().toLowerCase();
  if (!t) return false;
  return /^(.)\1{3,}$/.test(t) || /^[qwxz]{4,}$/.test(t);
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[m - 1]! + s[m]!) / 2) : s[m]!;
}

export function buildMarketingReport(opts?: { onlyPartner?: string | null }): MarketingReport {
  ensureUserProfilesSchema();
  const db = getDb();
  const warnings: string[] = [];

  const rows = db.prepare(`
    SELECT u.id AS user_id,
           COALESCE(p.campaign, '') AS campaign,
           COALESCE(p.partner, '')  AS partner,
           COALESCE(p.email, '')    AS email,
           COALESCE(p.phone, '')    AS phone,
           COALESCE(p.first_name, '') AS first_name,
           COALESCE(p.last_name, '')  AS last_name,
           u.created_at
    FROM users u JOIN user_profiles p ON p.user_id = u.id
    WHERE u.role = 'user'
  `).all() as Row[];

  const deps = db.prepare(`
    SELECT user_id,
           SUM(CASE WHEN amount_delta > 0 THEN amount_delta ELSE 0 END) AS total,
           MIN(CASE WHEN amount_delta > 0 THEN created_at ELSE NULL END) AS first_at
    FROM ledger_entries
    WHERE reason LIKE '%credit%'
    GROUP BY user_id
  `).all() as DepRow[];
  const depMap = new Map(deps.map((d) => [d.user_id, d]));

  const docs = db.prepare(`SELECT user_id, doc_type, status FROM user_documents`).all() as DocRow[];
  const docByUser = new Map<string, DocRow[]>();
  for (const d of docs) {
    const arr = docByUser.get(d.user_id) ?? [];
    arr.push(d); docByUser.set(d.user_id, arr);
  }
  const passesKyc = (uid: string): boolean => {
    const dd = docByUser.get(uid) ?? [];
    const idOk = dd.some((d) => /id|passport|driver/i.test(d.doc_type) && d.status === "approved");
    const poaOk = dd.some((d) => /address|utility|bill/i.test(d.doc_type) && d.status === "approved");
    return idOk && poaOk;
  };

  type Bucket = {
    campaign: string; partner: string;
    leads: Row[];
    deps: number; totalDep: number; firstDeps: number[];
    kycPass: number; badLeads: number;
  };
  const buckets = new Map<string, Bucket>();
  for (const r of rows) {
    if (opts?.onlyPartner != null && r.partner !== opts.onlyPartner) continue;
    const key = `${r.campaign}|${r.partner}`;
    let b = buckets.get(key);
    if (!b) {
      b = { campaign: r.campaign || "(direct)", partner: r.partner || "(none)", leads: [], deps: 0, totalDep: 0, firstDeps: [], kycPass: 0, badLeads: 0 };
      buckets.set(key, b);
    }
    b.leads.push(r);
    const d = depMap.get(r.user_id);
    if (d && Number(d.total) > 0) {
      b.deps += 1;
      b.totalDep += Number(d.total);
      if (d.first_at) {
        const dt = (new Date(d.first_at).getTime() - new Date(r.created_at).getTime()) / 60_000;
        if (Number.isFinite(dt) && dt >= 0) b.firstDeps.push(dt);
      }
    }
    if (passesKyc(r.user_id)) b.kycPass += 1;
    if (isBadEmail(r.email) || isBadPhone(r.phone) || isGibberishName(r.first_name) || isGibberishName(r.last_name)) {
      b.badLeads += 1;
    }
  }

  const campaigns: CampaignStats[] = [];
  for (const b of buckets.values()) {
    const conv = b.leads.length ? (b.deps / b.leads.length) * 100 : 0;
    const avgDep = b.deps ? b.totalDep / b.deps : 0;
    const badPct = b.leads.length ? (b.badLeads / b.leads.length) * 100 : 0;
    const kycPct = b.leads.length ? (b.kycPass / b.leads.length) * 100 : 0;

    let rec: CampaignStats["recommendation"];
    const notes: string[] = [];
    if (b.leads.length < 5) {
      rec = "watch"; notes.push("too few leads to judge");
    } else if (badPct >= 40 || (conv < 1 && b.leads.length >= 50)) {
      rec = "kill"; if (badPct >= 40) notes.push(`bad-lead rate ${badPct.toFixed(0)}%`);
      if (conv < 1) notes.push("no conversion");
    } else if (conv >= 15 && badPct < 10 && avgDep >= 250) {
      rec = "scale"; notes.push(`${conv.toFixed(0)}% conv, $${avgDep.toFixed(0)} avg`);
    } else if (conv >= 5) {
      rec = "hold"; notes.push(`${conv.toFixed(0)}% conv`);
    } else {
      rec = "watch"; notes.push(`${conv.toFixed(0)}% conv`);
    }

    campaigns.push({
      campaign: b.campaign, partner: b.partner,
      leads: b.leads.length, depositors: b.deps,
      depositConversionPct: Math.round(conv * 10) / 10,
      totalDeposits: Math.round(b.totalDep),
      avgDeposit: Math.round(avgDep),
      medianTimeToDepositMinutes: median(b.firstDeps),
      kycPassPct: Math.round(kycPct),
      badLeadPct: Math.round(badPct),
      recommendation: rec, notes,
    });
  }
  campaigns.sort((a, b) => b.totalDeposits - a.totalDeposits || b.leads - a.leads);

  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalDeps = campaigns.reduce((s, c) => s + c.depositors, 0);
  const totalMoney = campaigns.reduce((s, c) => s + c.totalDeposits, 0);
  const avgConv = totalLeads ? (totalDeps / totalLeads) * 100 : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      campaigns: campaigns.length, leads: totalLeads, depositors: totalDeps,
      deposits: Math.round(totalMoney), avgConversionPct: Math.round(avgConv * 10) / 10,
    },
    campaigns, warnings,
  };
}

export function marketingReportToContextText(r: MarketingReport): string {
  const lines: string[] = [];
  lines.push(`MARKETING @ ${r.generatedAt}`);
  lines.push(`totals: campaigns=${r.totals.campaigns} leads=${r.totals.leads} depositors=${r.totals.depositors} avgConv=${r.totals.avgConversionPct}%`);
  lines.push("");
  lines.push("## Campaigns (top by deposits)");
  for (const c of r.campaigns.slice(0, 20)) {
    lines.push(`${c.campaign}/${c.partner} | leads=${c.leads} dep=${c.depositors} (${c.depositConversionPct}%) total=$${c.totalDeposits} avg=$${c.avgDeposit} bad=${c.badLeadPct}% kyc=${c.kycPassPct}% rec=${c.recommendation}`);
  }
  return lines.join("\n");
}
