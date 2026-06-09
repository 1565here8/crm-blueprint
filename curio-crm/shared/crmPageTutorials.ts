export type GuideBlock = {
  title: string;
  what: string;
  how: string;
  when?: string;
  detail?: string;
};

export type PageTutorial = {
  title: string;
  firstDaySummary: string;
  blocks: GuideBlock[];
};

function t(
  title: string,
  firstDaySummary: string,
  what: string,
  how: string,
  when?: string,
): PageTutorial {
  return {
    title,
    firstDaySummary,
    blocks: [{ title: "Quick guide", what, how, when }],
  };
}

function multi(title: string, firstDaySummary: string, blocks: GuideBlock[]): PageTutorial {
  return { title, firstDaySummary, blocks };
}

/** Living guides keyed by admin route (longest match wins). */
export const crmPageTutorials: Record<string, PageTutorial> = {
  // ── KNOWME & PULSE ──────────────────────────────────────────────
  "/admin/knowme": multi(
    "KNOWME",
    "Your training room. Picture cards show how a visitor becomes a funded trader. The chat answers in plain English and blue links jump you to the right screen.",
    [
      {
        title: "Visual Flows",
        what: "Five picture cards: sign-up path, affiliates, card deposits, lead assignment, and click-to-call.",
        how: "Tap the dots at the bottom to move between cards. Read all five on your first day.",
        when: "Before you take live leads or approve your first deposit.",
      },
      {
        title: "Ask KNOWME",
        what: "Chat that knows every CurioCRM menu. Ask “where do I approve deposits?” and it points to [[pending_in|Pending In]].",
        how: "Type a short question or tap a starter chip. Built-in guides answer first; [[street_ai|Wallstreet AI]] adds depth when online.",
        when: "You are stuck and do not want to interrupt a senior agent.",
      },
      {
        title: "Blue wiki links",
        what: "Blue words are links — tap them to open another CRM section, like Wikipedia links between articles.",
        how: "Follow a link, read that page’s living guide at the bottom, then use the sidebar to come back.",
        when: "Learning the golden path: [[hot_leads|Hot Leads]] → [[all_clients|All Clients]] → [[pending_in|Pending In]] → [[credits_in|Credits In]].",
      },
      {
        title: "Broker packs",
        what: "Install tiers for brokers who want this stack on their own server.",
        how: "Owners: open Broker packs, pick Desk Pro, walk the 15-minute CEO proof script.",
        when: "Sales demo or planning server size for a new desk.",
      },
    ],
  ),
  "/admin": multi(
    "Mission Control",
    "Start every shift here. Three questions: Did anyone new sign up? Did money move? Does anything need me before I open a [[all_clients|client file]]?",
    [
      {
        title: "Morning routine",
        what: "A dashboard that adds up sign-ups, deposits, bonuses, withdrawals, and trades for the dates you pick. You read numbers here — you do not edit clients here.",
        how: "Step 1: pick Today. Step 2: read the summary cards. Step 3: people to call → [[hot_leads|Hot Leads]]. Money stuck → [[pending_in|Pending In]]. Client on the phone → [[all_clients|All Clients]].",
        when: "First five minutes after every login.",
        detail: "Tap a blue link or ask [[street_ai|Wallstreet AI]]: “explain the deposits card.”",
      },
    ],
  ),
  "/admin/online": t(
    "Live Floor",
    "See who is on the public website right now — useful before you call someone who is browsing.",
    "A live list of visitors on your site.",
    "Watch it refresh. If you recognize an email, open their file in [[all_clients|All Clients]] and call while they are online.",
    "Proactive sales — strike while they are on the site.",
  ),
  "/admin/desk/leads": t(
    "Hot Leads",
    "People who left their name on the website and want a human callback. This is your morning inbox.",
    "Each row is one lead from the site chat.",
    "Work oldest first. Call or email, then update status in [[all_clients|All Clients]] so the next agent knows you spoke to them.",
    "Right after [[mission_control|Mission Control]] every morning — try to clear this before lunch.",
  ),
  "/admin/desk/tasks": t(
    "Action Queue",
    "Your personal to-do list inside the CRM — tasks from managers or from [[street_ai|Wallstreet AI]].",
    "A ordered list of jobs assigned to you.",
    "Work from top to bottom. Mark done when finished.",
    "When you are not sure what to do next on shift.",
  ),
  "/admin/desk/psp-health": t(
    "Payment Radar",
    "Health check for card and wire deposit rails. Open when a client says “my deposit failed.”",
    "Green means the payment partner is responding. Red or old timestamps mean something broke upstream.",
    "Check here before you reject a row in [[pending_in|Pending In]] — the client may have paid but the webhook is late.",
    "Whenever deposit complaints spike, or Monday after a quiet weekend.",
  ),
  "/admin/desk": multi("Wallstreet AI", "Your desk coach. Ask about clients, money, menus, or what to do next — in normal sentences.", [
    {
      title: "Talk normally",
      what: "AI that knows CurioCRM menus, workflows, and desk habits.",
      how: 'Try: "morning routine" · "explain [[pending_in|Pending In]]" · "open [[live_book|Live Book]]".',
      when: "Training day, or when a process is unclear.",
    },
    {
      title: "It knows the house",
      what: "Wallstreet AI lives inside this CRM — not a separate chat tab.",
      how: "Ask for step-by-step help, then follow the blue links in the reply or living guide at the page bottom.",
      when: "You want a second pair of eyes before approving money or closing a trade.",
    },
  ]),

  // ── USERS ───────────────────────────────────────────────────────
  "/admin/crm/users": multi(
    "All Clients",
    "The phone book of everyone who registered. Search here whenever a client calls, emails, or chats.",
    [
      {
        title: "Find anyone",
        what: "One table: email, pipeline status, assigned agent, balance hints.",
        how: "Search or filter, then click a row for the full [[client_file|Client File]] — money, trades, notes.",
        when: "Support calls, or after working [[hot_leads|Hot Leads]].",
      },
      {
        title: "Bulk actions",
        what: "Select rows to assign an owner, change status, or export.",
        how: "Tick checkboxes → use the green toolbar at the top → confirm.",
        when: "Moving books between agents on [[desk_team|Desk Team]].",
      },
    ],
  ),
  "/admin/crm/users/": multi("Client File", "One person’s full story — profile, money, trades, notes, and documents in tabs.", [
    {
      title: "Work one client",
      what: "Everything about a single client in one place.",
      how: "Change status or owner on the profile tab. Log a note after every call. Money tab links to [[pending_in|Pending In]] history.",
      when: "Any task that starts with “this client called about…”",
    },
    {
      title: "Handoffs",
      what: "The next agent should not start from zero.",
      how: "Read [[intel_notes|Intel Notes]] and the note timeline before you call back.",
      when: "Shift change or escalation to retention.",
    },
  ]),
  "/admin/crm/depositors": t(
    "Funded Accounts",
    "Clients who already deposited — your “money on the table” list for retention and upsell.",
    "Filtered view where balance is greater than zero.",
    "Sort by last deposit. Prioritize clients who funded but stopped trading.",
    "Retention campaigns and re-activation calls.",
  ),
  "/admin/crm/agents": t(
    "Desk Team",
    "Everyone on the sales and support floor who logs into this CRM.",
    "Roster with agent name and how many clients each person owns.",
    "To assign: [[all_clients|All Clients]] → select rows → Assign owner. Or edit the Agent column on a [[client_file|Client File]].",
    "Hiring, load balancing, or moving books between reps.",
  ),
  "/admin/crm/sales-report": t(
    "Scoreboard",
    "Who hit targets this week — deposits, calls, and conversions by agent.",
    "KPI table for the date range you pick.",
    "Run the report Monday morning; export if payroll needs it.",
    "Team meetings and commission checks.",
  ),
  "/admin/crm/notes": t(
    "Intel Notes",
    "Sticky notes agents left on clients across the whole desk — not the same as [[comms_log|Comms Log]].",
    "Searchable feed of client notes.",
    "Read before calling someone another agent already spoke to.",
    "Shift handoffs.",
  ),
  "/admin/crm/emails": t(
    "Comms Log",
    "Record of emails staff logged inside the CRM — not your mail server inbox.",
    "Proof an agent emailed a client for internal audit.",
    "Log outbound after you send from Outlook or Gmail.",
    "Compliance asks for communication proof.",
  ),
  "/admin/crm/calendar": t(
    "Schedule",
    "Callbacks and follow-ups you promised clients.",
    "Calendar of return-call appointments.",
    "Set a callback when the client says “call me Tuesday at 3.”",
    "So you never miss a promise.",
  ),

  // ── MONEY ───────────────────────────────────────────────────────
  "/admin/cashier/deposit-requests": t(
    "Pending In",
    "Money waiting for your yes or no. Every client deposit attempt lands here until staff approve it.",
    "One row per deposit try. Check KYC and notes on the [[client_file|Client File]] first.",
    "Approve to credit the balance (shows on [[credits_in|Credits In]]). Reject with a short reason if something looks wrong.",
    "Several times daily — stale rows mean angry clients.",
  ),
  "/admin/cashier/deposits": t(
    "Credits In",
    "History of deposits that already hit client balances — the “after approval” view.",
    "Read-only list of inbound money.",
    "Match rows against [[pending_in|Pending In]] when reconciling. Disputes → also check [[full_ledger|Full Ledger]].",
    "Accounting questions or “where is my deposit?” tickets.",
  ),
  "/admin/cashier/withdrawals": t(
    "Payouts",
    "Money leaving client accounts — processed withdrawals and debits.",
    "Outbound money history.",
    "Confirm identity on large amounts before approving wires in [[wire_queue|Wire Queue]].",
    "Withdrawal disputes.",
  ),
  "/admin/cashier/wire-req": t(
    "Wire Queue",
    "Bank wire withdrawal requests that need a human review.",
    "Higher-touch than card payouts — bank details matter.",
    "Verify bank info, approve in order received, log notes on the [[client_file|Client File]].",
    "Wire-specific compliance and large payouts.",
  ),
  "/admin/cashier/bonuses": t(
    "Rewards",
    "Promotional bonus credits — marketing incentives posted as balance.",
    "Bonus money separate from real deposits.",
    "Issue from a [[client_file|Client File]] or tie to [[promo_codes|Promo Code]] campaigns.",
    "Promo redemption and retention offers.",
  ),
  "/admin/cashier/adjustments": t(
    "Balance Fixes",
    "One-off credits or debits when normal deposit or payout flows do not fit.",
    "Manual correction with a reason note — every row hits [[full_ledger|Full Ledger]].",
    "Add a ticket id in the note. Get manager approval for large amounts.",
    "Reconciliation mismatch or PSP posted the wrong amount.",
  ),
  "/admin/cashier/ledger": t(
    "Full Ledger",
    "Every penny in and out — the master money trail for the whole platform.",
    "Complete transaction log.",
    "Filter by client or date when investigating balance disputes. Pair with [[balance_events|Balance events]].",
    "Finance audit or regulator request.",
  ),
  "/admin/trading/open-trades": t(
    "Live Book",
    "Open positions right now — you can close or adjust risk from here.",
    "Real-time trading exposure per client.",
    "Sort by size. Intervene if a client is over-leveraged. Check [[desk_management|Desk Management]] for house view.",
    "Volatile markets or margin call spikes.",
  ),
  "/admin/trading/trades": t(
    "Closed Book",
    "History of filled and closed orders.",
    "Past trades for support tickets.",
    "Search by ticket or symbol when a client disputes a fill.",
    "Trade dispute calls.",
  ),
  "/admin/trading/net-positions": t(
    "Desk Management",
    "Total exposure by symbol — what the whole book is carrying right now.",
    "House risk overview aggregated across clients.",
    "Watch concentrated symbols before market events.",
    "Risk meetings with the desk lead.",
  ),
  "/admin/trading/assets": t(
    "Instruments",
    "List of symbols clients can trade and their settings.",
    "Product catalog for the terminal.",
    "Enable or disable symbols. Link to [[market_clock|Market Clock]] for session hours.",
    "Adding or pausing tradable products.",
  ),
  "/admin/trading/activity-hours": t(
    "Market Clock",
    "When each market opens and closes.",
    "Session status by asset class.",
    "Check here before telling a client why an order was rejected.",
    "Holidays and off-hours support.",
  ),

  // ── AGENTS HUB ──────────────────────────────────────────────────
  "/admin/automation": multi(
    "Automation Studio",
    "Build follow-up sequences — who gets emailed, when, and what happens if they deposit or go quiet.",
    [
      {
        title: "What it does",
        what: "Trigger → wait → branch → action flows for leads and funded clients.",
        how: "Create a sequence, pick a trigger (new lead, first deposit, idle 7 days), add steps, submit for approval if your desk requires it.",
        when: "Scaling outreach without every agent remembering manual follow-ups.",
      },
      {
        title: "Safety",
        what: "Automations touch real clients — test on a sandbox group first.",
        how: "Start with one small [[groups|Group]]. Watch [[event_logs|Event Logs]] after the first run.",
        when: "Before turning on a sequence for the whole floor.",
      },
    ],
  ),
  "/admin/integrations": multi(
    "Integration Hub",
    "Catalog of trading, payment, KYC, and comms connectors — what is live on your server vs API-ready.",
    [
      {
        title: "Read the badges",
        what: "Green = wired on this VPS. Amber = API exists, finish config in [[settings|Settings]] or with your dev.",
        how: "Click a card for setup notes and links to [[payment_gateways|Payment Gateways]] or [[api_docs|API Docs]].",
        when: "Onboarding a new PSP or trading bridge.",
      },
    ],
  ),

  // ── MARKETING ───────────────────────────────────────────────────
  "/admin/marketing/campaigns": t(
    "Campaigns",
    "Where your leads come from — Facebook, Google, affiliates, and custom UTMs.",
    "Acquisition sources with tracking URLs.",
    "Create a campaign, copy the URL, give it to partners. Numbers here feed [[attribution|Attribution]] pixels.",
    "Launching new acquisition.",
  ),
  "/admin/marketing/partners-hq": multi(
    "Partners HQ",
    "Command center for IB partners — deals, links, and performance in one place.",
    [
      {
        title: "Partner lifecycle",
        what: "Create ally → assign campaigns → share tracking URL → watch signups in [[all_clients|All Clients]].",
        how: "Start on Partners HQ, drill into a partner card, jump to [[campaigns|Campaigns]] for UTM links.",
        when: "New IB onboarding or monthly partner review.",
      },
    ],
  ),
  "/admin/marketing/partners": t(
    "Allies",
    "Affiliate and IB partners who send traffic to your site.",
    "Partner roster with revshare deals.",
    "Create the partner before sharing links. Prefer Partners HQ in the sidebar for the full command view.",
    "New affiliate onboarding.",
  ),
  "/admin/marketing/trackers": t(
    "Attribution",
    "Pixels and postbacks so ad platforms know when someone registered or deposited.",
    "Conversion tracking snippets.",
    "Paste pixel code, test with a fake signup, confirm the hit in [[campaigns|Campaigns]].",
    "Performance marketing setup.",
  ),
  "/admin/marketing/api-keys": t(
    "Integrations",
    "API keys for machines that import leads — not for human agents.",
    "Secure tokens for external systems.",
    "Rotate keys if leaked. Never paste keys in chat or email.",
    "Connecting a landing page to [[oauth|OAuth]] or lead API.",
  ),
  "/admin/marketing/campaign-pivot": t(
    "Campaign Pivot",
    "Cross-campaign reporting — preview module. Use [[campaigns|Campaigns]] and [[attribution|Attribution]] for live data today.",
    "Future reporting hub.",
    "Open Campaigns for UTM links; Attribution for pixels until Pivot ships.",
    "Comparing channel performance.",
  ),
  "/admin/marketing/affiliate-managers": t(
    "Affiliate Managers",
    "Desk owners for affiliate relationships — planned module.",
    "Use Partners HQ and [[allies|Allies]] for partner roster today.",
    "Create partner in Allies, share campaign URLs from [[campaigns|Campaigns]].",
    "New IB onboarding.",
  ),
  "/admin/marketing/push-to-web": t(
    "Push To Web",
    "Web push notification campaigns — planned.",
    "Use [[campaigns|Campaigns]] + [[attribution|Attribution]] for acquisition until push is live.",
    "Test signups with [[live_floor|Live Floor]] to see visitors in real time.",
    "Mobile and web promo pushes.",
  ),
  "/admin/funding": t(
    "Funding",
    "Old bookmark — now sends you to [[pending_in|Pending In]].",
    "Deposit requests waiting for approval.",
    "Open Pending In under Money in the sidebar.",
    "Following an old link to /admin/funding.",
  ),

  // ── SYSTEMS HUB ─────────────────────────────────────────────────
  "/admin/settings": multi("Settings", "One front door to every config screen — branding, fees, deposits, pipeline, and access.", [
    {
      title: "Why this page",
      what: "Brokers need a map when they cannot find a toggle.",
      how: "Click a section card to jump — Brand, Commissions, Deposits, Pipeline, Access, Owner tools.",
      when: "First day as admin or after a rebrand.",
    },
    {
      title: "Owner badges",
      what: "Amber Owner cards need the primary admin login.",
      how: "Other cards respect sub-admin permissions from [[access_keys|Access Keys]].",
      when: "Onboarding a desk manager who should not see kill-switches.",
    },
  ]),
  "/admin/system/common/countries": t(
    "Countries",
    "Which countries may visit, register, and trade on your platform.",
    "Geo gates with phone prefixes per country.",
    "Toggle allow or deny per row; save each change.",
    "Expanding to new regions or blocking high-risk geos.",
  ),
  "/admin/system/common/preferences": t(
    "Preferences",
    "Platform-wide toggles — default currency, timezone, feature flags.",
    "Defaults that affect the whole broker.",
    "Search the list, edit inline, save the row.",
    "Changing desk-wide behavior.",
  ),
  "/admin/system/common/release-pdf": t(
    "Release Pdf",
    "Optional link to a compliance PDF staff can open.",
    "Document URL for release notes or policy PDF.",
    "Paste an HTTPS link to the latest PDF.",
    "Regulator asks for version proof.",
  ),
  "/admin/system/common/branding": t(
    "Brand DNA",
    "Name shown in the CRM sidebar and link back to the public site.",
    "White-label identity for your broker.",
    "Set CRM brand name and public site URL; save.",
    "Rebrand launch.",
  ),
  "/admin/system/permissions": multi("Permissions", "What each desk [[groups|Group]] may see in the sidebar and call via API.", [
    {
      title: "Pick a group",
      what: "Sales, retention, and support teams each get their own checkbox matrix.",
      how: "Choose group → CRM or API tab → toggle switches → Save.",
      when: "Launch day or when a team should lose System access.",
    },
    {
      title: "CRM vs API",
      what: "CRM toggles control the admin sidebar. API toggles control partner REST hooks.",
      how: "Search categories on the left. Use Select all / Clear all before saving.",
      when: "Hiding [[pending_in|Pending In]] and cashier menus from junior reps or tightening affiliate API.",
    },
    {
      title: "Synced with Groups",
      what: "Same group list as System → [[groups|Groups]].",
      how: "Click a group name on Groups to land here with that group selected.",
      when: "Jumping from the groups table into edits.",
    },
    {
      title: "One-off overrides",
      what: "Individual sub-admin keys live on [[access_keys|Access Keys]], not here.",
      how: "Promote one senior rep without opening manager menus for the whole floor.",
      when: "One agent needs extra rights temporarily.",
    },
  ]),
  "/admin/system/team-permissions": multi("Sub-admins & Access Keys", "Who may see clients, money, and system tools.", [
    {
      title: "Least privilege",
      what: "New hires should not see Configuration or kill-switches.",
      how: "Create sub-admin, pick a preset or custom checkboxes, save.",
      when: "First day for a new agent or cashier.",
    },
  ]),
  "/admin/system/payment-gateways": t(
    "Payment Gateways",
    "Card and crypto processor credentials — where deposits actually route.",
    "PSP keys and endpoints.",
    "Owner only. Wrong keys stop all [[pending_in|Pending In]] traffic. Pair with [[payment_radar|Payment Radar]].",
    "Adding a new PSP or rotating API keys.",
  ),
  "/admin/system/configuration": multi("Configuration", "Owner maintenance — cache flush, phone refresh, tenant gate. Read before you click.", [
    {
      title: "Affects everyone",
      what: "Buttons here touch the whole platform, not one client.",
      how: "Screenshot the living guide first. Only run what vendor support or [[street_ai|Wallstreet AI]] told you to run.",
      when: "Support ticket says flush cache or refresh desk phones.",
    },
  ]),
  "/admin/system/error-logs": t(
    "Error Logs",
    "When the server threw an error — not a user clicking wrong.",
    "Technical diagnostic stream.",
    "Copy the newest row to your platform owner or host support.",
    "Pages show server glitch messages or blank data.",
  ),
  "/admin/system/smtp-logs": t(
    "SMTP Logs",
    "Outbound email delivery attempts if mail is configured on the server.",
    "Did the password-reset email actually send?",
    "Check failed rows; fix From address at your mail host.",
    "Client never received system email.",
  ),
  "/admin/system/balance-events": t(
    "Balance events",
    "Every wallet change with before and after amounts.",
    "Money audit passbook at the field level.",
    "Filter by client or date. Flag suspicious rows before posting [[balance_fixes|Balance Fixes]].",
    "Balance dispute — “my balance was X yesterday.”",
  ),
  "/admin/system/history-logs": t(
    "History Logs",
    "Who changed client status, owner, or profile fields.",
    "Operator audit trail with annotations.",
    "Filter by agent or client id; export for compliance.",
    "He-said she-said on a status change.",
  ),
  "/admin/system/order-storage-logs": t(
    "Order Storage Logs",
    "Trade sync between CRM and the execution engine.",
    "Diagnostic when [[live_book|Live Book]] does not match the terminal.",
    "Note timestamp and escalate to tech if positions mismatch.",
    "Client sees a trade the desk does not.",
  ),
  "/admin/system/tracking": t(
    "Tracking",
    "Global marketing snippets — older site-wide pixels.",
    "Prefer [[attribution|Attribution]] for new pixel work.",
    "Read-only reference until fully migrated.",
    "Auditing legacy pixels still firing on the public site.",
  ),
  "/admin/system/api-docs": t(
    "API Docs",
    "REST endpoints for developers connecting external systems.",
    "Integration reference for machines.",
    "Copy base URL and auth method. Keys live under [[integrations|Integrations]] and [[oauth|OAuth]].",
    "Partner dev asks how to post leads.",
  ),
  "/admin/system/oauth": multi("OAuth Clients", "API credentials for affiliates and partners who post leads — not Google login.", [
    {
      title: "Client row",
      what: "Each partner gets a Public Id and secret. Campaign ids list which campaign numbers they may use.",
      how: "Create client, copy Public Id + secret once, send to the partner developer.",
      when: "Onboarding a new affiliate feed.",
    },
    {
      title: "Disabled badge",
      what: "Red = blocked from API. Green = active.",
      how: "Disable without deleting history if terms were breached.",
      when: "Partner integration is broken or abusive.",
    },
    {
      title: "Campaign ids",
      what: "Comma-separated numbers from [[campaigns|Campaigns]].",
      how: "Wrong ids mean leads land in the wrong funnel or get rejected.",
      when: "Partner says leads are not appearing.",
    },
  ]),
  "/admin/system/groups": multi("Groups", "Desk role buckets — admin, rep, retention, affiliate, and more.", [
    {
      title: "Permission templates",
      what: "Each group defines what agents in that role may do.",
      how: "Search table → click group name → opens [[permissions|Permissions]] matrix.",
      when: "Onboarding a new floor or splitting conversion vs retention.",
    },
    {
      title: "Seeded groups",
      what: "admin, regular, manager, support, rep, affiliate, rep-conversion, Conversion Manager, rep-retention, Retention Manager.",
      how: "Stable ids — use in [[auto_assign|Auto Assign]] rules.",
      when: "Migrating role names from an older CRM.",
    },
  ]),
  "/admin/system/desks": multi("Desks", "Language and region floors — who sees which clients.", [
    {
      title: "Territory split",
      what: "German Desk works DACH leads; LATAM handles Spanish traffic.",
      how: "Create desk, set region + timezone + language, assign agents.",
      when: "Hiring bilingual teams or opening a new geo.",
    },
    {
      title: "Client counts",
      what: "Clients tagged to the desk plus clients owned by desk agents.",
      how: "Click desk → View clients in [[all_clients|All Clients]] filtered.",
      when: "Auditing load per language team.",
    },
    {
      title: "Groups vs Desks",
      what: "[[groups|Groups]] control permissions. Desks control which clients agents see.",
      how: "Map role in Permissions; map territory here.",
      when: "Rep needs retention menus on the UK floor.",
    },
  ]),
  "/admin/system/event-logs": multi("Event Logs", "Flight recorder for the CRM — who clicked what, on which client, and what changed.", [
    {
      title: "Date window",
      what: "Top bar sets UTC date range. Events outside the window are hidden.",
      how: "Set Date from / Date to → Search. Clock shows server time.",
      when: "Monday: “what happened on this lead over the weekend?”",
    },
    {
      title: "Filters",
      what: "Type, agent, client email, status change, CRM id, and comment narrow the table.",
      how: "Advanced filters for fine date bounds. Export respects filters.",
      when: "Compliance wants every status change by agent X on client Y.",
    },
    {
      title: "Read a row",
      what: "One action per line: login, status change, deposit note, owner change, etc.",
      how: "Click client name to jump to [[client_file|Client File]]. Prev/New on field edits.",
      when: "Dispute: “my status was Callback, not No answer.”",
    },
    {
      title: "Export",
      what: "CSV download up to 5,000 filtered rows.",
      how: "Export CSV in header — share with compliance.",
      when: "Monthly archive or regulator request.",
    },
  ]),
  "/admin/system/forex-commissions": t(
    "Forex Commissions",
    "Fixed per-side FX fees by tier and currency — house revenue on every forex trade.",
    "Tier × currency matrix.",
    "Edit cells, Save row. Coordinate with [[spread|Spread]] and [[account_types|Account Types]] before cutting VIP tiers.",
    "Changing house take on FX.",
  ),
  "/admin/system/crypto-commissions": t(
    "Crypto Fees",
    "Fixed per-side crypto fees by tier and wallet currency.",
    "Tier 0–4 × currency matrix.",
    "Edit cells with currency prefix, then Update. Coordinate with risk before cutting VIP crypto fees.",
    "Changing house take on crypto.",
  ),
  "/admin/system/spread": t(
    "Spread",
    "Markup matrix by tier — saved rows apply platform-wide unless a client override exists.",
    "Spread Trades tab for % or pip cells. Exchange tab for percent markup.",
    "Owner-level — coordinate with risk before widening retail tiers.",
    "VIP reprice or new product launch.",
  ),
  "/admin/system/min-max-deposits": t(
    "Deposit Limits",
    "Minimum and maximum deposit per currency, PSP, and region.",
    "Blocks micro-deposits and caps amounts above KYC capacity.",
    "Set sensible floors on card PSPs. Use Show for plain-English rule text before editing.",
    "Fraud spike or new PSP onboarding.",
  ),
  "/admin/system/notifications": multi("Notifications", "Per-agent alert matrix — email, push, and in-app bell.", [
    {
      title: "Floor agents",
      what: "Sales reps on [[hot_leads|Hot Leads]] do not need email on every lead.",
      how: "Select member → turn Email off → keep In-app on → Save.",
      when: "First-day setup for a sales desk.",
    },
    {
      title: "Copy profiles",
      what: "Clone one agent’s alert profile or reset to desk default.",
      how: "Copy from another agent or Apply desk default, then Save.",
      when: "Hiring a batch with the same alert needs.",
    },
  ]),
  "/admin/system/status": t(
    "Status",
    "Pipeline labels — New, Deposited, Callback, and your custom stages.",
    "Sales funnel colours and counts.",
    "Bulk change from [[all_clients|All Clients]]. Pair with [[dynamic_status|Dynamic Status]] for automation.",
    "Designing your desk pipeline.",
  ),
  "/admin/system/dynamic-status": t(
    "Dynamic Status",
    "Automatic pipeline moves when balance or activity changes.",
    "When → Then rules (example: first deposit → Depositor).",
    "Manual status on [[all_clients|All Clients]] still works without automation.",
    "Reducing manual status updates after funding.",
  ),
  "/admin/system/trading-status": t(
    "Trading Status",
    "Block trading while still allowing login.",
    "Account-level trading freeze rules.",
    "Use [[client_file|Client File]] for one-off blocks today.",
    "Compliance hold or margin breach.",
  ),
  "/admin/system/account-type": t(
    "Account Types",
    "Retail vs VIP vs IB — default leverage, deposit limits, and spread markup for new clients.",
    "Tier definitions for new sign-ups.",
    "Show reads limits in plain English. Edit adjusts leverage and VIP level.",
    "Launching a new VIP tier.",
  ),
  "/admin/system/auto-assign": t(
    "Auto Assign",
    "Route live signups to the right agent — top precedence wins.",
    "Rules by campaign, country, promo, or round-robin.",
    "Put VIP rules at precedence 1. Toggle Active off instead of delete.",
    "New affiliate traffic or desk expansion.",
  ),
  "/admin/system/promo-code": t(
    "Promo Code",
    "Signup codes with optional bonus percent and desk group for routing.",
    "Marketing offers tied to registration.",
    "Add code, set purpose, assign [[groups|Group]]. Remove from [[auto_assign|Auto Assign]] before delete.",
    "Launching a signup promotion.",
  ),

  // ── SECURITY ────────────────────────────────────────────────────
  "/admin/security": multi(
    "Security dashboard",
    "Owner cockpit — platform health, license heartbeat, tenant gate, and exportable compliance snapshot.",
    [
      {
        title: "Start here",
        what: "One screen for safety score, active threats, and infra signals.",
        how: "Scan cards top to bottom. Red items link to the fix screen ([[security_ssl|SSL]], [[security_perimeter|Perimeter]], etc.).",
        when: "Weekly owner check or after a DNS or cert change.",
      },
      {
        title: "Export",
        what: "JSON snapshot for auditors or your host support.",
        how: "Use Export when compliance asks for a point-in-time security report.",
        when: "Quarterly review or incident post-mortem.",
      },
    ],
  ),
  "/admin/security/perimeter": t(
    "My IP & perimeter",
    "Compare your current IP to the office allowlist before you travel or change VPN.",
    "Perimeter check for admin access.",
    "If your IP is not allowlisted, fix [[security/access-settings|Session & IP lock]] before staff abroad get locked out.",
    "Before flying, switching VPN, or moving office.",
  ),
  "/admin/security/dns": t(
    "DNS checker",
    "Resolve A, AAAA, CNAME, MX, TXT, and NS from the VPS — what the world sees.",
    "DNS lookup from the server.",
    "Run after Cloudflare or registrar changes. Compare with an external checker if staff abroad cannot log in.",
    "After pointing admin.curionilabs.com to a new IP.",
  ),
  "/admin/security/ssl": t(
    "SSL / TLS",
    "Certificate expiry and trust chain for admin and public hostnames.",
    "Days-until-expiry countdown.",
    "Renew on the VPS before 14 days remain. Red means browsers will show warnings.",
    "Chrome shows Not secure on admin or signup site.",
  ),
  "/admin/security/infrastructure": t(
    "Server health",
    "Ollama status, vendor license heartbeat, and tenant billing gate.",
    "Is [[street_ai|Wallstreet AI]] and the platform license healthy?",
    "If Ollama is down, instant guides still work; LLM briefs wait. Fix heartbeat before vendor grace expires.",
    "Wallstreet AI silent or 402 errors on admin API.",
  ),
  "/admin/security/threats": t(
    "Threats & safety score",
    "Score 0–100 plus active threats from perimeter, SSL, license, and behavior rules.",
    "Rolling safety grade for the house.",
    "Work red items in order — usually SSL, perimeter, then [[security_behavior|Behavior alerts]].",
    "Score dropped after a config change.",
  ),
  "/admin/security/behavior": t(
    "Behavior alerts",
    "Unusual admin patterns — off-hours login, permission denials, sensitive settings touched.",
    "Phishy or risky staff activity signals.",
    "Investigate row → cross-check [[security_log|Login audit]] and [[event_logs|Event Logs]].",
    "Alert fired overnight or from a new country.",
  ),
  "/admin/security/visitors": t(
    "Visitor watch",
    "IP watchlist and browser fingerprint from User-Agent.",
    "Not hardware serial — browser-level signals only.",
    "Add suspicious IPs after repeated failed logins or scraper traffic.",
    "Brute-force or bot spike on public site.",
  ),
  "/admin/security/endpoints": t(
    "Endpoint alerts",
    "USB and physical events from CurioCRM Endpoint Agent — not the browser.",
    "Workstation policy signals for regulated desks.",
    "Requires agent installed on staff PCs. Browser alone cannot see USB events.",
    "Compliance policy for physical media on dealing desks.",
  ),
  "/admin/security/audit": t(
    "Audit snapshot",
    "Recent staff logins with quick links to full audit trails.",
    "Monday-morning security glance.",
    "Drill into [[security_log|Login audit]] or [[history_logs|History Logs]] for detail.",
    "Weekly compliance stand-up.",
  ),
  "/admin/security/view-log": t(
    "Login audit",
    "Who signed into the CRM, from which IP, and when.",
    "Staff login diary.",
    "Filter by user and dates. Pair with [[security_behavior|Behavior alerts]].",
    "“Who accessed the CRM yesterday?”",
  ),
  "/admin/security/access-settings": t(
    "Session & IP lock",
    "How long staff stay logged in, login attempt limits, and IP allowlists.",
    "Session timeout and lockout rules.",
    "Tighten after a security audit. Loosen carefully before travel.",
    "Shared office PC policy or offshore staff access.",
  ),
  "/admin/system/common/security/view-log": t(
    "View Log",
    "Security diary — staff logins and sensitive actions with IP addresses.",
    "Same data as [[security_log|Login audit]] under the Security zone.",
    "Filter by user id and dates.",
    "Compliance asks who accessed the CRM.",
  ),
  "/admin/system/common/security/settings": t(
    "Session settings",
    "Timeout hours and wrong-password limits for staff consoles.",
    "Protects shared office PCs.",
    "Change numbers and Save — agents may need to log in again.",
    "After a security audit.",
  ),
};

export function getPageTutorial(pathname: string): PageTutorial | null {
  const path = pathname.replace(/\/$/, "") || "/admin";
  if (crmPageTutorials[path]) return crmPageTutorials[path];

  const keys = Object.keys(crmPageTutorials).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.endsWith("/") && path.startsWith(key)) return crmPageTutorials[key];
    if (path.startsWith(key + "/") || path === key) return crmPageTutorials[key];
  }

  return null;
}
