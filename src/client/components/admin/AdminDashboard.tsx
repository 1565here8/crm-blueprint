import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";

type DashboardMetrics = {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  creditsSpent: number;
  pendingSubmissions: number;
  bannedUsers: number;
  scannerRuns: number;
  spellsAdded: number;
  recentActivity: Array<{
    id: string;
    type: "user" | "payment" | "spell" | "ban" | "scan";
    message: string;
    timestamp: string;
  }>;
};

function MetricCard(props: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down";
  color?: string;
}) {
  return (
    <div className="glass-inset flex items-start justify-between">
      <div>
        <p className="label-premium">{props.label}</p>
        <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">{props.value}</p>
        {props.trend && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {props.trend === "up" ? (
              <ArrowUpRight className="h-3 w-3 text-[color:var(--success)]" />
            ) : (
              <ArrowDownRight className="h-3 w-3 text-[color:var(--danger)]" />
            )}
            <span className={props.trend === "up" ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}>
              {props.trend === "up" ? "Trending up" : "Trending down"}
            </span>
          </div>
        )}
      </div>
      <div className="rounded-xl bg-[color:var(--accent-soft)] p-2.5 text-[color:var(--accent-text)]">
        {props.icon}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics", { credentials: "include" });
      if (res.ok) {
        setMetrics(await res.json());
      } else {
        setMetrics(getMockMetrics());
      }
    } catch {
      setMetrics(getMockMetrics());
    } finally {
      setLoading(false);
    }
  }

  function getMockMetrics(): DashboardMetrics {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      creditsSpent: 0,
      pendingSubmissions: 0,
      bannedUsers: 0,
      scannerRuns: 0,
      spellsAdded: 0,
      recentActivity: [],
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="heading-display">Overview</h2>
        <button onClick={loadMetrics} className="btn-premium-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Users"
          value={metrics?.totalUsers ?? "—"}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          label="Active (24h)"
          value={metrics?.activeUsers ?? "—"}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Revenue"
          value={`$${(metrics?.totalRevenue ?? 0).toFixed(2)}`}
          icon={<CreditCard className="h-5 w-5" />}
          trend="up"
        />
        <MetricCard
          label="Credits Spent"
          value={metrics?.creditsSpent ?? "—"}
          icon={<Zap className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pending Submissions"
          value={metrics?.pendingSubmissions ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          label="Banned Users"
          value={metrics?.bannedUsers ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <MetricCard
          label="Scanner Runs"
          value={metrics?.scannerRuns ?? 0}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          label="Spells Added"
          value={metrics?.spellsAdded ?? 0}
          icon={<Zap className="h-5 w-5" />}
        />
      </div>

      <div className="glass-panel">
        <h3 className="mb-4 heading-display">Recent Activity</h3>
        {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
          <div className="space-y-2">
            {metrics.recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-3 py-2">
                <div className="text-xs text-[color:var(--text-tertiary)]">{new Date(item.timestamp).toLocaleString()}</div>
                <div className="text-sm text-[color:var(--text-secondary)]">{item.message}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[color:var(--text-tertiary)]">No recent activity yet. Activity will appear as users interact with the platform.</p>
        )}
      </div>
    </div>
  );
}
