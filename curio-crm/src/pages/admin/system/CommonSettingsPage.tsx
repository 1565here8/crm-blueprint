import React, { useEffect, useState } from "react";
import { client, type CrmBranding } from "../../../api/client";
import { useCrmBranding } from "../../../context/BrandingContext";
import {
  btnPrimary,
  ErrorBanner,
  inputCls,
  PageHeader,
  Panel,
} from "../../../components/admin/CrmShell";

export function CommonSettingsPage() {
  const { refreshBranding } = useCrmBranding();
  const [form, setForm] = useState<CrmBranding>({
    goToSiteUrl: "/",
    crmBrandName: "CurioCRM",
    goToSiteLabel: "Go to site",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void client.adminGetBranding().then((data) => setForm(data.branding)).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    try {
      const data = await client.adminUpdateBranding(form);
      setForm(data.branding);
      await refreshBranding();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Common"
        subtitle="Brand your backoffice and point “Go to site” at any customer-facing website"
      />
      <ErrorBanner message={error} />
      {saved ? (
        <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-emerald-600">
          Saved. The sidebar “Go to site” link is updated.
        </p>
      ) : null}

      <Panel className="max-w-xl space-y-4 p-5">
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
              CRM brand name (sidebar)
            </span>
            <input
              className={inputCls}
              value={form.crmBrandName}
              onChange={(e) => setForm({ ...form, crmBrandName: e.target.value })}
              placeholder="ANTAR MARKETS"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
              Go to site — URL
            </span>
            <input
              className={inputCls}
              value={form.goToSiteUrl}
              onChange={(e) => setForm({ ...form, goToSiteUrl: e.target.value })}
              placeholder="https://your-trading-site.com or /"
            />
            <p className="mt-1 text-xs text-slate-400">
              Full URL opens in a new tab (any website). Use <code className="text-slate-600">/</code> for
              this app&apos;s user trading panel.
            </p>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">
              Go to site — link label
            </span>
            <input
              className={inputCls}
              value={form.goToSiteLabel}
              onChange={(e) => setForm({ ...form, goToSiteLabel: e.target.value })}
              placeholder="Go to site"
            />
          </label>

          <button type="submit" className={btnPrimary}>
            Save common settings
          </button>
        </form>
      </Panel>

      <Panel className="mt-4 max-w-xl p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Proprietary CRM model</p>
        <p className="mt-2 text-slate-500">
          This backoffice is site-agnostic. Deploy one CRM instance and configure where “Go to site” sends
          operators — your live broker site, a white-label domain, or the built-in paper-trading terminal.
        </p>
      </Panel>
    </div>
  );
}
