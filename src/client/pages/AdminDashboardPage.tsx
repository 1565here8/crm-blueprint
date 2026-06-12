import React, { useEffect, useState } from "react";
import { Activity, Database, Timer } from "lucide-react";
import { fetchAdminMetrics, fetchOpsMetrics, type AdminMetrics } from "../api/apiClient";

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [ops, setOps] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchAdminMetrics({ signal: controller.signal }),
      fetchOpsMetrics({ signal: controller.signal }),
    ])
      .then(([admin, opsMetrics]) => {
        setMetrics(admin);
        setOps(opsMetrics as Record<string, unknown>);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load metrics.");
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-10">
      <div className="ambient-depth glass-panel glass-panel-lg">
        <div className="label-premium">Operations</div>
        <h1 className="heading-premium mt-3">Admin Dashboard</h1>
        <p className="body-muted mt-4 max-w-2xl">
          Real in-memory counters from this process — users, jobs, token transactions, HTTP status
          buckets. No fake node telemetry.
        </p>
      </div>

      {error ? (
        <div className="glass-panel">
          <p className="body-muted">{error}</p>
        </div>
      ) : null}

      {metrics ? (
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="ambient-depth glass-panel">
            <h2 className="label-premium">Summary</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              <div className="glass-inset">
                <div className="flex items-center gap-3">
                  <Database className="icon-muted h-4 w-4" />
                  <span className="label-premium">Users</span>
                </div>
                <div className="mt-4 text-3xl font-semibold text-white">
                  {metrics.summary.registeredUsers}
                </div>
              </div>
              <div className="glass-inset">
                <div className="flex items-center gap-3">
                  <Timer className="icon-gold h-4 w-4" />
                  <span className="label-premium">Jobs</span>
                </div>
                <div className="mt-4 text-3xl font-semibold text-white">
                  {metrics.summary.totalJobs}
                </div>
              </div>
              <div className="glass-inset">
                <div className="flex items-center gap-3">
                  <Activity className="icon-muted h-4 w-4" />
                  <span className="label-premium">Failed</span>
                </div>
                <div className="mt-4 text-3xl font-semibold text-[#C9A962]">
                  {metrics.summary.failedJobs}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {metrics.jobQueues.map((q) => (
                <div key={q.mode} className="glass-inset">
                  <div className="label-premium">{q.mode.toUpperCase()}</div>
                  <p className="body-muted mt-3 text-sm">
                    Q {q.queued} · R {q.running} · 30m {q.completed30m}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="ambient-depth glass-panel">
            <h2 className="label-premium">Live Counters</h2>
            {ops?.counters ? (
              <pre className="body-muted mt-6 overflow-auto rounded-lg bg-[#030303] p-4 text-xs">
                {JSON.stringify(ops.counters, null, 2)}
              </pre>
            ) : (
              <p className="body-muted mt-6">Loading counters…</p>
            )}

            <div className="glass-inset mt-8">
              <div className="label-premium">Recent Transactions</div>
              <div className="mt-4 max-h-64 space-y-3 overflow-auto">
                {metrics.transactionHistory.length ? (
                  metrics.transactionHistory.map((tx) => (
                    <div key={tx.id} className="rounded-lg border border-white/[0.04] px-3 py-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-400">{tx.reason}</span>
                        <span className="font-medium text-white">{tx.tokensDelta}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="body-muted">No transactions yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel h-64 animate-pulse bg-[#07070A]" />
      )}
    </div>
  );
}
