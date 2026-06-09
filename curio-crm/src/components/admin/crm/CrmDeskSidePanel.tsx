import React, { useId, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";
import { CountrySelect } from "../CountrySelect";
import { inputCls } from "../CrmShell";
import type { CrmDeskRole } from "../../../lib/crmUsersTableColumns";
import { allowedBulkFields, type CrmBulkField } from "../../../lib/crmUsersTableColumns";
import type { CrmUserPatch } from "../../../api/client";

const TRADING_STATUSES = ["Enabled", "Disabled"] as const;

type BulkScope = "checked" | "page" | "all";

type BulkQuickState = {
  agentName: string;
  campaign: string;
  partner: string;
  countryCode: string;
  affiliate: string;
  campaignId: string;
  cpa: string;
  cpl: string;
  comments: string;
  funnel: string;
  conversionRate: string;
  playerValue: string;
  tradingStatus: string;
  param1: string;
  importedSource: string;
};

type Props = {
  open: boolean;
  onToggle: () => void;
  role: CrmDeskRole;
  selectedCount: number;
  pageCount: number;
  total: number;
  statusFilter: string;
  agentFilter: string;
  statuses: string[];
  agents: string[];
  onStatusFilter: (v: string) => void;
  onAgentFilter: (v: string) => void;
  bulkScope: BulkScope;
  onBulkScope: (s: BulkScope) => void;
  bulkBusy: boolean;
  bulkQuick: BulkQuickState;
  onBulkQuickChange: (patch: Partial<BulkQuickState>) => void;
  onQuickBulk: (patch: CrmUserPatch) => void;
  onOpenBulkEdit: () => void;
  onBulkDelete: () => void;
  onSelectAllMatching: () => void;
  onClearSelection: () => void;
  knownAffiliates: string[];
  knownCampaignIds: string[];
  knownCampaigns: string[];
  knownPartners: string[];
  knownSources: string[];
};

export function CrmDeskSidePanel(props: Props) {
  const allowed = allowedBulkFields(props.role);
  const show = (field: CrmBulkField) => allowed.has(field);
  const hasBulk = props.selectedCount > 0;

  if (!props.open) {
    return (
      <aside className="sticky top-4 flex shrink-0 flex-col items-center gap-2">
        <button
          type="button"
          onClick={props.onToggle}
          title="Open desk panel"
          className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-3 text-slate-500 shadow-sm hover:border-teal-300 hover:text-teal-700"
        >
          <ChevronLeft size={16} />
          <span className="text-[10px] font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">
            Desk
          </span>
        </button>
        {hasBulk ? (
          <button
            type="button"
            onClick={props.onToggle}
            className="rounded-full bg-teal-600 px-2 py-1 text-[10px] font-bold text-white shadow"
            title={`${props.selectedCount} selected — open panel`}
          >
            {props.selectedCount}
          </button>
        ) : null}
      </aside>
    );
  }

  return (
    <aside className="sticky top-4 flex w-72 shrink-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm lg:w-80">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-teal-600" />
          <span className="text-sm font-semibold text-slate-800">Desk panel</span>
        </div>
        <button
          type="button"
          onClick={props.onToggle}
          title="Collapse panel — full width for leads"
          className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-3 space-y-4">
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Filters</p>
          <div className="space-y-2">
            <label className="block text-xs text-slate-500">
              Status
              <select
                value={props.statusFilter}
                onChange={(e) => props.onStatusFilter(e.target.value)}
                className={`${inputCls} mt-1 w-full`}
              >
                <option value="">All</option>
                {props.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-500">
              Owner agent
              <select
                value={props.agentFilter}
                onChange={(e) => props.onAgentFilter(e.target.value)}
                className={`${inputCls} mt-1 w-full`}
                aria-label="Filter by owner agent"
              >
                <option value="">All agents</option>
                {props.agents.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {hasBulk ? (
          <section className="space-y-3 rounded-lg border border-teal-200 bg-teal-50/80 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-teal-900">
                {props.selectedCount.toLocaleString()} selected
              </span>
              <button
                type="button"
                disabled={props.bulkBusy}
                onClick={props.onClearSelection}
                className="ml-auto text-[10px] text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            </div>

            <BulkScopePicker
              scope={props.bulkScope}
              onChange={props.onBulkScope}
              counts={{ checked: props.selectedCount, page: props.pageCount, all: props.total }}
            />

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={props.bulkBusy}
                onClick={props.onOpenBulkEdit}
                className="flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={11} />
                Edit all…
              </button>
              <button
                type="button"
                disabled={props.bulkBusy}
                onClick={props.onBulkDelete}
                className="flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100"
              >
                <Trash2 size={11} />
                Delete
              </button>
              {props.selectedCount < props.total ? (
                <button
                  type="button"
                  disabled={props.bulkBusy}
                  className="text-[10px] font-medium text-teal-700 underline"
                  onClick={props.onSelectAllMatching}
                >
                  All {props.total.toLocaleString()}
                </button>
              ) : null}
            </div>

            <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800/70">
              Quick set — choose scope, value, Set
            </p>
            <div className="grid gap-2">
              {show("countryCode") ? (
                <BulkQuickSelect
                  label="Country"
                  disabled={props.bulkBusy}
                  variant="country"
                  value={props.bulkQuick.countryCode}
                  onChange={(v) => props.onBulkQuickChange({ countryCode: v })}
                  onApply={(v) => props.onQuickBulk({ countryCode: v })}
                />
              ) : null}
              {show("affiliate") ? (
                <BulkQuickSelect
                  label="Affiliate"
                  disabled={props.bulkBusy}
                  options={props.knownAffiliates}
                  value={props.bulkQuick.affiliate}
                  onChange={(v) => props.onBulkQuickChange({ affiliate: v })}
                  onApply={(v) => props.onQuickBulk({ affiliate: v })}
                  allowCustom
                />
              ) : null}
              {show("campaignId") ? (
                <BulkQuickSelect
                  label="Campaign ID"
                  disabled={props.bulkBusy}
                  options={props.knownCampaignIds}
                  value={props.bulkQuick.campaignId}
                  onChange={(v) => props.onBulkQuickChange({ campaignId: v })}
                  onApply={(v) => props.onQuickBulk({ campaignId: v })}
                  allowCustom
                />
              ) : null}
              {show("campaign") ? (
                <BulkQuickSelect
                  label="Campaign"
                  disabled={props.bulkBusy}
                  options={props.knownCampaigns}
                  value={props.bulkQuick.campaign}
                  onChange={(v) => props.onBulkQuickChange({ campaign: v })}
                  onApply={(v) => props.onQuickBulk({ campaign: v })}
                  allowCustom
                />
              ) : null}
              {show("cpa") ? (
                <BulkQuickSelect
                  label="CPA"
                  disabled={props.bulkBusy}
                  value={props.bulkQuick.cpa}
                  onChange={(v) => props.onBulkQuickChange({ cpa: v })}
                  onApply={(v) => props.onQuickBulk({ cpa: v })}
                  allowCustom
                  placeholder="e.g. 250"
                />
              ) : null}
              {show("cpl") ? (
                <BulkQuickSelect
                  label="CPL"
                  disabled={props.bulkBusy}
                  value={props.bulkQuick.cpl}
                  onChange={(v) => props.onBulkQuickChange({ cpl: v })}
                  onApply={(v) => props.onQuickBulk({ cpl: v })}
                  allowCustom
                  placeholder="e.g. 35"
                />
              ) : null}
              {show("funnel") ? (
                <BulkQuickSelect
                  label="Funnel"
                  disabled={props.bulkBusy}
                  value={props.bulkQuick.funnel}
                  onChange={(v) => props.onBulkQuickChange({ funnel: v })}
                  onApply={(v) => props.onQuickBulk({ funnel: v })}
                  allowCustom
                />
              ) : null}
              {show("conversionRate") ? (
                <BulkQuickSelect
                  label="CR"
                  disabled={props.bulkBusy}
                  value={props.bulkQuick.conversionRate}
                  onChange={(v) => props.onBulkQuickChange({ conversionRate: v })}
                  onApply={(v) => props.onQuickBulk({ conversionRate: v })}
                  allowCustom
                  placeholder="e.g. 100%"
                />
              ) : null}
              {show("playerValue") ? (
                <BulkQuickSelect
                  label="PV"
                  disabled={props.bulkBusy}
                  value={props.bulkQuick.playerValue}
                  onChange={(v) => props.onBulkQuickChange({ playerValue: v })}
                  onApply={(v) => props.onQuickBulk({ playerValue: v })}
                  allowCustom
                  placeholder="Player value"
                />
              ) : null}
              {show("comments") ? (
                <BulkQuickSelect
                  label="Comments"
                  disabled={props.bulkBusy}
                  value={props.bulkQuick.comments}
                  onChange={(v) => props.onBulkQuickChange({ comments: v })}
                  onApply={(v) => props.onQuickBulk({ comments: v })}
                  allowCustom
                />
              ) : null}
              {show("crmStatus") ? (
                <BulkQuickSelect
                  label="Status"
                  disabled={props.bulkBusy}
                  options={props.statuses}
                  value=""
                  onApply={(v) => props.onQuickBulk({ crmStatus: v })}
                />
              ) : null}
              {show("agentName") ? (
                <BulkQuickSelect
                  label="Agent"
                  disabled={props.bulkBusy}
                  options={props.agents}
                  value={props.bulkQuick.agentName}
                  onChange={(v) => props.onBulkQuickChange({ agentName: v })}
                  onApply={(v) => props.onQuickBulk({ agentName: v })}
                />
              ) : null}
              {show("partner") ? (
                <BulkQuickSelect
                  label="Partner / IB"
                  disabled={props.bulkBusy}
                  options={props.knownPartners}
                  value={props.bulkQuick.partner}
                  onChange={(v) => props.onBulkQuickChange({ partner: v })}
                  onApply={(v) => props.onQuickBulk({ partner: v })}
                  allowCustom
                />
              ) : null}
              {show("importedSource") ? (
                <BulkQuickSelect
                  label="Source"
                  disabled={props.bulkBusy}
                  options={props.knownSources}
                  value={props.bulkQuick.importedSource}
                  onChange={(v) => props.onBulkQuickChange({ importedSource: v })}
                  onApply={(v) => props.onQuickBulk({ importedSource: v })}
                  allowCustom
                />
              ) : null}
              {show("tradingStatus") ? (
                <BulkQuickSelect
                  label="Trading"
                  disabled={props.bulkBusy}
                  options={[...TRADING_STATUSES]}
                  value={props.bulkQuick.tradingStatus}
                  onChange={(v) => props.onBulkQuickChange({ tradingStatus: v })}
                  onApply={(v) => props.onQuickBulk({ tradingStatus: v })}
                />
              ) : null}
              {show("param1") ? (
                <BulkQuickSelect
                  label="Param1"
                  disabled={props.bulkBusy}
                  value={props.bulkQuick.param1}
                  onChange={(v) => props.onBulkQuickChange({ param1: v })}
                  onApply={(v) => props.onQuickBulk({ param1: v })}
                  allowCustom
                  placeholder="Tag / ref"
                />
              ) : null}
            </div>
          </section>
        ) : (
          <p className="rounded border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
            Check leads in the table to bulk-edit status, agent, campaign fields, etc.
          </p>
        )}
      </div>
    </aside>
  );
}

function BulkScopePicker(props: {
  scope: BulkScope;
  onChange: (s: BulkScope) => void;
  counts: { checked: number; page: number; all: number };
}) {
  const groupId = useId();
  const items: { id: BulkScope; label: string; count: number; disabled?: boolean }[] = [
    { id: "checked", label: "Checked", count: props.counts.checked, disabled: props.counts.checked === 0 },
    { id: "page", label: "Page", count: props.counts.page },
    { id: "all", label: "All", count: props.counts.all },
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <label
          key={item.id}
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
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
          {item.label} ({item.count.toLocaleString()})
        </label>
      ))}
    </div>
  );
}

