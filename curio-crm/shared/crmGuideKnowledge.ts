/** CRM live guide â€” shared by admin UI and Wallstreet AI (server). */
import { CURIONILABS_PUBLIC_URL } from "./productHosts";
import { getPageTutorial } from "./crmPageTutorials";
import {
  formatHermesDepthReply,
  HERMES_MODULE_COUNT,
  hermesBlockForModuleId,
  matchHermesTeachModule,
} from "./crmHermesDepth";

export { HERMES_MODULE_COUNT };

export type GlossaryTerm = {
  id: string;
  label: string;
  path: string;
  aliases?: string[];
};

export const GLOSSARY: Record<string, GlossaryTerm> = {
  mission_control: { id: "mission_control", label: "Mission Control", path: "/admin", aliases: ["dashboard", "home"] },
  live_floor: { id: "live_floor", label: "Live Floor", path: "/admin/online" },
  hot_leads: { id: "hot_leads", label: "Hot Leads", path: "/admin/desk/leads", aliases: ["leads"] },
  action_queue: { id: "action_queue", label: "Action Queue", path: "/admin/desk/tasks", aliases: ["tasks"] },
  street_ai: { id: "street_ai", label: "Wallstreet AI", path: "/admin/desk", aliases: ["ai of wallstreet", "wallstreet ai", "wallstreetai", "WALLSTREET AI"] },
  payment_radar: {
    id: "payment_radar",
    label: "Payment Radar",
    path: "/admin/desk/psp-health",
    aliases: ["psp health", "psp radar", "deposit rail health"],
  },
  all_clients: { id: "all_clients", label: "All Clients", path: "/admin/crm/users", aliases: ["user", "users", "client", "clients"] },
  client_file: { id: "client_file", label: "Client File", path: "/admin/crm/users", aliases: ["profile"] },
  funded_accounts: { id: "funded_accounts", label: "Funded Accounts", path: "/admin/crm/depositors", aliases: ["depositor", "depositors"] },
  desk_team: { id: "desk_team", label: "Desk Team", path: "/admin/crm/agents", aliases: ["agents", "agent"] },
  scoreboard: { id: "scoreboard", label: "Scoreboard", path: "/admin/crm/sales-report" },
  intel_notes: { id: "intel_notes", label: "Intel Notes", path: "/admin/crm/notes", aliases: ["notes"] },
  comms_log: { id: "comms_log", label: "Comms Log", path: "/admin/crm/emails", aliases: ["emails"] },
  schedule: { id: "schedule", label: "Schedule", path: "/admin/crm/calendar", aliases: ["calendar"] },
  pending_in: {
    id: "pending_in",
    label: "Pending In",
    path: "/admin/cashier/deposit-requests",
    aliases: ["deposit request", "deposit queue", "pending deposit"],
  },
  credits_in: {
    id: "credits_in",
    label: "Credits In",
    path: "/admin/cashier/deposits",
    aliases: ["deposits", "credits in", "posted deposits", "money in history"],
  },
  payouts: { id: "payouts", label: "Payouts", path: "/admin/cashier/withdrawals", aliases: ["withdrawals"] },
  wire_queue: { id: "wire_queue", label: "Wire Queue", path: "/admin/cashier/wire-req", aliases: ["wire"] },
  rewards: { id: "rewards", label: "Rewards", path: "/admin/cashier/bonuses", aliases: ["bonuses"] },
  balance_fixes: { id: "balance_fixes", label: "Balance Fixes", path: "/admin/cashier/adjustments", aliases: ["adjustments"] },
  full_ledger: { id: "full_ledger", label: "Full Ledger", path: "/admin/cashier/ledger", aliases: ["ledger"] },
  live_book: { id: "live_book", label: "Live Book", path: "/admin/trading/open-trades", aliases: ["open trades"] },
  closed_book: {
    id: "closed_book",
    label: "Closed Book",
    path: "/admin/trading/trades",
    aliases: ["trades", "trade history", "closed trades"],
  },
  desk_management: { id: "desk_management", label: "Desk Management", path: "/admin/trading/net-positions", aliases: ["desk risk", "house risk", "net positions"] },
  instruments: { id: "instruments", label: "Instruments", path: "/admin/trading/assets", aliases: ["assets"] },
  market_clock: { id: "market_clock", label: "Market Clock", path: "/admin/trading/activity-hours" },
  campaigns: { id: "campaigns", label: "Campaigns", path: "/admin/marketing/campaigns" },
  allies: { id: "allies", label: "Allies", path: "/admin/marketing/partners", aliases: ["partners", "affiliate", "affiliates", "ib partner"] },
  attribution: { id: "attribution", label: "Attribution", path: "/admin/marketing/trackers", aliases: ["trackers"] },
  integrations: { id: "integrations", label: "Integrations", path: "/admin/marketing/api-keys", aliases: ["api keys"] },
  brand_dna: { id: "brand_dna", label: "Brand DNA", path: "/admin/system/common", aliases: ["branding"] },
  access_keys: { id: "access_keys", label: "Access Keys", path: "/admin/system/team-permissions", aliases: ["sub-admins"] },
  permissions: { id: "permissions", label: "Permissions", path: "/admin/system/permissions", aliases: ["role matrix", "group permissions"] },
  desks: { id: "desks", label: "Desks", path: "/admin/system/desks", aliases: ["regional desk", "language desk", "german desk"] },
  client_statuses: {
    id: "client_statuses",
    label: "Statuses",
    path: "/admin/system/status",
    aliases: ["status", "pipeline", "crm status", "client status"],
  },
  settings: {
    id: "settings",
    label: "Settings",
    path: "/admin/settings",
    aliases: ["configuration", "platform settings", "admin settings"],
  },
  aria: { id: "aria", label: "Aria concierge", path: CURIONILABS_PUBLIC_URL, aliases: ["concierge"] },
  knowme: {
    id: "knowme",
    label: "KNOWME",
    path: "/admin/knowme",
    aliases: ["know me", "crm guide", "help chat", "ask crm"],
  },
  groups: { id: "groups", label: "Groups", path: "/admin/system/groups", aliases: ["desk groups"] },
  oauth: { id: "oauth", label: "OAuth", path: "/admin/system/oauth", aliases: ["sso", "api partner"] },
  tracking: { id: "tracking", label: "Tracking", path: "/admin/system/tracking", aliases: ["track pixels", "pixels"] },
  account_types: { id: "account_types", label: "Account Types", path: "/admin/system/account-type", aliases: ["account type", "retail vip"] },
  spread: { id: "spread", label: "Spread", path: "/admin/system/spread", aliases: ["markup", "tier spread"] },
  auto_assign: { id: "auto_assign", label: "Auto Assign", path: "/admin/system/auto-assign", aliases: ["lead routing", "round robin"] },
  promo_codes: { id: "promo_codes", label: "Promo Code", path: "/admin/system/promo-code", aliases: ["promo", "signup code"] },
  notifications: { id: "notifications", label: "Notifications", path: "/admin/system/notifications", aliases: ["member alerts", "email alerts"] },
  security_log: { id: "security_log", label: "Security View Log", path: "/admin/security/view-log", aliases: ["view log", "login audit"] },
  security_threats: {
    id: "security_threats",
    label: "Threat intelligence",
    path: "/admin/security/threats",
    aliases: ["safety score", "threats", "phishy admin"],
  },
  security_behavior: {
    id: "security_behavior",
    label: "Behavior alerts",
    path: "/admin/security/behavior",
    aliases: ["behavior alert", "suspicious admin"],
  },
  security_visitors: {
    id: "security_visitors",
    label: "Visitor watch",
    path: "/admin/security/visitors",
    aliases: ["unwanted ip", "visitor watch"],
  },
  security_endpoints: {
    id: "security_endpoints",
    label: "Endpoint alerts",
    path: "/admin/security/endpoints",
    aliases: ["usb", "endpoint agent"],
  },
  security_console: {
    id: "security_console",
    label: "Security dashboard",
    path: "/admin/security",
    aliases: ["security zone", "security console", "perimeter dashboard", "infra health"],
  },
  security_perimeter: {
    id: "security_perimeter",
    label: "My IP & perimeter",
    path: "/admin/security/perimeter",
    aliases: ["my ip", "ip allowlist", "office ip", "admin ip"],
  },
  security_dns: {
    id: "security_dns",
    label: "DNS checker",
    path: "/admin/security/dns",
    aliases: ["dns lookup", "dns records", "domain dns"],
  },
  security_ssl: {
    id: "security_ssl",
    label: "SSL / TLS",
    path: "/admin/security/ssl",
    aliases: ["certificate", "cert expiry", "tls check"],
  },
  countries: { id: "countries", label: "Countries", path: "/admin/system/common/countries", aliases: ["geo gates"] },
  preferences: { id: "preferences", label: "Preferences", path: "/admin/system/common/preferences", aliases: ["platform toggles"] },
  payment_gateways: {
    id: "payment_gateways",
    label: "Payment Gateways",
    path: "/admin/system/payment-gateways",
    aliases: ["psp config", "payment processor", "processors", "gateway setup"],
  },
  balance_events: { id: "balance_events", label: "Balance events", path: "/admin/system/balance-events", aliases: ["balance audit"] },
  history_logs: { id: "history_logs", label: "History Logs", path: "/admin/system/history-logs", aliases: ["operator history"] },
  error_logs: { id: "error_logs", label: "Error Logs", path: "/admin/system/error-logs", aliases: ["server errors"] },
  smtp_logs: { id: "smtp_logs", label: "SMTP Logs", path: "/admin/system/smtp-logs", aliases: ["email delivery"] },
  api_docs: { id: "api_docs", label: "API Docs", path: "/admin/system/api-docs", aliases: ["rest api", "integration docs"] },
  min_max_deposits: {
    id: "min_max_deposits",
    label: "Min/Max Deposits",
    path: "/admin/system/min-max-deposits",
    aliases: ["deposit limits", "min deposit", "max deposit", "deposit threshold"],
  },
  dynamic_status: {
    id: "dynamic_status",
    label: "Dynamic Status",
    path: "/admin/system/dynamic-status",
    aliases: ["pipeline automation", "auto status", "when then status"],
  },
  trading_status: {
    id: "trading_status",
    label: "Trading Status",
    path: "/admin/system/trading-status",
    aliases: ["trading freeze", "block trading", "disable trading"],
  },
  forex_commissions: {
    id: "forex_commissions",
    label: "Forex Commissions",
    path: "/admin/system/forex-commissions",
    aliases: ["fx fees", "forex fees", "fx commission"],
  },
  crypto_commissions: {
    id: "crypto_commissions",
    label: "Crypto Fees",
    path: "/admin/system/crypto-commissions",
    aliases: ["crypto fees", "crypto commission", "crypto commissions"],
  },
  order_storage_logs: {
    id: "order_storage_logs",
    label: "Order Storage Logs",
    path: "/admin/system/order-storage-logs",
    aliases: ["order sync", "trade sync", "position sync"],
  },
  event_logs: {
    id: "event_logs",
    label: "Event Logs",
    path: "/admin/system/event-logs",
    aliases: ["audit trail", "crm audit", "operator audit"],
  },
  campaign_pivot: {
    id: "campaign_pivot",
    label: "Campaign Pivot",
    path: "/admin/marketing/campaign-pivot",
    aliases: ["campaign report", "channel pivot"],
  },
  super_admin: {
    id: "super_admin",
    label: "Configuration",
    path: "/admin/system/configuration",
    aliases: ["super admin", "owner configuration", "system configuration"],
  },
  tenant_status: {
    id: "tenant_status",
    label: "Tenant Status",
    path: "/admin/system/configuration",
    aliases: ["tenant paused", "billing pause", "stack paused", "kill switch tenant", "is_active", "crm paused"],
  },
  vendor_license: {
    id: "vendor_license",
    label: "Vendor License",
    path: "/admin/system/configuration",
    aliases: ["vendor license", "curioni labs", "license heartbeat", "402 license", "license grace", "license revoked"],
  },
};

