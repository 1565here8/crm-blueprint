import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  Search,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { client } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isExternalSiteUrl, useCrmBranding } from "../../context/BrandingContext";
import {
  adminZones,
  findNavLabel,
  findNavGroupLabel,
  findZoneLabel,
  isPrimaryAdmin,
  navItemMatches,
  visibleZoneGroups,
  visibleZoneItems,
  visibleZonePrimaryItems,
  zoneHasSecondaryNav,
  type NavGroup,
  type NavItem,
  type NavZone,
} from "./adminNavConfig";
import { AdminDeskBubble } from "./AdminDeskBubble";
import { KnowmeAgentHelpDock } from "./knowme/KnowmeAgentHelpDock";
import { AdminToastStack } from "./AdminToastStack";
import { CurioniLabsLogo } from "../brand/CurioniLabsLogo";
import { CurioniLabsPlatformCredit } from "./CurioniLabsPlatformCredit";
import { PageBottomGuideAuto } from "./PageBottomGuideAuto";
import { CrmErrorBoundary } from "../CrmErrorBoundary";
import { PageFirstDayGuide } from "./PageFirstDayGuide";
import { curioni, curioniShell } from "../../lib/curioniDesign";
import {
  loadNavGroupExpanded,
  loadNavZoneExpanded,
  loadSidebarPrefs,
  saveNavGroupExpanded,
  saveNavZoneExpanded,
  saveSidebarCollapsed,
} from "../../lib/pageGuidePrefs";

function navLinkCls(active: boolean, collapsed: boolean) {
  const base = collapsed
    ? "flex items-center justify-center rounded-xl p-2.5 text-[13px] font-medium transition-all duration-300"
    : "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-300";
  return active ? `${base} ${curioni.navActive} shadow-sm` : `${base} ${curioni.navIdle} hover:shadow-sm`;
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums text-[11px] text-curioni-muted-on-dark">
      {now.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      })}{" "}
      UTC
    </span>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => navLinkCls(isActive, collapsed)}
    >
      {Icon ? (
        <Icon size={16} className="shrink-0 opacity-80" />
      ) : collapsed ? (
        <span className="text-[11px] font-bold uppercase">{item.label.charAt(0)}</span>
      ) : null}
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );
}

