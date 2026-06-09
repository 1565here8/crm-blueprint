import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, Copy, Loader2, Mail, RotateCcw, Save, Search, Smartphone, X } from "lucide-react";
import {
  client,
  type MemberNotificationChannel,
  type MemberNotificationMatrix,
  type MemberNotificationStaffRow,
} from "../../../api/client";
import {
  AdminPageHeader,
  btnPrimary,
  btnSecondary,
  ErrorBanner,
  inputCls,
  Panel,
} from "../../../components/admin/CrmShell";
import { PageBottomGuide, type GuideBlock } from "../../../components/admin/PageBottomGuide";

const CHANNEL_META: Record<
  MemberNotificationChannel,
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  email: { label: "Email", icon: Mail },
  push: { label: "Push", icon: Smartphone },
  in_app: { label: "In-app", icon: Bell },
};

const guideBlocks: GuideBlock[] = [
  {
    title: "Who gets what",
    what: "Each desk member can receive alerts by email, push, or inside the CRM bell.",
    how: "Pick an agent, toggle the grid, then Save. Managers see the full matrix at a glance.",
    when: "Onboarding agents or cutting inbox noise for floor-only staff.",
  },
  {
    title: "Turn off email for CRM-only agents",
    what: "Agents who never leave the admin portal do not need email for every lead.",
    how: "Select the member → click Email column header to clear email for all events, keep In-app on.",
    when: "First day — sales floor sits inside Hot Leads all day.",
  },
  {
    title: "Desk default",
    what: "The platform-wide template for new staff — margin calls and deposit requests on, client login email off.",
    how: "Edit any member, tune the grid, then save. Use Copy from another agent for clones.",
    when: "You hire five agents with the same notification profile.",
  },
  {
    title: "Apply desk default",
    what: "Resets one agent to the shared desk template in one click.",
    how: "Pick member → Apply desk default → Save if you changed anything else.",
    when: "Someone toggled too many switches and wants a clean slate.",
  },
];

function matrixKey(eventKey: string, channel: MemberNotificationChannel): string {
  return `${eventKey}:${channel}`;
}

