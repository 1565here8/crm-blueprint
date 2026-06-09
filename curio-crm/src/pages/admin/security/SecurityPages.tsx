import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Shield,
} from "lucide-react";
import {
  client,
  type DnsLookupResult,
  type PerimeterSnapshot,
  type SecurityAuditSnapshot,
  type SecurityDashboard,
  type TlsCheckResult,
} from "../../../api/client";
import { btnPrimary, ErrorBanner, inputCls, Panel } from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";
import { CommonSecuritySettingsPage } from "../system/CommonSectionPages";

type Health = "ok" | "watch" | "bad";

export function statusPill(h: Health, label?: string) {
  const map = {
    ok: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    watch: "bg-amber-100 text-amber-900 ring-amber-200",
    bad: "bg-rose-100 text-rose-800 ring-rose-200",
  } as const;
  const text = label ?? h.toUpperCase();
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${map[h]}`}>
      {text}
    </span>
  );
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy"
      className="ml-2 inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check size={14} className="text-emerald-600" /> : <ClipboardCopy size={14} />}
    </button>
  );
}

function MetricCard({
  label,
  value,
  health,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  health?: Health;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {health ? statusPill(health) : null}
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function ExportReportButton({ fetchReport }: { fetchReport: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      onClick={() => {
        setBusy(true);
        void fetchReport()
          .then((data) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `security-report-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          })
          .finally(() => setBusy(false));
      }}
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      Export security report
    </button>
  );
}

export function PageShell({
  title,
  subtitle,
  guideIntro,
  guideBlocks,
  children,
  onRefresh,
  busy,
  exportReport,
}: {
  title: string;
  subtitle: string;
  guideIntro: string;
  guideBlocks: GuideBlock[];
  children: React.ReactNode;
  onRefresh?: () => void;
  busy?: boolean;
  exportReport?: boolean;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-teal-700">
            <Shield size={18} />
            <span className="text-xs font-bold uppercase tracking-wider">Security</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exportReport ? <ExportReportButton fetchReport={() => client.adminSecurityExport()} /> : null}
          {onRefresh ? (
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={onRefresh}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Refresh
            </button>
          ) : null}
        </div>
      </div>
      {children}
      <PageBottomGuide intro={guideIntro} blocks={guideBlocks} />
    </div>
  );
}

const dashboardGuides: GuideBlock[] = [
  {
    title: "Security dashboard",
    what: "One screen for platform health, license, tenant status, and rate limits.",
    how: "Green = good, amber = watch, red = act now. Export JSON for compliance archives.",
    when: "Monday ops review or before scaling ad spend past $1M/mo.",
  },
];

