import React, { useState } from "react";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import {
  CRM_USERS_COLUMNS,
  reorderColumns,
  roleColumnHint,
  type CrmColumnLayout,
  type CrmDeskRole,
  type CrmUsersColId,
  saveColumnLayout,
} from "../../../lib/crmUsersTableColumns";

type Props = {
  layout: CrmColumnLayout;
  role: CrmDeskRole;
  onChange: (layout: CrmColumnLayout) => void;
  onClose: () => void;
};

export function CrmColumnPicker({ layout, role, onChange, onClose }: Props) {
  const [dragId, setDragId] = useState<CrmUsersColId | null>(null);
  const labels = new Map(CRM_USERS_COLUMNS.map((c) => [c.id, c.label]));

  function apply(next: CrmColumnLayout) {
    onChange(next);
    saveColumnLayout(next, role);
  }

  function toggleHidden(id: CrmUsersColId) {
    const hidden = new Set(layout.hidden);
    if (hidden.has(id)) hidden.delete(id);
    else hidden.add(id);
    apply({ ...layout, hidden: [...hidden] });
  }

  function onDrop(targetId: CrmUsersColId) {
    if (!dragId || dragId === targetId) return;
    apply({ ...layout, order: reorderColumns(layout.order, dragId, targetId) });
    setDragId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">Table columns</h2>
              <p className="mt-1 text-xs text-slate-500">{roleColumnHint(role)}</p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        </div>

        <p className="border-b border-slate-50 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500">
          Drag the grip handle to move columns. Eye toggles show/hide.
        </p>

        <ul className="max-h-[58vh] overflow-y-auto p-2">
          {layout.order.map((id) => {
            const hidden = layout.hidden.includes(id);
            const dragging = dragId === id;
            return (
              <li
                key={id}
                draggable
                onDragStart={() => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(id);
                }}
                className={`mb-1 flex items-center gap-2 rounded border px-2 py-2 text-sm transition ${
                  dragging
                    ? "border-teal-400 bg-teal-50 opacity-60"
                    : "border-slate-100 bg-slate-50/80 hover:border-teal-200 hover:bg-white"
                }`}
              >
                <span
                  className="cursor-grab text-slate-400 active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  <GripVertical size={16} />
                </span>
                <span
                  className={`min-w-0 flex-1 truncate ${hidden ? "text-slate-400 line-through" : "text-slate-800"}`}
                >
                  {labels.get(id) ?? id}
                </span>
                <button
                  type="button"
                  className="rounded p-1 text-teal-700 hover:bg-teal-50"
                  title={hidden ? "Show column" : "Hide column"}
                  onClick={() => toggleHidden(id)}
                >
                  {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex justify-between border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={() => apply({ order: [...layout.order], hidden: [] })}
          >
            Show all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
