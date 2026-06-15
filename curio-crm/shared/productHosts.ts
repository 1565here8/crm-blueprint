/**
 * Product hosts — fully env-driven for any broker domain.
 *
 * HOW IT WORKS
 * ─────────────
 * Set ADMIN_URL and PUBLIC_SITE_URL in .env for any broker:
 *
 *   ADMIN_URL=https://admin.mybroker.com
 *   PUBLIC_SITE_URL=https://mybroker.com
 *
 * The system automatically routes requests to the right domain
 * — no code changes needed for a new broker.
 */

export const CURIONILABS_CRM_ADMIN_URL = "https://curionilabs.com";
export const CURIONILABS_PUBLIC_URL   = "https://curionilabs.com";

export const CRM_ADMIN_HOSTNAMES = [
  "curionilabs.com",
  "admin.localhost",
  "localhost",
  "127.0.0.1",
] as const;

export function normalizeHostname(host: string): string {
  return host.toLowerCase().split(",")[0].trim().replace(/:\d+$/, "");
}

export function isCurionilabsHost(host: string): boolean {
  const h = normalizeHostname(host);
  return h === "curionilabs.com" || h.endsWith(".curionilabs.com");
}

export function isCurionilabsIsolation(): boolean {
  return process.env.CURIONILABS_ONLY === "1";
}

export function isCrmAdminHostname(host: string): boolean {
  return (CRM_ADMIN_HOSTNAMES as readonly string[]).includes(normalizeHostname(host));
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function parseDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function envAdminHostname(): string {
  const raw = process.env.ADMIN_URL?.trim();
  return raw ? parseDomainFromUrl(raw) : "";
}

function envPublicHostname(): string {
  const raw = process.env.PUBLIC_SITE_URL?.trim();
  return raw ? parseDomainFromUrl(raw) : "";
}

function envBrokerDomain(): string {
  return process.env.BROKER_DOMAIN?.trim().toLowerCase() ?? "";
}

/**
 * Matches the incoming host against whatever broker domain is
 * configured in environment. Works for ANY domain — no hardcoded list.
 */
export function isBrokerPublicHost(host: string): boolean {
  const h = normalizeHostname(host);
  const admin = envAdminHostname();
  const pub = envPublicHostname();
  const broker = envBrokerDomain();
  if (broker && (h === broker || h.endsWith("." + broker))) return true;
  if (pub && h === pub) return true;
  if (admin && h === admin) return false;
  return false;
}

export function isBrokerAdminHost(host: string): boolean {
  const h = normalizeHostname(host);
  const admin = envAdminHostname();
  const broker = envBrokerDomain();
  if (admin && h === admin) return true;
  if (broker && h === "admin." + broker) return true;
  return false;
}

export function isMobileTraderHost(host: string): boolean {
  const h = normalizeHostname(host);
  const broker = envBrokerDomain();
  if (broker && h === "mobile." + broker) return true;
  const admin = envAdminHostname();
  if (admin && h === "mobile." + parseDomainFromUrl(admin)) return true;
  return false;
}

export function isRetiredVendorHost(_host: string): boolean {
  return false;
}

export function coerceUrlForRetiredHost(_host: string, url: string): string {
  return url;
}

export function assertCurionilabsOnlyUrls(_host: string | undefined, url: string): string {
  return url;
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
