import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  client,
  type AutoAssignRuleInput,
  type AutoAssignRuleRow,
  type AutoAssignRuleType,
} from "../../../api/client";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  PageHeader,
  Panel,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

const RULE_TYPE_UI: Record<
  AutoAssignRuleType,
  { label: string; typeCol: string; targetHint: string }
> = {
  promo_code: { label: "Promo code", typeCol: "User", targetHint: "e.g. VIP23" },
  campaign: { label: "Campaign", typeCol: "User", targetHint: "Campaign name or all-campaigns" },
  country: { label: "Country", typeCol: "User", targetHint: "ISO code e.g. US" },
  language: { label: "Language", typeCol: "User", targetHint: "e.g. en" },
  all_leads: { label: "All leads", typeCol: "User", targetHint: "*" },
};

function fmtUtc(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Precedence (1 wins)",
    what: "Rules run top-to-bottom. The first active match assigns the agent — lower numbers beat higher ones.",
    how: "Drag rows or use the Reorder dropdown. Put VIP / high-value rules at 1; catch-all at 7.",
    when: "Two rules overlap (e.g. Amazon campaign + all-campaigns).",
  },
  {
    title: "Auto assigned for",
    what: "What the signup must carry: promo code, campaign name, country, language, or all leads.",
    how: "Campaign names must match Marketing → Campaigns (or use all-campaigns for any named campaign).",
    when: "Partner sends traffic on a dedicated funnel.",
  },
  {
    title: "Agent to set",
    what: "Desk team member who becomes owner on the client file.",
    how: "Pick from staff list — label is what managers see in the table.",
    when: "Routing Amazon leads to your best closer.",
  },
  {
    title: "Active",
    what: "Green check = rule live. Unchecked rules are ignored but kept for seasonal campaigns.",
    how: "Toggle in the table without deleting history.",
    when: "Pausing a rule during agent PTO.",
  },
];

