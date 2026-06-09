import { CreditCard, LineChart, MessageSquare, Monitor, Shield, Sparkles } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { Panel } from "../../../components/admin/CrmShell";
import { CrmHero, CrmPageLayout } from "../../../components/admin/crm/CrmPageLayout";
import { curioni } from "../../../lib/curioniDesign";

type Tile = {
  name: string;
  status: "live" | "ready" | "roadmap";
  to?: string;
  accent?: string;
};

const SECTIONS: { title: string; icon: React.ReactNode; tiles: Tile[]; configureTo?: string }[] = [
  {
    title: "Trading platforms",
    icon: <LineChart size={18} className="text-cyan-600" />,
    configureTo: "/admin/integrations/metatrader",
    tiles: [
      { name: "Curioni Web Terminal", status: "live", to: "/admin/trading/open-trades", accent: "from-violet-500/10 to-indigo-500/5" },
      { name: "MetaTrader 4", status: "live", to: "/admin/integrations/metatrader", accent: "from-emerald-500/15 to-teal-500/5" },
      { name: "MetaTrader 5", status: "live", to: "/admin/integrations/metatrader", accent: "from-blue-500/15 to-indigo-500/5" },
      { name: "cTrader", status: "roadmap", accent: "from-slate-200/40 to-white" },
      { name: "DXtrade", status: "roadmap", accent: "from-slate-200/40 to-white" },
    ],
  },
  {
    title: "Financial connections",
    icon: <CreditCard size={18} className="text-violet-600" />,
    configureTo: "/admin/system/payment-gateways",
    tiles: [
      { name: "Card processors", status: "live", to: "/admin/system/payment-gateways" },
      { name: "Wire / bank", status: "live", to: "/admin/cashier/wire-req" },
      { name: "Crypto vault", status: "live", to: "/admin/cashier/deposits" },
      { name: "Generic PSP endpoint", status: "ready", to: "/admin/desk/psp-health" },
    ],
  },
  {
    title: "KYC & compliance",
    icon: <Shield size={18} className="text-emerald-600" />,
    configureTo: "/admin/system/event-logs",
    tiles: [
      { name: "Internal doc review", status: "live", to: "/admin/crm/users" },
      { name: "Extended docs flag", status: "live", to: "/admin/system/common/preferences" },
      { name: "Sumsub / Onfido", status: "ready" },
      { name: "Jurisdiction rules", status: "live", to: "/admin/system/common/countries" },
    ],
  },
  {
    title: "Communications",
    icon: <MessageSquare size={18} className="text-indigo-600" />,
    configureTo: "/admin/automation",
    tiles: [
      { name: "CRM email log", status: "live", to: "/admin/crm/emails" },
      { name: "Automation Studio + AI", status: "live", to: "/admin/automation" },
      { name: "SMTP logs", status: "live", to: "/admin/system/smtp-logs" },
      { name: "Twilio / WhatsApp", status: "roadmap" },
    ],
  },
];

const STATUS_STYLE: Record<Tile["status"], string> = {
  live: curioni.chipOk,
  ready: "bg-cyan-500/15 text-cyan-800 ring-1 ring-cyan-500/25",
  roadmap: curioni.chipMuted,
};

function TileCard({ tile }: { tile: Tile }) {
  const inner = (
    <>
      <p className="text-sm font-semibold text-slate-800">{tile.name}</p>
      <span className={`mt-2 block w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLE[tile.status]}`}>
        {tile.status}
      </span>
    </>
  );
  const cls = `rounded-xl border border-slate-100 bg-gradient-to-br px-4 py-3.5 transition ${tile.accent ?? "from-white to-slate-50"} ${
    tile.to ? "hover:border-violet-200 hover:shadow-md hover:ring-1 hover:ring-violet-500/15" : ""
  }`;
  return tile.to ? (
    <Link to={tile.to} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function IntegrationsHubPage() {
  return (
    <CrmPageLayout wide>
      <CrmHero
        eyebrow="Systems · Connect everything"
        title="Integration Hub"
        subtitle="Plug in financial connections when you launch — cards, wire, crypto vault, MT bridge, KYC vendors, and comms. Live, API-ready, or on the roadmap."
        actions={
          <>
            <Link
              to="/admin/broker-os"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-200"
            >
              LXCRM audit
            </Link>
            <Link
              to="/admin/integrations/metatrader"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
            >
              <Monitor size={16} />
              MT4 / MT5 Bridge
            </Link>
          </>
        }
      />

      <Panel className={`mb-6 overflow-hidden p-0 ${curioni.gradient}`}>
        <div className="flex flex-col gap-4 px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="max-w-2xl">
            <p className={curioni.heroBadge}>
              <Sparkles size={12} className="mr-1 inline" />
              Sovereign stack
            </p>
            <p className="mt-3 text-lg font-semibold leading-snug">
              Treasury, trading book, MetaTrader bridge, AI desk, and automations — one Node deployment.
            </p>
            <p className="mt-2 text-sm text-white/75">
              Unlike legacy CRMs that charge per integration, Curioni ships the full broker OS. Connect external PSPs
              when you are ready via{" "}
              <Link to="/admin/system/api-docs" className="font-semibold text-white underline decoration-white/40">
                API docs
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link
              to="/admin/integrations/metatrader"
              className="rounded-xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm transition hover:bg-white/25"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">MT4</p>
              <p className="mt-0.5 text-sm font-semibold">Configure</p>
            </Link>
            <Link
              to="/admin/integrations/metatrader"
              className="rounded-xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm transition hover:bg-white/25"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">MT5</p>
              <p className="mt-0.5 text-sm font-semibold">Configure</p>
            </Link>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {SECTIONS.map((sec) => (
          <Panel key={sec.title} className={`overflow-hidden p-0 ${curioni.panelGlow}`}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3.5">
              <div className="flex items-center gap-2">
                {sec.icon}
                <h3 className="text-sm font-semibold text-slate-800">{sec.title}</h3>
              </div>
              {sec.configureTo ? (
                <Link
                  to={sec.configureTo}
                  className="text-[10px] font-bold uppercase tracking-wide text-violet-600 hover:underline"
                >
                  Configure
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-4">
              {sec.tiles.map((t) => (
                <TileCard key={t.name} tile={t} />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </CrmPageLayout>
  );
}
