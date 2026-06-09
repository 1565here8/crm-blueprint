import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Banknote,
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Contact,
  CreditCard,
  Crosshair,
  Eye,
  FileKey2,
  FileText,
  Flame,
  Gauge,
  Gavel,
  Globe,
  Headphones,
  HandCoins,
  History,
  Landmark,
  Layers,
  LayoutGrid,
  LineChart,
  Mail,
  Megaphone,
  Monitor,
  Palette,
  Percent,
  Radio,
  Receipt,
  Scale,
  ScanSearch,
  ScrollText,
  Server,
  Settings,
  Shield,
  ShieldHalf,
  Sparkles,
  StickyNote,
  Target,
  Timer,
  TrendingUp,
  UserRoundCog,
  UsersRound,
  Wallet,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  short?: string;
  icon?: LucideIcon;
  end?: boolean;
  /** Sub-admins need this permission key; primary admin sees all */
  perm?: string;
  /** Hidden from sub-admins — primary admin only (logs, kill-switch) */
  ownerOnly?: boolean;
  /** Shown when zone sidebar is collapsed to icon-only */
  primary?: boolean;
};

/** Collapsible sub-umbrella inside a zone — few headers, many links */
export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export type NavZone = {
  id: string;
  label: string;
  tagline?: string;
  /** KNOWME-style featured block at top of sidebar */
  featured?: boolean;
  /** When set, sidebar shows collapsible groups instead of a flat item list */
  groups?: NavGroup[];
  items: NavItem[];
};

/** All nav links in a zone (flat items or grouped). */
export function zoneNavItems(zone: NavZone): NavItem[] {
  if (zone.groups?.length) return zone.groups.flatMap((g) => g.items);
  return zone.items;
}

type ConsoleUser = {
  role?: string;
  isAdmin?: boolean;
  isStaff?: boolean;
  permissions?: string[];
} | null | undefined;

/** Logged-in admin portal owner — full flat nav, no expandables */
export function isPrimaryAdmin(user: ConsoleUser): boolean {
  if (!user) return false;
  return user.role === "admin" || user.isAdmin === true;
}

export function navItemVisible(item: NavItem, user: ConsoleUser, permSet: Set<string>): boolean {
  if (isPrimaryAdmin(user)) return true;
  if (item.ownerOnly) return false;
  if (!item.perm) return true;
  return permSet.has(item.perm);
}

