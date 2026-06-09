import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Circle,
  Headphones,
  Layers,
  LineChart,
  Megaphone,
  Server,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CurioniStatCard } from "../../../components/admin/curioni/CurioniStatCard";
import { CrmHero, CrmPageLayout } from "../../../components/admin/crm/CrmPageLayout";
import {
  BROKER_PILLARS,
  CLIENT_JOURNEY_FLOW,
  STATUS_META,
  type BrokerCapability,
  type CapabilityStatus,
  flowStepCoverage,
  gapCapabilities,
  readinessScore,
} from "../../../lib/brokerCapabilityMatrix";
import { curioni } from "../../../lib/curioniDesign";

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  target: <Target size={18} />,
  shield: <Shield size={18} />,
  megaphone: <Megaphone size={18} />,
  headset: <Headphones size={18} />,
  wallet: <Wallet size={18} />,
  chart: <LineChart size={18} />,
  trophy: <Trophy size={18} />,
  sparkles: <Sparkles size={18} />,
  server: <Server size={18} />,
};

const FILTERS: { key: CapabilityStatus | "all" | "gaps"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "partial", label: "Partial" },
  { key: "ready", label: "API-ready" },
  { key: "roadmap", label: "Roadmap" },
  { key: "gaps", label: "Close gaps" },
];

