export type UsMarketSession = "pre_market" | "regular" | "after_hours" | "closed";

export type MarketStatus = {
  usEquity: {
    session: UsMarketSession;
    label: string;
    tradable: boolean;
    timezone: "America/New_York";
    hoursNote: string;
  };
  crypto: {
    session: "open";
    label: string;
    tradable: true;
    hoursNote: string;
  };
  costModel: {
    perUserFee: 0;
    note: string;
  };
};

/** US equity sessions in America/New_York (minutes from midnight). */
export function getUsMarketSession(now = new Date()): UsMarketSession {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const mins = hour * 60 + minute;

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  if (isWeekend) return "closed";

  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return "pre_market";
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return "regular";
  if (mins >= 16 * 60 && mins < 20 * 60) return "after_hours";
  return "closed";
}

const SESSION_LABELS: Record<UsMarketSession, string> = {
  pre_market: "Pre-market (4:00–9:30 AM ET)",
  regular: "Regular (9:30 AM–4:00 PM ET)",
  after_hours: "After-hours (4:00–8:00 PM ET)",
  closed: "Closed (weekends & overnight ET)",
};

export function getMarketStatus(): MarketStatus {
  const session = getUsMarketSession();
  const tradable = session !== "closed";

  return {
    usEquity: {
      session,
      label: SESSION_LABELS[session],
      tradable,
      timezone: "America/New_York",
      hoursNote: "NYSE & NASDAQ — pre-market, regular, and after-hours (Mon–Fri ET)",
    },
    crypto: {
      session: "open",
      label: "Open 24/7",
      tradable: true,
      hoursNote: "Crypto markets never close",
    },
    costModel: {
      perUserFee: 0,
      note: "Unlimited users stored locally (SQLite). One shared free quote feed — no per-user broker billing.",
    },
  };
}

export function canTradeUsEquityNow(): boolean {
  return getUsMarketSession() !== "closed";
}
