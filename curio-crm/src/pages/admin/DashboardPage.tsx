/**
 * Dashboard Page — Apple-grade Mission Control
 * 
 * Design principles:
 * - Maximum whitespace, minimum visual noise
 * - Glass morphism panels with ambient gradients
 * - Micro-interactions on every hover/focus state
 * - Typography hierarchy with tight tracking for headings
 * - Data visualization that's instantly scannable
 */

import { LayoutGrid, Monitor, Plug, Network, Workflow, ArrowUpRight, TrendingUp, Users, DollarSign, Activity, Zap } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { curioni } from "../../lib/curioniDesign";
import { client, fmtUsd, type DashboardStats } from "../../api/client";
import { ErrorBanner, Panel, adminUi } from "../../components/admin/CrmShell";
import { CrmHero, CrmPageLayout } from "../../components/admin/crm/CrmPageLayout";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "Week" },
  { key: "this_month", label: "Month" },
  { key: "last_month", label: "Last Mo" },
  { key: "7d", label: "7d" },
  { key: "14d", label: "14d" },
  { key: "30d", label: "30d" },
  { key: "60d", label: "60d" },
];

const CARD_LINKS: Record<string, string> = {
  registrations: "/admin/crm/users",
  deposits: "/admin/cashier/deposits",
  bonuses: "/admin/cashier/bonuses",
  withdrawals: "/admin/cashier/withdrawals",
  adjustments: "/admin/cashier/adjustments",
};

// Premium icon mapping for summary cards
const CARD_ICONS: Record<string, React.ReactNode> = {
  registrations: <Users size={20} className="text-teal-600" />,
  deposits: <DollarSign size={20} className="text-emerald-600" />,
  bonuses: <Zap size={20} className="text-amber-600" />,
  withdrawals: <TrendingUp size={20} className="text-rose-600" />,
  adjustments: <Activity size={20} className="text-violet-600" />,
};

