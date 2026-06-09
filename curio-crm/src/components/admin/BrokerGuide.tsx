import { BookOpen, Lightbulb } from "lucide-react";
import React from "react";

/** Short broker-facing explainer — read once, skip repeat questions. */
export function BrokerGuide({
  title,
  children,
  variant = "info",
}: {
  title: string;
  children: React.ReactNode;
  variant?: "info" | "tip";
}) {
  const isTip = variant === "tip";
  return (
    <div
      className={`mb-5 rounded-xl border p-4 ${
        isTip
          ? "border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/40"
          : "border-teal-200/70 bg-gradient-to-br from-teal-50/90 to-emerald-50/50"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            isTip ? "bg-amber-100 text-amber-700" : "bg-teal-100 text-teal-700"
          }`}
        >
          {isTip ? <Lightbulb size={18} /> : <BookOpen size={18} />}
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${isTip ? "text-amber-900" : "text-teal-900"}`}>{title}</p>
          <div className={`mt-1.5 text-sm leading-relaxed ${isTip ? "text-amber-900/80" : "text-slate-600"}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export type ActionGuideItem = {
  label: string;
  help: string;
};

/** Explains every action button on the page footer — one paragraph each. */
export function ActionGuideBar({ actions }: { actions: ActionGuideItem[] }) {
  if (actions.length === 0) return null;
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Button guide</p>
      <ul className="mt-3 space-y-3">
        {actions.map((a) => (
          <li key={a.label} className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
            <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-teal-800 ring-1 ring-teal-200">
              {a.label}
            </span>
            <span className="text-slate-600">{a.help}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FieldHint({ label, help }: { label: string; help: string }) {
  return (
    <p className="mt-1 text-xs leading-relaxed text-slate-500">
      <span className="font-medium text-slate-600">{label}:</span> {help}
    </p>
  );
}
