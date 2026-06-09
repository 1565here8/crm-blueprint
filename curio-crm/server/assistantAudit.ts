/**
 * CRM audit engine — pure data, zero opinions.
 *
 * Scans the local SQLite store and returns structured operator findings:
 * bad leads, dead investors, pipeline gaps, document gaps, agent silence,
 * duplicates. Feeds both the admin UI panels AND the local Ollama prompt
 * as compact context. Runs entirely on the operator's VPS — no egress.
 */
import { getDb, listAdminLedger, listCrmNotes, listCrmEmails } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";
import { listOnlineVisitors } from "./presence";

const MS_DAY = 86_400_000;
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "dispostable.com",
  "fakeinbox.com",
  "getnada.com",
  "sharklasers.com",
  "maildrop.cc",
]);

export type LeadFlag =
  | "bad_email"
  | "bad_phone"
  | "no_phone"
  | "no_email"
  | "duplicate_email"
  | "duplicate_phone"
  | "disposable_email"
  | "gibberish_name"
  | "dead_investor"
  | "deposited_no_docs"
  | "never_logged_in"
  | "no_contact_since_signup"
  | "no_recent_contact"
  | "no_agent_assigned"
  | "high_value_no_followup"
  | "uncalled"
  | "unanswered_emails";

export type AuditFinding = {
  userId: string;
  displayId: number;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  agentName: string;
  crmStatus: string;
  totalDeposits: number;
  signupDays: number;
  lastContactDays: number | null;
  online: boolean;
  flags: LeadFlag[];
  severity: number;
};

export type AuditCategoryKey =
  | "bad_leads"
  | "fake_or_dead_investors"
  | "uncalled"
  | "unanswered"
  | "document_gaps"
  | "pipeline_stalled"
  | "agent_silence"
  | "duplicates";

export type AuditCategory = {
  key: AuditCategoryKey;
  label: string;
  description: string;
  count: number;
  findings: AuditFinding[];
};

export type AuditReport = {
  generatedAt: string;
  totals: {
    users: number;
    online: number;
    depositors: number;
    silentAgents: number;
    flaggedLeads: number;
  };
  agentLoad: Array<{ agent: string; count: number }>;
  categories: AuditCategory[];
};

type Row = {
  user_id: string;
  display_id: number;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  country_code: string;
  agent_name: string;
  crm_status: string;
  last_login_at: string | null;
  created_at: string;
};

function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / MS_DAY);
}

function isGibberish(s: string): boolean {
  const t = s.trim().toLowerCase();
  if (!t) return false;
  if (/^(.)\1{3,}$/.test(t)) return true;
  if (/^[qwxz]{4,}$/.test(t)) return true;
  if (/^[asdfghjkl]{6,}$/.test(t)) return true;
  if (/^[zxcvbnm]{6,}$/.test(t)) return true;
  return false;
}

function isBadEmail(email: string): { bad: boolean; disposable: boolean } {
  const e = email.trim().toLowerCase();
  if (!e) return { bad: true, disposable: false };
  const re = /^[\w.+-]+@([\w-]+\.)+[a-z]{2,}$/i;
  if (!re.test(e)) return { bad: true, disposable: false };
  if (e.endsWith("@local")) return { bad: true, disposable: false };
  const domain = e.split("@")[1] ?? "";
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return { bad: false, disposable: true };
  const local = e.split("@")[0] ?? "";
  if (local.length >= 5 && /^[a-z]+$/.test(local) && /(.)\1{3,}/.test(local)) {
    return { bad: true, disposable: false };
  }
  return { bad: false, disposable: false };
}

function isBadPhone(phone: string): boolean {
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return true;
  if (digits.length < 7) return true;
  if (/^0+$/.test(digits)) return true;
  if (/^(\d)\1+$/.test(digits)) return true;
  return false;
}