export function SecurityDashboardPage() {
  const [data, setData] = useState<SecurityDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await client.adminSecurityDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const vl = data?.vendorLicense;
  const licenseHealth: Health =
    !vl?.configured || vl.mode === "ok"
      ? "ok"
      : vl.mode === "grace"
        ? "watch"
        : "bad";
  const tenantHealth: Health = data?.tenant.is_active ? "ok" : "bad";
  const ollamaHealth: Health = data?.ready.ollama ? "ok" : "watch";

  return (
    <PageShell
      title="Security dashboard"
      subtitle="Platform health, license, tenant gate, and session policy — built for high-volume broker ops."
      guideIntro="Your command center for infra and access posture. Refresh before investor or compliance calls."
      guideBlocks={dashboardGuides}
      onRefresh={() => void load()}
      busy={busy}
      exportReport
    >
      <ErrorBanner message={error} />
      {!data && busy ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {data ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="API health" value="Online" health="ok" sub={data.health.service} />
            <MetricCard
              label="Ollama / Wallstreet AI"
              value={data.ready.ollama ? "Ready" : "Offline"}
              health={ollamaHealth}
              sub={data.ready.ollamaError ?? "Local LLM for desk briefs"}
            />
            <MetricCard
              label="Vendor license"
              value={vl?.mode ?? "—"}
              health={licenseHealth}
              sub={vl?.reason ?? `Build ${vl?.buildVersion ?? "—"}`}
            />
            <MetricCard
              label="Tenant active"
              value={data.tenant.is_active ? "Active" : "Paused"}
              health={tenantHealth}
              sub={data.tenant.reason ?? "Billing kill-switch"}
            />
          </div>

          <div className="mb-6 grid gap-3 lg:grid-cols-2">
            <Panel className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Domains</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Admin CRM</dt>
                  <dd className="font-mono text-xs text-slate-800">
                    {data.domains.adminHost ?? "—"}
                    {data.domains.adminHost ? <CopyBtn value={data.domains.adminHost} /> : null}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Public site</dt>
                  <dd className="font-mono text-xs text-slate-800">
                    {data.domains.publicHost ?? "—"}
                    {data.domains.publicHost ? <CopyBtn value={data.domains.publicHost} /> : null}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Public offline gate</dt>
                  <dd>{data.publicSiteOffline ? statusPill("watch", "offline") : statusPill("ok", "live")}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/admin/security/dns" className="text-xs font-medium text-teal-700 hover:underline">
                  DNS checker →
                </Link>
                <Link to="/admin/security/ssl" className="text-xs font-medium text-teal-700 hover:underline">
                  SSL/TLS →
                </Link>
              </div>
            </Panel>

            <Panel className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Rate limits & session</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">API / IP / min</dt>
                  <dd className="font-semibold">{data.rateLimits.apiPerMinute.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Login / 15 min</dt>
                  <dd className="font-semibold">{data.rateLimits.loginPer15Min}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Staff IP lock</dt>
                  <dd>{data.session.staffIpLock ? statusPill("watch", "on") : statusPill("ok", "off")}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Session timeout</dt>
                  <dd>{data.session.sessionTimeoutHours}h</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">{data.rateLimits.note}</p>
            </Panel>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { to: "/admin/security/perimeter", label: "My IP & perimeter" },
              { to: "/admin/security/infrastructure", label: "Infrastructure" },
              { to: "/admin/security/audit", label: "Access & audit" },
              { to: "/admin/security/access-settings", label: "Session settings" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 text-sm font-semibold text-slate-800 shadow-sm hover:border-teal-300 hover:text-teal-800"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </PageShell>
  );
}

const perimeterGuides: GuideBlock[] = [
  {
    title: "Your IP vs allowlist",
    what: "Shows the IP the CRM sees and whether owner/staff login would pass.",
    how: "Add your office IP to allowlist under Session settings if blocked.",
    when: "New office, VPN change, or staff locked out after travel.",
  },
];

export function SecurityPerimeterPage() {
  const [data, setData] = useState<PerimeterSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await client.adminSecurityPerimeter());
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
      title="My IP & perimeter"
      subtitle="Current network identity, VPS egress, and IP allowlist match for owner and staff."
      guideIntro="High-volume desks lock admin to office IPs — verify yours before flying."
      guideBlocks={perimeterGuides}
      onRefresh={() => void load()}
      busy={busy}
      exportReport
    >
      <ErrorBanner message={error} />
      {data ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Your IP (CRM sees)"
              value={
                <span className="font-mono text-base">
                  {data.clientIp}
                  <CopyBtn value={data.clientIp} />
                </span>
              }
              health={data.adminAccess.allowed ? "ok" : "bad"}
              sub={data.adminAccess.reason ?? "Owner admin access from this IP"}
            />
            <MetricCard
              label="VPS public IP"
              value={
                data.vpsPublicIp ? (
                  <span className="font-mono text-base">
                    {data.vpsPublicIp}
                    <CopyBtn value={data.vpsPublicIp} />
                  </span>
                ) : (
                  "—"
                )
              }
              health={data.vpsPublicIp ? "ok" : "watch"}
              sub="Set VPS_PUBLIC_IP in .env to skip lookup"
            />
            <MetricCard
              label="Staff IP lock"
              value={data.staffIpLock ? "Enforced" : "Off"}
              health={data.staffIpLock ? "watch" : "ok"}
              sub={data.staffAccess.allowed ? "Your IP passes staff rules" : data.staffAccess.reason}
            />
          </div>

          <Panel className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2">Field</th>
                  <th className="px-4 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["X-Forwarded-For", data.forwardedFor ?? "—"],
                  ["X-Real-IP", data.realIp ?? "—"],
                  ["Admin allowlist", data.adminAllowlist.length ? data.adminAllowlist.join(", ") : "(open — no rules)"],
                  ["Staff allowlist", data.staffAllowlist.length ? data.staffAllowlist.join(", ") : "(open — no rules)"],
                  [
                    "Env override",
                    [
                      data.envOverrides.adminIpAllowlist ? "ADMIN_IP_ALLOWLIST set" : null,
                      data.envOverrides.staffIpAllowlist ? "STAFF_IP_ALLOWLIST set" : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "None",
                  ],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-700">{k}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600 break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Link to="/admin/security/access-settings" className="text-sm font-medium text-teal-700 hover:underline">
            Edit IP allowlists & session settings →
          </Link>
        </div>
      ) : busy ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : null}
    </PageShell>
  );
}

export function SecurityDnsPage() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DnsLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runLookup(d?: string) {
    const q = (d ?? domain).trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await client.adminSecurityDns(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "DNS lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void client.adminSecurityDashboard().then((d) => {
      const host = d.domains.adminHost ?? d.domains.publicHost;
      if (host && !domain) {
        setDomain(host);
        void runLookup(host);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell
      title="DNS checker"
      subtitle="Resolve A, AAAA, CNAME, MX, TXT, and NS from the VPS — same view attackers and clients see."
      guideIntro="Run after changing Porkbun/Cloudflare records or migrating CRM to a new subdomain."
      guideBlocks={[
        {
          title: "Propagation",
          what: "DNS changes are not instant worldwide.",
          how: "Compare VPS result with whatsmydns.net from your PC.",
          when: "admin.curionilabs.com works for you but staff abroad cannot log in.",
        },
      ]}
    >
      <Panel className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Domain</span>
          <input
            className={inputCls}
            placeholder="admin.curionilabs.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runLookup();
            }}
          />
        </label>
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void runLookup()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : "Resolve"}
        </button>
      </Panel>
      <ErrorBanner message={error} />
      {result?.ok ? (
        <>
          <p className="mb-2 text-xs text-slate-500">Queried {result.queriedAt}</p>
          <Panel className="overflow-hidden p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-2 w-24">Type</th>
                  <th className="px-4 py-2">Records</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.records).map(([type, vals]) => (
                  <tr key={type} className="border-b border-slate-100 align-top">
                    <td className="px-4 py-2 font-bold text-slate-700">{type}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">
                      {vals.map((v) => (
                        <div key={v} className="break-all">
                          {v}
                          <CopyBtn value={v} />
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          {result.hints.length ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
              {result.hints.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </PageShell>
  );
}

function tlsHealth(r: TlsCheckResult & { ok: true }): Health {
  if (r.daysRemaining === null) return "watch";
  if (r.daysRemaining < 0) return "bad";
  if (r.daysRemaining < 14) return "bad";
  if (r.daysRemaining < 30) return "watch";
  return "ok";
}

export function SecuritySslPage() {
  const [host, setHost] = useState("");
  const [result, setResult] = useState<TlsCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runCheck(h?: string) {
    const q = (h ?? host).trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await client.adminSecuritySsl(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "TLS check failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void client.adminSecurityDashboard().then((d) => {
      const hosts = [d.domains.adminHost, d.domains.publicHost].filter(Boolean) as string[];
      if (hosts[0] && !host) {
        setHost(hosts[0]);
        void runCheck(hosts[0]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell
      title="SSL / TLS"
      subtitle="Certificate issuer, expiry, and chain trust for admin and public hostnames."
      guideIntro="Renew before 30 days — Let&apos;s Encrypt auto-renew should run on the VPS; this confirms it worked."
      guideBlocks={[
        {
          title: "Days remaining",
          what: "Countdown until browsers show certificate warnings.",
          how: "Red under 14 days — renew cert on VPS (certbot) same day.",
          when: "Chrome shows Not secure on crm or public signup.",
        },
      ]}
    >
      <Panel className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Hostname</span>
          <input
            className={inputCls}
            placeholder="admin.curionilabs.com"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runCheck();
            }}
          />
        </label>
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void runCheck()}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : "Check cert"}
        </button>
      </Panel>
      <ErrorBanner message={error} />
      {result?.ok ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Valid chain" value={result.valid ? "Trusted" : "Untrusted"} health={result.valid ? "ok" : "bad"} />
          <MetricCard
            label="Expires"
            value={result.validTo ? new Date(result.validTo).toLocaleDateString() : "—"}
            health={tlsHealth(result)}
            sub={
              result.daysRemaining !== null
                ? `${result.daysRemaining} days remaining`
                : undefined
            }
          />
          <MetricCard label="Issuer" value={result.issuer ?? "—"} health="ok" sub={result.protocol ?? undefined} />
          <Panel className="sm:col-span-2 lg:col-span-3 p-4">
            <h3 className="mb-2 text-sm font-semibold">Subject & SANs</h3>
            <p className="font-mono text-xs text-slate-600">{result.subject ?? "—"}</p>
            {result.altNames.length ? (
              <ul className="mt-2 list-inside list-disc text-xs text-slate-500">
                {result.altNames.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
          </Panel>
        </div>
      ) : null}
    </PageShell>
  );
}

export function SecurityInfrastructurePage() {
  const [data, setData] = useState<SecurityDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await client.adminSecurityDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const vl = data?.vendorLicense;

  return (
    <PageShell
      title="Infrastructure"
      subtitle="Server readiness, Ollama engine, vendor license heartbeat, and tenant billing gate."
      guideIntro="Owner-only view — share export with Curioni Labs support, never paste license keys in chat."
      guideBlocks={[
        {
          title: "Ollama",
          what: "Local LLM on your VPS powers Wallstreet AI briefs.",
          how: "If false, SSH to VPS and restart Ollama service.",
          when: "Desk says AI offline but instant answers still work.",
        },
      ]}
      onRefresh={() => void load()}
      busy={busy}
      exportReport
    >
      <ErrorBanner message={error} />
      {data ? (
        <Panel className="p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Build version", vl?.buildVersion],
              ["License mode", vl?.mode],
              ["License configured", vl?.configured ? "Yes" : "No"],
              ["Last OK", vl?.lastOkAt ?? "—"],
              ["Last check", vl?.lastCheckAt ?? "—"],
              ["Grace hours", String(vl?.graceHours ?? "—")],
              ["Tenant active", data.tenant.is_active ? "Yes" : "No"],
              ["Tenant reason", data.tenant.reason ?? "—"],
              ["Ollama", data.ready.ollama ? "Available" : "Unavailable"],
              ["Public site gate", data.publicSiteOffline ? "Offline / rebrand" : "Live"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-bold uppercase text-slate-500">{k}</dt>
                <dd className="mt-1 text-sm font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="/api/health"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
            >
              /api/health <ExternalLink size={12} />
            </a>
            <a
              href="/api/ready"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
            >
              /api/ready <ExternalLink size={12} />
            </a>
            <Link to="/admin/system/configuration" className="text-xs font-medium text-teal-700 hover:underline">
              Owner configuration →
            </Link>
          </div>
        </Panel>
      ) : busy ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : null}
    </PageShell>
  );
}

export function SecurityAuditPage() {
  const [snap, setSnap] = useState<SecurityAuditSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setSnap(await client.adminSecurityAuditSnapshot());
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
      title="Access & audit"
      subtitle="Recent staff logins and perimeter events — full trail in View Log and History Logs."
      guideIntro="For $1M+ desks, export weekly and store with compliance files."
      guideBlocks={[
        {
          title: "View Log vs History",
          what: "View Log = login/security camera; History = every CRM click.",
          how: "Open full View Log for date filters; History for client edits.",
          when: "Investigating unauthorized access suspicion.",
        },
      ]}
      onRefresh={() => void load()}
      busy={busy}
    >
      <ErrorBanner message={error} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link to="/admin/security/view-log" className={btnPrimary}>
          Full security view log
        </Link>
        <Link
          to="/admin/system/history-logs"
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          History logs
        </Link>
        <Link
          to="/admin/system/event-logs"
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Event logs
        </Link>
      </div>
      {snap ? (
        <Panel className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-sky-700 text-[11px] font-bold uppercase text-white">
              <tr>
                <th className="px-4 py-2">Agent</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {snap.rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No audit rows yet.
                  </td>
                </tr>
              ) : (
                snap.rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 font-medium">{r.agentId}</td>
                    <td className="px-4 py-2">{r.action}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.ip ?? "—"}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{r.dateCreated}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-slate-500">
            Showing {snap.rows.length} of {snap.total} — generated {snap.generatedAt}
          </p>
        </Panel>
      ) : busy ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : null}
    </PageShell>
  );
}

export function SecurityAccessSettingsPage() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-teal-700">
        <Shield size={18} />
        <span className="text-xs font-bold uppercase tracking-wider">Security · Access</span>
      </div>
      <CommonSecuritySettingsPage />
    </div>
  );
}

export { SecurityViewLogPage } from "../system/SecurityViewLogPage";
export {
  SecurityThreatsPage,
  SecurityBehaviorPage,
  SecurityVisitorsPage,
  SecurityEndpointsPage,
  SecurityAutoAuditPage,
} from "./SecurityIntelPages";
