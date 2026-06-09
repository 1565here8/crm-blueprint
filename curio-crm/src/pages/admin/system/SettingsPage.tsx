import React from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Gavel,
  Layers,
  Mail,
  Monitor,
  Palette,
  Percent,
  Receipt,
  ScrollText,
  Settings,
  ShieldHalf,
  Target,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SettingsCard = {
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
};

type SettingsSection = {
  title: string;
  tagline: string;
  cards: SettingsCard[];
};

const SECTIONS: SettingsSection[] = [
  {
    title: "Brand & platform",
    tagline: "White-label, geo gates, and desk defaults",
    cards: [
      { to: "/admin/system/common/branding", label: "Brand DNA", desc: "CRM name, public site link, and white-label identity.", icon: Palette },
      { to: "/admin/system/common/countries", label: "Countries", desc: "Geo gates — visits, registration, trading, phone prefixes.", icon: Monitor },
      { to: "/admin/system/common/preferences", label: "Preferences", desc: "Platform toggles, limits, and terminal UI defaults.", icon: Settings },
    ],
  },
  {
    title: "Commissions & pricing",
    tagline: "Fees, spreads, and account tiers",
    cards: [
      { to: "/admin/system/forex-commissions", label: "Forex Commissions", desc: "Tier × currency fixed per-side FX commission matrix.", icon: Percent },
      { to: "/admin/system/crypto-commissions", label: "Crypto Fees", desc: "Tier × wallet currency crypto trade fees.", icon: Receipt },
      { to: "/admin/system/spread", label: "Spread", desc: "Tier multipliers and per-asset markup.", icon: Layers },
      { to: "/admin/system/account-type", label: "Account Type", desc: "Retail vs VIP vs IB — leverage and deposit limits.", icon: Target },
    ],
  },
  {
    title: "Deposits & payments",
    tagline: "Funding rails and promo rules",
    cards: [
      { to: "/admin/system/min-max-deposits", label: "Min/Max Deposits", desc: "Floor and ceiling for inbound funding amounts.", icon: CreditCard, ownerOnly: true },
      { to: "/admin/system/payment-gateways", label: "Payment Gateways", desc: "PSP credentials and deposit processor rails.", icon: CreditCard, ownerOnly: true },
      { to: "/admin/system/promo-code", label: "Promo Code", desc: "Bonus codes and acquisition incentives.", icon: Receipt },
    ],
  },
  {
    title: "Client pipeline",
    tagline: "Statuses, routing, and funnel labels",
    cards: [
      { to: "/admin/system/status", label: "Statuses", desc: "CRM funnel stages — New, Hot, Call Back, and custom labels.", icon: Target, ownerOnly: true },
      { to: "/admin/system/dynamic-status", label: "Dynamic Status", desc: "Automated status transitions and rules.", icon: Layers, ownerOnly: true },
      { to: "/admin/system/auto-assign", label: "Auto Assign", desc: "Route inbound leads to desks and agents.", icon: UsersRound },
    ],
  },
  {
    title: "Access & team",
    tagline: "Who sees what on the desk",
    cards: [
      { to: "/admin/system/team-permissions", label: "Access Keys", desc: "Create sub-admins and set sidebar permissions.", icon: Gavel },
      { to: "/admin/system/groups", label: "Groups", desc: "Desk role buckets — open permissions per group.", icon: UsersRound },
      { to: "/admin/system/desks", label: "Desks", desc: "Regional language floors — German, UK, LATAM.", icon: Monitor },
      { to: "/admin/system/permissions", label: "Permissions", desc: "CRM and API permission matrix per desk group.", icon: ShieldHalf },
      { to: "/admin/system/oauth", label: "OAuth", desc: "Affiliate and API partner credentials.", icon: ShieldHalf },
      { to: "/admin/system/common/security/view-log", label: "Security", desc: "Staff login audit — IP, time, and session history.", icon: ShieldHalf, ownerOnly: true },
    ],
  },
  {
    title: "Owner tools",
    tagline: "Platform-wide maintenance and audit",
    cards: [
      { to: "/admin/system/configuration", label: "Configuration", desc: "Kill-switch, tenant status, and maintenance mode.", icon: Settings, ownerOnly: true },
      { to: "/admin/system/event-logs", label: "Event Logs", desc: "Full CRM audit trail — who changed what and when.", icon: ScrollText, ownerOnly: true },
      { to: "/admin/system/notifications", label: "Notifications", desc: "Email templates and outbound alert rules.", icon: Mail, ownerOnly: true },
      { to: "/admin/system/tracking", label: "Tracking", desc: "Attribution pixels and conversion tracking.", icon: Target },
    ],
  },
];

function SettingsCardLink({ card }: { card: SettingsCard }) {
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      className="group flex flex-col rounded-xl border border-slate-800 bg-[#0c1017] p-4 shadow-inner shadow-black/20 transition hover:border-teal-700/60 hover:shadow-teal-900/10"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 text-teal-400 transition group-hover:border-teal-700/50 group-hover:text-teal-300">
          <Icon size={18} />
        </div>
        {card.ownerOnly ? (
          <span className="rounded-full border border-amber-800/60 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400/90">
            Owner
          </span>
        ) : null}
      </div>
      <h3 className="font-semibold text-slate-100 group-hover:text-teal-300">{card.label}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{card.desc}</p>
    </Link>
  );
}

export function SettingsPage() {
  return (
    <div className="p-4">
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Systems</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Platform configuration hub — branding, commissions, deposits, pipeline, access, and owner tools.
        </p>
      </header>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{section.title}</h2>
              <p className="text-xs text-slate-500">{section.tagline}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.cards.map((card) => (
                <SettingsCardLink key={card.to} card={card} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
