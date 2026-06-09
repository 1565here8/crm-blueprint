import {
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { client, fmtMoney, type CrmUser, type CrmUserPatch, ACCOUNT_CURRENCIES } from "../../../api/client";
import { ErrorBanner, fmtDate, inputCls, Panel } from "../../../components/admin/CrmShell";
import { CountrySelect } from "../../../components/admin/CountrySelect";
import { countryLabel } from "../../../lib/crmCountries";
import { UserActionPanel } from "../../../components/admin/UserActionPanel";
import { useAuth } from "../../../context/AuthContext";
import { UserMoneyTab } from "./UserMoneyTab";
import {
  UserActivityTab,
  UserBalanceTab,
  UserDocsTab,
  UserNotesTab,
  UserSettingsTab,
  UserTradesTab,
} from "./UserProfileTabPanels";
import { UserOverviewTab } from "./UserOverviewTab";
import { ClientAgentOwnerCard } from "../../../components/admin/crm/ClientAgentOwnerCard";
import { CrmPageLayout } from "../../../components/admin/crm/CrmPageLayout";
import { curioni } from "../../../lib/curioniDesign";

type Tab = "overview" | "profile" | "money" | "trades" | "docs" | "notes" | "settings" | "activity" | "balance";

const TABS: { id: Tab; label: string; icon?: React.ReactNode }[] = [
  { id: "overview", label: "360° Overview" },
  { id: "profile", label: "Profile" },
  { id: "money", label: "$ Money", icon: <DollarSign size={12} /> },
  { id: "trades", label: "Trades" },
  { id: "docs", label: "Docs" },
  { id: "notes", label: "Notes/Emails" },
  { id: "settings", label: "Settings" },
  { id: "activity", label: "Activity Log" },
  { id: "balance", label: "Balance" },
];

function FieldRow({
  label,
  value,
  editing,
  onChange,
  type = "text",
  variant = "text",
}: {
  label: string;
  value: string;
  editing?: boolean;
  onChange?: (v: string) => void;
  type?: string;
  variant?: "text" | "country";
}) {
  return (
    <div className="flex border-b border-[#f0f0f0] py-1.5 text-sm last:border-0">
      <span className="w-[42%] shrink-0 text-slate-500">{label}</span>
      {editing && onChange ? (
        variant === "country" ? (
          <CountrySelect
            className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-0.5 text-sm text-slate-800 outline-none focus:border-teal-500"
            value={value}
            onChange={onChange}
            placeholder="Select country…"
          />
        ) : (
          <input
            type={type}
            className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-0.5 text-slate-800 outline-none focus:border-teal-500"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      ) : (
        <span className="min-w-0 flex-1 break-words text-slate-800">
          {variant === "country" ? countryLabel(value) : value || "—"}
        </span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel className="h-full">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
        <h3 className="text-sm font-semibold text-[#555]">{title}</h3>
      </div>
      <div className="px-4 py-2">{children}</div>
    </Panel>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h4 className="font-semibold text-slate-800">{title}</h4>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function userToDraft(u: CrmUser): CrmUserPatch {
  return {
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phone: u.phone,
    phone2: u.phone2,
    address: u.address,
    address1: u.address1,
    city: u.city,
    state: u.state,
    zipCode: u.zipCode,
    countryCode: u.countryCode,
    nationality: u.nationality,
    birthday: u.birthday,
    currency: u.currency,
    agentName: u.agentName,
    desk: u.desk,
    crmStatus: u.crmStatus,
    tradingStatus: u.tradingStatus,
    text1: u.text1,
    partner: u.partner,
    campaign: u.campaign,
    affiliate: u.affiliate,
    campaignId: u.campaignId,
    cpa: u.cpa,
    cpl: u.cpl,
    param1: u.param1,
    username: u.username,
    exchangeSpread: u.exchangeSpread ?? 0,
  };
}

function spreadLabel(v: number): string {
  if (v === 0) return "neutral (+0%)";
  const pct = (Math.abs(v) * 0.1).toFixed(1);
  return v > 0 ? `favor trader (+${pct}%)` : `against trader (-${pct}%)`;
}

function spreadColor(v: number): string {
  if (v === 0) return "text-slate-700";
  return v > 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold";
}

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refresh: refreshAuth } = useAuth();
  const [user, setUser] = useState<CrmUser | null>(null);
  const [adjacent, setAdjacent] = useState<{ prevId: string | null; nextId: string | null }>({
    prevId: null,
    nextId: null,
  });
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CrmUserPatch>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"note" | "email" | "password" | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pitchOpen, setPitchOpen] = useState(false);
  const [pitchLoading, setPitchLoading] = useState(false);
  const [pitchReply, setPitchReply] = useState<{ text: string; ok: boolean; degraded?: string } | null>(null);
  const [agentOptions, setAgentOptions] = useState<string[]>([]);

  async function generatePitch() {
    if (!id) return;
    setPitchLoading(true);
    setPitchReply(null);
    try {
      const r = await client.deskClientPitch(id);
      setPitchReply({ text: r.reply, ok: r.ok, degraded: r.degraded });
    } catch (err) {
      setPitchReply({
        text: "Could not reach the local AI engine.",
        ok: false,
        degraded: err instanceof Error ? err.message : "request failed",
      });
    } finally {
      setPitchLoading(false);
    }
  }

  useEffect(() => {
    if (pitchOpen && !pitchReply && !pitchLoading) {
      void generatePitch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitchOpen]);

  const load = useCallback(async (options?: { resetDraft?: boolean }) => {
    if (!id) return;
    try {
      const data = await client.adminCrmUser(id);
      setUser(data.user);
      setAdjacent(data.adjacent);
      if (options?.resetDraft !== false) {
        setDraft(userToDraft(data.user));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user.");
    }
  }, [id]);

  const refreshNoteEmailMeta = useCallback(async () => {
    if (!id) return;
    try {
      const data = await client.adminCrmUser(id);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              noteCount: data.user.noteCount,
              lastNoteAt: data.user.lastNoteAt,
            }
          : data.user,
      );
      setAdjacent(data.adjacent);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh note stats.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void client.adminCrmUsers({ page: 1, limit: 1 }).then((r) => setAgentOptions(r.agents));
  }, []);

  async function assignOwnerAgent(agentName: string) {
    if (!id) return;
    setSaving(true);
    try {
      const { user: updated } = await client.adminUpdateCrmUser(id, { agentName });
      setUser(updated);
      setDraft(userToDraft(updated));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent assignment failed.");
    } finally {
      setSaving(false);
    }
  }

  function patchDraft(p: Partial<CrmUserPatch>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  async function saveProfile() {
    if (!id) return;
    setSaving(true);
    try {
      const { password: _password, ...profilePatch } = draft;
      const { user: updated } = await client.adminUpdateCrmUser(id, profilePatch);
      setUser(updated);
      setDraft(userToDraft(updated));
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleExtRequired() {
    if (!id || !user) return;
    try {
      const { user: updated } = await client.adminUpdateCrmUser(id, {
        extDocsRequired: !user.extDocsRequired,
      });
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function submitNote() {
    if (!id || !noteBody.trim()) return;
    try {
      await client.adminCreateCrmNote({ userId: id, body: noteBody.trim() });
      setModal(null);
      setNoteBody("");
      void refreshNoteEmailMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Note failed.");
    }
  }

  async function submitEmail() {
    if (!id || !emailSubject.trim() || !emailBody.trim()) return;
    try {
      await client.adminCreateCrmEmail({
        userId: id,
        subject: emailSubject.trim(),
        body: emailBody.trim(),
      });
      setModal(null);
      setEmailSubject("");
      setEmailBody("");
      void refreshNoteEmailMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email failed.");
    }
  }

  async function submitPassword() {
    if (!id || newPassword.length < 6) return;
    try {
      const { user: updated } = await client.adminUpdateCrmUser(id, { password: newPassword });
      setUser(updated);
      setModal(null);
      setNewPassword("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    }
  }

  async function loginAsClient() {
    if (!id) return;
    try {
      await client.adminImpersonateUser(id);
      await refreshAuth();
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open client portal.");
    }
  }

  if (!user && !error) {
    return <p className="text-slate-400">Loading user…</p>;
  }

  if (!user) {
    return (
      <div>
        <ErrorBanner message={error} />
        <Link to="/admin/crm/users" className="text-sm text-teal-600">
          ← Back to Users
        </Link>
      </div>
    );
  }

  const d = editing ? draft : user;
  const green = "text-emerald-600 font-medium";
  const money = (n: number) => fmtMoney(user.currency, n);

  return (
    <CrmPageLayout wide>
    <div className="relative">
      <ErrorBanner message={error} />

      <ClientAgentOwnerCard
        user={user}
        agents={agentOptions}
        saving={saving}
        onAssign={(agentName) => void assignOwnerAgent(agentName)}
      />

      {/* Header */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">
              {user.fullName || user.username}
            </h1>
            <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Live
            </span>
            {user.extDocsRequired ? (
              <span className="rounded bg-[#5bc0de] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Ext. Required
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">{user.username}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
            {user.address ? (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {user.address}
              </span>
            ) : null}
            {user.phone ? (
              <span className="flex items-center gap-1">
                <Phone size={12} /> {user.phone}
              </span>
            ) : null}
            {user.email ? (
              <span className="flex items-center gap-1">
                <Mail size={12} /> {user.email}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <User size={12} /> Agent: {user.agentName}
            </span>
            <span>Currency: {user.currency}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPitchOpen(true)}
            className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
            title="Generate AI pitch script for this client"
          >
            <BrainCircuit size={14} /> Generate Pitch
          </button>
          <button
            type="button"
            onClick={() => void loginAsClient()}
            className="rounded bg-[#1a3a7a] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#152f66]"
          >
            View client portal
          </button>
          {adjacent.prevId ? (
            <Link
              to={`/admin/crm/users/${adjacent.prevId}`}
              className="flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-[#f5f5f5]"
            >
              <ChevronLeft size={14} /> Previous
            </Link>
          ) : null}
          {adjacent.nextId ? (
            <Link
              to={`/admin/crm/users/${adjacent.nextId}`}
              className="flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-[#f5f5f5]"
            >
              Next <ChevronRight size={14} />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className={`mb-4 flex flex-wrap gap-0 overflow-hidden ${curioni.tabBar}`}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-4 py-2.5 text-sm transition-colors ${
              tab === t.id ? curioni.tabActive : "text-white/90 hover:bg-white/10"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content + action bubble */}
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          {tab === "overview" ? (
            <UserOverviewTab
              user={user}
              onNote={() => setModal("note")}
              onEmail={() => setModal("email")}
              onPitch={() => setPitchOpen(true)}
            />
          ) : tab === "profile" ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <Section title="User">
                <FieldRow label="Id" value={String(user.displayId)} />
                <FieldRow
                  label="First Name"
                  value={d.firstName ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ firstName: v })}
                />
                <FieldRow
                  label="Last Name"
                  value={d.lastName ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ lastName: v })}
                />
                <FieldRow
                  label="Email"
                  value={d.email ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ email: v })}
                />
                <FieldRow
                  label="Username"
                  value={d.username ?? user.username}
                  editing={editing}
                  onChange={(v) => patchDraft({ username: v })}
                />
                {editing ? (
                  <div className="flex border-b border-[#f0f0f0] py-1.5 text-sm">
                    <span className="w-[42%] shrink-0 text-slate-500">Currency</span>
                    <select
                      className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-0.5 text-slate-800 focus:border-teal-500 focus:outline-none"
                      value={d.currency ?? "USD"}
                      onChange={(e) => patchDraft({ currency: e.target.value })}
                    >
                      {ACCOUNT_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <FieldRow label="Currency" value={user.currency || "USD"} />
                )}
                <FieldRow
                  label="Agent"
                  value={d.agentName ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ agentName: v })}
                />
                <FieldRow
                  label="Desk"
                  value={d.desk ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ desk: v })}
                />
                <FieldRow
                  label="Status"
                  value={d.crmStatus ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ crmStatus: v })}
                />
                <FieldRow
                  label="Trading Status"
                  value={d.tradingStatus ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ tradingStatus: v })}
                />
                <FieldRow
                  label="Text1"
                  value={d.text1 ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ text1: v })}
                />
              </Section>

              <Section title="Contact">
                <FieldRow
                  label="Phone"
                  value={d.phone ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ phone: v })}
                />
                <FieldRow
                  label="Phone 2"
                  value={d.phone2 ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ phone2: v })}
                />
                <FieldRow
                  label="Address"
                  value={d.address ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ address: v })}
                />
                <FieldRow
                  label="Address1"
                  value={d.address1 ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ address1: v })}
                />
                <FieldRow
                  label="Zip code"
                  value={d.zipCode ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ zipCode: v })}
                />
                <FieldRow
                  label="City"
                  value={d.city ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ city: v })}
                />
                <FieldRow
                  label="State"
                  value={d.state ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ state: v })}
                />
                <FieldRow
                  label="Country"
                  value={d.countryCode ?? ""}
                  editing={editing}
                  variant="country"
                  onChange={(v) => patchDraft({ countryCode: v })}
                />
                <FieldRow
                  label="Nationality"
                  value={d.nationality ?? ""}
                  editing={editing}
                  variant="country"
                  onChange={(v) => patchDraft({ nationality: v })}
                />
                <FieldRow
                  label="Birthday"
                  value={d.birthday ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ birthday: v })}
                />
              </Section>

              <Section title="Balance">
                <FieldRow label="Total Balance" value={money(user.cashBalance)} />
                <div className="flex border-b border-[#f0f0f0] py-1.5 text-sm">
                  <span className="w-[42%] text-slate-500">Cash Balance</span>
                  <span className={green}>{money(user.cashBalance)}</span>
                </div>
                <div className="flex border-b border-[#f0f0f0] py-1.5 text-sm">
                  <span className="w-[42%] text-slate-500">Bonus Balance</span>
                  <span className={green}>{money(user.bonusBalance)}</span>
                </div>
                <FieldRow label="Equity" value={money(user.equity)} />
                <FieldRow label="Clean Closed P&L" value={money(user.totalClosedPnl)} />
                <FieldRow label="Clean Open P&L" value={money(user.totalOpenPnl)} />
                <FieldRow label="Platform Credits" value={String(user.credits)} />
              </Section>

              <Section title="Tracking">
                <FieldRow
                  label="Affiliate"
                  value={d.affiliate ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ affiliate: v })}
                />
                <FieldRow
                  label="Campaign ID"
                  value={d.campaignId ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ campaignId: v })}
                />
                <FieldRow
                  label="Campaign"
                  value={d.campaign ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ campaign: v })}
                />
                <FieldRow
                  label="CPA"
                  value={d.cpa ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ cpa: v })}
                />
                <FieldRow
                  label="CPL"
                  value={d.cpl ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ cpl: v })}
                />
                <FieldRow
                  label="Partner"
                  value={d.partner ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ partner: v })}
                />
                <FieldRow label="Registration" value={fmtDate(user.createdAt)} />
                <FieldRow
                  label="Last Login"
                  value={user.lastLoginAt ? fmtDate(user.lastLoginAt) : "—"}
                />
                <FieldRow label="Imported source" value={user.importedSource || "—"} />
                <FieldRow
                  label="Param 1"
                  value={d.param1 ?? ""}
                  editing={editing}
                  onChange={(v) => patchDraft({ param1: v })}
                />
              </Section>

              <Section title="Cashier">
                <div className="flex border-b border-[#f0f0f0] py-1.5 text-sm">
                  <span className="w-[42%] text-slate-500">Total Deposits</span>
                  <span className={green}>{money(user.totalDeposits)}</span>
                </div>
                <FieldRow label="Total Adjustments" value={money(user.totalAdjustments)} />
                <FieldRow label="Total Bonuses" value={money(user.totalBonuses)} />
                <FieldRow label="Approved Withdrawals" value={money(user.approvedWithdrawals)} />
                <FieldRow label="Pending Withdrawals" value={money(user.pendingWithdrawals)} />
                <div className="mt-2 flex flex-col gap-1 border-t border-[#f0f0f0] pt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-[42%] text-slate-500">Exchange Spread</span>
                    {editing ? (
                      <select
                        className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-slate-800 focus:border-teal-500 focus:outline-none"
                        value={String(d.exchangeSpread ?? 0)}
                        onChange={(e) => patchDraft({ exchangeSpread: Number(e.target.value) })}
                      >
                        {[5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5].map((n) => (
                          <option key={n} value={n}>
                            {n > 0 ? `+${n}` : n} — {spreadLabel(n)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`min-w-0 flex-1 ${spreadColor(user.exchangeSpread ?? 0)}`}>
                        {(user.exchangeSpread ?? 0) > 0 ? `+${user.exchangeSpread}` : user.exchangeSpread ?? 0}{" "}
                        — {spreadLabel(user.exchangeSpread ?? 0)}
                      </span>
                    )}
                  </div>
                  <p className="pl-[42%] text-[11px] leading-tight text-slate-400">
                    Adjusts every BUY/SELL fill price by ±0.1% per unit. Use to fix glitched trades or simulate
                    win/loss outcomes on this account.
                  </p>
                </div>
              </Section>

              <Section title="Trading">
                <FieldRow label="Total Volume Traded" value={money(user.totalVolume)} />
                <FieldRow label="Total Closed P&L" value={money(user.totalClosedPnl)} />
                <FieldRow label="Total Open P&L" value={money(user.totalOpenPnl)} />
              </Section>
            </div>
          ) : tab === "money" ? (
            <UserMoneyTab user={user} onReload={() => void load({ resetDraft: false })} />
          ) : tab === "trades" ? (
            <UserTradesTab userId={user.id} username={user.username} displayId={user.displayId} />
          ) : tab === "notes" ? (
            <UserNotesTab userId={user.id} onAddNote={() => setModal("note")} />
          ) : tab === "balance" ? (
            <UserBalanceTab user={user} />
          ) : tab === "activity" ? (
            <UserActivityTab userId={user.id} />
          ) : tab === "docs" ? (
            <UserDocsTab user={user} onToggleExtDocs={() => void toggleExtRequired()} />
          ) : tab === "settings" ? (
            <UserSettingsTab
              user={user}
              onEditProfile={() => {
                setTab("profile");
                setEditing(true);
              }}
            />
          ) : null}
        </div>

        <UserActionPanel
          extDocsRequired={user.extDocsRequired}
          editing={editing}
          saving={saving}
          onExtRequired={() => void toggleExtRequired()}
          onNote={() => setModal("note")}
          onEmail={() => setModal("email")}
          onEdit={() => {
            if (editing) return;
            setDraft(userToDraft(user));
            setEditing(true);
            setTab("profile");
          }}
          onResetPassword={() => setModal("password")}
          onLoginAsClient={() => void loginAsClient()}
          onSave={() => void saveProfile()}
          onCancelEdit={() => {
            setEditing(false);
            setDraft(userToDraft(user));
          }}
        />
      </div>

      {modal === "note" ? (
        <Modal title="Add Note" onClose={() => setModal(null)}>
          <textarea
            className={`${inputCls} mb-3 min-h-[120px]`}
            placeholder="Note text…"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button type="button" className="w-full rounded bg-teal-600 py-2 text-sm text-white" onClick={() => void submitNote()}>
            Save Note
          </button>
        </Modal>
      ) : null}

      {modal === "email" ? (
        <Modal title="Send Email" onClose={() => setModal(null)}>
          <input
            className={`${inputCls} mb-2`}
            placeholder="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
          />
          <textarea
            className={`${inputCls} mb-3 min-h-[120px]`}
            placeholder="Email body…"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
          />
          <button type="button" className="w-full rounded bg-teal-600 py-2 text-sm text-white" onClick={() => void submitEmail()}>
            Log Email
          </button>
        </Modal>
      ) : null}

      {modal === "password" ? (
        <Modal title="Reset Password" onClose={() => setModal(null)}>
          <input
            type="password"
            className={`${inputCls} mb-3`}
            placeholder="New password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            className="w-full rounded bg-teal-600 py-2 text-sm text-white"
            disabled={newPassword.length < 6}
            onClick={() => void submitPassword()}
          >
            Reset Password
          </button>
        </Modal>
      ) : null}

      {pitchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-emerald-500/30 bg-black shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 to-black px-4 py-3">
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} className="text-emerald-400" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500">The Desk</p>
                  <h3 className="text-sm font-bold text-emerald-200">
                    Pitch Script · #{user.displayId} {user.fullName || user.username}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void generatePitch()}
                  disabled={pitchLoading}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {pitchLoading ? "Regenerating…" : "Regenerate"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPitchOpen(false);
                    setPitchReply(null);
                  }}
                  className="rounded-md p-1.5 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-black px-4 py-3">
              {pitchLoading && !pitchReply ? (
                <div className="flex items-center gap-2 text-[12px] text-emerald-400">
                  <Loader2 size={14} className="animate-spin" /> Generating tailored script…
                </div>
              ) : (
                <pre
                  className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.6] text-emerald-200"
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}
                >
                  {pitchReply?.text ?? "—"}
                </pre>
              )}
              {pitchReply?.degraded ? (
                <p className="mt-3 rounded border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-300">
                  {pitchReply.degraded}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between border-t border-emerald-500/20 bg-black/60 px-4 py-2">
              <span className="text-[10px] text-emerald-500/70">Stateless · offline · no retention</span>
              <button
                type="button"
                onClick={() => {
                  if (pitchReply?.text) {
                    void navigator.clipboard.writeText(pitchReply.text);
                  }
                }}
                disabled={!pitchReply?.text}
                className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </CrmPageLayout>
  );
}
