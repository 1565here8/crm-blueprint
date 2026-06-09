import React, { useEffect, useState } from "react";
import { client, type DeskPspHealthReport, fmtUsd } from "../../../api/client";

function badge(h: "ok" | "watch" | "bad") {
  const map = {
    ok: "bg-emerald-600 text-white",
    watch: "bg-amber-500 text-black",
    bad: "bg-rose-600 text-white",
  } as const;
  return <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${map[h]}`}>{h}</span>;
}

export default function PspHealthPage() {
  const [report, setReport] = useState<DeskPspHealthReport | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [collections, setCollections] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const r = await client.deskPspHealth();
      setReport(r.report);
      setWarning(r.warning ?? null);
    } catch (e) {
      setWarning(e instanceof Error ? e.message : "Failed to load PSP report");
    } finally {
      setBusy(false);
    }
  }

  async function runCollections() {
    setCollections(null);
    setBusy(true);
    try {
      const r = await client.deskCollectionsBrief();
      setCollections(r.reply);
    } catch (e) {
      setCollections(e instanceof Error ? e.message : "Collections brief failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">PSP Health</h1>
          <p className="text-sm text-slate-400">Payment gateway performance and stuck deposits.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void runCollections()}
            disabled={busy}
            className="rounded-md border border-emerald-600 bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/20 disabled:opacity-50"
          >
            AI Collections Brief
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {warning && <div className="mb-3 rounded-md bg-amber-900/30 px-3 py-2 text-xs text-amber-200">{warning}</div>}

      {report && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { l: "Methods", v: report.totals.methods },
              { l: "Pending #", v: report.totals.pendingTotal },
              { l: "Pending $", v: fmtUsd(report.totals.pendingAmount) },
              { l: "Success rate", v: `${report.totals.overallSuccessRate.toFixed(1)}%` },
              { l: "7d volume", v: fmtUsd(report.totals.last7dVolume) },
              { l: "30d volume", v: fmtUsd(report.totals.last30dVolume) },
            ].map((c) => (
              <div key={c.l} className="rounded-md border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{c.l}</p>
                <p className="mt-1 text-lg font-semibold text-white">{c.v}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Health</th>
                  <th className="px-3 py-2">Success</th>
                  <th className="px-3 py-2">Pending</th>
                  <th className="px-3 py-2">Avg settle</th>
                  <th className="px-3 py-2">30d vol</th>
                  <th className="px-3 py-2">Reasons</th>
                </tr>
              </thead>
              <tbody className="bg-slate-950/60">
                {report.methods.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      No PSP data yet.
                    </td>
                  </tr>
                )}
                {report.methods.map((m) => (
                  <tr key={m.method} className="border-b border-slate-800/60">
                    <td className="px-3 py-2 font-medium text-white">{m.method}</td>
                    <td className="px-3 py-2">{badge(m.health)}</td>
                    <td className="px-3 py-2 text-slate-200">{m.successRate.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-slate-200">
                      {m.pending} · {fmtUsd(m.pendingAmount)}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {m.avgSettleHours === null ? "—" : `${m.avgSettleHours.toFixed(1)}h`}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{fmtUsd(m.last30dVolume)}</td>
                    <td className="px-3 py-2 text-amber-300">{m.reasons.join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-4 overflow-hidden rounded-lg border border-slate-800">
            <div className="bg-slate-900/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              Stuck deposits ({report.stuckDeposits.length})
            </div>
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Age</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.stuckDeposits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-500">
                      No stuck deposits. Clean book.
                    </td>
                  </tr>
                )}
                {report.stuckDeposits.map((d) => (
                  <tr key={d.id} className="border-b border-slate-800/60">
                    <td className="px-3 py-2 text-slate-100">{d.username || d.userId.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-slate-300">{d.method}</td>
                    <td className="px-3 py-2 text-slate-100">{fmtUsd(d.amount)}</td>
                    <td className="px-3 py-2 text-amber-300">{d.ageHours.toFixed(0)}h</td>
                    <td className="px-3 py-2 text-slate-400">{d.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {collections && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-emerald-400">AI Collections Brief</p>
          <pre className="whitespace-pre-wrap text-sm text-emerald-100">{collections}</pre>
        </div>
      )}
    </div>
  );
}
