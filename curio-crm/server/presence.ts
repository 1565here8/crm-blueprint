import type { Request } from "express";
import { randomUUID } from "crypto";

export type PresenceRecord = {
  sessionId: string;
  userId: string | null;
  username: string | null;
  role: string | null;
  ip: string;
  userAgent: string;
  currentPage: string;
  activity: string;
  country: string;
  campaign: string | null;
  referrer: string | null;
  device: "desktop" | "mobile";
  authenticated: boolean;
  lastSeenAt: number;
};

const STALE_MS = 90_000;
const store = new Map<string, PresenceRecord>();

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  }
  return req.socket.remoteAddress?.replace("::ffff:", "") ?? "unknown";
}

function detectDevice(ua: string): "desktop" | "mobile" {
  return /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
}

function guessCountry(ip: string): string {
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip === "unknown") {
    return "Local";
  }
  return "Unknown";
}

export function upsertPresence(args: {
  sessionId: string;
  userId?: string | null;
  username?: string | null;
  role?: string | null;
  ip: string;
  userAgent: string;
  currentPage: string;
  activity?: string;
  campaign?: string | null;
  referrer?: string | null;
}) {
  const existing = store.get(args.sessionId);
  const record: PresenceRecord = {
    sessionId: args.sessionId,
    userId: args.userId ?? null,
    username: args.username ?? null,
    role: args.role ?? null,
    ip: args.ip,
    userAgent: args.userAgent,
    currentPage: args.currentPage,
    activity: args.activity ?? "Browsing",
    country: guessCountry(args.ip),
    campaign: args.campaign ?? null,
    referrer: args.referrer ?? null,
    device: detectDevice(args.userAgent),
    authenticated: Boolean(args.userId),
    lastSeenAt: Date.now(),
  };
  if (existing?.country && existing.country !== "Local" && existing.country !== "Unknown") {
    record.country = existing.country;
  }
  store.set(args.sessionId, record);
  pruneStale();
  return record;
}

export function ensureAnonymousSessionId(req: Request, res: { cookie: (n: string, v: string, o: object) => void }): string {
  const existing = req.cookies?.ws_presence as string | undefined;
  if (existing) return existing;
  const id = randomUUID();
  res.cookie("ws_presence", id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
  return id;
}

function pruneStale() {
  const cutoff = Date.now() - STALE_MS;
  for (const [id, rec] of store) {
    if (rec.lastSeenAt < cutoff) store.delete(id);
  }
}

export function listOnlineVisitors() {
  pruneStale();
  return [...store.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

export function getOnlineStats() {
  const visitors = listOnlineVisitors();
  const authenticated = visitors.filter((v) => v.authenticated).length;
  const anonymous = visitors.length - authenticated;
  const desktop = visitors.filter((v) => v.device === "desktop").length;
  const mobile = visitors.filter((v) => v.device === "mobile").length;
  const campaigns = visitors.filter((v) => v.campaign).length;
  const organic = visitors.length - campaigns;

  const byCountry = new Map<string, number>();
  for (const v of visitors) {
    byCountry.set(v.country, (byCountry.get(v.country) ?? 0) + 1);
  }

  return {
    total: visitors.length,
    authenticated,
    anonymous,
    desktop,
    mobile,
    organic,
    campaigns,
    byCountry: [...byCountry.entries()].map(([country, count]) => ({ country, count })),
  };
}
