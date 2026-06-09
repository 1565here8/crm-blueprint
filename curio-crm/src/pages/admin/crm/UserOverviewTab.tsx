import {
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  Mail,
  Shield,
  StickyNote,
  TrendingUp,
  Wallet,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  client,
  fmtMoney,
  type CrmUser,
  type LedgerEntryRow,
} from "../../../api/client";
import { CurioniStatCard } from "../../../components/admin/curioni/CurioniStatCard";
import { fmtDate, Panel } from "../../../components/admin/CrmShell";
import { countryLabel } from "../../../lib/crmCountries";
import { curioni } from "../../../lib/curioniDesign";

function ComplianceChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${ok ? curioni.chipOk : curioni.chipWarn}`}>
      {label}
    </span>
  );
}

function activityLabel(reason: string, amount: number): string {
  const r = reason.toLowerCase();
  if (r.includes("deposit")) return amount >= 0 ? "Deposit received" : "Deposit reversal";
  if (r.includes("withdraw")) return "Withdrawal";
  if (r.includes("bonus")) return "Bonus applied";
  if (r.includes("kyc") || r.includes("doc")) return "KYC / documents";
  if (r.includes("trade") || r.includes("position")) return "Trading activity";
  return reason;
}

export function UserOverviewTab({
  user,
  onNote,
  onEmail,
  onPitch,
}: {
  user: CrmUser;
  onNote: () => void;
  onEmail: () => void;
  onPitch: () => void;
}) {
  const [openCount, setOpenCount] = useState(0);
  const [activity, setActivity] = useState<LedgerEntryRow[]>([]);
  const cur = user.currency || "USD";
  const lifetimePnl = user.totalClosedPnl + user.totalOpenPnl;
  const netWorth = user.cashBalance + user.totalOpenPnl;

  const load = useCallback(async () => {
    const [pos, ledger] = await Promise.all([
      client.adminPositions("open", user.id),
      client.adminCashierLedger(),
    ]);
    setOpenCount(pos.positions.length);
    setActivity(
      ledger.entries
        .filter((e) => e.user_id === user.id)
        .slice(0, 8),
    );
  }, [user.id]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 12000);
    return () => clearInterval(id);
  }, [load]);

  const kycOk = !user.extDocsRequired && user.crmStatus.toLowerCase() !== "kyc pending";
  const initials = `${(user.firstName?.[0] ?? user.username[0] ?? "?").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}`;

  return (
    <div className="space-y-4">
      <div className={`overflow-hidden rounded-2xl border border-slate-200/80 ${curioni.gradientSoft} ${curioni.panelGlow}`}>
        <div className="flex flex-wrap items-start gap-4 p-5">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white ${curioni.gradient}`}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{user.fullName || user.username}</h2>
              {user.online ? (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Online
                </span>
              ) : null}
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {user.crmStatus || "—"}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {user.email} · ID {user.displayId} · {countryLabel(user.countryCode) || "—"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ComplianceChip ok={kycOk} label={kycOk ? "Identity OK" : "KYC pending"} />
              <ComplianceChip ok={!user.extDocsRequired} label={user.extDocsRequired ? "AML review" : "AML clear"} />
              <span className={curioni.chipMuted + " rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"}>
                Risk: {user.tradingStatus?.toLowerCase().includes("block") ? "Elevated" : "Low"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onPitch} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500">
              <BrainCircuit size={14} /> AI pitch
            </button>
            <button type="button" onClick={onEmail} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Mail size={14} /> Email
            </button>
            <button type="button" onClick={onNote} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <StickyNote size={14} /> Note
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CurioniStatCard
          label="Total deposits"
          value={fmtMoney(cur, user.totalDeposits)}
          icon={ArrowDownRight}
          tone="emerald"
        />
        <CurioniStatCard
          label="Withdrawals"
          value={fmtMoney(cur, user.approvedWithdrawals)}
          icon={ArrowUpRight}
          tone="rose"
        />
        <CurioniStatCard
          label="Lifetime P&L"
          value={fmtMoney(cur, lifetimePnl)}
          delta={lifetimePnl >= 0 ? "↑ profitable" : "↓ underwater"}
          icon={TrendingUp}
          tone="cyan"
        />
        <CurioniStatCard
          label="Equity"
          value={fmtMoney(cur, netWorth)}
          delta={`${openCount} open positions`}
          icon={Wallet}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3 overflow-hidden p-0">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-800">Trading accounts</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2">Platform</th>
                <th className="px-4 py-2">Currency</th>
                <th className="px-4 py-2">Balance</th>
                <th className="px-4 py-2">Equity</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-50 hover:bg-violet-50/30">
                <td className="px-4 py-2.5 font-mono text-xs">CL-{user.displayId}</td>
                <td className="px-4 py-2.5">Curioni Web</td>
                <td className="px-4 py-2.5">{cur}</td>
                <td className="px-4 py-2.5 font-medium">{fmtMoney(cur, user.cashBalance)}</td>
                <td className="px-4 py-2.5 font-medium text-emerald-700">{fmtMoney(cur, netWorth)}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    Live
                  </span>
                </td>
              </tr>
              <tr className="border-b border-slate-50 hover:bg-emerald-50/30">
                <td className="px-4 py-2.5 font-mono text-xs">MT4-{user.displayId}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">MT4</span>
                </td>
                <td className="px-4 py-2.5">{cur}</td>
                <td className="px-4 py-2.5 font-medium">{fmtMoney(cur, user.cashBalance)}</td>
                <td className="px-4 py-2.5 font-medium text-emerald-700">{fmtMoney(cur, netWorth)}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-cyan-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Bridged</span>
                </td>
              </tr>
              <tr className="border-b border-slate-50 hover:bg-blue-50/30">
                <td className="px-4 py-2.5 font-mono text-xs">MT5-{user.displayId}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-800">MT5</span>
                </td>
                <td className="px-4 py-2.5">{cur}</td>
                <td className="px-4 py-2.5 font-medium">{fmtMoney(cur, user.cashBalance)}</td>
                <td className="px-4 py-2.5 font-medium text-emerald-700">{fmtMoney(cur, netWorth)}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-cyan-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Bridged</span>
                </td>
              </tr>
              {user.credits > 0 ? (
                <tr className="border-b border-slate-50 text-slate-500">
                  <td className="px-4 py-2.5 font-mono text-xs">CR-{user.displayId}</td>
                  <td className="px-4 py-2.5">Credits</td>
                  <td className="px-4 py-2.5">{cur}</td>
                  <td className="px-4 py-2.5">{fmtMoney(cur, user.credits)}</td>
                  <td className="px-4 py-2.5">—</td>
                  <td className="px-4 py-2.5 text-xs">Bonus wallet</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-slate-400">
            Configure MT4/MT5 sync from{" "}
            <Link to="/admin/integrations/metatrader" className="font-semibold text-violet-600 hover:underline">
              MetaTrader Bridge
            </Link>
          </p>
        </Panel>

        <Panel className="lg:col-span-2 p-0">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <h3 className="text-sm font-semibold text-slate-800">Recent activity</h3>
            <Link to={`/admin/crm/users/${user.id}`} className="text-[10px] font-semibold text-violet-600" onClick={(e) => e.preventDefault()}>
              Live
            </Link>
          </div>
          <ul className="max-h-64 divide-y divide-slate-50 overflow-y-auto">
            {activity.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-400">No ledger events yet.</li>
            ) : (
              activity.map((e) => (
                <li key={e.id} className="px-4 py-2.5 text-xs">
                  <p className="font-medium text-slate-800">{activityLabel(e.reason, e.amount_delta)}</p>
                  <p className="text-slate-500">
                    <span className={e.amount_delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      {fmtMoney(cur, e.amount_delta)}
                    </span>
                    {" · "}
                    {fmtDate(e.created_at)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Shield size={16} className="text-violet-500" />
            Assignment
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Agent</dt>
              <dd>{user.agentName || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Desk</dt>
              <dd>{user.desk || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Partner</dt>
              <dd>{user.partner || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Created</dt>
              <dd>{fmtDate(user.createdAt)}</dd>
            </div>
          </dl>
        </Panel>
        <Panel className="p-4 md:col-span-2">
          <p className="text-sm font-semibold text-slate-800">AI desk insight</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Player value {fmtMoney(cur, user.computedPlayerValue)} · conversion {user.computedConversionRate} · volume{" "}
            {fmtMoney(cur, user.totalVolume)}. Use <strong>Generate Pitch</strong> for a call script, or open{" "}
            <Link to="/admin/automation" className="font-semibold text-violet-600 hover:underline">
              Automation Studio
            </Link>{" "}
            to enroll this client in a sequence.
          </p>
        </Panel>
      </div>
    </div>
  );
}
