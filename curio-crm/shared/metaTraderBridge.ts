/** MetaTrader 4 & 5 bridge — CRM ↔ terminal sync settings (shared client + server). */

export type MtPlatform = "mt4" | "mt5";

export const MT_PLATFORMS: MtPlatform[] = ["mt4", "mt5"];

export const MT_PLATFORM_META: Record<
  MtPlatform,
  { label: string; short: string; tagline: string; accent: string; accentSoft: string }
> = {
  mt4: {
    label: "MetaTrader 4",
    short: "MT4",
    tagline: "Industry-standard FX & CFD terminal — 15+ years of broker trust.",
    accent: "#1e8449",
    accentSoft: "from-emerald-600/15 via-emerald-500/5 to-white",
  },
  mt5: {
    label: "MetaTrader 5",
    short: "MT5",
    tagline: "Multi-asset engine — depth of market, hedging, and faster back-office sync.",
    accent: "#2962ff",
    accentSoft: "from-blue-600/15 via-indigo-500/5 to-white",
  },
};

export const MT_BRIDGE_DEFAULTS: Record<string, string> = {
  "mt4.enabled": "1",
  "mt4.server_name": "Curioni-Live",
  "mt4.host": "trade.curionilabs.com",
  "mt4.port": "443",
  "mt4.manager_login": "",
  "mt4.sync_mode": "realtime",
  "mt4.auto_provision": "1",
  "mt4.account_group": "demo\\standard",
  "mt4.download_win": "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt4/mt4setup.exe",
  "mt4.download_mac": "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt4/MetaTrader4.dmg",
  "mt4.download_ios": "https://apps.apple.com/app/metatrader-4/id496212596",
  "mt4.download_android": "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader4",

  "mt5.enabled": "1",
  "mt5.server_name": "Curioni-Live",
  "mt5.host": "trade.curionilabs.com",
  "mt5.port": "443",
  "mt5.manager_login": "",
  "mt5.sync_mode": "realtime",
  "mt5.auto_provision": "1",
  "mt5.account_group": "demo\\standard",
  "mt5.download_win": "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe",
  "mt5.download_mac": "https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.dmg",
  "mt5.download_ios": "https://apps.apple.com/app/metatrader-5/id413251709",
  "mt5.download_android": "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5",
};

export const MT_SYNC_MODES = ["realtime", "batch"] as const;

export function mtKeys(platform: MtPlatform): string[] {
  return Object.keys(MT_BRIDGE_DEFAULTS).filter((k) => k.startsWith(`${platform}.`));
}

export function isMtBridgeEnabled(settings: Record<string, string>, platform: MtPlatform): boolean {
  return settings[`${platform}.enabled`] === "1";
}
