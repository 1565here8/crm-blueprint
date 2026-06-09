import React, { useEffect, useState } from "react";
import { client, type OnlineStats, type OnlineVisitor } from "../../../api/client";
import { DataTable, ErrorBanner, PageHeader, Panel, TableHead } from "../../../components/admin/CrmShell";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Panel className="p-4 text-center">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-light text-slate-800">{value}</p>
    </Panel>
  );
}

export function OnlineVisitorsPage() {
  const [stats, setStats] = useState<OnlineStats | null>(null);
  const [visitors, setVisitors] = useState<OnlineVisitor[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await client.adminOnline();
      setStats(data.stats);
      setVisitors(data.visitors);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, []);

  const desktopPct =
    stats && stats.total > 0 ? ((stats.desktop / stats.total) * 100).toFixed(1) : "0.0";
  const mobilePct =
    stats && stats.total > 0 ? ((stats.mobile / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <PageHeader
        title="Online Visitors"
        subtitle="Live sessions — who is logged in, their IP, and current activity"
      />
      <ErrorBanner message={error} />

      <Panel className="mb-4 p-4">
        <p className="text-sm font-medium text-[#555]">Traffic distribution by world map</p>
        <p className="text-xs text-slate-400">WallStreet Sim traffic analysis</p>
        <div className="mt-3 flex h-48 items-center justify-center rounded bg-[#f0f2f5] text-sm text-slate-400">
          {stats?.byCountry.length
            ? stats.byCountry.map((c) => `${c.country}: ${c.count}`).join(" · ")
            : "No active visitors"}
        </div>
      </Panel>

      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total visitors" value={stats?.total ?? 0} />
        <StatCard label="Anonymous" value={stats?.anonymous ?? 0} />
        <StatCard label="Authenticated" value={stats?.authenticated ?? 0} />
        <Panel className="p-4 sm:col-span-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Desktop vs Mobile</p>
          <div className="mt-2 flex h-16 items-end gap-2">
            <div className="flex-1 rounded-t bg-teal-600" style={{ height: `${desktopPct}%`, minHeight: 4 }} />
            <div className="flex-1 rounded-t bg-[#ccc]" style={{ height: `${mobilePct}%`, minHeight: 4 }} />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Desktop {desktopPct}% · Mobile {mobilePct}%
          </p>
        </Panel>
        <StatCard label="Organic" value={stats?.organic ?? 0} />
        <StatCard label="Campaigns" value={stats?.campaigns ?? 0} />
      </div>

      <DataTable>
        <TableHead cols={["Visitor", "IP", "Page", "Activity", "Country", "Campaign", "Referrer", "Device"]} />
        <tbody>
          {visitors.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                No visitors online right now
              </td>
            </tr>
          ) : (
            visitors.map((v) => (
              <tr key={v.sessionId} className="border-b border-[#f0f0f0] hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  {v.authenticated ? (
                    <span className="font-medium text-teal-600">
                      {v.username}
                      {v.role ? ` (${v.role})` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-400">Anonymous</span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{v.ip}</td>
                <td className="px-4 py-2.5 text-[#555]">{v.currentPage}</td>
                <td className="px-4 py-2.5 text-slate-600">{v.activity}</td>
                <td className="px-4 py-2.5">{v.country}</td>
                <td className="px-4 py-2.5 text-slate-500">{v.campaign ?? "—"}</td>
                <td className="max-w-[120px] truncate px-4 py-2.5 text-xs text-slate-500">
                  {v.referrer || "—"}
                </td>
                <td className="px-4 py-2.5 capitalize text-slate-600">{v.device}</td>
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
