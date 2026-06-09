import React from "react";
import { Info } from "lucide-react";
import { BROKER_FOOTER_LEGAL, DEMO_BADGE, DEMO_SHORT } from "../../../shared/demoCopy";
import { isPublicDemoSkin } from "../../lib/publicBrand";

type Variant = "ribbon" | "hero" | "compact";

type Props = {
  variant?: Variant;
  className?: string;
};

/** Loud demo ribbon/hero — Curioni public www. Xtoropro uses footer micro-copy. */
export function DemoDisclaimerBanner({ variant = "ribbon", className = "" }: Props) {
  const demoSkin = isPublicDemoSkin();

  if (!demoSkin) {
    if (variant === "compact") {
      return (
        <p className={`text-[10px] leading-snug text-white/40 ${className}`}>{BROKER_FOOTER_LEGAL}</p>
      );
    }
    return null;
  }

  if (variant === "compact") {
    return (
      <p className={`text-[11px] leading-snug text-white/45 ${className}`}>
        <span className="font-semibold text-broker-green">{DEMO_BADGE}</span>
        {" — "}
        {DEMO_SHORT}
      </p>
    );
  }

  if (variant === "hero") {
    return (
      <div
        className={`inline-flex max-w-xl flex-col gap-2 rounded-xl border border-broker-green/30 bg-broker-green/10 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 ${className}`}
      >
        <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-broker-green/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-broker-green">
          <Info className="h-3 w-3" aria-hidden />
          {DEMO_BADGE}
        </span>
        <p className="text-sm leading-relaxed text-white/70">{DEMO_SHORT}</p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`border-b border-broker-green/25 bg-gradient-to-r from-broker-dark via-black/90 to-broker-dark ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-xs text-white/70 sm:px-6 lg:px-8">
        <span className="font-bold uppercase tracking-[0.18em] text-broker-green">{DEMO_BADGE}</span>
        <span className="hidden text-white/25 sm:inline" aria-hidden>
          ·
        </span>
        <span>{DEMO_SHORT}</span>
      </div>
    </div>
  );
}
