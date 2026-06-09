import React, { useEffect, useState } from "react";
import { client, type PaymentGatewayConfig } from "../../../api/client";
import { ActionGuideBar, BrokerGuide, FieldHint } from "../../../components/admin/BrokerGuide";
import {
  btnPrimary,
  btnSecondary,
  DataTable,
  ErrorBanner,
  inputCls,
  Panel,
  TableHead,
  fmtDate,
} from "../../../components/admin/CrmShell";
import { paymentGatewayTabGuides } from "./paymentGatewayGuides";

const pageGuide = paymentGatewayTabGuides["test-cards"];

type FormState = {
  name: string;
  credentialsJson: string;
  cardNumbers: string;
  is3d: boolean;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  credentialsJson: "{}",
  cardNumbers: "",
  is3d: false,
  description: "",
};

function credentialsToJson(creds: Record<string, string>): string {
  return JSON.stringify(creds, null, 2);
}

function parseCredentialsJson(raw: string): Record<string, string> | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = String(v);
    }
    return out;
  } catch {
    return null;
  }
}

function GatewayEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: FormState;
  onSave: (form: FormState) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!parseCredentialsJson(form.credentialsJson)) {
      setErr("Credentials must be valid JSON (key → string values).");
      return;
    }
    setBusy(true);
    try {
      await onSave(form);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="mb-4 space-y-4 p-5">
      <ErrorBanner message={err} />
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Payment Gateway</span>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="directPay"
            required
          />
          <FieldHint label="Name" help="Must match the Processor list exactly (e.g. directPay, payretailers)." />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
            Credentials (JSON format)
          </span>
          <textarea
            className={`${inputCls} min-h-[140px] font-mono text-xs`}
            value={form.credentialsJson}
            onChange={(e) => setForm({ ...form, credentialsJson: e.target.value })}
            spellCheck={false}
          />
          <FieldHint
            label="JSON keys"
            help="One key per line from your PSP backoffice — merchantId, secretKey, currency, etc. Used when the deposit API calls the gateway."
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Credit Card Numbers</span>
          <textarea
            className={`${inputCls} min-h-[80px] font-mono text-xs`}
            value={form.cardNumbers}
            onChange={(e) => setForm({ ...form, cardNumbers: e.target.value })}
            placeholder="4111111111111111, 05/20 test test 123"
          />
          <FieldHint
            label="Sandbox cards"
            help="Test PANs your QA team uses — label 3D vs no3D if the PSP requires it. Not shown to live clients unless you enable card deposits."
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.is3d}
            onChange={(e) => setForm({ ...form, is3d: e.target.checked })}
          />
          Is 3D Secure
        </label>
        <FieldHint label="3-D Secure" help="Check if this gateway row is for 3-D Secure challenge flows only." />
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Description / Condition</span>
          <textarea
            className={`${inputCls} min-h-[60px]`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <FieldHint label="Notes" help="Backoffice URLs, API doc links, or when to use this gateway — visible to desk staff." />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={btnPrimary} disabled={busy}>
            Save
          </button>
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </form>
    </Panel>
  );
}

