/** Broker-configurable CRM users table columns (order + visibility + role zones). */

import type { UserSummary } from "../api/client";

export type CrmUsersColId =
  | "online"
  | "displayId"
  | "name"
  | "phone"
  | "email"
  | "username"
  | "country"
  | "comments"
  | "affiliate"
  | "campaignId"
  | "campaign"
  | "funnel"
  | "cpa"
  | "cpl"
  | "cr"
  | "pv"
  | "partner"
  | "agent"
  | "registration"
  | "status"
  | "param1"
  | "notes";

export type CrmColumnZone = "core" | "sales" | "marketing" | "admin";

/** superAdmin = founder admin · admin = manager · agent = sales desk · affiliate = marketing */
export type CrmDeskRole = "superAdmin" | "admin" | "agent" | "affiliate" | "viewer";

export type CrmUsersColumnDef = {
  id: CrmUsersColId;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  zone: CrmColumnZone;
};

export const CRM_USERS_COLUMNS: CrmUsersColumnDef[] = [
  { id: "online", label: "Online", zone: "core" },
  { id: "displayId", label: "Id", sortable: true, sortKey: "display_id", zone: "core" },
  { id: "name", label: "Name", sortable: true, sortKey: "name", zone: "core" },
  { id: "phone", label: "Phone", zone: "sales" },
  { id: "email", label: "Email", zone: "sales" },
  { id: "username", label: "Username", zone: "admin" },
  { id: "country", label: "Country", zone: "sales" },
  { id: "comments", label: "Comments", zone: "sales" },
  { id: "affiliate", label: "Affiliate", zone: "marketing" },
  { id: "campaignId", label: "Campaign ID", zone: "marketing" },
  { id: "campaign", label: "Campaign", zone: "marketing" },
  { id: "funnel", label: "Funnel", zone: "marketing" },
  { id: "cpa", label: "CPA", zone: "marketing" },
  { id: "cpl", label: "CPL", zone: "marketing" },
  { id: "cr", label: "CR", zone: "marketing" },
  { id: "pv", label: "PV", zone: "marketing" },
  { id: "partner", label: "Partner", zone: "admin" },
  { id: "agent", label: "Agent", zone: "sales" },
  { id: "registration", label: "Registration", sortable: true, sortKey: "registration", zone: "core" },
  { id: "status", label: "Status", sortable: true, sortKey: "status", zone: "sales" },
  { id: "param1", label: "Param1", zone: "marketing" },
  { id: "notes", label: "#Notes", zone: "sales" },
];

/** Founder-only — managers/admins cannot show or reorder these. */
const SUPER_ADMIN_ONLY = new Set<CrmUsersColId>(["username", "partner"]);

const STORAGE_PREFIX = "crm-users-column-layout-v4";
const STORAGE_PREFIX_V2 = "crm-users-column-layout-v2";

export type CrmColumnLayout = {
  order: CrmUsersColId[];
  hidden: CrmUsersColId[];
  /** Per-column width in px — saved per role in this browser. */
  widths?: Partial<Record<CrmUsersColId, number>>;
};

export const CRM_COLUMN_MIN_PX = 52;
export const CRM_COLUMN_MAX_PX = 520;

/** Readable defaults for contact + identity fields. */
export const CRM_COLUMN_DEFAULT_WIDTHS: Record<CrmUsersColId, number> = {
  online: 56,
  displayId: 72,
  name: 168,
  phone: 152,
  email: 240,
  username: 128,
  country: 168,
  comments: 140,
  affiliate: 96,
  campaignId: 96,
  campaign: 96,
  funnel: 88,
  cpa: 72,
  cpl: 72,
  cr: 72,
  pv: 80,
  partner: 96,
  agent: 132,
  registration: 118,
  status: 108,
  param1: 88,
  notes: 64,
};

const DEFAULT_ORDER = CRM_USERS_COLUMNS.map((c) => c.id);

/** Preferred order: contact block together → affiliate → funnel → optional fields. */
export const CRM_PREFERRED_COLUMN_ORDER: CrmUsersColId[] = [
  "online",
  "displayId",
  "name",
  "phone",
  "email",
  "country",
  "status",
  "agent",
  "affiliate",
  "funnel",
  "comments",
  "campaignId",
  "campaign",
  "cpa",
  "cpl",
  "cr",
  "pv",
  "partner",
  "username",
  "registration",
  "param1",
  "notes",
];

/** Collapsed by default — bundled in the “More” umbrella (agent stays visible for assignment). */
export const CRM_DEFAULT_HIDDEN: CrmUsersColId[] = [
  "comments",
  "campaignId",
  "campaign",
  "cpa",
  "cpl",
  "cr",
  "pv",
  "partner",
  "username",
  "registration",
  "param1",
  "notes",
];