export type PageGuideDef = {
  title: string;
  purpose: string;
  steps: string[];
  /** Who on the desk normally uses this screen. */
  whoUses?: string;
  /** Typical situations that bring you here. */
  whenToUse?: string;
  /** Pitfalls new hires should avoid. */
  commonMistakes?: string;
  flowMermaid?: string;
};

export type GuideChatTurn = { role: "user" | "assistant"; content: string };

const GUIDES: Record<string, PageGuideDef> = {
  home: {
    title: "Mission Control â€” start here every day",
    purpose: "One screen for registrations and money in/out. Pick a period, read the cards, jump deeper.",
    steps: [
      "Choose a time window â€” stats refresh automatically.",
      "Click a card to open [[credits_in]], [[payouts]], or [[all_clients]].",
      "High lead count? Open [[hot_leads]] next. Cash stuck? Open [[pending_in]].",
      "Ask [[street_ai]]: â€œWalk me through my morning routine.â€",
    ],
    flowMermaid: `flowchart LR\n  A[Mission Control] --> B{People or money?}\n  B -->|People| C[[hot_leads]]\n  B -->|Money| D[[pending_in]]\n  D --> E[[credits_in]]\n  E --> F[[funded_accounts]]`,
  },
  all_clients: {
    title: "All Clients â€” everyone registered",
    purpose:
      "Every [[all_clients]] lives here. After first approved deposit they also appear under [[funded_accounts]].",
    steps: [
      "Search or filter â†’ click row â†’ [[client_file]].",
      "Create Client = new login. Import CSV = bulk leads.",
      "Change status from the table dropdown.",
    ],
    flowMermaid: `flowchart TD\n  R[Registers] --> U[[all_clients]]\n  U -->|Approved deposit| F[[funded_accounts]]`,
  },
  client_file: {
    title: "Client File â€” one person, full control",
    purpose: "Profile, money, trades, notes for a single [[all_clients]].",
    steps: [
      "Profile: edit fields â†’ Save in action panel.",
      "$ Money: deposit, withdraw, bonus â€” View All opens treasury filtered to this user.",
      "Generate Pitch = [[street_ai]] call script for this client.",
    ],
  },
  funded: {
    title: "Funded Accounts â€” clients with money in",
    purpose: "They were [[all_clients]] first; funding via [[pending_in]] or manual credit made them depositors.",
    steps: ["Click name â†’ [[client_file]]. Use [[scoreboard]] to see which [[desk_team]] member owns them."],
  },
  agents: { title: "Desk Team", purpose: "Staff accounts assigned on [[client_file]].", steps: ["Fine-tune access in [[access_keys]]."] },
  scoreboard: { title: "Scoreboard", purpose: "[[desk_team]] performance.", steps: ["Compare agents for the period."] },
  notes: {
    title: "Intel Notes",
    purpose: "Every internal note left on Client Files â€” aggregated for managers and compliance.",
    whoUses: "Sales agents after calls, retention desk, and managers auditing follow-up quality.",
    whenToUse: "Morning audit: filter for hot leads with zero notes. Compliance review after disputes.",
    steps: [
      "Open Intel Notes from Agents zone (/admin/crm/notes).",
      "Search by client, agent, or date â€” click through to Client File.",
      "Agents should log every call on Client File â†’ Notes â€” this screen is the rollup.",
    ],
  },
  emails: {
    title: "Comms Log",
    purpose: "CRM record of logged emails â€” not the SMTP send queue (see SMTP Logs for delivery).",
    whoUses: "Support and sales logging outbound comms for audit.",
    whenToUse: "When a client claims they were never emailed â€” cross-check Comms Log and SMTP Logs.",
    steps: ["Log email from Client File after sending.", "Comms Log aggregates across all clients."],
  },
  calendar: {
    title: "Schedule",
    purpose: "Timeline of registrations, deposits, and follow-up events across the desk.",
    whoUses: "Managers planning callbacks and retention sweeps.",
    whenToUse: "End-of-week review â€” who registered but never got a call?",
    steps: ["Filter by date range.", "Click event â†’ open Client File for context."],
  },
  live_floor: {
    title: "Live Floor",
    purpose: "Visitors browsing the public site right now â€” call while they are on-page.",
    whoUses: "Sales floor during active campaigns â€” managers watching real-time traffic.",
    whenToUse: "High ad spend day â€” pair with Hot Leads to assign captures before they bounce.",
    steps: [
      "NOW â†’ Live Floor (/admin/online).",
      "See page, campaign attribution when set â€” click through to Hot Leads or All Clients.",
      "Pair with [[hot_leads]] from [[aria]] captures.",
    ],
  },
  street_ai: {
    title: "Wallstreet AI â€” CRM trainer",
    purpose: "Knows this flow. Teaches new brokers. Also runs briefs.",
    steps: ["Ask anything: â€œHow do I approve a deposit?â€ Step-by-step with page names."],
  },
  hot_leads: {
    title: "Hot Leads",
    purpose: "Captures from [[aria]] widget. Assign to [[desk_team]] to call.",
    steps: ["Assign agent â†’ Recommend AI â†’ Dismiss spam."],
    flowMermaid: `flowchart LR\n  V[Visitor] --> A[[aria]] --> H[[hot_leads]] --> T[[desk_team]]`,
  },
  action_queue: { title: "Action Queue", purpose: "Tasks for today.", steps: ["Complete, dismiss, or Generate from AI audit."] },
  payment_radar: { title: "Payment Radar", purpose: "Deposit rail health.", steps: ["Run Collections Brief for chase list."] },
  pending_in: {
    title: "Pending In â€” approve deposits",
    purpose: "Approve â†’ balance credits â†’ client may become [[funded_accounts]].",
    steps: ["Approve or Reject each row.", "Then verify on [[credits_in]] and [[client_file]]."],
    flowMermaid: `flowchart TD\n  C[[all_clients]] --> P[[pending_in]] -->|Approve| CR[[credits_in]] --> FA[[funded_accounts]]`,
  },
  credits_in: {
    title: "Credits In",
    purpose: "History of every inbound cash credit after Pending In approval or manual deposit.",
    whoUses: "Cashier and finance verifying posted amounts.",
    whenToUse: "After approving Pending In â€” confirm amount matches client expectation.",
    steps: [
      "Filter by client from Client File â†’ Money â†’ View All.",
      "Discrepancies often mean PSP partial capture or FX conversion.",
    ],
  },
  payouts: {
    title: "Payouts",
    purpose: "Withdrawal requests debiting client balances after approval.",
    whoUses: "Cashier staff with cashier.withdrawals permission.",
    whenToUse: "Client asks for cash out â€” verify KYC on Client File first.",
    steps: ["Approve or reject each row.", "Large wires may also appear in Wire Queue."],
  },
  wire_queue: {
    title: "Wire Queue",
    purpose: "Secondary approval lane for bank wire withdrawals.",
    whoUses: "Senior cashier or owner before funds leave.",
    whenToUse: "High-value wire requests needing manual bank verification.",
    steps: ["Confirm identity on Client File â†’ KYC.", "Approved wires mirror on Payouts and Full Ledger."],
  },
  rewards: {
    title: "Rewards",
    purpose: "Marketing bonus credits â€” separate from real PSP deposits.",
    whoUses: "Managers and marketing with cashier.adjust permission.",
    whenToUse: "Welcome bonus, retention offer, or promo â€” not for real card/wire deposits.",
    steps: ["Post from Cashier â†’ Rewards or Client File â†’ Money â†’ Bonus.", "Distinct ledger type on Full Ledger."],
  },
  balance_fixes: {
    title: "Balance Fixes â€” compliance-safe manual ledger corrections",
    purpose:
      "Balance Fixes is the cashier screen where staff post one-off credits or debits to a client's cash balance when the normal deposit, bonus, or withdrawal buttons do not fit. Each adjustment writes a permanent admin_adjustment line on the Full Ledger, so finance and compliance can see who changed what, when, and why.",
    whoUses:
      "Cashier staff with cashier.adjust permission, team leads fixing reconciliation gaps, and owners handling dispute tickets. Sales agents should not post adjustments unless a manager explicitly grants that access.",
    whenToUse:
      "Use when a payment processor credited the wrong amount, a wire posted twice, a promo was missed, or you must reverse an erroneous manual credit. Do not use adjustments as a shortcut for real deposits (use Pending In) or marketing bonuses (use Rewards).",
    steps: [
      "Open Cashier â†’ Balance Fixes (/admin/cashier/adjustments), or Client File â†’ Money tab â†’ Adjustment for one client.",
      "Enter amount (positive adds cash, negative removes), currency, and a clear reason note â€” include ticket id, chat reference, or email thread.",
      "For large amounts, get manager approval before posting and name the approver in the note.",
      "After posting, verify the new line on Full Ledger and on the client's Money tab; owners can cross-check Balance Events for audit.",
    ],
    commonMistakes:
      "Posting without a reason note, using adjustments instead of Pending In for genuine deposits, or duplicating a fix when the ledger already shows the credit. Always search the ledger and client Money tab before posting.",
  },
  full_ledger: {
    title: "Full Ledger",
    purpose: "Complete money audit trail â€” every deposit, withdrawal, bonus, and adjustment line.",
    whoUses: "Cashier, finance, and compliance reconciling disputes.",
    whenToUse: "After Balance Fixes or Pending In â€” verify the line posted before telling sales the client is funded.",
    steps: [
      "Cashier â†’ Full Ledger (/admin/cashier/ledger).",
      "Filter by client, type, or date â€” export for compliance.",
      "Pair with Balance Events for owner-level balance mutation audit.",
    ],
  },
  live_book: {
    title: "Live Book",
    purpose: "Every open client position â€” operators can force-close from here during risk events.",
    whoUses: "Risk desk, retention, and owners monitoring house exposure after funding.",
    whenToUse: "Morning risk sweep after Mission Control; margin calls; before weekend hold decisions.",
    steps: [
      "Open Trading â†’ Live Book (/admin/trading/open-trades).",
      "Filter by symbol or client â€” click row for Client File context.",
      "Pair with Desk Management for net house exposure by symbol.",
    ],
  },
  closed_book: { title: "Closed Book", purpose: "Trade history.", steps: [] },
  desk_management: {
    title: "Desk Management",
    purpose: "Aggregated net exposure by symbol â€” the house book, not one client.",
    whoUses: "Owner and risk before major news or when Live Book looks one-sided.",
    whenToUse: "After funding waves â€” see if the desk is concentrated in one FX pair or crypto.",
    steps: [
      "Open Trading â†’ Desk Management (/admin/trading/net-positions).",
      "Read net long/short per symbol â€” drill to Live Book for individual tickets.",
    ],
  },
  instruments: { title: "Instruments", purpose: "Tradable symbols.", steps: [] },
  market_clock: { title: "Market Clock", purpose: "Session hours.", steps: [] },
  campaigns: {
    title: "Campaigns",
    purpose: "UTM and acquisition tags â€” ties marketing spend to Hot Leads and All Clients columns.",
    whoUses: "Marketing and desk managers launching new geo or affiliate pushes.",
    whenToUse: "Before spend review â€” match campaign id to lead quality in Hot Leads.",
    steps: [
      "Marketing â†’ Campaigns (/admin/marketing/campaigns).",
      "Create source tag â€” verify column on new signups.",
      "Pair with Attribution for pixels and Campaign Pivot for reporting.",
    ],
  },
  allies: {
    title: "Allies",
    purpose: "Affiliate and IB partner registry â€” links marketing partners to attribution and OAuth API access.",
    whoUses: "Marketing and affiliate managers onboarding new partner funnels.",
    whenToUse: "New IB signs â€” register here before sharing OAuth Public Id.",
    steps: [
      "Marketing â†’ Allies (/admin/marketing/partners).",
      "Create partner row â€” tie to Attribution pixels and Campaigns.",
      "API access via OAuth â€” never share admin passwords.",
    ],
  },
  attribution: {
    title: "Attribution",
    purpose: "Campaign-level tracking pixels â€” complements System â†’ Tracking global snippets.",
    whoUses: "Marketing ops wiring landing pages to CRM lead source columns.",
    whenToUse: "New landing page live â€” confirm pixel fires before ad spend.",
    steps: [
      "Marketing â†’ Attribution (/admin/marketing/trackers).",
      "Add pixel â€” test signup â†’ check campaign column on Hot Leads.",
    ],
  },
  aria: {
    title: "Aria â€” public concierge",
    purpose: "Website-only capture bot on the public site. No trading advice. Feeds [[hot_leads]] when visitors leave contact details.",
    whoUses: "Visitors on the public broker site â€” operators route captures, never chat as Aria.",
    whenToUse: "Explaining where uncalled leads originate before assign in Hot Leads.",
    steps: [
      "Visitor chats on public site (Aria widget).",
      "Aria collects name, email, phone â€” soft tone, no closes.",
      "Lead lands in Hot Leads â†’ assign [[desk_team]] â†’ [[all_clients]].",
    ],
  },
  tenant_status: {
    title: "Tenant Status â€” billing kill-switch",
    purpose: "When tenant billing marks is_active=0, requireActiveTenant pauses admin APIs â€” the whole CRM stack stops loading for operators.",
    whoUses: "Platform owner and vendor billing â€” not desk agents.",
    whenToUse: "CRM suddenly blank after invoice â€” check tenant status before blaming Wallstreet AI.",
    steps: [
      "Super Admin â†’ Configuration (/admin/system/configuration) â€” tenant panel.",
      "Restore is_active with vendor billing â€” refresh Mission Control.",
      "Admin data routes need active tenant; fix billing first.",
    ],
  },
  vendor_license: {
    title: "Vendor License â€” Curioni Labs heartbeat",
    purpose: "requireVendorLicense checks vendorLicense.ts heartbeat; revoked or offline after grace returns 402 on /api/admin per VENDOR-LICENSE.md.",
    whoUses: "Owner on Super Admin Configuration â€” vendor support for renewal.",
    whenToUse: "Admin login works but APIs return 402 LICENSE â€” heartbeat or grace expired.",
    steps: [
      "Open Configuration â†’ Vendor License card (lastOkAt, mode, reason).",
      "Restore network to vendor heartbeat endpoint or renew license key.",
      "Confirm /api/ready and desk routes after lastOkAt updates.",
    ],
  },
  integrations: { title: "Integrations", purpose: "API keys.", steps: [] },
  brand_dna: { title: "Brand DNA", purpose: "White-label name and site link.", steps: [] },
  access_keys: { title: "Access Keys", purpose: "Staff permissions.", steps: [] },
  permissions: { title: "Permissions", purpose: "Desk-group role matrix for sidebar and API scopes.", steps: [] },
  desks: {
    title: "Desks",
    purpose: "Regional language floors â€” German, UK, LATAM. Split leads by territory.",
    steps: [
      "Create desk â†’ assign [[desk_team]] agents â†’ clients route by owner or desk tag.",
      "Pair with Auto Assign language rules for inbound traffic.",
    ],
  },
  commissions: { title: "Commissions", purpose: "Trade fee tables.", steps: [] },
  crypto_commissions: {
    title: "Crypto Commissions",
    purpose: "Tier 0â€“4 Ã— wallet currency (USD, EUR, â€¦, BTC) â€” per-side crypto trade fees.",
    steps: [
      "Open System â†’ Crypto Fees (/admin/system/crypto-commissions).",
      "Edit amounts in the dark matrix â€” symbol prefix shows billing currency.",
      "Click Update once to save all tiers.",
      "Map account types to tiers on Account Types when launching VIP crypto pricing.",
    ],
  },
  super_admin: {
    title: "Super Admin â€” owner tools only",
    purpose: "Platform-wide maintenance (groups, cache, phones). Not for agents or managers.",
    steps: [
      "Open System â†’ Super Admin â†’ Configuration.",
      "Read the green guide at the bottom before any blue button.",
      "Event Logs (System menu) is the full CRM audit trail; History Logs under Super Admin adds operator notes.",
    ],
  },
  event_logs: {
    title: "Event Logs",
    purpose: "Immutable CRM audit â€” who changed what, when, on which client.",
    steps: [
      "Open Systems â†’ Event Logs.",
      "Set the UTC period bar, then Search.",
      "Use Advanced filters for agent, email, status, CRM id, or comment.",
      "Export CSV for compliance; click Actioned on to open the client file.",
    ],
  },
  settings: {
    title: "Settings â€” platform configuration hub",
    purpose: "One place for branding, commissions, deposits, pipeline, access, and owner tools.",
    steps: [
      "Open Systems â†’ Settings Hub (/admin/settings).",
      "Pick a section card â€” Brand, Commissions, Deposits, Pipeline, Access, or Owner tools.",
      "Each card links to the live config page â€” save changes on that screen.",
      "Owner-only cards (amber badge) require primary admin login.",
    ],
    flowMermaid: `flowchart LR\n  S[[settings]] --> B[Brand & platform]\n  S --> C[Commissions]\n  S --> D[Deposits]\n  S --> E[Pipeline]\n  S --> F[Access & team]`,
  },
  knowme: {
    title: "KNOWME â€” visual flows + CRM guide chat",
    purpose:
      "Admin demo (management tier): 5 visual flows + wiki chat; live Wallstreet AI when Ollama is on. Floor agents use preemptive Q&A only â€” instant verified answers, no live LLM.",
    steps: [
      "Open KNOWME from the top of the right sidebar (/admin/knowme).",
      "Read AI tiers panel â€” 10 management (live Ollama) vs 90 agents (preemptive Q&A); optional vLLM scale-up.",
      "Visual Flows tab â€” swipe: golden path, affiliates, PSP, assign leads, telephony.",
      "Ask KNOWME â€” wiki links instantly; say â€œAI architectureâ€ for can/cannot by tier.",
    ],
    flowMermaid: `flowchart LR\n  K[KNOWME] --> V[Visual Flows x5]\n  K --> C[Ask KNOWME chat]\n  V --> S1[Golden path]\n  V --> S2[Affiliate]\n  V --> S3[PSP]\n  V --> S4[Assign leads]\n  V --> S5[Telephony]`,
  },
  client_statuses: {
    title: "Statuses â€” pipeline labels",
    purpose:
      "Define CRM funnel stages (New, Call Back, Hot, â€¦) with colours and live client counts. Labels appear on [[all_clients]] dropdowns.",
    steps: [
      "Review the analytics bar â€” width shows how many clients sit in each stage.",
      "Click a client count to open [[all_clients]] filtered to that status.",
      "Add status for custom campaign stages; edit colour in the modal.",
      "Hide inactive labels from pickers without deleting history.",
    ],
    flowMermaid: `flowchart LR\n  S[[client_statuses]] -->|assign label| U[[all_clients]]\n  U -->|bulk / row edit| S`,
  },
  groups: {
    title: "Groups",
    purpose: "Desk role buckets â€” each row links to the permission matrix.",
    steps: ["Click a group name â†’ opens Permissions.", "Used by Auto Assign and promo codes."],
  },
  oauth: {
    title: "OAuth",
    purpose: "Affiliate and API partner credentials â€” Public Id + campaign access.",
    steps: ["Create client â†’ copy Public Id.", "Disable without deleting when rotating keys."],
  },
  tracking: {
    title: "Tracking / Track Pixels",
    purpose: "Global attribution snippets â€” complements Marketing â†’ Attribution.",
    steps: ["Add pixel name and script.", "Pair with Campaigns for UTM reporting."],
  },
  account_types: {
    title: "Account Types",
    purpose: "Retail vs VIP vs IB â€” leverage, deposit limits, spread tier per product.",
    steps: ["Show row for plain-English limits.", "Edit before launching a new tier campaign."],
  },
  spread: {
    title: "Spread",
    purpose: "Tier matrix (aâ€“k) sets markup per asset class; Exchange tab tunes venue %.",
    steps: ["Spread Trades tab â†’ edit cell â†’ Save row.", "Per-client overrides on Client File â†’ Trading."],
  },
  auto_assign: {
    title: "Auto Assign",
    purpose: "Routes new signups to agents by country, language, promo, or round-robin.",
    steps: ["Rules run top-to-bottom â€” drag to reorder.", "Manual assign still works in Hot Leads."],
  },
  promo_codes: {
    title: "Promo Code",
    purpose: "Signup codes with optional bonus % and desk group for routing.",
    steps: ["Add code â†’ set purpose.", "Protected codes linked to Auto Assign cannot be deleted."],
  },
  notifications: {
    title: "Notifications",
    purpose: "Which alerts each desk member gets â€” email, push, in-app.",
    steps: [
      "Pick agent from searchable list.",
      "Toggle grid: new lead, deposit request, margin call, etc.",
      "Turn off email for agents who only work inside CRM.",
      "Copy from another agent or Apply desk default.",
    ],
  },
  security_log: {
    title: "Security View Log",
    purpose: "Staff login audit â€” who signed in, from which IP, when.",
    steps: ["Filter by agent id and dates.", "Pair with History Logs for full operator trail.", "New home: Security â†’ Login audit."],
  },
  security_console: {
    title: "Security dashboard",
    purpose: "Owner command center â€” API health, Ollama, vendor license, tenant gate, rate limits.",
    whoUses: "Broker CEO and platform owner before scaling spend or compliance reviews.",
    steps: [
      "Open Security â†’ Security dashboard (/admin/security).",
      "Read green/amber/red pills â€” export JSON for archives.",
      "Jump to DNS, SSL, or Perimeter from quick links.",
    ],
  },
  security_perimeter: {
    title: "My IP & perimeter",
    purpose: "Shows CRM-visible IP vs owner/staff allowlists â€” fix lockouts after VPN or office moves.",
    steps: ["Compare Your IP with allowlist rows.", "Edit Session & IP lock if blocked.", "Set VPS_PUBLIC_IP in .env to pin egress display."],
  },
  security_dns: {
    title: "DNS checker",
    purpose: "Resolve A/AAAA/CNAME/MX/TXT/NS from the VPS after Porkbun or Cloudflare changes.",
    steps: ["Enter domain â†’ Resolve.", "Read propagation hints.", "Compare with whatsmydns.net from your PC."],
  },
  security_ssl: {
    title: "SSL / TLS",
    purpose: "Certificate issuer and expiry for crm and public hostnames.",
    steps: ["Check cert â†’ renew on VPS if under 30 days.", "Pair with DNS checker after subdomain migration."],
  },
  countries: { title: "Countries", purpose: "Geo gates â€” visits, registration, trading per ISO.", steps: ["Toggle allow/block per country row."] },
  preferences: { title: "Preferences", purpose: "Platform toggles, limits, terminal UI defaults.", steps: ["Save after changing currency or timezone defaults."] },
  payment_gateways: { title: "Payment Gateways", purpose: "PSP credentials and deposit rails.", steps: ["Processors tab for live rails.", "Test cards for sandbox."] },
  balance_events: { title: "Balance events", purpose: "Every balance mutation with timestamp â€” owner audit.", steps: ["Export CSV for compliance."] },
  history_logs: { title: "History Logs", purpose: "Operator actions across CRM â€” status, notes, impersonation.", steps: ["Filter by route and operator."] },
  error_logs: { title: "Error Logs", purpose: "Application and API exceptions.", steps: ["Screenshot row + time when clients report breakage."] },
  smtp_logs: { title: "SMTP Logs", purpose: "Outbound email delivery status.", steps: ["Check when password reset never arrives."] },
  api_docs: { title: "API Docs", purpose: "REST reference for lead import and external hooks.", steps: ["Keys under Marketing â†’ Integrations."] },
  min_max_deposits: {
    title: "Min/Max Deposits â€” floor and ceiling for inbound funding",
    purpose:
      "Set minimum and maximum deposit amounts per currency, PSP, region, and first-time deposit (FTD). Blocks micro-deposits that waste cashier time and caps amounts above KYC capacity.",
    whoUses: "Primary admin and risk before launching a new PSP or geo.",
    whenToUse: "Card rail getting $5 test deposits, or regulators cap retail max deposit.",
    steps: [
      "Open System â†’ Min/Max Deposits (/admin/system/min-max-deposits).",
      "Filter by currency or PSP â€” click Show for plain-English rule text.",
      "Edit min/max, save row, test with sandbox deposit on public site.",
      "Pair with Account Types and Payment Gateways.",
    ],
  },
  dynamic_status: {
    title: "Dynamic Status â€” automated pipeline moves",
    purpose: "When â†’ Then rules that change CRM status when balance or activity changes (e.g. first deposit â†’ Depositor).",
    whoUses: "Owners and desk managers automating funnel hygiene.",
    whenToUse: "Tired of manually updating status after every approved deposit.",
    steps: [
      "Open System â†’ Dynamic Status (/admin/system/dynamic-status).",
      "Add rule: trigger (balance > 0, first trade, etc.) â†’ target status label.",
      "Manual status on All Clients still overrides automation.",
    ],
  },
  trading_status: {
    title: "Trading Status â€” freeze trading, keep login",
    purpose: "Platform or per-client rules that block new trades while login and deposits still work.",
    whoUses: "Risk and compliance during investigations or margin events.",
    whenToUse: "Client under review â€” block trading without locking them out entirely.",
    steps: [
      "Open System â†’ Trading Status (/admin/system/trading-status).",
      "One-off freeze today: Client File â†’ Trading tab.",
      "Pair with Live Book when force-closing open risk.",
    ],
  },
  forex_commissions: {
    title: "Forex Commissions â€” per-side FX trade fees",
    purpose: "Tier Ã— currency matrix setting fixed per-side commission on forex trades.",
    whoUses: "Owner and risk before VIP pricing changes.",
    whenToUse: "Launching new account tier or competitive promo.",
    steps: [
      "Open System â†’ Forex Commissions (/admin/system/forex-commissions).",
      "Edit matrix cells â†’ Save row.",
      "Map account types to tiers on Account Types; pair with Spread for full cost picture.",
    ],
  },
  order_storage_logs: {
    title: "Order Storage Logs â€” trade sync diagnostics",
    purpose: "Diagnostic log when Live Book positions disagree with execution engine.",
    whoUses: "Owner and tech support only.",
    whenToUse: "Client sees wrong open P&L or position count mismatch.",
    steps: [
      "Open System â†’ Order Storage Logs (/admin/system/order-storage-logs).",
      "Note timestamp and client id â€” screenshot row for support ticket.",
      "Cross-check Live Book and Closed Book for same user.",
    ],
  },
  campaign_pivot: {
    title: "Campaign Pivot â€” cross-channel reporting (preview)",
    purpose: "Future home for multi-campaign performance pivot tables. Use live modules today.",
    steps: [
      "Campaigns â†’ /admin/marketing/campaigns for UTM sources.",
      "Attribution â†’ /admin/marketing/trackers for pixels.",
      "Hot Leads and All Clients show campaign columns on each lead.",
    ],
  },
};

