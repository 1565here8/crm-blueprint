import React from "react";
import { Link } from "react-router-dom";
import { adminUi } from "../CrmShell";

/** Apple-style CRM page shell — centered, intentional rhythm, no dead full-bleed tables. */
export function CrmPageLayout({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  /** All Clients + wide tables */
  wide?: boolean;
}) {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-violet-50/30">
      <div
        className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${wide ? "max-w-[88rem]" : "max-w-6xl"}`}
      >
        {children}
      </div>
    </div>
  );
}

export function CrmHero({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-2 text-[15px] leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CrmStatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function CrmStatCard({
  label,
  value,
  hint,
  accent = "violet",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "violet" | "emerald" | "amber" | "slate";
}) {
  const ring =
    accent === "emerald"
      ? "from-emerald-500/10 to-white ring-emerald-500/15"
      : accent === "amber"
        ? "from-amber-500/10 to-white ring-amber-500/15"
        : accent === "slate"
          ? "from-slate-200/40 to-white ring-slate-200"
          : "from-violet-500/10 to-white ring-violet-500/20";
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br p-5 shadow-sm ring-1 ${ring}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1.5 text-xs leading-snug text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function CrmSection({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${adminUi.panel} overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function CrmAgentRow({
  name,
  clientCount,
  totalClients,
}: {
  name: string;
  clientCount: number;
  totalClients: number;
}) {
  const pct = totalClients > 0 ? Math.round((clientCount / totalClients) * 100) : 0;
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-violet-200 hover:bg-violet-50/40">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-sm font-bold text-white shadow-sm">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{name}</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {clientCount.toLocaleString()} clients · {pct}% of book
        </p>
      </div>
      <Link
        to={`/admin/crm/users?agent=${encodeURIComponent(name)}`}
        className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
      >
        Open book
      </Link>
    </div>
  );
}

export function CrmStepCard({ steps }: { steps: { n: number; text: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.n} className="flex gap-3 text-sm text-slate-700">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
            {s.n}
          </span>
          <span className="pt-0.5 leading-relaxed">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function CrmCompactTable({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto -mx-1">{children}</div>;
}

export function CrmEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
