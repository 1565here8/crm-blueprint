import React, { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  History,
  LogOut,
  ShieldCheck,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { AuthenticatedSiteHeader } from "../components/client/AuthenticatedSiteHeader";
import {
  client,
  fmtMoney,
  fmtPrice,
  type ClosedPosition,
  type Execution,
  type UserDocument,
  type UserSummary,
  type UserTransaction,
  type UserWireRequest,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DepositModal } from "../components/client/DepositModal";

const NAV = [
  { to: "history", label: "Transaction History", icon: History },
  { to: "account", label: "Account", icon: User },
  { to: "verification", label: "Verification Center", icon: ShieldCheck },
  { to: "withdraw", label: "Withdraw", icon: Wallet },
  { to: "trades", label: "My Trades", icon: TrendingUp },
] as const;

export function ClientProfilePage() {
  const { logout } = useAuth();
  const location = useLocation();
  const [account, setAccount] = useState<UserSummary | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const currency = account?.currency ?? "USD";
  const balance = account?.cashBalance ?? 0;
  const fullName =
    [account?.firstName, account?.lastName].filter(Boolean).join(" ") || account?.username || "Client";
  const shortName = fullName.length > 22 ? `${fullName.slice(0, 20)}…` : fullName;

  useEffect(() => {
    void client
      .me()
      .then((data) => setAccount(data.user))
      .finally(() => setLoading(false));
  }, []);

  const sectionTitle =
    NAV.find((n) => location.pathname.includes(n.to))?.label ?? "Transaction History";

  return (
    <div className="client-terminal flex min-h-screen flex-col bg-[#f0f2f5]">
      <AuthenticatedSiteHeader homePath="/" />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col lg:flex-row lg:gap-0 lg:px-4 lg:py-4">
        <aside className="flex w-full shrink-0 flex-col bg-[#3d5367] text-white lg:w-[260px] lg:rounded-l-lg">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm font-medium leading-tight">
              Hi, <span className="font-semibold">{shortName}</span>
            </p>
          </div>

          <nav className="flex-1 space-y-0.5 px-2 py-3">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = location.pathname.includes(`/profile/${to}`);
              return (
                <Link
                  key={to}
                  to={`/profile/${to}`}
                  className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition ${
                    active ? "bg-[#4a6278] font-semibold" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} />
                  {label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Log Out
            </button>
          </nav>

          <div className="mt-auto border-t border-white/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
              Available Balance
            </p>
            <p className="mt-1 text-lg font-bold">
              {balance.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-sm font-semibold">{currency}</span>
            </p>
            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-[#4a9b8e] py-2.5 text-sm font-semibold text-white transition hover:bg-[#3d887c]"
            >
              Deposit
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#f0f2f5] lg:rounded-r-lg">
          <div className="border-b border-slate-200 bg-[#3d5367] px-5 py-3 lg:rounded-tr-lg">
            <h1 className="text-sm font-semibold uppercase tracking-wide text-white">{sectionTitle}</h1>
          </div>

          <div className="p-4 lg:p-6">
            {loading ? (
              <p className="text-slate-500">Loading…</p>
            ) : (
              <Routes>
                <Route index element={<Navigate to="history" replace />} />
                <Route path="history" element={<TransactionHistoryPanel currency={currency} />} />
                <Route path="account" element={<AccountPanel account={account} fullName={fullName} />} />
                <Route path="verification" element={<VerificationPanel account={account} />} />
                <Route
                  path="withdraw"
                  element={
                    <WithdrawPanel
                      currency={currency}
                      balance={balance}
                      onRefresh={() => void client.me().then((d) => setAccount(d.user))}
                    />
                  }
                />
                <Route path="trades" element={<MyTradesPanel currency={currency} />} />
                <Route path="*" element={<Navigate to="history" replace />} />
              </Routes>
            )}
          </div>
        </main>
      </div>

      <DepositModal open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
}

function TransactionHistoryPanel({ currency }: { currency: string }) {
  const [rows, setRows] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void client
      .transactions()
      .then((d) => setRows(d.transactions))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PanelCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {["PDF", "Excel", "CSV", "Copy", "Print", "Settings"].map((label) => (
            <button key={label} type="button" className="font-semibold text-[#4a9b8e] hover:underline">
              {label}
            </button>
          ))}
        </div>
        <select className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">
          <option>All Periods</option>
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading transactions…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-slate-500">No transactions yet. Deposits appear here once funded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Method</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-3 pr-4 text-slate-600">{r.date}</td>
                  <td className="py-3 pr-4 font-medium text-slate-800">{r.type}</td>
                  <td className="py-3 pr-4 text-slate-600">{r.method}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="py-3 text-right font-semibold text-[#4a9b8e]">
                    {r.currency}{" "}
                    {r.amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

function AccountPanel({ account, fullName }: { account: UserSummary | null; fullName: string }) {
  const currency = account?.currency ?? "USD";
  return (
    <PanelCard>
      <div className="grid gap-6 sm:grid-cols-2">
        <InfoBlock title="Personal">
          <InfoRow label="Full name" value={fullName} />
          <InfoRow label="Email" value={account?.email || "—"} />
          <InfoRow label="Phone" value={account?.phone || "—"} />
          <InfoRow label="Country" value={account?.countryCode || "—"} />
          <InfoRow label="Nationality" value={account?.nationality || "—"} />
          <InfoRow label="Date of birth" value={account?.birthday || "—"} />
        </InfoBlock>
        <InfoBlock title="Account">
          <InfoRow label="Account ID" value={account?.displayId ? `#${account.displayId}` : "—"} />
          <InfoRow label="Username" value={account?.username || "—"} />
          <InfoRow label="Status" value={account?.crmStatus || "—"} />
          <InfoRow label="Currency" value={currency} />
          <InfoRow label="Member since" value={formatDate(account?.createdAt)} />
          <InfoRow
            label="Address"
            value={
              [account?.address, account?.city, account?.state, account?.zipCode].filter(Boolean).join(", ") ||
              "—"
            }
          />
        </InfoBlock>
        <InfoBlock title="Balances" className="sm:col-span-2">
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoRow label="Cash balance" value={fmtMoney(currency, account?.cashBalance ?? 0)} />
            <InfoRow label="Equity" value={fmtMoney(currency, account?.equity ?? 0)} />
            <InfoRow label="Open P&amp;L" value={fmtMoney(currency, account?.unrealizedPnl ?? 0)} />
          </div>
        </InfoBlock>
      </div>
    </PanelCard>
  );
}

function VerificationPanel({ account }: { account: UserSummary | null }) {
  const [docs, setDocs] = useState<UserDocument[]>([]);
  const [docType, setDocType] = useState("ID Card");
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    void client.userDocuments().then((d) => setDocs(d.documents));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName.trim()) {
      setError("Enter a file name or description.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await client.uploadDocument({ docType, fileName: fileName.trim() });
      setFileName("");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {account?.extDocsRequired ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your account manager has requested additional verification documents.
        </div>
      ) : null}

      <PanelCard>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Submitted documents</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-500">No documents on file yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate-400">
                <th className="pb-2">Type</th>
                <th className="pb-2">File</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-2.5">{d.doc_type}</td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      {d.file_name}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <DocStatusBadge status={d.status} />
                  </td>
                  <td className="py-2.5 text-slate-500">{d.uploaded_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </PanelCard>

      <PanelCard>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Upload document</h2>
        <form onSubmit={onSubmit} className="max-w-md space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Document type</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            >
              {["ID Card", "Passport", "Proof of Address", "Bank Statement", "Other"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">File name / reference</span>
            <input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. passport_scan.pdf"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-[#4a9b8e] px-6 py-2 text-sm font-semibold text-white hover:bg-[#3d887c] disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Submit document"}
          </button>
        </form>
      </PanelCard>
    </div>
  );
}

function WithdrawPanel({
  currency,
  balance,
  onRefresh,
}: {
  currency: string;
  balance: number;
  onRefresh: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [requests, setRequests] = useState<UserWireRequest[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void client.wireRequests().then((d) => setRequests(d.requests));
  }, []);

  async function onWire(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (n > balance) {
      setError("Insufficient balance.");
      return;
    }
    if (!bankDetails.trim()) {
      setError("Enter bank details.");
      return;
    }
    setPending(true);
    setError(null);
    setMsg(null);
    try {
      await client.createWireRequest({ amount: n, bankDetails: bankDetails.trim() });
      setAmount("");
      setBankDetails("");
      setMsg("Withdrawal request submitted. Pending broker approval.");
      void client.wireRequests().then((d) => setRequests(d.requests));
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <PanelCard>
        <p className="mb-4 text-sm text-slate-600">
          Available for withdrawal: <strong>{fmtMoney(currency, balance)}</strong>
        </p>
        <form onSubmit={onWire} className="max-w-lg space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Amount ({currency})</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Bank / wallet details</span>
            <textarea
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              rows={4}
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
              placeholder="IBAN, account holder, bank name…"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {msg ? <p className="text-sm text-emerald-700">{msg}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded bg-[#4a9b8e] px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#3d887c] disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Request withdrawal"}
          </button>
        </form>
      </PanelCard>

      {requests.length > 0 ? (
        <PanelCard>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Withdrawal history</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate-400">
                <th className="pb-2">Date</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2.5">{r.created_at.slice(0, 10)}</td>
                  <td className="py-2.5 font-semibold text-[#4a9b8e]">
                    {currency} {r.amount.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge
                      status={
                        r.status === "pending" ? "PENDING" : r.status === "approved" ? "APPROVED" : "REJECTED"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelCard>
      ) : null}
    </div>
  );
}

function MyTradesPanel({ currency }: { currency: string }) {
  const [closed, setClosed] = useState<ClosedPosition[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [tab, setTab] = useState<"closed" | "executions">("closed");

  useEffect(() => {
    void Promise.all([client.history(), client.executions()]).then(([h, e]) => {
      setClosed(h.closedPositions);
      setExecutions(e.executions);
    });
  }, []);

  return (
    <PanelCard>
      <div className="mb-4 flex gap-4 border-b border-slate-200">
        {(
          [
            ["closed", "Closed Positions", closed.length],
            ["executions", "Executions", executions.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 px-2 pb-2 text-xs font-bold uppercase tracking-wide ${
              tab === key ? "border-[#4a9b8e] text-[#3d5367]" : "border-transparent text-slate-400"
            }`}
          >
            {label} {count > 0 ? `(${count})` : ""}
          </button>
        ))}
      </div>

      {tab === "closed" ? (
        closed.length === 0 ? (
          <p className="py-8 text-center text-slate-500">No closed trades yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-400">
                  <th className="pb-2 pr-3">Asset</th>
                  <th className="pb-2 pr-3">Qty</th>
                  <th className="pb-2 pr-3">Entry</th>
                  <th className="pb-2 pr-3">Exit</th>
                  <th className="pb-2 pr-3">Commission</th>
                  <th className="pb-2 pr-3">PNL</th>
                  <th className="pb-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2.5 font-semibold">{p.symbol}</td>
                    <td className="py-2.5">{p.qty}</td>
                    <td className="py-2.5 font-mono">{fmtPrice(p.entry_price)}</td>
                    <td className="py-2.5 font-mono">{p.exit_price != null ? fmtPrice(p.exit_price) : "—"}</td>
                    <td className="py-2.5">
                      {currency} {(p.commission ?? 0).toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 font-semibold ${(p.pnl ?? 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {p.pnl != null ? fmtMoney(currency, p.pnl) : "—"}
                    </td>
                    <td className="py-2.5 text-slate-500">{p.closed_at?.slice(0, 10) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : executions.length === 0 ? (
        <p className="py-8 text-center text-slate-500">No executions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate-400">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Symbol</th>
                <th className="pb-2 pr-3">Side</th>
                <th className="pb-2 pr-3">Qty</th>
                <th className="pb-2 pr-3">Price</th>
                <th className="pb-2">Notional</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((e) => (
                <tr key={e.id} className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-500">{e.created_at.slice(0, 10)}</td>
                  <td className="py-2.5 font-semibold">{e.symbol}</td>
                  <td
                    className={`py-2.5 font-semibold ${e.side === "BUY" ? "text-emerald-600" : "text-red-500"}`}
                  >
                    {e.side}
                  </td>
                  <td className="py-2.5">{e.qty}</td>
                  <td className="py-2.5 font-mono">{fmtPrice(e.fill_price)}</td>
                  <td className="py-2.5">{fmtMoney(currency, e.notional)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelCard>
  );
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:p-6">{children}</div>;
}

function InfoBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: "APPROVED" | "PENDING" | "REJECTED" }) {
  const styles = {
    APPROVED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${styles[status]}`}>{status}</span>
  );
}

function DocStatusBadge({ status }: { status: UserDocument["status"] }) {
  const map = { pending: "PENDING", approved: "APPROVED", rejected: "REJECTED" } as const;
  return <StatusBadge status={map[status]} />;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
