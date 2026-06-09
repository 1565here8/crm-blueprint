import { Ban, CheckCircle2, ExternalLink, ShieldAlert } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, Panel, StatChip, btnPrimary, btnSecondary } from "../../../components/admin/CrmShell";

const SCENARIOS = [
  {
    title: "Enabled (default)",
    icon: CheckCircle2,
    color: "text-emerald-500",
    body: "Client can log in and open new trades. Deposits and withdrawals follow cashier rules.",
    when: "Normal retail and VIP accounts.",
  },
  {
    title: "Disabled",
    icon: Ban,
    color: "text-rose-500",
    body: "Login may work but the terminal blocks new orders. Use for compliance holds or suspected fraud.",
    when: "One-off freeze from Client File → Trading tab.",
  },
  {
    title: "Platform kill-switch",
    icon: ShieldAlert,
    color: "text-amber-500",
    body: "Maintenance or regulatory halt — pair with Configuration for global trading off.",
    when: "Market holidays, vendor maintenance, emergency desk directive.",
  },
];

export function TradingStatusPage() {
  return (
    <div>
      <AdminPageHeader
        title="Trading Status"
        subtitle="Block trading while allowing deposits, or freeze accounts entirely — per client or platform-wide."
        actions={
          <Link to="/admin/crm/users" className={btnPrimary}>
            Bulk edit clients
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <StatChip label="Values" value="Enabled · Disabled" />
        <StatChip label="Set on" value="Client file + bulk" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          return (
            <Panel key={s.title} className="border-slate-200 p-5">
              <div className="flex items-center gap-2">
                <Icon className={s.color} size={22} />
                <h2 className="font-semibold text-slate-900">{s.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.body}</p>
              <p className="mt-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">When: </span>
                {s.when}
              </p>
            </Panel>
          );
        })}
      </div>

      <Panel className="mt-6 border-slate-800 bg-gradient-to-br from-[#0c1017] to-slate-900 p-6 text-slate-200">
        <h2 className="text-lg font-semibold text-white">How operators use this today</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-400">
          <li>
            Open a client from{" "}
            <Link to="/admin/crm/users" className="text-teal-400 hover:underline">
              All Clients
            </Link>{" "}
            → Profile → set <strong className="text-slate-200">Trading Status</strong>.
          </li>
          <li>Select multiple rows on All Clients → bulk patch → Trading status.</li>
          <li>
            Check{" "}
            <Link to="/admin/trading/open-trades" className="text-teal-400 hover:underline">
              Live Book
            </Link>{" "}
            after a disable — open positions remain until closed.
          </li>
          <li>
            Commission and spread tables live under{" "}
            <Link to="/admin/settings" className="text-teal-400 hover:underline">
              Settings
            </Link>{" "}
            (Fees &amp; trading status permission).
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/admin/crm/users?tradingStatus=Disabled" className={btnSecondary}>
            View disabled traders
          </Link>
          <Link to="/admin/system/configuration" className={`${btnSecondary} inline-flex items-center gap-1.5`}>
            Configuration
            <ExternalLink size={14} />
          </Link>
        </div>
      </Panel>
    </div>
  );
}
