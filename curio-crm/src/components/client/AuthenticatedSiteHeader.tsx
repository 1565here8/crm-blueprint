import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, ChevronDown, Globe2 } from "lucide-react";
import { client, type UserSummary } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useCrmBranding } from "../../context/BrandingContext";
import { LegalNavDropdown } from "../public/LegalNavDropdown";

type Props = {
  homePath?: string;
};

export function AuthenticatedSiteHeader({ homePath = "/" }: Props) {
  const { user, logout } = useAuth();
  const { branding } = useCrmBranding();
  const location = useLocation();
  const [account, setAccount] = useState<UserSummary | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullName =
    [account?.firstName, account?.lastName].filter(Boolean).join(" ") || user?.username || "Client";
  const isHome = location.pathname === homePath;

  useEffect(() => {
    void client.me().then((d) => setAccount(d.user));
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const navClass = (active: boolean) =>
    `text-xs font-medium uppercase tracking-widest transition ${
      active ? "text-[#1a3a7a]" : "text-slate-400 hover:text-slate-600"
    }`;

  const statusLabel = account?.crmStatus ?? "Live";
  const statusColor =
    statusLabel.toLowerCase().includes("registered") || statusLabel.toLowerCase().includes("pending")
      ? "bg-amber-500"
      : statusLabel.toLowerCase().includes("blocked") || statusLabel.toLowerCase().includes("closed")
        ? "bg-red-500"
        : "bg-emerald-500";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to={homePath} className="flex shrink-0 items-center gap-2">
            <Globe2 className="h-8 w-8 text-blue-700" strokeWidth={1.5} />
            <span className="font-serif text-xl font-bold tracking-wide text-[#1a3a7a] sm:text-2xl">
              {branding.crmBrandName}
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-6 md:flex lg:gap-10">
            <Link to={homePath} className={navClass(isHome)}>
              Home
            </Link>
            <Link to="/about" className={navClass(location.pathname === "/about")}>
              About Us
            </Link>
            <LegalNavDropdown navClass={navClass} />
            <Link to="/contact" className={navClass(location.pathname === "/contact")}>
              Contact Us
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-[#1a3a7a]"
              >
                <span className="hidden max-w-[180px] truncate sm:inline">{fullName}</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                  <Link
                    to="/trade"
                    onClick={() => setMenuOpen(false)}
                    className="block px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                  >
                    Trading
                  </Link>
                  <Link
                    to="/profile/history"
                    onClick={() => setMenuOpen(false)}
                    className="block px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="block w-full px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                  >
                    Log Out
                  </button>
                </div>
              ) : null}
            </div>

            <span
              className={`flex h-7 min-w-[1.75rem] items-center justify-center rounded-full px-1 text-[10px] font-bold uppercase text-white ${statusColor}`}
              title={`Account status: ${statusLabel}`}
            >
              {statusLabel.slice(0, 1)}
            </span>

            <button type="button" className="text-slate-800 hover:text-[#1a3a7a]" aria-label="Notifications">
              <Bell className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
