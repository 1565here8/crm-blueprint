import {
  assertCurionilabsOnlyUrls,
  isCurionilabsHost,
} from "../../shared/productHosts";

declare global {
  interface Window {
    __curionilabsNavGuard?: boolean;
  }
}

/** Boot + SPA guard — Curioni hosts only. */
export function installCurionilabsNavigationGuard(): void {
  if (typeof window === "undefined") return;
  if (window.__curionilabsNavGuard) return;

  const host = window.location.hostname;

  if (!isCurionilabsHost(host)) return;

  const origOpen = window.open.bind(window);
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    if (typeof url === "string") {
      const safe = assertCurionilabsOnlyUrls(host, url);
      return origOpen(safe, target, features);
    }
    return origOpen(url, target, features);
  }) as typeof window.open;

  window.__curionilabsNavGuard = true;
}

export function sanitizeApiJsonForCurionilabs<T>(data: T): T {
  return data;
}