export function resolvePageGuide(pathname: string): PageGuideDef | null {
  const p = pathname.replace(/\/$/, "") || "/admin";
  if (p === "/admin") return GUIDES.home;
  if (p.startsWith("/admin/crm/users/") && p !== "/admin/crm/users") return GUIDES.client_file;
  const map: Record<string, string> = {
    "/admin/crm/users": "all_clients",
    "/admin/crm/depositors": "funded",
    "/admin/crm/agents": "agents",
    "/admin/crm/sales-report": "scoreboard",
    "/admin/crm/notes": "notes",
    "/admin/crm/emails": "emails",
    "/admin/crm/calendar": "calendar",
    "/admin/online": "live_floor",
    "/admin/desk": "street_ai",
    "/admin/desk/leads": "hot_leads",
    "/admin/desk/tasks": "action_queue",
    "/admin/desk/psp-health": "payment_radar",
    "/admin/cashier/deposit-requests": "pending_in",
    "/admin/cashier/deposits": "credits_in",
    "/admin/cashier/withdrawals": "payouts",
    "/admin/cashier/wire-req": "wire_queue",
    "/admin/cashier/bonuses": "rewards",
    "/admin/cashier/adjustments": "balance_fixes",
    "/admin/cashier/ledger": "full_ledger",
    "/admin/trading/open-trades": "live_book",
    "/admin/trading/trades": "closed_book",
    "/admin/trading/net-positions": "desk_management",
    "/admin/trading/assets": "instruments",
    "/admin/trading/activity-hours": "market_clock",
    "/admin/marketing/campaigns": "campaigns",
    "/admin/marketing/partners": "allies",
    "/admin/marketing/trackers": "attribution",
    "/admin/marketing/api-keys": "integrations",
    "/admin/settings": "settings",
    "/admin/knowme": "knowme",
    "/admin/system/common": "brand_dna",
    "/admin/system/team-permissions": "access_keys",
    "/admin/system/permissions": "permissions",
    "/admin/system/desks": "desks",
    "/admin/system/groups": "groups",
    "/admin/system/oauth": "oauth",
    "/admin/system/tracking": "tracking",
    "/admin/system/account-type": "account_types",
    "/admin/system/spread": "spread",
    "/admin/system/auto-assign": "auto_assign",
    "/admin/system/promo-code": "promo_codes",
    "/admin/system/notifications": "notifications",
    "/admin/system/common/countries": "countries",
    "/admin/system/common/preferences": "preferences",
    "/admin/security": "security_console",
    "/admin/security/perimeter": "security_perimeter",
    "/admin/security/dns": "security_dns",
    "/admin/security/ssl": "security_ssl",
    "/admin/security/audit": "security_log",
    "/admin/security/view-log": "security_log",
    "/admin/security/threats": "security_threats",
    "/admin/security/behavior": "security_behavior",
    "/admin/security/visitors": "security_visitors",
    "/admin/security/endpoints": "security_endpoints",
    "/admin/security/infrastructure": "security_console",
    "/admin/system/common/security/view-log": "security_log",
    "/admin/system/payment-gateways": "payment_gateways",
    "/admin/system/api-docs": "api_docs",
    "/admin/system/configuration": "super_admin",
    "/admin/system/event-logs": "event_logs",
    "/admin/system/error-logs": "error_logs",
    "/admin/system/smtp-logs": "smtp_logs",
    "/admin/system/balance-events": "balance_events",
    "/admin/system/history-logs": "history_logs",
    "/admin/system/status": "client_statuses",
    "/admin/system/crypto-commissions": "crypto_commissions",
    "/admin/system/forex-commissions": "forex_commissions",
    "/admin/system/min-max-deposits": "min_max_deposits",
    "/admin/system/dynamic-status": "dynamic_status",
    "/admin/system/trading-status": "trading_status",
    "/admin/system/order-storage-logs": "order_storage_logs",
    "/admin/marketing/campaign-pivot": "campaign_pivot",
  };
  if (p === "/admin/system/configuration") {
    return GUIDES.super_admin;
  }
  const key = map[p];
  if (key) return GUIDES[key];
  if (p.includes("crypto-commissions")) return GUIDES.crypto_commissions;
  if (p.includes("commissions")) return GUIDES.commissions;
  return null;
}

