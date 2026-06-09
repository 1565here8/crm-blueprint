import { CheckCircle2, Cpu, Server, Users } from "lucide-react";
import React, { useState } from "react";
import {
  BROKER_DEPLOY_RULES,
  BROKER_DEPLOY_TIERS,
  BROKER_RAM_MATRIX,
} from "../../../../shared/brokerDeployTiers";
import { curioni } from "../../../lib/curioniDesign";

export function KnowmeBrokerDeployPanel() {
  const [expandedId, setExpandedId] = useState<string>("desk_pro");

  return (
    <div className="space-y-5">
      <div className={`overflow-hidden ${curioni.panelLuxury}`}>
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-violet-50 to-indigo-50/80 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Broker packs</p>
          <h2 className="mt-1 text-lg font-bold text-curioni-ink">How brokers install CRM + Ollama</h2>
          <p className="mt-2 max-w-2xl text-sm text-curioni-muted">
            Sell <strong className="text-curioni-ink">Desk Pro</strong> by default: cloud CRM + one local AI brain.
            Agents use the browser only — no per-seat hardware.
          </p>
          <p className="mt-3 rounded-lg border border-violet-200/80 bg-white/80 px-3 py-2 text-sm font-medium text-violet-950">
            Pitch: We host your CRM in the cloud; you run AI once on the manager PC (16 GB+). Agents just open
            Chrome.
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {BROKER_DEPLOY_TIERS.map((tier) => {
            const open = expandedId === tier.id;
            const recommended = tier.id === "desk_pro";
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setExpandedId(open ? "" : tier.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  open
                    ? "border-violet-400 bg-violet-50/60 ring-2 ring-violet-200"
                    : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50/80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-curioni-ink">{tier.name}</p>
                    <p className="text-xs text-curioni-muted">{tier.tagline}</p>
                  </div>
                  {recommended ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      Default
                    </span>
                  ) : null}
                </div>
                {open ? (
                  <dl className="mt-3 space-y-2 text-xs text-curioni-muted">
                    <div>
                      <dt className="font-semibold text-curioni-ink">CRM</dt>
                      <dd>{tier.crmHost}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-curioni-ink">Ollama</dt>
                      <dd>{tier.ollamaHost}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-curioni-ink">Agents</dt>
                      <dd>{tier.agentNeeds}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-curioni-ink">RAM</dt>
                      <dd>{tier.ramNote}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-curioni-ink">Best for</dt>
                      <dd>{tier.bestFor}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-curioni-ink">Pitch</dt>
                      <dd className="italic text-violet-900/90">{tier.pitchLine}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 line-clamp-2 text-xs text-curioni-muted">{tier.bestFor}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`p-5 ${curioni.panelLuxury}`}>
          <div className="mb-3 flex items-center gap-2">
            <Cpu size={18} className="text-violet-600" />
            <p className="text-sm font-bold text-curioni-ink">RAM vs models</p>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-curioni-muted">
                <th className="pb-2 pr-2 font-semibold">RAM</th>
                <th className="pb-2 pr-2 font-semibold">Models</th>
                <th className="pb-2 font-semibold">Use</th>
              </tr>
            </thead>
            <tbody>
              {BROKER_RAM_MATRIX.map((row) => (
                <tr key={row.ram} className="border-b border-slate-100 text-curioni-muted">
                  <td className="py-2 pr-2 font-mono font-semibold text-curioni-ink">{row.ram}</td>
                  <td className="py-2 pr-2">{row.models}</td>
                  <td className="py-2">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`p-5 ${curioni.panelLuxury}`}>
          <div className="mb-3 flex items-center gap-2">
            <Server size={18} className="text-violet-600" />
            <p className="text-sm font-bold text-curioni-ink">Operator rules</p>
          </div>
          <ul className="space-y-2 text-sm text-curioni-muted">
            {BROKER_DEPLOY_RULES.map((rule) => (
              <li key={rule} className="flex gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={`p-5 ${curioni.panelLuxury}`}>
        <div className="mb-3 flex items-center gap-2">
          <Users size={18} className="text-violet-600" />
          <p className="text-sm font-bold text-curioni-ink">15-minute broker proof script</p>
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-curioni-muted">
          <li>This tab — walk Desk Pro vs Floor Enterprise.</li>
          <li>Visual Flows slide 1 — golden path.</li>
          <li>Mission Control → Pending In live.</li>
          <li>Wallstreet AI morning routine (Ollama on manager PC).</li>
        </ol>
        <p className="mt-3 text-xs text-curioni-muted">
          Printable copy: <code className="rounded bg-slate-100 px-1">BROKER-DEPLOY-TIERS.md</code> in the CurioCRM
          repo.
        </p>
      </div>
    </div>
  );
}