function BulkQuickSelect(props: {
  label: string;
  disabled?: boolean;
  options?: string[];
  value?: string;
  placeholder?: string;
  allowCustom?: boolean;
  variant?: "default" | "country";
  onChange?: (v: string) => void;
  onApply: (v: string) => void;
}) {
  const [pick, setPick] = useState("");
  const controlled = props.value !== undefined;
  const current = controlled ? props.value! : pick;

  if (props.variant === "country") {
    return (
      <div className="rounded border border-teal-100 bg-white p-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{props.label}</p>
        <div className="flex gap-1">
          <CountrySelect
            className={`${inputCls} min-w-0 flex-1 py-1 text-xs`}
            disabled={props.disabled}
            value={current}
            onChange={(v) => {
              if (controlled) props.onChange?.(v);
              else setPick(v);
            }}
            placeholder="Choose country…"
          />
          <button
            type="button"
            disabled={props.disabled || !current}
            onClick={() => props.onApply(current)}
            className="shrink-0 rounded bg-teal-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
          >
            Set
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded border border-teal-100 bg-white p-2">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{props.label}</p>
      <div className="flex gap-1">
        {props.options && props.options.length > 0 && !props.allowCustom ? (
          <select
            className={`${inputCls} min-w-0 flex-1 py-1 text-xs`}
            disabled={props.disabled}
            value={current}
            onChange={(e) => {
              const v = e.target.value;
              if (controlled) props.onChange?.(v);
              else setPick(v);
              if (v) props.onApply(v);
            }}
          >
            <option value="">Choose…</option>
            {props.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <>
            {props.options && props.options.length > 0 ? (
              <select
                className={`${inputCls} w-20 shrink-0 py-1 text-xs`}
                disabled={props.disabled}
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  if (controlled) props.onChange?.(v);
                  else setPick(v);
                }}
              >
                <option value="">Pick…</option>
                {props.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              className={`${inputCls} min-w-0 flex-1 py-1 text-xs`}
              disabled={props.disabled}
              placeholder={props.placeholder ?? "Type value…"}
              value={current}
              onChange={(e) => {
                const v = e.target.value;
                if (controlled) props.onChange?.(v);
                else setPick(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && current.trim()) props.onApply(current.trim());
              }}
            />
            <button
              type="button"
              disabled={props.disabled || !current.trim()}
              onClick={() => props.onApply(current.trim())}
              className="shrink-0 rounded bg-teal-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-teal-500 disabled:opacity-40"
            >
              Set
            </button>
          </>
        )}
      </div>
    </div>
  );
}
