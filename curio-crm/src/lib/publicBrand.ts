import { isCurionilabsHost, isBrokerPublicHost } from "../../shared/productHosts";

export type PublicBrand = {
  name: string;
  domain: string;
  supportEmail: string;
  tagline: string;
};

const CURIONILABS: PublicBrand = {
  name: "Curioni Labs",
  domain: "curionilabs.com",
  supportEmail: "support@curionilabs.com",
  tagline: "Multi-asset broker platform & operator CRM",
};

/** Broker brand is read from env — set BROKER_NAME, BROKER_SUPPORT_EMAIL, BROKER_TAGLINE */
function envBrand(): PublicBrand | null {
  const name = typeof process !== "undefined"
    ? process.env.BROKER_NAME?.trim()
    : (typeof window !== "undefined"
      ? (window as any).__ENV?.BROKER_NAME
      : null);
  if (!name) return null;

  return {
    name,
    domain: typeof process !== "undefined"
      ? (process.env.BROKER_DOMAIN?.trim() ?? "")
      : "",
    supportEmail: typeof process !== "undefined"
      ? (process.env.BROKER_SUPPORT_EMAIL?.trim() ?? "")
      : "",
    tagline: typeof process !== "undefined"
      ? (process.env.BROKER_TAGLINE?.trim() ?? "")
      : "",
  };
}

export function isPublicDemoSkin(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  return isCurionilabsHost(hostname);
}

export function getPublicBrand(hostname = typeof window !== "undefined" ? window.location.hostname : ""): PublicBrand {
  if (isBrokerPublicHost(hostname)) return envBrand() ?? CURIONILABS;
  if (isCurionilabsHost(hostname)) return CURIONILABS;
  return CURIONILABS;
}
