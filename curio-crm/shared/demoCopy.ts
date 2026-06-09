/** Public demo disclaimers — www only; admin unchanged. */

export const DEMO_BADGE = "Demo only";

export const DEMO_SHORT =
  "Simulated trading environment — not a live broker. Not affiliated with eToro Group Ltd or etoro.com.";

export const DEMO_HERO_SUB =
  "Institutional broker demo: unified client portal, treasury, and operator CRM on one stack — simulated markets for authorized partner review only.";

export const DEMO_FOOTER =
  "Demo only · simulated markets · not investment advice · not a live broker · not affiliated with eToro Group Ltd or etoro.com.";

export function demoMetaDescription(brandName: string): string {
  return `${brandName} — independent multi-asset broker demo. Simulated trading for authorized demonstrations only. Not affiliated with eToro Group Ltd or etoro.com.`;
}

/** @deprecated Use demoMetaDescription(brandName) */
export const DEMO_META_DESCRIPTION = demoMetaDescription("Curioni Labs");

export const DEMO_AUTH_NOTE =
  "Demo accounts use simulated funds. Not a live broker or regulated offering.";

export const DEMO_CONCIERGE_TAGLINE =
  "Demo concierge — simulated platform only; not a live broker.";

export const DEMO_TRUST_BADGES = [
  "Demo environment",
  "Simulated prices",
  "Independent stack",
  "Not eToro affiliated",
] as const;

/** Xtoropro — sales-grade trust strip (no “demo” language). */
export const BROKER_TRUST_BADGES = [
  "Segregated accounts",
  "24/5 client support",
  "Multi-asset markets",
  "Secure client portal",
] as const;

/** Footer micro-copy — legally safe, unobtrusive on public site. */
export const BROKER_FOOTER_LEGAL =
  "Simulated trading environment · not a live broker or regulated offering · not investment advice · not affiliated with eToro Group Ltd or etoro.com.";

export const BROKER_AUTH_NOTE =
  "Practice accounts use simulated funds. See terms for full risk disclosures.";

export const BROKER_CONCIERGE_TAGLINE =
  "Ask about markets, funding, or your account — our team responds within one business day.";

export function publicFooterLegal(isDemoHost: boolean): string {
  return isDemoHost ? DEMO_FOOTER : BROKER_FOOTER_LEGAL;
}

export function publicAuthNote(isDemoHost: boolean): string {
  return isDemoHost ? DEMO_AUTH_NOTE : BROKER_AUTH_NOTE;
}

export function publicConciergeTagline(isDemoHost: boolean): string {
  return isDemoHost ? DEMO_CONCIERGE_TAGLINE : BROKER_CONCIERGE_TAGLINE;
}

export function publicTrustBadges(isDemoHost: boolean): readonly string[] {
  return isDemoHost ? DEMO_TRUST_BADGES : BROKER_TRUST_BADGES;
}
