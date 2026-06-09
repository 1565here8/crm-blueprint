import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client, fmtUsd, type WireRequestRow } from "../../../api/client";
import { btnPrimary, DataTable, ErrorBanner, PageHeader, TableHead, fmtDate } from "../../../components/admin/CrmShell";

export function WireReqPage() {
  const [requests, setRequests] = useState<WireRequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await client.adminWireRequests();
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
      await client.adminProcessWire(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Process failed");
    }
  }

  return (
    <div className="p-4">
      <PageHeader title="Wire Requests" subtitle="Client wire withdrawal requests" />
      <ErrorBanner message={error} />
      <DataTable>
        <TableHead cols={["Date", "User", "Amount", "Bank details", "Status", "Actions"]} />
        <tbody>
          {requests.map((r) => (
            <tr key={r.id} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5">{fmtDate(r.created_at)}</td>
              <td className="px-4 py-2.5">
                <Link to={`/admin/crm/users/${r.user_id}`} className="text-teal-600 hover:underline">
                  {r.username ?? r.user_id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-4 py-2.5 font-mono">{fmtUsd(r.amount)}</td>
              <td className="max-w-xs truncate px-4 py-2.5 text-slate-600">{r.bank_details}</td>
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
    </div>
  );
}
