/** Broker copy for Payment Gateways tabs — keep in one place. */
export const paymentGatewayTabGuides: Record<string, { title: string; body: string }> = {
  "test-cards": {
    title: "Test credit card numbers",
    body: "Store sandbox merchant IDs, secret keys, and test card numbers your QA team uses before going live. Never put production secrets here if this CRM is shared — use your PSP backoffice for live keys. Expand a row to see full JSON credentials and attached reference files.",
  },
  processors: {
    title: "Processor list",
    body: "Controls which payment gateway a client sees at checkout, in what order, and for which countries. Lower priority numbers appear first. Disable a processor to hide it without deleting credentials. After editing rows, press Submit — changes apply to the deposit page routing logic.",
  },
  phpinfo: {
    title: "Phpinfo (legacy)",
    body: "On old PHP broker CRMs this showed server PHP version and extensions. Curioni Labs runs on Node.js — you do not need this page. For server diagnostics, ask your host or check VPS logs.",
  },
  "platform-admin": {
    title: "Platform Admin",
    body: "Super-admin controls for the whole white-label platform. Staff access and branding live under System → Permissions and Brand DNA. Use this tab only if your deploy enables platform-level PSP overrides.",
  },
  "refresh-trades": {
    title: "Refresh All Trades",
    body: "Legacy tool to re-sync open positions after a payment callback lagged. If a client paid but balance did not update, check Cashier → Pending In first, then Payment Radar. Manual refresh of Live Book is usually enough on this stack.",
  },
  feeds: {
    title: "Feeds",
    body: "Price and symbol feeds shown on the deposit or trading widget. Market data here comes from your configured broker feed (Alpaca / free live feeds). You rarely need to touch this unless deposit pages embed live quotes.",
  },
  "cascading-limits": {
    title: "Cascading deposit limits",
    body: "Rules that trigger a backup PSP when amount, country, or decline count hits a threshold. Example: if directPay fails twice, route to payretailers. Set limits here; order of fallbacks is on Cascading Deposit Items.",
  },
  "cascading-items": {
    title: "Cascading deposit items",
    body: "Ordered list of backup gateways in the cascade. Position 1 is tried first after the primary fails. Match gateway names exactly to entries in Test Credit Cards and Processors.",
  },
};
