/** Broker mini-guides for System menu pages (outside Payment Gateways). */
export const systemSectionGuides: Record<string, { title: string; body: string; actions?: Array<{ label: string; help: string }> }> = {
  "super-admin": {
    title: "Super Admin",
    body: "Platform-owner controls: kill-switch, tenant status, and cross-desk settings. Start with System → Access Keys to decide who sees what. Contact your platform vendor before changing super-admin flags.",
    actions: [{ label: "Access Keys", help: "Opens team permissions — who can see clients, money, and trading tools." }],
  },
  common: {
    title: "Common settings",
    body: "Countries, preferences, release PDF, security, and brand DNA — legacy System → Common menu rebuilt for Curioni Labs.",
    actions: [
      { label: "Countries", help: "Allow visits / registration / trading per ISO + phone prefix." },
      { label: "Brand DNA", help: "CRM sidebar name and Go to site link." },
    ],
  },
  countries: {
    title: "Countries",
    body: "Full country list with toggles for site access, signup, and trading. Edit prefix and display name per row.",
  },
  preferences: {
    title: "Preferences",
    body: "Default currency, timezone, and date format.",
  },
  "release-pdf": {
    title: "Release Pdf",
    body: "HTTPS link to release or compliance PDF for desk agents.",
  },
  security: {
    title: "Security zone",
    body: "Owner console: dashboard, IP perimeter, DNS, SSL, infrastructure health, and login audit. Legacy Common → Security links redirect here.",
    actions: [
      { label: "Security dashboard", help: "Health, license, tenant, rate limits — export JSON." },
      { label: "My IP & perimeter", help: "Compare your IP to office allowlist." },
    ],
  },
  "security-dashboard": {
    title: "Security dashboard",
    body: "Aggregate /api/health, Ollama ready, vendor license, tenant active, and session policy. Built for $1M+/mo broker ops reviews.",
  },
  "security-perimeter": {
    title: "My IP & perimeter",
    body: "CRM-visible IP, VPS egress, X-Forwarded-For chain, and allowlist match for owner and staff.",
  },
  "security-dns": {
    title: "DNS checker",
    body: "Server-side A/AAAA/CNAME/MX/TXT/NS lookup with propagation hints after DNS provider changes.",
  },
  "security-ssl": {
    title: "SSL / TLS",
    body: "Certificate issuer, expiry countdown, and SAN list for admin and public domains.",
  },
  tracking: {
    title: "Tracking",
    body: "Marketing attribution pixels and UTM capture. For campaigns and partners, use Acquire → Attribution instead — this tab is for legacy global tracking snippets.",
  },
  "api-docs": {
    title: "API Docs",
    body: "REST hooks for external CRMs, affiliate systems, and lead importers. Keys live under Acquire → Integrations.",
  },
  oauth: {
    title: "OAuth",
    body: "Enterprise login (Google, Microsoft, custom IdP). Enable when compliance requires SSO — not needed for a standard sales desk.",
  },
  permissions: {
    title: "Permissions",
    body: "Desk-group role matrix: CRM sidebar toggles and REST API scopes. Pick a group, flip switches, save — synced with the Groups table.",
    actions: [
      { label: "Groups", help: "Browse desk groups with search and pagination." },
      { label: "Access Keys", help: "Per-user overrides — assign presets to named sub-admins." },
    ],
  },
  groups: {
    title: "Groups",
    body: "Desk role buckets (admin, rep, retention, affiliate). Click a name to edit CRM + API permissions for that group.",
    actions: [{ label: "Permissions", help: "Opens the matrix editor with CRM and API tabs." }],
  },
  desks: {
    title: "Desks",
    body: "Regional language floors — German Desk, UK Desk, LATAM, etc. Assign agents; client counts include desk-tagged leads and agent-owned clients.",
    actions: [
      { label: "Auto Assign", help: "Route language/country traffic to desk agents." },
      { label: "All Clients", help: "Open a desk drawer → filtered client list." },
    ],
  },
  "account-type": {
    title: "Account Types",
    body: "Retail vs VIP vs IB — controls default leverage, spread markup, and min/max deposits for new clients. Edit a tier before launching a campaign with different limits.",
    actions: [{ label: "Add account type", help: "Brokers with many tiers (Retail, Pro, VIP, IB) create one row per product — assign on registration or import." }],
  },
  "crypto-commissions": {
    title: "Crypto Commissions",
    body: "Tier 0 (default) through 4 × nine currencies — fixed per-side crypto fees. Dark matrix UI; one Update saves all cells. Requires Fees & trading status permission.",
    actions: [{ label: "Account Types", help: "Map Retail / VIP / IB products to crypto commission tier rows." }],
  },
  spread: {
    title: "Spread",
    body: "Tier trade-percent ladder (A–K + Neutral) plus exchange matrix by asset class. Live preview shows markup impact. Scope: platform default, per-client override, or demo paper accounts.",
    actions: [
      { label: "Restore defaults", help: "Exchange tab → Restore to default resets the full matrix to seeded values." },
      { label: "Account type link", help: "VIP / Retail / IB account types map to spread tier slugs on the Account Type page." },
    ],
  },
  "promo-code": {
    title: "Promo Code",
    body: "Codes for new investors, affiliates, and custom campaigns. Investor/Affiliate badges show intent; codes linked to Auto Assign show a protection badge instead of Delete.",
    actions: [
      {
        label: "Add promo code",
        help: "Enter the code clients type at signup, pick purpose (Investor / Affiliate / Custom), optional bonus %, and desk group for routing.",
      },
    ],
  },
  "auto-assign": {
    title: "Auto Assign",
    body: "Rules run by precedence (1 = first match). Route promo codes, campaigns (e.g. Amazon, all-campaigns), country, or language to desk agents. Wire `resolveAutoAssignAgent` on signup when ready.",
  },
  notifications: {
    title: "Notifications",
    body: "Per-agent alert matrix: pick a desk member, toggle email / push / in-app for each event (new lead, deposit request, margin call, etc.). Turn off email for agents who only work inside the CRM.",
  },
  "min-max-deposits": {
    title: "Deposit Limits",
    body: "Floor and ceiling per deposit by currency, PSP, country, and FTD flag. Set $50 min on card PSP for micro-deposit fraud; cap max where KYC cannot verify whales.",
  },
  status: {
    title: "Client Status",
    body: "Pipeline colours: New, Callback, Deposited, etc. Bulk-change from All Clients → select rows → change status.",
  },
  "dynamic-status": {
    title: "Dynamic Status",
    body: "Automated status moves when balance or activity changes (e.g. Deposited after first credit). Manual status still works without this.",
  },
  "trading-status": {
    title: "Trading Status",
    body: "Block trading while allowing deposits, or freeze account entirely. Use Client File → Trading tab for one-off blocks today.",
  },
  "event-logs": {
    title: "Event Logs",
    body: "Full CRM audit trail — status changes, logins, owner moves, money events. Dark mission-control UI with UTC period bar, advanced filters, and CSV export. Owner-only.",
  },
  configuration: {
    title: "Configuration",
    body: "Global feature flags and environment toggles for the platform vendor. Brokers rarely edit this directly.",
  },
  "error-logs": {
    title: "Error Logs",
    body: "API and server exceptions — send a screenshot to support when clients report ‘something broke’. VPS logs hold the full trace.",
  },
  "smtp-logs": {
    title: "SMTP Logs",
    body: "Outbound email delivery status. If clients say they never got password reset, check spam first, then these logs.",
  },
  "balance-events": {
    title: "Balance events",
    body: "Every credit and debit with timestamp. Cashier → Full Ledger is the operator-friendly view of the same money trail.",
  },
  "history-logs": {
    title: "History Logs",
    body: "Operator action history across the CRM — status changes, notes, impersonation. Client File timeline shows per-user history.",
  },
  "order-storage-logs": {
    title: "Order Storage Logs",
    body: "Trade sync between CRM and execution layer. If Live Book disagrees with the client terminal, note the time and open a ticket.",
  },
};
