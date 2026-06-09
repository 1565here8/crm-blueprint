/** Visual flow slides for KNOWME — shared by UI carousel and chat knowledge. */
export type FlowStep = {
  id: string;
  label: string;
  /** Plain-English why this step matters */
  why: string;
  /** lucide icon name hint for UI */
  icon: string;
  /** Optional highlight badge (e.g. API, Trackers) */
  badge?: string;
};

export type KnowmeFlowSlide = {
  id: string;
  /** 1-based slide number for chat references ("see slide 3") */
  slideNumber: number;
  title: string;
  subtitle: string;
  steps: FlowStep[];
  /** Keywords for local chat matching */
  keywords: string[];
  /** One-line chat hint when AI references this slide */
  chatRef: string;
};

export const KNOWME_FLOW_SLIDES: KnowmeFlowSlide[] = [
  {
    id: "golden-path",
    slideNumber: 1,
    title: "Client golden path",
    subtitle: "From first click to funded trader — the happy path every broker should know.",
    keywords: ["golden path", "lead to trade", "client journey", "full flow", "lifecycle"],
    chatRef: "See slide 1 (Client golden path) for Lead → Assign → Deposit → Trade → Payout.",
    steps: [
      {
        id: "lead",
        label: "Lead",
        icon: "UserPlus",
        why: "Someone left their name on the site or came from a partner link. They are not a client yet — just a hand-raise.",
      },
      {
        id: "assign",
        label: "Assign",
        icon: "UserCheck",
        why: "A manager or auto-assign rule puts the lead on an agent's desk so someone owns the callback.",
      },
      {
        id: "deposit",
        label: "Deposit",
        icon: "Wallet",
        why: "Client sends money. Cashier approves the request — balance goes up and they become a funded account.",
      },
      {
        id: "trade",
        label: "Trade",
        icon: "TrendingUp",
        why: "Funded clients open positions on the platform. You track activity in Live Book and client file.",
      },
      {
        id: "payout",
        label: "Payout",
        icon: "Banknote",
        why: "When they withdraw, cashier processes the payout. Balance drops — keep notes on every wire.",
      },
    ],
  },
  {
    id: "affiliate",
    slideNumber: 2,
    title: "Affiliate & partner flow",
    subtitle: "How partner traffic lands in your CRM with proper credit.",
    keywords: ["affiliate", "partner", "tracker", "pixel", "attribution", "campaign", "marketing"],
    chatRef: "See slide 2 (Affiliate flow) for partner → tracker pixel → CRM → attribution.",
    steps: [
      {
        id: "partner",
        label: "Affiliate / partner",
        icon: "Handshake",
        why: "External sites or IBs send traffic. Each partner gets a unique tracking link in Marketing.",
      },
      {
        id: "pixel",
        label: "Tracker pixel",
        icon: "Radar",
        badge: "Trackers",
        why: "The pixel or URL tag fires when someone registers — so you know which partner sent them.",
      },
      {
        id: "crm",
        label: "Lead in CRM",
        icon: "Inbox",
        why: "Registration creates a row in Hot Leads / All Clients with the partner ID stored on the profile.",
      },
      {
        id: "api",
        label: "API sync",
        icon: "Plug",
        badge: "API",
        why: "Partners can pull stats via API keys (Marketing → Integrations). No spreadsheet guessing.",
      },
      {
        id: "attrib",
        label: "Attribution",
        icon: "BarChart3",
        why: "Scoreboard and reports show which partner brought funded clients — pay commissions fairly.",
      },
    ],
  },
  {
    id: "psp",
    slideNumber: 3,
    title: "PSP & payments flow",
    subtitle: "How client deposits move from request to live balance.",
    keywords: ["psp", "payment", "deposit", "gateway", "webhook", "cashier", "approve deposit", "card"],
    chatRef: "See slide 3 (PSP / payments) for deposit request → gateway → webhook → cashier approve → balance.",
    steps: [
      {
        id: "request",
        label: "Deposit request",
        icon: "CreditCard",
        why: "Client clicks Deposit on the site. A pending row appears in Cashier → Pending In.",
      },
      {
        id: "gateway",
        label: "PSP / gateway",
        icon: "Globe",
        why: "Card or crypto rail processes the payment off-site (Stripe-style processor).",
      },
      {
        id: "webhook",
        label: "Webhook / API",
        icon: "Webhook",
        badge: "API",
        why: "The gateway pings the CRM when money clears — no manual refresh needed.",
      },
      {
        id: "approve",
        label: "Cashier approve",
        icon: "CheckCircle",
        why: "Staff reviews Pending In and approves. This credits balance and may flip status to depositor.",
      },
      {
        id: "balance",
        label: "Live balance",
        icon: "Wallet",
        why: "Client can trade immediately. Full history lives in Credits In and the client ledger.",
      },
    ],
  },
  {
    id: "assign-leads",
    slideNumber: 4,
    title: "Manager assigns leads",
    subtitle: "Getting new leads onto the right agent's queue — auto or by hand.",
    keywords: ["assign", "auto assign", "manager", "queue", "desk", "group", "distribution"],
    chatRef: "See slide 4 (Manager assigns leads) for auto-assign rules or manual assign → agent queue → calls.",
    steps: [
      {
        id: "manager",
        label: "Manager",
        icon: "Shield",
        why: "Desk lead or owner decides who works which leads — by skill, shift, or geography.",
      },
      {
        id: "rules",
        label: "Auto-assign OR manual",
        icon: "GitBranch",
        why: "Systems → Auto Assign runs round-robin rules. Or pick an agent from Hot Leads row-by-row.",
      },
      {
        id: "desk",
        label: "Desk / group",
        icon: "Users",
        why: "Optional: filter by desk or group so London team only sees London leads.",
      },
      {
        id: "queue",
        label: "Agent queue",
        icon: "ListOrdered",
        why: "Assigned leads show on the agent's Hot Leads and Action Queue — oldest first.",
      },
      {
        id: "call",
        label: "Agent calls",
        icon: "PhoneCall",
        why: "Agent dials, updates status (Call Back, Hot, Not Interested), and logs notes on client file.",
      },
    ],
  },
  {
    id: "telephony",
    slideNumber: 5,
    title: "Telephony & click-to-call",
    subtitle: "One click from CRM to logged call — no copy-paste phone numbers.",
    keywords: ["telephony", "click to call", "twilio", "phone", "call log", "dial"],
    chatRef: "See slide 5 (Telephony) for CRM click-to-call → provider → call logged on client record.",
    steps: [
      {
        id: "crm-lead",
        label: "Lead in CRM",
        icon: "User",
        why: "Open client file or Hot Leads row — phone number is already on the record.",
      },
      {
        id: "click",
        label: "Click-to-call",
        icon: "Phone",
        why: "Agent hits the phone icon. CRM sends the number to your telephony provider.",
      },
      {
        id: "provider",
        label: "Telephony provider",
        icon: "Radio",
        why: "Twilio-style service bridges agent softphone or desk handset to the client.",
      },
      {
        id: "connected",
        label: "Call connected",
        icon: "PhoneCall",
        why: "Agent talks; status dropdown updated live (Call Back, Hot, etc.).",
      },
      {
        id: "logged",
        label: "Logged on record",
        icon: "FileText",
        why: "Duration and outcome saved on client file — managers see activity without asking.",
      },
    ],
  },
];

