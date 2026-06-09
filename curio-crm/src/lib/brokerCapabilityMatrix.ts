/**
 * LXCRM-style capability map — Curioni Desk CRM vs industry broker stack.
 * Status: live | partial | ready | roadmap | n/a
 */

export type CapabilityStatus = "live" | "partial" | "ready" | "roadmap" | "na";

export type BrokerCapability = {
  id: string;
  name: string;
  leverateAnalog: string;
  status: CapabilityStatus;
  summary: string;
  to?: string;
  /** Journey step for genius-flow ribbon */
  flowStep?: "acquire" | "onboard" | "fund" | "trade" | "retain" | "partner" | "operate";
};

export type BrokerPillar = {
  id: string;
  label: string;
  tagline: string;
  icon: string;
  capabilities: BrokerCapability[];
};

export const STATUS_META: Record<
  CapabilityStatus,
  { label: string; score: number; chip: string; dot: string }
> = {
  live: {
    label: "Live",
    score: 100,
    chip: "bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-600/25",
    dot: "bg-emerald-500",
  },
  partial: {
    label: "Partial",
    score: 55,
    chip: "bg-amber-500/12 text-amber-900 ring-1 ring-amber-600/25",
    dot: "bg-amber-500",
  },
  ready: {
    label: "API-ready",
    score: 70,
    chip: "bg-cyan-500/12 text-cyan-800 ring-1 ring-cyan-600/25",
    dot: "bg-cyan-500",
  },
  roadmap: {
    label: "Roadmap",
    score: 15,
    chip: "bg-slate-200/80 text-slate-600 ring-1 ring-slate-300/80",
    dot: "bg-slate-400",
  },
  na: {
    label: "Not in scope",
    score: 0,
    chip: "bg-violet-500/8 text-violet-700/70 ring-1 ring-violet-300/40",
    dot: "bg-violet-300",
  },
};

export const CLIENT_JOURNEY_FLOW: { step: BrokerCapability["flowStep"]; label: string; desc: string }[] = [
  { step: "acquire", label: "Acquire", desc: "Campaigns, pixels, hot leads" },
  { step: "onboard", label: "Onboard", desc: "KYC, docs, auto-assign" },
  { step: "fund", label: "Fund", desc: "PSP, wire, cashier" },
  { step: "trade", label: "Trade", desc: "Web terminal, MT bridge, book" },
  { step: "retain", label: "Retain", desc: "Automation, AI desk, support" },
  { step: "partner", label: "Partners", desc: "IB tiers, commissions" },
  { step: "operate", label: "Operate", desc: "Risk, audit, sovereign stack" },
];

