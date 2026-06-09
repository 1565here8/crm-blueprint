import React, { useCallback, useEffect, useRef } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/** Wide table wrapper — horizontal scrollbar on top and bottom, synced. */
export function SyncedHorizontalScroll({ children, className = "" }: Props) {
  const topRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const syncSpacerWidth = useCallback(() => {
    const main = mainRef.current;
    const spacer = spacerRef.current;
    if (!main || !spacer) return;
    spacer.style.width = `${main.scrollWidth}px`;
  }, []);

  useEffect(() => {
    syncSpacerWidth();
    const main = mainRef.current;
    if (!main) return;
    const ro = new ResizeObserver(() => syncSpacerWidth());
    ro.observe(main);
    return () => ro.disconnect();
  }, [children, syncSpacerWidth]);

  function linkScroll(source: "top" | "main") {
    return (e: React.UIEvent<HTMLDivElement>) => {
      if (syncing.current) return;
      syncing.current = true;
      const left = e.currentTarget.scrollLeft;
      const other = source === "top" ? mainRef.current : topRef.current;
      if (other) other.scrollLeft = left;
      syncing.current = false;
    };
  }

  return (
    <div className={className}>
      <div
        ref={topRef}
        onScroll={linkScroll("top")}
        className="overflow-x-auto overflow-y-hidden border-b border-slate-100"
        aria-hidden
      >
        <div ref={spacerRef} className="h-px" />
      </div>
      <div ref={mainRef} onScroll={linkScroll("main")} className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
