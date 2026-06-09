import { Check, Circle, GitBranch, Hourglass, Sparkles, Zap } from "lucide-react";
import React from "react";
import { DRIP_TRIGGER_META } from "../../../lib/curioniDesign";
import type { DripCampaign } from "../../../api/client";

const KIND_ICON: Record<string, React.ReactNode> = {
  trigger: <Zap size={14} className="text-amber-500" />,
  delay: <Hourglass size={14} className="text-slate-400" />,
  condition: <Circle size={14} className="text-violet-500" />,
  action: <Sparkles size={14} className="text-cyan-600" />,
  branch: <GitBranch size={14} className="text-indigo-500" />,
};

export function SequenceCanvas({
  campaign,
  runLabel,
  activeStep = 2,
}: {
  campaign: DripCampaign;
  runLabel?: string;
  activeStep?: number;
}) {
  const meta = DRIP_TRIGGER_META[campaign.trigger_type] ?? DRIP_TRIGGER_META.custom;
  const steps = meta.steps;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-950 p-4 text-slate-100 shadow-lg shadow-violet-900/20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Automation Studio</p>
          <h3 className="text-sm font-semibold text-white">{campaign.name}</h3>
        </div>
        {runLabel ? (
          <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-200">
            {runLabel}
          </span>
        ) : null}
      </div>
      <ol className="space-y-0">
        {steps.map((step, i) => {
          const done = i < activeStep;
          const active = i === activeStep;
          const state = done ? "done" : active ? "active" : "pending";
          return (
            <li key={`${step.kind}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 ? (
                <span
                  className={`absolute left-[11px] top-6 h-[calc(100%-8px)] w-px ${
                    done ? "bg-emerald-500/60" : "bg-slate-700"
                  }`}
                />
              ) : null}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-2 ${
                  state === "done"
                    ? "bg-emerald-500/20 ring-emerald-500/50 text-emerald-400"
                    : state === "active"
                      ? "bg-violet-500/30 ring-violet-400 text-violet-200 animate-pulse"
                      : "bg-slate-800 ring-slate-600 text-slate-500"
                }`}
              >
                {state === "done" ? <Check size={12} /> : KIND_ICON[step.kind]}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{step.kind}</p>
                <p className={`text-sm ${state === "active" ? "font-medium text-white" : "text-slate-300"}`}>
                  {step.label}
                </p>
                {state === "active" && step.kind === "action" ? (
                  <p className="mt-0.5 text-xs text-cyan-300/90">AI drafting with local engine…</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[10px] text-slate-500">
        Cadence: {campaign.cadence_hours}h · {campaign.auto_send ? "Auto-send" : "Queue for approval"} ·{" "}
        {campaign.enabled ? "Live" : "Paused"}
      </p>
    </div>
  );
}
