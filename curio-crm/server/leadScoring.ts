/**
 * SMART LEAD SCORING at capture / signup.
 *
 * Pure-deterministic 0..100 quality score with flags. Stored in lead_quality
 * so the CRM list can colour leads instantly and the Lead Inbox can sort.
 *
 * Used at:
 *  - Concierge widget lead capture (server/concierge.ts)
 *  - Public signup (server/crmUsers.ts > registerPublicClient — optional)
 */
import { getDb } from "./db";
import { ensureDeskExtensionSchema } from "./desk/schema";

export type LeadQualityFlag =
  | "bad_email" | "disposable_email" | "no_email"
  | "bad_phone" | "no_phone"
  | "gibberish_name" | "no_name"
  | "high_value_country" | "low_value_country"
  | "campaign_known" | "no_campaign"
  | "speed_run_signup";

export type LeadScore = {
  score: number;
  flags: LeadQualityFlag[];
  recommendedAgent: string | null;
};

const DISPOSABLE = new Set([
  "mailinator.com","tempmail.com","10minutemail.com","guerrillamail.com",
  "throwaway.email","yopmail.com","trashmail.com","dispostable.com",
  "fakeinbox.com","getnada.com","sharklasers.com","maildrop.cc",
]);

const HIGH_VALUE_COUNTRIES = new Set(["US","GB","CA","AU","DE","CH","NL","SE","NO","DK","SG","HK","AE","IE","BE","FR","IT"]);
const LOW_VALUE_COUNTRIES = new Set(["NG","PK","BD","MM","KH","LA","ET","SD"]);

export function scoreLead(input: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
  campaign?: string | null;
  partner?: string | null;
  signupAgeSeconds?: number | null;
}): LeadScore {
  const flags: LeadQualityFlag[] = [];
  let score = 50;

  const email = (input.email ?? "").trim().toLowerCase();
  const phone = (input.phone ?? "").trim();
  const name = (input.name ?? "").trim();

  if (!email) { flags.push("no_email"); score -= 20; }
  else {
    if (!/^[\w.+-]+@([\w-]+\.)+[a-z]{2,}$/i.test(email)) { flags.push("bad_email"); score -= 25; }
    else {
      const domain = email.split("@")[1] ?? "";
      if (DISPOSABLE.has(domain)) { flags.push("disposable_email"); score -= 25; }
      else score += 10;
    }
  }

  const digits = phone.replace(/\D+/g, "");
  if (!phone) { flags.push("no_phone"); score -= 10; }
  else if (digits.length < 7 || /^(\d)\1+$/.test(digits)) { flags.push("bad_phone"); score -= 15; }
  else score += 5;

  if (!name) { flags.push("no_name"); score -= 5; }
  else if (/^(.)\1{3,}$/.test(name.toLowerCase()) || /^[qwxz]{4,}$/.test(name.toLowerCase())) {
    flags.push("gibberish_name"); score -= 15;
  } else if (name.length >= 4) score += 5;

  const cc = (input.countryCode ?? "").toUpperCase();
  if (cc && HIGH_VALUE_COUNTRIES.has(cc)) { flags.push("high_value_country"); score += 15; }
  else if (cc && LOW_VALUE_COUNTRIES.has(cc)) { flags.push("low_value_country"); score -= 15; }

  if (input.campaign && input.campaign.trim()) { flags.push("campaign_known"); score += 5; }
  else flags.push("no_campaign");

  if (typeof input.signupAgeSeconds === "number" && input.signupAgeSeconds >= 0 && input.signupAgeSeconds < 8) {
    flags.push("speed_run_signup"); score -= 12;
  }

  const recommendedAgent = recommendAgentByCountry(cc);

  return { score: Math.max(0, Math.min(100, Math.round(score))), flags, recommendedAgent };
}

function recommendAgentByCountry(countryCode: string): string | null {
  if (!countryCode) return null;
  const db = getDb();
  try {
    const row = db.prepare(`
      SELECT COALESCE(NULLIF(TRIM(p.agent_name),''),'Admin Broker') AS agent, COUNT(*) AS c
      FROM users u JOIN user_profiles p ON p.user_id = u.id
      WHERE UPPER(p.country_code) = ?
      GROUP BY agent
      ORDER BY c DESC LIMIT 1
    `).get(countryCode) as { agent: string; c: number } | undefined;
    return row?.agent ?? null;
  } catch {
    return null;
  }
}

export function storeLeadScore(leadId: string, score: LeadScore): void {
  ensureDeskExtensionSchema();
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO lead_quality (lead_id, score, flags, recommended_agent, computed_at) VALUES (?,?,?,?,?)
     ON CONFLICT(lead_id) DO UPDATE SET score=excluded.score, flags=excluded.flags,
       recommended_agent=excluded.recommended_agent, computed_at=excluded.computed_at`,
  ).run(leadId, score.score, JSON.stringify(score.flags), score.recommendedAgent, now);
}

export function getLeadScore(leadId: string): LeadScore | null {
  ensureDeskExtensionSchema();
  const row = getDb().prepare("SELECT * FROM lead_quality WHERE lead_id = ?").get(leadId) as
    | { lead_id: string; score: number; flags: string; recommended_agent: string | null } | undefined;
  if (!row) return null;
  let flags: LeadQualityFlag[] = [];
  try { flags = JSON.parse(row.flags) as LeadQualityFlag[]; } catch { flags = []; }
  return { score: row.score, flags, recommendedAgent: row.recommended_agent };
}
