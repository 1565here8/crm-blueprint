/**
 * Hermes depth — Wallstreet AI learns CurioCRM layer-by-layer (surface → ops → compliance → desk risk).
 * One teaching block per major submodule; consumed by crmGuideKnowledge + deskFastPath.
 */
import { CURIONILABS_PUBLIC_URL } from "./productHosts";
export type HermesLayer = "surface" | "operations" | "compliance" | "deskRisk";

export type HermesDepthBlock = {
  moduleId: string;
  umbrella: string;
  label: string;
  path: string;
  surface: string;
  operations: string;
  compliance: string;
  deskRisk: string;
  dataFlow: string;
  whoUses: string;
  upstream: string[];
  downstream: string[];
  operatorTraps: string[];
  digDeeperPrompt: string;
};

const MODULE_META: Record<string, { label: string; path: string }> = {
  knowme: { label: "KNOWME", path: "/admin/knowme" },
  mission_control: { label: "Mission Control", path: "/admin" },
  live_floor: { label: "Live Floor", path: "/admin/online" },
  hot_leads: { label: "Hot Leads", path: "/admin/desk/leads" },
  action_queue: { label: "Action Queue", path: "/admin/desk/tasks" },
  street_ai: { label: "Wallstreet AI", path: "/admin/desk" },
  payment_radar: { label: "Payment Radar", path: "/admin/desk/psp-health" },
  aria: { label: "Aria concierge", path: CURIONILABS_PUBLIC_URL },
  all_clients: { label: "All Clients", path: "/admin/crm/users" },
  client_file: { label: "Client File", path: "/admin/crm/users" },
  funded_accounts: { label: "Funded Accounts", path: "/admin/crm/depositors" },
  pending_in: { label: "Pending In", path: "/admin/cashier/deposit-requests" },
  credits_in: { label: "Credits In", path: "/admin/cashier/deposits" },
  payouts: { label: "Payouts", path: "/admin/cashier/withdrawals" },
  wire_queue: { label: "Wire Queue", path: "/admin/cashier/wire-req" },
  rewards: { label: "Rewards", path: "/admin/cashier/bonuses" },
  balance_fixes: { label: "Balance Fixes", path: "/admin/cashier/adjustments" },
  full_ledger: { label: "Full Ledger", path: "/admin/cashier/ledger" },
  live_book: { label: "Live Book", path: "/admin/trading/open-trades" },
  closed_book: { label: "Closed Book", path: "/admin/trading/trades" },
  desk_management: { label: "Desk Management", path: "/admin/trading/net-positions" },
  instruments: { label: "Instruments", path: "/admin/trading/assets" },
  market_clock: { label: "Market Clock", path: "/admin/trading/activity-hours" },
  desk_team: { label: "Desk Team", path: "/admin/crm/agents" },
  scoreboard: { label: "Scoreboard", path: "/admin/crm/sales-report" },
  intel_notes: { label: "Intel Notes", path: "/admin/crm/notes" },
  comms_log: { label: "Comms Log", path: "/admin/crm/emails" },
  schedule: { label: "Schedule", path: "/admin/crm/calendar" },
  campaigns: { label: "Campaigns", path: "/admin/marketing/campaigns" },
  allies: { label: "Allies", path: "/admin/marketing/partners" },
  attribution: { label: "Attribution", path: "/admin/marketing/trackers" },
  integrations: { label: "Integrations", path: "/admin/marketing/api-keys" },
  campaign_pivot: { label: "Campaign Pivot", path: "/admin/marketing/campaign-pivot" },
  permissions: { label: "Permissions", path: "/admin/system/permissions" },
  groups: { label: "Groups", path: "/admin/system/groups" },
  desks: { label: "Desks", path: "/admin/system/desks" },
  access_keys: { label: "Access Keys", path: "/admin/system/team-permissions" },
  brand_dna: { label: "Brand DNA", path: "/admin/system/common/branding" },
  auto_assign: { label: "Auto Assign", path: "/admin/system/auto-assign" },
  spread: { label: "Spread", path: "/admin/system/spread" },
  payment_gateways: { label: "Payment Gateways", path: "/admin/system/payment-gateways" },
  dynamic_status: { label: "Dynamic Status", path: "/admin/system/dynamic-status" },
  client_statuses: { label: "Statuses", path: "/admin/system/status" },
  event_logs: { label: "Event Logs", path: "/admin/system/event-logs" },
  settings: { label: "Settings", path: "/admin/settings" },
  security_console: { label: "Security dashboard", path: "/admin/security" },
  security_perimeter: { label: "My IP & perimeter", path: "/admin/security/perimeter" },
};

