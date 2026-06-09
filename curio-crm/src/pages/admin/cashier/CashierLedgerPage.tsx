import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { client, fmtUsd, type LedgerEntryRow } from "../../../api/client";
import { DataTable, ErrorBanner, PageHeader, TableHead, fmtDate } from "../../../components/admin/CrmShell";

type Kind = "deposits" | "bonuses" | "adjustments" | "withdrawals" | "ledger";

const CONFIG: Record<Kind, { title: string; subtitle: string; load: () => Promise<{ entries: LedgerEntryRow[] }> }> = {
  deposits: { title: "Deposits", subtitle: "Admin credits and initial funding", load: () => client.adminCashierDeposits() },
  bonuses: { title: "Bonuses", subtitle: "Bonus credits", load: () => client.adminCashierBonuses() },
  adjustments: { title: "Adjustments", subtitle: "Manual balance adjustments", load: () => client.adminCashierAdjustments() },
  withdrawals: { title: "Withdrawals", subtitle: "Debits and wire payouts", load: () => client.adminCashierWithdrawals() },
  ledger: { title: "Ledger", subtitle: "Full transaction history", load: () => client.adminCashierLedger() },
};

export function CashierLedgerPage({ kind }: { kind: Kind }) {
  const cfg = CONFIG[kind];
  const [params] = useSearchParams();
  const filterUserId = params.get("userId");
  const filterUsername = params.get("username");
  const [entries, setEntries] = useState<LedgerEntryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void cfg
      .load()
      .then((r) => setEntries(r.entries))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [kind]);

  const visible = useMemo(
    () => (filterUserId ? entries.filter((e) => e.user_id === filterUserId) : entries),
    [entries, filterUserId],
  );

  return (
    <div>
      <PageHeader
        title={cfg.title}
        subtitle={
          filterUsername
            ? `${cfg.subtitle} · filtered: ${filterUsername}`
            : cfg.subtitle
        }
      />
      {filterUserId ? (
        <p className="mb-3 text-sm text-slate-500">
          Showing entries for{" "}
          <Link to={`/admin/crm/users/${filterUserId}`} className="font-medium text-teal-600 hover:underline">
            {filterUsername ?? filterUserId.slice(0, 8)}
          </Link>
          {" · "}
          <Link to={`/admin/cashier/${kind}`} className="text-teal-600 hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <ErrorBanner message={error} />
      <DataTable>
        <TableHead cols={["Date", "User", "Amount", "Reason", "Actor"]} />
        <tbody>
          {visible.map((e) => (
            <tr key={e.id} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5 text-slate-500">{fmtDate(e.created_at)}</td>
              <td className="px-4 py-2.5 font-medium">
                <Link to={`/admin/crm/users/${e.user_id}`} className="text-teal-600 hover:underline">
                  {e.username}
                </Link>
              </td>
              <td className={`px-4 py-2.5 font-mono ${e.amount_delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {fmtUsd(e.amount_delta)}
              </td>
              <td className="px-4 py-2.5 text-slate-600">{e.reason}</td>
              <td className="px-4 py-2.5 text-slate-500">{e.actorName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {visible.length === 0 ? <p className="mt-4 text-sm text-slate-400">No entries to show.</p> : null}
      {kind === "adjustments" ? (
        <p className="mt-4 text-sm text-slate-500">
          Related:{" "}
          <Link to="/admin/cashier/deposit-requests" className="font-semibold text-teal-600 hover:underline">
            Pending In
          </Link>
          {" · "}
          <Link to="/admin/cashier/deposits" className="font-semibold text-teal-600 hover:underline">
            Credits In
          </Link>
          {" · "}
          <Link to="/admin/cashier/ledger" className="font-semibold text-teal-600 hover:underline">
            Full Ledger
          </Link>
        </p>
      ) : kind === "deposits" ? (
        <p className="mt-4 text-sm text-slate-500">
          Related:{" "}
          <Link to="/admin/cashier/deposit-requests" className="font-semibold text-teal-600 hover:underline">
            Pending In
          </Link>
          {" · "}
          <Link to="/admin/crm/depositors" className="font-semibold text-teal-600 hover:underline">
            Funded Accounts
          </Link>
        </p>
      ) : null}
    </div>
  );
}
