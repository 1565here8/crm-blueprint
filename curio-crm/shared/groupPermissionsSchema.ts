/**
 * Group permission matrix — legacy broker CRM Permissions parity.
 * CRM scope maps to STAFF_PERMISSIONS + sidebar nav visibility keys.
 * API scope covers REST integration endpoints.
 */

export type PermissionScope = "crm" | "api";

export type PermissionNavGroup =
  | "Sidebar"
  | "CRM"
  | "Cashier"
  | "Trading"
  | "Marketing"
  | "System";

export type PermissionCategory = {
  id: string;
  label: string;
  navGroup: PermissionNavGroup;
  /** Legacy category hint for search */
  legacyHint?: string;
};

export type PermissionDef = {
  key: string;
  label: string;
  description: string;
  categoryId: string;
  scope: PermissionScope;
  /** When set, toggling this also maps to staff ACL key */
  staffKey?: string;
};

export const PERMISSION_NAV_GROUPS: PermissionNavGroup[] = [
  "Sidebar",
  "CRM",
  "Cashier",
  "Trading",
  "Marketing",
  "System",
];

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  { id: "sidebar_tabs", label: "Sidebar tabs", navGroup: "Sidebar", legacyHint: "Dashboard Tab, CRM Tab, Cashier Tab" },
  { id: "sidebar_now", label: "Sub-tabs · Now", navGroup: "Sidebar", legacyHint: "Hot Leads, Action Queue, Wallstreet AI" },
  { id: "sidebar_run", label: "Sub-tabs · Run", navGroup: "Sidebar", legacyHint: "Clients, money, markets links" },
  { id: "sidebar_system", label: "Sub-tabs · System", navGroup: "Sidebar", legacyHint: "Brand, fees, logs" },
  { id: "dashboard", label: "Dashboard", navGroup: "Sidebar", legacyHint: "Mission Control widgets" },
  { id: "crm_leads", label: "CRM · Leads", navGroup: "CRM", legacyHint: "Hot Leads inbox" },
  { id: "crm_users", label: "CRM · Users", navGroup: "CRM", legacyHint: "All Clients, Depositors" },
  { id: "crm_agents", label: "CRM · Agents", navGroup: "CRM", legacyHint: "Desk Team roster" },
  { id: "crm_comms", label: "CRM · Comms", navGroup: "CRM", legacyHint: "Notes, emails, calendar" },
  { id: "crm_reports", label: "CRM · Reports", navGroup: "CRM", legacyHint: "Scoreboard" },
  { id: "cashier_in", label: "Cashier · Deposits", navGroup: "Cashier", legacyHint: "Pending in, credits" },
  { id: "cashier_out", label: "Cashier · Payouts", navGroup: "Cashier", legacyHint: "Withdrawals, wire queue" },
  { id: "cashier_adjust", label: "Cashier · Adjustments", navGroup: "Cashier", legacyHint: "Bonuses, balance fixes, ledger" },
  { id: "trading_book", label: "Trading · Book", navGroup: "Trading", legacyHint: "Open & closed trades" },
  { id: "trading_ops", label: "Trading · Operations", navGroup: "Trading", legacyHint: "Open/close, instruments" },
  { id: "marketing_acquire", label: "Marketing · Acquire", navGroup: "Marketing", legacyHint: "Campaigns, partners" },
  { id: "marketing_track", label: "Marketing · Track", navGroup: "Marketing", legacyHint: "Attribution, API keys" },
  { id: "marketing_aff", label: "Marketing · Aff manager", navGroup: "Marketing", legacyHint: "Affiliate manager tools" },
  { id: "desk_ai", label: "Desk · Wallstreet AI", navGroup: "System", legacyHint: "Operator briefs, ask" },
  { id: "desk_intel", label: "Desk · Mega Mind", navGroup: "System", legacyHint: "Forensics, ring, affiliate intel" },
  { id: "desk_rules", label: "Desk · Rules & drips", navGroup: "System", legacyHint: "House rules, drip campaigns" },
  { id: "desk_tasks", label: "Desk · Tasks", navGroup: "System", legacyHint: "Action queue" },
  { id: "compliance", label: "Compliance", navGroup: "System", legacyHint: "KYC / compliance views" },
  { id: "platform", label: "Platform admin", navGroup: "System", legacyHint: "Team, branding, commissions" },
  { id: "logs", label: "Call & event logs", navGroup: "System", legacyHint: "Error, SMTP, history logs" },
  { id: "api_users", label: "API · Users", navGroup: "CRM", legacyHint: "REST user endpoints" },
  { id: "api_money", label: "API · Money", navGroup: "Cashier", legacyHint: "Deposits & withdrawals API" },
  { id: "api_trading", label: "API · Trading", navGroup: "Trading", legacyHint: "Trades API" },
  { id: "api_marketing", label: "API · Marketing", navGroup: "Marketing", legacyHint: "Campaign & lead API" },
  { id: "api_system", label: "API · System", navGroup: "System", legacyHint: "Webhooks & balance reads" },
];

