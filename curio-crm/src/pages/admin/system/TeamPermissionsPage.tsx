import React, { useEffect, useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { client, type AdminStaffMember } from "../../../api/client";
import { btnPrimary, btnSecondary, ErrorBanner, inputCls, PageHeader, Panel } from "../../../components/admin/CrmShell";
import { PageBottomGuide } from "../../../components/admin/PageBottomGuide";

type Catalog = {
  permissions: string[];
  groups: Array<{ label: string; keys: string[] }>;
  presets: Record<string, { label: string; description: string; permissions: string[] }>;
};

type PresetKey = "desk" | "subadmin" | "platform";

export default function TeamPermissionsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [staff, setStaff] = useState<AdminStaffMember[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draftIsStaff, setDraftIsStaff] = useState(false);
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    preset: "desk" as PresetKey,
  });

  async function refresh() {
    setBusy(true);
    setErr(null);
    try {
      const [c, s] = await Promise.all([client.adminTeamPermissionCatalog(), client.adminTeamStaffList()]);
      setCatalog({ permissions: c.permissions, groups: c.groups, presets: c.presets ?? {} });
      setStaff(s.staff.filter((m) => m.isStaff));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const selectedUser = useMemo(() => staff.find((s) => s.userId === selected) ?? null, [staff, selected]);

  useEffect(() => {
    if (!selectedUser) return;
    setDraftIsStaff(selectedUser.isStaff);
    setDraftPerms(new Set(selectedUser.permissions));
  }, [selectedUser]);

  function togglePerm(k: string) {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function save() {
    if (!selectedUser) return;
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      await client.adminTeamStaffUpdate({
        userId: selectedUser.userId,
        isStaff: draftIsStaff,
        permissions: Array.from(draftPerms),
      });
      setOkMsg(`Updated ${selectedUser.name}.`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function createSubAdmin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      const { member } = await client.adminCreateSubAdmin(createForm);
      setOkMsg(`Created sub-admin ${member.name} (@${member.username}).`);
      setShowCreate(false);
      setCreateForm({ username: "", password: "", firstName: "", lastName: "", email: "", preset: "desk" });
      await refresh();
      setSelected(member.userId);
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Sub-admins"
        subtitle="Admin = full platform. Create sub-admins here — same portal, flat sidebar, access you choose."
        actions={
          <button type="button" className={btnPrimary} onClick={() => setShowCreate((v) => !v)}>
            <UserPlus size={15} />
            <span className="ml-1.5">New sub-admin</span>
          </button>
        }
      />

      <ErrorBanner message={err} />
      {okMsg ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{okMsg}</div>
      ) : null}

      {showCreate ? (
        <Panel className="mb-4 p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Create sub-admin</h2>
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(e) => void createSubAdmin(e)}>
            <label className="text-xs font-medium text-slate-500">
              Username
              <input
                className={`${inputCls} mt-1`}
                required
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Password
              <input
                type="password"
                className={`${inputCls} mt-1`}
                required
                minLength={8}
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Email
              <input
                type="email"
                className={`${inputCls} mt-1`}
                required
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              First name
              <input
                className={`${inputCls} mt-1`}
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Last name
              <input
                className={`${inputCls} mt-1`}
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium text-slate-500">
              Role preset
              <select
                className={`${inputCls} mt-1`}
                value={createForm.preset}
                onChange={(e) => setCreateForm((f) => ({ ...f, preset: e.target.value as PresetKey }))}
              >
                {catalog?.presets
                  ? Object.entries(catalog.presets).map(([key, p]) => (
                      <option key={key} value={key}>
                        {p.label}
                      </option>
                    ))
                  : (
                      <>
                        <option value="desk">Desk agent</option>
                        <option value="subadmin">Sub-admin</option>
                        <option value="platform">Platform sub-admin</option>
                      </>
                    )}
              </select>
            </label>
            {catalog?.presets[createForm.preset] ? (
              <p className="sm:col-span-3 text-xs text-slate-500">{catalog.presets[createForm.preset].description}</p>
            ) : null}
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" className={btnPrimary} disabled={busy}>
                <Plus size={14} />
                <span className="ml-1">Create</span>
              </button>
              <button type="button" className={btnSecondary} onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
        <Panel className="overflow-hidden p-0">
          <p className="border-b border-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sub-admins ({staff.length})
          </p>
          <div className="max-h-[32rem] overflow-y-auto">
            {staff.length === 0 ? (
              <p className="px-4 py-8 text-sm text-slate-400">No sub-admins yet. Create one above.</p>
            ) : (
              staff.map((s) => (
                <button
                  key={s.userId}
                  type="button"
                  onClick={() => setSelected(s.userId)}
                  className={`block w-full border-b border-slate-50 px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                    selected === s.userId ? "bg-teal-50/80" : ""
                  }`}
                >
                  <span className="font-medium text-slate-800">{s.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    @{s.username} · {s.permissions.length} keys
                  </span>
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          {!selectedUser ? (
            <p className="text-sm text-slate-500">Select a sub-admin to edit access — or create a new one.</p>
          ) : !catalog ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedUser.name}</h2>
                  <p className="text-xs text-slate-500">
                    @{selectedUser.username} · {selectedUser.email}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draftIsStaff}
                    onChange={(e) => setDraftIsStaff(e.target.checked)}
                    className="accent-teal-600"
                  />
                  Active sub-admin
                </label>
              </div>

              <div className="space-y-3">
                {catalog.groups.map((g) => (
                  <div key={g.label} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.label}</p>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {g.keys.map((k) => (
                        <label key={k} className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={draftPerms.has(k)}
                            onChange={() => togglePerm(k)}
                            disabled={!draftIsStaff}
                            className="accent-teal-600"
                          />
                          <code className="text-[11px]">{k}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-3">
                <button type="button" onClick={() => void save()} disabled={busy} className={btnPrimary}>
                  Save access
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <PageBottomGuide
        intro="One admin portal. You see everything. Sub-admins see only the flat links you allow."
        blocks={[
          {
            title: "Presets",
            what: "Desk agent = leads + clients. Sub-admin = full desk. Platform = adds access keys.",
            how: "Pick a preset when creating — tweak checkboxes after if needed.",
          },
          {
            title: "No extra portals",
            what: "Sub-admins log into the same admin URL with their username.",
            how: "Revoke: uncheck Active sub-admin or delete permission keys.",
          },
        ]}
      />
    </div>
  );
}