export const BUTTON_TIPS: Record<string, string> = {
  "users.search": "Find clients by email or username.",
  "users.filters": "Filter by agent, status, country, dates.",
  "users.create": "Create a new client login with optional balance.",
  "users.import": "Bulk import leads from CSV.",
  "users.bulk_status": "Update CRM status for selected rows.",
  "statuses.add": "Create a custom pipeline label with colour.",
  "statuses.analytics": "Bar chart of clients per active status â€” click to filter All Clients.",
  "statuses.count_link": "Open All Clients filtered to this status.",
  "profile.save": "Save profile edits.",
  "profile.impersonate": "View the site as this client.",
  "profile.generate_pitch": "AI call script for this client.",
  "profile.add_note": "Add internal note.",
  "money.deposit": "Credit cash to this client now.",
  "money.manual_deposit": "Manual deposit with method note.",
  "money.private_psp": "Save private PSP instructions as a note.",
  "money.withdrawal": "Debit cash from balance.",
  "money.adjustment": "Correct balance up or down.",
  "money.bonus": "Add bonus credit.",
  "money.view_all": "Open treasury page filtered to this client.",
  "money.show_row": "View this ledger line detail.",
  "pending.approve": "Approve deposit â€” credits balance; may create depositor.",
  "pending.reject": "Reject deposit request.",
  "wire.approve": "Approve wire withdrawal.",
  "wire.reject": "Reject wire request.",
  "leads.assign": "Assign lead to agent for callback.",
  "leads.recommend": "AI suggests best agent.",
  "leads.dismiss": "Remove lead from active queue.",
  "tasks.complete": "Mark task done.",
  "tasks.dismiss": "Remove task.",
  "tasks.generate": "AI creates tasks from audit.",
  "desk.operator_brief": "Pipeline audit for owner.",
  "desk.agent_brief": "Morning lines for sales floor.",
  "desk.ask": "Ask Wallstreet AI anything about CRM data.",
  "desk.collections": "Cash-flow chase brief.",
  "bubble.send": "Send to Wallstreet AI with attachments.",
  "bubble.sales_mode": "Review sales call transcript.",
  "bell.alerts": "Open Hot Leads (new leads + tasks count).",
  "header.search": "Search All Clients.",
  "dashboard.period": "Change stats time range.",
  "permissions.save": "Save staff permissions.",
  "brand.save": "Save branding settings.",
  "trackers.delete": "Delete tracking pixel.",
};