function loadRows(): Row[] {
  ensureUserProfilesSchema();
  return getDb()
    .prepare(
      `SELECT
         u.id AS user_id,
         p.display_id,
         COALESCE(p.email, '')        AS email,
         COALESCE(p.phone, '')        AS phone,
         COALESCE(p.first_name, '')   AS first_name,
         COALESCE(p.last_name, '')    AS last_name,
         COALESCE(p.country_code, '') AS country_code,
         COALESCE(p.agent_name, '')   AS agent_name,
         COALESCE(p.crm_status, '')   AS crm_status,
         p.last_login_at,
         u.created_at
       FROM users u
       JOIN user_profiles p ON p.user_id = u.id
       WHERE u.role = 'user'`,
    )
    .all() as Row[];
}

function depositTotalsByUser(): Map<string, number> {
  const rows = listAdminLedger({
    reasons: ["admin_credit", "admin_initial_credit"],
    limit: 100_000,
  });
  const m = new Map<string, number>();
  for (const r of rows) {
    if (Number(r.amount_delta) > 0) {
      m.set(r.user_id, (m.get(r.user_id) ?? 0) + Math.abs(Number(r.amount_delta)));
    }
  }
  return m;
}

function noteCountByUser(): Map<string, { count: number; lastAt: string | null }> {
  const m = new Map<string, { count: number; lastAt: string | null }>();
  for (const n of listCrmNotes()) {
    if (!n.user_id) continue;
    const cur = m.get(n.user_id) ?? { count: 0, lastAt: null };
    cur.count += 1;
    if (!cur.lastAt || n.created_at > cur.lastAt) cur.lastAt = n.created_at;
    m.set(n.user_id, cur);
  }
  return m;
}

function emailCountByUser(): Map<string, { count: number; lastAt: string | null }> {
  const m = new Map<string, { count: number; lastAt: string | null }>();
  for (const e of listCrmEmails()) {
    if (!e.user_id) continue;
    const cur = m.get(e.user_id) ?? { count: 0, lastAt: null };
    cur.count += 1;
    if (!cur.lastAt || e.sent_at > cur.lastAt) cur.lastAt = e.sent_at;
    m.set(e.user_id, cur);
  }
  return m;
}

