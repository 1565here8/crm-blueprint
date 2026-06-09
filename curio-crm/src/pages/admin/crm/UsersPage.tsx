import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, Columns3, GripVertical, Settings, SlidersHorizontal, UserPlus } from "lucide-react";
import { client, ACCOUNT_CURRENCIES, type AccountCurrency, type CrmUser, type CrmUserPatch } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { CountrySelect } from "../../../components/admin/CountrySelect";
import { CrmColumnPicker } from "../../../components/admin/crm/CrmColumnPicker";
import { CrmDeskSidePanel } from "../../../components/admin/crm/CrmDeskSidePanel";
import { AssignAgentToolbar } from "../../../components/admin/crm/AssignAgentToolbar";
import { AgentAssignSelect } from "../../../components/admin/crm/AgentAssignSelect";
import { CrmUsersTable } from "../../../components/admin/crm/CrmUsersTable";
import { SyncedHorizontalScroll } from "../../../components/admin/crm/SyncedHorizontalScroll";
import { CrmHero, CrmPageLayout } from "../../../components/admin/crm/CrmPageLayout";
import { countryLabel } from "../../../lib/crmCountries";
import { notifyAdmin } from "../../../lib/adminToastBus";
import {
  allowedBulkFields,
  canCustomizeColumns,
  collapseUmbrellaGroup,
  expandUmbrellaGroup,
  isUmbrellaGroupCollapsed,
  loadColumnLayout,
  loadDeskPanelOpen,
  orderedColumnSlots,
  reorderColumnLayout,
  resolveCrmDeskRole,
  roleColumnHint,
  saveColumnLayout,
  saveDeskPanelOpen,
  setColumnWidth,
  showColumnAdjacent,
  toggleColumnHidden,
  type CrmColumnLayout,
} from "../../../lib/crmUsersTableColumns";
import {
  btnGreen,
  btnPrimary,
  DataTable,
  ErrorBanner,
  fmtCrmRange,
  fmtCrmRegistration,
  inputCls,
} from "../../../components/admin/CrmShell";
import { BROKER_PIPELINE_STATUS_NAMES } from "../../../../shared/crmPipelineStatuses";

const PAGE_SIZES = [10, 25, 50, 100, 500] as const;

const TRADING_STATUSES = ["Enabled", "Disabled"] as const;

type BulkScope = "checked" | "page" | "all";

const emptyBulkPatch = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  phone2: "",
  countryCode: "",
  nationality: "",
  agentName: "",
  desk: "",
  crmStatus: "",
  tradingStatus: "",
  param1: "",
  partner: "",
  campaign: "",
  affiliate: "",
  campaignId: "",
  cpa: "",
  cpl: "",
  comments: "",
  funnel: "",
  conversionRate: "",
  playerValue: "",
  importedSource: "",
  currency: "" as "" | AccountCurrency,
  text1: "",
  address: "",
  address1: "",
  city: "",
  state: "",
  zipCode: "",
  birthday: "",
});

const emptyCreateForm = () => ({
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  countryCode: "",
  agentName: "Admin Broker",
  crmStatus: "New",
  param1: "",
  currency: "USD" as const,
  initialBalance: "100000",
});