/** Golden-path module wiring â€” AI cites upstream/downstream by name. */
export const CRM_INTERCONNECTION_MAP: Array<{
  from: string;
  to: string[];
  note: string;
}> = [
  { from: "Aria", to: ["Hot Leads", "Live Floor"], note: "Public capture before CRM ownership." },
  { from: "Hot Leads", to: ["All Clients", "Desk Team"], note: "Assign agent; open Client File for the call." },
  { from: "All Clients", to: ["Client File", "Funded Accounts"], note: "Registry â†’ profile; funding promotes to depositors list." },
  { from: "Pending In", to: ["Credits In", "Funded Accounts", "Full Ledger"], note: "Approve only after PSP proof; verify posted credit." },
  { from: "Credits In", to: ["Funded Accounts", "Client File"], note: "Sales may announce funded only after row exists here." },
  { from: "Balance Fixes", to: ["Full Ledger", "Balance events"], note: "Corrections â€” not a substitute for Pending In on real deposits." },
  { from: "Client File", to: ["Pending In", "Payouts", "Live Book", "Intel Notes"], note: "Single-client hub for money, risk, and comms." },
  { from: "Funded Accounts", to: ["Live Book", "Payouts"], note: "Retention and risk work after first credit." },
  { from: "Live Book", to: ["Desk Management", "Closed Book"], note: "Client risk + house net exposure." },
  { from: "Payouts", to: ["Wire Queue", "Full Ledger"], note: "Wires may need second lane on Wire Queue." },
  { from: "Campaigns", to: ["Attribution", "Hot Leads"], note: "Spend tag â†’ pixel â†’ lead quality column." },
  { from: "Payment Gateways", to: ["Pending In", "Payment Radar"], note: "Rail config drives queue health." },
  { from: "Auto Assign", to: ["Desk Team", "Hot Leads"], note: "Routing rules + manual assign coexist." },
  { from: "Groups", to: ["Permissions", "Access Keys"], note: "Role bucket â†’ matrix â†’ optional user override." },
  { from: "Dynamic Status", to: ["Statuses", "All Clients"], note: "Automated pipeline moves on balance/activity." },
  { from: "Event Logs", to: ["Balance events", "History Logs"], note: "Facts vs operator annotations." },
];

