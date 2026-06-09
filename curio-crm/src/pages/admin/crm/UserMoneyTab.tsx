import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  client,
  fmtMoney,
  type CrmUser,
  type DepositRequestRow,
  type LedgerEntryRow,
} from "../../../api/client";
import { fmtDate, inputCls, Panel } from "../../../components/admin/CrmShell";

type MoneyAction =
  | "deposit"
  | "manual_deposit"
  | "private_psp"
  | "withdrawal"
  | "adjustment"
  | "bonus"
  | null;

function PanelHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
      <h3 className="text-sm font-semibold text-[#555]">{title}</h3>
      {actions ? <div className="flex flex-wrap gap-1.5">{actions}</div> : null}
    </div>
  );
}

function ActionBtn({
  label,
  variant = "primary",
  onClick,
}: {
  label: string;
  variant?: "primary" | "green" | "dark";
  onClick: () => void;
}) {
  const cls =
    variant === "green"
      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
      : variant === "dark"
      ? "bg-[#1a3a7a] hover:bg-[#152f66] text-white"
      : "bg-teal-600 hover:bg-teal-500 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </button>
  );
}

function Empty() {
  return <p className="px-4 py-3 text-sm text-slate-400">There is nothing to show</p>;
}

function prettyMethod(reason: string): string {
  if (!reason) return "—";
  if (reason.includes("credit") || reason === "deposit") return "CreditCard";
  if (reason.includes("withdraw") || reason === "admin_debit") return "Wire";
  if (reason.includes("bonus")) return "Bonus";
  return "Manual";
}

