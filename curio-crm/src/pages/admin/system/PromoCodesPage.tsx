import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { client, type PromoCodeRow, type PromoPurpose } from "../../../api/client";
import {
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  PageHeader,
  Panel,
  StatChip,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

const PURPOSE_LABELS: Record<PromoPurpose, string> = {
  investor: "Investor",
  affiliate: "Affiliate",
  bonus: "Bonus",
  demo: "Demo",
  custom: "Custom",
};

const PURPOSE_BADGE: Record<PromoPurpose, string> = {
  investor: "bg-indigo-100 text-indigo-800 ring-indigo-200/60",
  affiliate: "bg-violet-100 text-violet-800 ring-violet-200/60",
  bonus: "bg-amber-100 text-amber-800 ring-amber-200/60",
  demo: "bg-slate-100 text-slate-700 ring-slate-200/60",
  custom: "bg-teal-100 text-teal-800 ring-teal-200/60",
};

function PurposeBadge({ purpose }: { purpose: PromoPurpose }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${PURPOSE_BADGE[purpose]}`}
    >
      {PURPOSE_LABELS[purpose]}
    </span>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Investor codes",
    what: "Given to new member investors at sign-up — can auto-apply a welcome bonus % and assign a desk group.",
    how: "Choose purpose Investor, set bonus % if needed, pick a group for routing.",
    when: "Launching a VIP or welcome-offer landing page.",
  },
  {
    title: "Affiliate codes",
    what: "Tied to partner funnels — often linked to Auto Assign rules so leads land on the right team.",
    how: "Purpose Affiliate; share the code with the partner for their signup URL or API import.",
    when: "Onboarding a new affiliate or sub-network.",
  },
  {
    title: "Delete vs protected",
    what: "Codes referenced in System → Auto Assign cannot be deleted — you'll see a badge instead of Delete.",
    how: "Remove the code from Auto Assign first, or leave it and create a new code for new campaigns.",
    when: "Cleaning up old test codes (e.g. 123123 is safe to delete).",
  },
];

export function PromoCodesPage() {
  const [rows, setRows] = useState<PromoCodeRow[]>([]);
  const [deskGroups, setDeskGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const [code, setCode] = useState("");
  const [purpose, setPurpose] = useState<PromoPurpose>("custom");
  const [bonusPercent, setBonusPercent] = useState("");
  const [assignGroupId, setAssignGroupId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listData, options] = await Promise.all([client.adminPromoCodes(), client.adminPromoCodeOptions()]);
      setRows(listData.rows);
      setDeskGroups(options.deskGroups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load promo codes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter a promo code.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await client.adminCreatePromoCode({
        code: trimmed,
        purpose,
        bonusPercent: bonusPercent.trim() ? Number(bonusPercent) : null,
        assignGroupId: assignGroupId || null,
      });
      setCode("");
      setBonusPercent("");
      setAssignGroupId("");
      setPurpose("custom");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create promo code.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(row: PromoCodeRow) {
    if (row.used_in_auto_assign) return;
    if (!window.confirm(`Delete promo code "${row.code}"? This cannot be undone.`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      await client.adminDeletePromoCode(row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  const protectedCount = rows.filter((r) => r.used_in_auto_assign).length;

  return (
    <div>
      <PageHeader
        title="Promo Code"
        subtitle="Registration and campaign codes for investors, affiliates, and custom offers"
        actions={
          <button type="button" className={btnSecondary} onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />

      <ErrorBanner message={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatChip label="Total codes" value={rows.length} />
        <StatChip label="In auto-assign" value={protectedCount} />
        <StatChip label="Deletable" value={rows.length - protectedCount} />
      </div>

      <Panel className="mb-4 p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => void handleCreate(e)}>
          <p className="w-full text-sm font-medium text-slate-700">Add a new Promo Code:</p>
          <label className="min-w-[140px] flex-1 text-xs font-medium text-slate-500">
            Code
            <input
              className={`${inputCls} mt-1 font-mono uppercase`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. WELCOME25"
              maxLength={32}
              required
            />
          </label>
          <label className="min-w-[130px] text-xs font-medium text-slate-500">
            Purpose
            <select
              className={`${inputCls} mt-1`}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as PromoPurpose)}
            >
              {(Object.keys(PURPOSE_LABELS) as PromoPurpose[]).map((p) => (
                <option key={p} value={p}>
                  {PURPOSE_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="w-24 text-xs font-medium text-slate-500">
            Bonus %
            <input
              className={`${inputCls} mt-1`}
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={bonusPercent}
              onChange={(e) => setBonusPercent(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="min-w-[160px] flex-1 text-xs font-medium text-slate-500">
            Assign to group
            <select className={`${inputCls} mt-1`} value={assignGroupId} onChange={(e) => setAssignGroupId(e.target.value)}>
              <option value="">None</option>
              {deskGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={btnPrimary} disabled={creating}>
            {creating ? "Submitting…" : "Submit"}
          </button>
        </form>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">Id</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" size={24} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No promo codes yet. Add one above for your next campaign.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition hover:bg-teal-50/30 ${
                      i % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{row.code}</div>
                      {row.bonus_percent != null ? (
                        <div className="text-[11px] text-slate-500">{row.bonus_percent}% welcome bonus</div>
                      ) : null}
                      {row.assign_group_name ? (
                        <div className="text-[11px] text-slate-500">Group: {row.assign_group_name}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">
                      <PurposeBadge purpose={row.purpose} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.used_in_auto_assign ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80">
                          Used in auto-assign rules
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
                          disabled={deletingId === row.id}
                          onClick={() => void handleDelete(row)}
                        >
                          {deletingId === row.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <PageBottomGuide
        intro="Promo codes are entered at registration or on affiliate landing pages. They can grant a bonus percentage, assign a desk group, and tie into Auto Assign — protected codes cannot be deleted until removed from those rules."
        blocks={guideBlocks}
      />
    </div>
  );
}
