import React from "react";
import { getPublicBrand } from "../../lib/publicBrand";
import { CurioniLabsLogo } from "./CurioniLabsLogo";

type Props = {
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
  showDotCom?: boolean;
  className?: string;
};

const SIZES = {
  sm: { word: "text-lg", tag: "text-[10px]", dot: "text-[9px]" },
  md: { word: "text-4xl sm:text-5xl", tag: "text-sm sm:text-base", dot: "text-xs" },
  lg: { word: "text-5xl sm:text-6xl", tag: "text-lg sm:text-xl", dot: "text-sm" },
};

/** Host-aware public lockup — Curioni Labs or Xtoropro only. */
export function PublicBrandLogo({ size = "md", theme = "dark", showDotCom = false, className = "" }: Props) {
  const { name, domain, tagline } = getPublicBrand();
  const s = SIZES[size];
  const accent = theme === "dark" ? "#84c561" : "#1a4d2e";
  const tagColor = theme === "dark" ? "text-white/70" : "text-slate-600";
  const dotColor = theme === "dark" ? "text-white/40" : "text-slate-400";

  if (name === "Curioni Labs") {
    const h = size === "sm" ? 32 : size === "lg" ? 52 : 44;
    return <CurioniLabsLogo variant="full" theme={theme} height={h} className={className} />;
  }

  return (
    <div className={`inline-flex flex-col leading-none ${className}`}>
      <span className={`font-bold tracking-tight ${s.word}`} style={{ color: accent }}>
        {name}
      </span>
      <span className={`mt-1 font-semibold uppercase tracking-[0.22em] ${tagColor} ${s.tag}`}>{tagline}</span>
      {showDotCom ? (
        <span className={`mt-1 font-medium lowercase tracking-wide ${dotColor} ${s.dot}`}>{domain}</span>
      ) : null}
    </div>
  );
}