function block(
  moduleId: string,
  umbrella: string,
  opts: {
    surface: string;
    operations: string;
    compliance: string;
    deskRisk: string;
    dataFlow: string;
    whoUses: string;
    upstream: string[];
    downstream: string[];
    operatorTraps: string[];
  },
): HermesDepthBlock {
  const meta = MODULE_META[moduleId] ?? { label: moduleId, path: "/admin" };
  return {
    moduleId,
    umbrella,
    label: meta.label,
    path: meta.path,
    digDeeperPrompt: `dig deeper on ${meta.label.toLowerCase()}`,
    ...opts,
  };
}

function modLabel(id: string): string {
  return MODULE_META[id]?.label ?? id.replace(/_/g, " ");
}

/** One Hermes block per major submodule — teach one-by-one, master over time. */
export const HERMES_DEPTH_BY_MODULE: Record<string, HermesDepthBlock> = {
  knowme: block("knowme", "Knowme", {
    surface: "Visual classroom + Broker packs tier picker — slides, install matrix, guide chat beside Wallstreet AI.",
    operations: "CEO demo: Broker packs (Desk Pro) → slide 1 → Pending In. Onboard hires with Visual Flows.",
    compliance: "Does not move money — training only.",
    deskRisk: "Low — wrong install story sells per-agent 32 GB when one 16 GB manager PC is enough.",
    dataFlow: "Operator reads flows → Broker packs → asks Wallstreet AI → opens real screens.",
    whoUses: "Managers, trainers, owner on demo day.",
    upstream: ["street_ai"],
    downstream: ["hot_leads", "pending_in", "all_clients"],
    operatorTraps: [
      "Skipping live Pending In after slides",
      "Treating KNOWME as a ticket system",
      "Quoting Agent Elite without hardware budget",
    ],
  }),
  mission_control: block("mission_control", "Pulse", {
    surface: "Home dashboard — registrations, money cards, period picker.",
    operations: "Start every shift: read cards → route to Hot Leads or Pending In.",
    compliance: "Aggregate only — drill to Client File for PII actions.",
    deskRisk: "Stale period hides overnight deposit pile-up.",
    dataFlow: "Stats API → cards → deep links to cashier/CRM.",
    whoUses: "Owner, floor manager, senior agent opening shift.",
    upstream: ["aria", "campaigns"],
    downstream: ["hot_leads", "pending_in", "live_book"],
    operatorTraps: ["Living only on Mission Control without clearing Pending In", "Ignoring lead spike card"],
  }),
  live_floor: block("live_floor", "Pulse", {
    surface: "Real-time visitors on the public site.",
    operations: "Call while on-page during ad bursts; match to Hot Leads captures.",
    compliance: "No balance changes — observation + assignment handoff.",
    deskRisk: "Chasing anonymous sessions without logging notes on Client File.",
    dataFlow: "Public site heartbeat → Live Floor list → Hot Leads / All Clients.",
    whoUses: "Sales floor on campaign days.",
    upstream: ["campaigns", "attribution"],
    downstream: ["hot_leads", "all_clients"],
    operatorTraps: ["Calling without checking if lead already in Hot Leads", "Ignoring attribution column"],
  }),
  hot_leads: block("hot_leads", "Pulse", {
    surface: "Aria concierge captures awaiting human ownership.",
    operations: "Assign fast — Recommend AI balances Desk Team load; dismiss spam.",
    compliance: "Log outcome on Client File after every callback.",
    deskRisk: "Cold leads = lost deposits; unassigned queue is revenue leak.",
    dataFlow: "Aria → Hot Leads → assign agent → All Clients → Pending In on fund.",
    whoUses: "Sales agents, lead coordinators.",
    upstream: ["aria", "live_floor", "campaigns"],
    downstream: ["all_clients", "pending_in", "desk_team"],
    operatorTraps: ["Assigning without checking duplicate email in All Clients", "Zero Intel Notes after calls"],
  }),
  action_queue: block("action_queue", "Pulse", {
    surface: "Today's tasks — manual + AI-generated from audits.",
    operations: "Clear before lunch; Generate from Wallstreet AI when empty after brief.",
    compliance: "Tasks are internal — not client-facing promises.",
    deskRisk: "Ignored tasks hide KYC and callback debt.",
    dataFlow: "Wallstreet AI audit → tasks → complete/dismiss → Event Logs optional.",
    whoUses: "Agents, managers post-brief.",
    upstream: ["street_ai", "mission_control"],
    downstream: ["all_clients", "client_file"],
    operatorTraps: ["Dismissing without opening Client File", "Never generating tasks from Operator Brief"],
  }),
  street_ai: block("street_ai", "Pulse", {
    surface: "Wallstreet AI — instant CRM teacher + LLM briefs on VPS.",
    operations: "Hermes mode: teach one module at a time; say dig deeper to add layers.",
    compliance: "No trade picks; KYC via attachments with audit expectation.",
    deskRisk: "Operators disable you if answers miss golden path — pass the test every shift.",
    dataFlow: "Operator question → deskFastPath / LLM → module depth → next screen link.",
    whoUses: "Everyone with desk.ask permission.",
    upstream: ["knowme", "crmGuideKnowledge"],
    downstream: ["*"],
    operatorTraps: ["Waiting for Ollama when instant path works", "Asking for ticker picks on calls"],
  }),
  payment_radar: block("payment_radar", "Pulse", {
    surface: "PSP health — which deposit rails are failing.",
    operations: "When Pending In stalls — check radar then Collections Brief.",
    compliance: "Read-only health — changes happen in Payment Gateways.",
    deskRisk: "Blaming clients when rail is down platform-wide.",
    dataFlow: "PSP probes → Payment Radar → Payment Gateways / Pending In chase.",
    whoUses: "Cashier lead, owner, collections desk.",
    upstream: ["payment_gateways"],
    downstream: ["pending_in", "credits_in"],
    operatorTraps: ["Approving deposits while rail is red without manual wire plan"],
  }),
  all_clients: block("all_clients", "Users", {
    surface: "Master registry — every registered login.",
    operations: "Search, bulk status, import CSV, open Client File.",
    compliance: "Bulk edits need scope discipline — Event Logs records changes.",
    deskRisk: "Wrong status on bulk = hundreds of mis-routed callbacks.",
    dataFlow: "Signup / import → All Clients → fund → Funded Accounts.",
    whoUses: "Sales, support, managers.",
    upstream: ["aria", "hot_leads", "campaigns"],
    downstream: ["client_file", "funded_accounts", "pending_in"],
    operatorTraps: ["Bulk status without checking filter scope", "Import CSV without assigning agent"],
  }),
  client_file: block("client_file", "Users", {
    surface: "Single-client command center — profile, money, trades, notes, KYC.",
    operations: "Money tab for deposit/withdraw; Generate Pitch; impersonate only with audit discipline.",
    compliance: "KYC decisions logged; impersonation sensitive — History Logs.",
    deskRisk: "Manual Money tab bypasses Pending In compliance path for real PSP money.",
    dataFlow: "All Clients row → Client File → cashier tabs / Live Book.",
    whoUses: "Assigned agent, cashier, retention.",
    upstream: ["all_clients", "hot_leads"],
    downstream: ["pending_in", "credits_in", "live_book", "intel_notes"],
    operatorTraps: ["Posting real deposits only on Money tab", "No notes after margin call"],
  }),
  funded_accounts: block("funded_accounts", "Users", {
    surface: "Depositors only — at least one approved inbound credit.",
    operations: "Retention sweeps; open Client File for trade and payout work.",
    compliance: "Still subject to KYC before large payouts.",
    deskRisk: "Treating funded list as 'closed' — inactive funded clients churn.",
    dataFlow: "Pending In approve → Credits In → Funded Accounts.",
    whoUses: "Retention, senior sales, managers.",
    upstream: ["pending_in", "credits_in"],
    downstream: ["live_book", "payouts"],
    operatorTraps: ["Calling funded clients still in Hot Leads queue"],
  }),
  pending_in: block("pending_in", "Money", {
    surface: "Deposit request queue — approve or reject before balance moves.",
    operations: "Approve → verify Credits In → confirm Funded Accounts / Client File Money.",
    compliance: "Every approve writes ledger trail — pair with Balance Fixes only for corrections.",
    deskRisk: "Double-approve or approve without PSP confirmation.",
    dataFlow: "Client/PSP request → Pending In → approve → Credits In → Funded.",
    whoUses: "Cashier, finance, owner on large wires.",
    upstream: ["payment_gateways", "client_file"],
    downstream: ["credits_in", "funded_accounts", "full_ledger"],
    operatorTraps: ["Skipping Credits In verification", "Using Balance Fixes instead of reject+repost"],
  }),
  credits_in: block("credits_in", "Money", {
    surface: "Posted inbound credits history.",
    operations: "Reconcile after every Pending In batch; filter per client from Client File.",
    compliance: "Discrepancy investigation before telling sales 'client is funded'.",
    deskRisk: "FX/partial capture mismatches erode trust.",
    dataFlow: "Pending In approval → Credits In row → Full Ledger.",
    whoUses: "Cashier, finance.",
    upstream: ["pending_in"],
    downstream: ["funded_accounts", "full_ledger"],
    operatorTraps: ["Announcing funded before row appears here"],
  }),
  payouts: block("payouts", "Money", {
    surface: "Withdrawal requests — debit after approval.",
    operations: "Verify KYC on Client File; large wires may continue in Wire Queue.",
    compliance: "Reject without note; log comms on disputes.",
    deskRisk: "Approving payout while Live Book heavily underwater for client.",
    dataFlow: "Client request → Payouts → Wire Queue (if wire) → Full Ledger.",
    whoUses: "Cashier, compliance officer.",
    upstream: ["client_file", "live_book"],
    downstream: ["wire_queue", "full_ledger"],
    operatorTraps: ["Approving without checking open risk", "Ignoring Wire Queue second step"],
  }),
  wire_queue: block("wire_queue", "Money", {
    surface: "High-value wire withdrawals — second approval lane.",
    operations: "Bank verify → approve; mirror check on Payouts + Full Ledger.",
    compliance: "Dual control expectation on wires.",
    deskRisk: "Approving wire under social-engineering pressure.",
    dataFlow: "Payouts (wire) → Wire Queue → ledger debit.",
    whoUses: "Senior cashier, owner.",
    upstream: ["payouts"],
    downstream: ["full_ledger"],
    operatorTraps: ["Skipping Client File KYC tab"],
  }),
  rewards: block("rewards", "Money", {
    surface: "Marketing bonuses — not real PSP deposits.",
    operations: "Use for promos; real money always via Pending In.",
    compliance: "Separate ledger type — do not mix with Credits In in reporting.",
    deskRisk: "Sales promises bonus that compliance did not approve.",
    dataFlow: "Promo / manager → Rewards → Full Ledger (bonus type).",
    whoUses: "Marketing, managers with cashier.adjust.",
    upstream: ["promo_codes"],
    downstream: ["full_ledger", "client_file"],
    operatorTraps: ["Telling client bonus is 'deposit' for withdrawal eligibility"],
  }),
  balance_fixes: block("balance_fixes", "Money", {
    surface: "Manual balance corrections — admin_adjustment on Full Ledger.",
    operations: "Document reason; prefer reject/repost on Pending In for deposit errors.",
    compliance: "Balance events + History Logs — owner reviews patterns.",
    deskRisk: "Routine 'fixes' hide cashier training gaps or fraud.",
    dataFlow: "Exception → Balance Fixes → Full Ledger + balance events.",
    whoUses: "Finance, owner, senior cashier.",
    upstream: ["pending_in", "credits_in"],
    downstream: ["full_ledger", "balance_events"],
    operatorTraps: ["Fixing instead of investigating duplicate Pending In", "No ticket note on Client File"],
  }),
  full_ledger: block("full_ledger", "Money", {
    surface: "All money movements — audit spine of treasury.",
    operations: "Dispute resolution starts here; filter by client from Client File View All.",
    compliance: "Immutable-style trail — pair with Balance events for mutations.",
    deskRisk: "Arguing with client without pulling ledger row first.",
    dataFlow: "Every cashier action → Full Ledger.",
    whoUses: "Finance, compliance, owner.",
    upstream: ["pending_in", "payouts", "rewards", "balance_fixes"],
    downstream: ["balance_events", "event_logs"],
    operatorTraps: ["Only checking Client File Money tab without global ledger"],
  }),
  live_book: block("live_book", "Money", {
    surface: "Open positions — intervene on risk events.",
    operations: "Force-close when needed; always pair with Desk Management for house view.",
    compliance: "Trading Status may block opens while login stays on.",
    deskRisk: "Client concentrated in one symbol during news — check net book.",
    dataFlow: "Client terminal → execution → Live Book rows.",
    whoUses: "Dealing desk, risk, senior support.",
    upstream: ["funded_accounts", "instruments"],
    downstream: ["desk_management", "closed_book"],
    operatorTraps: ["Closing client without checking Desk Management net", "Ignoring Trading Status freeze"],
  }),
  closed_book: block("closed_book", "Money", {
    surface: "Closed and historical orders.",
    operations: "Commission disputes and PnL questions start here.",
    compliance: "Export for disputes; align with Order Storage Logs if sync odd.",
    deskRisk: "Misread pending vs closed during fast markets.",
    dataFlow: "Live Book close → Closed Book → reporting.",
    whoUses: "Support, finance, compliance.",
    upstream: ["live_book"],
    downstream: ["order_storage_logs"],
    operatorTraps: ["Trusting Live Book when sync lag — check Order Storage Logs"],
  }),
  desk_management: block("desk_management", "Money", {
    surface: "House net exposure by symbol.",
    operations: "Read before major news; drill to Live Book per client.",
    compliance: "Internal risk — not client-facing limits (those are Trading Status / Account Types).",
    deskRisk: "House short into squeeze without noticing net book.",
    dataFlow: "All open positions aggregate → Desk Management.",
    whoUses: "Owner, risk manager, dealing desk.",
    upstream: ["live_book"],
    downstream: ["live_book"],
    operatorTraps: ["Only watching single client Live Book during volatility"],
  }),
  instruments: block("instruments", "Money", {
    surface: "Tradable symbol catalog and session flags.",
    operations: "Enable/disable symbols; pair with Market Clock for hours.",
    compliance: "Wrong symbol state = client orders fail silently at edge.",
    deskRisk: "Disabling major pair during active book without comms to floor.",
    dataFlow: "Instruments config → terminal symbol list → Live Book.",
    whoUses: "Dealing desk, platform admin.",
    upstream: ["market_clock"],
    downstream: ["live_book"],
    operatorTraps: ["Changing assets without checking open positions"],
  }),
  market_clock: block("market_clock", "Money", {
    surface: "Session hours and market open state.",
    operations: "Explain 'market closed' tickets to clients with exact session row.",
    compliance: "Display truth — misconfigured hours = regulatory complaint risk.",
    deskRisk: "FX open while crypto closed — confused retention scripts.",
    dataFlow: "Hours table → terminal session gates.",
    whoUses: "Support, dealing desk.",
    upstream: [],
    downstream: ["instruments", "live_book"],
    operatorTraps: ["Promising 24/7 crypto while clock shows maintenance"],
  }),
  desk_team: block("desk_team", "Agents", {
    surface: "Sales and support roster — who owns which client.",
    operations: "Reassign from All Clients or Hot Leads; tune access in Permissions.",
    compliance: "Inactive agents still receiving leads = GDPR-style contact issues.",
    deskRisk: "Round-robin broken when Auto Assign rules out of order.",
    dataFlow: "Auto Assign / manual assign → Client File agent field → Scoreboard.",
    whoUses: "Managers, coordinators.",
    upstream: ["auto_assign", "hot_leads"],
    downstream: ["scoreboard", "all_clients"],
    operatorTraps: ["Deleting agent without reassigning book", "Mismatch with Groups permissions"],
  }),
  scoreboard: block("scoreboard", "Agents", {
    surface: "Agent performance for selected period.",
    operations: "Compare before commission payouts; drill to Client File for proof.",
    compliance: "Performance data — do not share across agents without policy.",
    deskRisk: "Gaming deposits without Credits In verification shows here first.",
    dataFlow: "Deposits + assignments → Scoreboard aggregates.",
    whoUses: "Managers, owner.",
    upstream: ["desk_team", "credits_in"],
    downstream: ["desk_team"],
    operatorTraps: ["Judging agent on lead count without funded conversion"],
  }),
  intel_notes: block("intel_notes", "Agents", {
    surface: "Rollup of all Client File notes.",
    operations: "Morning audit: hot statuses with zero notes.",
    compliance: "Discovery in disputes — who knew what when.",
    deskRisk: "Zero notes on active leads = compliance and conversion failure.",
    dataFlow: "Client File note → Intel Notes index.",
    whoUses: "Managers, compliance.",
    upstream: ["client_file"],
    downstream: ["comms_log"],
    operatorTraps: ["Managers never opening Client File — only this rollup"],
  }),
  comms_log: block("comms_log", "Agents", {
    surface: "Logged email record in CRM — not SMTP delivery.",
    operations: "Cross-check client claims with SMTP Logs.",
    compliance: "Prove outreach attempt before escalation.",
    deskRisk: "Logging email never sent — worse than no log.",
    dataFlow: "Agent logs → Comms Log; SMTP Logs for delivery proof.",
    whoUses: "Support, sales.",
    upstream: ["client_file"],
    downstream: ["smtp_logs"],
    operatorTraps: ["Confusing Comms Log with SMTP Logs"],
  }),
  schedule: block("schedule", "Agents", {
    surface: "Callbacks and money events on timeline.",
    operations: "End-of-week: registered but never called.",
    compliance: "Scheduling promises create follow-up obligation.",
    deskRisk: "Double-booking agents without calendar hygiene.",
    dataFlow: "CRM events → Schedule calendar.",
    whoUses: "Managers, retention.",
    upstream: ["all_clients", "credits_in"],
    downstream: ["hot_leads"],
    operatorTraps: ["Ignoring calendar after setting callback on call"],
  }),
  campaigns: block("campaigns", "Marketing", {
    surface: "UTM / acquisition source registry.",
    operations: "Tag spend → read quality on Hot Leads campaign column.",
    compliance: "Mis-tagged traffic wastes budget — not illegal, but audited.",
    deskRisk: "Scaling ads while Pending In conversion collapses.",
    dataFlow: "Campaign URL → signup attribution → Hot Leads / All Clients.",
    whoUses: "Marketing, owner.",
    upstream: ["attribution"],
    downstream: ["hot_leads", "campaign_pivot"],
    operatorTraps: ["New campaign without tracker pixel live"],
  }),
  allies: block("allies", "Marketing", {
    surface: "IB and affiliate partner registry.",
    operations: "Pair with OAuth for API partners; pay attention to client assignment.",
    compliance: "Partner contracts off-platform — CRM tracks IDs only.",
    deskRisk: "Duplicate partner codes assign wrong desk.",
    dataFlow: "Partner signup → All Clients attribution → Scoreboard.",
    whoUses: "Partners manager, owner.",
    upstream: ["oauth"],
    downstream: ["all_clients", "scoreboard"],
    operatorTraps: ["OAuth key rotated without disabling old client"],
  }),
  attribution: block("attribution", "Marketing", {
    surface: "Campaign-level pixels and trackers.",
    operations: "Test pixel before ad spend; pair with system Tracking for globals.",
    compliance: "Pixel fires PII rules per jurisdiction — legal owns policy.",
    deskRisk: "Broken pixel → blind spend.",
    dataFlow: "Landing page → pixel → campaign reports.",
    whoUses: "Marketing ops.",
    upstream: ["campaigns"],
    downstream: ["campaign_pivot", "hot_leads"],
    operatorTraps: ["Only fixing Marketing tracker while System Tracking still wrong"],
  }),
  integrations: block("integrations", "Marketing", {
    surface: "Marketing API keys for external hooks.",
    operations: "Rotate keys on compromise; document which integration uses which key.",
    compliance: "Keys are secrets — never paste in Wallstreet AI chat.",
    deskRisk: "Leaked key → partner bulk-imports bad leads.",
    dataFlow: "External system → API → All Clients / Hot Leads.",
    whoUses: "Integrations engineer, owner.",
    upstream: ["api_docs"],
    downstream: ["all_clients"],
    operatorTraps: ["Sharing same key across prod and test"],
  }),
  campaign_pivot: block("campaign_pivot", "Marketing", {
    surface: "Cross-campaign reporting preview.",
    operations: "Use for channel mix; confirm live data on Campaigns + Attribution first.",
    compliance: "Reporting only.",
    deskRisk: "Decisions on stale pivot while Attribution broken.",
    dataFlow: "Campaign + tracker data → pivot aggregates.",
    whoUses: "Marketing manager, owner.",
    upstream: ["campaigns", "attribution"],
    downstream: [],
    operatorTraps: ["Pivot empty because trackers never fired"],
  }),
  permissions: block("permissions", "Systems", {
    surface: "Desk-group permission matrix — sidebar + API.",
    operations: "Click group → toggle → save; test as sub-admin login.",
    compliance: "Over-permissioned sub-admin = data leak.",
    deskRisk: "Cashier without deposits perm blocks entire morning.",
    dataFlow: "Groups → Permissions → JWT perm set on login.",
    whoUses: "Owner, IT admin.",
    upstream: ["groups"],
    downstream: ["*"],
    operatorTraps: ["Editing Permissions without checking Access Keys overrides"],
  }),
  groups: block("groups", "Systems", {
    surface: "Desk role buckets linking to Permissions matrix.",
    operations: "Create group before hiring agents; map Auto Assign to group.",
    compliance: "Segregation of duties — cashier vs sales groups.",
    deskRisk: "One mega-group with all perms.",
    dataFlow: "Group → Permissions → agent assignment.",
    whoUses: "Owner.",
    upstream: ["desks"],
    downstream: ["permissions", "auto_assign"],
    operatorTraps: ["Renaming group without updating Auto Assign rules"],
  }),
  desks: block("desks", "Systems", {
    surface: "Regional / language floors — German, UK, LATAM.",
    operations: "Align Auto Assign country rules with desk language.",
    compliance: "Route clients to licensed language coverage.",
    deskRisk: "Spanish lead on English-only desk.",
    dataFlow: "Signup geo/lang → Auto Assign → desk_team.",
    whoUses: "Owner, floor managers.",
    upstream: ["countries"],
    downstream: ["desk_team", "hot_leads"],
    operatorTraps: ["Desk exists but no agents assigned"],
  }),
  access_keys: block("access_keys", "Systems", {
    surface: "Sub-admin overrides — per-user API and screen scope.",
    operations: "Use for one-off scopes; default remains Groups + Permissions.",
    compliance: "Document why sub-admin differs from group.",
    deskRisk: "Orphan sub-admin after agent leaves.",
    dataFlow: "User → Access Keys → effective perm union.",
    whoUses: "Owner only.",
    upstream: ["permissions"],
    downstream: [],
    operatorTraps: ["Duplicating full owner perms on sub-admin"],
  }),
  brand_dna: block("brand_dna", "Systems", {
    surface: "White-label name, links, public branding.",
    operations: "Save after legal approves site copy; flush cache from Configuration if stale.",
    compliance: "Misleading brand URLs = marketing compliance issue.",
    deskRisk: "CRM shows old brand while site updated — operator confusion.",
    dataFlow: "Brand DNA → public site + CRM shell.",
    whoUses: "Owner, marketing.",
    upstream: [],
    downstream: ["aria"],
    operatorTraps: ["Changing go-live URL without updating Tracking pixels"],
  }),
  auto_assign: block("auto_assign", "Systems", {
    surface: "Inbound routing rules — country, language, promo, round-robin.",
    operations: "Top rule wins — drag order; manual assign still in Hot Leads.",
    compliance: "Fair distribution policies — document rule changes.",
    deskRisk: "Promo code rule sends VIP leads to junior agent.",
    dataFlow: "Signup → Auto Assign → desk_team on Client File.",
    whoUses: "Owner, sales manager.",
    upstream: ["promo_codes", "desks"],
    downstream: ["hot_leads", "desk_team"],
    operatorTraps: ["Deleting promo before removing Auto Assign row"],
  }),
  spread: block("spread", "Systems", {
    surface: "Tier markup matrix per asset class.",
    operations: "Check Client File Trading override after tier change.",
    compliance: "Spread changes need client comms on regulated markets.",
    deskRisk: "VIP tier left on demo spread — revenue leak.",
    dataFlow: "Account Type tier → Spread → client ticket cost.",
    whoUses: "Dealing desk, owner.",
    upstream: ["account_types"],
    downstream: ["live_book"],
    operatorTraps: ["Editing spread without checking open positions PnL impact messaging"],
  }),
  payment_gateways: block("payment_gateways", "Systems", {
    surface: "PSP credentials and deposit rails.",
    operations: "When Payment Radar red — fix here first; then Min/Max Deposits.",
    compliance: "PCI scope — credentials only on VPS, never in chat.",
    deskRisk: "Wrong gateway currency = Pending In stuck.",
    dataFlow: "Gateway config → client checkout → Pending In.",
    whoUses: "Owner, finance IT.",
    upstream: ["min_max_deposits"],
    downstream: ["pending_in", "payment_radar"],
    operatorTraps: ["Rotating API key without testing small deposit"],
  }),
  dynamic_status: block("dynamic_status", "Systems", {
    surface: "Automated pipeline When→Then on balance/activity.",
    operations: "Test rule on sandbox client before production.",
    compliance: "Auto status changes need audit trail — Event Logs.",
    deskRisk: "Rule loops client between statuses — retention chaos.",
    dataFlow: "Balance event → rule → client status field.",
    whoUses: "Owner, CRM architect.",
    upstream: ["client_statuses", "credits_in"],
    downstream: ["all_clients"],
    operatorTraps: ["Conflicting rules with manual bulk status"],
  }),
  client_statuses: block("client_statuses", "Systems", {
    surface: "Pipeline labels, colours, live counts.",
    operations: "Click count → All Clients filtered; align with Dynamic Status.",
    compliance: "Status names visible to agents — avoid misleading labels.",
    deskRisk: "Too many statuses — floor ignores pipeline.",
    dataFlow: "Status definition → All Clients dropdown → reporting.",
    whoUses: "Owner, sales manager.",
    upstream: [],
    downstream: ["all_clients", "dynamic_status"],
    operatorTraps: ["Deleting status still assigned to thousands of rows"],
  }),
  event_logs: block("event_logs", "Systems", {
    surface: "Immutable CRM audit — who changed what on which client.",
    operations: "First stop on 'who moved my balance/status'.",
    compliance: "Regulatory discovery backbone.",
    deskRisk: "Operators bypass logging with shared login — culture issue.",
    dataFlow: "Admin action → event_logs row.",
    whoUses: "Owner, compliance.",
    upstream: ["*"],
    downstream: [],
    operatorTraps: ["Only checking History Logs (annotations) vs Event Logs (facts)"],
  }),
  settings: block("settings", "Systems", {
    surface: "Platform hub linking Brand, commissions, deposits, access.",
    operations: "New hire tour: Settings map → then deep screen.",
    compliance: "Hub is navigation — changes happen on leaf pages.",
    deskRisk: "Owner forgets Configuration kill-switch under hub shadow.",
    dataFlow: "Settings cards → leaf system routes.",
    whoUses: "Owner, platform admin.",
    upstream: [],
    downstream: ["brand_dna", "payment_gateways", "permissions"],
    operatorTraps: ["Thinking Settings saved child page changes automatically"],
  }),
  aria: block("aria", "Pulse", {
    surface: "Public site concierge — captures leads, no trading advice.",
    operations: "You route captures in Hot Leads; Aria never closes trades.",
    compliance: "Public disclaimer on every reply.",
    deskRisk: "Flooded inbox if Aria over-promises callback time.",
    dataFlow: "Visitor chat → lead row → Hot Leads.",
    whoUses: "Public visitors; operators manage outcomes.",
    upstream: ["campaigns"],
    downstream: ["hot_leads"],
    operatorTraps: ["Blaming Aria for CRM assign delay"],
  }),
  security_console: block("security_console", "Security", {
    surface: "Owner security hub — health pills, license, tenant, DNS/SSL quick links, JSON export.",
    operations: "Monday review: refresh dashboard → export report → spot amber before ad scale.",
    compliance: "Archive exports for SOC2-style access reviews; no secrets in JSON.",
    deskRisk: "Expired SSL or wrong DNS during $1M month = signup leak and chargeback spike.",
    dataFlow: "VPS probes → /api/admin/security/* → cards → perimeter/DNS/SSL tools.",
    whoUses: "Broker owner, CTO, compliance officer.",
    upstream: ["settings"],
    downstream: ["security_perimeter", "event_logs"],
    operatorTraps: ["Ignoring staff IP lock after opening admin worldwide", "Skipping cert check after subdomain move"],
  }),
  security_perimeter: block("security_perimeter", "Security", {
    surface: "Your IP vs owner/staff allowlists and VPS egress.",
    operations: "Traveling? Check green pill before flight; add IP under Session & IP lock.",
    compliance: "Document allowlist changes in History Logs notes.",
    deskRisk: "Owner locked out mid-settlement window if office IP changes unnoticed.",
    dataFlow: "Request headers → perimeter API → allowlist match → Session settings edit.",
    whoUses: "Owner, IT admin.",
    upstream: ["security_console"],
    downstream: ["access_keys"],
    operatorTraps: ["Forgetting .env ADMIN_IP_ALLOWLIST overrides UI list", "Confusing VPS IP with office IP"],
  }),
};