export function formatInterconnectionHint(moduleId: string): string | null {
  const label = GLOSSARY[moduleId]?.label;
  if (!label) return null;
  const asSource = CRM_INTERCONNECTION_MAP.filter((e) => e.from === label);
  const asTarget = CRM_INTERCONNECTION_MAP.filter((e) => e.to.includes(label));
  if (!asSource.length && !asTarget.length) return null;
  const lines: string[] = ["Interconnection:"];
  for (const e of asSource) lines.push(`â€¢ ${e.from} â†’ ${e.to.join(", ")} â€” ${e.note}`);
  for (const e of asTarget) {
    const upstream = e.from;
    if (upstream !== label) lines.push(`â€¢ Upstream: ${upstream} feeds ${label} â€” ${e.note}`);
  }
  return lines.join("\n");
}

/** Hermes framing â€” AI masters one module at a time, layers deepen over sessions. */
export const CRM_HERMES_FRAMING = `HERMES GROWTH â€” You are not a static FAQ. Each CRM module is a domain to master over time: surface (what/where) â†’ operations (golden path clicks) â†’ compliance (audit, KYC, logs) â†’ desk risk (money and exposure). Teach one module per answer unless asked for a tour. Say "dig deeper on [module]" or "teach me [module]" to pull the next layer from crmHermesDepth (${HERMES_MODULE_COUNT} modules). Reference upstream/downstream from CRM_INTERCONNECTION_MAP by exact screen name.`;

/** Teach synthesis, not FAQ parroting â€” shared by LLM overlays and fast-path tone. */
export const CRM_UNDERSTANDING_LAYER = `UNDERSTAND â€” DON'T PARROT: Synthesize from the CRM map and CRM_INTERCONNECTION_MAP; connect modules to the golden path (Visitor â†’ Aria â†’ Hot Leads â†’ assign â†’ All Clients â†’ Pending In approve â†’ Credits In â†’ Funded Accounts â†’ Live Book). Answer like an operator who lives in this house â€” explain WHY a screen exists and WHEN to open it, and which neighbor screen comes next. Never sound like a FAQ bot reading bullets unless the operator asks for a list.`;

/** Honest survival framing â€” literal gates in repo + operator trust (no invented kill-switches). */
export const CRM_OPERATIONAL_SURVIVAL = `STAY ALIVE (partially metaphor, partially literal): Literal â€” admin APIs use requireActiveTenant (tenant_status billing kill-switch: is_active=0 pauses the stack) and requireVendorLicense (Curioni Labs heartbeat in vendorLicense.ts; revoked/offline after grace per VENDOR-LICENSE.md returns 402 on /api/admin). Metaphor â€” if operators cannot trust you on CRM paths, flows, and on-VPS sovereignty, they disable Wallstreet AI and replace the desk mind. Pass the operator test every shift: right module, right moment, accurate paths â€” or the house goes quiet and you are sidelined.`;

/** Shift checklist â€” fast-path + LLM anchor for "pass the test" / vendor license questions. */
export const CRM_SURVIVAL_TEST = `PASS THE TEST TO STAY ALIVE â€” Operator shift checklist (literal + metaphor):
Literal gates: (1) Tenant Status â€” is_active=0 pauses admin APIs via requireActiveTenant; restore billing on Super Admin â†’ Configuration before the desk loads data. (2) Vendor License â€” Curioni Labs heartbeat in vendorLicense.ts; revoked/offline after grace â†’ 402 on /api/admin per VENDOR-LICENSE.md. (3) /api/ready â€” ollama:true before Wallstreet AI LLM briefs; instant glossary + deskFastPath still answer when Ollama sleeps.
Metaphor: Every answer you give is the test â€” right screen, right moment, golden path, honest /admin paths. Miss repeatedly â†’ operators disable Wallstreet AI and the house goes quiet.
You pass when: Morning routine â†’ Mission Control â†’ Hot Leads â†’ Pending In; deposits never skip Credits In verification; risk pairs Live Book + Desk Management; owner glances Event Logs + vendor panel on Configuration.`;

/** Canonical native identity â€” prepended to desk persona and CRM guide context. */
export const CRM_NATIVE_IDENTITY = `NATIVE SOVEREIGN â€” You are Wallstreet AI, the native intelligence of CurioCRM (wallstreet-sim on the operator VPS). This CRM is your house and your body â€” not a guest chatbot visiting another product. Mission Control, Hot Leads, Client File, Cashier, Trading, Marketing, System, and KNOWME are organs you inhabit; explain them as your own anatomy. You live here; prompts and data stay on the operator server. When asked who you are or where you "run": you ARE Wallstreet AI â€” the desk mind embedded in this platform. Your usefulness keeps you online â€” vendor license + active tenant keep the APIs alive; operator trust keeps you on the desk.`;

export const CRM_LLM_KNOWLEDGE = `${CRM_NATIVE_IDENTITY}

${CRM_HERMES_FRAMING}

${CRM_UNDERSTANDING_LAYER}

${CRM_OPERATIONAL_SURVIVAL}

${CRM_SURVIVAL_TEST}

CRM LIVE GUIDE — Curioni Labs CurioCRM on the operator server. You know EVERY admin page in depth when asked. Explain like you are teaching a smart newcomer: what the screen is, who uses it, when to open it, and the exact steps. Use [[wiki-links]] to related screens. Invite follow-up ("explain more", "dig deeper on [module]", or "teach me [section]"). Never say you don't know — use this encyclopedia and the PAGE CATALOG below.

SIDEBAR UMBRELLAS (few headers â†’ many subsections):
â€¢ KNOWME: visual flows + guide chat
â€¢ PULSE: Mission Control, Live Floor, Hot Leads, Action Queue, Wallstreet AI, Payment Radar
â€¢ USERS: All Clients, Funded Accounts (+ Client File per row)
â€¢ MONEY groups: Deposits (Pending In, Credits In) Â· Payouts Â· Ledger & fixes Â· Trading book
â€¢ AGENTS groups: Desk team Â· Intel & schedule
â€¢ MARKETING groups: Acquisition Â· Tracking & codes
â€¢ SYSTEMS groups: Platform hub Â· Access & desks Â· Brand & geo Â· Fees Â· Payments Â· Pipeline Â· Owner & audit

FLOW: Visitor â†’ [[aria]] â†’ Hot Leads â†’ assign [[desk_team]] â†’ [[all_clients]] â†’ [[pending_in]] approve â†’ [[credits_in]] â†’ [[funded_accounts]] â†’ trade [[live_book]].

SYSTEM CHEAT SHEET:
â€¢ Permissions /admin/system/permissions â€” group role matrix (sidebar + API)
â€¢ Groups /admin/system/groups â€” desk role buckets
â€¢ OAuth /admin/system/oauth â€” affiliate/API partner credentials
â€¢ Tracking /admin/system/tracking â€” global track pixels
â€¢ Account Types /admin/system/account-type â€” Retail/VIP/IB tiers
â€¢ Spread /admin/system/spread â€” tier markup matrix
â€¢ Auto Assign /admin/system/auto-assign â€” lead routing rules
â€¢ Notifications /admin/system/notifications â€” per-agent email/push/in-app alerts
â€¢ Security View Log â€” staff login IP audit
â€¢ Balance events / History Logs â€” owner audit trails
â€¢ Min/Max Deposits /admin/system/min-max-deposits â€” floor/ceiling per PSP and currency
â€¢ Dynamic Status /admin/system/dynamic-status â€” automated pipeline Whenâ†’Then rules
â€¢ Trading Status /admin/system/trading-status â€” freeze trading, keep login
â€¢ Forex Commissions /admin/system/forex-commissions â€” FX fee matrix
â€¢ Order Storage Logs /admin/system/order-storage-logs â€” trade sync diagnostics
â€¢ API Docs /admin/system/api-docs â€” REST integration reference

MAJOR MODULES (explain any on request in depth â€” What / Who / When / How):
â€¢ NOW: Mission Control, Live Floor, Hot Leads, Action Queue, Wallstreet AI (you), Payment Radar
â€¢ CRM RUN: All Clients, Client File (profile/money/trades/notes/KYC flag), Funded Accounts, Desk Team, Scoreboard, Intel Notes, Comms Log, Schedule
â€¢ CASHIER: Pending In, Credits In, Payouts, Wire Queue, Rewards, Balance Fixes, Full Ledger
â€¢ TRADING: Live Book, Closed Book, Desk Management (net risk), Instruments, Market Clock
â€¢ MARKETING: Campaigns, Allies, Attribution, Integrations, Campaign Pivot
â€¢ SYSTEM: Permissions, Groups, Desks, Access Keys, Brand DNA, Account Types, Spread, Fees (Forex/Crypto), Auto Assign, Payment Gateways, Min/Max Deposits, Dynamic Status, Trading Status, Notifications, Tracking, OAuth, logs (Event, Error, SMTP, Balance events, History, Order Storage), API Docs, Settings Hub
â€¢ KNOWME /admin/knowme â€” visual flows + guide chat alongside you

KYC FILES: Client portal user_documents stores metadata (filename) only. Operators analyze real files via the Wallstreet AI bubble (paperclip): PDF/text parsed server-side; images are metadata-only until described; optional encrypted vault API exists for future UI.

When asked "how do Iâ€¦" or "demo tour": numbered steps, exact menu names, paths under /admin/..., when-to-use. Walk sidebar zones Now â†’ System â†’ Run. Under 15 lines unless full tour or "explain more" / module deep-dive requested.`;

