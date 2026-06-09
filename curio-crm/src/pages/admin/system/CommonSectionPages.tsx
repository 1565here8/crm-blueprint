import React, { useEffect, useState } from "react";
import { client } from "../../../api/client";
import { btnPrimary, ErrorBanner, inputCls, Panel } from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

type Props = {
  title: string;
  fields: Array<{ key: string; label: string; type?: "text" | "number" | "url" | "checkbox"; help?: string }>;
  guideBlocks: GuideBlock[];
  guideIntro: string;
};

export function CommonSettingsFormPage({ title, fields, guideBlocks, guideIntro }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void client
      .adminCommonSettings()
      .then((d) => setForm(d.settings))
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed."))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    try {
      const patch: Record<string, string> = {};
      for (const f of fields) {
        patch[f.key] = form[f.key] ?? "";
      }
      const data = await client.adminUpdateCommonSettings(patch);
      setForm(data.settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      <ErrorBanner message={error} />
      {saved ? <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p> : null}
      <Panel className="max-w-xl p-6">
        <form className="space-y-4" onSubmit={(e) => void save(e)}>
          {fields.map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="font-medium text-slate-700">{f.label}</span>
              {f.help ? <p className="text-xs text-slate-500">{f.help}</p> : null}
              {f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  className="mt-2"
                  checked={form[f.key] === "1"}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.checked ? "1" : "0" }))}
                />
              ) : (
                <input
                  type={f.type === "number" ? "number" : f.type === "url" ? "url" : "text"}
                  className={`${inputCls} mt-1`}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              )}
            </label>
          ))}
          <button type="submit" className={btnPrimary}>
            Save
          </button>
        </form>
      </Panel>
      <PageBottomGuide intro={guideIntro} blocks={guideBlocks} />
    </div>
  );
}

export function CommonReleasePdfPage() {
  return (
    <CommonSettingsFormPage
      title="Release Pdf"
      guideIntro="Link to compliance or release PDF shown to agents (optional)."
      guideBlocks={[
        {
          title: "Release document",
          what: "URL to your latest platform release / compliance PDF.",
          how: "Host on your site or S3 — paste HTTPS URL and save.",
          when: "Regulators ask for documented platform version.",
        },
      ]}
      fields={[
        { key: "common.release_pdf_title", label: "Document title" },
        { key: "common.release_pdf_url", label: "PDF URL", type: "url" },
      ]}
    />
  );
}

export function CommonSecuritySettingsPage() {
  return (
    <CommonSettingsFormPage
      title="Session settings"
      guideIntro="Session and access defaults for staff console."
      guideBlocks={[
        {
          title: "Session timeout",
          what: "Hours before staff must log in again.",
          how: "Lower for shared office PCs; higher for trusted home agents.",
          when: "Compliance audit on desk access.",
        },
      ]}
      fields={[
        { key: "common.session_timeout_hours", label: "Session timeout (hours)", type: "number" },
        { key: "common.login_attempt_limit", label: "Login attempt limit (per 15 min)", type: "number" },
        {
          key: "common.staff_ip_lock",
          label: "Enforce staff IP allowlist",
          type: "checkbox",
          help: "When on, staff accounts must log in from IPs in the staff allowlist below.",
        },
        {
          key: "common.admin_ip_allowlist",
          label: "Owner admin IP allowlist",
          type: "text",
          help: "Comma-separated IPs or CIDR (e.g. 203.0.113.10, 10.0.0.0/24). Empty = open worldwide.",
        },
        {
          key: "common.staff_ip_allowlist",
          label: "Staff IP allowlist",
          type: "text",
          help: "Used when staff IP lock is on. Also set ADMIN_IP_ALLOWLIST in .env for hard override.",
        },
      ]}
    />
  );
}
