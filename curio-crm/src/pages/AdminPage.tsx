import React, { useEffect, useState } from "react";
import { client, fmtUsd, type PublicUser } from "../api/client";
import { PageHeader, Panel, ErrorBanner } from "../components/admin/CrmShell";

export function AdminPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", balance: "100000" });
  const [tradeForm, setTradeForm] = useState({
    userId: "",
    symbol: "AAPL",
    assetClass: "us_equity" as "us_equity" | "crypto",
    qty: "1",
  });
  const [cashForm, setCashForm] = useState({ userId: "", amount: "10000" });

  async function load() {
    setError(null);
    try {
      const data = await client.adminUsers();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, []);

  async function createUser() {
    try {
      await client.adminCreateUser({
        username: newUser.username,
        password: newUser.password,
        initialBalance: Number(newUser.balance),
      });
      setNewUser({ username: "", password: "", balance: "100000" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    }
  }

  async function credit(userId: string, amount: number) {
    await client.adminCredit(userId, amount);
    await load();
  }

  async function debit(userId: string, amount: number) {
    await client.adminDebit(userId, amount);
    await load();
  }

  async function openTradeForUser() {
    await client.adminOpenTrade({
      userId: tradeForm.userId,
      symbol: tradeForm.symbol,
      assetClass: tradeForm.assetClass,
      qty: Number(tradeForm.qty),
    });
    await load();
  }

  return (
    <div>
      <PageHeader title="Funding Control" subtitle="Create users, fund accounts, open trades — no payment gateway" />
      <ErrorBanner message={error} />

      <Panel className="mb-4 flex flex-wrap gap-3 p-4">
        <input
          placeholder="New client username"
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          className="min-w-[140px] flex-1 rounded border border-[#ddd] px-3 py-2 text-sm"
        />
        <input
          placeholder="Password"
          type="password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          className="min-w-[140px] flex-1 rounded border border-[#ddd] px-3 py-2 text-sm"
        />
        <input
          placeholder="Starting balance"
          value={newUser.balance}
          onChange={(e) => setNewUser({ ...newUser, balance: e.target.value })}
          className="w-32 rounded border border-[#ddd] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void createUser()}
          className="whitespace-nowrap rounded bg-[#5cb85c] px-4 py-2 text-sm font-medium text-white"
        >
          Create Account
        </button>
      </Panel>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Panel className="space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#888]">Open trade for user</p>
          <select
            value={tradeForm.userId}
            onChange={(e) => setTradeForm({ ...tradeForm, userId: e.target.value })}
            className="w-full rounded border border-[#ddd] px-3 py-2 text-sm"
          >
            <option value="">Select user</option>
            {users
              .filter((u) => u.role === "user")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <input
              value={tradeForm.symbol}
              onChange={(e) => setTradeForm({ ...tradeForm, symbol: e.target.value.toUpperCase() })}
              className="flex-1 rounded border border-[#ddd] px-3 py-2 text-sm"
              placeholder="AAPL or BTC/USD"
            />
            <select
              value={tradeForm.assetClass}
              onChange={(e) =>
                setTradeForm({ ...tradeForm, assetClass: e.target.value as "us_equity" | "crypto" })
              }
              className="rounded border border-[#ddd] px-2 py-2 text-sm"
            >
              <option value="us_equity">US Stock</option>
              <option value="crypto">Crypto</option>
            </select>
            <input
              value={tradeForm.qty}
              onChange={(e) => setTradeForm({ ...tradeForm, qty: e.target.value })}
              className="w-20 rounded border border-[#ddd] px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void openTradeForUser()}
            className="rounded bg-[#4a90e2] px-4 py-2 text-sm font-medium text-white"
          >
            Open Long
          </button>
        </Panel>
        <Panel className="space-y-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#888]">Adjust cash</p>
          <select
            value={cashForm.userId}
            onChange={(e) => setCashForm({ ...cashForm, userId: e.target.value })}
            className="w-full rounded border border-[#ddd] px-3 py-2 text-sm"
          >
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
          <input
            value={cashForm.amount}
            onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
            className="w-full rounded border border-[#ddd] px-3 py-2 text-sm"
            placeholder="Amount USD"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void credit(cashForm.userId, Number(cashForm.amount))}
              className="rounded bg-[#5cb85c] px-4 py-2 text-sm font-medium text-white"
            >
              Add Cash
            </button>
            <button
              type="button"
              onClick={() => void debit(cashForm.userId, Number(cashForm.amount))}
              className="rounded bg-[#d9534f] px-4 py-2 text-sm font-medium text-white"
            >
              Withdraw Cash
            </button>
          </div>
        </Panel>
      </div>

      <Panel className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#eee] bg-[#fafafa] text-xs uppercase text-[#888]">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Cash</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3 text-right">Quick</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#f0f0f0]">
                <td className="px-4 py-3 font-medium">{u.username}</td>
                <td className="px-4 py-3 capitalize text-[#666]">{u.role}</td>
                <td className="px-4 py-3">{fmtUsd(u.cashBalance)}</td>
                <td className="px-4 py-3 text-[#f0ad4e]">{fmtUsd(u.credits)}</td>
                <td className="px-4 py-3">{u.openPositionCount}</td>
                <td className="space-x-2 px-4 py-3 text-right">
                  <button type="button" onClick={() => void credit(u.id, 10000)} className="text-xs text-[#5cb85c] hover:underline">
                    +$10k
                  </button>
                  <button type="button" onClick={() => void debit(u.id, 5000)} className="text-xs text-[#d9534f] hover:underline">
                    −$5k
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export default AdminPage;
