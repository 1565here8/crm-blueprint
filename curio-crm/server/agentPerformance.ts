/**
 * AGENT PERFORMANCE AUDIT — measures every desk agent on hard activity
 * metrics. Same persona rules as the rest of THE DESK: numbers, not opinions.
 *
 * Per agent:
 *   - notesToday, notesWeek           (proxy for calls)
 *   - emailsToday, emailsWeek
 *   - assignedLeads                   (clients on their book)
 *   - activeDepositors                (with deposits > 0)
 *   - totalRevenue                    (sum of deposits on their book)
 *   - conversionPct                   (depositors / assigned)
 *   - lastActivityAt                  (most recent note or email)
 *   - silenceHours                    (hours since last activity)
 *   - rank                            (sorted by revenue, then conversion)
 */
import { getDb } from "./db";
import { ensureUserProfilesSchema } from "./crmUsers";

const MS_HOUR = 3_600_000;
const MS_DAY = 24 * MS_HOUR;

export type AgentRow = {
  agent: string;
  assignedLeads: number;
  activeDepositors: number;
  totalRevenue: number;
  conversionPct: number;
  notesToday: number;
  notesWeek: number;
  emailsToday: number;
  emailsWeek: number;
  lastActivityAt: string | null;
  silenceHours: number | null;
  flags: AgentFlag[];
  rank: number;
};

export type AgentFlag =
  | "silent_4h"
  | "silent_24h"
  | "no_notes_today"
  | "no_emails_week"
  | "low_conversion"
  | "high_load_low_conversion"
  | "rising_star"
  | "top_performer";

export type AgentReport = {
  generatedAt: string;
  totals: { agents: number; assignedLeads: number; activeDepositors: number; totalRevenue: number };
  agents: AgentRow[];
};

