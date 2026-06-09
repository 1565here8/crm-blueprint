import { ArrowRight, Plus, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminPageHeader, Panel, StatChip, btnPrimary, btnSecondary } from "../../../components/admin/CrmShell";
import { pushAdminToast } from "../../../lib/adminToastBus";

type Rule = { id: string; trigger: string; condition: string; newStatus: string; active: boolean };

const STORAGE_KEY = "curio_crm_dynamic_status_rules_v1";

const DEFAULT_RULES: Rule[] = [
  { id: "1", trigger: "First deposit approved", condition: "balance > 0", newStatus: "Depositor", active: true },
  { id: "2", trigger: "Margin call fired", condition: "equity < maintenance", newStatus: "Margin Call", active: true },
  { id: "3", trigger: "30 days no login", condition: "last_login > 30d", newStatus: "Cold", active: false },
  { id: "4", trigger: "FTD under $100", condition: "first_deposit < 100 USD", newStatus: "Micro", active: false },
];

function loadRules(): Rule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Rule[];
  } catch {
    // ignore
  }
  return DEFAULT_RULES;
}

export function DynamicStatusPage() {
  const [rules, setRules] = useState<Rule[]>(loadRules);
  const activeCount = rules.filter((r) => r.active).length;

  const persist = useCallback((next: Rule[]) => {
    setRules(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }, [rules]);

  const toggle = (id: string) => {
    persist(rules.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
    pushAdminToast("Rule updated", "success");
  };

  const reset = () => {
    persist(DEFAULT_RULES);
    pushAdminToast("Restored default rules", "info");
  };

  return (
    <div>
      <AdminPageHeader
        title="Dynamic Status"
        subtitle="Automated pipeline moves when balance or activity changes — manual status still works without this."
        actions={
          <>
            <button type="button" className={btnSecondary} onClick={reset}>
              <RefreshCw size={14} className="mr-1.5 inline" />
              Reset defaults
            </button>
            <Link to="/admin/system/status" className={btnPrimary}>
              Edit status labels
            </Link>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <StatChip label="Active rules" value={String(activeCount)} />
        <StatChip label="Total rules" value={String(rules.length)} />
      </div>

      <Panel className="overflow-hidden border-slate-800 p-0">
        <div className="border-b border-slate-800 bg-[#0c1017] px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400">When → Then</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-900 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">Trigger</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3" />
                <th className="px-4 py-3">New status</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-teal-50/40">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.trigger}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.condition}</td>
                  <td className="px-2 py-3 text-slate-300">
                    <ArrowRight size={16} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                      {r.newStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggle(r.id)}
                      className="text-teal-600 hover:text-teal-500"
                      title={r.active ? "Disable rule" : "Enable rule"}
                    >
                      {r.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-400" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-6 border-dashed border-teal-200 bg-teal-50/50 p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          <strong className="text-slate-800">Preview mode:</strong> rules save in your browser until the live automation
          engine ships. Use{" "}
          <Link to="/admin/crm/users" className="text-teal-700 hover:underline">
            All Clients
          </Link>{" "}
          for manual status today. Need a custom rule? Ask{" "}
          <Link to="/admin/knowme" className="text-teal-700 hover:underline">
            KNOWME
          </Link>
          .
        </p>
        <button type="button" className={`${btnSecondary} mt-4`} disabled title="Custom rules on request">
          <Plus size={14} className="mr-1.5 inline" />
          Request custom rule (owner)
        </button>
      </Panel>
    </div>
  );
}