function def(
  key: string,
  label: string,
  description: string,
  categoryId: string,
  scope: PermissionScope,
  staffKey?: string,
): PermissionDef {
  return { key, label, description, categoryId, scope, staffKey };
}

/** Full permission catalog — CRM + API scopes */
export const PERMISSION_CATALOG: PermissionDef[] = [
  /* Sidebar tabs (legacy top-level checkboxes) */
  def("nav.admin.home", "Dashboard tab", "See Mission Control home and daily counters.", "sidebar_tabs", "crm"),
  def("nav.online.view", "Online tab", "Open Live Floor — who is on the site right now.", "sidebar_tabs", "crm"),
  def("nav.crm.zone", "CRM tab", "Show client-facing Run menu items in the sidebar.", "sidebar_tabs", "crm", "crm.users.view"),
  def("nav.cashier.zone", "Cashier tab", "Show money movement pages in the sidebar.", "sidebar_tabs", "crm", "cashier.deposits.view"),
  def("nav.trading.zone", "Trading tab", "Show live book and instrument admin links.", "sidebar_tabs", "crm", "trading.open_trade"),
  def("nav.marketing.zone", "Marketing tab", "Show campaigns and partner tools in the sidebar.", "sidebar_tabs", "crm", "marketing.view"),
  def("nav.webmail", "Webmail", "Access Comms Log and send logged emails.", "sidebar_tabs", "crm", "crm.emails.create"),
  def("nav.chat", "Chat / Wallstreet AI", "Open the AI copilot bubble and desk chat.", "sidebar_tabs", "crm", "desk.ask"),
  def("nav.system.zone", "System tab", "Show platform settings and fee tables.", "sidebar_tabs", "crm", "system.branding.edit"),
  def("nav.logs.zone", "Logs tab", "See error, SMTP, and history log streams.", "sidebar_tabs", "crm"),
  def("nav.back_to_site", "Back to site", "Show the public site link in the header.", "sidebar_tabs", "crm"),

  /* Sub-tabs · Now */
  def("desk.lead_inbox.view", "Hot Leads", "View concierge captures waiting for assignment.", "sidebar_now", "crm", "desk.lead_inbox.view"),
  def("desk.lead_inbox.assign", "Assign leads", "Assign or dismiss inbox leads.", "sidebar_now", "crm", "desk.lead_inbox.assign"),
  def("desk.tasks.view", "Action Queue", "See AI-spawned and manual tasks.", "sidebar_now", "crm", "desk.tasks.view"),
  def("desk.tasks.complete", "Complete tasks", "Mark tasks done or reopen them.", "sidebar_now", "crm", "desk.tasks.complete"),
  def("desk.ask", "Wallstreet AI desk", "Run operator assist and desk Q&A.", "sidebar_now", "crm", "desk.ask"),
  def("desk.psp_health.view", "Payment Radar", "Monitor PSP health and deposit rails.", "sidebar_now", "crm", "desk.psp_health.view"),

  /* Sub-tabs · Run (nav visibility mirrors) */
  def("crm.users.view", "All Clients", "Search and open any client file.", "sidebar_run", "crm", "crm.users.view"),
  def("cashier.deposits.view", "Cashier pages", "Open deposit and ledger screens.", "sidebar_run", "crm", "cashier.deposits.view"),
  def("trading.open_trade", "Trading pages", "Open live book and risk screens.", "sidebar_run", "crm", "trading.open_trade"),
  def("marketing.view", "Marketing pages", "Open campaigns and attribution.", "sidebar_run", "crm", "marketing.view"),

  /* Sub-tabs · System */
  def("system.branding.edit", "Brand & countries", "Edit white-label and geo gates.", "sidebar_system", "crm", "system.branding.edit"),
  def("system.commissions.edit", "Fees & trading status", "Edit commission and spread tables.", "sidebar_system", "crm", "system.commissions.edit"),
  def("system.team.manage", "Access keys", "Manage sub-admin permissions.", "sidebar_system", "crm", "system.team.manage"),

  /* Dashboard */
  def("nav.dashboard.stats", "Dashboard stats", "See registration and treasury counters on home.", "dashboard", "crm"),

  /* CRM */
  def("crm.users.edit", "Edit clients", "Change profile fields and CRM status.", "crm_users", "crm", "crm.users.edit"),
  def("crm.users.create", "Create clients", "Add new client records manually.", "crm_users", "crm", "crm.users.create"),
  def("crm.notes.create", "Intel notes", "Add notes on client files.", "crm_comms", "crm", "crm.notes.create"),
  def("crm.emails.create", "Comms log", "Log outbound emails from the CRM.", "crm_comms", "crm", "crm.emails.create"),
  def("desk.agent_perf.view", "Scoreboard", "View agent performance reports.", "crm_reports", "crm", "desk.agent_perf.view"),

  /* Cashier */
  def("cashier.withdrawals.view", "Payouts & wire", "View withdrawals and wire queue.", "cashier_out", "crm", "cashier.withdrawals.view"),
  def("cashier.adjust", "Bonuses & fixes", "Post bonuses and manual balance adjustments.", "cashier_adjust", "crm", "cashier.adjust"),

  /* Trading */
  def("trading.close_trade", "Close trades", "Force-close open positions from admin.", "trading_ops", "crm", "trading.close_trade"),

  /* Marketing */
  def("marketing.edit", "Edit marketing", "Create or change campaigns and partners.", "marketing_acquire", "crm", "marketing.edit"),
  def("desk.marketing_intel.view", "Marketing intel", "AI marketing intelligence on the desk.", "marketing_track", "crm", "desk.marketing_intel.view"),
  def("desk.affiliate.view", "Affiliate manager", "View affiliate ring and partner intel.", "marketing_aff", "crm", "desk.affiliate.view"),

  /* Desk AI */
  def("desk.operator_brief", "Operator brief", "Generate daily operator briefings.", "desk_ai", "crm", "desk.operator_brief"),
  def("desk.agent_brief", "Agent brief", "Generate per-agent shift briefs.", "desk_ai", "crm", "desk.agent_brief"),
  def("desk.client_pitch", "Client pitch", "Generate call scripts for a client.", "desk_ai", "crm", "desk.client_pitch"),
  def("desk.collections_brief", "Collections brief", "Collections-focused talking points.", "desk_ai", "crm", "desk.collections_brief"),

  /* Mega Mind */
  def("desk.forensics.view", "Forensics", "Deep audit trails on the desk.", "desk_intel", "crm", "desk.forensics.view"),
  def("desk.anomaly.view", "Anomaly radar", "See flagged unusual activity.", "desk_intel", "crm", "desk.anomaly.view"),
  def("desk.ring.view", "Ring view", "See linked account rings.", "desk_intel", "crm", "desk.ring.view"),

  /* Rules */
  def("desk.house_rules.manage", "House rules", "Author desk rule templates.", "desk_rules", "crm", "desk.house_rules.manage"),
  def("desk.drip.manage", "Drip campaigns", "Edit automated drip sequences.", "desk_rules", "crm", "desk.drip.manage"),
  def("desk.drip.approve", "Approve drips", "Approve drip sends before they fire.", "desk_rules", "crm", "desk.drip.approve"),
  def("desk.instruction.run", "Run instructions", "Execute one-shot desk instructions.", "desk_rules", "crm", "desk.instruction.run"),

  /* Compliance */
  def("compliance.view", "Compliance desk", "Open compliance review tools.", "compliance", "crm", "compliance.view"),

  /* Logs (owner-style surfaces — stored for group matrix) */
  def("logs.error.view", "Error logs", "Read application error stream.", "logs", "crm"),
  def("logs.smtp.view", "SMTP logs", "Read outbound email delivery log.", "logs", "crm"),
  def("logs.history.view", "History logs", "Read operator activity history.", "logs", "crm"),
  def("logs.call.view", "Call logs", "View telephony / call disposition logs.", "logs", "crm"),

  /* API scope */
  def("api.users.list", "List users", "GET clients via REST API.", "api_users", "api"),
  def("api.users.read", "Read user", "GET single client profile via API.", "api_users", "api"),
  def("api.users.create", "Create user", "POST new client registrations via API.", "api_users", "api"),
  def("api.users.update", "Update user", "PATCH client fields via API.", "api_users", "api"),
  def("api.deposits.list", "List deposits", "GET deposit history via API.", "api_money", "api"),
  def("api.deposits.create", "Create deposit", "POST manual or gateway deposits via API.", "api_money", "api"),
  def("api.withdrawals.list", "List withdrawals", "GET payout queue via API.", "api_money", "api"),
  def("api.withdrawals.approve", "Approve withdrawal", "POST approve/reject payouts via API.", "api_money", "api"),
  def("api.balance.read", "Read balances", "GET wallet balances via API.", "api_system", "api"),
  def("api.trades.list", "List trades", "GET open and closed trades via API.", "api_trading", "api"),
  def("api.trades.open", "Open trade", "POST open position via API.", "api_trading", "api"),
  def("api.trades.close", "Close trade", "POST close position via API.", "api_trading", "api"),
  def("api.leads.list", "List leads", "GET lead inbox via API.", "api_marketing", "api"),
  def("api.leads.create", "Create lead", "POST inbound leads via API.", "api_marketing", "api"),
  def("api.marketing.campaigns", "Campaigns API", "Manage campaigns via REST.", "api_marketing", "api"),
  def("api.webhooks.receive", "Inbound webhooks", "Accept partner postbacks to your endpoint.", "api_system", "api"),
  def("api.notes.read", "Read notes", "GET CRM notes via API.", "api_users", "api"),
  def("api.notes.write", "Write notes", "POST CRM notes via API.", "api_users", "api"),
];

