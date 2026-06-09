/** CRM knowledge graph — Wikipedia-style articles for KNOWME / Wallstreet AI. */
import { GLOSSARY, type GlossaryTerm } from "./crmGuideKnowledge";

export type CrmKnowledgeArticle = {
  id: string;
  title: string;
  path: string;
  aliases: string[];
  summary: string;
  bodyParagraphs: string[];
  relatedIds: string[];
  seeAlso: string[];
};

function fromGlossary(id: string, extra: Omit<CrmKnowledgeArticle, "id" | "path" | "aliases"> & { aliases?: string[] }): CrmKnowledgeArticle {
  const g = GLOSSARY[id];
  return {
    id,
    path: g?.path ?? `/admin`,
    aliases: [...(g?.aliases ?? []), ...(extra.aliases ?? []), g?.label.toLowerCase() ?? id].filter(Boolean),
    title: extra.title,
    summary: extra.summary,
    bodyParagraphs: extra.bodyParagraphs,
    relatedIds: extra.relatedIds,
    seeAlso: extra.seeAlso,
  };
}

export const CRM_KNOWLEDGE: Record<string, CrmKnowledgeArticle> = {
  balance_fixes: fromGlossary("balance_fixes", {
    title: "Balance Fixes",
    aliases: ["adjustment", "adjustments", "manual adjustment", "balance adjustment"],
    summary: "Cashier screen for one-off credits or debits when normal deposit, bonus, or withdrawal flows do not fit.",
    bodyParagraphs: [
      "Balance Fixes is the cashier screen where staff post one-off credits or debits to a client's cash balance. Each adjustment writes a permanent admin_adjustment line on the Full Ledger, so finance and compliance can see who changed what, when, and why.",
      "Use Balance Fixes when a payment processor credited the wrong amount, a wire posted twice, a promo was missed, or you must reverse an erroneous manual credit. Do not use adjustments as a shortcut for real deposits — use Pending In — or marketing bonuses — use Rewards.",
      "Cashier staff with cashier.adjust permission, team leads fixing reconciliation gaps, and owners handling dispute tickets use this screen daily. Sales agents should not post adjustments unless a manager explicitly grants that access.",
      "After posting, verify the new line on Full Ledger and on the client's Money tab. Owners can cross-check Balance Events for audit. Always search the ledger before posting to avoid duplicate fixes.",
    ],
    relatedIds: ["full_ledger", "credits_in", "balance_events", "pending_in", "rewards"],
    seeAlso: ["full_ledger", "balance_events", "credits_in", "client_file"],
  }),

  full_ledger: fromGlossary("full_ledger", {
    title: "Full Ledger",
    aliases: ["ledger", "money audit", "transaction log"],
    summary: "Complete audit trail of every cash movement — deposits, withdrawals, bonuses, and balance fixes.",
    bodyParagraphs: [
      "The Full Ledger is the master money log for the entire platform. Every approved deposit, payout, bonus, wire, and balance fix appears here with timestamp, operator, client, amount, and type.",
      "When a client disputes their balance, start on Full Ledger filtered to that user before opening Balance Fixes. Compliance exports often pull from this screen plus Balance Events.",
      "Pair Full Ledger with Pending In when chasing stuck deposits, and with Payouts when verifying outbound wires. The ledger is read-only — corrections always go through Balance Fixes or the original cashier action.",
    ],
    relatedIds: ["balance_fixes", "credits_in", "payouts", "balance_events"],
    seeAlso: ["balance_fixes", "credits_in", "pending_in"],
  }),

  pending_in: fromGlossary("pending_in", {
    title: "Pending In",
    aliases: ["deposit requests", "approve deposit", "deposit approval"],
    summary: "Queue of client deposit requests awaiting staff approval before balance credits.",
    bodyParagraphs: [
      "Pending In lists every deposit request that has not yet been approved or rejected. When you approve a row, the client's cash balance credits immediately and a line appears on Credits In and Full Ledger.",
      "The golden path for new money: client submits deposit → Pending In → Approve → Credits In → client may appear under Funded Accounts after first approved deposit.",
      "Reject when fraud is suspected, KYC is incomplete, or the payment rail failed. Always add an internal note on the Client File when rejecting so the next agent understands why.",
      "Payment Gateways and Payment Radar help you see whether PSP webhooks are healthy before you blame the client for a missing deposit.",
    ],
    relatedIds: ["credits_in", "payment_gateways", "funded_accounts", "payment_radar"],
    seeAlso: ["credits_in", "payment_gateways", "funded_accounts"],
  }),

  credits_in: fromGlossary("credits_in", {
    title: "Credits In",
    aliases: ["deposits", "inbound credits", "approved deposits"],
    summary: "History of all inbound cash credits after approval or manual deposit.",
    bodyParagraphs: [
      "Credits In shows every deposit that actually hit a client balance — card, wire, crypto, or manual. It is the post-approval view; Pending In is the pre-approval queue.",
      "After approving in Pending In, verify the amount here matches what the client expected. Discrepancies often mean a PSP partial capture or currency conversion issue.",
      "Manual deposits from Client File → Money tab also land here. For marketing-driven signup bonuses, check Rewards instead.",
    ],
    relatedIds: ["pending_in", "full_ledger", "funded_accounts", "rewards"],
    seeAlso: ["pending_in", "full_ledger", "client_file"],
  }),

  payment_gateways: fromGlossary("payment_gateways", {
    title: "Payment Gateways (PSP)",
    aliases: ["psp", "processors", "payment processor", "deposit rails"],
    summary: "System configuration for card, wire, and crypto deposit processors connected to Pending In.",
    bodyParagraphs: [
      "Payment Gateways stores credentials and settings for each payment service provider (PSP). When a client clicks Deposit on the terminal, the active rail here determines which form or redirect they see.",
      "Each processor sends webhooks back to the CRM when money moves. If Pending In stays empty while clients insist they paid, check Payment Radar first, then gateway logs and webhook URLs on this screen.",
      "Test cards and sandbox toggles live under the Processors tab. Never paste live API secrets into chat — rotate keys from OAuth-style partner flows when affiliates need read-only reporting.",
    ],
    relatedIds: ["pending_in", "payment_radar", "credits_in"],
    seeAlso: ["payment_radar", "pending_in", "attribution"],
  }),

  payment_radar: fromGlossary("payment_radar", {
    title: "Payment Radar",
    aliases: ["psp health", "collections brief", "stuck deposits"],
    summary: "Desk view of deposit rail health and stuck-money signals.",
    bodyParagraphs: [
      "Payment Radar aggregates PSP success rates, recent failures, and deposits waiting too long in Pending In. Run Collections Brief from Wallstreet AI for a narrative chase list.",
      "When Payment Radar flags a rail, cross-check Payment Gateways for expired certificates or wrong webhook URLs before calling the processor.",
      "Pair with Hot Leads when a high-value lead says they deposited but is not yet funded — often a Pending In approval is still outstanding.",
    ],
    relatedIds: ["payment_gateways", "pending_in", "hot_leads"],
    seeAlso: ["payment_gateways", "pending_in", "full_ledger"],
  }),

  all_clients: fromGlossary("all_clients", {
    title: "All Clients (Users Table)",
    aliases: ["users table", "users page", "crm users", "client list"],
    summary: "Every registered login — leads and traders before and after first deposit.",
    bodyParagraphs: [
      "All Clients is the master users table. Search by email, filter by agent, status, country, or date range. Click any row to open the Client File.",
      "Create Client adds a single login; Import CSV bulk-loads leads from a spreadsheet. Status dropdown on each row updates pipeline labels defined under Statuses.",
      "After a client's first approved deposit they also appear under Funded Accounts, but their record always remains here. Desk Team assignment controls who owns the relationship.",
    ],
    relatedIds: ["client_file", "funded_accounts", "hot_leads", "desk_team", "client_statuses"],
    seeAlso: ["client_file", "funded_accounts", "hot_leads"],
  }),

  client_file: fromGlossary("client_file", {
    title: "Client File",
    aliases: ["user profile", "client profile", "crm profile"],
    summary: "Single-client command center — profile, money, trades, notes, KYC, and tasks.",
    bodyParagraphs: [
      "The Client File opens from any row on All Clients. Overview holds contact fields and CRM status; save changes from the action panel on the right.",
      "The Money tab is where agents credit deposits, request withdrawals, post Balance Fixes, and add Rewards. View All jumps to Full Ledger filtered to this user.",
      "Generate Pitch runs Wallstreet AI call scripts tailored to this client. Intel Notes on the Comms Log aggregate every note left here — zero notes on a hot lead is a red flag.",
    ],
    relatedIds: ["all_clients", "balance_fixes", "full_ledger", "live_book"],
    seeAlso: ["all_clients", "balance_fixes", "hot_leads"],
  }),

  funded_accounts: fromGlossary("funded_accounts", {
    title: "Funded Accounts",
    aliases: ["depositors", "funded clients", "clients with money"],
    summary: "Clients who have at least one approved deposit — your revenue-bearing book.",
    bodyParagraphs: [
      "Funded Accounts is a filtered view of All Clients where real money has landed. They entered via Pending In approval or a manual deposit from Client File.",
      "Retention teams live here: check open positions on Live Book, recent Payouts, and Scoreboard to see which Desk Team member owns the relationship.",
      "A client can appear here without trading yet — funding alone moves them into this list. Dynamic Status rules may auto-label them Depositor when the first credit posts.",
    ],
    relatedIds: ["pending_in", "credits_in", "all_clients", "live_book"],
    seeAlso: ["credits_in", "all_clients", "payouts"],
  }),

  hot_leads: fromGlossary("hot_leads", {
    title: "Hot Leads",
    aliases: ["lead inbox", "new leads", "aria leads"],
    summary: "Inbound captures from the public Aria concierge widget and signup forms.",
    bodyParagraphs: [
      "Hot Leads is the first human touchpoint after a visitor talks to Aria on the public site or submits a callback form. Assign each lead to a Desk Team agent who owns the follow-up call.",
      "Recommend AI suggests the agent with the lightest load. Dismiss spam aggressively so the queue stays actionable.",
      "Golden path: Visitor → Aria → Hot Leads → assign agent → All Clients → Pending In → Funded Accounts → Live Book. Attribution and Campaigns tell you which marketing source produced the lead.",
    ],
    relatedIds: ["all_clients", "desk_team", "attribution", "auto_assign"],
    seeAlso: ["all_clients", "desk_team", "attribution"],
  }),

  desk_team: fromGlossary("desk_team", {
    title: "Desk Team",
    aliases: ["agents", "sales floor", "brokers", "account managers"],
    summary: "Staff accounts that own client relationships and appear in assignment dropdowns.",
    bodyParagraphs: [
      "Desk Team lists every agent and client counts. Admin assigns owner on All Clients (bulk bar or Agent column), Hot Leads inbox, or Client File owner card.",
      "Add staff logins under Access Keys; use the same name as Agent (owner) on clients so Scoreboard credits match.",
      "Fine-grained access lives in Access Keys and Permissions — being on Desk Team does not automatically grant cashier or system admin rights.",
      "Auto Assign routes new signups to agents by country, language, or round-robin. Manual assign from Hot Leads still overrides automation when managers cherry-pick VIPs.",
    ],
    relatedIds: ["hot_leads", "auto_assign", "permissions", "scoreboard"],
    seeAlso: ["hot_leads", "permissions", "auto_assign"],
  }),

  spread: fromGlossary("spread", {
    title: "Spread",
    aliases: ["markup", "tier spread", "bid ask markup"],
    summary: "Tier matrix that sets instrument markup by account type and asset class.",
    bodyParagraphs: [
      "Spread configuration lives under System → Spread. Tiers a–k define how much markup the house adds on forex, indices, crypto, and stocks per Account Type.",
      "The Exchange tab tunes venue-level percentages for advanced setups. Per-client overrides are available on Client File → Trading when VIPs negotiate custom pricing.",
      "Brokers explaining costs to clients should pair Spread with Commissions — together they define the full trading fee picture.",
    ],
    relatedIds: ["account_types", "live_book", "client_file"],
    seeAlso: ["account_types", "live_book", "desk_management"],
  }),

  allies: fromGlossary("allies", {
    title: "Allies (Affiliates)",
    aliases: ["affiliates", "partners", "ib partners", "introducing brokers"],
    summary: "Partner registry for affiliate and IB relationships tied to attribution.",
    bodyParagraphs: [
      "Allies stores affiliate and introducing-broker records. Each partner gets tracking links through Attribution and may receive OAuth credentials for API reporting.",
      "When a lead registers through a partner pixel, Campaigns and Hot Leads show the source so commissions reconcile correctly.",
      "Disable partners instead of deleting when rotating deals — history on All Clients preserves original utm and partner ids.",
    ],
    relatedIds: ["attribution", "campaigns", "oauth", "hot_leads"],
    seeAlso: ["attribution", "campaigns", "oauth"],
  }),

  attribution: fromGlossary("attribution", {
    title: "Attribution (Trackers)",
    aliases: ["trackers", "affiliate trackers", "utm tracking", "pixels"],
    summary: "Campaign-level tracking pixels and signup attribution tags.",
    bodyParagraphs: [
      "Marketing → Attribution holds per-campaign tracker scripts. System → Tracking adds global pixels that fire on every page load.",
      "Affiliate trackers connect signups to Allies partners. Pair with Campaigns when launching a new acquisition push so Hot Leads show the correct source column.",
      "Broken attribution does not block deposits — it breaks commission math. Test with a sandbox signup before paying partners.",
    ],
    relatedIds: ["allies", "campaigns", "tracking", "hot_leads"],
    seeAlso: ["allies", "campaigns", "tracking"],
  }),

  payouts: fromGlossary("payouts", {
    title: "Payouts",
    aliases: ["withdrawals", "cash out", "client withdrawal"],
    summary: "Outbound cash requests debiting client balances after approval.",
    bodyParagraphs: [
      "Payouts lists withdrawal requests from the client terminal or manual debits from Client File. Approved rows debit balance and write to Full Ledger.",
      "Large wire withdrawals may also appear in Wire Queue for a second approval step depending on platform settings.",
      "Compliance teams watch Payouts alongside Balance Events when investigating rapid deposit-and-withdraw patterns.",
    ],
    relatedIds: ["wire_queue", "full_ledger", "client_file", "balance_events"],
    seeAlso: ["wire_queue", "full_ledger", "balance_events"],
  }),

  wire_queue: fromGlossary("wire_queue", {
    title: "Wire Queue",
    aliases: ["wire withdrawal", "wire approval", "bank wire out"],
    summary: "Secondary approval lane for high-value or bank wire withdrawals.",
    bodyParagraphs: [
      "Wire Queue catches withdrawal requests that need manual bank verification before funds leave. Approve only after confirming client identity on Client File → KYC.",
      "Rejected wires should include a note so the client knows whether to resubmit documentation or choose a card refund rail.",
      "Every approved wire mirrors on Payouts and Full Ledger for audit.",
    ],
    relatedIds: ["payouts", "full_ledger", "client_file"],
    seeAlso: ["payouts", "full_ledger"],
  }),

  rewards: fromGlossary("rewards", {
    title: "Rewards (Bonuses)",
    aliases: ["bonuses", "promo credit", "marketing bonus"],
    summary: "Marketing and retention bonus credits separate from real deposits.",
    bodyParagraphs: [
      "Rewards posts promotional credits — welcome bonuses, retention offers, or manager discretionary gifts. These are not PSP deposits and should not flow through Pending In.",
      "Promo Codes on signup can auto-trigger bonus rules paired with Auto Assign for routing.",
      "Bonuses appear on Full Ledger with a distinct type so compliance can separate real money from house credit.",
    ],
    relatedIds: ["promo_codes", "balance_fixes", "full_ledger"],
    seeAlso: ["promo_codes", "balance_fixes", "credits_in"],
  }),

  balance_events: fromGlossary("balance_events", {
    title: "Balance Events (Compliance Audit)",
    aliases: ["balance audit", "compliance log", "owner audit"],
    summary: "Owner-only immutable log of every balance mutation with operator identity.",
    bodyParagraphs: [
      "Balance Events captures each balance change with timestamp, operator, client id, before/after snapshots, and action type. Export CSV for external compliance reviews.",
      "Use alongside Full Ledger when investigating Balance Fixes or disputed Payouts. History Logs adds operator UI actions; Balance Events is money-specific.",
      "Primary admin login required — desk agents normally cannot access this screen.",
    ],
    relatedIds: ["full_ledger", "balance_fixes", "history_logs"],
    seeAlso: ["full_ledger", "balance_fixes", "history_logs"],
  }),

  mission_control: fromGlossary("mission_control", {
    title: "Mission Control",
    aliases: ["dashboard", "admin home", "operator home"],
    summary: "Daily start screen — registrations, money in/out, and quick jumps to hot zones.",
    bodyParagraphs: [
      "Mission Control is the first screen most managers open. Period cards summarize new All Clients, Pending In volume, and Payouts for the selected date range.",
      "Click a card to drill into Credits In, Hot Leads, or Funded Accounts. High lead volume means assign Hot Leads before coffee.",
      "Wallstreet AI Operator Brief runs a deeper audit snapshot from this hub when owners need narrative context.",
    ],
    relatedIds: ["hot_leads", "pending_in", "all_clients", "street_ai"],
    seeAlso: ["hot_leads", "pending_in", "knowme"],
  }),

  auto_assign: fromGlossary("auto_assign", {
    title: "Auto Assign",
    aliases: ["lead routing", "round robin", "automatic assignment"],
    summary: "Rules engine that routes new signups to Desk Team agents automatically.",
    bodyParagraphs: [
      "Auto Assign evaluates rules top to bottom — country, language, promo code, or round-robin. Drag to reorder; the first matching rule wins.",
      "Manual assignment on Hot Leads still works when managers override automation for VIP callbacks.",
      "Pair with Desks and Groups when running multilingual floors — German traffic can land on Berlin agents while UK leads hit London.",
    ],
    relatedIds: ["hot_leads", "desk_team", "promo_codes", "desks"],
    seeAlso: ["hot_leads", "desk_team", "permissions"],
  }),

  permissions: fromGlossary("permissions", {
    title: "Permissions",
    aliases: ["role matrix", "group permissions", "access control"],
    summary: "Desk-group matrix controlling sidebar visibility and API scopes.",
    bodyParagraphs: [
      "Permissions maps each desk group to CRM modules — can this group approve Pending In, post Balance Fixes, or edit Spread?",
      "Groups define role buckets; Permissions fills the matrix. Access Keys override individual agents when someone needs temporary cashier rights.",
      "New hires should start with the narrowest group that still lets them work Hot Leads and Client File — expand after trust is established.",
    ],
    relatedIds: ["groups", "access_keys", "desk_team"],
    seeAlso: ["groups", "access_keys", "balance_fixes"],
  }),

  live_book: fromGlossary("live_book", {
    title: "Live Book",
    aliases: ["open trades", "open positions", "active trades"],
    summary: "All open client positions — operators can force-close for risk.",
    bodyParagraphs: [
      "Live Book shows every open trade across the platform. Desk Management rolls up net exposure by symbol for house risk.",
      "When margin calls fire, Notifications alert assigned agents — cross-check the client's Account Type and Spread tier before calling.",
      "Closed Book holds history; Live Book is real-time risk.",
    ],
    relatedIds: ["desk_management", "closed_book", "spread", "client_file"],
    seeAlso: ["desk_management", "spread", "funded_accounts"],
  }),

  knowme: fromGlossary("knowme", {
    title: "KNOWME",
    aliases: ["crm guide", "help chat", "wiki guide"],
    summary: "Visual flows plus Wikipedia-style CRM encyclopedia chat.",
    bodyParagraphs: [
      "KNOWME teaches CurioCRM without a manual. Visual Flows offers five swipeable diagrams: golden path, affiliates, PSP webhooks, lead assignment, and click-to-call.",
      "Broker packs tab (owner & supervisor): Desk Pro default — cloud CRM plus one local Ollama on management PC (16 GB+); agents browser-only. Floor Enterprise uses one 32–64 GB LAN server; Agent Elite is per-desk 32 GB only when they pay.",
      "Admin demo (management tier): wiki + flows always instant; live Wallstreet AI when Ollama is online. Floor agents use preemptive Q&A only — semantic lookup under 100 ms, no hallucinated policy text.",
      "Scale path: 10 GPU laptops with Ollama for supervisors, 90 agents on verified Q&A cache; optional 4×4090 + vLLM for 100 concurrent live users. Ask “AI architecture” or “broker install tiers” on this page.",
    ],
    relatedIds: ["mission_control", "hot_leads", "payment_gateways", "broker_deploy_tiers"],
    seeAlso: ["mission_control", "hot_leads", "broker_deploy_tiers"],
  }),

  broker_deploy_tiers: {
    id: "broker_deploy_tiers",
    title: "Broker install packs",
    aliases: [
      "broker deploy",
      "broker tiers",
      "desk pro",
      "ollama install",
      "call center ram",
      "cheapest broker",
    ],
    path: "/admin/knowme",
    summary: "How to sell CurioCRM + Ollama — Desk Pro (cheapest) through White-label SaaS.",
    bodyParagraphs: [
      "Desk Pro (recommended): you host CRM on a VPS; broker management installs Ollama once on a 16 GB+ PC; every agent uses the browser. Link via Tailscale: OLLAMA_BASE_URL on the VPS .env.",
      "Floor Enterprise: one 32–64 GB AI server on the office LAN — not Ollama on every agent PC. Agent Elite is per-desk 32 GB only when hardware is sold explicitly.",
      "Open KNOWME → Broker packs for the tier picker, RAM matrix, and 15-minute CEO proof script. Printable guide: BROKER-DEPLOY-TIERS.md.",
    ],
    relatedIds: ["knowme", "street_ai"],
    seeAlso: ["knowme", "street_ai"],
  },

  street_ai: fromGlossary("street_ai", {
    title: "Wallstreet AI",
    aliases: ["ai of wallstreet", "wallstreet ai", "wallstreetai", "desk ai", "operator copilot", "curio ai"],
    summary: "Zero-wait CRM copilot — instant answers for deposits, leads, permissions, and morning routine.",
    bodyParagraphs: [
      "Wallstreet AI lives at /admin/desk. Ask plain English: morning routine, approve deposit, hot leads, bulk status, spread, permissions. Most answers return instantly without waiting for the LLM.",
      "Operator Brief and Collections Brief give narrative pipeline audits for owners. Generate Pitch on Client File produces call scripts for a specific client.",
      "When Ollama is online the green pill shows engine ready — offline mode still serves the full instant encyclopedia. Pair with KNOWME for visual onboarding.",
    ],
    relatedIds: ["knowme", "mission_control", "hot_leads", "pending_in"],
    seeAlso: ["knowme", "mission_control", "client_file"],
  }),

  dynamic_status: fromGlossary("dynamic_status", {
    title: "Dynamic Status",
    aliases: ["pipeline automation", "auto status", "when then status"],
    summary: "Automated CRM status changes when balance or trading activity crosses a threshold.",
    bodyParagraphs: [
      "Dynamic Status rules follow When → Then logic: for example, first approved deposit moves a client from New to Depositor automatically.",
      "Manual status changes on All Clients still work — automation never blocks a manager override.",
      "Pair with Statuses for label definitions and Event Logs to audit every automatic move.",
    ],
    relatedIds: ["client_statuses", "funded_accounts", "event_logs"],
    seeAlso: ["client_statuses", "pending_in", "trading_status"],
  }),

  trading_status: fromGlossary("trading_status", {
    title: "Trading Status",
    aliases: ["trading freeze", "block trading", "disable trading"],
    summary: "Block new trades while login and deposits still work — platform-wide or per client.",
    bodyParagraphs: [
      "Use Trading Status when compliance needs to pause trading without locking the client out of their account entirely.",
      "One-off blocks today: Client File → Trading tab. Platform rules live under System → Trading Status.",
      "Cross-check Live Book before unfreezing — open risk may need force-close first.",
    ],
    relatedIds: ["live_book", "client_file", "dynamic_status"],
    seeAlso: ["live_book", "client_file", "permissions"],
  }),

  min_max_deposits: fromGlossary("min_max_deposits", {
    title: "Min/Max Deposits",
    aliases: ["deposit limits", "min deposit", "max deposit"],
    summary: "Floor and ceiling for inbound funding per currency, PSP, region, and FTD.",
    bodyParagraphs: [
      "Min/Max Deposits stops micro-deposits that clog Pending In and caps amounts above your KYC capacity.",
      "Click Show on any row for plain-English rule text before editing. Test with a sandbox deposit after changing card thresholds.",
      "Account Types set tier defaults; this screen fine-tunes per PSP and currency.",
    ],
    relatedIds: ["payment_gateways", "account_types", "pending_in"],
    seeAlso: ["payment_gateways", "account_types", "pending_in"],
  }),

  forex_commissions: fromGlossary("forex_commissions", {
    title: "Forex Commissions",
    aliases: ["fx fees", "forex fees", "fx commission"],
    summary: "Tier × currency matrix for per-side FX trade fees.",
    bodyParagraphs: [
      "Forex Commissions defines how much the house earns on each forex trade side, by account tier and billing currency.",
      "Edit the matrix, Save row, then verify Account Types map clients to the correct tier before a VIP launch.",
      "Explain total trading cost to clients by pairing Spread markup with commission rows.",
    ],
    relatedIds: ["spread", "account_types", "live_book"],
    seeAlso: ["spread", "account_types", "crypto_commissions"],
  }),

  event_logs: fromGlossary("event_logs", {
    title: "Event Logs",
    aliases: ["audit trail", "crm audit", "operator audit"],
    summary: "Immutable flight recorder — every CRM action with operator, client, and timestamp.",
    bodyParagraphs: [
      "Event Logs is the compliance-grade audit trail. Set UTC date range, Search, then filter by agent, email, status change, or CRM id.",
      "Export CSV respects current filters (up to 5,000 rows). Click Actioned on to jump straight to Client File.",
      "History Logs adds operator UI notes; Balance Events is money-specific — use all three for full investigations.",
    ],
    relatedIds: ["history_logs", "balance_events", "client_file"],
    seeAlso: ["history_logs", "balance_events", "security_log"],
  }),

  settings: fromGlossary("settings", {
    title: "Settings Hub",
    aliases: ["configuration hub", "platform settings", "admin settings"],
    summary: "One card-based hub linking to every platform config screen.",
    bodyParagraphs: [
      "Settings Hub groups Brand, Commissions, Deposits, Pipeline, Access, and Owner tools into six sections — no hunting through nested menus.",
      "Amber Owner badges need primary admin login. Each card deep-links to the live config page where you Save.",
      "New hires: start at Settings to see the full platform map, then open KNOWME for step-by-step flows.",
    ],
    relatedIds: ["brand_dna", "spread", "permissions", "knowme"],
    seeAlso: ["brand_dna", "permissions", "knowme"],
  }),

  scoreboard: fromGlossary("scoreboard", {
    title: "Scoreboard",
    aliases: ["sales report", "agent performance", "desk performance"],
    summary: "Desk Team performance metrics for the selected period.",
    bodyParagraphs: [
      "Scoreboard compares agents on registrations, deposits, and activity — use before commission payouts.",
      "Cross-check Funded Accounts filtered by owner agent when a number looks off.",
      "Pair with Hot Leads assign timestamps to see conversion speed per agent.",
    ],
    relatedIds: ["desk_team", "funded_accounts", "hot_leads"],
    seeAlso: ["desk_team", "funded_accounts", "all_clients"],
  }),
};

export function getKnowledgeArticle(id: string): CrmKnowledgeArticle | undefined {
  return CRM_KNOWLEDGE[id];
}

export function allKnowledgeArticles(): CrmKnowledgeArticle[] {
  return Object.values(CRM_KNOWLEDGE);
}

/** Longest-match alias index for term resolution. */
export function buildKnowledgeAliasIndex(): Map<string, string> {
  const map = new Map<string, string>();
  for (const article of allKnowledgeArticles()) {
    const needles = [article.id.replace(/_/g, " "), article.title, ...article.aliases];
    for (const n of needles) {
      const key = n.toLowerCase().trim();
      if (key.length >= 2) map.set(key, article.id);
    }
    const g = GLOSSARY[article.id];
    if (g) {
      map.set(g.label.toLowerCase(), article.id);
      for (const a of g.aliases ?? []) map.set(a.toLowerCase(), article.id);
    }
  }
  return map;
}

export function labelForArticleId(id: string): string {
  return CRM_KNOWLEDGE[id]?.title ?? GLOSSARY[id]?.label ?? id.replace(/_/g, " ");
}

export function glossaryTermForArticle(id: string): GlossaryTerm | undefined {
  return GLOSSARY[id];
}
