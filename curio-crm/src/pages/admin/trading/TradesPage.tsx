import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client, fmtPrice, fmtUsd, type AdminPosition } from "../../../api/client";
import { DataTable, ErrorBanner, PageHeader, TableHead, fmtDate } from "../../../components/admin/CrmShell";

export function TradesPage() {
  const [tab, setTab] = useState<"open" | "closed" | "pending">("open");
  const [open, setOpen] = useState<AdminPosition[]>([]);
  const [closed, setClosed] = useState<AdminPosition[]>([]);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof client.adminPendingOrders>>["orders"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, c, p] = await Promise.all([
        client.adminPositions("open"),
        client.adminPositions("closed"),
        client.adminPendingOrders(),
      ]);
      setOpen(o.positions);
      setClosed(c.positions);
      setPending(p.orders);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  async function closePos(p: AdminPosition) {
    if (!window.confirm(`Close ${p.symbol} for ${p.username ?? p.user_id}?`)) return;
    setBusy(p.id);
    try {
      await client.adminCloseTrade(p.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Close failed");
    } finally {
      setBusy(null);
    }
  }

  async function cancelOrder(id: string) {
    setBusy(id);
    try {
      await client.adminCancelPending(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteTrade(tradeNumber: number | undefined) {
    if (tradeNumber == null) return;
    if (!window.confirm(`Delete trade #${tradeNumber}?`)) return;
    setBusy(`del-${tradeNumber}`);
    try {
      await client.adminDeleteTrade(tradeNumber);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  const rows = tab === "open" ? open : tab === "closed" ? closed : [];

  return (
    <div className="p-4">
      <PageHeader title="Trades" subtitle="All platform positions and pending orders" />
      <ErrorBanner message={error} />

      <div className="mb-4 flex gap-2">
        {(["open", "closed", "pending"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-4 py-2 text-xs font-bold uppercase ${
              tab === t ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {t} ({t === "open" ? open.length : t === "closed" ? closed.length : pending.length})
          </button>
        ))}
      </div>

      {tab === "pending" ? (
        <DataTable>
          <TableHead cols={["Created", "User", "Symbol", "Side", "Qty", "Limit", "Status", "Actions"]} />
          <tbody>
            {pending.map((o) => (
              <tr key={o.id} className="border-b border-[#f5f5f5] text-sm">
                <td className="px-4 py-2.5">{fmtDate(o.created_at)}</td>
                <td className="px-4 py-2.5">
                  <Link to={`/admin/crm/users/${o.user_id}`} className="text-teal-600">
                    {o.username ?? o.user_id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono">{o.symbol}</td>
                <td className="px-4 py-2.5">{o.side}</td>
                <td className="px-4 py-2.5">{o.qty}</td>
                <td className="px-4 py-2.5">{o.limit_price != null ? fmtPrice(o.limit_price) : "-"}</td>
                <td className="px-4 py-2.5">{o.status}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    disabled={busy === o.id}
                    onClick={() => void cancelOrder(o.id)}
                    className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <DataTable>
          <TableHead cols={["#", "User", "Symbol", "Qty", "Entry", "Status", "Opened", "P&L", "Actions"]} />
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-[#f5f5f5] text-sm">
                <td className="px-4 py-2.5 font-mono">{p.trade_number ?? "-"}</td>
                <td className="px-4 py-2.5">
                  <Link to={`/admin/crm/users/${p.user_id}`} className="text-teal-600">
                    {(p as AdminPosition).username ?? p.user_id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-mono font-semibold">{p.symbol}</td>
                <td className="px-4 py-2.5">{p.qty}</td>
                <td className="px-4 py-2.5">{fmtPrice(p.entry_price)}</td>
                <td className="px-4 py-2.5 capitalize">{p.status}</td>
                <td className="px-4 py-2.5">{fmtDate(p.opened_at)}</td>
                <td className="px-4 py-2.5">
                  {p.status === "open"
                    ? fmtUsd(p.unrealizedPnl)
                    : p.pnl != null
                      ? fmtUsd(p.pnl)
                      : "-"}
                </td>
                <td className="px-4 py-2.5">
                  {p.status === "open" ? (
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => void closePos(p)}
                      className="text-xs font-semibold text-teal-600 hover:underline disabled:opacity-50"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === `del-${p.trade_number}`}
                      onClick={() => void deleteTrade(p.trade_number)}
                      className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </div>
  );
}
