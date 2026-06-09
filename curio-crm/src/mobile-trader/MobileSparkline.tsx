import React, { useMemo } from "react";

export function MobileSparkline({
  series,
  positive,
  className,
}: {
  series: number[];
  positive: boolean;
  className?: string;
}) {
  const d = useMemo(() => {
    const pts = series.length > 1 ? series : [0, 0];
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const w = 72;
    const h = 28;
    const step = w / Math.max(pts.length - 1, 1);
    const path = pts
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / span) * (h - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { path, w, h };
  }, [series]);

  return (
    <svg
      viewBox={`0 0 ${d.w} ${d.h}`}
      className={className ?? "h-7 w-[4.5rem] shrink-0"}
      aria-hidden
    >
      <path
        d={d.path}
        fill="none"
        stroke={positive ? "#34d399" : "#fb7185"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
