import React from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { curioni } from "../../../lib/curioniDesign";

export function CurioniStatCard({
  label,
  value,
  delta,
  icon: Icon,
  to,
  tone = "violet",
}: {
  label: string;
  value: string;
  delta?: string;
  icon?: LucideIcon;
  to?: string;
  tone?: "violet" | "emerald" | "cyan" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    violet: "from-indigo-500/10 to-curioni-indigo/5 text-curioni-accent",
    emerald: "from-emerald-500/10 to-teal-500/5 text-emerald-700",
    cyan: "from-cyan-500/10 to-sky-500/5 text-cyan-800",
    amber: "from-amber-500/10 to-orange-500/5 text-amber-800",
    rose: "from-rose-500/10 to-pink-500/5 text-rose-700",
  };
  const inner = (
    <div
      className={`rounded-xl border border-curioni-line bg-gradient-to-br p-4 ${tones[tone]} ${curioni.panelGlow} transition hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
        {Icon ? <Icon size={16} className="opacity-50" /> : null}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {delta ? <p className="mt-1 text-xs font-medium opacity-80">{delta}</p> : null}
    </div>
  );
  return to ? (
    <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
      {inner}
    </Link>
  ) : (
    inner
  );
}