export function buildAuditReport(): AuditReport {
  const rows = loadRows();
  const deposits = depositTotalsByUser();
  const notes = noteCountByUser();
  const emails = emailCountByUser();
  const online = new Set(
    listOnlineVisitors()
      .filter((v) => v.userId)
      .map((v) => v.userId as string),
  );

  const emailIndex = new Map<string, string[]>();
  const phoneIndex = new Map<string, string[]>();
  for (const r of rows) {
    const e = r.email.trim().toLowerCase();
    const p = r.phone.replace(/\D+/g, "");
    if (e && !e.endsWith("@local")) {
      const arr = emailIndex.get(e) ?? [];
      arr.push(r.user_id);
      emailIndex.set(e, arr);
    }
    if (p && p.length >= 7) {
      const arr = phoneIndex.get(p) ?? [];
      arr.push(r.user_id);
      phoneIndex.set(p, arr);
    }
  }
  const dupEmails = new Set([...emailIndex.entries()].filter(([, ids]) => ids.length > 1).flatMap(([, ids]) => ids));
  const dupPhones = new Set([...phoneIndex.entries()].filter(([, ids]) => ids.length > 1).flatMap(([, ids]) => ids));

  const findings: AuditFinding[] = rows.map((r) => {
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
    const dep = deposits.get(r.user_id) ?? 0;
    const noteInfo = notes.get(r.user_id);
    const emailInfo = emails.get(r.user_id);
    const signupDays = daysAgo(r.created_at) ?? 0;
    const lastNote = daysAgo(noteInfo?.lastAt ?? null);
    const lastEmail = daysAgo(emailInfo?.lastAt ?? null);
    const lastLogin = daysAgo(r.last_login_at);
    const lastContact = [lastNote, lastEmail]
      .filter((x): x is number => x !== null)
      .sort((a, b) => a - b)[0] ?? null;
    const isOnline = online.has(r.user_id);

    const emailCheck = isBadEmail(r.email);
    const phoneBad = isBadPhone(r.phone);
    const flags: LeadFlag[] = [];

    if (emailCheck.bad) flags.push("bad_email");
    if (emailCheck.disposable) flags.push("disposable_email");
    if (!r.email.trim()) flags.push("no_email");
    if (phoneBad) flags.push("bad_phone");
    if (!r.phone.trim()) flags.push("no_phone");
    if (isGibberish(r.first_name) || isGibberish(r.last_name)) flags.push("gibberish_name");
    if (dupEmails.has(r.user_id)) flags.push("duplicate_email");
    if (dupPhones.has(r.user_id)) flags.push("duplicate_phone");
    if (!r.agent_name || r.agent_name === "Admin Broker") flags.push("no_agent_assigned");
    if (!r.last_login_at && signupDays > 3) flags.push("never_logged_in");
    if (dep > 0 && lastLogin !== null && lastLogin > 14) flags.push("dead_investor");
    if (dep >= 500) flags.push("deposited_no_docs");
    if ((noteInfo?.count ?? 0) === 0 && signupDays > 1) flags.push("uncalled");
    if (lastContact === null && signupDays > 3) flags.push("no_contact_since_signup");
    if (lastContact !== null && lastContact > 14) flags.push("no_recent_contact");
    if ((emailInfo?.count ?? 0) > 0 && (noteInfo?.count ?? 0) === 0) flags.push("unanswered_emails");
    if (dep >= 1000 && (lastContact ?? signupDays) > 7) flags.push("high_value_no_followup");

    const severity =
      (flags.includes("bad_email") ? 3 : 0) +
      (flags.includes("bad_phone") ? 2 : 0) +
      (flags.includes("disposable_email") ? 2 : 0) +
      (flags.includes("dead_investor") ? 5 : 0) +
      (flags.includes("high_value_no_followup") ? 6 : 0) +
      (flags.includes("uncalled") ? 1 : 0) +
      (flags.includes("never_logged_in") ? 1 : 0) +
      (flags.includes("duplicate_email") ? 2 : 0) +
      (flags.includes("gibberish_name") ? 1 : 0) +
      Math.min(5, Math.floor((signupDays ?? 0) / 14));

    return {
      userId: r.user_id,
      displayId: Number(r.display_id),
      name: name || r.email || "(no name)",
      email: r.email,
      phone: r.phone,
      countryCode: r.country_code,
      agentName: r.agent_name || "(unassigned)",
      crmStatus: r.crm_status || "(unset)",
      totalDeposits: dep,
      signupDays,
      lastContactDays: lastContact,
      online: isOnline,
      flags,
      severity,
    };
  });

  const has = (f: AuditFinding, key: LeadFlag) => f.flags.includes(key);

  const categories: AuditCategory[] = [
    {
      key: "bad_leads",
      label: "Bad / Fake Leads",
      description: "Malformed emails, junk phones, gibberish names, disposable inboxes.",
      count: 0,
      findings: findings.filter(
        (f) =>
          has(f, "bad_email") ||
          has(f, "bad_phone") ||
          has(f, "disposable_email") ||
          has(f, "gibberish_name") ||
          has(f, "no_email") ||
          has(f, "no_phone"),
      ),
    },
    {
      key: "fake_or_dead_investors",
      label: "Dead / Dormant Investors",
      description: "Deposited but never returned online; not seen in 14+ days.",
      count: 0,
      findings: findings.filter((f) => has(f, "dead_investor") || has(f, "never_logged_in")),
    },
    {
      key: "uncalled",
      label: "Uncalled Leads",
      description: "Signed up over 24h ago and have zero call notes.",
      count: 0,
      findings: findings.filter((f) => has(f, "uncalled")),
    },
    {
      key: "unanswered",
      label: "Investors Not Answering",
      description: "Emails sent by the desk but no note/log activity back.",
      count: 0,
      findings: findings.filter((f) => has(f, "unanswered_emails")),
    },
    {
      key: "document_gaps",
      label: "Document Gaps",
      description: "Deposited above threshold but no KYC documents on file.",
      count: 0,
      findings: findings.filter((f) => has(f, "deposited_no_docs")),
    },
    {
      key: "pipeline_stalled",
      label: "Pipeline Stalled",
      description: "High-value clients with no recent contact in 7+ days.",
      count: 0,
      findings: findings.filter((f) => has(f, "high_value_no_followup") || has(f, "no_recent_contact")),
    },
    {
      key: "agent_silence",
      label: "Unassigned / Agent Silence",
      description: "Leads with no agent owner.",
      count: 0,
      findings: findings.filter((f) => has(f, "no_agent_assigned")),
    },
    {
      key: "duplicates",
      label: "Duplicates",
      description: "Same email or phone repeated across multiple accounts.",
      count: 0,
      findings: findings.filter((f) => has(f, "duplicate_email") || has(f, "duplicate_phone")),
    },
  ];

  for (const c of categories) {
    c.findings.sort((a, b) => b.severity - a.severity || b.totalDeposits - a.totalDeposits);
    c.findings = c.findings.slice(0, 50);
    c.count = c.findings.length;
  }

  const agentLoadMap = new Map<string, number>();
  for (const r of rows) {
    const a = r.agent_name || "(unassigned)";
    agentLoadMap.set(a, (agentLoadMap.get(a) ?? 0) + 1);
  }
  const agentLoad = [...agentLoadMap.entries()]
    .map(([agent, count]) => ({ agent, count }))
    .sort((a, b) => b.count - a.count);

  const flaggedLeads = findings.filter((f) => f.flags.length > 0).length;
  const silentAgents = agentLoad.filter((a) => a.count === 0).length;

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      users: rows.length,
      online: online.size,
      depositors: deposits.size,
      silentAgents,
      flaggedLeads,
    },
    agentLoad,
    categories,
  };
}

