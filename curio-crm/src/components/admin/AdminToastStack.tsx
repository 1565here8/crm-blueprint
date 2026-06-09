import { AlertCircle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  removeAdminToast,
  subscribeAdminToasts,
  type AdminToastItem,
  type AdminToastType,
} from "../../lib/adminToastBus";

const styles: Record<AdminToastType, string> = {
  loading: "border-teal-200 bg-white text-slate-800 shadow-teal-100/50",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-100/50",
  error: "border-rose-200 bg-rose-50 text-rose-900 shadow-rose-100/50",
  info: "border-slate-200 bg-white text-slate-800 shadow-slate-200/50",
};

function Icon({ type }: { type: AdminToastType }) {
  if (type === "loading") return <Loader2 size={18} className="shrink-0 animate-spin text-teal-600" />;
  if (type === "success") return <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />;
  if (type === "error") return <AlertCircle size={18} className="shrink-0 text-rose-600" />;
  return <Info size={18} className="shrink-0 text-teal-600" />;
}

function ToastCard({ item }: { item: AdminToastItem }) {
  return (
    <div
      role="status"
      className={`flex min-w-[280px] max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-right-4 fade-in duration-200 ${styles[item.type]}`}
    >
      <Icon type={item.type} />
      <p className="flex-1 whitespace-pre-line text-sm font-medium leading-snug">{item.message}</p>
      {item.type !== "loading" ? (
        <button
          type="button"
          onClick={() => removeAdminToast(item.id)}
          className="shrink-0 rounded p-0.5 opacity-50 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

/** Fixed toast stack — mounted once in AdminLayout. */
export function AdminToastStack() {
  const [toasts, setToasts] = useState<AdminToastItem[]>([]);

  useEffect(() => subscribeAdminToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-20 right-4 z-[70] flex flex-col gap-2"
      aria-live="polite"
      aria-label="System notifications"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard item={t} />
        </div>
      ))}
    </div>
  );
}
