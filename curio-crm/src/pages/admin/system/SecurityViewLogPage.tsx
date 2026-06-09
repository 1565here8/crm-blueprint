import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { client, type SecurityViewLogRow } from "../../../api/client";
import { btnPrimary, ErrorBanner, inputCls, Panel } from "../../../components/admin/CrmShell";
import { PageBottomGuide } from "../../../components/admin/PageBottomGuide";

function todayDateInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function SecurityViewLogPage() {
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState(todayDateInput());
  const [to, setTo] = useState(todayDateInput());
  const [rows, setRows] = useState<SecurityViewLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminSecurityViewLogs({ userId: userId.trim() || undefined, from, to });
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load view log.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [userId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">View Log</h2>
      <ErrorBanner message={error} />

      <Panel className="mb-4 flex flex-wrap items-end gap-3 p-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Enter user id</span>
          <input
            className={inputCls}
            placeholder="agent username or id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">From</span>
          <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">To</span>
          <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className={`${btnPrimary} inline-flex items-center gap-2`} onClick={() => void load()}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-sky-700 text-[11px] font-bold uppercase tracking-wide text-white">
            <tr>
              <th className="px-4 py-2.5">id</th>
              <th className="px-4 py-2.5">agentId</th>
              <th className="px-4 py-2.5">counter</th>
              <th className="px-4 py-2.5">action</th>
              <th className="px-4 py-2.5">ip</th>
              <th className="px-4 py-2.5">dateCreated</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No rows for this filter. Try a wider date range or clear the user id field.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-2 text-slate-600">{r.id}</td>
                  <td className="px-4 py-2 font-medium text-slate-800">{r.agentId}</td>
                  <td className="px-4 py-2 text-slate-600">{r.counter}</td>
                  <td className="px-4 py-2 text-slate-700">{r.action}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{r.ip ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500">{r.dateCreated}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Panel>

      {total > rows.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Showing {rows.length} of {total} rows — narrow the date range to load faster.
        </p>
      ) : null}

      <PageBottomGuide
        intro="Every time a staff member logs in or opens a sensitive screen, a row appears here — like a security camera for the CRM."
        blocks={[
          {
            title: "Enter user id",
            what: "The agent or admin username (or internal id) you want to investigate.",
            how: "Type it and click Search. Leave blank to see everyone in the date range.",
            when: "Compliance asks who accessed a client account.",
          },
          {
            title: "Date range",
            what: "Only show actions between From and To (inclusive).",
            how: "Pick both dates, then Search. Default is today.",
            when: "You need proof of activity on a specific day.",
          },
          {
            title: "counter column",
            what: "How many actions that agent has logged since the system started counting.",
            how: "Higher number = more recent activity for that person. It goes up by one per logged action.",
            when: "Spotting unusual volume from one login.",
          },
          {
            title: "action column",
            what: "What they did — login, opened a list, etc.",
            how: "Read left to right: who (agentId), which click (action), from where (ip), when (dateCreated).",
            when: "Explaining an audit trail to a manager.",
          },
        ]}
      />
    </div>
  );
}