function SidebarNavGroup({
  zoneId,
  group,
  collapsed,
  pathname,
  open,
  onToggle,
}: {
  zoneId: string;
  group: NavGroup;
  collapsed: boolean;
  pathname: string;
  open: boolean;
  onToggle: () => void;
}) {
  const active = group.items.some(
    (item) =>
      pathname === item.to ||
      pathname === `${item.to}/` ||
      (item.end ? false : pathname.startsWith(item.to)),
  );
  if (collapsed) {
    return (
      <div className="space-y-0.5 border-t border-slate-800/60 pt-1 first:border-t-0 first:pt-0">
        {group.items.map((item) => (
          <SidebarLink key={item.to + item.label} item={item} collapsed />
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-900/20">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide transition ${
          active ? "text-curioni-champagne-light" : "text-curioni-muted-on-dark hover:bg-white/5 hover:text-white/90"
        }`}
      >
        <span className="truncate">{group.label}</span>
        <ChevronDown size={14} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="space-y-0.5 px-1 pb-1.5">
          {group.items.map((item) => (
            <SidebarLink key={item.to + item.label} item={item} collapsed={false} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarContent({
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  const { branding } = useCrmBranding();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isAdmin = isPrimaryAdmin(user);
  const permSet = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);
  const [navGroupOpen, setNavGroupOpen] = useState<Record<string, boolean>>({});
  const [navZoneOpen, setNavZoneOpen] = useState<Record<string, boolean>>({});

  const groupKey = (zoneId: string, groupId: string) => `${zoneId}.${groupId}`;

  const isGroupOpen = (zoneId: string, group: NavGroup) => {
    const key = groupKey(zoneId, group.id);
    if (key in navGroupOpen) return navGroupOpen[key]!;
    const saved = loadNavGroupExpanded(zoneId, group.id);
    if (saved !== null) return saved;
    return group.items.some(
      (item) =>
        pathname === item.to ||
        pathname === `${item.to}/` ||
        (!item.end && pathname.startsWith(item.to)),
    );
  };

  const toggleGroup = (zoneId: string, groupId: string, currentlyOpen: boolean) => {
    const key = groupKey(zoneId, groupId);
    const nextOpen = !currentlyOpen;
    saveNavGroupExpanded(zoneId, groupId, nextOpen);
    setNavGroupOpen((prev) => ({ ...prev, [key]: nextOpen }));
  };

  const isZoneOpen = (zone: NavZone) => {
    if (zone.id in navZoneOpen) return navZoneOpen[zone.id]!;
    const saved = loadNavZoneExpanded(zone.id);
    if (saved !== null) return saved;
    const primaryRoutes = new Set(visibleZonePrimaryItems(zone, user, permSet).map((i) => i.to));
    const onSecondary = visibleZoneItems(zone, user, permSet).some(
      (item) => navItemMatches(item, pathname) && !primaryRoutes.has(item.to),
    );
    if (onSecondary) return true;
    return false;
  };

  const toggleZone = (zoneId: string, currentlyOpen: boolean) => {
    const nextOpen = !currentlyOpen;
    saveNavZoneExpanded(zoneId, nextOpen);
    setNavZoneOpen((prev) => ({ ...prev, [zoneId]: nextOpen }));
  };

  const renderZone = (zone: NavZone) => {
    const groups = visibleZoneGroups(zone, user, permSet);
    const flatItems = visibleZoneItems(zone, user, permSet);
    const primaryItems = visibleZonePrimaryItems(zone, user, permSet);
    if (groups.length === 0 && flatItems.length === 0) return null;
    const isSystems = zone.id === "systems";
    const isKnowme = zone.id === "knowme";
    const isFeatured = zone.featured;
    const canCollapseZone = zone.id !== "knowme" && zoneHasSecondaryNav(zone, user, permSet);
    const zoneOpen = isZoneOpen(zone);
    const showFullNav = collapsed ? false : !canCollapseZone || zoneOpen;
    const linkItems = collapsed || !showFullNav ? primaryItems : flatItems;

    const zoneHeaderTone =
      isKnowme || zone.id === "nexus"
        ? "text-indigo-200"
        : isSystems
          ? "text-indigo-200/90"
          : "text-curioni-muted-on-dark";

    return (
      <div
        key={zone.id}
        className={
          isFeatured
            ? "rounded-xl border border-curioni-accent/30 bg-gradient-to-br from-curioni-accent/10 via-curioni-indigo/20 to-curioni-rail px-1 py-2.5"
            : isSystems
              ? "rounded-xl border border-indigo-500/20 bg-curioni-indigo/15 px-1 py-2.5"
              : undefined
        }
      >
        {!collapsed ? (
          <div className="mb-1.5 px-2">
            {canCollapseZone ? (
              <button
                type="button"
                onClick={() => toggleZone(zone.id, zoneOpen)}
                className="flex w-full items-start justify-between gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-slate-800/60"
                aria-expanded={zoneOpen}
              >
                <span className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${zoneHeaderTone}`}>
                    {zone.label}
                  </p>
                  {zone.tagline ? (
                    <p
                      className={`text-[10px] ${isKnowme || zone.id === "nexus" || isSystems ? "text-violet-200/45" : "text-slate-600"}`}
                    >
                      {zone.tagline}
                    </p>
                  ) : null}
                </span>
                <ChevronDown
                  size={14}
                  className={`mt-0.5 shrink-0 text-slate-500 transition ${zoneOpen ? "rotate-180" : ""}`}
                />
              </button>
            ) : (
              <div className="px-1">
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${zoneHeaderTone}`}>{zone.label}</p>
                {zone.tagline ? (
                  <p
                    className={`text-[10px] ${isKnowme || zone.id === "nexus" || isSystems ? "text-violet-200/45" : "text-slate-600"}`}
                  >
                    {zone.tagline}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
        <div className="space-y-1">
          {showFullNav && groups.length
            ? groups.map((group) => (
                <SidebarNavGroup
                  key={group.id}
                  zoneId={zone.id}
                  group={group}
                  collapsed={collapsed}
                  pathname={pathname}
                  open={isGroupOpen(zone.id, group)}
                  onToggle={() => toggleGroup(zone.id, group.id, isGroupOpen(zone.id, group))}
                />
              ))
            : linkItems.map((item) => (
                <SidebarLink key={item.to + item.label} item={item} collapsed={collapsed} />
              ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`border-b border-slate-800 ${collapsed ? "px-2 py-4" : "px-4 py-5"}`}>
        <div className={`flex items-center ${collapsed ? "flex-col gap-2" : "gap-3"}`}>
          <CurioniLabsLogo
            variant={collapsed ? "mark" : "full"}
            theme="dark"
            height={36}
            subtitle={collapsed ? undefined : "COMMAND"}
            className={collapsed ? "" : "min-w-0 flex-1"}
          />
          {!collapsed && user ? (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                isAdmin ? "bg-curioni-accent/20 text-indigo-200" : "bg-white/10 text-curioni-muted-on-dark"
              }`}
            >
              {isAdmin ? "Admin" : "Sub"}
            </span>
          ) : null}
        </div>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mt-3 flex w-full items-center justify-center rounded-lg border border-curioni-rail-border py-1.5 text-curioni-muted-on-dark transition hover:border-curioni-accent/40 hover:bg-white/5 hover:text-indigo-200 ${
              collapsed ? "px-0" : "gap-2 px-2 text-[11px]"
            }`}
          >
            {collapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={14} />}
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" onClick={onNavigate}>
        {adminZones.map(renderZone)}

        {!collapsed ? (
          <>
            <div className="border-t border-slate-800 pt-4">
              {isExternalSiteUrl(branding.goToSiteUrl) ? (
                <a
                  href={branding.goToSiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={navLinkCls(false, false)}
                >
                  <ArrowUpRight size={16} />
                  <span>{branding.goToSiteLabel}</span>
                </a>
              ) : (
                <NavLink to={branding.goToSiteUrl} className={({ isActive }) => navLinkCls(isActive, false)}>
                  <ArrowUpRight size={16} />
                  <span>{branding.goToSiteLabel}</span>
                </NavLink>
              )}
            </div>
            <div className="mt-4">
              <CurioniLabsPlatformCredit />
            </div>
          </>
        ) : null}
      </nav>
    </>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [alertCount, setAlertCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => loadSidebarPrefs().collapsed);

  const isAdmin = isPrimaryAdmin(user);
  const canUseDesk = isAdmin || (user?.permissions ?? []).includes("desk.ask");
  const showAgentKnowmeDock =
    Boolean(user) && !isAdmin && !(user?.permissions ?? []).includes("desk.ask");

  const zoneLabel = useMemo(() => findZoneLabel(location.pathname), [location.pathname]);
  const groupLabel = useMemo(() => findNavGroupLabel(location.pathname), [location.pathname]);
  const pageLabel = useMemo(() => findNavLabel(location.pathname), [location.pathname]);

  const toggleSidebar = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      saveSidebarCollapsed(next);
      return next;
    });
  };

  useEffect(() => {
    document.title = "CURIONILABS — Command";
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      client.deskLeadList("new").catch(() => ({ leads: [] as { id: string }[] })),
      client.deskTaskList("open").catch(() => ({ tasks: [] as { id: string }[] })),
    ]).then(([leads, tasks]) => {
      setAlertCount((leads.leads?.length ?? 0) + (tasks.tasks?.length ?? 0));
    });
  }, [user, location.pathname]);

  const sidebarWidth = sidebarCollapsed ? "w-[68px]" : "w-[272px]";

  return (
    <div className={`${curioniShell.page} font-curioni`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`${curioniShell.header} border-b border-slate-200/60 bg-white/85 backdrop-blur-2xl shadow-sm shadow-slate-200/30`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-curioni-line p-2 text-curioni-muted lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </button>

            <div className="hidden min-w-0 sm:block">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="font-medium text-slate-600">{zoneLabel}</span>
                <ChevronRight size={12} className="text-slate-300" />
                {groupLabel ? (
                  <>
                    <span className="font-medium text-slate-500">{groupLabel}</span>
                    <ChevronRight size={12} className="text-slate-300" />
                  </>
                ) : null}
                <span className="font-semibold text-slate-900">{pageLabel}</span>
              </div>
            </div>

            <div className="relative ml-0 flex flex-1 max-w-lg items-center sm:ml-4">
                <Search size={15} className="pointer-events-none absolute left-3.5 text-slate-400" />
              <input
                placeholder="Search clients, trades, deposits…"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && headerSearch.trim()) {
                    navigate(`/admin/crm/users?search=${encodeURIComponent(headerSearch.trim())}`);
                  }
                }}
                className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 py-2 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                title="New leads & open tasks"
                onClick={() => navigate("/admin/desk/leads")}
                className="relative rounded-xl border border-curioni-line p-2 text-curioni-muted transition hover:bg-curioni-elevated"
              >
                <Bell size={17} />
                {alertCount > 0 ? (
                  <span className={curioniShell.bellBadge}>
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                ) : null}
              </button>
              <div className="hidden items-center gap-2 rounded-xl border border-curioni-line bg-curioni-elevated px-2 py-1.5 sm:flex">
                <div className={curioniShell.avatar}>
                  {(user?.username ?? "A").charAt(0).toUpperCase()}
                </div>
                <div className="hidden flex-col md:flex">
                  <span className="max-w-[120px] truncate text-xs font-semibold text-curioni-ink">
                    {user?.username}
                  </span>
                  <LiveClock />
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout().then(() => navigate("/"))}
                className="rounded-xl border border-curioni-line p-2 text-curioni-muted transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <CrmErrorBoundary scope="page">
            <Outlet />
          </CrmErrorBoundary>
          <PageBottomGuideAuto />
        </main>
      </div>

      <aside
        className={`${curioniShell.sidebar} ${sidebarWidth}`}
      >
        <SidebarContent collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`${curioniShell.sidebarMobile} transition-transform duration-300`}>
            <button
              type="button"
              className="absolute left-3 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              onClick={() => setMobileOpen(false)}
            >
              <ChevronLeft size={18} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} collapsed={false} />
          </aside>
        </div>
      ) : null}

      <PageFirstDayGuide />

      {canUseDesk ? <AdminDeskBubble /> : null}
      {showAgentKnowmeDock && location.pathname !== "/admin/knowme" ? (
        <KnowmeAgentHelpDock />
      ) : null}
      <AdminToastStack />
    </div>
  );
}
