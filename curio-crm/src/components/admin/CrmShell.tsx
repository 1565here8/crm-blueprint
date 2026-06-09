import React from "react";
import { useLocation } from "react-router-dom";
import { curioni } from "../../lib/curioniDesign";
import { findNavLabel, findPageSubtitle } from "./adminNavConfig";

/** Shared admin UI tokens — Curioni Labs operator console (Apple-grade premium) */
export const adminUi = {
  panel: "rounded-[20px] border border-slate-200/60 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02]",
  panelInset: "rounded-xl border border-slate-200/50 bg-[#F9FAFB]",
  input:
    "w-full rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-500/10",
  btnPrimary:
    "rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all duration-300 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98]",
  btnSecondary:
    "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm",
  btnGreen:
    "rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-emerald-500 hover:shadow-md",
  tableHead:
    "border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent text-[10px] font-bold uppercase tracking-widest text-slate-500",
  tableRow: "border-b border-slate-100/60 transition-all duration-200 hover:bg-gradient-to-r hover:from-violet-50/40 hover:to-transparent",
  muted: "text-slate-400",
  accent: "text-violet-600",
};

export const inputCls = adminUi.input;
export const btnPrimary = adminUi.btnPrimary;
export const btnSecondary = adminUi.btnSecondary;
export const btnGreen = adminUi.btnGreen;

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-base leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Resolves title + subtitle from the current admin route. Override either when needed. */
export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { pathname } = useLocation();
  return (
    <PageHeader
      title={title ?? findNavLabel(pathname)}
      subtitle={subtitle ?? findPageSubtitle(pathname)}
      actions={actions}
    />
  );
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${adminUi.panel} ${className}`}>{children}</div>;
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm ring-1 ring-black/[0.02]">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function TableHead({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className={adminUi.tableHead}>
        {cols.map((c) => (
          <th key={c} className="px-4 py-3 font-semibold whitespace-nowrap">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200/60 bg-gradient-to-r from-rose-50/80 via-rose-50/40 to-transparent px-5 py-4 text-sm text-rose-700 shadow-sm shadow-rose-100/30">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-100">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-600">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </div>
      <p className="font-medium">{message}</p>
    </div>
  );
}

export function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 to-white px-4 py-3 shadow-sm ring-1 ring-black/[0.02]">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtCrmRegistration(iso: string) {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const y = d.getFullYear();
  const m = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y} ${m} ${day} ${hh}:${mm}`;
}

export function fmtCrmRange(from: string | null, to: string | null) {
  if (!from || !to) return "—";
  const f = new Date(from);
  const t = new Date(to);
  const fmt = (d: Date) =>
    `${d.getFullYear()} ${d.toLocaleString("en", { month: "short" })} ${String(d.getDate()).padStart(2, "0")}`;
  return `${fmt(f)} → ${fmt(t)}`;
}
