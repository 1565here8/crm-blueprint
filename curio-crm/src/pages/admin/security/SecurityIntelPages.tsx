import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, Play, ShieldAlert } from "lucide-react";
import {
  client,
  type AutoAuditRun,
  type EndpointEventRow,
  type IpWatchRow,
  type SecurityEventRow,
  type ThreatDashboard,
  type UserBehaviorInsight,
} from "../../../api/client";
import { btnPrimary, ErrorBanner, inputCls, Panel } from "../../../components/admin/CrmShell";
import { PageShell, statusPill } from "./SecurityPages";

function severityPill(sev: SecurityEventRow["severity"]) {
  const map = {
    critical: "bad" as const,
    high: "bad" as const,
    medium: "watch" as const,
    low: "ok" as const,
  };
  const labels = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM", low: "LOW" };
  return statusPill(map[sev], labels[sev]);
}

function EventsTable({ rows, showFingerprint }: { rows: SecurityEventRow[]; showFingerprint?: boolean }) {
  return (
    <Panel className="overflow-hidden p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-sky-700 text-[11px] font-bold uppercase text-white">
          <tr>
            <th className="px-4 py-2">Severity</th>
            <th className="px-4 py-2">Actor</th>
            <th className="px-4 py-2">Action</th>
            <th className="px-4 py-2">Why flagged</th>
            <th className="px-4 py-2">IP</th>
            {showFingerprint ? <th className="px-4 py-2">Browser fingerprint</th> : null}
            <th className="px-4 py-2">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showFingerprint ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                No alerts — rules engine runs on each refresh.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-4 py-2">{severityPill(r.severity)}</td>
                <td className="px-4 py-2">
                  {r.actor ? (
                    <Link to={`/admin/crm/users`} className="font-medium text-teal-700 hover:underline">
                      {r.actor}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{r.reason}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.ip ?? "—"}</td>
                {showFingerprint ? (
                  <td className="px-4 py-2 text-xs">
                    {r.fingerprintBrowser ?? "—"} / {r.fingerprintOs ?? "—"}
                  </td>
                ) : null}
                <td className="px-4 py-2 text-xs text-slate-500">{r.createdAt}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Panel>
  );
}

export function SecurityThreatsPage() {
  const [data, setData] = useState<ThreatDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await client.adminSecurityThreats());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scoreHealth =
    data && data.safetyScore >= 80 ? "ok" : data && data.safetyScore >= 55 ? "watch" : "bad";

  return (
    <PageShell
      title="Threat intelligence"
      subtitle="Composite safety score and active threats from login logs, perimeter, SSL, and behavior rules."
      guideIntro="Honest web CRM scoring — USB and true PC model require the Endpoint Agent."
      guideBlocks={[
        {
          title: "Safety score",
          what: "0–100 from perimeter, TLS, license, tenant, failed logins, and open threats.",
          how: "Refresh before compliance calls; fix red breakdown rows first.",
          when: "Daily owner check or after suspicious staff activity.",
        },
      ]}
      onRefresh={() => void load()}
      busy={busy}
    >
      <ErrorBanner message={error} />
      {data ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Safety score</p>
                {statusPill(scoreHealth ?? "watch")}
              </div>
              <p className="mt-2 text-4xl font-bold text-slate-900">{data.safetyScore}</p>
              <p className="mt-1 text-xs text-slate-500">Generated {data.generatedAt}</p>
            </div>
            {(["critical", "high", "medium", "low"] as const).map((sev) => (
              <div key={sev} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase text-slate-500">{sev}</p>
                <p className="mt-2 text-2xl font-semibold">{data.threatCounts[sev]}</p>
              </div>
            ))}
          </div>
          <Panel className="mb-6 p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Score breakdown</h3>
            <ul className="space-y-2 text-sm">
              {data.scoreBreakdown.map((b) => (
                <li key={b.label} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="font-medium text-slate-700">{b.label}</span>
                  <span className="text-slate-600">
                    {b.points}/{b.max} — {b.note}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ShieldAlert size={16} className="text-rose-600" />
            Active threats
          </h3>
          <EventsTable rows={data.activeThreats} />
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Link to="/admin/security/behavior" className="font-medium text-teal-700 hover:underline">
              Behavior alerts →
            </Link>
            <Link to="/admin/security/visitors" className="font-medium text-teal-700 hover:underline">
              Visitor watch →
            </Link>
            <Link to="/admin/security/endpoints" className="font-medium text-teal-700 hover:underline">
              Endpoint alerts →
            </Link>
          </div>
        </>
      ) : busy ? (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </p>
      ) : null}
    </PageShell>
  );
}

export function SecurityBehaviorPage() {
  const [rows, setRows] = useState<SecurityEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await client.adminSecurityBehaviorAlerts();
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      title="Behavior alerts"
      subtitle="Phishy admin patterns — off-hours login, permission denials, sensitive settings touched by staff."
      guideIntro="Rules run server-side on audit + history logs; not a substitute for camera review."
      guideBlocks={[
        {
          title: "Off-hours",
          what: "UTC quiet hours from Security settings (platform_settings).",
          how: "Enable security.off_hours in owner configuration when ready.",
          when: "Desk in multiple time zones — tune UTC window.",
        },
      ]}
      onRefresh={() => void load()}
      busy={busy}
    >
      <ErrorBanner message={error} />
      <p className="mb-3 text-xs text-slate-500">{total} behavior events (latest 50 shown)</p>
      <EventsTable rows={rows} />
    </PageShell>
  );
}

export function SecurityVisitorsPage() {
  const [rows, setRows] = useState<IpWatchRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [markIp, setMarkIp] = useState("");
  const [markNotes, setMarkNotes] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await client.adminSecurityVisitorWatch();
      setRows(res.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markUnwanted = (ip: string, unwanted: boolean) => {
    void client
      .adminSecuritySetIpWatch({ ip, unwanted, notes: markNotes || undefined })
      .then(() => void load())
      .catch((e) => setError(e instanceof Error ? e.message : "Update failed."));
  };

  return (
    <PageShell
      title="Visitor watch"
      subtitle="IPs seen on staff logins — browser/OS fingerprint from User-Agent (not hardware model)."
      guideIntro="Geo lookup skipped (no API key). Repeat visitors and blocklist for broker review."
      guideBlocks={[
        {
          title: "Browser fingerprint",
          what: "Parsed User-Agent only — Chrome/Windows class, not laptop serial.",
          how: "True USB/PC model needs Endpoint Agent on desk PCs.",
          when: "Investigating login from unexpected country or ISP.",
        },
      ]}
      onRefresh={() => void load()}
      busy={busy}
    >
      <ErrorBanner message={error} />
      <Panel className="mb-4 p-4">
        <p className="mb-2 text-xs font-bold uppercase text-slate-500">Mark IP unwanted</p>
        <div className="flex flex-wrap gap-2">
          <input
            className={inputCls}
            placeholder="e.g. 203.0.113.42"
            value={markIp}
            onChange={(e) => setMarkIp(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Notes (optional)"
            value={markNotes}
            onChange={(e) => setMarkNotes(e.target.value)}
          />
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700"
            onClick={() => markIp.trim() && markUnwanted(markIp.trim(), true)}
          >
            Flag unwanted
          </button>
        </div>
      </Panel>
      <Panel className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-sky-700 text-[11px] font-bold uppercase text-white">
            <tr>
              <th className="px-4 py-2">IP</th>
              <th className="px-4 py-2">Visits</th>
              <th className="px-4 py-2">Last actor</th>
              <th className="px-4 py-2">Browser fingerprint</th>
              <th className="px-4 py-2">Unwanted</th>
              <th className="px-4 py-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No IPs tracked yet — staff logins populate this list.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.ip} className="border-b border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{r.ip}</td>
                  <td className="px-4 py-2">{r.visitCount}</td>
                  <td className="px-4 py-2">{r.lastActor ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.browserClass ?? "—"} / {r.osClass ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {r.unwanted ? (
                      statusPill("bad", "yes")
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-medium text-rose-700 hover:underline"
                        onClick={() => markUnwanted(r.ip, true)}
                      >
                        Mark unwanted
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.lastSeen}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </PageShell>
  );
}

export function SecurityEndpointsPage() {
  const [rows, setRows] = useState<EndpointEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await client.adminSecurityEndpointEvents();
      setRows(res.rows);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      title="Endpoint alerts"
      subtitle="USB and physical desk events from CurioCRM Endpoint Agent — not visible in the browser."
      guideIntro="Install the Windows agent on staff PCs; it POSTs to /api/admin/security/endpoint-event."
      guideBlocks={[
        {
          title: "Web CRM limit",
          what: "Browsers cannot detect USB plug/unplug.",
          how: "Use scripts/endpoint-agent-stub.mjs as a roadmap sample for IT.",
          when: "Compliance requires physical media audit on trading floor.",
        },
      ]}
      onRefresh={() => void load()}
      busy={busy}
    >
      <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertTriangle size={18} className="shrink-0" />
        <p>
          Requires <strong>CurioCRM Endpoint Agent</strong> on staff PCs — the web CRM cannot see USB from the browser
          alone. Set <code className="text-xs">ENDPOINT_AGENT_KEY</code> on the server for agent POSTs.
        </p>
      </div>
      <ErrorBanner message={error} />
      <p className="mb-3 text-xs text-slate-500">{total} endpoint events</p>
      <Panel className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-sky-700 text-[11px] font-bold uppercase text-white">
            <tr>
              <th className="px-4 py-2">Agent</th>
              <th className="px-4 py-2">Event</th>
              <th className="px-4 py-2">Device</th>
              <th className="px-4 py-2">Workstation</th>
              <th className="px-4 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No endpoint events — agent POSTs appear here (no demo rows in production).
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-4 py-2 font-medium">{r.agentId}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.eventType}</td>
                  <td className="px-4 py-2 text-xs">{r.deviceLabel ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{r.workstationId ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.createdAt}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
    </PageShell>
  );
}

function auditStatusPill(status: AutoAuditRun["status"]) {
  const map = { ok: "ok" as const, warn: "watch" as const, fail: "bad" as const };
  return statusPill(map[status], status.toUpperCase());
}

function BehaviorTable({ rows, role }: { rows: UserBehaviorInsight[]; role: "staff" | "client" }) {
  return (
    <Panel className="overflow-hidden p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-sky-700 text-[11px] font-bold uppercase text-white">
          <tr>
            <th className="px-4 py-2">{role === "staff" ? "Staff" : "Client"}</th>
            <th className="px-4 py-2">Risk</th>
            <th className="px-4 py-2">Flags</th>
            <th className="px-4 py-2">Summary</th>
            {role === "staff" ? (
              <>
                <th className="px-4 py-2">Actions 24h</th>
                <th className="px-4 py-2">IPs 24h</th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={role === "staff" ? 6 : 4} className="px-4 py-8 text-center text-slate-500">
                No {role} behavior flags — auto audit runs every few hours.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={`${r.role}:${r.userId}`} className="border-b border-slate-100">
                <td className="px-4 py-2 font-medium">
                  {role === "client" && r.meta?.displayId != null ? `#${String(r.meta.displayId)} ` : null}
                  {role === "client" && r.meta?.name ? String(r.meta.name) : r.userId}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`font-semibold ${r.riskScore >= 70 ? "text-rose-700" : r.riskScore >= 40 ? "text-amber-700" : "text-slate-700"}`}
                  >
                    {r.riskScore}
                  </span>
                </td>
                <td className="px-4 py-2 font-mono text-[10px] text-slate-600">{r.flags.join(", ") || "—"}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{r.summary}</td>
                {role === "staff" ? (
                  <>
                    <td className="px-4 py-2 text-xs">{r.actionCount24h}</td>
                    <td className="px-4 py-2 text-xs">{r.distinctIps24h}</td>
                  </>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Panel>
  );
}

export function SecurityAutoAuditPage() {
  const [run, setRun] = useState<AutoAuditRun | null>(null);
  const [history, setHistory] = useState<AutoAuditRun[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [latest, list] = await Promise.all([
        client.adminSecurityAutoAuditLatest(),
        client.adminSecurityAutoAudits({ limit: 10 }),
      ]);
      setRun(latest.run);
      setHistory(list.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  const runNow = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await client.adminSecurityRunAutoAudit();
      setRun(res.run);
      const list = await client.adminSecurityAutoAudits({ limit: 10 });
      setHistory(list.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      title="Auto security audits"
      subtitle="Scheduled probes of CRM + public site, TLS/DNS, staff patterns, and client forensics."
      guideIntro="Runs automatically every 6 hours (override with SECURITY_AUTO_AUDIT_HOURS on the VPS)."
      guideBlocks={[
        {
          title: "What gets checked",
          what: "HTTP health, certificates, DNS, tenant status, staff login patterns, client risk scores.",
          how: "Review findings below; run manually after deploys or suspected breach.",
          when: "Daily owner review for live desks.",
        },
        {
          title: "Staff vs client behavior",
          what: "Staff = admin login/view logs; clients = trading/KYC forensics engine.",
          how: "Pair with Behavior alerts for rule hits.",
          when: "Investigating insider risk or abusive traders.",
        },
      ]}
      onRefresh={() => void load()}
      busy={busy || running}
    >
      <ErrorBanner message={error} />
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" disabled={running} className={btnPrimary} onClick={() => void runNow()}>
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run audit now
        </button>
        <Link to="/admin/security/threats" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Threats & safety score
        </Link>
        <Link to="/admin/security/behavior" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          Behavior alerts
        </Link>
      </div>

      {run ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">Latest score</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{run.overallScore}/100</p>
              <div className="mt-2">{auditStatusPill(run.status)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">Findings</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{run.findings.length}</p>
              <p className="mt-1 text-xs text-slate-500">{run.summary}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">Schedule</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">Every {run.intervalHours}h</p>
              <p className="mt-1 text-xs text-slate-500">
                Last: {run.finishedAt}
                {run.nextRunAt ? ` · Next ~${run.nextRunAt}` : null}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase text-slate-500">Clients scanned</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{run.forensicsTotals?.scanned ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-500">
                {run.forensicsTotals
                  ? `${run.forensicsTotals.badActorCount} bad-actor · ${run.forensicsTotals.highRiskCount} trading risk`
                  : "Forensics pending"}
              </p>
            </div>
          </div>

          <h3 className="mb-2 text-sm font-bold text-slate-800">Website probes</h3>
          <Panel className="mb-6 overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2">Target</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Latency</th>
                  <th className="px-4 py-2">URL</th>
                </tr>
              </thead>
              <tbody>
                {run.websiteChecks.map((w) => (
                  <tr key={w.url} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium">{w.label}</td>
                    <td className="px-4 py-2">
                      {statusPill(w.ok ? "ok" : "bad", w.ok ? `HTTP ${w.statusCode ?? "OK"}` : "FAIL")}
                    </td>
                    <td className="px-4 py-2 text-xs">{w.latencyMs != null ? `${w.latencyMs}ms` : "—"}</td>
                    <td className="px-4 py-2 font-mono text-[10px] text-slate-500">{w.url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {run.findings.length > 0 ? (
            <>
              <h3 className="mb-2 text-sm font-bold text-slate-800">Audit findings</h3>
              <Panel className="mb-6 overflow-hidden p-0">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-sky-700 text-[11px] font-bold uppercase text-white">
                    <tr>
                      <th className="px-4 py-2">Severity</th>
                      <th className="px-4 py-2">Category</th>
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.findings.map((f) => (
                      <tr key={f.id} className="border-b border-slate-100">
                        <td className="px-4 py-2">{severityPill(f.severity)}</td>
                        <td className="px-4 py-2 text-xs uppercase text-slate-500">{f.category}</td>
                        <td className="px-4 py-2 font-medium">{f.title}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{f.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </>
          ) : null}

          <h3 className="mb-2 text-sm font-bold text-slate-800">Staff behavior analysis</h3>
          <BehaviorTable rows={run.staffBehavior} role="staff" />

          <h3 className="mb-4 mt-6 text-sm font-bold text-slate-800">Client behavior analysis</h3>
          <BehaviorTable rows={run.clientBehavior} role="client" />
        </>
      ) : busy ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          <ShieldAlert size={18} />
          No audit yet — first automatic run starts ~45 seconds after server boot, or click Run audit now.
        </div>
      )}

      {history.length > 1 ? (
        <>
          <h3 className="mb-2 mt-8 text-sm font-bold text-slate-800">Recent audit runs</h3>
          <Panel className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Summary</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 text-xs text-slate-500">{h.finishedAt}</td>
                    <td className="px-4 py-2 font-semibold">{h.overallScore}</td>
                    <td className="px-4 py-2">{auditStatusPill(h.status)}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{h.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      ) : null}
    </PageShell>
  );
}
