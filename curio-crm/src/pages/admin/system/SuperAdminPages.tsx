import React, { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { client } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { isPrimaryAdmin } from "../../../components/admin/adminNavConfig";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  PageHeader,
  Panel,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";
import { HistoryLogsPage } from "./HistoryLogsPage";
import { BalanceEventsPage } from "./BalanceEventsPage";

const subLinks = [
  { to: "/admin/system/configuration", label: "Configuration", end: true },
  { to: "/admin/system/error-logs", label: "Error Logs" },
  { to: "/admin/system/smtp-logs", label: "SMTP Logs" },
  { to: "/admin/system/balance-events", label: "Balance events" },
  { to: "/admin/system/history-logs", label: "History Logs" },
  { to: "/admin/system/order-storage-logs", label: "Order Storage Logs" },
];

export function SuperAdminLayout() {
  return (
    <div>
      <PageHeader
        title="Super Admin"
        subtitle="Owner-only platform maintenance — database, cache, and safety tools for this Node stack"
      />
      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {subLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

function ActionRow({
  title,
  description,
  buttonLabel,
  onRun,
  busy,
  icon,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onRun: () => Promise<void>;
  busy: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 py-4 last:border-0">
      <div className="min-w-0 max-w-xl">
        <p className="font-medium text-slate-800">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        disabled={busy}
        className={btnPrimary}
        onClick={() => void onRun()}
      >
        {busy ? <Loader2 size={16} className="inline animate-spin" /> : icon}
        <span className={icon || busy ? "ml-2" : ""}>{buttonLabel}</span>
      </button>
    </div>
  );
}

const configGuide: GuideBlock[] = [
  {
    title: 'Update "group" — set all IPs to All',
    what: "Desk groups can restrict which IP addresses agents may log in from. Setting every group to All removes those restrictions.",
    how: 'Click Set All Groups IPs To "All". Every row in desk groups becomes open worldwide.',
    when: "After migrating servers, when agents cannot log in from new office IPs, or when you intentionally run a remote desk.",
  },
  {
    title: "Refresh phone prefixes / CLIDs",
    what: "Rebuilds dial-out metadata for every staff agent from their country and phone on file (used by click-to-call integrations).",
    how: "Click Refresh after you bulk-import agents or change country codes on profiles.",
    when: "Wrong caller ID showing on outbound calls, or after CSV import of the desk team.",
  },
  {
    title: "Purge cache / Redis",
    what: "Clears in-memory caches (market brief for Wallstreet AI, desk mover snapshot). There is no Redis on this Node deployment — this is the equivalent flush.",
    how: "Click Purge when AI briefs or top-of-book prices look stale after a market halt or config change.",
    when: "Odd prices in Wallstreet AI, or immediately after deploying new market catalog settings.",
  },
  {
    title: "Desk groups table",
    what: "Read-only list of logical desks (sales, retention, etc.) and their current IP allowlist value.",
    how: "Use the group IP button above to reset all at once. Per-group editing ships in a later release.",
    when: "Audit who is locked to which office network.",
  },
  {
    title: "Platform pause (billing kill-switch)",
    what: "Stops all admin and client trading routes instantly while leaving this Super Admin area readable.",
    how: "Pause blocks the floor; Resume restores service. Reason is stored for your records only.",
    when: "Non-payment, emergency maintenance, or compliance hold — not for everyday use.",
  },
  {
    title: "Quick links",
    what: "Working settings that used to live scattered across legacy Super Admin menus.",
    how: "Open Brand DNA, Access Keys, or Payment Gateways from the links below instead of hunting the sidebar.",
    when: "Day-to-day white-label and staff access changes.",
  },
];

export function SuperAdminConfigurationPage() {
  const { user } = useAuth();
  const isOwner = isPrimaryAdmin(user);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; allowed_ips: string }>>([]);
  const [tenantActive, setTenantActive] = useState(true);
  const [vendorLicense, setVendorLicense] = useState<import("../../../api/client").VendorLicenseStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const [g, t] = await Promise.all([
        client.adminSuperAdminGroups(),
        client.tenantStatus(),
      ]);
      setGroups(g.groups);
      setTenantActive(t.status.is_active);
      setVendorLicense(t.vendorLicense ?? null);
    } catch {
      /* non-owner may 403 */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(key: string, fn: () => Promise<{ message: string }>) {
    setBusy(key);
    setError(null);
    setMsg(null);
    try {
      const r = await fn();
      setMsg(r.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!isOwner) {
    return (
      <Panel className="p-5 text-sm text-slate-600">
        <p>Super Admin configuration is restricted to the owner account (role: admin).</p>
        <p className="mt-2">
          Ask your platform owner to run maintenance, or open{" "}
          <Link to="/admin/system/team-permissions" className="text-teal-700 hover:underline">
            Access Keys
          </Link>{" "}
          for your permissions.
        </p>
        <PageBottomGuide intro="You can still read what each tool does below." blocks={configGuide} />
      </Panel>
    );
  }

  return (
    <div>
      <PageHeader title="Configuration" subtitle="One-click maintenance for the platform owner" />
      <ErrorBanner message={error} />
      {msg ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>
      ) : null}

      <Panel className="divide-y divide-slate-100 p-5">
        <ActionRow
          title='Update "group"'
          description='Sets every desk group IP allowlist to "All" so agents are not blocked by office IP rules.'
          buttonLabel='Set All Groups IPs To "All"'
          busy={busy === "groups"}
          onRun={() => run("groups", () => client.adminSuperAdminSetGroupsAll())}
        />
        <ActionRow
          title="Refresh Phone Prefixes/CLIDs For All agents"
          description="Rebuilds dial_prefix and dial_clid on every staff profile from country + phone."
          buttonLabel="Refresh"
          icon={<RefreshCw size={16} />}
          busy={busy === "phones"}
          onRun={() => run("phones", () => client.adminSuperAdminRefreshPhones())}
        />
        <ActionRow
          title="Purge Cache/Redis All"
          description="Flushes in-memory market and desk caches (no Redis on this stack)."
          buttonLabel="Purge Cache/Redis"
          busy={busy === "cache"}
          onRun={() => run("cache", () => client.adminSuperAdminPurgeCache())}
        />
      </Panel>

      <Panel className="mt-4 p-5">
        <h3 className="text-sm font-semibold text-slate-800">Desk groups (current)</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {groups.length === 0 ? (
            <li>No groups loaded.</li>
          ) : (
            groups.map((g) => (
              <li key={g.id} className="flex justify-between gap-4 border-b border-slate-50 py-1">
                <span>{g.name}</span>
                <span className="font-mono text-xs text-slate-500">{g.allowed_ips}</span>
              </li>
            ))
          )}
        </ul>
      </Panel>

      <Panel className="mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-medium text-slate-800">Platform status</p>
          <p className="mt-1 text-sm text-slate-500">
            {tenantActive ? "Live — clients and staff can trade." : "Paused — trading and most admin routes return 402."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={busy === "tenant" || tenantActive}
            onClick={() =>
              void run("tenant", async () => {
                await client.tenantSetActive({ isActive: true, reason: "Resumed from Super Admin" });
                return { message: "Platform resumed." };
              })
            }
          >
            Resume platform
          </button>
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            disabled={busy === "tenant" || !tenantActive}
            onClick={() =>
              void run("tenant", async () => {
                await client.tenantSetActive({ isActive: false, reason: "Paused from Super Admin" });
                return { message: "Platform paused." };
              })
            }
          >
            Pause platform
          </button>
        </div>
      </Panel>

      {vendorLicense?.configured ? (
        <Panel className="mt-4 p-5">
          <p className="font-medium text-slate-800">Curioni Labs hosting license</p>
          <p className="mt-1 text-sm text-slate-500">
            Heartbeat only — no client data leaves your server. Curioni Labs sees domain, build version, and license status.
          </p>
          <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
              <dd className="font-mono">{vendorLicense.mode}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Build</dt>
              <dd className="font-mono">{vendorLicense.buildVersion}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Last OK</dt>
              <dd>{vendorLicense.lastOkAt ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Last check</dt>
              <dd>{vendorLicense.lastCheckAt ?? "—"}</dd>
            </div>
          </dl>
          {vendorLicense.reason ? (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{vendorLicense.reason}</p>
          ) : null}
        </Panel>
      ) : null}

      <Panel className="mt-4 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Also configured elsewhere</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-teal-700">
          <li>
            <Link to="/admin/system/common" className="hover:underline">
              Brand DNA / Common
            </Link>
          </li>
          <li>
            <Link to="/admin/system/team-permissions" className="hover:underline">
              Access Keys / Permissions
            </Link>
          </li>
          <li>
            <Link to="/admin/system/payment-gateways" className="hover:underline">
              Payment Gateways
            </Link>
          </li>
          <li>
            <Link to="/admin/desk" className="hover:underline">
              Wallstreet AI brain overrides
            </Link>
          </li>
        </ul>
      </Panel>

      <PageBottomGuide
        intro="Everything on this page is dangerous-but-simple: one button, platform-wide effect. Read before you click."
        blocks={configGuide}
      />
    </div>
  );
}

function EventLogPage({
  title,
  kind,
  emptyHint,
  guideBlocks,
  guideIntro,
}: {
  title: string;
  kind: string;
  emptyHint: string;
  guideBlocks: GuideBlock[];
  guideIntro: string;
}) {
  const [rows, setRows] = useState<
    Array<{ id: number; message: string; actor: string | null; created_at: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .adminSuperAdminEvents(kind)
      .then((d) => setRows(d.events))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load logs."));
  }, [kind]);

  return (
    <div>
      <PageHeader title={title} subtitle="Owner audit trail stored on your server (no vendor cloud)" />
      <ErrorBanner message={error} />
      <Panel className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2">When (UTC)</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Message</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-slate-500">
                  {emptyHint}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{r.created_at}</td>
                  <td className="px-4 py-2 text-slate-600">{r.actor ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{r.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>
      <PageBottomGuide intro={guideIntro} blocks={guideBlocks} />
    </div>
  );
}

export function SuperAdminErrorLogsPage() {
  return (
    <EventLogPage
      title="Error Logs"
      kind="error"
      emptyHint="No error rows stored yet. Server errors appear here when LOG_LEVEL allows logging and the event is recorded."
      guideIntro="Errors mean something broke on the server — not a client mis-click."
      guideBlocks={[
        {
          title: "What you are looking at",
          what: "A scrubbed list of platform errors (no client emails or phone numbers).",
          how: "Scan the newest row, note the message, then check server LOG_LEVEL or pm2 logs if empty.",
          when: "White screen, 500 responses, or Wallstreet AI suddenly silent.",
        },
        {
          title: "What not to do",
          what: "These rows are diagnostic — deleting them is not supported here.",
          how: "Fix the root cause (disk full, bad deploy, missing env var) then refresh the page.",
          when: "Never — use History Logs for your own maintenance actions.",
        },
      ]}
    />
  );
}

export function SuperAdminSmtpLogsPage() {
  return (
    <EventLogPage
      title="SMTP Logs"
      kind="smtp"
      emptyHint="No SMTP events yet. Outbound mail is not sent from this CRM — use your mail provider or marketing tool. CRM → Comms Log only records copies."
      guideIntro="Outbound email delivery log — only populated if SMTP is configured on your server."
      guideBlocks={[
        {
          title: "SMTP vs Comms Log",
          what: "SMTP logs would show send/delivery attempts from a mail server.",
          how: "For conversations your team logged manually, open CRM → Comms Log instead.",
          when: "Client says they never got email — check your real SMTP provider first.",
        },
        {
          title: "Future hook",
          what: "If you wire SendGrid/Postmark later, successful/failed sends can append rows here.",
          how: "Until then, ignore empty table — it is normal.",
          when: "After integrating a transactional email API.",
        },
      ]}
    />
  );
}

export function SuperAdminBalanceEventsPage() {
  return <BalanceEventsPage />;
}

export function SuperAdminHistoryLogsPage() {
  return <HistoryLogsPage />;
}

export function SuperAdminOrderStorageLogsPage() {
  return (
    <EventLogPage
      title="Order Storage Logs"
      kind="order_storage"
      emptyHint="No order-storage events yet. Open and closed trades live under Trading → Live Book / Closed Book."
      guideIntro="Trade sync diagnostics — use Live Book for day-to-day position work."
      guideBlocks={[
        {
          title: "When this fills",
          what: "Records unusual order persistence events (failed save, repair, bulk delete).",
          how: "If empty, rely on Trading → Closed Book. Use admin delete trade only with compliance sign-off.",
          when: "Missing trade in UI but client insists they placed it.",
        },
      ]}
    />
  );
}

export function SuperAdminIndexRedirect() {
  return <Navigate to="/admin/system/configuration" replace />;
}