function GatewayRow({
  gateway,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddFile,
  onDeleteFile,
}: {
  gateway: PaymentGatewayConfig;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddFile: (fileName: string) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
}) {
  const [fileName, setFileName] = useState("");
  const [fileBusy, setFileBusy] = useState(false);

  async function addFile(e: React.FormEvent) {
    e.preventDefault();
    if (!fileName.trim()) return;
    setFileBusy(true);
    try {
      await onAddFile(fileName.trim());
      setFileName("");
    } finally {
      setFileBusy(false);
    }
  }

  return (
    <>
      <tr className="border-b border-slate-100 text-sm">
        <td className="px-4 py-2.5 font-medium text-slate-900">{gateway.name}</td>
        <td className="max-w-xs truncate px-4 py-2.5 font-mono text-xs text-slate-600">{gateway.card_numbers}</td>
        <td className="px-4 py-2.5">{gateway.is_3d ? "True" : "False"}</td>
        <td className="max-w-[200px] truncate px-4 py-2.5 text-slate-500">{gateway.description || "—"}</td>
        <td className="px-4 py-2.5">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="text-xs text-teal-600 hover:underline" onClick={onToggle}>
              {expanded ? "Hide" : "Details"}
            </button>
            <button type="button" className="text-xs text-teal-600 hover:underline" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => void onDelete()}>
              Delete
            </button>
          </div>
        </td>
      </tr>
      {expanded ? (
        <tr className="border-b border-slate-100 bg-slate-50/80">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500">Credentials</p>
                <pre className="overflow-auto rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700">
                  {credentialsToJson(gateway.credentials)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase text-slate-500">Files</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="pb-1 font-semibold">File</th>
                      <th className="pb-1 font-semibold">Last modified</th>
                      <th className="pb-1 font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateway.files.map((f) => (
                      <tr key={f.id} className="border-t border-slate-200">
                        <td className="py-1.5">{f.file_name}</td>
                        <td className="py-1.5 text-slate-500">{fmtDate(f.uploaded_at)}</td>
                        <td className="py-1.5">
                          <button
                            type="button"
                            className="text-rose-600 hover:underline"
                            onClick={() => void onDeleteFile(f.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {gateway.files.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-2 text-slate-400">
                          No files
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <form onSubmit={(e) => void addFile(e)} className="mt-3 flex gap-2">
                  <input
                    className={`${inputCls} text-xs`}
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="Drop files here to upload (filename)"
                  />
                  <button type="submit" className={btnSecondary} disabled={fileBusy}>
                    Add
                  </button>
                </form>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function TestCreditCardsPage() {
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);

  async function load() {
    const data = await client.adminPaymentGateways();
    setGateways(data.gateways);
  }

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  function gatewayToForm(g: PaymentGatewayConfig): FormState {
    return {
      name: g.name,
      credentialsJson: credentialsToJson(g.credentials),
      cardNumbers: g.card_numbers,
      is3d: g.is_3d,
      description: g.description,
    };
  }

  async function saveForm(form: FormState) {
    const credentials = parseCredentialsJson(form.credentialsJson);
    if (!credentials) throw new Error("Invalid credentials JSON.");
    if (mode === "create") {
      await client.adminCreatePaymentGateway({
        name: form.name,
        credentials,
        cardNumbers: form.cardNumbers,
        is3d: form.is3d,
        description: form.description,
      });
    } else if (editId) {
      await client.adminUpdatePaymentGateway(editId, {
        name: form.name,
        credentials,
        cardNumbers: form.cardNumbers,
        is3d: form.is3d,
        description: form.description,
      });
    }
    setMode("list");
    setEditId(null);
    await load();
  }

  return (
    <div>
      <BrokerGuide title={pageGuide.title}>{pageGuide.body}</BrokerGuide>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Test credit card numbers</h2>
        {mode === "list" ? (
          <button type="button" className={btnPrimary} onClick={() => setMode("create")}>
            Add gateway
          </button>
        ) : null}
      </div>

      <ErrorBanner message={error} />

      {mode === "create" ? (
        <GatewayEditor initial={emptyForm} onSave={saveForm} onCancel={() => setMode("list")} />
      ) : null}

      {mode === "edit" && editId ? (
        <GatewayEditor
          initial={gatewayToForm(gateways.find((g) => g.id === editId)!)}
          onSave={saveForm}
          onCancel={() => {
            setMode("list");
            setEditId(null);
          }}
        />
      ) : null}

      {mode === "list" ? (
        <DataTable>
          <TableHead cols={["Payment Gateway", "Credit Card Numbers", "Is 3D", "Description", "Actions"]} />
          <tbody>
            {gateways.map((g) => (
              <GatewayRow
                key={g.id}
                gateway={g}
                expanded={expandedId === g.id}
                onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
                onEdit={() => {
                  setEditId(g.id);
                  setMode("edit");
                }}
                onDelete={async () => {
                  if (!confirm(`Delete ${g.name}?`)) return;
                  await client.adminDeletePaymentGateway(g.id);
                  await load();
                }}
                onAddFile={async (fileName) => {
                  await client.adminAddPaymentGatewayFile(g.id, fileName);
                  await load();
                }}
                onDeleteFile={async (fileId) => {
                  await client.adminDeletePaymentGatewayFile(g.id, fileId);
                  await load();
                }}
              />
            ))}
          </tbody>
        </DataTable>
      ) : null}

      <ActionGuideBar
        actions={[
          {
            label: "Add gateway",
            help: "Opens a form for a new PSP — name it like directPay, paste JSON credentials from the merchant portal, add sandbox card numbers, then Save.",
          },
          {
            label: "Save",
            help: "Stores credentials in the CRM database. Does not enable live card deposits until Processors marks the gateway enabled and platform card funding is turned on.",
          },
          {
            label: "Cancel",
            help: "Discards unsaved edits and returns to the table.",
          },
          {
            label: "Details",
            help: "Expands the row to show full JSON credentials and attached reference files (screenshots, PSP PDFs).",
          },
          {
            label: "Edit",
            help: "Change keys, cards, or notes for an existing gateway without deleting history.",
          },
          {
            label: "Delete",
            help: "Removes this gateway and its file list permanently — also remove it from Processors if clients should not see it.",
          },
          {
            label: "Add (files)",
            help: "Registers a filename for desk reference (e.g. test3.png). Upload the actual file to your secure document store if required by compliance.",
          },
        ]}
      />
    </div>
  );
}
