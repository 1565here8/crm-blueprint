import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { client, fmtUsd, type DepositRequestRow } from "../../../api/client";
import { btnPrimary, DataTable, ErrorBanner, AdminPageHeader, TableHead, fmtDate } from "../../../components/admin/CrmShell";

export function DepositRequestsPage() {
  const [params] = useSearchParams();
  const filterUserId = params.get("userId");
  const filterUsername = params.get("username");
  const [requests, setRequests] = useState<DepositRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(
    () => (filterUserId ? requests.filter((r) => r.user_id === filterUserId) : requests),
    [requests, filterUserId],
  );

  async function load() {
    try {
      const data = await client.adminDepositRequests();
      setRequests(data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function process(id: string, status: "approved" | "rejected") {
    try {
      await client.adminProcessDeposit(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Process failed");
    }
  }

  return (
    <div className="p-4">
      <AdminPageHeader />
      {filterUserId ? (
        <p className="mb-3 text-sm text-slate-500">
          Filtered:{" "}
          <Link to={`/admin/crm/users/${filterUserId}`} className="font-medium text-teal-600 hover:underline">
            {filterUsername ?? filterUserId.slice(0, 8)}
          </Link>
          {" · "}
          <Link to="/admin/cashier/deposit-requests" className="text-teal-600 hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}
      <ErrorBanner message={error} />
      <DataTable>
        <TableHead cols={["Date", "User", "Amount", "Method", "Reference", "Status", "Actions"]} />
        <tbody>
          {visible.map((r) => (
            <tr key={r.id} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5">{fmtDate(r.created_at)}</td>
              <td className="px-4 py-2.5">
                <Link to={`/admin/crm/users/${r.user_id}`} className="text-teal-600 hover:underline">
                  {r.username ?? r.user_id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-4 py-2.5 font-mono">{fmtUsd(r.amount)}</td>
              <td className="px-4 py-2.5">{r.method}</td>
              <td className="max-w-[140px] truncate px-4 py-2.5 text-slate-600">{r.reference ?? "—"}</td>
              <td className="px-4 py-2.5 capitalize">{r.status}</td>
              <td className="px-4 py-2.5">
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button type="button" className={btnPrimary} onClick={() => void process(r.id, "approved")}>
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded bg-[#d9534f] px-3 py-1.5 text-xs text-white"
                      onClick={() => void process(r.id, "rejected")}
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <p className="mt-4 text-sm text-slate-500">
        Related:{" "}
        <Link to="/admin/cashier/deposits" className="font-semibold text-teal-600 hover:underline">
          Credits In
        </Link>
        {" · "}
        <Link to="/admin/cashier/adjustments" className="font-semibold text-teal-600 hover:underline">
          Balance Fixes
        </Link>
        {" · "}
        <Link to="/admin/cashier/ledger" className="font-semibold text-teal-600 hover:underline">
          Full Ledger
        </Link>
        {" · "}
        <Link to="/admin/crm/depositors" className="font-semibold text-teal-600 hover:underline">
          Funded Accounts
        </Link>
      </p>
    </div>
  );
}