export function DashboardPage() {
  const [period, setPeriod] = useState("today");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    return client
      .adminDashboard(period)
      .then((s) => {
        setStats(s);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        setStats(null);
        setError(e instanceof Error ? e.message : "Dashboard load failed.");
        setLoading(false);
      });
  }, [period]);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void client.adminDashboard(period).then(setStats).catch(() => null);
    }, 15000);
    return () => clearInterval(id);
  }, [period]);

  return (
    <CrmPageLayout wide>
      <CrmHero
        eyebrow="Pulse · Mission Control"
        title="Mission Control"
        subtitle="Registrations, treasury, and desk activity — live for the period you select."
      />
      <ErrorBanner message={error} />

      {/* Quick Access Bar — Glass Morphism */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { to: "/admin/broker-os", label: "Broker OS", icon: <LayoutGrid size={18} />, gradient: "from-indigo-500/10 via-violet-500/5 to-transparent", hoverGradient: "hover:from-indigo-500/20 hover:via-violet-500/10 hover:to-transparent", ringColor: "ring-indigo-500/20" },
          { to: "/admin/automation", label: "Automation Studio", icon: <Workflow size={18} />, gradient: "from-violet-500/10 via-purple-500/5 to-transparent", hoverGradient: "hover:from-violet-500/20 hover:via-purple-500/10 hover:to-transparent", ringColor: "ring-violet-500/20" },
          { to: "/admin/integrations/metatrader", label: "MT4 / MT5 Bridge", icon: <Monitor size={18} />, gradient: "from-emerald-500/10 via-teal-500/5 to-transparent", hoverGradient: "hover:from-emerald-500/20 hover:via-teal-500/10 hover:to-transparent", ringColor: "ring-emerald-500/20" },
          { to: "/admin/integrations", label: "Integration Hub", icon: <Plug size={18} />, gradient: "from-cyan-500/10 via-blue-500/5 to-transparent", hoverGradient: "hover:from-cyan-500/20 hover:via-blue-500/10 hover:to-transparent", ringColor: "ring-cyan-500/20" },
          { to: "/admin/marketing/partners-hq", label: "Partners HQ", icon: <Network size={18} />, gradient: "from-amber-500/10 via-orange-500/5 to-transparent", hoverGradient: "hover:from-amber-500/20 hover:via-orange-500/10 hover:to-transparent", ringColor: "ring-amber-500/20" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white px-5 py-4 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5 ${item.ringColor} ring-1`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} ${item.hoverGradient} transition-all duration-300`} />
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm shadow-sm transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>
              <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors duration-300">{item.label}</span>
              <ArrowUpRight size={14} className="ml-auto opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-slate-400" />
            </div>
          </Link>
        ))}
      </div>

      {/* Period Selector — Refined Pills */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={`relative overflow-hidden rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
              period === p.key
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105"
                : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
        {stats ? (
          <span className="ml-auto flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {stats.period.label}
          </span>
        ) : null}
      </div>

      {/* Dashboard Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-violet-600" />
            <p className="text-sm text-slate-400">Loading dashboard…</p>
          </div>
        </div>
      ) : stats?.cards && stats.playerData && stats.moneyIn && stats.trading && stats.moneyOut ? (
        <>
          {/* Summary Cards — Premium Glass Morphism */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Registrations", value: String(stats.cards.registrations ?? 0), tone: "teal", to: CARD_LINKS.registrations, icon: CARD_ICONS.registrations },
              { label: "Deposits", value: fmtUsd(stats.cards.deposits), tone: "emerald", to: CARD_LINKS.deposits, icon: CARD_ICONS.deposits },
              { label: "Bonuses", value: fmtUsd(stats.cards.bonuses), tone: "amber", to: CARD_LINKS.bonuses, icon: CARD_ICONS.bonuses },
              { label: "Withdrawals", value: fmtUsd(stats.cards.withdrawals), tone: "rose", to: CARD_LINKS.withdrawals, icon: CARD_ICONS.withdrawals },
              { label: "Adjustments", value: fmtUsd(stats.cards.adjustments), tone: "violet", to: CARD_LINKS.adjustments, icon: CARD_ICONS.adjustments },
            ].map((card) => (
              <SummaryCardPremium key={card.label} {...card} />
            ))}
          </div>

          {/* Metric Panels — Refined Grid */}
          <div className="mb-6 grid gap-4 lg:grid-cols-4">
            <MetricPanelPremium title="Player Data" icon={<Users size={16} className="text-indigo-600" />}>
              <MetricRowPremium label="Active Users" value={String(stats.playerData.activeUsers)} />
              <MetricRowPremium label="Inactive Users" value={String(stats.playerData.inactiveUsers)} />
              <MetricRowPremium label="Avg Player Value" value={fmtUsd(stats.playerData.avgPlayerValue)} />
              <MetricRowPremium label="Conversion Rate" value={`${stats.playerData.conversionRate}%`} accent />
              <MetricRowPremium label="Redeposit Rate" value={`${stats.playerData.redepositRate}%`} accent />
            </MetricPanelPremium>
            <MetricPanelPremium title="Money In" icon={<DollarSign size={16} className="text-emerald-600" />}>
              <MetricRowPremium label="Net Deposits" value={fmtUsd(stats.moneyIn.netDeposits)} accent />
              <MetricRowPremium label="FTDs" value={String(stats.moneyIn.ftds)} />
              <MetricRowPremium label="Avg FTD" value={fmtUsd(stats.moneyIn.avgFtd)} />
              <MetricRowPremium label="Avg Retention" value={fmtUsd(stats.moneyIn.avgRetentionDeposit)} />
              <MetricRowPremium label="Failed Deposits" value={String(stats.moneyIn.failedDeposits)} warning />
            </MetricPanelPremium>
            <MetricPanelPremium title="Trading" icon={<Activity size={16} className="text-violet-600" />}>
              <MetricRowPremium label="Trades" value={String(stats.trading.trades)} />
              <MetricRowPremium label="Total Volume" value={fmtUsd(stats.trading.totalVolume)} accent />
              <MetricRowPremium label="Total P&L" value={fmtUsd(stats.trading.totalPnl)} accent />
              <MetricRowPremium label="Open P&L" value={fmtUsd(stats.trading.totalOpenPnl)} />
              <MetricRowPremium label="Closed P&L" value={fmtUsd(stats.trading.totalClosedPnl)} accent />
              <MetricRowPremium label="Forex Comm." value={fmtUsd(stats.trading.forexCommission)} />
              <MetricRowPremium label="Crypto Comm." value={fmtUsd(stats.trading.cryptoCommission)} />
              <MetricRowPremium label="Total Commission" value={fmtUsd(stats.trading.totalCommission)} accent />
            </MetricPanelPremium>
            <MetricPanelPremium title="Money Out" icon={<TrendingUp size={16} className="text-rose-600" />}>
              <MetricRowPremium label="Approved Withdrawals" value={fmtUsd(stats.moneyOut.approvedWithdrawals)} accent />
              <MetricRowPremium label="Pending Withdrawals" value={fmtUsd(stats.moneyOut.pendingWithdrawals)} warning />
            </MetricPanelPremium>
          </div>

          {/* Insight Panels — Glass Morphism */}
          <div className="grid gap-4 lg:grid-cols-2">
            <InsightPanelPremium
              title="Deposits snapshot"
              subtitle="Live totals for selected period"
              rows={[
                { label: "Net deposits", value: fmtUsd(stats.moneyIn.netDeposits), to: "/admin/cashier/deposits" },
                { label: "Failed deposits", value: String(stats.moneyIn.failedDeposits), to: "/admin/cashier/deposit-requests" },
                { label: "Card total", value: fmtUsd(stats.cards.deposits), to: "/admin/cashier/deposits" },
              ]}
              accentColor="emerald"
            />
            <InsightPanelPremium
              title="Trading snapshot"
              subtitle="Volume and house revenue"
              rows={[
                { label: "Trades", value: String(stats.trading.trades), to: "/admin/trading/trades" },
                { label: "Total volume", value: fmtUsd(stats.trading.totalVolume), to: "/admin/trading/open-trades" },
                { label: "Total commission", value: fmtUsd(stats.trading.totalCommission), to: "/admin/system/forex-commissions" },
              ]}
              accentColor="violet"
            />
            <InsightPanelPremium
              title="First-time depositors"
              subtitle="FTD counts and averages"
              rows={[
                { label: "FTD count", value: String(stats.moneyIn.ftds), to: "/admin/crm/depositors" },
                { label: "Avg FTD", value: fmtUsd(stats.moneyIn.avgFtd), to: "/admin/crm/depositors" },
                { label: "Avg retention deposit", value: fmtUsd(stats.moneyIn.avgRetentionDeposit), to: "/admin/cashier/deposits" },
              ]}
              accentColor="indigo"
            />
            <InsightPanelPremium
              title="Desk health"
              subtitle="People and conversion"
              rows={[
                { label: "Active users", value: String(stats.playerData.activeUsers), to: "/admin/crm/users" },
                { label: "Conversion rate", value: `${stats.playerData.conversionRate}%`, to: "/admin/crm/sales-report" },
                { label: "Pending withdrawals", value: fmtUsd(stats.moneyOut.pendingWithdrawals), to: "/admin/cashier/withdrawals" },
              ]}
              accentColor="teal"
            />
          </div>
        </>
      ) : error ? (
        <Panel className="p-6 text-center">
          <p className="text-sm text-slate-600">{error}</p>
          <button type="button" onClick={() => void load()} className={`mt-3 ${adminUi.btnPrimary}`}>
            Retry
          </button>
        </Panel>
      ) : null}
    </CrmPageLayout>
  );
}

/** Premium Summary Card with glass morphism and ambient gradients */
function SummaryCardPremium({
  label,
  value,
  tone,
  to,
  icon,
}: {
  label: string;
  value: string;
  tone: "teal" | "emerald" | "amber" | "rose" | "violet";
  to: string;
  icon: React.ReactNode;
}) {
  const tones = {
    teal: { bg: "from-teal-500/8 via-teal-500/3 to-transparent", ring: "ring-teal-500/15", text: "text-teal-700", iconBg: "bg-teal-50" },
    emerald: { bg: "from-emerald-500/8 via-emerald-500/3 to-transparent", ring: "ring-emerald-500/15", text: "text-emerald-700", iconBg: "bg-emerald-50" },
    amber: { bg: "from-amber-500/8 via-amber-500/3 to-transparent", ring: "ring-amber-500/15", text: "text-amber-700", iconBg: "bg-amber-50" },
    rose: { bg: "from-rose-500/8 via-rose-500/3 to-transparent", ring: "ring-rose-500/15", text: "text-rose-700", iconBg: "bg-rose-50" },
    violet: { bg: "from-violet-500/8 via-violet-500/3 to-transparent", ring: "ring-violet-500/15", text: "text-violet-700", iconBg: "bg-violet-50" },
  };
  const t = tones[tone];
  
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${t.ring} ring-1`}
    >
      {/* Ambient gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${t.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative">
        {/* Icon with glass effect */}
        <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${t.iconBg} backdrop-blur-sm shadow-sm transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        
        {/* Label */}
        <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors duration-300 group-hover:text-slate-500">
          {label}
        </p>
        
        {/* Value with large typography */}
        <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-slate-800">
          {value}
        </p>
        
        {/* Arrow indicator */}
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-slate-400 opacity-0 translate-x-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <span>Open module</span>
          <ArrowUpRight size={12} className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/** Premium Metric Panel with refined header */
function MetricPanelPremium({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:shadow-lg`}>
      {/* Header */}
      <div className="border-b border-slate-100/80 bg-gradient-to-r from-slate-50/80 to-transparent px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {icon && <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">{icon}</div>}
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{title}</h3>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-5 py-2">
        {children}
      </div>
    </div>
  );
}

/** Premium Metric Row with accent support */
function MetricRowPremium({ label, value, accent, warning }: { label: string; value: string; accent?: boolean; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2.5 text-sm last:border-0 group">
      <span className="text-slate-500 group-hover:text-slate-600 transition-colors">{label}</span>
      <span className={`font-semibold tabular-nums tracking-tight ${
        warning ? "text-rose-600" : accent ? "text-violet-700" : "text-slate-800"
      }`}>
        {value}
      </span>
    </div>
  );
}

/** Premium Insight Panel with glass morphism */
function InsightPanelPremium({
  title,
  subtitle,
  rows,
  accentColor,
}: {
  title: string;
  subtitle: string;
  rows: { label: string; value: string; to: string }[];
  accentColor: "emerald" | "violet" | "indigo" | "teal";
}) {
  const accents = {
    emerald: "from-emerald-500/10 via-transparent to-transparent",
    violet: "from-violet-500/10 via-transparent to-transparent",
    indigo: "from-indigo-500/10 via-transparent to-transparent",
    teal: "from-teal-500/10 via-transparent to-transparent",
  };
  
  const accentBorders = {
    emerald: "border-emerald-200/50",
    violet: "border-violet-200/50",
    indigo: "border-indigo-200/50",
    teal: "border-teal-200/50",
  };

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:shadow-lg`}>
      {/* Ambient gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accents[accentColor]} opacity-50`} />
      
      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4">
          <h4 className="text-base font-semibold tracking-tight text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        
        {/* Data rows */}
        <div className={`divide-y divide-slate-100/80 rounded-xl border ${accentBorders[accentColor]} bg-gradient-to-br from-slate-50/50 to-transparent p-3`}>
          {rows.map((row) => (
            <Link
              key={row.label}
              to={row.to}
              className="group/row flex items-center justify-between gap-4 px-2 py-2.5 rounded-lg transition-all duration-200 hover:bg-white hover:shadow-sm"
            >
              <span className="text-sm text-slate-500 group-hover/row:text-slate-700 transition-colors">{row.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold tabular-nums text-slate-800 group-hover/row:text-violet-700 transition-colors">{row.value}</span>
                <ArrowUpRight size={12} className="opacity-0 -translate-x-1 group-hover/row:opacity-100 group-hover/row:translate-x-0 transition-all text-slate-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
