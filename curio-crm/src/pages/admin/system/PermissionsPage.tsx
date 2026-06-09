import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Banknote,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  Megaphone,
  PanelLeft,
  Save,
  Search,
  Settings,
  Shield,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { client } from "../../../api/client";
import {
  AdminPageHeader,
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  Panel,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";
import {
  catalogForScope,
  categoriesForScope,
  PERMISSION_NAV_GROUPS,
  type PermissionDef,
  type PermissionNavGroup,
  type PermissionScope,
} from "../../../../shared/groupPermissionsSchema";

type DeskGroup = { id: string; name: string };

const NAV_GROUP_ICONS: Record<PermissionNavGroup, React.ComponentType<{ size?: number; className?: string }>> = {
  Sidebar: PanelLeft,
  CRM: Users,
  Cashier: Banknote,
  Trading: TrendingUp,
  Marketing: Megaphone,
  System: Settings,
};

const guideBlocks: GuideBlock[] = [
  {
    title: "CRM vs API tabs",
    what: "CRM permissions control what agents see in the admin sidebar. API permissions control REST hooks for partners.",
    how: "Pick a desk group, toggle switches, then Save changes in the sticky footer.",
    when: "Onboarding a new sales floor or tightening API access after an audit.",
  },
  {
    title: "Desk groups",
    what: "Each seeded group (admin, rep, retention-manager, etc.) gets its own permission matrix.",
    how: "Use the searchable dropdown — changes apply to everyone mapped to that group.",
    when: "You run separate retention and acquisition teams with different menus.",
  },
  {
    title: "Categories",
    what: "Twenty-plus permission categories grouped under Sidebar, CRM, Cashier, Trading, Marketing, and System.",
    how: "Search categories on the left; use Select all / Clear all per category on the right.",
    when: "First day — start with Sidebar tabs, then CRM Users, then Cashier.",
  },
  {
    title: "Per-user access",
    what: "Individual sub-admin overrides live on Access Keys.",
    how: "Open System → Access Keys to assign presets to a named user.",
    when: "One senior agent needs extra rights without changing the whole group.",
  },
];

function SwitchCard({
  def,
  on,
  onChange,
}: {
  def: PermissionDef;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition ${
        on ? "border-teal-200 bg-teal-50/50" : "border-slate-200/80 bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{def.label}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{def.description}</p>
        {def.staffKey && def.staffKey !== def.key ? (
          <p className="mt-1.5 font-mono text-[10px] text-slate-400">{def.staffKey}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={def.label}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-teal-500" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
            on ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

export default function PermissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scope, setScope] = useState<PermissionScope>("crm");
  const [groups, setGroups] = useState<DeskGroup[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [catSearch, setCatSearch] = useState("");
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const dirty = useMemo(() => {
    if (enabled.size !== saved.size) return true;
    for (const k of enabled) if (!saved.has(k)) return true;
    return false;
  }, [enabled, saved]);

  const catalog = useMemo(() => catalogForScope(scope), [scope]);
  const categories = useMemo(() => categoriesForScope(scope), [scope]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q) || g.id.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const selectedGroup = useMemo(() => groups.find((g) => g.id === groupId) ?? null, [groups, groupId]);

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    const withPerms = categories.filter((c) => catalog.some((p) => p.categoryId === c.id));
    if (!q) return withPerms;
    return withPerms.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.navGroup.toLowerCase().includes(q) ||
        (c.legacyHint ?? "").toLowerCase().includes(q),
    );
  }, [categories, catalog, catSearch]);

  const activeCategory = useMemo(() => {
    if (categoryId && filteredCategories.some((c) => c.id === categoryId)) return categoryId;
    return filteredCategories[0]?.id ?? null;
  }, [categoryId, filteredCategories]);

  const activeCategoryDef = useMemo(
    () => categories.find((c) => c.id === activeCategory) ?? null,
    [categories, activeCategory],
  );

  const categoryPerms = useMemo(
    () => (activeCategory ? catalog.filter((p) => p.categoryId === activeCategory) : []),
    [catalog, activeCategory],
  );

  const enabledInCategory = useMemo(
    () => categoryPerms.filter((p) => enabled.has(p.key)).length,
    [categoryPerms, enabled],
  );

  const loadGroups = useCallback(async () => {
    const data = await client.adminPermissionGroups();
    setGroups(data.groups);
    const fromUrl = searchParams.get("group");
    const match = fromUrl && data.groups.some((g) => g.id === fromUrl) ? fromUrl : null;
    setGroupId((prev) => match ?? prev ?? data.groups[0]?.id ?? null);
  }, [searchParams]);

  const loadMatrix = useCallback(async (gid: string, sc: PermissionScope) => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminGroupPermissions(gid, sc);
      const set = new Set(data.permissions);
      setEnabled(set);
      setSaved(new Set(set));
      setCategoryId((prev) => prev ?? data.catalog.categories[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups().catch((e) => setError(e instanceof Error ? e.message : "Load failed."));
  }, [loadGroups]);

  useEffect(() => {
    if (!groupId) return;
    void loadMatrix(groupId, scope);
  }, [groupId, scope, loadMatrix]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!groupOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [groupOpen]);

  function confirmDiscard(): boolean {
    if (!dirty) return true;
    return window.confirm("You have unsaved permission changes. Discard them?");
  }

  function trySetScope(next: PermissionScope) {
    if (next === scope) return;
    if (!confirmDiscard()) return;
    setScope(next);
    setCategoryId(null);
  }

  function trySetGroup(id: string) {
    if (id === groupId) {
      setGroupOpen(false);
      return;
    }
    if (!confirmDiscard()) return;
    setGroupId(id);
    setGroupOpen(false);
    setGroupSearch("");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("group", id);
      return next;
    });
  }

  function toggleKey(key: string, on: boolean) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
    setOkMsg(null);
  }

  function selectAllInCategory() {
    setEnabled((prev) => {
      const next = new Set(prev);
      for (const p of categoryPerms) next.add(p.key);
      return next;
    });
  }

  function clearCategory() {
    setEnabled((prev) => {
      const next = new Set(prev);
      for (const p of categoryPerms) next.delete(p.key);
      return next;
    });
  }

  async function save() {
    if (!groupId) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const data = await client.adminGroupPermissionsPatch(groupId, scope, Array.from(enabled));
      const set = new Set(data.permissions);
      setEnabled(set);
      setSaved(new Set(set));
      setOkMsg(`Saved ${scope.toUpperCase()} permissions for ${selectedGroup?.name ?? groupId}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const groupedNav = useMemo(() => {
    const map = new Map<PermissionNavGroup, typeof filteredCategories>();
    for (const g of PERMISSION_NAV_GROUPS) map.set(g, []);
    for (const c of filteredCategories) {
      if (!map.has(c.navGroup)) map.set(c.navGroup, []);
      map.get(c.navGroup)!.push(c);
    }
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [filteredCategories]);

  return (
    <div className="pb-8">
      <AdminPageHeader
        title="Permissions"
        subtitle="Role matrix per desk group — plain-English switches for sidebar and API access."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/system/groups" className={btnSecondary}>
              All groups
            </Link>
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {(["crm", "api"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => trySetScope(tab)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition ${
                  scope === tab
                    ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "crm" ? "CRM permissions" : "API permissions"}
              </button>
            ))}
            </div>
          </div>
        }
      />

      <ErrorBanner message={error} />
      {okMsg ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {okMsg}
        </p>
      ) : null}

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div ref={groupRef} className="relative min-w-[16rem] flex-1 max-w-md">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Desk group
          </label>
          <button
            type="button"
            onClick={() => setGroupOpen((v) => !v)}
            className={`${inputCls} flex items-center justify-between gap-2 text-left font-medium`}
          >
            <span className="truncate font-medium text-slate-800">
              {selectedGroup?.name ?? "Select group…"}
            </span>
            <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${groupOpen ? "rotate-180" : ""}`} />
          </button>
          {groupOpen ? (
            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 p-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    placeholder="Search groups…"
                    className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-teal-500"
                  />
                </div>
              </div>
              <ul className="max-h-56 overflow-y-auto py-1">
                {filteredGroups.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => trySetGroup(g.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50 ${
                        g.id === groupId ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-700"
                      }`}
                    >
                      <Shield size={14} className="shrink-0 opacity-60" />
                      <span className="truncate">{g.name}</span>
                    </button>
                  </li>
                ))}
                {filteredGroups.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-slate-400">No groups match</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
        {dirty ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            Unsaved changes
          </span>
        ) : null}
      </div>

      {!groupId ? (
        <Panel className="p-8 text-center text-sm text-slate-500">Create a desk group under System → Groups first.</Panel>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          Loading permission matrix…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
          <Panel className="flex max-h-[calc(100vh-16rem)] flex-col overflow-hidden p-0">
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Search categories…"
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {groupedNav.map(([navGroup, cats]) => {
                const Icon = NAV_GROUP_ICONS[navGroup] ?? LayoutDashboard;
                return (
                  <div key={navGroup} className="mb-3">
                    <p className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <Icon size={12} />
                      {navGroup}
                    </p>
                    <ul className="space-y-0.5">
                      {cats.map((c) => {
                        const count = catalog.filter((p) => p.categoryId === c.id && enabled.has(p.key)).length;
                        const total = catalog.filter((p) => p.categoryId === c.id).length;
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => setCategoryId(c.id)}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                activeCategory === c.id
                                  ? "bg-teal-600 text-white shadow-sm"
                                  : "text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <span className="truncate font-medium">{c.label}</span>
                              <span
                                className={`ml-2 shrink-0 tabular-nums text-[10px] ${
                                  activeCategory === c.id ? "text-teal-100" : "text-slate-400"
                                }`}
                              >
                                {count}/{total}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </Panel>

          <div>
            {activeCategoryDef ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{activeCategoryDef.label}</h2>
                    {activeCategoryDef.legacyHint ? (
                      <p className="mt-0.5 text-xs text-slate-500">{activeCategoryDef.legacyHint}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectAllInCategory} className={btnSecondary}>
                      Select all in category
                    </button>
                    <button type="button" onClick={clearCategory} className={btnSecondary}>
                      Clear all
                    </button>
                  </div>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  {enabledInCategory} of {categoryPerms.length} enabled in this category
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryPerms.map((def) => (
                    <SwitchCard
                      key={def.key}
                      def={def}
                      on={enabled.has(def.key)}
                      onChange={(v) => toggleKey(def.key, v)}
                    />
                  ))}
                </div>
              </>
            ) : (
              <Panel className="p-8 text-center text-sm text-slate-500">No categories match your search.</Panel>
            )}
          </div>
        </div>
      )}

      <div
        className={`sticky bottom-0 z-10 -mx-4 mt-8 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md lg:-mx-6 lg:px-6 ${
          dirty ? "shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" : ""
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {selectedGroup ? (
              <>
                <span className="font-medium text-slate-900">{selectedGroup.name}</span>
                <span className="text-slate-400"> · </span>
                <span className="capitalize">{scope} scope</span>
                <span className="text-slate-400"> · </span>
                <span>{enabled.size} permissions on</span>
              </>
            ) : (
              "Select a desk group"
            )}
          </p>
          <div className="flex items-center gap-2">
            {dirty ? (
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  if (confirmDiscard()) setEnabled(new Set(saved));
                }}
              >
                <X size={14} className="mr-1 inline" />
                Discard
              </button>
            ) : null}
            <button
              type="button"
              disabled={!groupId || saving || !dirty}
              onClick={() => void save()}
              className={`${btnPrimary} inline-flex items-center gap-2 disabled:opacity-50`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save changes
            </button>
          </div>
        </div>
      </div>

      <PageBottomGuide
        intro="Each desk group gets its own checkbox grid — CRM sidebar visibility and partner API scopes in one place."
        blocks={guideBlocks}
      />
    </div>
  );
}