function LedgerTable({
  rows,
  currency,
  showMethod,
  onShow,
}: {
  rows: LedgerEntryRow[];
  currency: string;
  showMethod?: boolean;
  onShow?: (row: LedgerEntryRow) => void;
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b border-slate-200 bg-slate-50/60 text-left text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Id</th>
            <th className="px-3 py-2 font-semibold">Amount</th>
            {showMethod ? <th className="px-3 py-2 font-semibold">Method</th> : null}
            <th className="px-3 py-2 font-semibold">Agent</th>
            <th className="px-3 py-2 font-semibold">Date</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-600">{r.id.slice(0, 6)}</td>
              <td className="px-3 py-2 font-semibold text-slate-800">
                {fmtMoney(currency, Math.abs(r.amount_delta))}
              </td>
              {showMethod ? (
                <td className="px-3 py-2 text-slate-600">{prettyMethod(r.reason)}</td>
              ) : null}
              <td className="px-3 py-2 text-teal-600">{r.actorName ?? "—"}</td>
              <td className="px-3 py-2 text-slate-500">{fmtDate(r.created_at)}</td>
              <td className="px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => onShow?.(r)}
                  className="rounded bg-[#1a3a7a] px-2 py-0.5 text-[10px] font-semibold uppercase text-white hover:bg-[#152f66]"
                >
                  Show
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DepositRequestTable({
  rows,
  currency,
}: {
  rows: DepositRequestRow[];
  currency: string;
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="border-b border-slate-200 bg-slate-50/60 text-left text-slate-500">
          <tr>
            <th className="px-3 py-2 font-semibold">Id</th>
            <th className="px-3 py-2 font-semibold">Amount</th>
            <th className="px-3 py-2 font-semibold">Method</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100">
              <td className="px-3 py-2 text-slate-600">{r.id.slice(0, 6)}</td>
              <td className="px-3 py-2 font-semibold text-slate-800">
                {fmtMoney(currency, r.amount)}
              </td>
              <td className="px-3 py-2 text-slate-600">{r.method}</td>
              <td className="px-3 py-2 capitalize text-slate-600">{r.status}</td>
              <td className="px-3 py-2 text-slate-500">{fmtDate(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const max = size === "lg" ? "max-w-2xl" : "max-w-md";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${max} rounded-lg bg-white shadow-xl`}>
        <div className="flex items-center justify-between rounded-t-lg bg-[#1ea7e0] px-4 py-3">
          <h4 className="font-semibold text-white">{title}</h4>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function AmountModal({
  title,
  buttonLabel,
  buttonClass,
  currency,
  withMethod,
  onSubmit,
  onClose,
}: {
  title: string;
  buttonLabel: string;
  buttonClass: string;
  currency: string;
  withMethod?: boolean;
  onSubmit: (amount: number) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CreditCard");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Enter a positive amount.");
      return;
    }
    setPending(true);
    try {
      await onSubmit(n);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <label className="mb-1 block text-xs text-slate-500">Amount</label>
      <div className="mb-3 flex items-center overflow-hidden rounded border border-slate-200">
        <span className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {currency}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          className="flex-1 px-3 py-2 text-sm outline-none"
          placeholder="0.00"
        />
      </div>
      {withMethod ? (
        <>
          <label className="mb-1 block text-xs text-slate-500">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`${inputCls} mb-3`}
          >
            <option>CreditCard</option>
            <option>Wire</option>
            <option>Crypto</option>
            <option>USDT</option>
            <option>Manual</option>
          </select>
        </>
      ) : null}
      <label className="mb-1 block text-xs text-slate-500">Status details</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className={`${inputCls} mb-3`}
      />
      {err ? <p className="mb-2 text-sm text-rose-600">{err}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => void go()}
          disabled={pending}
          className={`rounded px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60 ${buttonClass}`}
        >
          {pending ? "Saving…" : buttonLabel}
        </button>
      </div>
    </Modal>
  );
}

function PrivatePspModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: "", label: "", body: "", comment: "" });
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (!form.name.trim()) {
      setErr("Name is required.");
      return;
    }
    setPending(true);
    try {
      await client.adminCreateCrmNote({
        userId,
        body: `[Private PSP] ${form.name.trim()}\nLabel: ${form.label.trim() || "—"}\n\n${form.body.trim() || "—"}\n\nComment: ${form.comment.trim() || "—"}`,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal title="Private Psp" onClose={onClose} size="lg">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Label</label>
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Body</label>
          <textarea
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Comment</label>
          <input
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>
      {err ? <p className="mt-3 text-sm text-rose-600">{err}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-rose-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-rose-400"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => void create()}
          disabled={pending}
          className="rounded bg-[#1a3a7a] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#152f66] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Create"}
        </button>
      </div>
    </Modal>
  );
}

export function UserMoneyTab({ user, onReload }: { user: CrmUser; onReload: () => void }) {
  const navigate = useNavigate();
  const [deposits, setDeposits] = useState<LedgerEntryRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<LedgerEntryRow[]>([]);
  const [adjustments, setAdjustments] = useState<LedgerEntryRow[]>([]);
  const [bonuses, setBonuses] = useState<LedgerEntryRow[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<DepositRequestRow[]>([]);
  const [failed, setFailed] = useState<DepositRequestRow[]>([]);
  const [action, setAction] = useState<MoneyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LedgerEntryRow | null>(null);

  const userQ = `userId=${encodeURIComponent(user.id)}&username=${encodeURIComponent(user.username)}`;
  const goCashier = (path: string) => navigate(`${path}?${userQ}`);
  const showEntry = (row: LedgerEntryRow) => setDetail(row);

  const load = useCallback(async () => {
    try {
      const [d, w, a, b, requests] = await Promise.all([
        client.adminCashierDeposits(),
        client.adminCashierWithdrawals(),
        client.adminCashierAdjustments(),
        client.adminCashierBonuses(),
        client.adminDepositRequests(),
      ]);
      const own = (r: { user_id: string }) => r.user_id === user.id;
      setDeposits(d.entries.filter(own));
      setWithdrawals(w.entries.filter(own));
      setAdjustments(a.entries.filter(own));
      setBonuses(b.entries.filter(own));
      setPendingDeposits(requests.requests.filter((r) => own(r) && r.status === "pending"));
      setFailed(requests.requests.filter((r) => own(r) && r.status === "rejected"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load money data.");
    }
  }, [user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function afterAction() {
    await load();
    onReload();
  }

  const cur = user.currency || "USD";

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-0">
          <PanelHeader
            title="Deposits"
            actions={
              <>
                <ActionBtn label="Deposit" variant="green" onClick={() => setAction("deposit")} />
                <ActionBtn label="Manual Deposit" onClick={() => setAction("manual_deposit")} />
                <ActionBtn label="Private Psp" onClick={() => setAction("private_psp")} />
                <ActionBtn label="View All" variant="dark" onClick={() => goCashier("/admin/cashier/deposits")} />
              </>
            }
          />
          <LedgerTable rows={deposits} currency={cur} showMethod onShow={showEntry} />
        </Panel>

        <Panel className="p-0">
          <PanelHeader
            title="Withdrawals"
            actions={
              <>
                <ActionBtn label="Withdrawal" variant="green" onClick={() => setAction("withdrawal")} />
                <ActionBtn label="View All" variant="dark" onClick={() => goCashier("/admin/cashier/withdrawals")} />
              </>
            }
          />
          <LedgerTable rows={withdrawals} currency={cur} showMethod onShow={showEntry} />
        </Panel>

        <Panel className="p-0">
          <PanelHeader
            title="Adjustments"
            actions={
              <>
                <ActionBtn label="Adjustment" variant="green" onClick={() => setAction("adjustment")} />
                <ActionBtn label="View All" variant="dark" onClick={() => goCashier("/admin/cashier/adjustments")} />
              </>
            }
          />
          <LedgerTable rows={adjustments} currency={cur} onShow={showEntry} />
        </Panel>

        <Panel className="p-0">
          <PanelHeader
            title="Bonuses"
            actions={
              <>
                <ActionBtn label="Bonus" variant="green" onClick={() => setAction("bonus")} />
                <ActionBtn label="View All" variant="dark" onClick={() => goCashier("/admin/cashier/bonuses")} />
              </>
            }
          />
          <LedgerTable rows={bonuses} currency={cur} onShow={showEntry} />
        </Panel>

        <Panel className="p-0">
          <PanelHeader
            title="Failed Deposits"
            actions={
              <ActionBtn
                label="View All"
                variant="dark"
                onClick={() => goCashier("/admin/cashier/deposit-requests")}
              />
            }
          />
          <DepositRequestTable rows={failed} currency={cur} />
        </Panel>

        <Panel className="p-0">
          <PanelHeader
            title="Pending Deposits"
            actions={
              <ActionBtn
                label="View All"
                variant="dark"
                onClick={() => goCashier("/admin/cashier/deposit-requests")}
              />
            }
          />
          <DepositRequestTable rows={pendingDeposits} currency={cur} />
        </Panel>
      </div>

      {action === "deposit" || action === "manual_deposit" ? (
        <AmountModal
          title={action === "deposit" ? "Deposit" : "Manual Deposit"}
          buttonLabel="Create"
          buttonClass="bg-[#1a3a7a] hover:bg-[#152f66]"
          currency={cur}
          withMethod
          onClose={() => setAction(null)}
          onSubmit={async (amount) => {
            await client.adminCredit(user.id, amount);
            await afterAction();
          }}
        />
      ) : null}

      {action === "withdrawal" ? (
        <AmountModal
          title="Withdrawal"
          buttonLabel="Create"
          buttonClass="bg-emerald-600 hover:bg-emerald-500"
          currency={cur}
          withMethod
          onClose={() => setAction(null)}
          onSubmit={async (amount) => {
            await client.adminDebit(user.id, amount);
            await afterAction();
          }}
        />
      ) : null}

      {action === "adjustment" ? (
        <AmountModal
          title="Adjustment"
          buttonLabel="Create"
          buttonClass="bg-emerald-600 hover:bg-emerald-500"
          currency={cur}
          onClose={() => setAction(null)}
          onSubmit={async (amount) => {
            await client.adminAdjustment({ userId: user.id, amount });
            await afterAction();
          }}
        />
      ) : null}

      {action === "bonus" ? (
        <AmountModal
          title="Bonus"
          buttonLabel="Create"
          buttonClass="bg-emerald-600 hover:bg-emerald-500"
          currency={cur}
          onClose={() => setAction(null)}
          onSubmit={async (amount) => {
            await client.adminBonus({ userId: user.id, amount });
            await afterAction();
          }}
        />
      ) : null}

      {action === "private_psp" ? (
        <PrivatePspModal userId={user.id} onClose={() => setAction(null)} onSaved={() => void onReload()} />
      ) : null}

      {detail ? (
        <Modal title="Ledger entry" onClose={() => setDetail(null)}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-semibold">{fmtMoney(cur, detail.amount_delta)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reason</dt>
              <dd>{detail.reason}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Actor</dt>
              <dd>{detail.actorName ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Date</dt>
              <dd>{fmtDate(detail.created_at)}</dd>
            </div>
          </dl>
        </Modal>
      ) : null}
    </div>
  );
}