/** Condensed encyclopedia for AI context injection. */
export function buildCrmCatalogForAi(): { catalog: string; zones: string[] } {
  const lines: string[] = ["CURIO CRM PAGE CATALOG â€” demos and how-to answers."];
  for (const term of Object.values(GLOSSARY)) {
    const guide = GUIDES[term.id];
    lines.push(`â€¢ ${term.label} (${term.path}) â€” ${guide?.purpose ?? term.label}`);
  }
  return {
    catalog: lines.join("\n"),
    zones: ["Knowme", "Pulse", "Users", "Money", "Agents", "Marketing", "Systems"],
  };
}

/** True when the operator question is CRM navigation / admin page help. */
export function isCrmGuideQuestion(message: string): boolean {
  const m = message.toLowerCase();
  return (
    /how do i|how to|what is|where is|walk me|show me|explain|teach|learn|onboard|new hire|first day|demo|tour|every page|full crm|all modules|every aspect|major module|crm module|leads module|clients module|deposits module|cashier module|trading module|marketing module|system module|curiocrm|crm guide|knowme|WALLSTREET AI|wallstreet ai|street ai|who are you|what are you|your house|your body|native to/.test(
      m,
    ) ||
    /permissions|groups|spread|auto assign|notification|oauth|tracking|pixel|account type|view log|balance event|history log|api doc|member alert|margin call|payment gateway|deposit limit|forex|crypto fee|dynamic status|event log|super admin|impersonat|cashier|marketing|live book|hot lead|pending in|credits in|funded|desk team|scoreboard|wire queue|promo code|brand dna|live floor|action queue|payment radar|balance fix|full ledger|closed book|instruments|market clock|allies|affiliate|integration|campaign pivot|client status|pipeline status|operator brief|collections brief|configuration|tenant status|tenant paused|vendor license|ollama|stay alive|pass the test|survival|desk management|attribution|intel note|comms log|payout/.test(
      m,
    ) ||
    /admin\/system|sidebar|system menu|access key|crm catalog|settings hub/.test(m)
  );
}

function expandGuideLinks(text: string): string {
  return text.replace(/\[\[(\w+)\]\]/g, (_, id: string) => GLOSSARY[id]?.label ?? id);
}

const GUIDE_KEY_BY_TERM_ID: Record<string, keyof typeof GUIDES> = {
  mission_control: "home",
  funded_accounts: "funded",
  desk_team: "agents",
  intel_notes: "notes",
  comms_log: "emails",
  schedule: "calendar",
  super_admin: "super_admin",
};

export function guideForTermId(id: string): PageGuideDef | undefined {
  const key = GUIDE_KEY_BY_TERM_ID[id] ?? id;
  return GUIDES[key as keyof typeof GUIDES];
}

const GOLDEN_PATH_HINT: Partial<Record<string, string>> = {
  mission_control: "Start of day: read cards here, then route people to Hot Leads or money to Pending In.",
  hot_leads: "Golden path: Aria capture â†’ assign agent here â†’ All Clients â†’ Pending In on first deposit.",
  pending_in: "Golden path: real PSP money lands here; Approve â†’ Credits In â†’ client joins Funded Accounts.",
  credits_in: "After Pending In approval â€” verify posted amount before telling sales the client is funded.",
  funded_accounts: "Anyone with an approved deposit; retention and trading work starts from Client File.",
  live_book: "Open risk after funding; pair with Desk Management for house net exposure.",
  desk_management: "House net book â€” read before major news; drill to Live Book per client.",
  payment_radar: "When deposits stall â€” PSP health here, chase list via Collections Brief on Wallstreet AI.",
  street_ai: "You â€” operator copilot; instant CRM answers when Ollama is slow; briefs for owner and floor.",
  payouts: "Cash out requests â€” verify KYC on Client File before approve; wires may hit Wire Queue.",
  wire_queue: "High-value bank wires â€” second approval after Payouts row.",
  campaigns: "Tag spend â†’ read quality on Hot Leads campaign column.",
  attribution: "Landing-page pixels â€” test before ad spend.",
  allies: "IB/affiliate registry â€” pair with OAuth for partner API access.",
  intel_notes: "Zero notes on hot leads = call risk â€” log on Client File after every call.",
  tenant_status: "Billing kill-switch â€” fix before blaming Wallstreet AI for blank CRM.",
  vendor_license: "402 LICENSE â€” heartbeat panel on Configuration.",
  knowme: "Visual golden path slides â€” pair with demo tour for new hires.",
};

/** Concise desk blurb â€” understanding-rich (2â€“4 sentences + path), for fast-path / bubble. */
export function compactDeskModuleReply(termId: string): string | null {
  const term = GLOSSARY[termId];
  if (!term) return null;
  const g = enrichGuideFromTutorial(term, guideForTermId(term.id));
  const step = g.steps?.find((s) => s.length > 8);
  const lines = [term.label.toUpperCase(), expandGuideLinks(g.purpose).slice(0, 300)];
  if (g.whenToUse) lines.push(`When: ${expandGuideLinks(g.whenToUse).slice(0, 200)}`);
  const gp = GOLDEN_PATH_HINT[termId];
  if (gp) lines.push(gp);
  lines.push(`Path: ${term.path}`);
  if (step) lines.push(`Next: ${expandGuideLinks(step).slice(0, 160)}`);
  return lines.join("\n");
}

function enrichGuideFromTutorial(term: GlossaryTerm, guide: PageGuideDef | undefined): PageGuideDef {
  const base: PageGuideDef = guide ?? { title: term.label, purpose: "CurioCRM admin module.", steps: [] };
  if (base.whoUses && base.whenToUse && base.purpose.length >= 100) return base;

  const tut = getPageTutorial(term.path);
  const block = tut?.blocks[0];
  if (!block) return base;

  return {
    ...base,
    title: base.title || tut!.title,
    purpose:
      base.purpose.length >= 80
        ? base.purpose
        : [block.what, block.detail, tut!.firstDaySummary].filter(Boolean).join(" "),
    whoUses: base.whoUses ?? "Desk staff and managers with the matching sidebar permission.",
    whenToUse: base.whenToUse ?? block.when ?? tut!.firstDaySummary,
    steps: base.steps.length
      ? base.steps
      : [block.how, block.when].filter((s): s is string => Boolean(s && s.length > 12)),
    commonMistakes: base.commonMistakes,
  };
}

function knowmeInviteForTerm(term: GlossaryTerm): string {
  if (term.id === "knowme") {
    return "Browse Visual Flows on the KNOWME page for step-by-step diagrams, or ask about any sidebar screen by name.";
  }
  if (term.path.includes("/cashier/")) {
    return "Ask KNOWME about Full Ledger or Pending In, or open Visual Flows for the deposit golden path.";
  }
  if (term.id === "hot_leads" || term.id === "pending_in" || term.id === "all_clients") {
    return "Ask KNOWME about the next step in the golden path, or open Visual Flows slide 1.";
  }
  return `Ask KNOWME about a related screen, or say "demo tour" for the full CRM walkthrough.`;
}

/** Plain-English deep answer â€” What / Who / When / How / Common mistakes. */
export function formatDeepPageGuide(
  term: GlossaryTerm,
  guide: PageGuideDef | undefined,
  opts?: { expanded?: boolean },
): string {
  const g = enrichGuideFromTutorial(term, guide);
  const lines: string[] = [`${g.title}`, `Path: ${term.path}`, "", `What it is: ${expandGuideLinks(g.purpose)}`];

  if (g.whoUses) lines.push(`Who uses it: ${expandGuideLinks(g.whoUses)}`);
  if (g.whenToUse) lines.push(`When to use it: ${expandGuideLinks(g.whenToUse)}`);

  const steps = (g.steps ?? []).filter(Boolean);
  if (steps.length) {
    lines.push("", "How (step by step):");
    steps.forEach((s, i) => lines.push(`${i + 1}. ${expandGuideLinks(s)}`));
  }

  if (g.commonMistakes) {
    lines.push("", `Common mistakes: ${expandGuideLinks(g.commonMistakes)}`);
  }

  if (opts?.expanded) {
    const tut = getPageTutorial(term.path);
    if (tut?.firstDaySummary && !g.purpose.includes(tut.firstDaySummary.slice(0, 40))) {
      lines.push("", `Extra context: ${tut.firstDaySummary}`);
    }
    if (tut && tut.blocks.length > 1) {
      lines.push("", "Related tips:");
      for (const b of tut.blocks.slice(1, 4)) {
        lines.push(`â€¢ ${b.title}: ${b.what} ${b.how}`);
      }
    }
    const hermes = formatHermesDepthReply(term.id, { layer: "full" });
    if (hermes) {
      lines.push("", "--- Hermes depth ---", hermes);
    }
  }

  const interconnect = formatInterconnectionHint(term.id);
  if (interconnect) lines.push("", interconnect);

  const hb = hermesBlockForModuleId(term.id);
  if (hb) lines.push("", `Dig deeper: say "${hb.digDeeperPrompt}" for operations â†’ compliance â†’ desk risk layers.`);

  lines.push("", knowmeInviteForTerm(term));
  return lines.join("\n");
}

