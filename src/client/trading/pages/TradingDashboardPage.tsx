import { useEffect, useState } from "react";
import { TrendingUp, BarChart3, Activity, Wallet, Clock, RefreshCw } from "lucide-react";
import { useUserIdentity } from "../../context/SessionContext";

export function TradingDashboardPage() {
  const { userId, tokens, role, authenticated } = useUserIdentity();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-emerald-400" />
            <span className="text-lg font-bold">TradeToros</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2 text-zinc-400">
              <Clock className="h-4 w-4" />
              {time.toLocaleTimeString()}
            </span>
            <a href="/" className="text-zinc-400 hover:text-white transition">Home</a>
            <a href="/admin" className="text-zinc-400 hover:text-white transition">Admin</a>
            {authenticated && (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400">
                {tokens} credits
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Trading Dashboard</h1>
          <p className="mt-2 text-zinc-400">Real-time market intelligence & AI trading signals</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Portfolio Value" value="$0.00" change="+0%" />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Active Signals" value="0" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Positions" value="0" />
          <StatCard icon={<Wallet className="h-5 w-5" />} label="Available Balance" value="$0.00" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="mb-4 text-lg font-semibold">AI Market Signals</h2>
            <div className="flex items-center justify-center py-12 text-zinc-600">
              <p>Connect exchange to view signals</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="mb-4 text-lg font-semibold">Open Positions</h2>
            <div className="flex items-center justify-center py-12 text-zinc-600">
              <p>No open positions</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, change }: { icon: React.ReactNode; label: string; value: string; change?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {change && <div className="mt-1 text-xs text-zinc-500">{change} today</div>}
    </div>
  );
}