function TrafficFlowDiagram({ rows }: { rows: AutoAssignRuleRow[] }) {
  const active = rows.filter((r) => r.active).slice(0, 4);
  if (active.length === 0) {
    return (
      <p className="text-sm text-slate-500">No active rules — new leads stay unassigned until manual assign.</p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {active.map((r, i) => (
        <React.Fragment key={r.id}>
          {i > 0 && <span className="text-slate-300">|</span>}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
            <span className="font-medium text-teal-800">{r.autoAssignedFor.split(":")[0]?.trim()}</span>
            <ArrowRight size={14} className="text-slate-400" />
            <span className="text-slate-600">{r.autoAssignedFor.split(":")[1]?.trim() || r.targetKey}</span>
            <ArrowRight size={14} className="text-slate-400" />
            <span className="font-semibold text-slate-900">{r.agentLabel}</span>
          </div>
        </React.Fragment>
      ))}
      {rows.filter((r) => r.active).length > 4 && (
        <span className="text-xs text-slate-400">+{rows.filter((r) => r.active).length - 4} more</span>
      )}
    </div>
  );
}

function RuleModal({
  initial,
  options,
  onClose,
  onSaved,
}: {
  initial: AutoAssignRuleRow | null;
  options: {
    campaigns: Array<{ id: string; name: string }>;
    promoCodes: Array<{ code: string; label: string }>;
    staff: Array<{ userId: string; name: string }>;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ruleType, setRuleType] = useState<AutoAssignRuleType>(initial?.ruleType ?? "campaign");
  const [targetKey, setTargetKey] = useState(initial?.targetKey ?? "all-campaigns");
  const [agentId, setAgentId] = useState(initial?.agentId ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [precedence, setPrecedence] = useState(initial?.precedence ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentLabel = useMemo(() => {
    const s = options.staff.find((x) => x.userId === agentId);
    return s?.name ?? initial?.agentLabel ?? agentId;
  }, [agentId, options.staff, initial?.agentLabel]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: AutoAssignRuleInput = {
      ruleType,
      targetKey: ruleType === "all_leads" ? "*" : targetKey,
      agentId,
      agentLabel,
      active,
      precedence,
    };
    try {
      if (initial) {
        await client.adminUpdateAutoAssignRule(initial.id, body);
      } else {
        await client.adminCreateAutoAssignRule(body);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl"
          onSubmit={(e) => void submit(e)}
        >
          <div className="mb-4 flex items-start justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {initial ? `Edit rule #${initial.id}` : "New auto-assign rule"}
            </h3>
            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <ErrorBanner message={error} />

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Type</span>
            <select
              className={inputCls}
              value={ruleType}
              onChange={(e) => {
                const t = e.target.value as AutoAssignRuleType;
                setRuleType(t);
                if (t === "campaign") setTargetKey("all-campaigns");
                else if (t === "all_leads") setTargetKey("*");
                else if (t === "promo_code" && options.promoCodes[0]) setTargetKey(options.promoCodes[0].code);
              }}
            >
              <option value="campaign">Campaign</option>
              <option value="promo_code">Promo code</option>
              <option value="all_leads">All campaigns / catch-all</option>
              <option value="country">Country</option>
              <option value="language">Language</option>
            </select>
          </label>

          {ruleType !== "all_leads" && (
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Target</span>
              {ruleType === "campaign" ? (
                <select className={inputCls} value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
                  <option value="all-campaigns">all-campaigns (any campaign)</option>
                  {options.campaigns.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : ruleType === "promo_code" ? (
                <select className={inputCls} value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
                  {options.promoCodes.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputCls}
                  value={targetKey}
                  onChange={(e) => setTargetKey(e.target.value)}
                  placeholder={RULE_TYPE_UI[ruleType].targetHint}
                />
              )}
            </label>
          )}

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium text-slate-500">Agent to set</span>
            <select className={inputCls} value={agentId} onChange={(e) => setAgentId(e.target.value)} required>
              <option value="">Select desk team member…</option>
              {options.staff.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mb-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Precedence</span>
              <select
                className="rounded border border-slate-200 px-2 py-1 text-sm"
                value={precedence}
                onChange={(e) => setPrecedence(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={btnPrimary} disabled={saving || !agentId}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              <span className={saving ? "ml-1.5" : ""}>{initial ? "Save" : "Create"}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export function AutoAssignPage() {
  const [rows, setRows] = useState<AutoAssignRuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<AutoAssignRuleRow | null | "new">(null);
  const [options, setOptions] = useState<{
    campaigns: Array<{ id: string; name: string }>;
    promoCodes: Array<{ code: string; label: string }>;
    staff: Array<{ userId: string; name: string }>;
  }>({ campaigns: [], promoCodes: [], staff: [] });
  const [dragId, setDragId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rules, opts] = await Promise.all([
        client.adminAutoAssignRules(),
        client.adminAutoAssignOptions(),
      ]);
      setRows(rules.rows);
      setOptions({
        campaigns: opts.campaigns,
        promoCodes: opts.promoCodes,
        staff: opts.staff.map((s) => ({ userId: s.userId, name: s.name })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load auto-assign rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setPrecedence(id: number, precedence: number) {
    try {
      await client.adminUpdateAutoAssignRule(id, { precedence });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update precedence.");
    }
  }

  async function toggleActive(row: AutoAssignRuleRow) {
    try {
      await client.adminUpdateAutoAssignRule(row.id, { active: !row.active });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not toggle rule.");
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this auto-assign rule?")) return;
    try {
      await client.adminDeleteAutoAssignRule(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete rule.");
    }
  }

  async function reorder(fromId: number, toId: number) {
    const order = rows.map((r) => r.id);
    const fromIdx = order.indexOf(fromId);
    const toIdx = order.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, fromId);
    try {
      const data = await client.adminReorderAutoAssignRules(order);
      setRows(data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reorder.");
    }
  }

  const maxPrec = Math.max(7, rows.length);

  return (
    <div>
      <PageHeader
        title={`Auto Assign (${rows.length})`}
        subtitle="Route live signups to the right agent by campaign, country, or promo."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              <span className="ml-1.5">Refresh</span>
            </button>
            <button type="button" className={btnPrimary} onClick={() => setModal("new")}>
              <Plus size={15} />
              <span className="ml-1.5">Create rule</span>
            </button>
          </>
        }
      />

      <Panel className="mb-4 border-teal-100 bg-gradient-to-r from-teal-50/80 to-white p-4">
        <p className="text-sm leading-relaxed text-slate-700">
          <strong>When a new lead signs up,</strong> the CRM checks rules top-to-bottom —{" "}
          <strong>first match wins.</strong> Put your best closer at precedence <strong>1</strong>.
        </p>
      </Panel>

      <ErrorBanner message={error} />

      <Panel className="mb-4 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Traffic flow (active rules)</p>
        <TrafficFlowDiagram rows={rows} />
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-3" aria-label="Reorder" />
                <th className="px-3 py-3">Id</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Auto assigned for</th>
                <th className="px-3 py-3">Agent To Set</th>
                <th className="px-3 py-3 text-center">Active</th>
                <th className="px-3 py-3">Precedence</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto animate-spin" size={24} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No rules yet — create one to route campaign traffic.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/80 ${dragId === row.id ? "opacity-50" : ""}`}
                    draggable
                    onDragStart={() => setDragId(row.id)}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragId != null && dragId !== row.id) void reorder(dragId, row.id);
                      setDragId(null);
                    }}
                  >
                    <td className="px-2 py-2 text-slate-300">
                      <GripVertical size={16} className="cursor-grab" />
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.id}</td>
                    <td className="px-3 py-2 text-slate-700">{RULE_TYPE_UI[row.ruleType].typeCol}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{row.autoAssignedFor}</td>
                    <td className="px-3 py-2 text-slate-800">{row.agentLabel}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="inline-flex rounded-full p-1 hover:bg-slate-100"
                        aria-label={row.active ? "Deactivate" : "Activate"}
                        onClick={() => void toggleActive(row)}
                      >
                        {row.active ? (
                          <Check size={18} className="text-emerald-600" strokeWidth={3} />
                        ) : (
                          <span className="inline-block h-4 w-4 rounded border border-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                        value={row.precedence}
                        onChange={(e) => void setPrecedence(row.id, Number(e.target.value))}
                        aria-label={`Reorder rule ${row.id}`}
                      >
                        {Array.from({ length: maxPrec }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{fmtUtc(row.createdAt)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-teal-700"
                        aria-label="Edit"
                        onClick={() => setModal(row)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                        aria-label="Delete"
                        onClick={() => void remove(row.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <PageBottomGuide blocks={guideBlocks} />

      {modal !== null && (
        <RuleModal
          initial={modal === "new" ? null : modal}
          options={options}
          onClose={() => setModal(null)}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