function CapabilityRow({ cap }: { cap: BrokerCapability }) {
  const meta = STATUS_META[cap.status];
  const inner = (
    <div className="group flex flex-col gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3.5 transition hover:border-violet-200 hover:shadow-md hover:ring-1 hover:ring-violet-500/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
          <p className="text-sm font-semibold text-slate-900">{cap.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${meta.chip}`}>{meta.label}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{cap.summary}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
          vs LXCRM · {cap.leverateAnalog}
        </p>
      </div>
      {cap.to ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-violet-600 opacity-80 transition group-hover:opacity-100">
          Open <ArrowRight size={14} />
        </span>
      ) : null}
    </div>
  );
  return cap.to ? (
    <Link to={cap.to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function BrokerOsPage() {
  const [filter, setFilter] = useState<CapabilityStatus | "all" | "gaps">("all");
  const [openPillar, setOpenPillar] = useState<string | null>("sales");
  const score = readinessScore();
  const gaps = gapCapabilities();

  const pillars = useMemo(() => {
    return BROKER_PILLARS.map((pillar) => ({
      ...pillar,
      capabilities: pillar.capabilities.filter((cap) => {
        if (filter === "all") return true;
        if (filter === "gaps") return cap.status === "roadmap" || cap.status === "partial" || cap.status === "ready";
        return cap.status === filter;
      }),
    })).filter((p) => p.capabilities.length > 0);
  }, [filter]);

  return (
    <CrmPageLayout wide>
      <CrmHero
        eyebrow="Systems · Broker OS"
        title="Broker OS"
        subtitle="Feature-by-feature map vs Leverate LXCRM — live, partial, and what to wire next. Your sovereign stack, audited."
        actions={
          <Link
            to="/admin/integrations"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            <Layers size={16} />
            Integration Hub
          </Link>
        }
      />

      <div className={`mb-8 overflow-hidden rounded-2xl ${curioni.gradient} p-6 text-white sm:p-8 ${curioni.heroShadow}`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className={curioni.heroBadge}>LXCRM parity audit</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {score.pct}% broker-ready
            </h2>
            <p className="mt-2 text-sm text-white/75">
              {score.live} live · {score.partial} partial · {score.ready} API-ready · {score.roadmap} on roadmap — across{" "}
              {score.total} LXCRM-class capabilities.
            </p>
            <p className="mt-3 text-xs text-white/60">
              Curioni wins on sovereignty + air-gapped AI. Gaps: VOIP, SMS, full ticketing, prop challenges, SiRiX-class platform.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:max-w-md">
            <CurioniStatCard label="Live" value={String(score.live)} tone="emerald" />
            <CurioniStatCard label="Partial" value={String(score.partial)} tone="amber" />
            <CurioniStatCard label="API-ready" value={String(score.ready)} tone="cyan" />
            <CurioniStatCard label="Roadmap" value={String(score.roadmap)} tone="violet" />
          </div>
        </div>
      </div>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600">Genius flow</p>
            <h3 className="text-lg font-semibold text-slate-900">Client journey — one thread</h3>
          </div>
          <Link to="/admin/knowme" className="text-xs font-semibold text-violet-600 hover:underline">
            Walk flows in KNOWME →
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-7">
          {CLIENT_JOURNEY_FLOW.map((step, i) => {
            const cov = flowStepCoverage(step.step!);
            const pct = cov.total ? Math.round((cov.live / cov.total) * 100) : 0;
            const strong = pct >= 75;
            return (
              <div
                key={step.step}
                className={`relative rounded-xl border px-3 py-3 ${
                  strong
                    ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white"
                    : "border-amber-200/80 bg-gradient-to-br from-amber-50/60 to-white"
                }`}
              >
                {i < CLIENT_JOURNEY_FLOW.length - 1 ? (
                  <span className="absolute -right-1 top-1/2 hidden h-px w-2 bg-slate-200 sm:block" aria-hidden />
                ) : null}
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{step.label}</p>
                <p className="mt-1 text-xs font-medium text-slate-700">{step.desc}</p>
                <p className={`mt-2 text-lg font-bold tabular-nums ${strong ? "text-emerald-700" : "text-amber-700"}`}>
                  {pct}%
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {gaps.length > 0 ? (
        <section className="mb-8 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Priority gaps</p>
              <h3 className="text-base font-semibold text-slate-900">Wire these next for LXCRM parity</h3>
            </div>
            <button
              type="button"
              onClick={() => setFilter("gaps")}
              className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white"
            >
              Show all gaps
            </button>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {gaps.slice(0, 6).map((cap) => (
              <CapabilityRow key={cap.id} cap={cap} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f.key
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-violet-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {pillars.map((pillar) => {
          const open = openPillar === pillar.id;
          const liveCount = pillar.capabilities.filter((c) => c.status === "live").length;
          return (
            <div key={pillar.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setOpenPillar(open ? null : pillar.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50/80"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  {PILLAR_ICONS[pillar.icon] ?? <BarChart3 size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{pillar.label}</p>
                  <p className="text-xs text-slate-500">{pillar.tagline}</p>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <span className="text-xs font-medium text-emerald-700">
                    {liveCount}/{pillar.capabilities.length} live
                  </span>
                  {open ? <CheckCircle2 size={18} className="text-violet-500" /> : <Circle size={18} className="text-slate-300" />}
                </div>
              </button>
              {open ? (
                <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 px-4 py-4">
                  {pillar.capabilities.map((cap) => (
                    <CapabilityRow key={cap.id} cap={cap} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          to="/admin/crm/support"
          className={`rounded-xl border border-slate-200 p-4 transition hover:shadow-md ${curioni.panelGlow}`}
        >
          <p className="text-sm font-semibold text-slate-800">Support Desk</p>
          <p className="mt-1 text-xs text-slate-500">Ticket queue — closes smart ticketing gap.</p>
        </Link>
        <Link
          to="/admin/crm/comms"
          className={`rounded-xl border border-slate-200 p-4 transition hover:shadow-md ${curioni.panelGlow}`}
        >
          <p className="text-sm font-semibold text-slate-800">Comms Center</p>
          <p className="mt-1 text-xs text-slate-500">Email live · VOIP/SMS wiring plan.</p>
        </Link>
        <Link
          to="/admin/automation"
          className={`rounded-xl border border-slate-200 p-4 transition hover:shadow-md ${curioni.panelGlow}`}
        >
          <p className="text-sm font-semibold text-slate-800">Automation Studio</p>
          <p className="mt-1 text-xs text-slate-500">Retention engine — beats generic CRM drips.</p>
        </Link>
      </div>
    </CrmPageLayout>
  );
}
