import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function ImpersonationBanner() {
  const { user, impersonating, impersonatorUsername, stopImpersonate } = useAuth();
  const navigate = useNavigate();

  if (!impersonating || !user) return null;

  const clientName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;

  async function exitClientView() {
    await stopImpersonate();
    navigate("/admin/crm/users");
  }

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <p>
          Viewing client portal as <strong>{clientName}</strong>
          {impersonatorUsername ? (
            <span className="text-amber-800"> (admin: {impersonatorUsername})</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => void exitClientView()}
          className="rounded bg-[#1a3a7a] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-[#152f66]"
        >
          Exit client view
        </button>
      </div>
    </div>
  );
}