export default function NotificationsPage() {
  const [staff, setStaff] = useState<MemberNotificationStaffRow[]>([]);
  const [events, setEvents] = useState<Array<{ key: string; label: string; description: string }>>([]);
  const [channels, setChannels] = useState<MemberNotificationChannel[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<MemberNotificationMatrix>({});
  const [savedMatrix, setSavedMatrix] = useState<MemberNotificationMatrix>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [copyFromId, setCopyFromId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const memberRef = useRef<HTMLDivElement>(null);

  const dirty = useMemo(() => JSON.stringify(matrix) !== JSON.stringify(savedMatrix), [matrix, savedMatrix]);

  const filteredStaff = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        String(s.displayId).includes(q),
    );
  }, [staff, memberSearch]);

  const selectedMember = useMemo(() => staff.find((s) => s.userId === userId) ?? null, [staff, userId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.adminMemberNotifications();
      setStaff(data.staff);
      setEvents(data.catalog.events.map((e) => ({ key: e.key, label: e.label, description: e.description })));
      setChannels(data.catalog.channels);
      setUserId((prev) => {
        if (prev && data.staff.some((s) => s.userId === prev)) return prev;
        return data.staff[0]?.userId ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const row = staff.find((s) => s.userId === userId);
    if (row) {
      setMatrix(row.matrix);
      setSavedMatrix(row.matrix);
    }
  }, [userId, staff]);

  useEffect(() => {
    if (!memberOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (memberRef.current && !memberRef.current.contains(e.target as Node)) setMemberOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [memberOpen]);

  function isOn(eventKey: string, channel: MemberNotificationChannel): boolean {
    return Boolean(matrix[eventKey]?.[channel]);
  }

  function toggleCell(eventKey: string, channel: MemberNotificationChannel, on: boolean) {
    setMatrix((prev) => {
      const next = { ...prev };
      const row = { ...(next[eventKey] ?? { email: false, push: false, in_app: false }) };
      row[channel] = on;
      next[eventKey] = row;
      return next;
    });
  }

  function toggleChannelColumn(channel: MemberNotificationChannel, on: boolean) {
    setMatrix((prev) => {
      const next = { ...prev };
      for (const ev of events) {
        const row = { ...(next[ev.key] ?? { email: false, push: false, in_app: false }) };
        row[channel] = on;
        next[ev.key] = row;
      }
      return next;
    });
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const cells = events.flatMap((ev) =>
        channels.map((ch) => ({
          eventKey: ev.key,
          channel: ch,
          enabled: isOn(ev.key, ch),
        })),
      );
      const data = await client.adminMemberNotificationsPatch(userId, cells);
      setMatrix(data.matrix);
      setSavedMatrix(data.matrix);
      setStaff((prev) =>
        prev.map((s) => (s.userId === userId ? { ...s, matrix: data.matrix, hasCustomPrefs: true } : s)),
      );
      setOkMsg("Notification preferences saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyFrom() {
    if (!userId || !copyFromId || copyFromId === userId) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const data = await client.adminMemberNotificationsCopy(copyFromId, userId);
      setMatrix(data.matrix);
      setSavedMatrix(data.matrix);
      setStaff((prev) =>
        prev.map((s) => (s.userId === userId ? { ...s, matrix: data.matrix, hasCustomPrefs: true } : s)),
      );
      setOkMsg("Copied notification profile from selected agent.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Copy failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyDefault() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setOkMsg(null);
    try {
      const data = await client.adminMemberNotificationsApplyDefault(userId);
      setMatrix(data.matrix);
      setSavedMatrix(data.matrix);
      setStaff((prev) =>
        prev.map((s) => (s.userId === userId ? { ...s, matrix: data.matrix, hasCustomPrefs: true } : s)),
      );
      setOkMsg("Applied desk default notification template.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply default failed.");
    } finally {
      setSaving(false);
    }
  }

  const copyCandidates = staff.filter((s) => s.userId !== userId);

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        subtitle="Control which alerts each desk member receives — email, push, and in-app."
      />

      {error ? <ErrorBanner message={error} /> : null}
      {okMsg ? (
        <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          {okMsg}
        </div>
      ) : null}

      <Panel className="mb-6">
        <p className="text-sm leading-relaxed text-slate-600">
          <strong className="font-medium text-slate-800">First-day tip:</strong> Turn off{" "}
          <span className="font-medium">email</span> for agents who only work inside the CRM — keep{" "}
          <span className="font-medium">In-app</span> on so Hot Leads still ping the bell.
        </p>
      </Panel>

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div ref={memberRef} className="relative min-w-[280px] flex-1">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Desk member
          </label>
          <button
            type="button"
            onClick={() => setMemberOpen((o) => !o)}
            className={`${inputCls} flex w-full items-center justify-between gap-2 text-left`}
          >
            <span className="truncate">
              {selectedMember
                ? `${selectedMember.name} (#${selectedMember.displayId})`
                : loading
                  ? "Loading…"
                  : "Select agent"}
            </span>
            <ChevronDown size={16} className="shrink-0 text-slate-400" />
          </button>
          {memberOpen ? (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 p-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search name, email, id…"
                    className={`${inputCls} pl-9`}
                    autoFocus
                  />
                </div>
              </div>
              <ul className="max-h-64 overflow-y-auto py-1">
                {filteredStaff.map((s) => (
                  <li key={s.userId}>
                    <button
                      type="button"
                      className={`flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        s.userId === userId ? "bg-teal-50 text-teal-900" : "text-slate-700"
                      }`}
                      onClick={() => {
                        setUserId(s.userId);
                        setMemberOpen(false);
                        setMemberSearch("");
                      }}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-slate-500">
                        #{s.displayId} · {s.email || s.username}
                        {s.hasCustomPrefs ? " · custom" : " · desk default"}
                      </span>
                    </button>
                  </li>
                ))}
                {filteredStaff.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-slate-500">No staff found.</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-[200px] flex-1 flex-wrap items-end gap-2">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Copy from
            </label>
            <select
              value={copyFromId}
              onChange={(e) => setCopyFromId(e.target.value)}
              className={inputCls}
            >
              <option value="">Another agent…</option>
              {copyCandidates.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.name} (#{s.displayId})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={btnSecondary}
            disabled={!copyFromId || saving}
            onClick={() => void handleCopyFrom()}
          >
            <Copy size={16} className="mr-1.5 inline" />
            Copy
          </button>
        </div>

        <button type="button" className={btnSecondary} disabled={!userId || saving} onClick={() => void handleApplyDefault()}>
          <RotateCcw size={16} className="mr-1.5 inline" />
          Apply desk default
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          Loading notification matrix…
        </div>
      ) : !userId ? (
        <Panel>No staff members — create sub-admins under Access Keys first.</Panel>
      ) : (
        <Panel className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left font-medium text-slate-700">Event</th>
                {channels.map((ch) => {
                  const meta = CHANNEL_META[ch];
                  const Icon = meta.icon;
                  const allOn = events.every((ev) => isOn(ev.key, ch));
                  return (
                    <th key={ch} className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Icon size={14} />
                          {meta.label}
                        </span>
                        <button
                          type="button"
                          className="text-[10px] font-normal text-teal-600 hover:underline"
                          onClick={() => toggleChannelColumn(ch, !allOn)}
                        >
                          {allOn ? "Clear all" : "All on"}
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.key} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{ev.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{ev.description}</p>
                  </td>
                  {channels.map((ch) => (
                    <td key={matrixKey(ev.key, ch)} className="px-3 py-3 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isOn(ev.key, ch)}
                        aria-label={`${ev.label} — ${CHANNEL_META[ch].label}`}
                        onClick={() => toggleCell(ev.key, ch, !isOn(ev.key, ch))}
                        className={`relative mx-auto inline-flex h-7 w-12 rounded-full transition ${
                          isOn(ev.key, ch) ? "bg-teal-500" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                            isOn(ev.key, ch) ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {dirty ? (
        <div className="sticky bottom-4 z-20 mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
          <p className="text-sm text-amber-900">Unsaved notification changes</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setMatrix(savedMatrix);
              }}
            >
              <X size={16} className="mr-1 inline" />
              Discard
            </button>
            <button type="button" className={btnPrimary} disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 size={16} className="mr-1 inline animate-spin" /> : <Save size={16} className="mr-1 inline" />}
              Save
            </button>
          </div>
        </div>
      ) : null}

      <PageBottomGuide blocks={guideBlocks} />
    </div>
  );
}