export const KNOWME_FLOW_COUNT = KNOWME_FLOW_SLIDES.length;

export function getKnowmeFlowByNumber(n: number): KnowmeFlowSlide | undefined {
  return KNOWME_FLOW_SLIDES.find((s) => s.slideNumber === n);
}

export function getKnowmeFlowById(id: string): KnowmeFlowSlide | undefined {
  return KNOWME_FLOW_SLIDES.find((s) => s.id === id);
}

/** Plain-text block for LLM / local knowledge injection */
export function buildKnowmeFlowsKnowledge(): string {
  const lines = KNOWME_FLOW_SLIDES.map(
    (s) =>
      `Slide ${s.slideNumber}: ${s.title} — ${s.subtitle}. Steps: ${s.steps.map((st) => st.label).join(" → ")}. ${s.chatRef}`,
  );
  return `KNOWME VISUAL FLOWS (${KNOWME_FLOW_COUNT} slides — default set; more on request in chat):\n${lines.join("\n")}`;
}

/** Match user question to a slide for local chat fallback */
export function matchKnowmeFlowSlide(question: string): KnowmeFlowSlide | null {
  const q = question.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!q) return null;

  const slideNum = q.match(/slide\s*(\d)/);
  if (slideNum) {
    const n = parseInt(slideNum[1], 10);
    if (n >= 1 && n <= KNOWME_FLOW_COUNT) return getKnowmeFlowByNumber(n) ?? null;
  }

  for (const slide of KNOWME_FLOW_SLIDES) {
    if (slide.keywords.some((k) => q.includes(k))) return slide;
  }

  if (/golden|journey|lifecycle|lead.*trade/.test(q)) return getKnowmeFlowById("golden-path") ?? null;
  if (/psp|webhook|gateway|pending in|approve.*deposit/.test(q)) return getKnowmeFlowById("psp") ?? null;
  if (/affiliate|partner|pixel|attribution/.test(q)) return getKnowmeFlowById("affiliate") ?? null;
  if (/assign|auto assign|distribution|agent queue/.test(q)) return getKnowmeFlowById("assign-leads") ?? null;
  if (/telephony|click.?to.?call|twilio|call log/.test(q)) return getKnowmeFlowById("telephony") ?? null;

  return null;
}

export function formatFlowSlideAnswer(slide: KnowmeFlowSlide): string {
  const steps = slide.steps
    .map((st, i) => `${i + 1}. ${st.label} — ${st.why}${st.badge ? ` [${st.badge}]` : ""}`)
    .join("\n");
  return `${slide.title} (Visual Flow slide ${slide.slideNumber})\n\n${slide.subtitle}\n\n${steps}\n\nOpen KNOWME → Visual Flows tab and use the dots to jump to slide ${slide.slideNumber}.`;
}
