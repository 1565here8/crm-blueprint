/**
 * Broker brand config — reads from env, falls back to TradeToros defaults.
 *
 * Set these in .env for ANY broker:
 *   BROKER_NAME="My Broker"
 *   BROKER_DISPLAY="MYBROKER"
 *   BROKER_DOMAIN="mybroker.com"
 *   BROKER_SUPPORT_EMAIL="support@mybroker.com"
 *   BROKER_TAGLINE="Your tagline here"
 *   BROKER_PRIMARY_COLOR="#0ea5e9"
 *   BROKER_ACCENT_COLOR="#f59e0b"
 */

function envStr(key: string, fallback: string): string {
  if (typeof process !== "undefined" && process.env[key]?.trim()) {
    return process.env[key]!.trim();
  }
  return fallback;
}

export const BROKER_DISPLAY  = envStr("BROKER_DISPLAY", "TRADETOROS");
export const BROKER_NAME     = envStr("BROKER_NAME", "TradeToros");
export const BROKER_DOMAIN   = envStr("BROKER_DOMAIN", "tradetoros.com");
export const BROKER_SUPPORT_EMAIL = envStr("BROKER_SUPPORT_EMAIL", "support@tradetoros.com");
export const BROKER_TAGLINE  = envStr("BROKER_TAGLINE", "Professional trading platform");

export const BROKER_COLORS = {
  primary: envStr("BROKER_PRIMARY_COLOR", "#0ea5e9"),
  accent:  envStr("BROKER_ACCENT_COLOR", "#f59e0b"),
  dark:    envStr("BROKER_DARK_COLOR", "#0f172a"),
  panel:   envStr("BROKER_PANEL_COLOR", "#1e293b"),
} as const;