/** Compact text view of the audit fed to the local LLM as context. */
export function auditToContextText(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(`AUDIT @ ${report.generatedAt}`);
  lines.push(
    `users=${report.totals.users} online=${report.totals.online} depositors=${report.totals.depositors} flagged=${report.totals.flaggedLeads}`,
  );
  lines.push(
    `AGENT LOAD: ${report.agentLoad.slice(0, 8).map((a) => `${a.agent}=${a.count}`).join("  ")}`,
  );
  for (const c of report.categories) {
    lines.push("");
    lines.push(`## ${c.label} (${c.count})`);
    for (const f of c.findings.slice(0, 12)) {
      lines.push(
        `#${f.displayId} ${f.name} | agent=${f.agentName} | status=${f.crmStatus} | dep=${f.totalDeposits} | signup=${f.signupDays}d | lastContact=${f.lastContactDays ?? "never"} | online=${f.online} | flags=${f.flags.join(",")}`,
      );
    }
  }
  return lines.join("\n");
}

/** Tiny audit slice for fast LLM turns — keeps token count low. */
export function auditToContextTextCompact(report: AuditReport): string {
  const lines: string[] = [
    `AUDIT @ ${report.generatedAt}`,
    `users=${report.totals.users} online=${report.totals.online} depositors=${report.totals.depositors} flagged=${report.totals.flaggedLeads}`,
    `AGENT LOAD: ${report.agentLoad.slice(0, 5).map((a) => `${a.agent}=${a.count}`).join(" ")}`,
  ];
  for (const c of report.categories.filter((x) => x.count > 0).slice(0, 5)) {
    const ids = c.findings
      .slice(0, 2)
      .map((f) => `#${f.displayId}`)
      .join(",");
    lines.push(`${c.label}(${c.count}): ${ids || "—"}`);
  }
  return lines.join("\n");
}
