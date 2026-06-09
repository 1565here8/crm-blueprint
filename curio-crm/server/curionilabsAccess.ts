import { createHash, randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { getDb } from "./db";
import { sessionSecret } from "./auth";
import { CURIONILABS_PUBLIC_URL } from "../shared/productHosts";
import { captureLead, visitorContextFromRequest } from "./concierge";

const COOKIE = "curioni_gate";
const TOKEN_TTL = "30d";

export function ensureCurionilabsAccessSchema(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS curioni_access_leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      firm TEXT,
      consent TEXT,
      visitor_id TEXT,
      session_id TEXT,
      referrer TEXT,
      ip_hash TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_curioni_access_email ON curioni_access_leads(email);
  `);
}

function hubUrl(): string {
  const raw = process.env.CURIONI_HUB_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const base = (process.env.CURIONI_PUBLIC_URL?.trim() || CURIONILABS_PUBLIC_URL).replace(/\/$/, "");
  return `${base}/curionilabs/`;
}

function cookieDomain(): string | undefined {
  const d = process.env.CURIONI_COOKIE_DOMAIN?.trim();
  return d || (process.env.NODE_ENV === "production" ? ".curionilabs.com" : undefined);
}

type GatePayload = {
  typ: "curioni_gate";
  email: string;
  name: string;
  firm?: string;
};

export function signGateToken(payload: GatePayload): string {
  return jwt.sign(payload, sessionSecret(), { expiresIn: TOKEN_TTL });
}

export function readGateToken(req: Request): GatePayload | null {
  const token = req.cookies?.[COOKIE] as string | undefined;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, sessionSecret()) as GatePayload & { typ?: string };
    if (decoded.typ !== "curioni_gate") return null;
    return decoded;
  } catch {
    return null;
  }
}

function setGateCookie(res: Response, token: string): void {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    domain: cookieDomain(),
    path: "/",
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

export function recordAccessLead(args: {
  name: string;
  email: string;
  firm?: string;
  consent?: string;
  visitorId?: string;
  sessionId?: string;
  referrer?: string;
  ip?: string;
}): void {
  ensureCurionilabsAccessSchema();
  const ip_hash = args.ip
    ? createHash("sha256").update(args.ip).digest("hex").slice(0, 16)
    : null;
  getDb()
    .prepare(
      `INSERT INTO curioni_access_leads (id, name, email, firm, consent, visitor_id, session_id, referrer, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      args.name.trim(),
      normalizeEmail(args.email),
      args.firm?.trim() || null,
      args.consent || null,
      args.visitorId || null,
      args.sessionId || null,
      args.referrer || null,
      ip_hash,
      new Date().toISOString(),
    );
}

export function curionilabsAccessStatus(req: Request, res: Response): void {
  const gate = readGateToken(req);
  res.json({
    admitted: Boolean(gate),
    email: gate?.email ?? null,
    hub: gate ? hubUrl() : null,
  });
}

export function curionilabsEmailAccess(req: Request, res: Response): void {
  const body = req.body as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (name.length < 2) {
    res.status(400).json({ error: "Enter your name.", reason: "name_required" });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Enter a valid email address.", reason: "email_invalid" });
    return;
  }

  const normalized = normalizeEmail(email);
  const token = signGateToken({
    typ: "curioni_gate",
    email: normalized,
    name,
  });

  try {
    recordAccessLead({
      name,
      email: normalized,
      consent: String(body.consent ?? ""),
      visitorId: String(body.visitorId ?? ""),
      sessionId: String(body.sessionId ?? ""),
      referrer: String(body.referrer ?? ""),
      ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress,
    });
    captureLead({
      sessionId: String(body.sessionId ?? body.visitorId ?? randomUUID()),
      name,
      email: normalized,
      message: "Site entrance — exploring how to launch a brokerage on Curioni Labs.",
      visitor: visitorContextFromRequest(req),
      page: String(body.referrer ?? "/entrance"),
      source: "curioni_entrance",
    });
  } catch {
    /* lead log is best-effort — access still granted */
  }

  setGateCookie(res, token);
  res.json({
    ok: true,
    admitted: true,
    message: "Welcome — opening Curioni Labs. Our team will follow up on your email.",
    hub: hubUrl(),
  });
}

export function curionilabsVisitorPing(req: Request, res: Response): void {
  res.json({ ok: true });
}
