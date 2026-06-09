import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { client } from "../../../api/client";
import { btnPrimary, btnSecondary, ErrorBanner, inputCls, Panel } from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";
import {
  PREFERENCE_FIELDS,
  PREFERENCE_GROUPS,
  type PrefFieldDef,
} from "../../../../shared/platformPreferencesSchema";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
        on ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
      }`}
    >
      {on ? <Check size={14} /> : <X size={14} />}
    </button>
  );
}

const guideBlocks: GuideBlock[] = [
  {
    title: "Preferences list",
    what: "Every platform toggle in one scrollable list — currency, timezone, and feature flags.",
    how: "Toggles save instantly. Text fields save on blur or Enter. Use search to find a setting fast.",
    when: "Launch day, compliance review, or hiding payment rails you do not offer.",
  },
];

export function PreferencesPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await client.adminPreferences();
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PREFERENCE_FIELDS;
    return PREFERENCE_FIELDS.filter(
      (f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q) || f.group.toLowerCase().includes(q),
    );
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, PrefFieldDef[]>();
    for (const g of PREFERENCE_GROUPS) map.set(g, []);
    for (const f of filtered) {
      if (!map.has(f.group)) map.set(f.group, []);
      map.get(f.group)!.push(f);
    }
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [filtered]);

  async function saveKeyValue(key: string, value: string) {
    setSavingKey(key);
    setError(null);
    try {
      const data = await client.adminUpdatePreferences({ [key]: value });
      setSettings(data.settings);
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingKey(null);
    }
  }

  function renderValue(field: PrefFieldDef) {
    const val = settings[field.key] ?? field.defaultValue;
    const busy = savingKey === field.key;
    const justSaved = savedKey === field.key;

    if (field.type === "toggle") {
      const on = val === "1";
      return (
        <div className="flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin text-slate-400" /> : null}
          {justSaved ? <span className="text-[10px] text-emerald-600">saved</span> : null}
          <Toggle on={on} onChange={(v) => void saveKeyValue(field.key, v ? "1" : "0")} />
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <select
          className="max-w-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          value={val}
          disabled={busy}
          onChange={(e) => void saveKeyValue(field.key, e.target.value)}
        >
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          className={`${inputCls} max-w-lg text-xs`}
          rows={2}
          defaultValue={val}
          disabled={busy}
          onBlur={(e) => {
            if (e.target.value !== val) void saveKeyValue(field.key, e.target.value);
          }}
        />
      );
    }

    return (
      <input
        className={`${inputCls} max-w-xs text-sm ${field.type === "number" ? "font-mono tabular-nums" : ""}`}
        type={field.type === "number" ? "number" : "text"}
        defaultValue={val || "—"}
        disabled={busy}
        onBlur={(e) => {
          const v = e.target.value === "—" ? "" : e.target.value;
          if (v !== val) void saveKeyValue(field.key, v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Preferences list</h2>
        <div className="relative min-w-[220px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputCls} pl-9 text-sm`}
            placeholder="Search preferences…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ErrorBanner message={error} />

      {loading ? (
        <Panel className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={28} />
        </Panel>
      ) : (
        <div className="space-y-4">
          {grouped.map(([group, fields]) => (
            <Panel key={group} className="overflow-hidden p-0">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{group}</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {fields.map((field) => (
                  <li
                    key={field.key}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-teal-50/20"
                  >
                    <div className="min-w-[200px] flex-1">
                      <p className="text-sm font-medium text-slate-800">{field.label}</p>
                      {field.help ? <p className="text-[11px] text-slate-500">{field.help}</p> : null}
                    </div>
                    <div className="shrink-0">{renderValue(field)}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="button" className={btnSecondary} onClick={() => void load()}>
          Reload
        </button>
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            const defaults: Record<string, string> = {};
            for (const f of PREFERENCE_FIELDS) defaults[f.key] = f.defaultValue;
            void client.adminUpdatePreferences(defaults).then((d) => setSettings(d.settings));
          }}
        >
          Reset all to defaults
        </button>
      </div>

      <PageBottomGuide intro="Platform-wide defaults — edit inline, save each row." blocks={guideBlocks} />
    </div>
  );
}
