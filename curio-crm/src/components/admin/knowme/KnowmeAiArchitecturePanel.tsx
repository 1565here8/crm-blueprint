import { Cpu, Shield, Users, Zap } from "lucide-react";

import {
  KNOWME_AI_TIERS,
  KNOWME_OLLAMA_VS_VLLM,
  type KnowmeAiTier,
} from "../../../../shared/knowmeAiArchitecture";
import { curioni, curioniKnowme } from "../../../lib/curioniDesign";

function TierCard({ tier, highlight }: { tier: KnowmeAiTier; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? curioniKnowme.architectureHighlight
          : `${curioni.panel} border-curioni-line`
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{tier.label}</h3>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {tier.latency}
        </span>
      </div>
      <p className="mb-2 text-[11px] text-slate-500">{tier.audience}</p>
      <p className="mb-3 text-xs text-slate-700">
        <span className="font-semibold text-slate-800">Engine:</span> {tier.engine}
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-600">Hardware:</span> {tier.hardware}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Can do</p>
          <ul className="space-y-1 text-[11px] leading-snug text-slate-600">
            {tier.canDo.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-emerald-500">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">Cannot do</p>
          <ul className="space-y-1 text-[11px] leading-snug text-slate-600">
            {tier.cannotDo.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-amber-500">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Admin-only architecture explainer — demo tier vs agent preemptive Q&A. */
export function KnowmeAiArchitecturePanel() {
  const management = KNOWME_AI_TIERS.find((t) => t.id === "management")!;
  const agent = KNOWME_AI_TIERS.find((t) => t.id === "agent")!;
  const enterprise = KNOWME_AI_TIERS.find((t) => t.id === "enterprise")!;

  return (
    <section className={`mb-6 p-5 ${curioniKnowme.architectureSection}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-curioni-accent/10 text-curioni-accent">
          <Cpu size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">AI tiers — what KNOWME can and cannot do</h2>
          <p className="text-[11px] text-slate-600">
            Admin demo = management tier. Floor agents = preemptive Q&A only (no live LLM).
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-curioni-champagne/30 bg-curioni-surface px-2.5 py-1 text-[10px] font-semibold text-curioni-ink">
          <Shield size={11} /> Compliance-safe split
        </span>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-lg border border-curioni-accent/25 bg-indigo-50/70 px-3 py-2 text-[11px] text-curioni-ink">
          <Users size={14} className="shrink-0 text-curioni-accent" />
          <span>
            <strong>10</strong> management — live Ollama / vLLM when you need drafts
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
          <Zap size={14} className="shrink-0 text-amber-500" />
          <span>
            <strong>90</strong> agents — instant preemptive answers (&lt;100 ms)
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          <Cpu size={14} className="shrink-0" />
          <span>Optional: 4×4090 + vLLM for 100 live users</span>
        </div>
      </div>

      <p className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">
        <strong>Ollama alone</strong> — {KNOWME_OLLAMA_VS_VLLM.problem}{" "}
        <strong>Budget path:</strong> {KNOWME_OLLAMA_VS_VLLM.hybridDefault}
      </p>

      <div className="space-y-3">
        <TierCard tier={management} highlight />
        <TierCard tier={agent} />
        <details className="group rounded-xl border border-slate-200 bg-slate-50/50">
          <summary className="cursor-pointer px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900">
            Enterprise scale-up ({enterprise.label}) — expand
          </summary>
          <div className="border-t border-slate-200 p-3">
            <TierCard tier={enterprise} />
          </div>
        </details>
      </div>
    </section>
  );
}
