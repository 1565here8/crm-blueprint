import { Copy, FileKey2, Server } from "lucide-react";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, Panel, btnSecondary } from "../../../components/admin/CrmShell";
import { getAdminUrl } from "../../../lib/siteMode";

type Endpoint = { method: string; path: string; plain: string };

const GROUPS: { title: string; desc: string; endpoints: Endpoint[] }[] = [
  {
    title: "Auth & session",
    desc: "Staff console login — cookie session after POST /api/auth/login.",
    endpoints: [
      { method: "POST", path: "/api/auth/login", plain: "Sign in with username + password." },
      { method: "POST", path: "/api/auth/logout", plain: "End staff session." },
      { method: "GET", path: "/api/auth/me", plain: "Who is logged in and their permissions." },
    ],
  },
  {
    title: "Clients (CRM)",
    desc: "Search, open, and bulk-update leads and funded accounts.",
    endpoints: [
      { method: "GET", path: "/api/admin/crm/users", plain: "Paginated client grid with filters." },
      { method: "GET", path: "/api/admin/crm/users/:id", plain: "Full client file — money, trades, notes." },
      { method: "PATCH", path: "/api/admin/crm/users/:id", plain: "Update status, agent, trading flag, profile." },
      { method: "POST", path: "/api/admin/crm/users/bulk", plain: "Bulk status / agent / trading changes." },
    ],
  },
  {
    title: "Cashier & money",
    desc: "Approve deposits, post credits, and run payouts.",
    endpoints: [
      { method: "GET", path: "/api/admin/cashier/deposit-requests", plain: "Pending funding queue." },
      { method: "POST", path: "/api/admin/cashier/deposit-requests/:id/process", plain: "Approve or reject a deposit." },
      { method: "GET", path: "/api/admin/cashier/ledger", plain: "Every balance movement." },
      { method: "POST", path: "/api/admin/cashier/adjustment", plain: "Manual balance correction." },
    ],
  },
  {
    title: "Marketing & affiliates",
    desc: "Campaign attribution and partner API keys.",
    endpoints: [
      { method: "GET", path: "/api/admin/marketing/campaigns", plain: "UTM / campaign list." },
      { method: "GET", path: "/api/admin/marketing/trackers", plain: "Conversion pixels." },
      { method: "GET", path: "/api/admin/marketing/api-keys", plain: "Integration keys for partners." },
      { method: "GET", path: "/api/admin/system/oauth", plain: "OAuth client rows for lead importers." },
    ],
  },
  {
    title: "System calibration",
    desc: "Spread, commissions, statuses, auto-assign — owner routes.",
    endpoints: [
      { method: "GET", path: "/api/admin/system/spread", plain: "Spread tier matrix." },
      { method: "GET", path: "/api/admin/system/forex-commissions", plain: "FX commission grid." },
      { method: "GET", path: "/api/admin/system/statuses", plain: "Pipeline status labels." },
      { method: "GET", path: "/api/admin/system/auto-assign", plain: "Lead routing rules." },
    ],
  },
];

function MethodBadge({ method }: { method: string }) {
  const cls =
    method === "GET"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : method === "POST"
        ? "bg-sky-500/15 text-sky-300 ring-sky-500/30"
        : "bg-amber-500/15 text-amber-300 ring-amber-500/30";
  return (
    <span className={`inline-flex min-w-[3.5rem] justify-center rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ${cls}`}>
      {method}
    </span>
  );
}

export function ApiDocsPage() {
  const base = typeof window !== "undefined" ? window.location.origin : getAdminUrl();
  const [copied, setCopied] = useState(false);

  const copyBase = () => {
    void navigator.clipboard.writeText(`${base}/api`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <AdminPageHeader
        title="API Docs"
        subtitle="REST reference for developers connecting affiliates, PSP webhooks, and external tools."
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel className="border-slate-800 bg-gradient-to-br from-[#0c1017] to-slate-900 p-5 text-slate-200 lg:col-span-2">
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 shrink-0 text-teal-400" size={22} />
            <div>
              <p className="text-sm font-semibold text-white">Base URL</p>
              <code className="mt-2 block rounded-lg bg-black/40 px-3 py-2 text-sm text-teal-300">{base}/api</code>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Authenticate as staff (session cookie) or use partner keys from{" "}
                <Link to="/admin/marketing/api-keys" className="text-teal-400 hover:underline">
                  Integrations
                </Link>{" "}
                /{" "}
                <Link to="/admin/system/oauth" className="text-teal-400 hover:underline">
                  OAuth
                </Link>
                . All times are UTC unless noted.
              </p>
            </div>
          </div>
        </Panel>
        <Panel className="flex flex-col justify-between border-slate-800 bg-[#0c1017] p-5">
          <div className="flex items-center gap-2 text-teal-300">
            <FileKey2 size={18} />
            <span className="text-sm font-semibold">Quick actions</span>
          </div>
          <button type="button" className={`${btnSecondary} mt-4 w-full border-slate-700 bg-slate-900 text-slate-200`} onClick={copyBase}>
            <span className="inline-flex items-center justify-center gap-2">
              <Copy size={14} />
              {copied ? "Copied!" : "Copy base URL"}
            </span>
          </button>
          <Link
            to="/admin/knowme"
            className="mt-2 text-center text-xs text-teal-400 hover:underline"
          >
            Not technical? Open KNOWME → Affiliate flow slide
          </Link>
        </Panel>
      </div>

      <div className="space-y-6">
        {GROUPS.map((g) => (
          <Panel key={g.title} className="overflow-hidden border-slate-200 p-0">
            <div className="border-b border-slate-800 bg-[#0c1017] px-5 py-4">
              <h2 className="text-lg font-semibold text-white">{g.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{g.desc}</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {g.endpoints.map((ep) => (
                <li key={ep.path + ep.method} className="flex flex-wrap items-start gap-3 px-5 py-3 hover:bg-teal-50/30">
                  <MethodBadge method={ep.method} />
                  <code className="min-w-0 flex-1 text-sm text-slate-800">{ep.path}</code>
                  <span className="w-full text-sm text-slate-500 sm:w-auto sm:max-w-md sm:text-right">{ep.plain}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