export function buildAgentReport(opts?: { onlyAgent?: string | null }): AgentReport {
  ensureUserProfilesSchema();
  const db = getDb();
  const now = Date.now();
  const dayCutoff = new Date(now - MS_DAY).toISOString();
  const weekCutoff = new Date(now - 7 * MS_DAY).toISOString();

  const agents = db.prepare(`
    SELECT COALESCE(NULLIF(TRIM(p.agent_name), ''), 'Admin Broker') AS agent,
           COUNT(*) AS assigned
    FROM users u JOIN user_profiles p ON p.user_id = u.id
    WHERE u.role = 'user'
    GROUP BY agent
    ORDER BY assigned DESC
  `).all() as Array<{ agent: string; assigned: number }>;

  const depositors = db.prepare(`
    SELECT COALESCE(NULLIF(TRIM(p.agent_name), ''), 'Admin Broker') AS agent,
           COUNT(DISTINCT u.id) AS depositors,
           SUM(CASE WHEN l.amount_delta > 0 AND l.reason LIKE '%credit%' THEN l.amount_delta ELSE 0 END) AS rev
    FROM users u
    JOIN user_profiles p ON p.user_id = u.id
    JOIN ledger_entries l ON l.user_id = u.id
    WHERE u.role = 'user' AND l.amount_delta > 0 AND l.reason LIKE '%credit%'
    GROUP BY agent
  `).all() as Array<{ agent: string; depositors: number; rev: number }>;
  const depMap = new Map(depositors.map((d) => [d.agent, d]));

  const notes = db.prepare(`
    SELECT COALESCE(NULLIF(TRIM(p.agent_name), ''), 'Admin Broker') AS agent,
           SUM(CASE WHEN n.created_at >= ? THEN 1 ELSE 0 END) AS today,
           SUM(CASE WHEN n.created_at >= ? THEN 1 ELSE 0 END) AS week,
           MAX(n.created_at) AS last_at
    FROM crm_notes n
    LEFT JOIN user_profiles p ON p.user_id = n.user_id
    GROUP BY agent
  `).all(dayCutoff, weekCutoff) as Array<{ agent: string; today: number; week: number; last_at: string | null }>;
  const notesMap = new Map(notes.map((n) => [n.agent, n]));

  const emails = db.prepare(`
    SELECT COALESCE(NULLIF(TRIM(p.agent_name), ''), 'Admin Broker') AS agent,
           SUM(CASE WHEN e.created_at >= ? THEN 1 ELSE 0 END) AS today,
           SUM(CASE WHEN e.created_at >= ? THEN 1 ELSE 0 END) AS week,
           MAX(e.created_at) AS last_at
    FROM crm_emails e
    LEFT JOIN user_profiles p ON p.user_id = e.user_id
    GROUP BY agent
  `).all(dayCutoff, weekCutoff) as Array<{ agent: string; today: number; week: number; last_at: string | null }>;
  const emailsMap = new Map(emails.map((e) => [e.agent, e]));

  const rows: AgentRow[] = agents
    .filter((a) => (opts?.onlyAgent ? a.agent === opts.onlyAgent : true))
    .map((a) => {
      const dep = depMap.get(a.agent);
      const note = notesMap.get(a.agent);
      const em = emailsMap.get(a.agent);
      const revenue = Math.round(Number(dep?.rev ?? 0));
      const depositors = Number(dep?.depositors ?? 0);
      const conv = a.assigned > 0 ? Math.round((depositors / a.assigned) * 1000) / 10 : 0;
      const lastNote = note?.last_at ? new Date(note.last_at).getTime() : 0;
      const lastEmail = em?.last_at ? new Date(em.last_at).getTime() : 0;
      const lastAt = Math.max(lastNote, lastEmail);
      const lastIso = lastAt > 0 ? new Date(lastAt).toISOString() : null;
      const silence = lastAt > 0 ? Math.round((now - lastAt) / MS_HOUR) : null;

      const flags: AgentFlag[] = [];
      if (silence !== null && silence >= 24) flags.push("silent_24h");
      else if (silence !== null && silence >= 4) flags.push("silent_4h");
      if ((note?.today ?? 0) === 0) flags.push("no_notes_today");
      if ((em?.week ?? 0) === 0) flags.push("no_emails_week");
      if (a.assigned >= 20 && conv < 2) flags.push("high_load_low_conversion");
      else if (conv < 2 && a.assigned >= 5) flags.push("low_conversion");
      if (conv >= 25 && depositors >= 5) flags.push("top_performer");
      else if (conv >= 12 && depositors >= 3) flags.push("rising_star");

      return {
        agent: a.agent,
        assignedLeads: a.assigned, activeDepositors: depositors,
        totalRevenue: revenue, conversionPct: conv,
        notesToday: Number(note?.today ?? 0), notesWeek: Number(note?.week ?? 0),
        emailsToday: Number(em?.today ?? 0), emailsWeek: Number(em?.week ?? 0),
        lastActivityAt: lastIso, silenceHours: silence,
        flags, rank: 0,
      };
    });

  rows.sort((a, b) => b.totalRevenue - a.totalRevenue || b.conversionPct - a.conversionPct);
  rows.forEach((r, i) => (r.rank = i + 1));

  const totalAssigned = rows.reduce((s, a) => s + a.assignedLeads, 0);
  const totalDeps = rows.reduce((s, a) => s + a.activeDepositors, 0);
  const totalRev = rows.reduce((s, a) => s + a.totalRevenue, 0);

  return {
    generatedAt: new Date().toISOString(),
    totals: { agents: rows.length, assignedLeads: totalAssigned, activeDepositors: totalDeps, totalRevenue: totalRev },
    agents: rows,
  };
}

export function agentReportToContextText(r: AgentReport): string {
  const lines: string[] = [];
  lines.push(`AGENT BOARD @ ${r.generatedAt}`);
  lines.push(`totals agents=${r.totals.agents} leads=${r.totals.assignedLeads} depositors=${r.totals.activeDepositors} revenue=$${r.totals.totalRevenue}`);
  lines.push("");
  for (const a of r.agents.slice(0, 20)) {
    lines.push(`#${a.rank} ${a.agent} | leads=${a.assignedLeads} dep=${a.activeDepositors} conv=${a.conversionPct}% rev=$${a.totalRevenue} notesT=${a.notesToday} notesW=${a.notesWeek} mailW=${a.emailsWeek} silence=${a.silenceHours ?? "never"}h flags=${a.flags.join(",") || "none"}`);
  }
  return lines.join("\n");
}
