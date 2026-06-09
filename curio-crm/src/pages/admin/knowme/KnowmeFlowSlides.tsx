import {
  Banknote,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  GitBranch,
  Globe,
  Handshake,
  Inbox,
  ListOrdered,
  Phone,
  PhoneCall,
  Plug,
  Radar,
  Radio,
  Shield,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { KNOWME_FLOW_SLIDES, type FlowStep } from "../../../../shared/knowmeFlows";
import { curioniKnowme } from "../../../lib/curioniDesign";

const ICONS: Record<string, LucideIcon> = {
  UserPlus,
  UserCheck,
  Wallet,
  TrendingUp,
  Banknote,
  Handshake,
  Radar,
  Inbox,
  Plug,
  BarChart3,
  CreditCard,
  Globe,
  Webhook,
  CheckCircle,
  Shield,
  GitBranch,
  Users,
  ListOrdered,
  PhoneCall,
  User,
  Phone,
  Radio,
  FileText,
};

function StepIcon({ name }: { name: string }) {
  const Icon = ICONS[name] ?? User;
  return <Icon size={20} strokeWidth={1.75} />;
}

function FlowArrow({ animated, owner }: { animated?: boolean; owner?: boolean }) {
  return (
    <div className="flex shrink-0 items-center justify-center px-1 sm:px-2" aria-hidden>
      <svg
        width="28"
        height="16"
        viewBox="0 0 28 16"
        className={owner ? curioniKnowme.flowArrow : "text-emerald-400/70"}
      >
        <line x1="0" y1="8" x2="20" y2="8" stroke="currentColor" strokeWidth="1.5" />
        <polygon points="20,4 28,8 20,12" fill="currentColor" className={animated ? "animate-pulse" : ""} />
      </svg>
    </div>
  );
}

function FlowStepCard({ step, index, owner }: { step: FlowStep; index: number; owner?: boolean }) {
  const cardCls = owner
    ? `rounded-xl border bg-slate-900/80 p-3 shadow-lg shadow-black/30 ring-1 ring-curioni-accent/10 transition ${curioniKnowme.flowStepBorder}`
    : "rounded-xl border border-emerald-500/25 bg-slate-900/80 p-3 shadow-lg shadow-black/30 ring-1 ring-emerald-500/10 transition hover:border-emerald-400/50 hover:ring-emerald-400/25";
  const iconCls = owner
    ? `mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${curioniKnowme.flowStepIcon}`
    : "mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30";
  return (
    <div className={`group relative flex min-w-[140px] max-w-[160px] flex-col rounded-xl ${cardCls}`} style={{ animationDelay: `${index * 80}ms` }}>
      {step.badge ? (
        <span className="absolute -top-2 right-2 rounded-full border border-curioni-champagne/40 bg-curioni-champagne/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-curioni-champagne-light">
          {step.badge}
        </span>
      ) : null}
      <div className={iconCls}>
        <StepIcon name={step.icon} />
      </div>
      <p className="text-sm font-semibold text-white">{step.label}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{step.why}</p>
    </div>
  );
}

function FlowDiagram({ steps, owner }: { steps: FlowStep[]; owner?: boolean }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-min items-stretch justify-center gap-0 px-2 py-4">
        {steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <FlowStepCard step={step} index={i} owner={owner} />
            {i < steps.length - 1 ? <FlowArrow animated={i % 2 === 0} owner={owner} /> : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

type FlowVariant = "default" | "agent";

export function KnowmeFlowSlides({ variant = "default" }: { variant?: FlowVariant }) {
  const isAgent = variant === "agent";
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const slide = KNOWME_FLOW_SLIDES[index] ?? KNOWME_FLOW_SLIDES[0];

  useEffect(() => {
    const handler = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      const i = KNOWME_FLOW_SLIDES.findIndex((s) => s.slideNumber === n);
      if (i >= 0) setIndex(i);
    };
    window.addEventListener("knowme-goto-slide", handler);
    return () => window.removeEventListener("knowme-goto-slide", handler);
  }, []);

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(KNOWME_FLOW_SLIDES.length - 1, next)));
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) go(index + 1);
    else go(index - 1);
  };

  return (
    <div
      id="knowme-flow-slides"
      className={`overflow-hidden rounded-2xl border shadow-xl ${
        isAgent
          ? "border-emerald-500/25 bg-gradient-to-br from-[#061210] via-slate-900 to-emerald-950/40 shadow-emerald-950/25"
          : curioniKnowme.flowShell
      }`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          isAgent ? "border-emerald-500/15 bg-slate-950/60" : curioniKnowme.flowHeader
        }`}
      >
        <div>
          <p
            className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
              isAgent ? "text-emerald-400/80" : curioniKnowme.flowLabel
            }`}
          >
            Visual flow {slide.slideNumber} / {KNOWME_FLOW_SLIDES.length}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">{slide.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{slide.subtitle}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous slide"
            className={`rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:text-white disabled:opacity-30 ${
              isAgent ? "hover:border-emerald-500/40" : "hover:border-curioni-accent/40"
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === KNOWME_FLOW_SLIDES.length - 1}
            aria-label="Next slide"
            className={`rounded-lg border border-slate-700 p-2 text-slate-300 transition hover:text-white disabled:opacity-30 ${
              isAgent ? "hover:border-emerald-500/40" : "hover:border-curioni-accent/40"
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="min-h-[280px] px-2 py-2">
        <FlowDiagram steps={slide.steps} owner={!isAgent} />
      </div>

      <div
        className={`flex flex-col items-center gap-3 border-t px-4 py-4 sm:flex-row sm:justify-between ${
          isAgent ? "border-emerald-500/10 bg-slate-950/40" : curioniKnowme.flowFooter
        }`}
      >
        <div className="flex items-center gap-2" role="tablist" aria-label="Flow slides">
          {KNOWME_FLOW_SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${s.slideNumber}: ${s.title}`}
              onClick={() => go(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index
                  ? isAgent
                    ? "w-8 bg-emerald-400"
                    : curioniKnowme.flowDot
                  : "w-2.5 bg-slate-600 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
        <p className="text-center text-[11px] text-slate-500 sm:text-right">
          Need more flows?{" "}
          <span className={isAgent ? "text-emerald-400/80" : curioniKnowme.flowCta}>Ask in chat</span> — custom
          diagrams on request.
        </p>
      </div>
    </div>
  );
}

export function gotoKnowmeSlide(slideNumber: number) {
  document.getElementById("knowme-flow-slides")?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.dispatchEvent(new CustomEvent("knowme-goto-slide", { detail: slideNumber }));
}
