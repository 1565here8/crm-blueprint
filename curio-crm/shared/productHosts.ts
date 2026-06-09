/**
 * Product hosts — Curioni Labs + TradeToros.
 */

export const CURIONILABS_CRM_ADMIN_URL = "https://curionilabs.com";
export const CURIONILABS_PUBLIC_URL = "https://curionilabs.com";

// ── TradeToros ──────────────────────────────────────────────
export const TRADOTOROS_CRM_ADMIN_URL = "https://admin.tradetoros.com";
export const TRADOTOROS_PUBLIC_URL   = "https://tradetoros.com";

export const CRM_ADMIN_HOSTNAMES = [
  "curionilabs.com",
  "admin.localhost",
  "localhost",
  "127.0.0.1",
] as const;

export const TRADOTOROS_HOSTNAMES = [
  "tradetoros.com",
  "www.tradetoros.com",
  "admin.tradetoros.com",
] as const;

export function normalizeHostname(host: string): string {
  return host.toLowerCase().split(",")[0].trim().replace(/:\d+$/, "");
}

export function isCurionilabsHost(host: string): boolean {
  const h = normalizeHostname(host);
  return h === "curionilabs.com" || h.endsWith(".curionilabs.com");
}

export function isCrmAdminHostname(host: string): boolean {
  return (CRM_ADMIN_HOSTNAMES as readonly string[]).includes(normalizeHostname(host));
}

export function isTradetorosHost(host: string): boolean {
  const h = normalizeHostname(host);
  return (TRADOTOROS_HOSTNAMES as readonly string[]).includes(h);
}

export function isTradetorosAdminHost(host: string): boolean {
  const h = normalizeHostname(host);
  return h === "admin.tradetoros.com";
}

export function assertCurionilabsOnlyUrls(_host: string | undefined, url: string): string {
  return url;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function crmAdminBaseUrl(_host?: string): string {
  const env =
    typeof process !== "undefined" && process.env?.ADMIN_URL
      ? stripTrailingSlash(process.env.ADMIN_URL.trim())
      : "";
  return env || CURIONILABS_CRM_ADMIN_URL;
}

export function crmUrlForHost(host?: string): string {
  return `${crmAdminBaseUrl(host)}/admin`;
}

export function publicSiteBaseUrl(_host?: string): string {
  const env =
    typeof process !== "undefined" && process.env?.PUBLIC_SITE_URL
      ? stripTrailingSlash(process.env.PUBLIC_SITE_URL.trim())
      : "";
  return env || CURIONILABS_PUBLIC_URL;
}
