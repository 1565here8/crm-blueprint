import {
  Apple,
  ArrowRightLeft,
  Check,
  Copy,
  Download,
  Globe,
  Laptop,
  Loader2,
  Monitor,
  RefreshCw,
  Server,
  Smartphone,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { client } from "../../../api/client";
import { CurioniStatCard } from "../../../components/admin/curioni/CurioniStatCard";
import { ErrorBanner, Panel, adminUi } from "../../../components/admin/CrmShell";
import { CrmHero, CrmPageLayout } from "../../../components/admin/crm/CrmPageLayout";
import {
  MT_PLATFORM_META,
  MT_PLATFORMS,
  MT_SYNC_MODES,
  type MtPlatform,
} from "../../../../shared/metaTraderBridge";
import { curioni } from "../../../lib/curioniDesign";

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition ${on ? "bg-emerald-500" : "bg-slate-200"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function PlatformCard({
  platform,
  settings,
  saving,
  onSave,
}: {
  platform: MtPlatform;
  settings: Record<string, string>;
  saving: string | null;
  onSave: (patch: Record<string, string>) => Promise<void>;
}) {
  const meta = MT_PLATFORM_META[platform];
  const p = `${platform}.`;
  const enabled = settings[`${p}enabled`] === "1";
  const busy = saving?.startsWith(p) ?? false;
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraft({});
  }, [settings, platform]);

  const val = (key: string) => draft[`${p}${key}`] ?? settings[`${p}${key}`] ?? "";
  const commit = (key: string, value: string) => {
    const full = `${p}${key}`;
    if (value === (settings[full] ?? "")) {
      setDraft((d) => {
        const next = { ...d };
        delete next[full];
        return next;
      });
      return;
    }
    void onSave({ [full]: value });
  };

  const field = (key: string, label: string, opts?: { type?: string; placeholder?: string }) => (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={opts?.type ?? "text"}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
        value={val(key)}
        placeholder={opts?.placeholder}
        onChange={(e) => setDraft((d) => ({ ...d, [`${p}${key}`]: e.target.value }))}
        onBlur={(e) => commit(key, e.target.value)}
      />
    </label>
  );

  const accentRing = platform === "mt4" ? "ring-emerald-500/20" : "ring-blue-500/20";
  const accentBadge = platform === "mt4" ? "bg-emerald-600" : "bg-blue-600";

  return (
    <Panel className={`overflow-hidden p-0 ring-2 ${accentRing}`}>
      <div className={`bg-gradient-to-br ${meta.accentSoft} px-5 py-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${accentBadge}`}>
              {meta.short}
            </span>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{meta.label}</h2>
            <p className="mt-1 max-w-md text-sm text-slate-600">{meta.tagline}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Toggle
              label={`${meta.short} bridge`}
              on={enabled}
              onChange={(v) => void onSave({ [`${p}enabled`]: v ? "1" : "0" })}
            />
            <span className="text-[10px] font-semibold text-slate-500">{enabled ? "Bridge live" : "Disabled"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {field("server_name", "Server name (shown to clients)", { placeholder: "Curioni-Live" })}
          {field("host", "Bridge host", { placeholder: "trade.yourbroker.com" })}
          {field("port", "Port", { type: "number", placeholder: "443" })}
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Sync mode</span>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15"
              value={val("sync_mode") || "realtime"}
              onChange={(e) => void onSave({ [`${p}sync_mode`]: e.target.value })}
            >
              {MT_SYNC_MODES.map((m) => (
                <option key={m} value={m}>
                  {m === "realtime" ? "Real-time (WebSocket)" : "Batch (60s poll)"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {field("account_group", "Default MT group", { placeholder: "demo\\standard" })}
          {field("manager_login", "Manager API login", { placeholder: "Optional — server-side only" })}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Auto-provision logins</p>
            <p className="text-xs text-slate-500">Create MT account when CRM user registers</p>
          </div>
          <Toggle
            label="Auto-provision"
            on={settings[`${p}auto_provision`] === "1"}
            onChange={(v) => void onSave({ [`${p}auto_provision`]: v ? "1" : "0" })}
          />
        </div>

        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Client download URLs</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["download_win", "download_mac", "download_ios", "download_android"] as const).map((k) => (
              <input
                key={k}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-violet-400"
                value={val(k)}
                onChange={(e) => setDraft((d) => ({ ...d, [`${p}${k}`]: e.target.value }))}
                onBlur={(e) => commit(k, e.target.value)}
                placeholder={k.replace("download_", "")}
              />
            ))}
          </div>
        </div>

        {busy ? (
          <p className="flex items-center gap-2 text-xs text-violet-600">
            <Loader2 size={14} className="animate-spin" /> Saving…
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

export function MetaTraderHubPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await client.adminMetaTraderBridge();
      setSettings(data.settings);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Record<string, string>) {
    const key = Object.keys(patch)[0] ?? "";
    setSaving(key);
    setSettings((prev) => ({ ...prev, ...patch }));
    try {
      const data = await client.adminUpdateMetaTraderBridge(patch);
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      await load();
    } finally {
      setSaving(null);
    }
  }

  function copyText(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const mt4On = settings["mt4.enabled"] === "1";
  const mt5On = settings["mt5.enabled"] === "1";
  const liveCount = (mt4On ? 1 : 0) + (mt5On ? 1 : 0);

  return (
    <CrmPageLayout wide>
      <CrmHero
        eyebrow="Integrations · Trading platforms"
        title="MetaTrader 4 & 5"
        subtitle="Bridge the world's most deployed retail terminals to Curioni CRM — balances, trades, and logins stay in sync."
        actions={
          <Link to="/admin/integrations" className={adminUi.btnSecondary}>
            Integration Hub
          </Link>
        }
      />
      <ErrorBanner message={error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CurioniStatCard label="Platforms live" value={String(liveCount)} icon={Monitor} tone="emerald" />
        <CurioniStatCard label="Sync mode" value={settings["mt4.sync_mode"] === "realtime" ? "Real-time" : "Batch"} icon={Zap} tone="cyan" />
        <CurioniStatCard label="Auto-provision" value={settings["mt4.auto_provision"] === "1" ? "On" : "Off"} icon={Server} tone="violet" />
        <CurioniStatCard label="Instruments" value="Open" to="/admin/trading/assets" icon={Globe} tone="amber" />
      </div>

      <Panel className={`mb-6 overflow-hidden p-0 ${curioni.gradient}`}>
        <div className="relative px-6 py-8 text-white sm:px-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDYpIi8+PC9nPjwvc3ZnPg==')] opacity-40" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className={curioni.heroBadge}>Bridge architecture</p>
              <h3 className="mt-3 text-2xl font-bold tracking-tight">CRM ↔ MetaTrader sync</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Client registers in CRM → bridge provisions MT login → trades and balances mirror both ways. No duplicate
                data entry for your desk.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div className="rounded-xl bg-white/15 px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Curioni CRM</p>
                <p className="mt-1 text-sm font-semibold">Users · Ledger</p>
              </div>
              <ArrowRightLeft className="text-white/70" size={22} />
              <div className="rounded-xl bg-emerald-500/25 px-4 py-3 text-center ring-1 ring-emerald-400/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">MT4</p>
                <p className="mt-1 text-sm font-semibold">{settings["mt4.server_name"] || "—"}</p>
              </div>
              <div className="rounded-xl bg-blue-500/25 px-4 py-3 text-center ring-1 ring-blue-400/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100">MT5</p>
                <p className="mt-1 text-sm font-semibold">{settings["mt5.server_name"] || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        {MT_PLATFORMS.map((p) => (
          <PlatformCard key={p} platform={p} settings={settings} saving={saving} onSave={save} />
        ))}
      </div>

      <Panel className="p-5">
        <h3 className="text-sm font-semibold text-slate-800">Client download kit</h3>
        <p className="mt-1 text-xs text-slate-500">Copy-ready links for onboarding emails and your public site.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MT_PLATFORMS.map((platform) => {
            const meta = MT_PLATFORM_META[platform];
            const icons = [
              { k: "download_win", icon: Laptop, label: "Windows" },
              { k: "download_mac", icon: Apple, label: "macOS" },
              { k: "download_ios", icon: Smartphone, label: "iOS" },
              { k: "download_android", icon: Smartphone, label: "Android" },
            ] as const;
            return (
              <div key={platform} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="text-sm font-bold text-slate-800">{meta.label}</p>
                <p className="text-xs text-slate-500">Server: {settings[`${platform}.server_name`]}</p>
                <ul className="mt-3 space-y-2">
                  {icons.map(({ k, icon: Icon, label }) => {
                    const url = settings[`${platform}.${k}`] ?? "";
                    const id = `${platform}-${k}`;
                    return (
                      <li key={k} className="flex items-center gap-2">
                        <Icon size={14} className="shrink-0 text-slate-400" />
                        <span className="w-16 text-xs font-medium text-slate-600">{label}</span>
                        <span className="min-w-0 flex-1 truncate text-xs text-violet-600">{url || "—"}</span>
                        {url ? (
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 text-slate-400 hover:bg-white hover:text-violet-600"
                            onClick={() => copyText(url, id)}
                            title="Copy URL"
                          >
                            {copied === id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                        ) : null}
                        {url ? (
                          <a href={url} target="_blank" rel="noreferrer" className="shrink-0 text-slate-400 hover:text-violet-600">
                            <Download size={14} />
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={adminUi.btnSecondary} onClick={() => void load()}>
            <RefreshCw size={14} className="mr-1 inline" /> Reload
          </button>
          <Link to="/admin/system/api-docs" className={adminUi.btnSecondary}>
            API docs
          </Link>
        </div>
      </Panel>
    </CrmPageLayout>
  );
}
