import { isCurionilabsHost, isTradetorosHost } from "../../shared/productHosts";

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

const TRADOTOROS: PublicBrand = {
  name: "TradeToros",
  domain: "tradetoros.com",
  supportEmail: "support@tradetoros.com",
  tagline: "Professional trading platform",
};

/** Curioni / demo hosts — visible ribbon. */
export function isPublicDemoSkin(hostname = typeof window !== "undefined" ? window.location.hostname : ""): boolean {
  return isCurionilabsHost(hostname);
}

export function getPublicBrand(hostname = typeof window !== "undefined" ? window.location.hostname : ""): PublicBrand {
  if (isTradetorosHost(hostname)) return TRADOTOROS;
  if (isCurionilabsHost(hostname)) return CURIONILABS;
  return CURIONILABS;
}
