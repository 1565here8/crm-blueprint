/** Plain-English messages when the API is slow or down. */

/** Shown for HTTP 503 — planned maintenance window. */
export function plannedMaintenanceMessage(): string {
  return "The CRM is in a short maintenance window. Wait a few minutes, then refresh the page.";
}

/** Shown for HTTP 502 / 504 — proxy or gateway timeout. */
export function connectionHiccupMessage(): string {
  return "The connection dropped for a moment. Refresh the page and try again.";
}

/** Shown for HTTP 500 — unexpected server error. */
export function serverGlitchMessage(): string {
  return "Something went wrong on the server. Refresh the page. If it keeps happening, tell your platform owner or open Error Logs.";
}

/** Pick the right user-facing line for a 5xx status. */
export function messageForServerStatus(status: number): string {
  if (status === 503) return plannedMaintenanceMessage();
  if (status === 502 || status === 504) return connectionHiccupMessage();
  return serverGlitchMessage();
}

/** @deprecated Use messageForServerStatus — kept for imports that expect one function. */
export function maintenanceUserMessage(): string {
  return serverGlitchMessage();
}
