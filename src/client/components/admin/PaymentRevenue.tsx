import React, { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  RefreshCw,
  Wallet,
} from "lucide-react";

type Transaction = {
  id: string;
  userId: string;
  type: "topup" | "spend" | "refund";
  amount: number;
  credits: number;
  method: string;
  status: "completed" | "pending" | "failed";
  createdAt: string;
};

type PaymentSummary = {
  totalRevenue: number;
  totalTopups: number;
  totalSpent: number;
  pendingPayouts: number;
  recentTransactions: Transaction[];
};

export function PaymentRevenue() {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments", { credentials: "include" });
      if (res.ok) {
        setSummary(await res.json());
      } else {
        setSummary(getMockSummary());
      }
    } catch {
      setSummary(getMockSummary());
    } finally {
      setLoading(false);
    }
  }

  function getMockSummary(): PaymentSummary {
    return {
      totalRevenue: 0,
      totalTopups: 0,
      totalSpent: 0,
      pendingPayouts: 0,
      recentTransactions: [],
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="heading-display">Payments & Revenue</h2>
        <button onClick={loadSummary} className="btn-premium-ghost flex items-center gap-2 text-sm">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-inset">
          <p className="label-premium">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">
            ${(summary?.totalRevenue ?? 0).toFixed(2)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-[color:var(--success)]">
            <ArrowUpRight className="h-3 w-3" />
            PayRAM settlements
          </div>
        </div>
        <div className="glass-inset">
          <p className="label-premium">Total Top-ups</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">
            ${(summary?.totalTopups ?? 0).toFixed(2)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-[color:var(--text-tertiary)]">
            <CreditCard className="h-3 w-3" />
            Credits purchased
          </div>
        </div>
        <div className="glass-inset">
          <p className="label-premium">Credits Spent</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">
            ${(summary?.totalSpent ?? 0).toFixed(2)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-[color:var(--text-tertiary)]">
            <Wallet className="h-3 w-3" />
            By users
          </div>
        </div>
        <div className="glass-inset">
          <p className="label-premium">Pending Payouts</p>
          <p className="mt-1 text-2xl font-bold text-[color:var(--text-primary)]">
            ${(summary?.pendingPayouts ?? 0).toFixed(2)}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-[color:var(--danger)]">
            <DollarSign className="h-3 w-3" />
            Awaiting settlement
          </div>
        </div>
      </div>

      <div className="glass-panel">
        <h3 className="mb-4 heading-display">Recent Transactions</h3>
        {summary?.recentTransactions && summary.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-left text-xs uppercase tracking-wider text-[color:var(--text-tertiary)]">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Credits</th>
                  <th className="pb-2 pr-4">Method</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-[color:var(--border)] last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs text-[color:var(--text-tertiary)]">
                      {tx.id.slice(0, 8)}…
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{tx.userId.slice(0, 8)}…</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          tx.type === "topup"
                            ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
                            : tx.type === "refund"
                              ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-text)]"
                              : "bg-[color:var(--surface-1)] text-[color:var(--text-secondary)]"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[color:var(--text-primary)]">${tx.amount.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 text-[color:var(--text-primary)]">{tx.credits}</td>
                    <td className="py-2.5 pr-4 text-xs text-[color:var(--text-tertiary)]">{tx.method}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          tx.status === "completed"
                            ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
                            : tx.status === "pending"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-[color:var(--text-tertiary)]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--text-tertiary)]">
            No transactions yet. Payments will appear as users top up credits.
          </p>
        )}
      </div>

      <div className="glass-panel">
        <h3 className="mb-4 heading-display">PayRAM Configuration</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">PayRAM API Status</span>
            <span className="rounded-full bg-[color:var(--success-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--success)]">
              Configured
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">Accepted Coins</span>
            <span className="text-sm text-[color:var(--text-primary)]">BTC, ETH, USDC, USDT</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">Settlement Frequency</span>
            <span className="text-sm text-[color:var(--text-primary)]">Daily</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-inset)] px-4 py-3">
            <span className="text-sm text-[color:var(--text-secondary)]">Minimum Top-up</span>
            <span className="text-sm text-[color:var(--text-primary)]">$5.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