export function catalogForScope(scope: PermissionScope): PermissionDef[] {
  return PERMISSION_CATALOG.filter((p) => p.scope === scope);
}

export function categoriesForScope(scope: PermissionScope): PermissionCategory[] {
  const ids = new Set(catalogForScope(scope).map((p) => p.categoryId));
  return PERMISSION_CATEGORIES.filter((c) => ids.has(c.id));
}

export function isValidPermissionKey(key: string, scope: PermissionScope): boolean {
  return PERMISSION_CATALOG.some((p) => p.scope === scope && p.key === key);
}

export function staffKeysFromMatrix(keys: string[], scope: PermissionScope): string[] {
  if (scope !== "crm") return [];
  const out = new Set<string>();
  for (const k of keys) {
    const row = PERMISSION_CATALOG.find((p) => p.scope === "crm" && p.key === k);
    if (row?.staffKey) out.add(row.staffKey);
    else if (k.includes(".") && !k.startsWith("nav.") && !k.startsWith("logs.")) out.add(k);
  }
  return [...out];
}

/** Keys enabled by default for a fresh desk group (sales floor starter) */
const SALES_FLOOR_CRM = [
  "nav.admin.home",
  "nav.online.view",
  "nav.crm.zone",
  "desk.lead_inbox.view",
  "desk.tasks.view",
  "desk.ask",
  "crm.users.view",
  "crm.notes.create",
  "crm.emails.create",
  "cashier.deposits.view",
  "nav.back_to_site",
];

