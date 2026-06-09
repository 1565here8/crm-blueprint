import { MT_BRIDGE_DEFAULTS } from "../shared/metaTraderBridge";
import { getPlatformSettings, setPlatformSettings } from "./platformSettings";

export function getMetaTraderBridgeBundle(): Record<string, string> {
  const keys = Object.keys(MT_BRIDGE_DEFAULTS);
  const cur = getPlatformSettings(keys);
  return { ...MT_BRIDGE_DEFAULTS, ...cur };
}

export function setMetaTraderBridge(patch: Record<string, string>): Record<string, string> {
  const allowed = new Set(Object.keys(MT_BRIDGE_DEFAULTS));
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (allowed.has(k)) filtered[k] = v;
  }
  setPlatformSettings(filtered);
  return getMetaTraderBridgeBundle();
}

/** Public-safe download + server labels (no manager credentials). */
export function getMetaTraderPublicBundle(): Record<string, string> {
  const all = getMetaTraderBridgeBundle();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    if (k.endsWith(".manager_login")) continue;
    if (k.endsWith(".host") || k.endsWith(".port") || k.endsWith(".account_group")) continue;
    out[k] = v;
  }
  return out;
}
