import React, { useEffect, useState } from "react";
import { client, type UserSummary } from "../api/client";
import { ClientTradingShell } from "../components/client/ClientTradingShell";
import { TradingDesk } from "../components/TradingDesk";
import { useAuth } from "../context/AuthContext";

export function TradePage() {
  const { user, refresh } = useAuth();
  const [account, setAccount] = useState<UserSummary | null>(user);
  const [chartTheme, setChartTheme] = useState<"light" | "dark">("light");

  async function loadAccount() {
    try {
      const me = await client.me();
      setAccount(me.user);
      await refresh();
    } catch {
      /* best-effort */
    }
  }

  useEffect(() => {
    void loadAccount();
    const id = setInterval(() => void loadAccount(), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ws-chart-theme");
      if (saved === "light" || saved === "dark") setChartTheme(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function toggleChartTheme() {
    setChartTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("ws-chart-theme", next);
      return next;
    });
  }

  return (
    <div className="client-terminal flex min-h-screen flex-col bg-slate-100">
      <ClientTradingShell
        account={account}
        chartTheme={chartTheme}
        onToggleChartTheme={toggleChartTheme}
      />
      <div className="flex-1 overflow-hidden">
        <TradingDesk
          mode="client"
          currency={account?.currency ?? "USD"}
          chartTheme={chartTheme}
          onRefresh={() => void loadAccount()}
        />
      </div>
    </div>
  );
}
