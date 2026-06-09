import React, { useEffect, useState } from "react";
import { client, type PaymentProcessor } from "../../../api/client";
import { ActionGuideBar, BrokerGuide, FieldHint } from "../../../components/admin/BrokerGuide";
import {
  btnPrimary,
  btnSecondary,
  DataTable,
  ErrorBanner,
  inputCls,
  Panel,
  TableHead,
} from "../../../components/admin/CrmShell";
import { paymentGatewayTabGuides } from "./paymentGatewayGuides";

type RowState = {
  id?: string;
  gatewayName: string;
  enabled: boolean;
  includeCountries: string;
  excludeCountries: string;
  tabPriority: number;
  processorPriority: number;
};

function toRowState(p: PaymentProcessor): RowState {
  return {
    id: p.id,
    gatewayName: p.gateway_name,
    enabled: p.enabled,
    includeCountries: p.include_countries,
    excludeCountries: p.exclude_countries,
    tabPriority: p.tab_priority,
    processorPriority: p.processor_priority,
  };
}

function emptyRow(): RowState {
  return {
    gatewayName: "",
    enabled: true,
    includeCountries: "*",
    excludeCountries: "",
    tabPriority: 99,
    processorPriority: 99,
  };
}

const guide = paymentGatewayTabGuides.processors;

export function ProcessorsPage() {
  const [rows, setRows] = useState<RowState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await client.adminPaymentProcessors();
    setRows(data.processors.map(toRowState));
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  function patchRow(index: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
    setSaved(false);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      for (const r of rows) {
        if (!r.gatewayName.trim()) {
          throw new Error("Every row needs a Payment Gateway name.");
        }
      }
      const data = await client.adminSavePaymentProcessors({ processors: rows });
      setRows(data.processors.map(toRowState));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <BrokerGuide title={guide.title}>{guide.body}</BrokerGuide>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">Processor list</h2>
      <ErrorBanner message={error} />
      {saved ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Processor routing saved. New deposit sessions will use this order.
        </p>
      ) : null}

      <DataTable>
        <TableHead
          cols={[
            "Payment Gateway",
            "Enabled",
            "Include Countries",
            "Exclude Countries",
            "Tab Priority",
            "Processor Priority",
            "",
          ]}
        />
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? `new-${i}`} className="border-b border-slate-100 text-sm">
              <td className="px-2 py-2">
                <input
                  className={`${inputCls} min-w-[120px]`}
                  value={row.gatewayName}
                  onChange={(e) => patchRow(i, { gatewayName: e.target.value })}
                  placeholder="directPay"
                />
              </td>
              <td className="px-2 py-2">
                <select
                  className={inputCls}
                  value={row.enabled ? "1" : "0"}
                  onChange={(e) => patchRow(i, { enabled: e.target.value === "1" })}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </td>
              <td className="px-2 py-2">
                <input
                  className={`${inputCls} min-w-[100px]`}
                  value={row.includeCountries}
                  onChange={(e) => patchRow(i, { includeCountries: e.target.value })}
                  placeholder="* or US,GB"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  className={`${inputCls} min-w-[100px]`}
                  value={row.excludeCountries}
                  onChange={(e) => patchRow(i, { excludeCountries: e.target.value })}
                  placeholder="Optional"
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  className={`${inputCls} w-20`}
                  value={row.tabPriority}
                  onChange={(e) => patchRow(i, { tabPriority: Number(e.target.value) || 0 })}
                />
              </td>
              <td className="px-2 py-2">
                <input
                  type="number"
                  className={`${inputCls} w-20`}
                  value={row.processorPriority}
                  onChange={(e) => patchRow(i, { processorPriority: Number(e.target.value) || 0 })}
                />
              </td>
              <td className="px-2 py-2">
                <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => removeRow(i)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No processors yet — add a row and Submit.</p>
      ) : null}

      <Panel className="mt-4 space-y-2 p-4 text-xs text-slate-600">
        <FieldHint
          label="Include Countries"
          help='Use * for all countries, or ISO codes comma-separated (e.g. US,GB,DE). Client must match to see this gateway tab.'
        />
        <FieldHint
          label="Tab Priority"
          help="Order of tabs on the deposit page — 1 shows first. Match gateway name to Test Credit Cards exactly."
        />
        <FieldHint
          label="Processor Priority"
          help="When multiple processors share a tab, lower number wins. Use with cascading rules for fallbacks."
        />
      </Panel>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={busy} onClick={() => void submit()}>
          Submit
        </button>
        <button type="button" className={btnSecondary} disabled={busy} onClick={addRow}>
          Add row
        </button>
      </div>

      <ActionGuideBar
        actions={[
          {
            label: "Submit",
            help: "Saves every row in the table above. Clients refreshing the deposit page will see the new gateway order and country rules. Does not change API keys — edit those under Test Credit Cards.",
          },
          {
            label: "Add row",
            help: "Adds a blank processor line. Fill Payment Gateway (must match a configured PSP name), set priorities, then Submit.",
          },
          {
            label: "Remove",
            help: "Deletes that row from the list when you Submit — use to permanently stop offering a gateway without deleting its test credentials.",
          },
        ]}
      />
    </div>
  );
}
