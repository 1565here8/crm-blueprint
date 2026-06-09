/** Per-page walkthrough + bottom guide dismiss state (localStorage). */

const WALKTHROUGH_KEY = "curiocrm.guide.walkthrough.v1";
const BOTTOM_KEY = "curiocrm.guide.bottom.v1";
const SIDEBAR_KEY = "curiocrm.admin.sidebar.v1";
const NAV_GROUPS_KEY = "curiocrm.admin.navGroups.v1";
const NAV_ZONES_KEY = "curiocrm.admin.navZones.v1";

export function pageGuideKey(pathname: string): string {
  const path = pathname.replace(/\/$/, "") || "/admin";
  if (path.startsWith("/admin/crm/users/") && path !== "/admin/crm/users") return "/admin/crm/users/";
  return path;
}

function readWalkthrough(): Record<string, true> {
  try {
    const raw = localStorage.getItem(WALKTHROUGH_KEY);
    if (!raw) return {};
    return (JSON.parse(raw) as Record<string, true>) ?? {};
  } catch {
    return {};
  }
}

function writeWalkthrough(map: Record<string, true>) {
  localStorage.setItem(WALKTHROUGH_KEY, JSON.stringify(map));
}

export function isWalkthroughUnderstood(pathname: string): boolean {
  return Boolean(readWalkthrough()[pageGuideKey(pathname)]);
}

export function markWalkthroughUnderstood(pathname: string): void {
  const map = readWalkthrough();
  map[pageGuideKey(pathname)] = true;
  writeWalkthrough(map);
}

function readBottomHidden(): string[] {
  try {
    const raw = localStorage.getItem(BOTTOM_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as { hidden?: string[] };
    return j.hidden ?? [];
  } catch {
    return [];
  }
}

function writeBottomHidden(hidden: string[]) {
  localStorage.setItem(BOTTOM_KEY, JSON.stringify({ hidden }));
}

export function isBottomGuideDismissed(pathname: string): boolean {
  return readBottomHidden().includes(pageGuideKey(pathname));
}

export function dismissBottomGuide(pathname: string): void {
  const key = pageGuideKey(pathname);
  const hidden = readBottomHidden();
  if (!hidden.includes(key)) hidden.push(key);
  writeBottomHidden(hidden);
}

export function restoreBottomGuide(pathname: string): void {
  const key = pageGuideKey(pathname);
  writeBottomHidden(readBottomHidden().filter((k) => k !== key));
}

export type SidebarPrefs = { collapsed: boolean };

export function loadSidebarPrefs(): SidebarPrefs {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (!raw) return { collapsed: false };
    const j = JSON.parse(raw) as SidebarPrefs;
    return { collapsed: Boolean(j.collapsed) };
  } catch {
    return { collapsed: false };
  }
}

export function saveSidebarCollapsed(collapsed: boolean): SidebarPrefs {
  const prefs = { collapsed };
  localStorage.setItem(SIDEBAR_KEY, JSON.stringify(prefs));
  return prefs;
}

type NavGroupPrefs = Record<string, boolean>;

function navGroupKey(zoneId: string, groupId: string): string {
  return `${zoneId}.${groupId}`;
}

function readNavGroupPrefs(): NavGroupPrefs {
  try {
    const raw = localStorage.getItem(NAV_GROUPS_KEY);
    if (!raw) return {};
    return (JSON.parse(raw) as NavGroupPrefs) ?? {};
  } catch {
    return {};
  }
}

function writeNavGroupPrefs(map: NavGroupPrefs) {
  localStorage.setItem(NAV_GROUPS_KEY, JSON.stringify(map));
}

/** null = no saved preference (use route-active default) */
export function loadNavGroupExpanded(zoneId: string, groupId: string): boolean | null {
  const key = navGroupKey(zoneId, groupId);
  const v = readNavGroupPrefs()[key];
  return typeof v === "boolean" ? v : null;
}

export function saveNavGroupExpanded(zoneId: string, groupId: string, open: boolean): void {
  const map = readNavGroupPrefs();
  map[navGroupKey(zoneId, groupId)] = open;
  writeNavGroupPrefs(map);
}

type NavZonePrefs = Record<string, boolean>;

function readNavZonePrefs(): NavZonePrefs {
  try {
    const raw = localStorage.getItem(NAV_ZONES_KEY);
    if (!raw) return {};
    return (JSON.parse(raw) as NavZonePrefs) ?? {};
  } catch {
    return {};
  }
}

function writeNavZonePrefs(map: NavZonePrefs) {
  localStorage.setItem(NAV_ZONES_KEY, JSON.stringify(map));
}

/** null = no saved preference (use route-active default) */
export function loadNavZoneExpanded(zoneId: string): boolean | null {
  const v = readNavZonePrefs()[zoneId];
  return typeof v === "boolean" ? v : null;
}

export function saveNavZoneExpanded(zoneId: string, open: boolean): void {
  const map = readNavZonePrefs();
  map[zoneId] = open;
  writeNavZonePrefs(map);
}

export const PAGE_GUIDE_STORAGE = {
  walkthrough: WALKTHROUGH_KEY,
  bottom: BOTTOM_KEY,
  sidebar: SIDEBAR_KEY,
  navGroups: NAV_GROUPS_KEY,
  navZones: NAV_ZONES_KEY,
} as const;