export function UsersPage() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const deskRole = useMemo(() => resolveCrmDeskRole(authUser), [authUser]);
  const canEditColumns = canCustomizeColumns(deskRole);
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [total, setTotal] = useState(0);
  const [agents, setAgents] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deskPanelOpen, setDeskPanelOpen] = useState(() => loadDeskPanelOpen(deskRole));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkPatch, setBulkPatch] = useState(emptyBulkPatch);
  const [bulkScope, setBulkScope] = useState<BulkScope>("checked");
  const [bulkEditError, setBulkEditError] = useState<string | null>(null);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [columnLayout, setColumnLayout] = useState<CrmColumnLayout>(() => loadColumnLayout(deskRole));

  useEffect(() => {
    setColumnLayout(loadColumnLayout(deskRole));
    setDeskPanelOpen(loadDeskPanelOpen(deskRole));
  }, [deskRole]);

  function toggleDeskPanel() {
    setDeskPanelOpen((open) => {
      const next = !open;
      saveDeskPanelOpen(deskRole, next);
      return next;
    });
  }
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkQuick, setBulkQuick] = useState({
    agentName: "",
    campaign: "",
    partner: "",
    countryCode: "",
    affiliate: "",
    campaignId: "",
    cpa: "",
    cpl: "",
    comments: "",
    funnel: "",
    conversionRate: "",
    playerValue: "",
    tradingStatus: "",
    param1: "",
    importedSource: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = PAGE_SIZES.includes(Number(searchParams.get("limit")) as (typeof PAGE_SIZES)[number])
    ? Number(searchParams.get("limit"))
    : 10;
  const query = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "";
  const agentFilter = searchParams.get("agent") ?? "";
  const deskIdParam = searchParams.get("deskId") ?? "";
  const deskIdFilter = Number(deskIdParam);
  const sortBy = searchParams.get("sortBy") ?? "display_id";
  const sortDir = (searchParams.get("sortDir") === "asc" ? "asc" : "desc") as "asc" | "desc";

  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    void client
      .adminCrmStatuses()
      .then((r) => setStatuses(r.statuses?.length ? r.statuses : BROKER_PIPELINE_STATUS_NAMES))
      .catch(() => setStatuses(BROKER_PIPELINE_STATUS_NAMES));
  }, []);

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    try {
      const data = await client.adminCrmUsers({
        page,
        limit,
        search: query || undefined,
        status: statusFilter || undefined,
        agent: agentFilter || undefined,
        deskId: Number.isFinite(deskIdFilter) && deskIdFilter > 0 ? deskIdFilter : undefined,
        sortBy,
        sortDir,
      });
      setUsers(data.users);
      setTotal(data.total);
      setAgents(data.agents);
      setDateRange(data.dateRange);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    }
  }, [page, limit, query, statusFilter, agentFilter, deskIdParam, sortBy, sortDir]);

  useEffect(() => {
    setSelected(new Set());
  }, [query, statusFilter, agentFilter, deskIdParam, page, limit]);

  useEffect(() => {
    if (showBulkEdit || bulkBusy) return;
    void load();
    const id = setInterval(() => void load(), 12000);
    return () => clearInterval(id);
  }, [load, showBulkEdit, bulkBusy]);

  async function handleImport(file: File) {
    setError(null);
    setImportMsg(null);
    const csv = await file.text();
    try {
      const result = await client.adminImportCrmUsers(csv);
      const errLines = result.errors.slice(0, 5).map((e) => `Line ${e.line}: ${e.error}`);
      const mapped =
        result.columnMapping && Object.keys(result.columnMapping).length
          ? ` Mapped: ${Object.entries(result.columnMapping)
              .map(([k, v]) => `${v}→${k.replace(/_/g, " ")}`)
              .join(", ")}.`
          : "";
      setImportMsg(
        `Imported ${result.imported} user(s)${result.errors.length ? ` · ${result.errors.length} row error(s)` : ""}.${mapped}` +
          (errLines.length ? ` ${errLines.join(" · ")}` : ""),
      );
      if (result.imported === 0 && result.errors.length > 0) {
        setError(`Import completed with 0 new users. ${errLines[0] ?? "Check CSV headers and data."}`);
      }
      patchParams({ page: "1" });
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  async function updateUserField(userId: string, patch: CrmUserPatch) {
    setSavingId(userId);
    try {
      const { user } = await client.adminUpdateCrmUser(userId, patch);
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function updateStatus(userId: string, crmStatus: string) {
    await updateUserField(userId, { crmStatus });
  }

  async function updateCountry(userId: string, countryCode: string) {
    if (!countryCode) return;
    setSavingId(userId);
    try {
      const { user } = await client.adminUpdateCrmUser(userId, { countryCode });
      setUsers((prev) => prev.map((u) => (u.id === userId ? user : u)));
      setImportMsg(`Country set to ${countryLabel(countryCode)} for #${user.displayId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Country update failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function selectAllMatching() {
    setBulkBusy(true);
    try {
      const { ids } = await client.adminCrmUserIds({
        search: query || undefined,
        status: statusFilter || undefined,
        agent: agentFilter || undefined,
      });
      setSelected(new Set(ids));
      setImportMsg(`Selected all ${ids.length.toLocaleString()} matching user(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Select all failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDeleteSelected() {
    if (selected.size === 0) return;
    const n = selected.size;
    if (!window.confirm(`Permanently delete ${n.toLocaleString()} selected client(s)? This cannot be undone.`)) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    try {
      const result = await client.adminBulkCrmDelete([...selected]);
      setImportMsg(
        `Deleted ${result.deleted} client(s)${result.skipped ? ` · ${result.skipped} skipped (admin accounts)` : ""}.`,
      );
      setSelected(new Set());
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed.");
    } finally {
      setBulkBusy(false);
    }
  }


  function bulkScopeCount(scope: BulkScope): number {
    if (scope === "page") return users.length;
    if (scope === "all") return total;
    return selected.size;
  }

  async function runBulkUpdate(scope: BulkScope, patch: CrmUserPatch) {
    setBulkBusy(true);
    setError(null);
    setBulkEditError(null);
    try {
      const result = await client.adminBulkCrmUpdateScoped({
        scope,
        userIds: scope === "checked" ? [...selected] : undefined,
        page,
        limit,
        search: query || undefined,
        status: statusFilter || undefined,
        agent: agentFilter || undefined,
        patch,
      });
      if (result.updated === 0) {
        const msg = `No users were updated (${result.targeted} targeted). Check scope and fields.`;
        setBulkEditError(msg);
        setError(msg);
        return false;
      }
      setImportMsg(`Updated ${result.updated.toLocaleString()} of ${result.targeted.toLocaleString()} user(s).`);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Bulk update failed.";
      setBulkEditError(msg);
      setError(msg);
      return false;
    } finally {
      setBulkBusy(false);
    }
  }

  function buildBulkPatchPayload(): CrmUserPatch {
    const patch: CrmUserPatch = {};
    for (const [k, v] of Object.entries(bulkPatch)) {
      if (k === "currency") {
        if (v === "USD" || v === "EUR" || v === "GBP") patch.currency = v;
        continue;
      }
      if (typeof v === "string" && v.trim()) (patch as Record<string, string>)[k] = v.trim();
    }
    return patch;
  }

  async function applyBulkEdit(e: React.FormEvent) {
    e.preventDefault();
    const patch = buildBulkPatchPayload();
    if (Object.keys(patch).length === 0) {
      setBulkEditError("Fill at least one field to apply.");
      return;
    }
    if (bulkScopeCount(bulkScope) === 0) {
      setBulkEditError("No users in scope. Choose Current page or All matching filters.");
      return;
    }
    const ok = await runBulkUpdate(bulkScope, patch);
    if (ok) {
      setShowBulkEdit(false);
      setBulkPatch(emptyBulkPatch());
      setBulkEditError(null);
      void load();
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.username.trim() || createForm.password.length < 6) {
      setError("Username and password (min 6 chars) are required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { user } = await client.adminCreateUser({
        username: createForm.username.trim(),
        password: createForm.password,
        firstName: createForm.firstName.trim() || undefined,
        lastName: createForm.lastName.trim() || undefined,
        email: createForm.email.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        countryCode: createForm.countryCode.trim() || undefined,
        agentName: createForm.agentName.trim() || undefined,
        crmStatus: createForm.crmStatus || undefined,
        param1: createForm.param1.trim() || undefined,
        currency: createForm.currency,
        initialBalance: Number(createForm.initialBalance) || 0,
      });
      setShowCreate(false);
      setCreateForm(emptyCreateForm());
      setImportMsg(`User #${user.displayId} created.`);
      navigate(`/admin/crm/users/${user.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create user failed.");
    } finally {
      setCreating(false);
    }
  }

  function patchCreate(field: keyof ReturnType<typeof emptyCreateForm>, value: string) {
    setCreateForm((f) => ({ ...f, [field]: value }));
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      patchParams({ sortDir: sortDir === "asc" ? "desc" : "asc", page: "1" });
    } else {
      patchParams({ sortBy: field, sortDir: "desc", page: "1" });
    }
  }

  const pages = Math.max(1, Math.ceil(total / limit));
  const pageNums = useMemo(() => buildPageNumbers(page, pages), [page, pages]);
  const allSelected = users.length > 0 && users.every((u) => selected.has(u.id));

  const knownCampaigns = useMemo(
    () => [...new Set(users.map((u) => u.campaign).filter(Boolean))].sort(),
    [users],
  );
  const knownAffiliates = useMemo(
    () => [...new Set(users.map((u) => u.affiliate).filter(Boolean))].sort(),
    [users],
  );
  const knownCampaignIds = useMemo(
    () => [...new Set(users.map((u) => u.campaignId).filter(Boolean))].sort(),
    [users],
  );
  const knownPartners = useMemo(
    () => [...new Set(users.map((u) => u.partner).filter(Boolean))].sort(),
    [users],
  );
  const knownSources = useMemo(
    () => [...new Set(users.map((u) => u.importedSource).filter(Boolean))].sort(),
    [users],
  );
  const columnSlots = useMemo(() => orderedColumnSlots(columnLayout, deskRole), [columnLayout, deskRole]);
  const umbrellaCollapsed = useMemo(
    () => isUmbrellaGroupCollapsed(columnLayout, deskRole),
    [columnLayout, deskRole],
  );
  const canAssignAgent = useMemo(() => allowedBulkFields(deskRole).has("agentName"), [deskRole]);

  const persistColumnLayout = useCallback(
    (next: CrmColumnLayout, toast?: string) => {
      setColumnLayout(next);
      saveColumnLayout(next, deskRole);
      if (toast) notifyAdmin(toast, "success");
    },
    [deskRole],
  );

  async function quickBulk(patch: CrmUserPatch) {
    if (bulkScopeCount(bulkScope) === 0) {
      setError("No users in scope. Choose Current page or check some rows.");
      return;
    }
    const ok = await runBulkUpdate(bulkScope, patch);
    if (ok) void load();
  }

  return (
    <CrmPageLayout wide>
      <CrmHero
        eyebrow="Users · All clients"
        title="All Clients"
        subtitle={`${total.toLocaleString()} in view · ${fmtCrmRange(dateRange.from, dateRange.to)} · assign owner from the green bar or Agent column.`}
        actions={
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowCreate(true);
            }}
            className={`flex items-center gap-1.5 ${btnGreen}`}
          >
            <UserPlus size={14} />
            Create User
          </button>
          {canEditColumns ? (
            <button
              type="button"
              onClick={() => setShowColumnPicker(true)}
              className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Columns3 size={14} />
              Columns
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (!deskPanelOpen) {
                setDeskPanelOpen(true);
                saveDeskPanelOpen(deskRole, true);
              } else toggleDeskPanel();
            }}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs ${
              deskPanelOpen
                ? "border-teal-300 bg-teal-50 text-teal-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={14} />
            Desk panel
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => fileRef.current?.click()}
          >
            <Settings size={14} />
            Import CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = "";
            }}
          />
          </div>
        }
      />

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12">
          <form
            onSubmit={(e) => void handleCreateUser(e)}
            className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="font-semibold text-slate-800">Create User</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="block text-xs text-slate-500 sm:col-span-2">
                Username *
                <input
                  required
                  className={`${inputCls} mt-1`}
                  value={createForm.username}
                  onChange={(e) => patchCreate("username", e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-500 sm:col-span-2">
                Password *
                <input
                  required
                  type="password"
                  minLength={6}
                  className={`${inputCls} mt-1`}
                  value={createForm.password}
                  onChange={(e) => patchCreate("password", e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-500">
                First name
                <input
                  className={`${inputCls} mt-1`}
                  value={createForm.firstName}
                  onChange={(e) => patchCreate("firstName", e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Last name
                <input
                  className={`${inputCls} mt-1`}
                  value={createForm.lastName}
                  onChange={(e) => patchCreate("lastName", e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-500 sm:col-span-2">
                Email
                <input
                  type="email"
                  className={`${inputCls} mt-1`}
                  value={createForm.email}
                  onChange={(e) => patchCreate("email", e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Phone
                <input
                  className={`${inputCls} mt-1`}
                  value={createForm.phone}
                  onChange={(e) => patchCreate("phone", e.target.value)}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Country
                <CountrySelect
                  className={`${inputCls} mt-1`}
                  value={createForm.countryCode}
                  onChange={(v) => patchCreate("countryCode", v)}
                  placeholder="Select country…"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Owner agent
                <div className="mt-1">
                  <AgentAssignSelect
                    agents={agents}
                    value={createForm.agentName}
                    onChange={(v) => patchCreate("agentName", v)}
                    allowEmpty
                    emptyLabel="— pick agent —"
                    className={`${inputCls} w-full`}
                  />
                </div>
              </label>
              <label className="block text-xs text-slate-500">
                Status
                <select
                  className={`${inputCls} mt-1`}
                  value={createForm.crmStatus}
                  onChange={(e) => patchCreate("crmStatus", e.target.value)}
                >
                  {(statuses.length ? statuses : BROKER_PIPELINE_STATUS_NAMES).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-slate-500">
                Account currency *
                <select
                  required
                  className={`${inputCls} mt-1`}
                  value={createForm.currency}
                  onChange={(e) => patchCreate("currency", e.target.value as AccountCurrency)}
                >
                  {ACCOUNT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[10px] text-slate-400">
                  Initial deposit is credited in this currency
                </span>
              </label>
              <label className="block text-xs text-slate-500">
                Initial deposit ({createForm.currency})
                <input
                  type="text"
                  inputMode="decimal"
                  className={`${inputCls} mt-1`}
                  value={createForm.initialBalance}
                  onChange={(e) => patchCreate("initialBalance", e.target.value.replace(/[^\d.]/g, ""))}
                />
              </label>
              <label className="block text-xs text-slate-500">
                Param1
                <input
                  className={`${inputCls} mt-1`}
                  value={createForm.param1}
                  onChange={(e) => patchCreate("param1", e.target.value)}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-[#f5f5f5]"
              >
                Cancel
              </button>
              <button type="submit" disabled={creating} className={btnGreen}>
                {creating ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ErrorBanner message={error} />
      {importMsg ? (
        <p className="mb-4 rounded bg-teal-50 px-3 py-2 text-sm text-teal-800">{importMsg}</p>
      ) : null}

      {showBulkEdit ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
          <form
            onSubmit={(e) => void applyBulkEdit(e)}
            className="w-full max-w-3xl rounded-lg bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div>
                <h2 className="font-semibold text-slate-800">
                  Bulk edit {bulkScopeCount(bulkScope).toLocaleString()} user(s)
                </h2>
                <p className="text-xs text-slate-500">Only filled fields are applied. Leave blank to keep existing values.</p>
              </div>
              <button type="button" onClick={() => setShowBulkEdit(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            {bulkEditError ? (
              <div className="mx-5 mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {bulkEditError}
              </div>
            ) : null}
            <div className="border-b border-slate-100 px-5 py-3">
              <BulkScopePicker scope={bulkScope} onChange={setBulkScope} counts={{ checked: selected.size, page: users.length, all: total }} />
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="rounded-lg border-2 border-teal-200 bg-teal-50/50 p-4 sm:col-span-2">
                <label className="block text-sm font-semibold text-teal-900">
                  Country — choose from list
                  <CountrySelect
                    value={bulkPatch.countryCode}
                    onChange={(v) => setBulkPatch((p) => ({ ...p, countryCode: v }))}
                    placeholder="Click to choose country…"
                  />
                </label>
              </div>
              <label className="block text-xs text-slate-500">
                Affiliate
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.affiliate}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, affiliate: e.target.value }))}
                  placeholder="Affiliate name / ID"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Campaign ID
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.campaignId}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, campaignId: e.target.value }))}
                  placeholder="Campaign identifier"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Campaign
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.campaign}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, campaign: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-slate-500">
                CPA
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.cpa}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, cpa: e.target.value }))}
                  placeholder="Cost per acquisition"
                />
              </label>
              <label className="block text-xs text-slate-500">
                CPL
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.cpl}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, cpl: e.target.value }))}
                  placeholder="Cost per lead"
                />
              </label>
              <label className="block text-xs text-slate-500 sm:col-span-2">
                Comments
                <textarea
                  className={`${inputCls} mt-1 min-h-[60px]`}
                  value={bulkPatch.comments}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, comments: e.target.value }))}
                  placeholder="Broker comment / note"
                />
              </label>
              <label className="block text-xs text-slate-500">
                Funnel
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.funnel}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, funnel: e.target.value }))}
                />
              </label>
              <label className="block text-xs text-slate-500">
                CR (conversion rate)
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.conversionRate}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, conversionRate: e.target.value }))}
                  placeholder="e.g. 100%"
                />
              </label>
              <label className="block text-xs text-slate-500">
                PV (player value)
                <input
                  className={`${inputCls} mt-1`}
                  value={bulkPatch.playerValue}
                  onChange={(e) => setBulkPatch((p) => ({ ...p, playerValue: e.target.value }))}
                  placeholder="Override auto-calculated PV"
                />
              </label>
              {(
                [
                  ["firstName", "First name"],
                  ["lastName", "Last name"],
                  ["email", "Email"],
                  ["phone", "Phone"],
                  ["phone2", "Phone 2"],
                  ["nationality", "Nationality"],
                  ["agentName", "Agent"],
                  ["desk", "Desk"],
                  ["crmStatus", "CRM status"],
                  ["tradingStatus", "Trading status"],
                  ["param1", "Param1"],
                  ["partner", "Partner / IB"],
                  ["importedSource", "Source"],
                  ["text1", "Text1"],
                  ["address", "Address"],
                  ["address1", "Address line 2"],
                  ["city", "City"],
                  ["state", "State"],
                  ["zipCode", "Zip"],
                  ["birthday", "Birthday"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs text-slate-500">
                  {label}
                  {key === "crmStatus" ? (
                    <select
                      className={`${inputCls} mt-1`}
                      value={bulkPatch.crmStatus}
                      onChange={(e) => setBulkPatch((p) => ({ ...p, crmStatus: e.target.value }))}
                    >
                      <option value="">— leave unchanged —</option>
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : key === "tradingStatus" ? (
                    <select
                      className={`${inputCls} mt-1`}
                      value={bulkPatch.tradingStatus}
                      onChange={(e) => setBulkPatch((p) => ({ ...p, tradingStatus: e.target.value }))}
                    >
                      <option value="">— leave unchanged —</option>
                      {TRADING_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : key === "agentName" ? (
                    <select
                      className={`${inputCls} mt-1`}
                      value={bulkPatch.agentName}
                      onChange={(e) => setBulkPatch((p) => ({ ...p, agentName: e.target.value }))}
                    >
                      <option value="">— leave unchanged —</option>
                      {agents.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  ) : key === "nationality" ? (
                    <CountrySelect
                      value={bulkPatch.nationality}
                      onChange={(v) => setBulkPatch((p) => ({ ...p, nationality: v }))}
                      placeholder="— leave unchanged —"
                    />
                  ) : (
                    <input
                      className={`${inputCls} mt-1`}
                      value={bulkPatch[key]}
                      onChange={(e) => setBulkPatch((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  )}
                </label>
              ))}
              <label className="block text-xs text-slate-500 sm:col-span-2">
                Currency
                <select
                  className={`${inputCls} mt-1 max-w-xs`}
                  value={bulkPatch.currency}
                  onChange={(e) =>
                    setBulkPatch((p) => ({ ...p, currency: e.target.value as "" | AccountCurrency }))
                  }
                >
                  <option value="">— leave unchanged —</option>
                  {ACCOUNT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button type="button" onClick={() => setShowBulkEdit(false)} className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
              <button type="submit" disabled={bulkBusy} className={btnGreen}>
                {bulkBusy ? "Applying…" : `Apply to ${bulkScopeCount(bulkScope).toLocaleString()} user(s)`}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-600">
          Show
          <select
            value={limit}
            onChange={(e) => patchParams({ limit: e.target.value, page: "1" })}
            className="rounded border border-slate-200 px-2 py-1 text-sm"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          entries
        </label>
        <div className="flex items-center gap-2">
          <input
            className={`${inputCls} w-56`}
            placeholder="Search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") patchParams({ search: searchInput.trim() || null, page: "1" });
            }}
          />
          <button
            type="button"
            className={btnPrimary}
            onClick={() => patchParams({ search: searchInput.trim() || null, page: "1" })}
          >
            Search
          </button>
        </div>
      </div>

      {showColumnPicker && canEditColumns ? (
        <CrmColumnPicker
          layout={columnLayout}
          role={deskRole}
          onChange={(next) => persistColumnLayout(next, "Change accepted! Column layout saved.")}
          onClose={() => setShowColumnPicker(false)}
        />
      ) : null}

      {canEditColumns ? (
        <p className="mb-2 flex flex-wrap items-center gap-2 rounded border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs text-teal-900">
          <GripVertical size={14} className="shrink-0 text-teal-600" />
          <span className="min-w-0 flex-1">{roleColumnHint(deskRole)}</span>
          {!umbrellaCollapsed ? (
            <button
              type="button"
              className="shrink-0 rounded border border-teal-300 bg-white px-2 py-1 text-[11px] font-semibold text-teal-800 hover:bg-teal-100"
              onClick={() =>
                persistColumnLayout(
                  collapseUmbrellaGroup(columnLayout, deskRole),
                  "Extra columns folded into More.",
                )
              }
            >
              Fold extra columns
            </button>
          ) : null}
        </p>
      ) : null}

      {canAssignAgent ? (
        <AssignAgentToolbar
          agents={agents}
          selectedCount={selected.size}
          busy={bulkBusy}
          onAssign={(agentName) => void quickBulk({ agentName })}
        />
      ) : null}

      <SyncedHorizontalScroll className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-violet-100/50">
        <CrmUsersTable
          users={users}
          columnSlots={columnSlots}
          columnLayout={columnLayout}
          canReorder={canEditColumns}
          onColumnReorder={(fromId, toId) => {
            const next = reorderColumnLayout(columnLayout, deskRole, fromId, toId);
            persistColumnLayout(next, "Change accepted! Column order saved.");
          }}
          onColumnResizePreview={(id, w) => {
            setColumnLayout((prev) => setColumnWidth(prev, id, w));
          }}
          onColumnResizeCommit={(id, w) => {
            const next = setColumnWidth(columnLayout, id, w);
            persistColumnLayout(next, "Change accepted! Column width saved.");
          }}
          onCollapseColumn={(id) => {
            const next = toggleColumnHidden(columnLayout, id);
            persistColumnLayout(next, "Change accepted! Column collapsed.");
          }}
          onExpandColumn={(id) => {
            const next = showColumnAdjacent(columnLayout, id);
            persistColumnLayout(next, "Change accepted! Column restored.");
          }}
          onExpandUmbrella={() => {
            persistColumnLayout(expandUmbrellaGroup(columnLayout, deskRole), "Extra columns opened.");
          }}
          onCollapseUmbrella={() => {
            persistColumnLayout(collapseUmbrellaGroup(columnLayout, deskRole), "Extra columns folded.");
          }}
          selected={selected}
          allSelected={allSelected}
          savingId={savingId}
          statuses={statuses}
          agents={agents}
          sortBy={sortBy}
          sortDir={sortDir}
          onToggleAll={(checked) => {
            if (checked) setSelected(new Set(users.map((u) => u.id)));
            else setSelected(new Set());
          }}
          onToggleRow={(id, checked) => {
            setSelected((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onSort={toggleSort}
          onPatch={(userId, patch) => void updateUserField(userId, patch)}
        />
      </SyncedHorizontalScroll>

      {/* Pagination — Toropros style */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <span>
          Showing {total === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, total)} of{" "}
          {total.toLocaleString()} entries
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <PagerBtn disabled={page <= 1} onClick={() => patchParams({ page: String(page - 1) })}>
            Previous
          </PagerBtn>
          {pageNums.map((n, i) =>
            n === "…" ? (
              <span key={`e-${i}`} className="px-2 text-slate-400">
                …
              </span>
            ) : (
              <PagerBtn
                key={n}
                active={n === page}
                onClick={() => patchParams({ page: String(n) })}
              >
                {n}
              </PagerBtn>
            ),
          )}
          <PagerBtn disabled={page >= pages} onClick={() => patchParams({ page: String(page + 1) })}>
            Next
          </PagerBtn>
        </div>
      </div>
        </div>

        <CrmDeskSidePanel
          open={deskPanelOpen}
          onToggle={toggleDeskPanel}
          role={deskRole}
          selectedCount={selected.size}
          pageCount={users.length}
          total={total}
          statusFilter={statusFilter}
          agentFilter={agentFilter}
          statuses={statuses}
          agents={agents}
          onStatusFilter={(v) => patchParams({ status: v || null, page: "1" })}
          onAgentFilter={(v) => patchParams({ agent: v || null, page: "1" })}
          bulkScope={bulkScope}
          onBulkScope={setBulkScope}
          bulkBusy={bulkBusy}
          bulkQuick={bulkQuick}
          onBulkQuickChange={(patch) => setBulkQuick((q) => ({ ...q, ...patch }))}
          onQuickBulk={(patch) => void quickBulk(patch)}
          onOpenBulkEdit={() => {
            setBulkEditError(null);
            if (bulkScope === "checked" && selected.size === 0) setBulkScope("page");
            setShowBulkEdit(true);
          }}
          onBulkDelete={() => void bulkDeleteSelected()}
          onSelectAllMatching={() => void selectAllMatching()}
          onClearSelection={() => setSelected(new Set())}
          knownAffiliates={knownAffiliates}
          knownCampaignIds={knownCampaignIds}
          knownCampaigns={knownCampaigns}
          knownPartners={knownPartners}
          knownSources={knownSources}
        />
      </div>
    </CrmPageLayout>
  );
}

function SortTh(props: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onSort: () => void;
}) {
  return (
    <th className="px-3 py-2.5">
      <button
        type="button"
        onClick={props.onSort}
        className={`flex items-center gap-1 font-semibold uppercase tracking-wide ${
          props.active ? "text-teal-600" : "text-slate-500"
        }`}
      >
        {props.label}
        {props.active ? <span className="text-[10px]">{props.dir === "asc" ? "↑" : "↓"}</span> : null}
      </button>
    </th>
  );
}

function PagerBtn(props: {
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={`min-w-[32px] rounded border px-2 py-1 text-xs disabled:opacity-40 ${
        props.active
          ? "border-teal-500 bg-teal-600 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {props.children}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: Array<number | "…"> = [1];
  if (current > 3) out.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) out.push(p);
  if (current < total - 2) out.push("…");
  out.push(total);
  return out;
}

function BulkScopePicker(props: {
  scope: BulkScope;
  onChange: (s: BulkScope) => void;
  counts: { checked: number; page: number; all: number };
}) {
  const groupId = useId();
  const items: { id: BulkScope; label: string; count: number; disabled?: boolean }[] = [
    { id: "checked", label: "Checked only", count: props.counts.checked, disabled: props.counts.checked === 0 },
    { id: "page", label: "Current page", count: props.counts.page },
    { id: "all", label: "All matching filters", count: props.counts.all },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <label
          key={item.id}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
            item.disabled
              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
              : props.scope === item.id
                ? "cursor-pointer border-teal-500 bg-teal-600 text-white"
                : "cursor-pointer border-slate-200 bg-white text-slate-600 hover:border-teal-300"
          }`}
        >
          <input
            type="radio"
            name={`bulk-scope${groupId}`}
            className="sr-only"
            disabled={item.disabled}
            checked={props.scope === item.id}
            onChange={() => {
              if (!item.disabled) props.onChange(item.id);
            }}
          />
          {item.label}
          <span className={props.scope === item.id && !item.disabled ? "text-teal-100" : "text-slate-400"}>
            ({item.count.toLocaleString()})
          </span>
        </label>
      ))}
    </div>
  );
}
