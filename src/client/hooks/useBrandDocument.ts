import { useEffect } from "react";
import { TRADING_SITE_NAME } from "../tradingBrand";

export function useBrandDocument() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.brand = "tradingsite";
    document.title = `${TRADING_SITE_NAME} · AI Trading Intelligence`;

    root.style.setProperty("--accent", "#10b981");
    root.style.setProperty("--accent-text", "#34d399");
    root.style.setProperty("--accent-soft", "rgba(16, 185, 129, 0.14)");

    return () => {
      root.dataset.brand = "";
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-text");
      root.style.removeProperty("--accent-soft");
    };
  }, []);
}
