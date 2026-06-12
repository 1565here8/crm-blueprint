import jwt from "jsonwebtoken";

export type UserRole = "user" | "admin";

export type SessionClaims = {
  sub: string;
  role: UserRole;
  jti: string;
};

const COOKIE_NAME = "nc_session";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set (min 32 chars) in production.");
  }
  return "dev-only-insecure-jwt-secret-change-me-32chars";
}

export function signSessionToken(claims: Pick<SessionClaims, "sub" | "role">) {
  const jti = crypto.randomUUID();
  return jwt.sign({ ...claims, jti }, getJwtSecret(), {
    expiresIn: "7d",
    issuer: "network-core",
    audience: "network-core-api",
  });
}

export function verifySessionToken(token: string): SessionClaims | null {
  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: "network-core",
      audience: "network-core-api",
    });
    if (typeof payload === "string" || !payload.sub) return null;
    const role = payload.role === "admin" ? "admin" : "user";
    const jti = typeof payload.jti === "string" ? payload.jti : "";
    if (!jti) return null;
    return { sub: payload.sub, role, jti };
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
};
