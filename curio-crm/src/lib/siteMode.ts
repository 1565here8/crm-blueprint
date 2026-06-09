import {

  coerceUrlForRetiredHost,

  isCrmAdminHostname,

  isRetiredVendorHost,

  isCurionilabsHost,

  isDagulaiFamilyHost,

  isTradetorosHost,

  isTradetorosAdminHost,

  CURIONILABS_CRM_ADMIN_URL,

  CURIONILABS_PUBLIC_URL,

  dagulaiFamilyAdminUrl,

  dagulaiFamilyPublicUrl,

  TRADOTOROS_CRM_ADMIN_URL,

  TRADOTOROS_PUBLIC_URL,

} from "../../shared/productHosts";



export function isXtoroproHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  return false;

}



export function isXtoroproHostClient(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  return false;

}

export function isTradetorosClientHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  return isTradetorosHost(hostname) && !isTradetorosAdminHost(hostname);

}



export function isAdminHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  if (typeof window !== "undefined" && window.__CRM_ADMIN_SHELL) return true;

  return isCrmAdminHostname(hostname);

}



export function isSignupOnlySite(_hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {

  return false;

}



export function getPublicSiteUrl(hostname = typeof window !== "undefined" ? window.location.hostname : ""): string {

  const url = isTradetorosHost(hostname)

    ? TRADOTOROS_PUBLIC_URL

    : isCurionilabsHost(hostname)

      ? CURIONILABS_PUBLIC_URL

      : isDagulaiFamilyHost(hostname)

        ? dagulaiFamilyPublicUrl(hostname)

        : CURIONILABS_PUBLIC_URL;

  return coerceUrlForRetiredHost(hostname, url);

}



export function getAdminUrl(hostname = typeof window !== "undefined" ? window.location.hostname : ""): string {

  if (typeof window !== "undefined" && isCrmAdminHostname(window.location.hostname)) {

    return window.location.origin;

  }

  const url = isTradetorosHost(hostname)

    ? TRADOTOROS_CRM_ADMIN_URL

    : isRetiredVendorHost(hostname)

      ? CURIONILABS_CRM_ADMIN_URL

      : isCurionilabsHost(hostname)

        ? CURIONILABS_CRM_ADMIN_URL

        : isDagulaiFamilyHost(hostname)

          ? dagulaiFamilyAdminUrl(hostname)

          : typeof window !== "undefined"

            ? window.location.origin

            : CURIONILABS_CRM_ADMIN_URL;

  return coerceUrlForRetiredHost(hostname, url);

}



export const PUBLIC_SITE_URL = CURIONILABS_PUBLIC_URL;

