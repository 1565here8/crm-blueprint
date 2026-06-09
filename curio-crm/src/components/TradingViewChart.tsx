import React, { useEffect, useRef } from "react";

type Props = {
  tvSymbol: string;
  interval?: string;
  className?: string;
  theme?: "light" | "dark";
  /** Compact layout for mobile trader — hides side/top toolbars */
  variant?: "desktop" | "mobile";
};

export function TradingViewChart({
  tvSymbol,
  interval = "15",
  className,
  theme = "dark",
  variant = "desktop",
}: Props) {
  const mobile = variant === "mobile";
  const containerRef = useRef<HTMLDivElement>(null);
  const isLight = theme === "light";

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    root.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container h-full w-full";
    wrapper.style.height = "100%";
    wrapper.style.width = "100%";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    wrapper.appendChild(widget);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval,
      timezone: "Etc/UTC",
      theme: isLight ? "light" : "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      backgroundColor: isLight ? "rgba(255, 255, 255, 1)" : "rgba(9, 9, 11, 1)",
      gridColor: isLight ? "rgba(226, 232, 240, 0.8)" : "rgba(63, 63, 70, 0.35)",
      hide_top_toolbar: mobile,
      hide_legend: mobile,
      hide_side_toolbar: true,
      allow_symbol_change: false,
      save_image: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      studies: ["Volume@tv-basicstudies"],
    });
    wrapper.appendChild(script);
    root.appendChild(wrapper);

    return () => {
      root.innerHTML = "";
    };
  }, [tvSymbol, interval, isLight, mobile]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full min-h-[420px] w-full"}
      aria-label={`TradingView chart for ${tvSymbol}`}
    />
  );
}