/** Extra columns folded into one header until you expand the umbrella. */
export const CRM_UMBRELLA_COLUMN_IDS: CrmUsersColId[] = [...CRM_DEFAULT_HIDDEN];

export function isUmbrellaColumn(id: CrmUsersColId): boolean {
  return (CRM_UMBRELLA_COLUMN_IDS as readonly string[]).includes(id);
}

export function expandUmbrellaGroup(layout: CrmColumnLayout, role: CrmDeskRole): CrmColumnLayout {
  const allowed = new Set(allowedColumnIds(role));
  const hidden = new Set(layout.hidden);
  for (const id of CRM_UMBRELLA_COLUMN_IDS) {
    if (allowed.has(id)) hidden.delete(id);
  }
  return { ...layout, hidden: [...hidden] };
}

export function collapseUmbrellaGroup(layout: CrmColumnLayout, role: CrmDeskRole): CrmColumnLayout {
  const allowed = new Set(allowedColumnIds(role));
  const hidden = new Set(layout.hidden);
  for (const id of CRM_UMBRELLA_COLUMN_IDS) {
    if (allowed.has(id)) hidden.add(id);
  }
  return { ...layout, hidden: [...hidden] };
}

export function isUmbrellaGroupCollapsed(layout: CrmColumnLayout, role: CrmDeskRole): boolean {
  const allowed = allowedColumnIds(role).filter(isUmbrellaColumn);
  if (allowed.length === 0) return false;
  const hidden = new Set(layout.hidden);
  return allowed.every((id) => hidden.has(id));
}

export type CrmColumnRenderSlot =
  | { kind: "column"; col: CrmUsersColumnDef; hidden: boolean }
  | { kind: "umbrella"; cols: CrmUsersColumnDef[] };

/** One “More” tab instead of many vertical + strips when the extra group is collapsed. */
export function buildColumnRenderSlots(slots: CrmColumnSlot[]): CrmColumnRenderSlot[] {
  const umbrellaHidden = slots.filter((s) => s.hidden && isUmbrellaColumn(s.col.id));
  if (umbrellaHidden.length === 0) {
    return slots.map((s) => ({ kind: "column", col: s.col, hidden: s.hidden }));
  }
  const anyUmbrellaVisible = slots.some((s) => isUmbrellaColumn(s.col.id) && !s.hidden);
  if (anyUmbrellaVisible) {
    return slots.map((s) => ({ kind: "column", col: s.col, hidden: s.hidden }));
  }
  const umbrellaCols = umbrellaHidden.map((s) => s.col);
  const out: CrmColumnRenderSlot[] = [];
  let umbrellaPlaced = false;
  for (const slot of slots) {
    if (slot.hidden && isUmbrellaColumn(slot.col.id)) {
      if (!umbrellaPlaced) {
        out.push({ kind: "umbrella", cols: umbrellaCols });
        umbrellaPlaced = true;
      }
      continue;
    }
    out.push({ kind: "column", col: slot.col, hidden: slot.hidden });
  }
  return out;
}

export function resolveCrmDeskRole(user: UserSummary | null | undefined): CrmDeskRole {
  if (!user) return "viewer";
  if (user.role === "admin" || user.isAdmin) return "superAdmin";
  const perms = new Set(user.permissions ?? []);
  if (perms.has("system.team.manage")) return "admin";
  if (perms.has("marketing.edit") && !perms.has("crm.users.edit")) return "affiliate";
  if (perms.has("crm.users.edit") || perms.has("crm.notes.create") || perms.has("crm.users.view"))
    return "agent";
  if (perms.has("marketing.view")) return "affiliate";
  return "viewer";
}

export function canCustomizeColumns(role: CrmDeskRole): boolean {
  return role === "superAdmin" || role === "admin" || role === "agent" || role === "affiliate";
}

/** Column ids this role may see and reorder. */
export function allowedColumnIds(role: CrmDeskRole): CrmUsersColId[] {
  const all = DEFAULT_ORDER;
  switch (role) {
    case "superAdmin":
      return all;
    case "admin":
      return all.filter((id) => !SUPER_ADMIN_ONLY.has(id));
    case "agent":
      return all.filter((id) => {
        const z = CRM_USERS_COLUMNS.find((c) => c.id === id)?.zone;
        return z === "core" || z === "sales";
      });
    case "affiliate":
      return all.filter((id) => {
        const z = CRM_USERS_COLUMNS.find((c) => c.id === id)?.zone;
        return z === "core" || z === "marketing";
      });
    default:
      return all.filter((id) => CRM_USERS_COLUMNS.find((c) => c.id === id)?.zone === "core");
  }
}

