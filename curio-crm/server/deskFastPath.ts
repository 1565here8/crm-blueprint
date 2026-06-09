/**
 * Instant Wallstreet AI replies â€” zero LLM, sub-50ms.
 * Body only â€” legal notice lives in the bubble footer, not every message.
 */
import { BROKER_PITCH_INSTANT } from "../shared/brokerPitch";
import { compactDeskModuleReply, instantCrmGuideReply } from "../shared/crmGuideKnowledge";
import {
  formatKnowmeArchitectureAnswer,
  matchesKnowmeArchitectureQuery,
} from "../shared/knowmeAiArchitecture";
import { resolveKnowmeWiki } from "../shared/crmWiki";
import { buildPitchReply, isPitchOrMarketTipRequest } from "./deskPitchEngine";

function deskReply(body: string): { reply: string } {  return { reply: `${body.trimEnd()}\n\nEND` };
}

export function deskFastPath(
  message: string,
  history?: { role: "user" | "assistant"; content: string }[],
): { reply: string } | null {
  const wiki = resolveKnowmeWiki(message, history);
  if (wiki) return deskReply(wiki.markdown);

  const crmInstant = instantCrmGuideReply(message, history);
  if (crmInstant) return deskReply(crmInstant);

  const m = message.toLowerCase().trim().replace(/[^\w\s'?/]/g, " ");

  if (/^(sup|wassup|yo)\b/.test(m)) {
    return deskReply(`Yo. Pipeline's hot â€” leads, deposits, or risk? Say the play.`);
  }

  if (/stay alive|pass the test|survival test|why do you exist|vendor license|tenant paused|tenant status|license heartbeat|kill.switch|402 license/.test(m)) {
    const survival = instantCrmGuideReply("pass the test");
    if (survival) return deskReply(survival);
  }

  if (
    /^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(m) ||
    /who are you|what is wallstreet|what are you|your name|ai of wallstreet/.test(m)
  ) {
    return deskReply(
      `Wallstreet AI on the line â€” native to this CRM on your VPS. Hermes mode: I teach one module at a time and grow deeper each session â€” not a static FAQ. Pass the test every shift: right module, right moment â€” vendor license + tenant active keep APIs alive.\n\nTry: teach me pending in Â· dig deeper on balance fixes Â· hermes Â· interconnect map Â· morning routine Â· demo tour Â· explain more`,
    );
  }

  if (/how are you|how you doing|how's it going|hows it going|what's up|whats up|you good|how do you do/.test(m)) {
    return deskReply(`Running hot. Registrations, money in, open risk â€” what do we close today?`);
  }

  if (/morning routine|start my day|daily routine|what first|open the desk|begin shift/.test(m)) {
    return deskReply(
      `MORNING ROUTINE\n1. Mission Control â€” registrations & money cards (/admin)\n2. Hot Leads â€” assign Aria captures (/admin/desk/leads)\n3. Pending In â€” approve overnight deposits (/admin/cashier/deposit-requests)\n4. Action Queue â€” clear today's tasks (/admin/desk/tasks)\n5. Live Book â€” open risk (/admin/trading/open-trades)\n6. Desk Management â€” net exposure by symbol (/admin/trading/net-positions)\n7. Wallstreet AI Operator Brief â€” pipeline audit (/admin/desk)\nGolden path: Visitor â†’ Aria â†’ Hot Leads â†’ assign â†’ Pending In â†’ Credits In â†’ Funded â†’ Live Book.`,
    );
  }

  if (/pending in|deposit request queue|cashier pending|awaiting deposit/.test(m)) {
    const b = compactDeskModuleReply("pending_in");
    if (b) return deskReply(b);
  }

  if (/approve.*deposit|how.*(approve|process).*deposit|pending.*deposit|deposit request/.test(m)) {
    const b = compactDeskModuleReply("pending_in");
    if (b) return deskReply(`${b}\nAfter approve: confirm Credits In, then Funded Accounts and Client File â†’ Money tab.`);
  }

  if (/credits in|posted deposit|deposit history|money in history|verify deposit posted/.test(m)) {
    const b = compactDeskModuleReply("credits_in");
    if (b) return deskReply(b);
  }

  if (/how.*(add|create|register).*client|new client|create user|sign up client/.test(m)) {
    return deskReply(
      `NEW CLIENT\n1. All Clients â†’ /admin/crm/users\n2. Create Client â€” email + optional balance\n3. Or Import CSV for bulk leads\n4. Open Client File to assign agent & set status`,
    );
  }

  if (/hot lead|assign lead|aria lead|concierge lead|new lead|lead inbox/.test(m)) {
    const b = compactDeskModuleReply("hot_leads");
    if (b) return deskReply(b);
    return deskReply(
      `HOT LEADS\nAria captures land here before anyone owns the callback â€” assign fast or the lead goes cold. Recommend AI balances load across Desk Team; dismiss spam so the queue stays honest.\nGolden path: Visitor â†’ Aria â†’ Hot Leads â†’ assign â†’ All Clients â†’ Pending In on first deposit.\nPath: /admin/desk/leads`,
    );
  }

  if (/wire queue|approve wire|bank wire withdrawal/.test(m)) {
    const b = compactDeskModuleReply("wire_queue");
    if (b) return deskReply(b);
  }

  if (/withdraw|payout|cash out/.test(m)) {
    const b = compactDeskModuleReply("payouts");
    if (b) return deskReply(b);
    return deskReply(
      `PAYOUTS\nWithdrawal requests debit balance after approval â€” verify KYC on Client File first.\nGolden path: Payouts approve â†’ Wire Queue for high-value wires â†’ Full Ledger audit.\nPath: /admin/cashier/withdrawals`,
    );
  }

  if (/bonus|reward|credit client|manual deposit|adjust balance|money tab/.test(m)) {
    return deskReply(
      `CLIENT MONEY (Client File â†’ Money tab)\nâ€¢ Deposit Â· Manual deposit Â· Bonus Â· Adjustment\nâ€¢ View All â€” treasury filtered to this user`,
    );
  }

  if (/rewards page|cashier bonus|marketing bonus|welcome bonus credit/.test(m)) {
    const b = compactDeskModuleReply("rewards");
    if (b) return deskReply(b);
  }

  if (/balance fix|balance adjustment|manual ledger|admin adjustment|reconcile balance/.test(m)) {
    const b = compactDeskModuleReply("balance_fixes");
    if (b) return deskReply(b);
  }

  if (/full ledger|ledger audit|money trail|treasury ledger/.test(m)) {
    const b = compactDeskModuleReply("full_ledger");
    if (b) return deskReply(b);
  }

  if (/desk management|desk risk|house risk|net position|net exposure/.test(m)) {
    const b = compactDeskModuleReply("desk_management");
    if (b) return deskReply(b);
  }

  if (/open trade|close trade|live book/.test(m)) {
    const b = compactDeskModuleReply("live_book");
    if (b) return deskReply(b);
    return deskReply(
      `LIVE BOOK\nOpen positions â€” force-close during risk events. Pair with Desk Management for house net exposure.\nPath: /admin/trading/open-trades`,
    );
  }

  if (/closed book|trade history|past trades|closed trades/.test(m)) {
    const b = compactDeskModuleReply("closed_book");
    if (b) return deskReply(b);
  }

  if (/instrument|tradable symbol|asset list|symbols page/.test(m)) {
    const b = compactDeskModuleReply("instruments");
    if (b) return deskReply(b);
  }

  if (/market clock|session hour|trading hours|market open/.test(m)) {
    const b = compactDeskModuleReply("market_clock");
    if (b) return deskReply(b);
  }

  if (/permission|access key|staff role|team access|desk team|group permission|role matrix/.test(m)) {
    return deskReply(
      `PERMISSIONS & ACCESS\nâ€¢ Permissions â†’ /admin/system/permissions â€” desk-group CRM + API matrix\nâ€¢ Groups â†’ /admin/system/groups â€” role buckets\nâ€¢ Access Keys â†’ /admin/system/team-permissions â€” per-user sub-admin overrides\nâ€¢ Desk Team â†’ /admin/crm/agents`,
    );
  }

  if (/auto assign|auto-assign|lead routing|round robin assign/.test(m)) {
    return deskReply(
      `AUTO ASSIGN\nâ€¢ /admin/system/auto-assign â€” rules by country, language, promo, round-robin\nâ€¢ Top rule wins â€” drag to reorder\nâ€¢ Manual assign still in Hot Leads â†’ /admin/desk/leads`,
    );
  }

  if (/spread|markup|tier spread|exchange tab/.test(m)) {
    return deskReply(
      `SPREAD\nâ€¢ /admin/system/spread â€” tier matrix (aâ€“k) per asset class\nâ€¢ Exchange tab â€” venue-level %\nâ€¢ Per-client override on Client File â†’ Trading tab`,
    );
  }

  if (/notification|member alert|email alert|push alert|margin call alert/.test(m)) {
    return deskReply(
      `NOTIFICATIONS\nâ€¢ /admin/system/notifications â€” pick agent â†’ toggle email / push / in-app grid\nâ€¢ Events: new lead, deposit request, withdrawal, margin call, task assigned, SMTP fail\nâ€¢ Turn off email for CRM-only agents â€” keep In-app on\nâ€¢ Copy from another agent Â· Apply desk default`,
    );
  }

  if (/oauth|sso|api partner|public id/.test(m)) {
    return deskReply(
      `OAUTH\nâ€¢ /admin/system/oauth â€” affiliate & API partner credentials\nâ€¢ Create client â†’ copy Public Id â†’ share with partner\nâ€¢ Disable (don't delete) when rotating keys`,
    );
  }

  if (/track pixel|tracking page|attribution pixel|system tracking/.test(m)) {
    return deskReply(
      `TRACKING\nâ€¢ System â†’ Tracking â†’ /admin/system/tracking â€” global pixels\nâ€¢ Marketing â†’ Attribution â†’ /admin/marketing/trackers â€” campaign-level\nâ€¢ Pair with Campaigns for UTM reporting`,
    );
  }

  if (/account type|retail vip|ib tier/.test(m)) {
    return deskReply(
      `ACCOUNT TYPES\nâ€¢ /admin/system/account-type â€” Retail / VIP / IB tiers\nâ€¢ Sets default leverage, min/max deposit, spread tier\nâ€¢ Show row for plain-English limits before editing`,
    );
  }

  if (/view log|security log|login audit|staff login/.test(m)) {
    return deskReply(
      `SECURITY ZONE\nâ€¢ Dashboard â†’ /admin/security\nâ€¢ Threats â†’ /admin/security/threats\nâ€¢ Behavior â†’ /admin/security/behavior\nâ€¢ My IP â†’ /admin/security/perimeter\nâ€¢ Login audit â†’ /admin/security/view-log`,
    );
  }

  if (/security threat|threat intelligence|safety score|phishy admin|behavior alert|visitor watch|endpoint alert|usb plugged/.test(m)) {
    return deskReply(
      `SECURITY INTELLIGENCE (owner)\nâ€¢ Threats & safety score â†’ /admin/security/threats\nâ€¢ Phishy admin / staff â†’ /admin/security/behavior\nâ€¢ Unwanted IPs â†’ /admin/security/visitors (browser fingerprint only)\nâ€¢ USB / physical desk â†’ /admin/security/endpoints (needs Endpoint Agent â€” web cannot see USB)\nâ€¢ Rules: failed-login spike, off-hours login, permission denied, sensitive history routes`,
    );
  }

  if (/security dashboard|dns check|ssl tls|my ip|ip allowlist|perimeter/.test(m)) {
    return deskReply(
      `SECURITY CONSOLE (owner)\nâ€¢ /admin/security â€” health, license, tenant\nâ€¢ /admin/security/threats â€” safety score + active threats\nâ€¢ /admin/security/perimeter â€” your IP vs allowlist\nâ€¢ /admin/security/dns â€” resolve records from VPS\nâ€¢ /admin/security/ssl â€” cert expiry\nâ€¢ Export JSON for compliance archives`,
    );
  }

  if (/balance event|history log|error log|smtp log|api doc/.test(m)) {
    return deskReply(
      `OWNER LOGS (System menu)\nâ€¢ Balance events â†’ /admin/system/balance-events\nâ€¢ History Logs â†’ /admin/system/history-logs\nâ€¢ Error Logs â†’ /admin/system/error-logs\nâ€¢ SMTP Logs â†’ /admin/system/smtp-logs\nâ€¢ API Docs â†’ /admin/system/api-docs`,
    );
  }

  if (/demo tour|walk me through|all pages|sidebar zones|now system run|teach me crm|crm demo/.test(m)) {
    const tour = instantCrmGuideReply("demo tour");
    if (tour) return deskReply(tour);
  }

  if (/client file|open client|user profile|crm user/.test(m)) {
    const b = compactDeskModuleReply("client_file");
    if (b) return deskReply(b);
  }

  if (/mission control|dashboard|operator home/.test(m)) {
    const b = compactDeskModuleReply("mission_control");
    if (b) return deskReply(b);
  }

  if (/attribution|utm pixel|tracking pixel marketing|campaign tracker/.test(m)) {
    const b = compactDeskModuleReply("attribution");
    if (b) return deskReply(b);
  }

  if (/campaign(?! pivot)|utm|acquire|marketing campaign/.test(m)) {
    const b = compactDeskModuleReply("campaigns");
    if (b) return deskReply(b);
    return deskReply(
      `CAMPAIGNS\nTag acquisition spend â€” read quality on Hot Leads campaign column before scaling ads.\nPath: /admin/marketing/campaigns`,
    );
  }

  if (/allies|affiliate partner|partner registry|ib partner/.test(m)) {
    const b = compactDeskModuleReply("allies");
    if (b) return deskReply(b);
  }

  if (/integration|api key|marketing api|external hook/.test(m)) {
    const b = compactDeskModuleReply("integrations");
    if (b) return deskReply(b);
  }

  if (/campaign pivot|channel pivot|campaign report pivot/.test(m)) {
    const b = compactDeskModuleReply("campaign_pivot");
    if (b) return deskReply(b);
  }

  if (/kyc|passport|document|verify identity/.test(m)) {
    return deskReply(
      `KYC\nâ€¢ Client File â†’ KYC tab (extended-docs flag; portal stores filename metadata)\nâ€¢ Analyze real files: Wallstreet AI bubble â†’ paperclip (PDF/text parsed; describe images)\nâ€¢ Approve/reject on portal list; flag mismatches from attachment review`,
    );
  }

  if (/flag|bad actor|suspend|block user/.test(m)) {
    return deskReply(
      `FLAGS\nâ€¢ Client File â†’ set status / flags\nâ€¢ Operator Brief lists bad actors\nâ€¢ Duplicate emails â€” audit DUPLICATES section`,
    );
  }

  if (/action queue|desk tasks|today tasks|task inbox/.test(m)) {
    const b = compactDeskModuleReply("action_queue");
    if (b) return deskReply(b);
  }

  if (/task|todo/.test(m)) {
    return deskReply(
      `TASKS\nâ€¢ Action Queue â†’ /admin/desk/tasks\nâ€¢ Client File â†’ Tasks tab\nâ€¢ Generate tasks from Wallstreet AI audit when queue is empty`,
    );
  }

  if (/payment radar|psp health|deposit rail|processor health/.test(m)) {
    const b = compactDeskModuleReply("payment_radar");
    if (b) return deskReply(b);
  }

  if (/payment gateway|psp config|processor setup|configure psp|gateway credential/.test(m)) {
    const b = compactDeskModuleReply("payment_gateways");
    if (b) return deskReply(b);
  }

  if (/psp|stuck deposit|collections brief|collections/.test(m)) {
    return deskReply(
      `COLLECTIONS\nâ€¢ Collections Brief on Wallstreet AI â€” PSP health, stuck money\nâ€¢ Payment Radar â†’ /admin/desk/psp-health\nâ€¢ Pending In for deposits awaiting approval Â· Wire Queue for stuck payouts`,
    );
  }

  if (/aria|concierge|public chat|website chat/.test(m)) {
    return deskReply(
      `ARIA (PUBLIC CONCIERGE)\nâ€¢ Site visitors only â€” no trading advice\nâ€¢ Captures contact â†’ Hot Leads inbox\nâ€¢ You route leads; Aria never closes`,
    );
  }

  if (/import csv|bulk import|upload csv|csv import|import leads|import clients/.test(m)) {
    return deskReply(
      `IMPORT CSV\n1. All Clients â†’ Import CSV\n2. Any column order â€” auto-mapped headers\n3. Rows with balance â†’ Funded Accounts`,
    );
  }

  if (/change.*status|set.*status|update.*status|crm status|lead status|status to/.test(m)) {
    return deskReply(
      `CHANGE STATUS\nâ€¢ One row: Status dropdown on All Clients\nâ€¢ Bulk: check rows â†’ Desk panel â†’ Quick set Status â†’ Set\nâ€¢ Scope: Checked / Page / All matching`,
    );
  }

  if (/bulk|mass edit|edit all|quick set|selected rows/.test(m)) {
    return deskReply(
      `BULK EDIT\n1. Check rows in All Clients\n2. Desk panel (right) â€” scope + Quick Set fields\n3. Edit all fieldsâ€¦ for full form`,
    );
  }

  if (/column|reorder|drag|layout|move.*column|cpl|cpa order/.test(m)) {
    return deskReply(
      `COLUMN LAYOUT\nâ€¢ Drag column headers to reorder\nâ€¢ Columns button â†’ show/hide\nâ€¢ Layout saves per role in your browser`,
    );
  }

  if (/assign.*agent|change agent|reassign|who owns/.test(m)) {
    return deskReply(
      `ASSIGN AGENT\nâ€¢ Row dropdown on All Clients\nâ€¢ Bulk via Desk panel\nâ€¢ Hot Leads â†’ /admin/desk/leads`,
    );
  }

  if (/all clients|users page|crm users|where.*clients|find client/.test(m)) {
    return deskReply(
      `ALL CLIENTS\nâ€¢ /admin/crm/users â€” search, inline edit\nâ€¢ Client File: Money, Trades, Notes, KYC\nâ€¢ Desk panel = filters + bulk`,
    );
  }

  if (/brand dna|white label|branding page|site name config/.test(m)) {
    const b = compactDeskModuleReply("brand_dna");
    if (b) return deskReply(b);
  }

  if (/countries page|geo gate|block country|country allow/.test(m)) {
    const b = compactDeskModuleReply("countries");
    if (b) return deskReply(b);
  }

  if (/preferences page|platform toggle|terminal default|timezone default/.test(m)) {
    const b = compactDeskModuleReply("preferences");
    if (b) return deskReply(b);
  }

  if (/regional desk|language desk|german desk|desks page/.test(m)) {
    const b = compactDeskModuleReply("desks");
    if (b) return deskReply(b);
  }

  if (/desk group|groups page|role bucket/.test(m)) {
    const b = compactDeskModuleReply("groups");
    if (b) return deskReply(b);
  }

  if (/client status|pipeline label|crm status page|status analytics/.test(m)) {
    const b = compactDeskModuleReply("client_statuses");
    if (b) return deskReply(b);
  }

  if (/settings|configuration|commissions|where.*config|platform config/.test(m)) {
    return deskReply(
      `SETTINGS\nâ€¢ Hub â†’ /admin/settings\nâ€¢ Brand DNA, Commissions, Deposits, Statuses, Access Keys\nâ€¢ Owner tools (Configuration, Event Logs) need primary admin`,
    );
  }

  if (/super admin|owner configuration|system configuration|cache flush/.test(m)) {
    return deskReply(
      `SUPER ADMIN (owner only)\nPath: /admin/system/configuration\nâ€¢ Platform maintenance â€” groups, cache, phones\nâ€¢ Read green guide before any destructive button\nâ€¢ Event Logs = CRM audit; History Logs = operator notes`,
    );
  }

  if (
    /broker pitch|why curio|why curiocrm|vs salesforce|vs zoho|enterprise crm|sovereign crm|white.label broker|ipo desk|need this crm/.test(
      m,
    )
  ) {
    return deskReply(BROKER_PITCH_INSTANT);
  }

  if (matchesKnowmeArchitectureQuery(message)) {
    return deskReply(formatKnowmeArchitectureAnswer());
  }

  if (/knowme|know me|visual flow|golden path slide/.test(m)) {
    return deskReply(
      `KNOWME â€” CRM demo classroom (admin / management tier)\nPath: /admin/knowme\nâ€¢ AI tiers panel â€” 10 live Ollama vs 90 preemptive Q&A\nâ€¢ Visual Flows â€” 5 slides: leadâ†’depositâ†’trade, affiliates, PSP, assign, telephony\nâ€¢ Ask KNOWME â€” wiki + optional live AI when Ollama is on\nPair with â€œdemo tourâ€ for every admin page.`,
    );
  }

  if (/desk team|crm agents|staff list|sales agents page/.test(m)) {
    const b = compactDeskModuleReply("desk_team");
    if (b) return deskReply(b);
  }

  if (/scoreboard|agent perf|sales report|who sold/.test(m)) {
    const b = compactDeskModuleReply("scoreboard");
    if (b) return deskReply(b);
    return deskReply(
      `SCOREBOARD\nDesk Team performance for the selected period â€” compare before commission payouts.\nPath: /admin/crm/sales-report`,
    );
  }

  if (/intel note|client note|notes page|crm notes/.test(m)) {
    const b = compactDeskModuleReply("intel_notes");
    if (b) return deskReply(b);
  }

  if (/comms log|email log|logged email/.test(m)) {
    const b = compactDeskModuleReply("comms_log");
    if (b) return deskReply(b);
  }

  if (/schedule|calendar callback|crm calendar/.test(m)) {
    const b = compactDeskModuleReply("schedule");
    if (b) return deskReply(b);
  }

  if (/desk intel|agents zone intel/.test(m)) {
    return deskReply(
      `DESK INTEL\nâ€¢ Intel Notes â†’ /admin/crm/notes â€” every note across Client Files\nâ€¢ Comms Log â†’ /admin/crm/emails â€” logged email record (not SMTP send)\nâ€¢ Schedule â†’ /admin/crm/calendar â€” registrations and money timeline\nâ€¢ Log a note on Client File after every call â€” zero notes = hot lead risk`,
    );
  }

  if (/live floor|online visitor|who is on site/.test(m)) {
    return deskReply(
      `LIVE FLOOR\nPath: /admin/online\nâ€¢ Real-time visitors on the public site\nâ€¢ Pair with Hot Leads â€” call while they are browsing\nâ€¢ Attribution column shows campaign source when set`,
    );
  }

  if (/funded account|depositor|first deposit/.test(m)) {
    return deskReply(
      `FUNDED ACCOUNTS\nPath: /admin/crm/depositors\nâ€¢ Clients with at least one approved deposit\nâ€¢ Golden path: Pending In approve â†’ Credits In â†’ appears here\nâ€¢ Click name â†’ Client File â†’ Money / Trades tabs`,
    );
  }

  if (/order storage|trade sync|position mismatch/.test(m)) {
    return deskReply(
      `ORDER STORAGE LOGS\nPath: /admin/system/order-storage-logs\nâ€¢ Trade sync between CRM and execution engine\nâ€¢ Use when Live Book positions look wrong\nâ€¢ Screenshot timestamp + open ticket for tech support`,
    );
  }

  if (/promo code|signup code|welcome bonus code/.test(m)) {
    return deskReply(
      `PROMO CODES\nPath: /admin/system/promo-code\nâ€¢ Signup codes with optional bonus % and desk group\nâ€¢ Protected codes linked in Auto Assign â€” remove there before delete\nâ€¢ Pair with Rewards for manual discretionary bonuses`,
    );
  }

  if (/crypto fee|crypto commission|crypto commissions/.test(m)) {
    const b = compactDeskModuleReply("crypto_commissions");
    if (b) return deskReply(b);
  }

  if (/forex commission|trade fee|fx fee|fx commission/.test(m)) {
    const b = compactDeskModuleReply("forex_commissions");
    if (b) return deskReply(b);
    return deskReply(
      `COMMISSIONS\nForex fee matrix â€” pair with Spread and Account Types for full client cost.\nPath: /admin/system/forex-commissions Â· Crypto: /admin/system/crypto-commissions`,
    );
  }

  if (/operator brief|pipeline brief|owner brief|desk audit/.test(m)) {
    return deskReply(
      `OPERATOR BRIEF\nâ€¢ Wallstreet AI â†’ /admin/desk â†’ Operator Brief button\nâ€¢ Registrations, uncalled leads, bad actors, agent load â€” narrative audit\nâ€¢ Pair with morning routine: Mission Control â†’ Hot Leads â†’ Pending In`,
    );
  }

  if (/agent brief|floor brief|09:25|sales brief|morning lines/.test(m)) {
    return deskReply(
      `AGENT BRIEF\nâ€¢ Wallstreet AI â†’ Agent Brief â€” market movers + pitch lines for the floor\nâ€¢ CRM data only â€” not client-facing advice\nâ€¢ Run after Mission Control so agents know who to call first`,
    );
  }

  if (/impersonat|view as client|login as client/.test(m)) {
    return deskReply(
      `IMPERSONATE\nâ€¢ Client File â†’ Impersonate â€” browse public site as that client\nâ€¢ Log every use in History Logs â€” compliance sensitive\nâ€¢ Never trade or withdraw while impersonating`,
    );
  }

  if (/history log|operator history|who changed status/.test(m)) {
    const b = compactDeskModuleReply("history_logs");
    if (b) return deskReply(b);
  }

  if (/street ai page|WALLSTREET AI|wallstreet ai|ask wallstreet|desk assistant|ai bubble/.test(m)) {
    const b = compactDeskModuleReply("street_ai");
    if (b) return deskReply(b);
  }

  if (/sub admin|sub-admin|team permission override/.test(m)) {
    return deskReply(
      `SUB-ADMINS\nâ€¢ /admin/system/team-permissions â€” owner-only staff overrides\nâ€¢ Distinct from Groups + Permissions matrix\nâ€¢ Use for one-off API scopes without new desk group`,
    );
  }

  if (/tenant paused|tenant status|billing kill|stack paused|crm offline|is_active/.test(m)) {
    const b = compactDeskModuleReply("tenant_status");
    if (b) return deskReply(b);
  }

  if (/vendor license|curioni|license heartbeat|402 license|license revoked|license grace/.test(m)) {
    const b = compactDeskModuleReply("vendor_license");
    if (b) return deskReply(b);
  }

  if (/ollama offline|local ai offline|ai engine offline|street ai down|WALLSTREET AI down|wallstreet ai down|model offline|\/api\/ready/.test(m)) {
    return deskReply(
      `OLLAMA / READY\nInstant CRM answers still work (demo tour, morning routine, any module name) â€” zero LLM wait.\nLLM briefs need GET /api/ready with ollama:true â€” restart Ollama on the VPS if false.\nFile attachments while offline: digest-only until the engine returns.`,
    );
  }

  if (/balance event|balance audit trail/.test(m)) {
    const b = compactDeskModuleReply("balance_events");
    if (b) return deskReply(b);
  }

  if (/error log|server error|api exception/.test(m)) {
    const b = compactDeskModuleReply("error_logs");
    if (b) return deskReply(b);
  }

  if (/smtp log|email delivery|password reset email/.test(m)) {
    const b = compactDeskModuleReply("smtp_logs");
    if (b) return deskReply(b);
  }

  if (/api doc|rest api|integration doc/.test(m)) {
    const b = compactDeskModuleReply("api_docs");
    if (b) return deskReply(b);
  }

  if (/affiliate|ib partner|partner registry/.test(m) && !/oauth/.test(m)) {
    const b = compactDeskModuleReply("allies");
    if (b) return deskReply(b);
  }

  if (/dynamic status|pipeline rule|when.*status/.test(m)) {
    const b = compactDeskModuleReply("dynamic_status");
    if (b) return deskReply(b);
  }

  if (/trading status|block trading|freeze trading|trading freeze/.test(m)) {
    const b = compactDeskModuleReply("trading_status");
    if (b) return deskReply(b);
  }

  if (/deposit limit|min deposit|max deposit|min max/.test(m)) {
    const b = compactDeskModuleReply("min_max_deposits");
    if (b) return deskReply(b);
  }

  if (/event log|audit trail|who changed/.test(m)) {
    const b = compactDeskModuleReply("event_logs");
    if (b) return deskReply(b);
  }

  if (
    /why curio|why curiocrm|broker pitch|sell this crm|white label pitch|enterprise broker|ceo demo|pitch the platform|why this platform|why this crm/.test(
      m,
    )
  ) {
    return deskReply(BROKER_PITCH_INSTANT);
  }

  if (/^(thanks|thank you|thx|ok|okay|got it|perfect|cheers|copy)\b/.test(m)) {
    return deskReply(`Anytime. Next move?`);
  }

  return null;
}

/** Never leave the operator with a dead end when Ollama hiccups. */
export function deskAssistFallback(
  message: string,
  history?: { role: "user" | "assistant"; content: string }[],
): { reply: string } {
  const hit = deskFastPath(message, history);
  if (hit) return hit;
  if (isPitchOrMarketTipRequest(message)) {
    return deskReply(buildPitchReply(message, null));
  }
  return deskReply(
    "Desk live — CRM + pipeline on your server.\n\nTry: demo tour · morning routine · broker pitch · pending in · pass the test · vendor license · balance fixes · payment radar · live book · knowme",
  );
}

/** Body for SSE â€” strips END marker for display layer. */
export function deskFastPathBody(
  message: string,
  history?: { role: "user" | "assistant"; content: string }[],
): string | null {
  const hit = deskFastPath(message, history);
  if (!hit) return null;
  return hit.reply.replace(/\n\nEND\s*$/i, "").trimEnd();
}
