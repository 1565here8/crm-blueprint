import { CRM_ADMIN_HOSTNAMES, isCrmAdminHostname, normalizeHostname } from "../../shared/productHosts";

declare global {
  interface Window {
    /** Set in index.html before React — forces operator CRM shell on admin hosts */
    __CRM_ADMIN_SHELL?: boolean;
  }
}

export function isCrmAdminShellHost(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  if (typeof window !== "undefined" && window.__CRM_ADMIN_SHELL) return true;
  return isCrmAdminHostname(hostname);
}

/** Before React: mark admin host and normalize entry paths to /admin. */
export function bootstrapCrmAdminShell(): void {
  if (typeof window === "undefined") return;
  const h = normalizeHostname(window.location.hostname);
  const isAdmin = isCrmAdminHostname(h);
  if (!isAdmin) return;

  window.__CRM_ADMIN_SHELL = true;

  const path = window.location.pathname;
  if (path === "/" || path === "/login" || path === "/signup") {
    window.location.replace(`/admin${window.location.search}${window.location.hash}`);
  }
}
