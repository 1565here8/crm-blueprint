/**
 * TradeToros — broker brand config.
 * This file is imported by publicBrand.ts, branding context, and server/db.ts defaults.
 */

export const TRADOTOROS_DISPLAY = "TRADETOROS";
export const TRADOTOROS_NAME   = "TradeToros";
export const TRADOTOROS_DOMAIN = "tradetoros.com";
export const TRADOTOROS_SUPPORT_EMAIL = "support@tradetoros.com";
export const TRADOTOROS_TAGLINE = "Professional trading platform";

/** TradeToros brand colors (Tailwind-compatible). */
export const TRADOTOROS_COLORS = {
  primary: "#0ea5e9",    // sky-500
  accent:  "#f59e0b",    // amber-500
  dark:    "#0f172a",    // slate-900
  panel:   "#1e293b",    // slate-800
} as const;
