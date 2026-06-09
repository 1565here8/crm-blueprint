/** Default: hidden from search until broker handoff (SEARCH_INDEXING_ENABLED=1). */

export function isSearchIndexingEnabled(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): boolean {
  return env.SEARCH_INDEXING_ENABLED === "1";
}

export const ROBOTS_DISALLOW_ALL = "User-agent: *\nDisallow: /\n";

export const ROBOTS_ALLOW_ALL = "User-agent: *\nAllow: /\n";

export const X_ROBOTS_NOINDEX = "noindex, nofollow";
