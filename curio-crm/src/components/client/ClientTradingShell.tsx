import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Globe2, Mail, Moon, Sun } from "lucide-react";
import { fmtMoney, type UserSummary } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useCrmBranding } from "../../context/BrandingContext";
import { DepositModal } from "./DepositModal";

type Props = {
  account: UserSummary | null;
  chartTheme: "light" | "dark";
  onToggleChartTheme: () => void;
};

function useGmtClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC",
        }) + " GMT",
      );
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function ClientTradingShell({ account, chartTheme, onToggleChartTheme }: Props) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { branding } = useCrmBranding();
  const [profileOpen, setProfileOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const gmtTime = useGmtClock();

  const currency = account?.currency ?? "USD";
  const balance = account?.cashBalance ?? 0;
  const pnl = account?.unrealizedPnl ?? 0;
  const equity = account?.equity ?? balance;
  const usedMargin = account?.portfolioValue ?? 0;
  const availableMargin = Math.max(0, equity - usedMargin);
  const marginRatio = equity > 0 ? (usedMargin / equity) * 100 : 0;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function openMyAccount() {
    setProfileOpen(false);
    navigate("/profile/history");
  }

  function openDeposit() {
    setProfileOpen(false);
    setDepositOpen(true);
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
          <Link to="/" className="flex items-center gap-2">
            <Globe2 className="h-7 w-7 text-[#1a3a7a]" strokeWidth={1.5} />
            <span className="font-serif text-xl font-bold tracking-wide text-[#1a3a7a]">
              {branding.crmBrandName}
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:gap-6">
            <div className="text-xs sm:text-sm">
              <span className="font-semibold uppercase tracking-wide text-[#1a3a7a]">Balance : </span>
              <span className="font-bold text-[#1a3a7a]">{fmtBalance(currency, balance)}</span>
            </div>
            <div className="hidden text-sm text-slate-600 md:block">{gmtTime}</div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:text-[#1a3a7a]"
              >
                My Profile
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-500 transition ${profileOpen ? "rotate-180" : ""}`}
                />
              </button>
              {profileOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-sm bg-[#1a3a7a] py-1 shadow-xl">
                  <button
                    type="button"
                    onClick={openMyAccount}
                    className="block w-full px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#152f66]"
                  >
                    My Account
                  </button>
                  <button
                    type="button"
                    onClick={openDeposit}
                    className="block w-full px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#152f66]"
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="block w-full px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#152f66]"
                  >
                    Log Out
                  </button>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="relative rounded p-1 text-slate-500 hover:text-[#1a3a7a]"
              aria-label="Messages"
            >
              <Mail className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#5eb8e8]" />
            </button>

            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="rounded-sm bg-[#5eb8e8] px-6 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#4aa8da]"
            >
              Deposit
            </button>

            <button
              type="button"
              onClick={onToggleChartTheme}
              className="rounded border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
              aria-label="Toggle chart theme"
            >
              {chartTheme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-0 gap-y-1 border-t border-slate-200 bg-[#eef1f4] px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 lg:px-6">
          <Stat label="PNL" value={fmtMoney(currency, pnl)} tone={pnl >= 0 ? "up" : "down"} divider />
          <Stat label="Cash Balance" value={fmtMoney(currency, balance)} divider />
          <Stat label="Equity Margin Ratio" value={`${marginRatio.toFixed(2)}%`} divider />
          <Stat label="Equity" value={fmtMoney(currency, equity)} divider />
          <Stat label="Used Margin" value={fmtMoney(currency, usedMargin)} divider />
          <Stat label="Available Margin" value={fmtMoney(currency, availableMargin)} />
        </div>
      </header>

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </>
  );
}

function fmtBalance(currency: string, n: number) {
  return `${currency} ${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Stat({
  label,
  value,
  tone,
  divider,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  divider?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 px-4 py-0.5 first:pl-0">
        <span className="text-slate-500">{label}:</span>
        <span
          className={
            tone === "up"
              ? "text-emerald-600"
              : tone === "down"
                ? "text-red-600"
                : "text-slate-800"
          }
        >
          {value}
        </span>
      </div>
      {divider ? <span className="hidden h-4 w-px bg-slate-300 sm:block" aria-hidden /> : null}
    </>
  );
}