export const BROKER_PILLARS: BrokerPillar[] = [
  {
    id: "sales",
    label: "Sales & conversion",
    tagline: "LXCRM lead engine — capture, route, close",
    icon: "target",
    capabilities: [
      { id: "hot-leads", name: "Hot Leads inbox", leverateAnalog: "Lead management", status: "live", summary: "Entrance signups, concierge captures, and callback queue with agent assignment.", to: "/admin/desk/leads", flowStep: "acquire" },
      { id: "mission-control", name: "Mission Control dashboards", leverateAnalog: "Smart sales dashboards", status: "live", summary: "Registrations, FTD, conversion, treasury cards.", to: "/admin", flowStep: "acquire" },
      { id: "auto-assign", name: "Auto-assign routing", leverateAnalog: "Pipeline automation", status: "live", summary: "Route signups by country, campaign, or desk.", to: "/admin/system/auto-assign", flowStep: "acquire" },
      { id: "sales-scoreboard", name: "Agent scoreboard", leverateAnalog: "Sales performance", status: "live", summary: "KPIs per agent for the selected period.", to: "/admin/crm/sales-report", flowStep: "acquire" },
      { id: "voip", name: "Built-in VOIP", leverateAnalog: "VOIP & click-to-call", status: "roadmap", summary: "Twilio Voice / 3CX bridge — use Comms Center to plan.", to: "/admin/crm/comms", flowStep: "acquire" },
      { id: "custom-pipelines", name: "Custom sales pipelines", leverateAnalog: "Tailored workflows", status: "partial", summary: "Client statuses + dynamic status rules; not drag-drop Kanban.", to: "/admin/system/status", flowStep: "acquire" },
    ],
  },
  {
    id: "onboarding",
    label: "Onboarding & KYC",
    tagline: "First trade in hours, not days",
    icon: "shield",
    capabilities: [
      { id: "client-file", name: "Unified client file", leverateAnalog: "Client onboarding hub", status: "live", summary: "Profile, docs, permissions, trading accounts.", to: "/admin/crm/users", flowStep: "onboard" },
      { id: "kyc-internal", name: "Internal doc review", leverateAnalog: "KYC collection", status: "live", summary: "Operators review uploads inside CRM.", to: "/admin/crm/users", flowStep: "onboard" },
      { id: "kyc-vendors", name: "Sumsub / Onfido", leverateAnalog: "Automated KYC/AML", status: "ready", summary: "Vendor hooks ready — wire keys in Integration Hub.", to: "/admin/integrations", flowStep: "onboard" },
      { id: "countries", name: "Jurisdiction rules", leverateAnalog: "Regulatory compliance", status: "live", summary: "Country allowlists for visit, register, trade.", to: "/admin/system/common/countries", flowStep: "onboard" },
      { id: "multi-lang", name: "Multi-language desks", leverateAnalog: "Multi-language CRM", status: "partial", summary: "Desk floors by language; full UI i18n on roadmap.", to: "/admin/system/desks", flowStep: "onboard" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & partners",
    tagline: "IB network + attribution that scales",
    icon: "megaphone",
    capabilities: [
      { id: "campaigns", name: "Campaign attribution", leverateAnalog: "Marketing integration", status: "live", summary: "UTM sources tied to signups and FTDs.", to: "/admin/marketing/campaigns", flowStep: "acquire" },
      { id: "partners-hq", name: "Partners HQ", leverateAnalog: "IB & affiliate system", status: "live", summary: "IB roster, commission matrix, performance.", to: "/admin/marketing/partners-hq", flowStep: "partner" },
      { id: "ib-tiers", name: "Multi-tier IB commissions", leverateAnalog: "Multi-tier tracking", status: "live", summary: "Forex/crypto commission grids by tier.", to: "/admin/system/forex-commissions", flowStep: "partner" },
      { id: "ib-payouts", name: "Automated IB payouts", leverateAnalog: "Automated payouts", status: "partial", summary: "Commission accrual live; payout automation manual.", to: "/admin/marketing/partners-hq", flowStep: "partner" },
      { id: "email-auto", name: "Email automation", leverateAnalog: "Email marketing", status: "live", summary: "AI sequences — KYC chase, dormant, failed deposit.", to: "/admin/automation", flowStep: "retain" },
      { id: "sms", name: "SMS / WhatsApp", leverateAnalog: "SMS marketing", status: "roadmap", summary: "Twilio channel — branch in Automation Studio designed.", to: "/admin/crm/comms", flowStep: "retain" },
      { id: "trackers", name: "Pixels & postbacks", leverateAnalog: "Performance analytics", status: "live", summary: "Trackers and conversion postbacks.", to: "/admin/marketing/trackers", flowStep: "acquire" },
    ],
  },
  {
    id: "support",
    label: "Support & comms",
    tagline: "Every touchpoint on one desk",
    icon: "headset",
    capabilities: [
      { id: "support-desk", name: "Support Desk", leverateAnalog: "Smart ticketing", status: "partial", summary: "Ticket-style queue on desk tasks + client context.", to: "/admin/crm/support", flowStep: "retain" },
      { id: "comms-log", name: "Comms log", leverateAnalog: "Client histories", status: "live", summary: "Email and notes on every client file.", to: "/admin/crm/emails", flowStep: "retain" },
      { id: "comms-center", name: "Comms Center", leverateAnalog: "VOIP & messaging", status: "partial", summary: "Unified channel hub — email live, voice/SMS next.", to: "/admin/crm/comms", flowStep: "retain" },
      { id: "calendar", name: "Callbacks & schedule", leverateAnalog: "Follow-up scheduling", status: "live", summary: "Agent calendar for promised callbacks.", to: "/admin/crm/calendar", flowStep: "retain" },
    ],
  },
  {
    id: "treasury",
    label: "Treasury & cashier",
    tagline: "Money in, money out, one audit trail",
    icon: "wallet",
    capabilities: [
      { id: "cashier", name: "Cashier & ledger", leverateAnalog: "Payment integration", status: "live", summary: "Deposits, withdrawals, bonuses, adjustments.", to: "/admin/cashier/ledger", flowStep: "fund" },
      { id: "psp", name: "Financial connections", leverateAnalog: "PSP connectors", status: "live", summary: "Card, wire, and crypto vault rails — connect when you go live.", to: "/admin/integrations", flowStep: "fund" },
      { id: "deposit-limits", name: "Deposit limits", leverateAnalog: "Risk-aware funding", status: "live", summary: "Min/max by PSP, country, FTD flag.", to: "/admin/system/min-max-deposits", flowStep: "fund" },
      { id: "psp-health", name: "Payment Radar", leverateAnalog: "PSP monitoring", status: "live", summary: "Live rail health for operators.", to: "/admin/desk/psp-health", flowStep: "fund" },
    ],
  },
  {
    id: "trading",
    label: "Trading & risk",
    tagline: "Book, bridge, and house exposure",
    icon: "chart",
    capabilities: [
      { id: "live-book", name: "Live & closed book", leverateAnalog: "Native platform sync", status: "live", summary: "Open/closed positions with desk actions.", to: "/admin/trading/open-trades", flowStep: "trade" },
      { id: "mt-bridge", name: "MT4 / MT5 bridge", leverateAnalog: "MT4/MT5 integration", status: "live", summary: "Server config, sync, client terminal downloads.", to: "/admin/integrations/metatrader", flowStep: "trade" },
      { id: "web-terminal", name: "Curioni Web Terminal", leverateAnalog: "SiRiX white label", status: "live", summary: "Built-in web trader — sovereign, not rented SiRiX.", to: "/admin/trading/open-trades", flowStep: "trade" },
      { id: "net-positions", name: "Desk management", leverateAnalog: "Real-time risk intelligence", status: "live", summary: "House exposure by symbol and net positions.", to: "/admin/trading/net-positions", flowStep: "trade" },
      { id: "spreads", name: "Spread & tier matrix", leverateAnalog: "Trading logic by group", status: "live", summary: "Markup by retail/VIP/IB tier.", to: "/admin/system/spread", flowStep: "trade" },
      { id: "vdd", name: "Virtual dealing desk", leverateAnalog: "Virtual dealing desk", status: "partial", summary: "Desk controls exist; full VDD UI not SiRiX-parity.", to: "/admin/trading/net-positions", flowStep: "trade" },
      { id: "ctrader", name: "cTrader / DXtrade", leverateAnalog: "Multi-platform", status: "roadmap", summary: "Additional bridges on integration roadmap.", to: "/admin/integrations", flowStep: "trade" },
      { id: "liquidity", name: "Liquidity provision", leverateAnalog: "Leverate Prime", status: "na", summary: "Curioni is CRM OS — you bring LP; we do not resell liquidity.", flowStep: "trade" },
    ],
  },
  {
    id: "prop",
    label: "Prop firms",
    tagline: "Challenge firms — gap vs LXCRM Prop",
    icon: "trophy",
    capabilities: [
      { id: "prop-crm", name: "Prop challenge CRM", leverateAnalog: "PROP CRM", status: "roadmap", summary: "Challenge plans, phase rules, payout automation.", to: "/admin/broker-os", flowStep: "operate" },
      { id: "prop-portal", name: "Trader broker portal", leverateAnalog: "Broker Portal", status: "partial", summary: "Client portal live; prop-specific branding TBD.", to: "/admin/system/common/branding", flowStep: "operate" },
      { id: "prop-payouts", name: "Challenge payout automation", leverateAnalog: "Automated prop payouts", status: "roadmap", summary: "Use cashier + balance events until prop module ships.", to: "/admin/system/balance-events", flowStep: "operate" },
    ],
  },
  {
    id: "ai",
    label: "Intelligence",
    tagline: "Wallstreet AI — sovereign, not SaaS",
    icon: "sparkles",
    capabilities: [
      { id: "wallstreet-ai", name: "Wallstreet AI desk", leverateAnalog: "AI Assistant", status: "live", summary: "Ops Q&A, call notes, file ingestion on your server.", to: "/admin/desk", flowStep: "retain" },
      { id: "knowme", name: "KNOWME visual flows", leverateAnalog: "Step-by-step guidance", status: "live", summary: "CEO walkthroughs and wiki in 15 minutes.", to: "/admin/knowme", flowStep: "operate" },
      { id: "automation-ai", name: "AI drip sequences", leverateAnalog: "Marketing automation", status: "live", summary: "LLM drafts with human approve gate.", to: "/admin/automation", flowStep: "retain" },
      { id: "airgap", name: "Air-gapped Ollama", leverateAnalog: "Cloud AI add-on", status: "live", summary: "No client PII to vendor LLM — architecture advantage.", to: "/admin/security/infrastructure", flowStep: "operate" },
    ],
  },
  {
    id: "platform",
    label: "Platform & sovereignty",
    tagline: "What Leverate cannot offer",
    icon: "server",
    capabilities: [
      { id: "self-hosted", name: "Self-hosted VPS deploy", leverateAnalog: "SaaS LXCRM", status: "live", summary: "Full stack on metal you control.", to: "/admin/security/infrastructure", flowStep: "operate" },
      { id: "brand-dna", name: "White-label Brand DNA", leverateAnalog: "Multi-brand", status: "live", summary: "CRM and public site under your brand.", to: "/admin/system/common/branding", flowStep: "operate" },
      { id: "security", name: "Security perimeter", leverateAnalog: "Compliance hosting", status: "live", summary: "IP lock, audit, threat intel — deeper than typical CRM.", to: "/admin/security", flowStep: "operate" },
      { id: "api", name: "REST API & OAuth", leverateAnalog: "Third-party integrations", status: "live", summary: "Affiliate importers and partner scopes.", to: "/admin/system/api-docs", flowStep: "operate" },
      { id: "event-logs", name: "Immutable event logs", leverateAnalog: "Audit trail", status: "live", summary: "Every CRM action logged for compliance.", to: "/admin/system/event-logs", flowStep: "operate" },
    ],
  },
];

export function allCapabilities(): BrokerCapability[] {
  return BROKER_PILLARS.flatMap((p) => p.capabilities);
}

export function readinessScore(): { pct: number; live: number; partial: number; ready: number; roadmap: number; total: number } {
  const caps = allCapabilities().filter((c) => c.status !== "na");
  const total = caps.length;
  const sum = caps.reduce((acc, c) => acc + STATUS_META[c.status].score, 0);
  const live = caps.filter((c) => c.status === "live").length;
  const partial = caps.filter((c) => c.status === "partial").length;
  const ready = caps.filter((c) => c.status === "ready").length;
  const roadmap = caps.filter((c) => c.status === "roadmap").length;
  return { pct: Math.round(sum / total), live, partial, ready, roadmap, total };
}

export function flowStepCoverage(step: NonNullable<BrokerCapability["flowStep"]>): {
  live: number;
  total: number;
} {
  const caps = allCapabilities().filter((c) => c.flowStep === step && c.status !== "na");
  const live = caps.filter((c) => c.status === "live" || c.status === "ready").length;
  return { live, total: caps.length };
}

export function gapCapabilities(): BrokerCapability[] {
  return allCapabilities().filter((c) => c.status === "roadmap" || c.status === "partial" || c.status === "ready");
}