function storageKey(role: CrmDeskRole): string {
  return `${STORAGE_PREFIX}-${role}`;
}

function buildOrderForRole(role: CrmDeskRole): CrmUsersColId[] {
  const allowed = new Set(allowedColumnIds(role));
  const order: CrmUsersColId[] = [];
  for (const id of CRM_PREFERRED_COLUMN_ORDER) {
    if (allowed.has(id) && !order.includes(id)) order.push(id);
  }
  for (const id of DEFAULT_ORDER) {
    if (allowed.has(id) && !order.includes(id)) order.push(id);
  }
  return order;
}

export function defaultColumnLayout(role: CrmDeskRole = "superAdmin"): CrmColumnLayout {
  const allowed = new Set(allowedColumnIds(role));
  const order = buildOrderForRole(role);
  const hidden = CRM_DEFAULT_HIDDEN.filter((id) => allowed.has(id) && order.includes(id));
  return { order, hidden };
}

export function isColumnHidden(layout: CrmColumnLayout, id: CrmUsersColId): boolean {
  return layout.hidden.includes(id);
}

export function toggleColumnHidden(layout: CrmColumnLayout, id: CrmUsersColId): CrmColumnLayout {
  const hidden = new Set(layout.hidden);
  if (hidden.has(id)) hidden.delete(id);
  else hidden.add(id);
  return { ...layout, hidden: [...hidden] };
}

/** Show a collapsed column in place (same slot in `order`). */
export function showColumnAdjacent(layout: CrmColumnLayout, id: CrmUsersColId): CrmColumnLayout {
  return { ...layout, hidden: layout.hidden.filter((h) => h !== id) };
}

export type CrmColumnSlot = { col: CrmUsersColumnDef; hidden: boolean };

export function orderedColumnSlots(layout: CrmColumnLayout, role: CrmDeskRole = "superAdmin"): CrmColumnSlot[] {
  const safe = sanitizeLayout(layout, role);
  const hidden = new Set(safe.hidden);
  const byId = new Map(CRM_USERS_COLUMNS.map((c) => [c.id, c]));
  const slots: CrmColumnSlot[] = [];
  for (const id of safe.order) {
    const col = byId.get(id);
    if (!col) continue;
    slots.push({ col, hidden: hidden.has(id) });
  }
  return slots;
}

export function hiddenColumnsInOrder(
  layout: CrmColumnLayout,
  role: CrmDeskRole = "superAdmin",
): CrmUsersColumnDef[] {
  const safe = sanitizeLayout(layout, role);
  const hidden = new Set(safe.hidden);
  const byId = new Map(CRM_USERS_COLUMNS.map((c) => [c.id, c]));
  return safe.order.filter((id) => hidden.has(id)).map((id) => byId.get(id)!);
}

export function clampColumnWidth(px: number): number {
  return Math.min(CRM_COLUMN_MAX_PX, Math.max(CRM_COLUMN_MIN_PX, Math.round(px)));
}

export function getColumnWidth(layout: CrmColumnLayout, id: CrmUsersColId): number {
  const w = layout.widths?.[id];
  if (w != null && Number.isFinite(w)) return clampColumnWidth(w);
  return CRM_COLUMN_DEFAULT_WIDTHS[id];
}

export function setColumnWidth(layout: CrmColumnLayout, id: CrmUsersColId, widthPx: number): CrmColumnLayout {
  return {
    ...layout,
    widths: { ...layout.widths, [id]: clampColumnWidth(widthPx) },
  };
}

function sanitizeLayout(raw: CrmColumnLayout, role: CrmDeskRole): CrmColumnLayout {
  const allowed = new Set(allowedColumnIds(role));
  const order: CrmUsersColId[] = [];
  for (const id of raw.order ?? []) {
    if (allowed.has(id) && !order.includes(id)) order.push(id);
  }
  for (const id of CRM_PREFERRED_COLUMN_ORDER) {
    if (allowed.has(id) && !order.includes(id)) order.push(id);
  }
  for (const id of DEFAULT_ORDER) {
    if (allowed.has(id) && !order.includes(id)) order.push(id);
  }
  let hidden = (raw.hidden ?? []).filter((id) => allowed.has(id) && order.includes(id));
  if (role === "superAdmin" || role === "admin") {
    hidden = hidden.filter((id) => id !== "agent");
  }
  const widths: Partial<Record<CrmUsersColId, number>> = {};
  for (const id of order) {
    widths[id] = getColumnWidth({ order, hidden, widths: raw.widths }, id);
  }
  return { order, hidden, widths };
}

