import React, { useMemo } from "react";

export function Sparkline(props: {
  series: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const { width = 120, height = 36, series } = props;

  const { path, positive } = useMemo(() => {
    const valid = series.filter((p) => Number.isFinite(p));
    if (valid.length < 2) {
      return { path: "", positive: true };
    }

    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const span = max - min || 1;
    const step = width / (valid.length - 1);

    const points = valid.map((price, i) => {
      const x = i * step;
      const y = height - ((price - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      path: `M ${points.join(" L ")}`,
      positive: valid[valid.length - 1] >= valid[0],
    };
  }, [series, width, height]);

  if (!path) {
    return (
      <svg
        width={width}
        height={height}
        className={props.className}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity={0.2}
        />
      </svg>
    );
  }

  const stroke = positive ? "#4ade80" : "#f87171";

  return (
    <svg width={width} height={height} className={props.className} aria-hidden>
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
