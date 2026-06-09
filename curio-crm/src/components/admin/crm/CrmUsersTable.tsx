import React, { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, GripVertical, Layers, Minus, Plus } from "lucide-react";
import type { CrmUser, CrmUserPatch } from "../../../api/client";
import { InlineCountrySelect } from "../CountrySelect";
import { InlineEditCell } from "./InlineEditCell";
import { fmtCrmRegistration } from "../CrmShell";
import { displayConversionRate, formatPlayerValue } from "../../../lib/crmPlayerMetrics";
import {
  getColumnWidth,
  type CrmColumnLayout,
  type CrmUsersColId,
  buildColumnRenderSlots,
  type CrmColumnRenderSlot,
  type CrmColumnSlot,
  type CrmUsersColumnDef,
} from "../../../lib/crmUsersTableColumns";

type Props = {
  users: CrmUser[];
  columnSlots: CrmColumnSlot[];
  selected: Set<string>;
  allSelected: boolean;
  savingId: string | null;
  statuses: string[];
  agents: string[];
  sortBy: string;
  sortDir: "asc" | "desc";
  canReorder?: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (id: string, checked: boolean) => void;
  onSort: (key: string) => void;
  onPatch: (userId: string, patch: CrmUserPatch) => void;
  onColumnReorder?: (fromId: CrmUsersColId, toId: CrmUsersColId) => void;
  columnLayout: CrmColumnLayout;
  onColumnResizePreview?: (id: CrmUsersColId, widthPx: number) => void;
  onColumnResizeCommit?: (id: CrmUsersColId, widthPx: number) => void;
  onCollapseColumn?: (id: CrmUsersColId) => void;
  onExpandColumn?: (id: CrmUsersColId) => void;
  onExpandUmbrella?: () => void;
  onCollapseUmbrella?: () => void;
};