export const HERMES_MODULE_COUNT = Object.keys(HERMES_DEPTH_BY_MODULE).length;

export function hermesBlockForModuleId(moduleId: string): HermesDepthBlock | null {
  return HERMES_DEPTH_BY_MODULE[moduleId] ?? null;
}

export function formatHermesDepthReply(
  moduleId: string,
  opts?: { layer?: HermesLayer | "full"; includeInterconnect?: boolean },
): string | null {
  const b = HERMES_DEPTH_BY_MODULE[moduleId];
  if (!b) return null;
  const layer = opts?.layer ?? "full";
  const lines: string[] = [
    `HERMES — ${b.label} (${b.umbrella})`,
    `Path: ${b.path}`,
    "",
    `Data flow: ${b.dataFlow}`,
    `Who: ${b.whoUses}`,
  ];
  if (layer === "surface" || layer === "full") lines.push("", `Surface: ${b.surface}`);
  if (layer === "operations" || layer === "full") lines.push(`Operations: ${b.operations}`);
  if (layer === "compliance" || layer === "full") lines.push(`Compliance: ${b.compliance}`);
  if (layer === "deskRisk" || layer === "full") lines.push(`Desk risk: ${b.deskRisk}`);
  if (opts?.includeInterconnect !== false && (layer === "full" || layer === "operations")) {
    lines.push("", `Upstream: ${b.upstream.map(modLabel).join(" → ")}`);
    lines.push(`Downstream: ${b.downstream.map(modLabel).join(" → ")}`);
  }
  if (b.operatorTraps.length) {
    lines.push("", "Operator traps:");
    b.operatorTraps.forEach((t) => lines.push(`• ${t}`));
  }
  lines.push("", `Say "${b.digDeeperPrompt}" or "teach me ${b.label.toLowerCase()}" to add the next layer.`);
  return lines.join("\n");
}

/** Match teach / dig / hermes intents → module id */
export function matchHermesTeachModule(message: string): string | null {
  const m = message.toLowerCase().trim().replace(/[^\w\s'?/-]/g, " ");
  const teach = m.match(/^(?:teach me|hermes teach|master)\s+(.+?)(?:\?|$)/);
  const dig = m.match(/^(?:dig deeper on|go deeper on|deep dive)\s+(.+?)(?:\?|$)/);
  const hermes = m.match(/^hermes\s+(.+?)(?:\?|$)/);
  const needle = (teach?.[1] ?? dig?.[1] ?? hermes?.[1] ?? "").trim();
  if (!needle) {
    if (/^hermes\b/.test(m) && !hermes?.[1]) return "street_ai";
    return null;
  }
  let best: { id: string; len: number } | null = null;
  for (const [id, b] of Object.entries(HERMES_DEPTH_BY_MODULE)) {
    const labels = [b.label.toLowerCase(), id.replace(/_/g, " ")];
    for (const lbl of labels) {
      if (lbl.length < 3) continue;
      if (needle.includes(lbl) || lbl.includes(needle)) {
        if (!best || lbl.length > best.len) best = { id, len: lbl.length };
      }
    }
  }
  return best?.id ?? null;
}
