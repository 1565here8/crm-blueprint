import React from "react";
import { PublicBrandLogo } from "../components/brand/PublicBrandLogo";
import {
  PUBLIC_REBRAND_HEADLINE,
  PUBLIC_REBRAND_TITLE,
  publicRebrandParagraphs,
} from "../../shared/publicSiteOffline";

export function PublicRebrandPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c1017] px-6 py-16 text-center text-slate-300">
      <span className="mb-6 rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-300">
        Public site offline
      </span>
      <PublicBrandLogo size="md" theme="dark" className="mb-8" />
      <h1 className="text-2xl font-bold text-white">{PUBLIC_REBRAND_TITLE}</h1>
      <p className="mt-2 text-lg font-medium text-teal-400">{PUBLIC_REBRAND_HEADLINE}</p>
      <div className="mt-8 max-w-md space-y-4 text-sm leading-relaxed text-slate-400">
        {publicRebrandParagraphs().map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}
