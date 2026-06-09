import React from "react";
import { CRM_PRODUCT_NAME, CURIONILABS_NAME, CURIONILABS_URL } from "../../lib/curioniLabs";

/** Small vendor credit — broker brand stays primary; CurioniLabs is the CRM supplier only. */
export function CurioniLabsPlatformCredit({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-[10px] text-slate-600">
        {CRM_PRODUCT_NAME} by{" "}
        <a
          href={CURIONILABS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-500 underline-offset-2 hover:text-teal-500 hover:underline"
        >
          {CURIONILABS_NAME}
        </a>
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">CRM software</p>
      <p className="mt-0.5 text-xs text-slate-400">
        <span className="font-semibold text-slate-300">{CRM_PRODUCT_NAME}</span>
        {" · supplied by "}
        <a
          href={CURIONILABS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-400 underline-offset-2 hover:text-teal-400 hover:underline"
        >
          {CURIONILABS_NAME}
        </a>
      </p>
      <p className="mt-1 text-[10px] leading-snug text-slate-600">
        Technology provider only — we do not operate your brokerage or hold your client data.
      </p>
    </div>
  );
}
