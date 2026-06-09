import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { LEGAL_LINKS, type LegalPageSlug } from "../../content/legalContent";

type Props = {
  navClass: (active: boolean) => string;
  dark?: boolean;
};

export function LegalNavDropdown({ navClass, dark }: Props) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const isLegalActive = location.pathname.startsWith("/legal/");

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button type="button" className={`flex items-center gap-1 ${navClass(isLegalActive)}`}>
        Legal
        <ChevronDown size={14} />
      </button>
      {open ? (
        <div
          className={`absolute left-0 top-full z-50 min-w-[200px] rounded border py-2 shadow-lg ${
            dark
              ? "border-white/10 bg-[#0a0a0f] shadow-black/40"
              : "border-slate-100 bg-white"
          }`}
        >
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.slug}
              to={`/legal/${link.slug}`}
              className={`block px-4 py-2 text-xs uppercase tracking-wide ${
                dark ? "hover:bg-white/5" : "hover:bg-slate-50"
              } ${
                location.pathname === `/legal/${link.slug}`
                  ? dark
                    ? "font-semibold text-teal-400"
                    : "font-semibold text-[#1a3a7a]"
                  : dark
                    ? "text-white/60"
                    : "text-slate-500"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function isLegalPath(pathname: string): pathname is `/legal/${LegalPageSlug}` {
  return LEGAL_LINKS.some((l) => pathname === `/legal/${l.slug}`);
}
