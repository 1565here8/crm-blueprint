import { FileText, Lock, LogIn, Mail, UserPen } from "lucide-react";
import React from "react";

type Props = {
  extDocsRequired: boolean;
  editing: boolean;
  saving: boolean;
  onExtRequired: () => void;
  onNote: () => void;
  onEmail: () => void;
  onEdit: () => void;
  onResetPassword: () => void;
  onLoginAsClient?: () => void;
  onSave?: () => void;
  onCancelEdit?: () => void;
};

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-1.5 rounded px-2 py-3 text-[11px] font-medium transition-colors ${
        active
          ? "bg-white/20 text-white"
          : "text-white/90 hover:bg-white/10"
      }`}
    >
      <Icon size={22} className="opacity-90" />
      <span>{label}</span>
    </button>
  );
}

/** Fixed "Choose Action" bubble — always visible on user profile pages. */
export function UserActionPanel({
  extDocsRequired,
  editing,
  saving,
  onExtRequired,
  onNote,
  onEmail,
  onEdit,
  onResetPassword,
  onLoginAsClient,
  onSave,
  onCancelEdit,
}: Props) {
  return (
    <aside className="sticky top-4 z-20 w-[88px] shrink-0 self-start">
      <div className="overflow-hidden rounded-md bg-[#1a3d6e] shadow-lg">
        <p className="bg-[#153258] px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wider text-white/80">
          Choose Action
        </p>

        <div className="p-1.5">
          <button
            type="button"
            onClick={onExtRequired}
            className={`mb-1 w-full rounded px-1 py-2 text-[10px] font-semibold leading-tight transition-colors ${
              extDocsRequired
                ? "bg-[#5bc0de] text-white"
                : "bg-teal-600 text-white hover:bg-teal-500"
            }`}
          >
            Ext. Required
          </button>

          <ActionBtn icon={FileText} label="Note" onClick={onNote} />
          <ActionBtn icon={Mail} label="Email" onClick={onEmail} />
          <ActionBtn icon={UserPen} label="Edit" onClick={onEdit} active={editing} />
          <ActionBtn icon={Lock} label="Reset password" onClick={onResetPassword} />
          {onLoginAsClient ? (
            <ActionBtn icon={LogIn} label="Client portal" onClick={onLoginAsClient} />
          ) : null}
        </div>

        {editing ? (
          <div className="space-y-1 border-t border-white/10 p-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="w-full rounded bg-emerald-600 py-2 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onCancelEdit}
              className="w-full rounded bg-white/10 py-2 text-[10px] font-medium text-white/80 hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