/** Flat sidebar — priority: Users → Money → Agents → Marketing → Systems */
export const adminZones: NavZone[] = [
  {
    id: "knowme",
    label: "Knowme",
    tagline: "Visual flows · ask anything",
    featured: true,
    items: [{ to: "/admin/knowme", label: "KNOWME", icon: Brain, end: true }],
  },
  {
    id: "pulse",
    label: "Pulse",
    tagline: "What needs attention now",
    items: [
      { to: "/admin", label: "Mission Control", short: "Home", icon: Gauge, end: true },
      { to: "/admin/online", label: "Live Floor", icon: Eye },
      { to: "/admin/desk/leads", label: "Hot Leads", icon: Flame, perm: "desk.lead_inbox.view" },
      { to: "/admin/desk/tasks", label: "Action Queue", icon: ClipboardList, perm: "desk.tasks.view" },
      { to: "/admin/desk", label: "Wallstreet AI", icon: Sparkles, perm: "desk.ask", primary: true },
      { to: "/admin/desk/psp-health", label: "Payment Radar", icon: Activity, perm: "desk.psp_health.view" },
      { to: "/admin/broker-os", label: "Broker OS", icon: LayoutGrid, primary: true },
    ],
  },
  {
    id: "users",
    label: "Users",
    tagline: "Clients & accounts",
    items: [
      { to: "/admin/crm/users", label: "All Clients", icon: Contact, perm: "crm.users.view" },
      { to: "/admin/crm/depositors", label: "Funded Accounts", icon: CircleDollarSign, perm: "crm.users.view" },
    ],
  },
  {
    id: "money",
    label: "Money",
    tagline: "Treasury & cashier",
    items: [],
    groups: [
      {
        id: "deposits",
        label: "Deposits",
        items: [
          { to: "/admin/cashier/deposit-requests", label: "Pending In", icon: HandCoins, perm: "cashier.deposits.view" },
          { to: "/admin/cashier/deposits", label: "Credits In", icon: Wallet, perm: "cashier.deposits.view" },
        ],
      },
      {
        id: "payouts",
        label: "Payouts",
        items: [
          { to: "/admin/cashier/withdrawals", label: "Payouts", icon: Banknote, perm: "cashier.withdrawals.view" },
          { to: "/admin/cashier/wire-req", label: "Wire Queue", icon: Landmark, perm: "cashier.withdrawals.view" },
        ],
      },
      {
        id: "ledger",
        label: "Ledger & fixes",
        items: [
          { to: "/admin/cashier/bonuses", label: "Rewards", icon: Coins, perm: "cashier.adjust" },
          { to: "/admin/cashier/adjustments", label: "Balance Fixes", icon: Scale, perm: "cashier.adjust" },
          { to: "/admin/cashier/ledger", label: "Full Ledger", icon: BookOpen, perm: "cashier.deposits.view" },
        ],
      },
      {
        id: "trading",
        label: "Trading book",
        items: [
          { to: "/admin/trading/open-trades", label: "Live Book", icon: TrendingUp, perm: "trading.open_trade" },
          { to: "/admin/trading/trades", label: "Closed Book", icon: LineChart, perm: "trading.open_trade" },
          { to: "/admin/trading/net-positions", label: "Desk Management", icon: Layers, perm: "trading.open_trade" },
          { to: "/admin/trading/assets", label: "Instruments", icon: Target, perm: "trading.open_trade" },
          { to: "/admin/trading/activity-hours", label: "Market Clock", icon: Timer, perm: "trading.open_trade" },
          { to: "/admin/integrations/metatrader", label: "MT4 / MT5", icon: Monitor, perm: "trading.open_trade" },
        ],
      },
    ],
  },
  {
    id: "agents",
    label: "Agents",
    tagline: "Desk team & routing",
    items: [],
    groups: [
      {
        id: "team",
        label: "Desk team",
        items: [
          { to: "/admin/crm/agents", label: "Desk Team", icon: UserRoundCog, perm: "crm.users.view" },
          { to: "/admin/crm/sales-report", label: "Scoreboard", icon: BarChart3, perm: "desk.agent_perf.view" },
        ],
      },
      {
        id: "intel",
        label: "Intel & schedule",
        items: [
          { to: "/admin/crm/notes", label: "Intel Notes", icon: StickyNote, perm: "crm.notes.create" },
          { to: "/admin/crm/emails", label: "Comms Log", icon: Mail, perm: "crm.emails.create" },
          { to: "/admin/crm/calendar", label: "Schedule", icon: CalendarDays, perm: "crm.users.view" },
          { to: "/admin/crm/support", label: "Support Desk", icon: Headphones, perm: "crm.users.view" },
          { to: "/admin/crm/comms", label: "Comms Center", icon: Mail, perm: "crm.emails.create" },
        ],
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    tagline: "Acquisition & attribution",
    items: [],
    groups: [
      {
        id: "acquisition",
        label: "Acquisition",
        items: [
          { to: "/admin/marketing/campaigns", label: "Campaigns", icon: Megaphone, perm: "marketing.view" },
          { to: "/admin/marketing/partners", label: "Allies", icon: UsersRound, perm: "marketing.view" },
          { to: "/admin/marketing/campaign-pivot", label: "Campaign Pivot", perm: "marketing.view" },
        ],
      },
      {
        id: "tracking",
        label: "Tracking & codes",
        items: [
          { to: "/admin/marketing/trackers", label: "Attribution", icon: Radio, perm: "marketing.view" },
          { to: "/admin/marketing/api-keys", label: "Integrations", icon: FileKey2, perm: "marketing.view" },
          { to: "/admin/system/tracking", label: "Tracking", icon: Crosshair, perm: "marketing.view" },
          { to: "/admin/system/promo-code", label: "Promo Code", perm: "marketing.edit" },
        ],
      },
    ],
  },
  {
    id: "security",
    label: "Security",
    tagline: "Perimeter, DNS, infra & audit",
    items: [],
    groups: [
      {
        id: "perimeter",
        label: "Perimeter",
        items: [
          { to: "/admin/security", label: "Security dashboard", icon: Shield, end: true, ownerOnly: true },
          { to: "/admin/security/perimeter", label: "My IP & perimeter", icon: ShieldHalf, ownerOnly: true },
        ],
      },
      {
        id: "dns-domain",
        label: "DNS & Domain",
        items: [
          { to: "/admin/security/dns", label: "DNS checker", icon: Globe, ownerOnly: true },
          { to: "/admin/security/ssl", label: "SSL / TLS", icon: FileKey2, ownerOnly: true },
        ],
      },
      {
        id: "infrastructure",
        label: "Infrastructure",
        items: [{ to: "/admin/security/infrastructure", label: "Server health", icon: Server, ownerOnly: true }],
      },
      {
        id: "threat-intel",
        label: "Threat intelligence",
        items: [
          { to: "/admin/security/threats", label: "Threats & safety score", icon: Shield, ownerOnly: true },
          { to: "/admin/security/auto-audit", label: "Auto audits", icon: ScanSearch, ownerOnly: true },
          { to: "/admin/security/behavior", label: "Behavior alerts", icon: ShieldHalf, ownerOnly: true },
          { to: "/admin/security/visitors", label: "Visitor watch", icon: Globe, ownerOnly: true },
          { to: "/admin/security/endpoints", label: "Endpoint alerts", icon: Server, ownerOnly: true },
        ],
      },
      {
        id: "access-audit",
        label: "Access & Audit",
        items: [
          { to: "/admin/security/audit", label: "Audit snapshot", icon: Eye, ownerOnly: true },
          { to: "/admin/security/view-log", label: "Login audit", icon: History, ownerOnly: true },
          { to: "/admin/security/access-settings", label: "Session & IP lock", icon: Gavel, ownerOnly: true },
        ],
      },
    ],
  },
  {
    id: "systems",
    label: "Systems",
    tagline: "Calibrate the platform",
    items: [],
    groups: [
      {
        id: "hub",
        label: "Platform hub",
        items: [{ to: "/admin/settings", label: "Settings", icon: Settings }],
      },
      {
        id: "access",
        label: "Access & desks",
        items: [
          { to: "/admin/system/team-permissions", label: "Sub-admins", icon: ShieldHalf, ownerOnly: true },
          { to: "/admin/system/team-permissions", label: "Access Keys", icon: Gavel, perm: "system.team.manage" },
          { to: "/admin/system/groups", label: "Groups", perm: "system.team.manage" },
          { to: "/admin/system/desks", label: "Desks", perm: "system.team.manage" },
          { to: "/admin/system/permissions", label: "Permissions", perm: "system.team.manage" },
          { to: "/admin/system/oauth", label: "OAuth", perm: "system.team.manage" },
          { to: "/admin/system/auto-assign", label: "Auto Assign", perm: "system.team.manage" },
        ],
      },
      {
        id: "brand",
        label: "Brand & geo",
        items: [
          { to: "/admin/system/common/branding", label: "Brand DNA", icon: Palette, perm: "system.branding.edit" },
          { to: "/admin/system/common/countries", label: "Countries", icon: Monitor, perm: "system.branding.edit" },
          { to: "/admin/system/common/preferences", label: "Preferences", icon: Settings, perm: "system.branding.edit" },
        ],
      },
      {
        id: "economics",
        label: "Fees & trading rules",
        items: [
          { to: "/admin/system/account-type", label: "Account Type", perm: "system.commissions.edit" },
          { to: "/admin/system/spread", label: "Spread", perm: "system.commissions.edit" },
          { to: "/admin/system/forex-commissions", label: "Forex Commissions", icon: Percent, perm: "system.commissions.edit" },
          { to: "/admin/system/crypto-commissions", label: "Crypto Fees", icon: Receipt, perm: "system.commissions.edit" },
          { to: "/admin/system/trading-status", label: "Trading Status", perm: "system.commissions.edit" },
        ],
      },
      {
        id: "payments",
        label: "Payments & alerts",
        items: [
          { to: "/admin/system/payment-gateways", label: "Payment Gateways", icon: CreditCard, ownerOnly: true },
          { to: "/admin/system/min-max-deposits", label: "Min/Max Deposits", ownerOnly: true },
          { to: "/admin/system/notifications", label: "Notifications", icon: Mail, ownerOnly: true },
        ],
      },
      {
        id: "pipeline",
        label: "Pipeline & status",
        items: [
          { to: "/admin/system/status", label: "Status", ownerOnly: true },
          { to: "/admin/system/dynamic-status", label: "Dynamic Status", ownerOnly: true },
        ],
      },
      {
        id: "owner",
        label: "Owner & audit",
        items: [
          { to: "/admin/system/configuration", label: "Configuration", icon: Settings, ownerOnly: true },
          { to: "/admin/system/api-docs", label: "API Docs", icon: FileText, ownerOnly: true },
          { to: "/admin/system/event-logs", label: "Event Logs", icon: ScrollText, ownerOnly: true },
          { to: "/admin/system/error-logs", label: "Error Logs", ownerOnly: true },
          { to: "/admin/system/smtp-logs", label: "SMTP Logs", ownerOnly: true },
          { to: "/admin/system/balance-events", label: "Balance events", icon: Scale, ownerOnly: true },
          { to: "/admin/system/history-logs", label: "History Logs", icon: History, ownerOnly: true },
          { to: "/admin/system/order-storage-logs", label: "Order Storage Logs", ownerOnly: true },
        ],
      },
    ],
  },
];

export const adminPageSubtitles: Record<string, string> = {
  "/admin": "Morning dashboard — sign-ups, money, and desk health in one glance.",
  "/admin/online": "Who is browsing the public site right now.",
  "/admin/desk": "Wallstreet AI — ask about clients, money, or what to do next.",
  "/admin/desk/leads": "Entrance signups and visitors waiting for a callback.",
  "/admin/desk/psp-health": "Are card and wire deposit rails working?",
  "/admin/desk/tasks": "Your personal to-do list inside the CRM.",
  "/admin/crm/users": "Find any client — search, filter, open their full file.",
  "/admin/crm/depositors": "Clients who already deposited — retention list.",
  "/admin/crm/agents": "Sales and support staff on the floor.",
  "/admin/crm/sales-report": "Agent KPIs for the period you pick.",
  "/admin/crm/notes": "Notes agents left on clients across the desk.",
  "/admin/crm/emails": "Emails logged in CRM — not your mail server.",
  "/admin/crm/calendar": "Callbacks and follow-ups you promised.",
  "/admin/cashier/deposit-requests": "Deposit requests waiting for approve or reject.",
  "/admin/cashier/deposits": "Approved deposits already on client balances.",
  "/admin/cashier/withdrawals": "Withdrawals and debits processed.",
  "/admin/cashier/wire-req": "Wire withdrawals needing manual review.",
  "/admin/cashier/bonuses": "Promotional bonus credits issued.",
  "/admin/cashier/adjustments": "One-off balance corrections with a reason.",
  "/admin/cashier/ledger": "Master log of every money movement.",
  "/admin/trading/open-trades": "Open positions you can close or adjust.",
  "/admin/trading/trades": "Closed and filled order history.",
  "/admin/trading/net-positions": "House exposure by symbol — desk risk view.",
  "/admin/knowme": "Training room — picture flows, wiki links, and guide chat.",
  "/admin/automation": "Email and action sequences — triggers, waits, and branches.",
  "/admin/broker-os": "LXCRM parity map — live, partial, roadmap, and genius client journey.",
  "/admin/crm/support": "Support tickets — priority queue on desk tasks with KYC and payout categories.",
  "/admin/crm/comms": "Email, automation, and VOIP/SMS channel hub.",
  "/admin/integrations": "Trading, PSP, KYC, and comms — live vs API-ready.",
  "/admin/integrations/metatrader": "MetaTrader 4 & 5 bridge — server, sync, and client downloads.",
  "/admin/settings": "Front door to branding, fees, deposits, pipeline, and access.",
  "/admin/system/dynamic-status": "Auto-move pipeline labels when balance or activity changes.",
  "/admin/system/trading-status": "Freeze trading but keep login working.",
  "/admin/trading/assets": "Symbols clients can trade.",
  "/admin/trading/activity-hours": "Market open and close times.",
  "/admin/marketing/campaigns": "Where leads come from — UTMs and sources.",
  "/admin/marketing/partners-hq": "IB partners — deals, links, and performance.",
  "/admin/marketing/partners": "Affiliate and IB partner roster.",
  "/admin/marketing/trackers": "Pixels and conversion postbacks.",
  "/admin/marketing/api-keys": "API keys for external lead importers.",
  "/admin/marketing/campaign-pivot": "Cross-campaign reporting — preview module.",
  "/admin/system/common/branding": "CRM name and link to the public site.",
  "/admin/system/common/countries": "Which countries may visit, register, and trade.",
  "/admin/system/common/preferences": "Platform-wide toggles and defaults.",
  "/admin/security": "Owner security cockpit — health, license, threats, export.",
  "/admin/security/perimeter": "Your IP vs office allowlist before travel.",
  "/admin/security/dns": "DNS records as seen from the VPS.",
  "/admin/security/ssl": "Certificate expiry for admin and public hosts.",
  "/admin/security/infrastructure": "Ollama, vendor license, and tenant billing gate.",
  "/admin/security/audit": "Quick login snapshot — drill into full audits.",
  "/admin/security/view-log": "Who logged in, from which IP, and when.",
  "/admin/security/access-settings": "Session timeout, lockouts, and IP allowlists.",
  "/admin/security/threats": "Safety score and active threat list.",
  "/admin/security/auto-audit": "Scheduled website + CRM audits and user behavior analysis.",
  "/admin/security/behavior": "Unusual admin login and permission patterns.",
  "/admin/security/visitors": "IP watchlist from site and admin traffic.",
  "/admin/security/endpoints": "USB and workstation events from Endpoint Agent.",
  "/admin/system/common/security/view-log": "Staff login audit trail.",
  "/admin/system/common/security/settings": "Session hours and password attempt limits.",
  "/admin/system/team-permissions": "Create sub-admins and access keys.",
  "/admin/system/forex-commissions": "FX fee matrix by tier and currency.",
  "/admin/system/crypto-commissions": "Crypto fee matrix by tier and currency.",
  "/admin/system/payment-gateways": "Card and crypto processor credentials.",
  "/admin/system/configuration": "Owner maintenance and platform kill-switch.",
  "/admin/system/error-logs": "Server errors — for tech support.",
  "/admin/system/smtp-logs": "Outbound email delivery attempts.",
  "/admin/system/balance-events": "Wallet changes with before/after amounts.",
  "/admin/system/history-logs": "Who changed status, owner, or profile.",
  "/admin/system/order-storage-logs": "Trade sync diagnostics.",
  "/admin/system/tracking": "Legacy site-wide tracking snippets.",
  "/admin/system/notifications": "Per-agent email, push, and in-app alerts.",
  "/admin/system/api-docs": "REST API reference for developers.",
  "/admin/system/oauth": "Partner API credentials and campaign access.",
  "/admin/system/desks": "Language and region floors for agents.",
  "/admin/system/permissions": "Sidebar and API rights per desk group.",
  "/admin/system/account-type": "Retail, VIP, and IB tier defaults.",
  "/admin/system/spread": "Markup matrix by client tier.",
  "/admin/system/auto-assign": "Route new signups to the right agent.",
  "/admin/system/promo-code": "Signup codes with bonus and routing.",
  "/admin/system/status": "Pipeline stage labels and colours.",
  "/admin/system/min-max-deposits": "Min and max deposit per PSP and region.",
  "/admin/system/groups": "Desk role buckets — admin, rep, retention, etc.",
  "/admin/system/event-logs": "Immutable log of every CRM action.",
};

export function navItemMatches(item: NavItem, path: string): boolean {
  return item.end ? path === item.to || path === `${item.to}/` : path.startsWith(item.to);
}

export function findNavLabel(path: string): string {
  for (const zone of adminZones) {
    for (const item of zoneNavItems(zone)) {
      if (navItemMatches(item, path)) return item.label;
    }
  }
  if (path.startsWith("/admin/crm/users/")) return "Client File";
  return "Console";
}

export function findNavGroupLabel(path: string): string | undefined {
  for (const zone of adminZones) {
    for (const group of zone.groups ?? []) {
      if (group.items.some((item) => navItemMatches(item, path))) return group.label;
    }
  }
  return undefined;
}

export function findZoneLabel(path: string): string {
  for (const zone of adminZones) {
    if (zoneNavItems(zone).some((item) => navItemMatches(item, path))) return zone.label;
  }
  if (path.startsWith("/admin/crm/users/")) return "Users";
  if (path.startsWith("/admin/cashier/") || path.startsWith("/admin/trading/")) return "Money";
  if (path.startsWith("/admin/crm/")) return "Agents";
  if (path.startsWith("/admin/marketing/")) return "Marketing";
  if (path.startsWith("/admin/system/") || path.startsWith("/admin/settings")) return "Systems";
  if (path.startsWith("/admin/security")) return "Security";
  if (path.startsWith("/admin/knowme")) return "Knowme";
  return "Pulse";
}

export function findPageSubtitle(path: string): string | undefined {
  if (path.startsWith("/admin/crm/users/")) {
    return "Profile, money, trades, and intel for one client.";
  }
  const exact = adminPageSubtitles[path];
  if (exact) return exact;
  for (const [route, sub] of Object.entries(adminPageSubtitles)) {
    if (route !== "/admin" && path.startsWith(route)) return sub;
  }
  return undefined;
}

/** Dedupe same-route links (Sub-admins + Access Keys share one page) */
export function visibleZoneItems(zone: NavZone, user: ConsoleUser, permSet: Set<string>): NavItem[] {
  const seen = new Set<string>();
  const out: NavItem[] = [];
  for (const item of zoneNavItems(zone)) {
    if (!navItemVisible(item, user, permSet)) continue;
    if (seen.has(item.to)) continue;
    seen.add(item.to);
    out.push(item);
  }
  return out;
}

/** Collapsible groups with at least one visible link */
export function visibleZoneGroups(
  zone: NavZone,
  user: ConsoleUser,
  permSet: Set<string>,
): NavGroup[] {
  if (!zone.groups?.length) return [];
  const seen = new Set<string>();
  const out: NavGroup[] = [];
  for (const group of zone.groups) {
    const items: NavItem[] = [];
    for (const item of group.items) {
      if (!navItemVisible(item, user, permSet)) continue;
      if (seen.has(item.to)) continue;
      seen.add(item.to);
      items.push(item);
    }
    if (items.length) out.push({ ...group, items });
  }
  return out;
}

/** Main shortcuts — shown when zone is collapsed or sidebar is icon-only */
export function visibleZonePrimaryItems(
  zone: NavZone,
  user: ConsoleUser,
  permSet: Set<string>,
): NavItem[] {
  const all = visibleZoneItems(zone, user, permSet);
  const primary = all.filter((i) => i.primary);
  return primary.length ? primary : all.slice(0, 1);
}

/** True when zone has more links than the primary shortcut row */
export function zoneHasSecondaryNav(zone: NavZone, user: ConsoleUser, permSet: Set<string>): boolean {
  const groups = visibleZoneGroups(zone, user, permSet);
  if (groups.length > 0) return true;
  const all = visibleZoneItems(zone, user, permSet);
  const primary = visibleZonePrimaryItems(zone, user, permSet);
  return all.length > primary.length;
}