const ALL_CRM = PERMISSION_CATALOG.filter((p) => p.scope === "crm").map((p) => p.key);
const ALL_API = PERMISSION_CATALOG.filter((p) => p.scope === "api").map((p) => p.key);

export const GROUP_PERMISSION_PRESETS: Record<string, { crm: string[]; api: string[] }> = {
  admin: { crm: ALL_CRM, api: ALL_API },
  regular: { crm: ["nav.admin.home", "crm.users.view", "nav.back_to_site"], api: ["api.users.read"] },
  manager: {
    crm: ALL_CRM.filter((k) => k !== "system.team.manage" && k !== "logs.error.view"),
    api: ALL_API.filter((k) => !k.includes(".create") && !k.includes(".open") && !k.includes(".approve")),
  },
  support: {
    crm: [
      "nav.admin.home",
      "nav.crm.zone",
      "crm.users.view",
      "crm.notes.create",
      "crm.emails.create",
      "desk.tasks.view",
      "desk.tasks.complete",
      "compliance.view",
      "nav.back_to_site",
    ],
    api: ["api.users.list", "api.users.read", "api.notes.read", "api.notes.write"],
  },
  rep: {
    crm: [
      ...SALES_FLOOR_CRM,
      "desk.lead_inbox.assign",
      "crm.users.edit",
      "cashier.withdrawals.view",
    ],
    api: ["api.users.list", "api.users.read", "api.users.update", "api.leads.create", "api.notes.write"],
  },
  affiliate: {
    crm: ["nav.marketing.zone", "marketing.view", "desk.affiliate.view"],
    api: ["api.leads.create", "api.marketing.campaigns", "api.webhooks.receive"],
  },
  "rep-conversion": {
    crm: [...SALES_FLOOR_CRM, "crm.users.edit", "desk.lead_inbox.assign"],
    api: ["api.users.list", "api.users.read", "api.leads.create"],
  },
  "conversion-manager": {
    crm: [
      ...SALES_FLOOR_CRM,
      "crm.users.edit",
      "crm.users.create",
      "desk.lead_inbox.assign",
      "desk.agent_perf.view",
      "marketing.view",
    ],
    api: ["api.users.list", "api.users.read", "api.users.create", "api.leads.create", "api.marketing.campaigns"],
  },
  "rep-retention": {
    crm: [
      "nav.admin.home",
      "nav.crm.zone",
      "crm.users.view",
      "crm.users.edit",
      "crm.notes.create",
      "crm.emails.create",
      "desk.tasks.view",
      "cashier.deposits.view",
      "cashier.withdrawals.view",
      "nav.back_to_site",
    ],
    api: ["api.users.list", "api.users.read", "api.users.update", "api.notes.write"],
  },
  "retention-manager": {
    crm: [
      "nav.admin.home",
      "nav.crm.zone",
      "nav.cashier.zone",
      "crm.users.view",
      "crm.users.edit",
      "crm.users.create",
      "crm.notes.create",
      "crm.emails.create",
      "desk.agent_perf.view",
      "desk.tasks.view",
      "cashier.deposits.view",
      "cashier.withdrawals.view",
      "cashier.adjust",
      "nav.back_to_site",
    ],
    api: ["api.users.list", "api.users.read", "api.users.create", "api.users.update", "api.deposits.list", "api.withdrawals.list"],
  },
};

export function defaultGroupPermissions(scope: PermissionScope, groupId?: string): string[] {
  if (groupId && GROUP_PERMISSION_PRESETS[groupId]) {
    return GROUP_PERMISSION_PRESETS[groupId][scope];
  }
  if (scope === "api") return [];
  return SALES_FLOOR_CRM;
}
