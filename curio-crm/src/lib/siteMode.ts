import {
  coerceUrlForRetiredHost,
  isCrmAdminHostname,
  isRetiredVendorHost,
  isCurionilabsHost,
  isBrokerPublicHost,
  isBrokerAdminHost,
  CURIONILABS_CRM_ADMIN_URL,
  CURIONILABS_PUBLIC_URL,
} from "../../shared/productHosts";



export function isXtoroproHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  return false;

}



export function isXtoroproHostClient(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  return false;

}

export function isBrokerClientHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  return isBrokerPublicHost(hostname) && !isBrokerAdminHost(hostname);
}



export function isAdminHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  if (typeof window !== "undefined" && window.__CRM_ADMIN_SHELL) return true;

  return isCrmAdminHostname(hostname);

}



export function isSignupOnlySite(_hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  return false;

}



export function getPublicSiteUrl(hostname = typeof window !== "undefined" ? window.location.hostname : ""): string {
  const url = isBrokerPublicHost(hostname)
    ? (window.location.origin)
    : isCurionilabsHost(hostname)
      ? CURIONILABS_PUBLIC_URL
      : CURIONILABS_PUBLIC_URL;
  return coerceUrlForRetiredHost(hostname, url);
}



export function getAdminUrl(hostname = typeof window !== "undefined" ? window.location.hostname : ""): string {
  if (typeof window !== "undefined" && isCrmAdminHostname(window.location.hostname)) {
    return window.location.origin;
  }

  const url = isBrokerPublicHost(hostname)
    ? (typeof window !== "undefined" ? window.location.origin : CURIONILABS_CRM_ADMIN_URL)
    : isRetiredVendorHost(hostname)
      ? CURIONILABS_CRM_ADMIN_URL
      : isCurionilabsHost(hostname)
        ? CURIONILABS_CRM_ADMIN_URL
        : typeof window !== "undefined"
          ? window.location.origin
          : CURIONILABS_CRM_ADMIN_URL;

  return coerceUrlForRetiredHost(hostname, url);
}



export const PUBLIC_SITE_URL = CURIONILABS_PUBLIC_URL;