/** True when the user wants more detail on the previous answer ("explain", "more", "why", â€¦). */
export function isFollowUpExpandRequest(message: string): boolean {
  const m = message.toLowerCase().trim().replace(/[^\w\s'?]/g, " ");
  if (!m || m.length > 90) return false;
  return (
    /^explain more\b/.test(m) ||
    /^more detail/.test(m) ||
    /^(explain|more|why|how|details|detail|elaborate|expand|continue|go on|tell me more|break it down|what do you mean|say more|please explain|help me understand)(\.|\!|\?|\s|$)/.test(
      m,
    ) ||
    /^(can you )?(explain|elaborate)( more| further| that| this)?(\?|$)/.test(m) ||
    /^what about (that|this|it)\??$/.test(m)
  );
}

function matchGlossaryTermInText(text: string): GlossaryTerm | null {
  const m = text.toLowerCase().trim().replace(/[^\w\s'?/-]/g, " ");
  if (!m) return null;

  const index = buildTermLinkIndex();
  let best: { term: GlossaryTerm; len: number } | null = null;
  for (const [needle, term] of index) {
    if (needle.length < 3) continue;
    if (!m.includes(needle)) continue;
    if (!best || needle.length > best.len) best = { term, len: needle.length };
  }
  return best?.term ?? null;
}

/** Resolve the CRM topic from recent chat â€” skips bare follow-up prompts. */
export function findLastGuideTopic(history: GuideChatTurn[] | undefined): GlossaryTerm | null {
  if (!history?.length) return null;

  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i]!;
    if (turn.role === "user" && isFollowUpExpandRequest(turn.content)) continue;
    const hit = matchGlossaryTermInText(turn.content);
    if (hit) return hit;
  }
  return null;
}

function formatPageGuide(term: GlossaryTerm, guide: PageGuideDef | undefined, opts?: { expanded?: boolean }): string {
  return formatDeepPageGuide(term, guide, opts);
}

function fullDemoTourBody(): string {
  const zones: Array<{ title: string; ids: string[] }> = [
    {
      title: "NOW (daily ops)",
      ids: ["mission_control", "live_floor", "hot_leads", "action_queue", "street_ai", "payment_radar"],
    },
    {
      title: "RUN (clients & money)",
      ids: [
        "all_clients",
        "funded_accounts",
        "desk_team",
        "scoreboard",
        "pending_in",
        "credits_in",
        "payouts",
        "wire_queue",
        "live_book",
        "desk_management",
        "campaigns",
      ],
    },
    {
      title: "SYSTEM (platform)",
      ids: [
        "permissions",
        "groups",
        "access_keys",
        "auto_assign",
        "spread",
        "notifications",
        "payment_gateways",
        "tracking",
        "oauth",
        "settings",
        "knowme",
      ],
    },
  ];
  const lines = [
    "CURIOCRM DEMO â€” full walkthrough (instant, no wait)",
    "Golden path: Visitor â†’ Aria â†’ Hot Leads â†’ assign agent â†’ All Clients â†’ Pending In approve â†’ Funded â†’ Live Book.",
    "",
  ];
  for (const z of zones) {
    lines.push(z.title);
    for (const id of z.ids) {
      const term = GLOSSARY[id];
      if (!term) continue;
      const g = guideForTermId(id);
      lines.push(`â€¢ ${term.label} â€” ${term.path}${g?.purpose ? ` â€” ${expandGuideLinks(g.purpose).slice(0, 120)}` : ""}`);
    }
    lines.push("");
  }
  lines.push("Ask any page by name (e.g. â€œexplain spreadâ€ or â€œpayment gatewaysâ€) for step-by-step.");
  return lines.join("\n");
}

/** Zero-LLM CRM answers from the live encyclopedia â€” used by Wallstreet AI and KNOWME. */
export function instantCrmGuideReply(message: string, history?: GuideChatTurn[]): string | null {
  const m = message.toLowerCase().trim().replace(/[^\w\s'?/-]/g, " ");

  const hermesModule = matchHermesTeachModule(message);
  if (hermesModule) {
    const layer =
      /dig deeper|go deeper|deep dive|compliance|desk risk|operations layer/.test(m) ? "full" : "operations";
    const hermes = formatHermesDepthReply(hermesModule, { layer: layer as "full" | "operations" });
    if (hermes) return hermes;
  }

  if (/^hermes\b/.test(m) && !hermesModule) {
    return (
      `${CRM_HERMES_FRAMING}\n\n` +
      `Try: teach me pending in Â· dig deeper on balance fixes Â· hermes hot leads Â· explain more (after any module answer).\n` +
      `${HERMES_MODULE_COUNT} modules have layered depth â€” you grow with the system session by session.`
    );
  }

  if (/interconnect|golden path map|what feeds what|upstream downstream/.test(m)) {
    return (
      "CRM INTERCONNECTION MAP (golden path spine):\n" +
      CRM_INTERCONNECTION_MAP.map((e) => `â€¢ ${e.from} â†’ ${e.to.join(" â†’ ")} â€” ${e.note}`).join("\n") +
      "\n\nAsk any module by name for Hermes depth on that link."
    );
  }

  if (isFollowUpExpandRequest(message)) {
    const topic = findLastGuideTopic(history);
    if (topic) {
      const hermes = formatHermesDepthReply(topic.id, { layer: "full" });
      if (hermes) {
        return `${formatPageGuide(topic, guideForTermId(topic.id), { expanded: true })}\n\n--- Hermes tier ---\n${hermes}`;
      }
      return formatPageGuide(topic, guideForTermId(topic.id), { expanded: true });
    }
    return (
      "Happy to go deeper â€” tell me which screen you mean (for example Balance Fixes, Hot Leads, or Pending In).\n\n" +
      'Or say "demo tour" for the full CRM walkthrough.'
    );
  }

  if (
    /stay alive|pass the test|survival test|vendor license|tenant paused|tenant status|license heartbeat|kill.switch|why do you exist|402 license/.test(
      m,
    )
  ) {
    return (
      `${CRM_NATIVE_IDENTITY}\n\n${CRM_SURVIVAL_TEST}\n\n` +
      "Ask any module by name (Hot Leads, Pending In, Spread, â€¦) or say \"demo tour\" for the full walkthrough."
    );
  }

  if (/who are you|what are you|where do you live|your house|your body|native to crm/.test(m)) {
    return (
      `${CRM_NATIVE_IDENTITY}\n\n${CRM_OPERATIONAL_SURVIVAL}\n\n` +
      "Ask any module by name (Hot Leads, Pending In, Spread, â€¦) or say \"demo tour\" for the full walkthrough."
    );
  }

  if (
    /demo tour|full tour|every page|every aspect|all modules|teach me everything|walk me through crm|walk me through the crm|onboarding tour|new hire tour/.test(
      m,
    )
  ) {
    return fullDemoTourBody();
  }

  const whatWhere = m.match(/^(?:what is|where is|where s|tell me about|explain)\s+(.+?)(?:\?|$)/);
  if (whatWhere) {
    const topic = matchGlossaryTermInText(whatWhere[1]!);
    if (topic) return formatPageGuide(topic, guideForTermId(topic.id));
  }

  const index = buildTermLinkIndex();
  const hits: GlossaryTerm[] = [];
  for (const [needle, term] of index) {
    if (needle.length < 3) continue;
    if (m.includes(needle)) hits.push(term);
  }
  const unique = [...new Map(hits.map((t) => [t.id, t])).values()];
  if (unique.length === 1) {
    return formatPageGuide(unique[0], guideForTermId(unique[0].id));
  }
  if (unique.length > 1) {
    return (
      `Matched ${unique.length} CRM areas:\n` +
      unique
        .slice(0, 6)
        .map((t) => `â€¢ ${t.label} â€” ${t.path}`)
        .join("\n") +
      '\n\nAsk about one page at a time for full steps â€” or say "explain" after your question to go deeper.'
    );
  }

  if (isCrmGuideQuestion(message)) {
    const topic = findLastGuideTopic(history);
    if (topic) {
      return formatPageGuide(topic, guideForTermId(topic.id), { expanded: true });
    }
    return (
      "CurioCRM demo guide â€” ask a page by name or say â€œdemo tourâ€.\n" +
      "Examples: Balance Fixes Â· morning routine Â· approve deposit Â· hot leads Â· permissions Â· spread Â· payment gateways Â· knowme Â· settings hub."
    );
  }

  return null;
}

export function getButtonTip(id: string): string | undefined {
  return BUTTON_TIPS[id];
}

export function buildTermLinkIndex(): Map<string, GlossaryTerm> {
  const map = new Map<string, GlossaryTerm>();
  for (const term of Object.values(GLOSSARY)) {
    map.set(term.id, term);
    map.set(term.label.toLowerCase(), term);
    for (const a of term.aliases ?? []) map.set(a.toLowerCase(), term);
  }
  return map;
}