export function loadColumnLayout(role: CrmDeskRole = "superAdmin"): CrmColumnLayout {
  try {
    const raw = localStorage.getItem(storageKey(role));
    if (!raw) return defaultColumnLayout(role);
    return sanitizeLayout(JSON.parse(raw) as CrmColumnLayout, role);
  } catch {
    return defaultColumnLayout(role);
  }
}

export function saveColumnLayout(layout: CrmColumnLayout, role: CrmDeskRole) {
  localStorage.setItem(storageKey(role), JSON.stringify(sanitizeLayout(layout, role)));
}

export function visibleColumns(layout: CrmColumnLayout, role: CrmDeskRole = "superAdmin"): CrmUsersColumnDef[] {
  const safe = sanitizeLayout(layout, role);
  const hidden = new Set(safe.hidden);
  const byId = new Map(CRM_USERS_COLUMNS.map((c) => [c.id, c]));
  return safe.order.filter((id) => !hidden.has(id)).map((id) => byId.get(id)!);
}

export function roleColumnHint(role: CrmDeskRole): string {
  switch (role) {
    case "superAdmin":
      return "Contact block (Name→Status), then Affiliate & Funnel. Extra fields sit under one “More” tab — open when you need them. Drag headers to reorder; − hides a single column.";
    case "admin":
      return "Reorder columns and resize widths — saved automatically for your login on this browser.";
    case "agent":
      return "Sales columns only — client contact, agent, status, notes, comments.";
    case "affiliate":
      return "Marketing columns only — affiliate, campaign, funnel, CPA, CPL, CR, PV.";
    default:
      return "Read-only core columns.";
  }
}

export function reorderColumns(order: CrmUsersColId[], fromId: CrmUsersColId, toId: CrmUsersColId): CrmUsersColId[] {
  if (fromId === toId) return order;
  const next = order.filter((id) => id !== fromId);
  const toIdx = next.indexOf(toId);
  if (toIdx < 0) return order;
  next.splice(toIdx, 0, fromId);
  return next;
}

export function reorderColumnLayout(
  layout: CrmColumnLayout,
  role: CrmDeskRole,
  fromId: CrmUsersColId,
  toId: CrmUsersColId,
): CrmColumnLayout {
  const safe = sanitizeLayout(layout, role);
  return { ...safe, order: reorderColumns(safe.order, fromId, toId) };
}

export type CrmBulkField =
  | "countryCode"
  | "affiliate"
  | "campaignId"
  | "campaign"
  | "cpa"
  | "cpl"
  | "funnel"
  | "conversionRate"
  | "playerValue"
  | "comments"
  | "crmStatus"
  | "agentName"
  | "partner"
  | "importedSource"
  | "tradingStatus"
  | "param1";

const BULK_FIELD_ZONE: Record<CrmBulkField, CrmColumnZone | "admin"> = {
  countryCode: "sales",
  comments: "sales",
  crmStatus: "sales",
  agentName: "sales",
  tradingStatus: "sales",
  affiliate: "marketing",
  campaignId: "marketing",
  campaign: "marketing",
  cpa: "marketing",
  cpl: "marketing",
  funnel: "marketing",
  conversionRate: "marketing",
  playerValue: "marketing",
  param1: "marketing",
  importedSource: "marketing",
  partner: "admin",
};

const ALL_BULK_FIELDS = Object.keys(BULK_FIELD_ZONE) as CrmBulkField[];

export function allowedBulkFields(role: CrmDeskRole): Set<CrmBulkField> {
  const out = new Set<CrmBulkField>();
  for (const field of ALL_BULK_FIELDS) {
    const zone = BULK_FIELD_ZONE[field];
    if (zone === "admin") {
      if (role === "superAdmin") out.add(field);
      continue;
    }
    if (role === "superAdmin" || role === "admin") {
      out.add(field);
      continue;
    }
    if (role === "agent" && (zone === "sales" || zone === "core")) out.add(field);
    if (role === "affiliate" && (zone === "marketing" || zone === "core")) out.add(field);
  }
  return out;
}

const DESK_PANEL_PREFIX = "crm-desk-panel-open";

export function loadDeskPanelOpen(role: CrmDeskRole): boolean {
  try {
    const raw = localStorage.getItem(`${DESK_PANEL_PREFIX}-${role}`);
    if (raw != null) return raw === "1";
  } catch {
    /* ignore */
  }
  return role === "superAdmin" || role === "admin";
}

export function saveDeskPanelOpen(role: CrmDeskRole, open: boolean) {
  try {
    localStorage.setItem(`${DESK_PANEL_PREFIX}-${role}`, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}
