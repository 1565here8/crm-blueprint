import React, { useEffect, useState } from "react";
import { client, type CommissionSetting } from "../../../api/client";
import {
  btnPrimary,
  ErrorBanner,
  inputCls,
  PageHeader,
  Panel,
} from "../../../components/admin/CrmShell";

type Props = {
  assetClass: "us_equity" | "crypto";
  title: string;
  subtitle: string;
};

export function CommissionPage({ assetClass, title, subtitle }: Props) {
  const [setting, setSetting] = useState<CommissionSetting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    commissionType: "percent" as CommissionSetting["commission_type"],
    value: "0",
    minCommission: "0",
    maxCommission: "0",
    enabled: true,
  });

  async function load() {
    setError(null);
    try {
      const data = await client.adminGetCommission(assetClass);
      setSetting(data.setting);
      setForm({
        commissionType: data.setting.commission_type,
        value: String(data.setting.value),
        minCommission: String(data.setting.min_commission),
        maxCommission: String(data.setting.max_commission),
        enabled: Boolean(data.setting.enabled),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed.");
    }
  }

  useEffect(() => {
    void load();
  }, [assetClass]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    try {
      const data = await client.adminUpdateCommission(assetClass, {
        commissionType: form.commissionType,
        value: Number(form.value),
        minCommission: Number(form.minCommission),
        maxCommission: Number(form.maxCommission),
        enabled: form.enabled,
      });
      setSetting(data.setting);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <ErrorBanner message={error} />
      {saved ? (
        <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-emerald-600">Settings saved.</p>
      ) : null}

      <Panel className="max-w-lg p-5">
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
              Commission type
            </span>
            <select
              className={inputCls}
              value={form.commissionType}
              onChange={(e) =>
                setForm({
                  ...form,
                  commissionType: e.target.value as CommissionSetting["commission_type"],
                })
              }
            >
              <option value="percent">Percent of notional (%)</option>
              <option value="fixed_per_trade">Fixed per trade (USD)</option>
              <option value="fixed_per_lot">Fixed per lot (USD)</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Value</span>
            <input
              className={inputCls}
              type="number"
              step="0.01"
              min="0"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Min (USD)</span>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={form.minCommission}
                onChange={(e) => setForm({ ...form, minCommission: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Max (USD)</span>
              <input
                className={inputCls}
                type="number"
                step="0.01"
                min="0"
                value={form.maxCommission}
                onChange={(e) => setForm({ ...form, maxCommission: e.target.value })}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#555]">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enable commission on {assetClass === "crypto" ? "crypto" : "forex / US equity"} trades
          </label>

          {setting ? (
            <p className="text-xs text-slate-400">Last updated: {new Date(setting.updated_at).toLocaleString()}</p>
          ) : null}

          <button type="submit" className={btnPrimary}>
            Save commission settings
          </button>
        </form>
      </Panel>
    </div>
  );
}
