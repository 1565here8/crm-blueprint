import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  client,
  fmtMoney,
  fmtPrice,
  fmtUsd,
  type AdminPosition,
  type CrmEmailRow,
  type CrmNoteRow,
  type CrmUser,
  type LedgerEntryRow,
  type PendingOrder,
} from "../../../api/client";
import { DataTable, fmtDate, Panel, TableHead } from "../../../components/admin/CrmShell";

export function UserTradesTab({
  userId,
  username,
  displayId,
}: {
  userId: string;
  username: string;
  displayId?: number;
}) {
  const [open, setOpen] = useState<AdminPosition[]>([]);
  const [closed, setClosed] = useState<AdminPosition[]>([]);
  const [pending, setPending] = useState<PendingOrder[]>([]);
  const [tab, setTab] = useState<"open" | "closed" | "pending">("open");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, c, p] = await Promise.all([
        client.adminPositions("open", userId),
        client.adminPositions("closed", userId),
        client.adminPendingOrders(userId),
      ]);
      setOpen(o.positions);
      setClosed(c.positions);
      setPending(p.orders);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, [userId]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, [load]);

  async function closePos(p: AdminPosition) {
    if (!window.confirm(`Close ${p.qty} ${p.symbol} for ${username}?`)) return;
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

  async function cancelOrder(o: PendingOrder) {
    setBusy(o.id);
    try {
      await client.adminCancelPending(o.id);
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
  const deskLink = displayId
    ? `/admin/trading/open-trades?customer=${displayId}`
    : `/admin/trading/open-trades?customer=${encodeURIComponent(userId)}`;

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["open", "closed", "pending"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1.5 text-xs font-bold uppercase ${
              tab === t ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {t} ({t === "open" ? open.length : t === "closed" ? closed.length : pending.length})
          </button>
        ))}
        <Link to={deskLink} className="ml-auto text-xs font-semibold text-teal-600 hover:underline">
          Open trading desk
        </Link>
      </div>
      {tab === "pending" ? (
        pending.length === 0 ? (
          <Panel className="p-6 text-center text-sm text-slate-400">No pending orders.</Panel>
        ) : (
          <DataTable>
            <TableHead cols={["Created", "Symbol", "Side", "Qty", "Limit", "Actions"]} />
            <tbody>
              {pending.map((o) => (
                <tr key={o.id} className="border-b border-[#f5f5f5] text-sm">
                  <td className="px-4 py-2.5">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-2.5 font-mono">{o.symbol}</td>
                  <td className="px-4 py-2.5">{o.side}</td>
                  <td className="px-4 py-2.5">{o.qty}</td>
                  <td className="px-4 py-2.5">{o.limit_price != null ? fmtPrice(o.limit_price) : "-"}</td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      disabled={busy === o.id}
                      onClick={() => void cancelOrder(o)}
                      className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )
      ) : rows.length === 0 ? (
        <Panel className="p-6 text-center text-sm text-slate-400">No {tab} trades for {username}.</Panel>
      ) : (
        <DataTable>
          <TableHead cols={["#", "Symbol", "Side", "Qty", "Entry", "P&L", "Opened", "Actions"]} />
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-[#f5f5f5] text-sm">
                <td className="px-4 py-2.5 font-mono">{p.trade_number ?? "-"}</td>
                <td className="px-4 py-2.5 font-mono">{p.symbol}</td>
                <td className="px-4 py-2.5 capitalize">{p.side}</td>
                <td className="px-4 py-2.5">{p.qty}</td>
                <td className="px-4 py-2.5">{fmtPrice(p.entry_price)}</td>
                <td className="px-4 py-2.5 font-mono">
                  {tab === "open" ? fmtUsd(p.unrealizedPnl) : fmtUsd(p.pnl ?? 0)}
                </td>
                <td className="px-4 py-2.5 text-slate-500">{fmtDate(p.opened_at)}</td>
                <td className="px-4 py-2.5">
                  {tab === "open" ? (
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

export function UserNotesTab({
  userId,
  onAddNote,
}: {
  userId: string;
  onAddNote: () => void;
}) {
  const [notes, setNotes] = useState<CrmNoteRow[]>([]);
  const [emails, setEmails] = useState<CrmEmailRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([client.adminNotes(), client.adminEmails()])
      .then(([n, e]) => {
        setNotes(n.notes.filter((r) => r.user_id === userId));
        setEmails(e.emails.filter((r) => r.user_id === userId));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [userId]);

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex justify-end">
        <button type="button" className="rounded bg-teal-600 px-4 py-2 text-sm text-white" onClick={onAddNote}>
          Add Note
        </button>
      </div>
      <Panel className="p-0">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-[#555]">Notes</div>
        {notes.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notes.map((n) => (
              <li key={n.id} className="px-4 py-3 text-sm">
                <p className="whitespace-pre-wrap text-slate-700">{n.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {n.authorName ?? "Staff"} · {fmtDate(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel className="p-0">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-[#555]">
          Logged emails (CRM record — not sent via SMTP)
        </div>
        {emails.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">No logged emails.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {emails.map((e) => (
              <li key={e.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">{e.subject}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{e.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {e.authorName ?? "Staff"} · {fmtDate(e.sent_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

export function UserBalanceTab({ user }: { user: CrmUser }) {
  const cur = user.currency || "USD";
  const net =
    user.totalDeposits +
    user.totalAdjustments +
    user.totalBonuses -
    user.approvedWithdrawals -
    user.pendingWithdrawals;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#555]">Account balance</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Cash balance</dt>
            <dd className="font-semibold text-emerald-700">{fmtMoney(cur, user.cashBalance)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Credits</dt>
            <dd>{fmtMoney(cur, user.credits)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-2">
            <dt className="text-slate-500">Net cashier position</dt>
            <dd className="font-semibold">{fmtMoney(cur, net)}</dd>
          </div>
        </dl>
      </Panel>
      <Panel className="p-4">
        <h3 className="mb-3 text-sm font-semibold text-[#555]">Trading P&amp;L</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Open P&amp;L</dt>
            <dd>{fmtMoney(cur, user.totalOpenPnl)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Closed P&amp;L</dt>
            <dd>{fmtMoney(cur, user.totalClosedPnl)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Volume traded</dt>
            <dd>{fmtMoney(cur, user.totalVolume)}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

export function UserActivityTab({ userId }: { userId: string }) {
  const [rows, setRows] = useState<LedgerEntryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .adminCashierLedger()
      .then((r) => setRows(r.entries.filter((e) => e.user_id === userId).slice(0, 50)))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [userId]);

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <DataTable>
        <TableHead cols={["Date", "Amount", "Reason", "Actor"]} />
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-b border-[#f5f5f5] text-sm">
              <td className="px-4 py-2.5 text-slate-500">{fmtDate(e.created_at)}</td>
              <td
                className={`px-4 py-2.5 font-mono ${e.amount_delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}
              >
                {fmtUsd(e.amount_delta)}
              </td>
              <td className="px-4 py-2.5 text-slate-600">{e.reason}</td>
              <td className="px-4 py-2.5 text-slate-500">{e.actorName ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      {rows.length === 0 ? <p className="mt-3 text-sm text-slate-400">No ledger activity.</p> : null}
    </div>
  );
}

export function UserDocsTab({
  user,
  onToggleExtDocs,
}: {
  user: CrmUser;
  onToggleExtDocs: () => void;
}) {
  return (
    <Panel className="p-6">
      <h3 className="text-sm font-semibold text-[#555]">KYC / documents</h3>
      <p className="mt-2 text-sm text-slate-600">
        Extended documents {user.extDocsRequired ? "required" : "not required"} for this client.
      </p>
      <button
        type="button"
        onClick={onToggleExtDocs}
        className="mt-4 rounded bg-[#1a3a7a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#152f66]"
      >
        {user.extDocsRequired ? "Clear extended docs flag" : "Require extended documents"}
      </button>
      <p className="mt-4 text-xs text-slate-400">
        Upload and review flows are managed from the client portal and compliance desk. Use Notes for internal
        document references.
      </p>
    </Panel>
  );
}

export function UserSettingsTab({
  user,
  onEditProfile,
}: {
  user: CrmUser;
  onEditProfile: () => void;
}) {
  return (
    <Panel className="p-6">
      <h3 className="text-sm font-semibold text-[#555]">Trading &amp; CRM settings</h3>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">CRM status</dt>
          <dd className="font-medium">{user.crmStatus || "—"}</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">Trading status</dt>
          <dd className="font-medium">{user.tradingStatus || "—"}</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">Exchange spread bias</dt>
          <dd className="font-medium">{user.exchangeSpread ?? 0}</dd>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <dt className="text-slate-500">Agent</dt>
          <dd className="font-medium">{user.agentName || "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Desk</dt>
          <dd className="font-medium">{user.desk || "—"}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onEditProfile}
        className="mt-6 rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500"
      >
        Edit on Profile tab
      </button>
    </Panel>
  );
}