function ColumnHeader(props: {
  col: CrmUsersColumnDef;
  widthPx: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  canCustomize: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onSort: (key: string) => void;
  onDragStart: (id: CrmUsersColId) => void;
  onDragEnd: () => void;
  onDragOver: (id: CrmUsersColId) => void;
  onDrop: (fromId: CrmUsersColId, toId: CrmUsersColId) => void;
  onResizePreview: (id: CrmUsersColId, widthPx: number) => void;
  onResizeCommit: (id: CrmUsersColId, widthPx: number) => void;
  onCollapse?: () => void;
}) {
  const { col, canCustomize } = props;
  const sortActive = col.sortable && col.sortKey && props.sortBy === col.sortKey;
  const thRef = useRef<HTMLTableCellElement>(null);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = props.widthPx;

      const onMove = (ev: MouseEvent) => {
        props.onResizePreview(col.id, startW + (ev.clientX - startX));
      };
      const onUp = (ev: MouseEvent) => {
        const finalW = startW + (ev.clientX - startX);
        props.onResizeCommit(col.id, finalW);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [col.id, props],
  );

  return (
    <th
      ref={thRef}
      draggable={canCustomize}
      style={{ width: props.widthPx, minWidth: props.widthPx, maxWidth: props.widthPx }}
      onDragStart={(e) => {
        if (!canCustomize) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", col.id);
        props.onDragStart(col.id);
      }}
      onDragEnd={props.onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        props.onDragOver(col.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData("text/plain") as CrmUsersColId;
        if (fromId && fromId !== col.id) props.onDrop(fromId, col.id);
        props.onDragEnd();
      }}
      className={`relative select-none px-2 py-2.5 transition ${
        props.dragging ? "opacity-40" : ""
      } ${props.dropTarget ? "bg-teal-100 ring-2 ring-inset ring-teal-400" : ""} ${
        canCustomize ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-1 overflow-hidden pr-2">
        {canCustomize ? (
          <GripVertical size={12} className="shrink-0 text-slate-300" aria-hidden />
        ) : null}
        {col.sortable && col.sortKey ? (
          <button
            type="button"
            onClick={() => props.onSort(col.sortKey!)}
            className="truncate font-semibold hover:text-teal-700"
          >
            {col.label}
            {sortActive ? (props.sortDir === "asc" ? " ↑" : " ↓") : ""}
          </button>
        ) : (
          <span className="truncate font-semibold">{col.label}</span>
        )}
        {props.onCollapse ? (
          <button
            type="button"
            title={`Hide ${col.label}`}
            aria-label={`Collapse ${col.label}`}
            onClick={(e) => {
              e.stopPropagation();
              props.onCollapse?.();
            }}
            className="ml-auto shrink-0 rounded p-0.5 text-slate-400 hover:bg-white hover:text-teal-700"
          >
            <Minus size={12} />
          </button>
        ) : null}
      </div>
      {canCustomize ? (
        <button
          type="button"
          aria-label={`Resize ${col.label} column`}
          onMouseDown={startResize}
          className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize border-r-2 border-transparent hover:border-teal-500"
        />
      ) : null}
    </th>
  );
}

function UmbrellaColumnHeader(props: {
  cols: CrmUsersColumnDef[];
  onExpand: () => void;
}) {
  const n = props.cols.length;
  const preview = props.cols
    .slice(0, 4)
    .map((c) => c.label)
    .join(", ");
  return (
    <th
      className="w-11 min-w-[44px] max-w-[44px] border-l border-dashed border-teal-300 bg-teal-50/70 px-0.5 py-1 align-bottom"
      title={`${n} extra columns: ${props.cols.map((c) => c.label).join(", ")}`}
    >
      <button
        type="button"
        aria-label={`Show ${n} extra columns`}
        onClick={props.onExpand}
        className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded px-0.5 py-1 text-[9px] font-semibold leading-tight text-teal-900 hover:bg-teal-100"
      >
        <Layers size={11} className="shrink-0" />
        <ChevronRight size={10} className="shrink-0" />
        <span className="max-h-10 overflow-hidden [writing-mode:vertical-rl] rotate-180">More</span>
        <span className="rounded bg-teal-700/10 px-0.5 text-[8px] text-teal-800">{n}</span>
      </button>
      <span className="sr-only">{preview}{n > 4 ? "…" : ""}</span>
    </th>
  );
}

function CollapsedColumnHeader(props: {
  col: CrmUsersColumnDef;
  canCustomize: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onExpand: () => void;
  onDragStart: (id: CrmUsersColId) => void;
  onDragEnd: () => void;
  onDragOver: (id: CrmUsersColId) => void;
  onDrop: (fromId: CrmUsersColId, toId: CrmUsersColId) => void;
}) {
  const { col, canCustomize } = props;
  return (
    <th
      draggable={canCustomize}
      onDragStart={(e) => {
        if (!canCustomize) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", col.id);
        props.onDragStart(col.id);
      }}
      onDragEnd={props.onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        props.onDragOver(col.id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData("text/plain") as CrmUsersColId;
        if (fromId && fromId !== col.id) props.onDrop(fromId, col.id);
        props.onDragEnd();
      }}
      className={`w-9 min-w-[36px] max-w-[36px] border-l border-dashed border-teal-200/80 bg-teal-50/40 px-0.5 py-1 align-bottom transition ${
        props.dragging ? "opacity-40" : ""
      } ${props.dropTarget ? "bg-teal-100 ring-2 ring-inset ring-teal-400" : ""} ${
        canCustomize ? "cursor-grab active:cursor-grabbing" : ""
      }`}
    >
      <button
        type="button"
        title={`Show ${props.col.label}`}
        aria-label={`Expand ${props.col.label}`}
        onClick={props.onExpand}
        className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded px-0.5 py-1 text-[9px] font-semibold leading-tight text-teal-800 hover:bg-teal-100"
      >
        <Plus size={10} className="shrink-0" />
        <span className="max-h-14 overflow-hidden [writing-mode:vertical-rl] rotate-180">
          {props.col.label}
        </span>
      </button>
    </th>
  );
}

function renderHeaderSlot(
  slot: CrmColumnRenderSlot,
  ctx: {
    props: Props;
    canCustomize: boolean;
    dragId: CrmUsersColId | null;
    overId: CrmUsersColId | null;
    setDragId: (id: CrmUsersColId | null) => void;
    setOverId: (id: CrmUsersColId | null) => void;
    widthFor: (id: CrmUsersColId) => number;
  },
) {
  const { props, canCustomize, dragId, overId, setDragId, setOverId, widthFor } = ctx;
  if (slot.kind === "umbrella") {
    if (!slot.cols.length) return null;
    return (
      <UmbrellaColumnHeader
        key="__umbrella__"
        cols={slot.cols}
        onExpand={() => props.onExpandUmbrella?.()}
      />
    );
  }
  const { col, hidden } = slot;
  if (!col) return null;
  if (hidden) {
    return (
      <CollapsedColumnHeader
        key={col.id}
        col={col}
        canCustomize={canCustomize}
        dragging={dragId === col.id}
        dropTarget={overId === col.id && dragId !== null && dragId !== col.id}
        onExpand={() => props.onExpandColumn?.(col.id)}
        onDragStart={(id) => setDragId(id)}
        onDragEnd={() => {
          setDragId(null);
          setOverId(null);
        }}
        onDragOver={(id) => setOverId(id)}
        onDrop={(fromId, toId) => props.onColumnReorder?.(fromId, toId)}
      />
    );
  }
  return (
    <ColumnHeader
      key={col.id}
      col={col}
      widthPx={widthFor(col.id)}
      sortBy={props.sortBy}
      sortDir={props.sortDir}
      canCustomize={canCustomize}
      dragging={dragId === col.id}
      dropTarget={overId === col.id && dragId !== null && dragId !== col.id}
      onSort={props.onSort}
      onDragStart={(id) => setDragId(id)}
      onDragEnd={() => {
        setDragId(null);
        setOverId(null);
      }}
      onDragOver={(id) => setOverId(id)}
      onDrop={(fromId, toId) => props.onColumnReorder?.(fromId, toId)}
      onResizePreview={(id, w) => props.onColumnResizePreview?.(id, w)}
      onResizeCommit={(id, w) => props.onColumnResizeCommit?.(id, w)}
      onCollapse={
        canCustomize && props.onCollapseColumn ? () => props.onCollapseColumn?.(col.id) : undefined
      }
    />
  );
}

function renderBodySlot(
  slot: CrmColumnRenderSlot,
  u: CrmUser,
  ctx: { widthFor: (id: CrmUsersColId) => number; renderCell: (id: CrmUsersColId, u: CrmUser) => React.ReactNode },
) {
  if (slot.kind === "umbrella") {
    return <td key="__umbrella__" className="w-11 min-w-[44px] border-l border-dashed border-teal-100 bg-slate-50/50" />;
  }
  const { col, hidden } = slot;
  if (!col) return null;
  if (hidden) {
    return <td key={col.id} className="w-9 min-w-[36px] border-l border-dashed border-teal-100 bg-slate-50/50" />;
  }
  const w = ctx.widthFor(col.id);
  return (
    <td
      key={col.id}
      style={{ width: w, minWidth: w, maxWidth: w }}
      className="overflow-hidden px-2 py-2 align-top text-slate-600"
    >
      {ctx.renderCell(col.id, u)}
    </td>
  );
}

export function CrmUsersTable(props: Props) {
  const renderSlots = buildColumnRenderSlots(props.columnSlots);
  const colSpan = renderSlots.length + 1;
  const canCustomize = Boolean(props.canReorder && props.onColumnReorder);
  const canResize = Boolean(canCustomize && props.onColumnResizeCommit);
  const [dragId, setDragId] = useState<CrmUsersColId | null>(null);
  const [overId, setOverId] = useState<CrmUsersColId | null>(null);

  const widthFor = (id: CrmUsersColId) => getColumnWidth(props.columnLayout, id);
  const headerCtx = { props, canCustomize, dragId, overId, setDragId, setOverId, widthFor };

  function renderCell(colId: CrmUsersColId, u: CrmUser) {
    const busy = props.savingId === u.id;
    const patch = (p: CrmUserPatch) => props.onPatch(u.id, p);

    switch (colId) {
      case "online":
        return (
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${u.online ? "bg-emerald-600" : "bg-[#ccc]"}`}
            title={u.online ? "Online" : "Offline"}
          />
        );
      case "displayId":
        return (
          <Link to={`/admin/crm/users/${u.id}`} className="font-mono text-teal-600 hover:underline">
            {u.displayId}
          </Link>
        );
      case "name":
        return (
          <Link to={`/admin/crm/users/${u.id}`} className="font-medium text-slate-800 hover:text-teal-600">
            {u.fullName || u.username}
          </Link>
        );
      case "phone":
        return (
          <InlineEditCell value={u.phone} disabled={busy} placeholder="Phone" onSave={(v) => patch({ phone: v })} />
        );
      case "email":
        return (
          <InlineEditCell
            value={u.email}
            disabled={busy}
            placeholder="Email"
            className="max-w-[180px]"
            onSave={(v) => patch({ email: v })}
          />
        );
      case "username":
        return (
          <InlineEditCell
            value={u.username}
            disabled={busy}
            placeholder="Username"
            onSave={(v) => patch({ username: v })}
          />
        );
      case "country":
        return (
          <InlineCountrySelect
            value={u.countryCode || ""}
            disabled={busy}
            onChange={(code) => code && patch({ countryCode: code })}
          />
        );
      case "comments":
        return (
          <InlineEditCell
            value={u.comments ?? ""}
            disabled={busy}
            multiline
            placeholder="Comment…"
            onSave={(v) => patch({ comments: v })}
          />
        );
      case "affiliate":
        return (
          <InlineEditCell
            value={u.affiliate ?? ""}
            disabled={busy}
            placeholder="Affiliate"
            onSave={(v) => patch({ affiliate: v })}
          />
        );
      case "campaignId":
        return (
          <InlineEditCell
            value={u.campaignId ?? ""}
            disabled={busy}
            placeholder="Campaign ID"
            onSave={(v) => patch({ campaignId: v })}
          />
        );
      case "campaign":
        return (
          <InlineEditCell
            value={u.campaign ?? ""}
            disabled={busy}
            placeholder="Campaign"
            onSave={(v) => patch({ campaign: v })}
          />
        );
      case "funnel":
        return (
          <InlineEditCell
            value={u.funnel ?? ""}
            disabled={busy}
            placeholder="Funnel"
            onSave={(v) => patch({ funnel: v })}
          />
        );
      case "cpa":
        return (
          <InlineEditCell value={u.cpa ?? ""} disabled={busy} placeholder="CPA" onSave={(v) => patch({ cpa: v })} />
        );
      case "cpl":
        return (
          <InlineEditCell value={u.cpl ?? ""} disabled={busy} placeholder="CPL" onSave={(v) => patch({ cpl: v })} />
        );
      case "cr":
        return (
          <InlineEditCell
            value={displayConversionRate(u.conversionRate ?? "", u.computedConversionRate ?? "0%")}
            disabled={busy}
            placeholder={u.computedConversionRate ?? "0%"}
            title={`Auto: ${u.computedConversionRate ?? "0%"}`}
            onSave={(v) => patch({ conversionRate: v })}
          />
        );
      case "pv":
        return (
          <InlineEditCell
            value={
              u.playerValue?.trim()
                ? u.playerValue
                : formatPlayerValue(u.computedPlayerValue ?? 0, u.currency)
            }
            disabled={busy}
            placeholder={formatPlayerValue(u.computedPlayerValue ?? 0, u.currency)}
            title={`Auto: deposits + bonus + adj − withdrawals − CPA/CPL`}
            onSave={(v) => patch({ playerValue: v })}
          />
        );
      case "partner":
        return (
          <InlineEditCell
            value={u.partner ?? ""}
            disabled={busy}
            placeholder="Partner"
            onSave={(v) => patch({ partner: v })}
          />
        );
      case "agent": {
        const agentOpts = [...new Set([...props.agents, u.agentName].filter(Boolean))];
        return (
          <div className="relative inline-block min-w-[120px]" title="Owner agent — who owns this client on the desk">
            <select
              value={u.agentName}
              disabled={busy}
              onChange={(e) => patch({ agentName: e.target.value })}
              className="w-full appearance-none rounded border border-teal-200 bg-white py-1 pl-2 pr-7 text-xs font-medium text-teal-900"
              aria-label={`Assign agent for ${u.fullName || u.username}`}
            >
              {agentOpts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        );
      }
      case "registration":
        return <span className="whitespace-nowrap text-slate-600">{fmtCrmRegistration(u.createdAt)}</span>;
      case "status":
        return (
          <div className="relative inline-block">
            <select
              value={u.crmStatus}
              disabled={busy}
              onChange={(e) => patch({ crmStatus: e.target.value })}
              className="appearance-none rounded border border-slate-200 bg-white py-1 pl-2 pr-7 text-xs"
            >
              {props.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        );
      case "param1":
        return (
          <InlineEditCell value={u.param1 ?? ""} disabled={busy} placeholder="Param1" onSave={(v) => patch({ param1: v })} />
        );
      case "notes":
        return (
          <Link to={`/admin/crm/users/${u.id}?tab=notes`} className="text-teal-600 hover:underline">
            {u.noteCount}
          </Link>
        );
      default:
        return "—";
    }
  }

  return (
    <table className="w-full min-w-[1200px] table-fixed border-collapse text-left">
      <thead>
        <tr
          className={`border-b text-[11px] uppercase tracking-wide text-slate-500 ${
            canCustomize ? "border-teal-200 bg-teal-50/60" : "border-slate-100 bg-slate-50"
          }`}
        >
          <th className="w-8 px-3 py-2.5">
            <input type="checkbox" checked={props.allSelected} onChange={(e) => props.onToggleAll(e.target.checked)} />
          </th>
          {renderSlots.map((slot) => renderHeaderSlot(slot, headerCtx))}
        </tr>
      </thead>
      <tbody>
        {props.users.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-400">
              No users found.
            </td>
          </tr>
        ) : (
          props.users.map((u) => (
            <tr key={u.id} className="border-b border-[#f0f0f0] text-sm hover:bg-[#f8fafc]">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={props.selected.has(u.id)}
                  onChange={(e) => props.onToggleRow(u.id, e.target.checked)}
                />
              </td>
              {renderSlots.map((slot) =>
                renderBodySlot(slot, u, { widthFor, renderCell }),
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
