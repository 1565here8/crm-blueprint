import { Mail, MessageSquare, Phone, Sparkles, Workflow } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { CurioniStatCard } from "../../../components/admin/curioni/CurioniStatCard";
import { CrmHero, CrmPageLayout } from "../../../components/admin/crm/CrmPageLayout";
import { DRIP_TRIGGER_META, curioni } from "../../../lib/curioniDesign";

type Channel = {
  name: string;
  status: "live" | "ready" | "roadmap";
  desc: string;
  to?: string;
  configure?: string;
  icon: React.ReactNode;
};

const CHANNELS: Channel[] = [
  {
    name: "CRM email log",
    status: "live",
    desc: "Every outbound touch logged on the client file.",
    to: "/admin/crm/emails",
    icon: <Mail size={20} className="text-violet-600" />,
  },
  {
    name: "SMTP delivery",
    status: "live",
    desc: "Delivery attempts and bounce diagnostics.",
    to: "/admin/system/smtp-logs",
    icon: <Mail size={20} className="text-emerald-600" />,
  },
  {
    name: "Automation Studio",
    status: "live",
    desc: "AI sequences with approve gate — KYC chase, dormant, failed deposit.",
    to: "/admin/automation",
    icon: <Workflow size={20} className="text-cyan-600" />,
  },
  {
    name: "Twilio SMS",
    status: "roadmap",
    desc: "Branch in dormant sequence — wire Account SID in Integration Hub.",
    configure: "/admin/integrations",
    icon: <MessageSquare size={20} className="text-slate-400" />,
  },
  {
    name: "WhatsApp Business",
    status: "roadmap",
    desc: "High-intent regions — template messages from Automation Studio.",
    configure: "/admin/integrations",
    icon: <MessageSquare size={20} className="text-slate-400" />,
  },
  {
    name: "VOIP / click-to-call",
    status: "roadmap",
    desc: "Sales desk pop — Twilio Voice or 3CX SIP trunk.",
    configure: "/admin/broker-os",
    icon: <Phone size={20} className="text-slate-400" />,
  },
];

const STATUS_CHIP: Record<Channel["status"], string> = {
  live: curioni.chipOk,
  ready: "bg-cyan-500/15 text-cyan-800 ring-1 ring-cyan-500/25",
  roadmap: curioni.chipMuted,
};

export function CommsCenterPage() {
  const live = CHANNELS.filter((c) => c.status === "live").length;

  return (
    <CrmPageLayout wide>
      <CrmHero
        eyebrow="Support · Channels"
        title="Comms Center"
        subtitle="LXCRM pitches VOIP + SMS + email in one stack. Here is your channel map — live rails first, wire voice next."
        actions={
          <Link
            to="/admin/automation"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            <Sparkles size={16} />
            Automation Studio
          </Link>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <CurioniStatCard label="Live channels" value={String(live)} tone="emerald" />
        <CurioniStatCard label="On roadmap" value="3" tone="amber" />
        <CurioniStatCard label="Broker OS" value="Audit" to="/admin/broker-os" tone="violet" />
      </div>

      <div className={`mb-8 overflow-hidden rounded-2xl ${curioni.gradient} p-6 text-white ${curioni.heroShadow}`}>
        <p className={curioni.heroBadge}>Genius flow · Retain</p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85">
          Leverate closes deals with VOIP in the CRM. Curioni closes with{" "}
          <strong className="text-white">AI drafts + human approve</strong> — no message leaves without operator sign-off.
          Wire SMS when Twilio keys land; voice follows same hub.
        </p>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CHANNELS.map((ch) => {
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2">
                {ch.icon}
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_CHIP[ch.status]}`}>
                  {ch.status}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{ch.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{ch.desc}</p>
            </>
          );
          const cls = `rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md ${curioni.panelGlow}`;
          if (ch.to) {
            return (
              <Link key={ch.name} to={ch.to} className={cls}>
                {inner}
              </Link>
            );
          }
          return (
            <div key={ch.name} className={cls}>
              {inner}
              {ch.configure ? (
                <Link to={ch.configure} className="mt-3 inline-block text-xs font-semibold text-violet-600 hover:underline">
                  Configure →
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-slate-100">
        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Retention sequences · live</p>
        <h3 className="mt-1 text-base font-semibold">Automation triggers wired today</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(DRIP_TRIGGER_META).map(([key, meta]) => (
            <Link
              key={key}
              to="/admin/automation"
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2.5 transition hover:border-violet-500/40"
            >
              <p className="text-xs font-semibold text-white">{meta.label}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{meta.steps.length} steps · {key}</p>
            </Link>
          ))}
        </div>
      </section>
    </CrmPageLayout>
  );
}
