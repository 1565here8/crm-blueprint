import React from "react";

export type CurioniLabsLogoProps = {
  variant?: "mark" | "wordmark" | "full";
  theme?: "dark" | "light";
  height?: number;
  subtitle?: string;
  className?: string;
};

function Mark({ size, gradId }: { size: number; gradId: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 112 112" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="8" y1="8" x2="104" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="104" height="104" rx="22" fill={`url(#${gradId})`} />
      <path
        d="M78 34c-17-10-39-2-44 17-4 17 7 35 24 39 14 4 28-1 36-13"
        stroke="#042F2E"
        strokeWidth="10.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="82" cy="41" r="6.5" fill="#ECFDF5" />
      <circle cx="82" cy="41" r="2.8" fill="#042F2E" />
    </svg>
  );
}

export function CurioniLabsLogo({
  variant = "full",
  theme = "dark",
  height = 36,
  subtitle = "COMMAND",
  className = "",
}: CurioniLabsLogoProps) {
  const gradId = React.useId().replace(/:/g, "");
  const titleColor = theme === "dark" ? "#FFFFFF" : "#0F172A";
  const subColor = theme === "dark" ? "#14B8A6" : "#0D9488";
  const titleSize = Math.round(height * 0.42);
  const subSize = Math.round(height * 0.16);

  if (variant === "mark") {
    return (
      <span className={`inline-flex shrink-0 ${className}`}>
        <Mark size={height} gradId={gradId} />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span className={`inline-flex flex-col justify-center ${className}`} style={{ height }}>
        <span
          className="font-extrabold leading-none tracking-[0.14em]"
          style={{ color: titleColor, fontSize: titleSize }}
        >
          CURIONILABS
        </span>
        {subtitle ? (
          <span
            className="mt-1 font-bold uppercase leading-none tracking-[0.38em]"
            style={{ color: subColor, fontSize: subSize }}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={height} gradId={gradId} />
      <span className="flex min-w-0 flex-col justify-center">
        <span
          className="truncate font-extrabold leading-none tracking-[0.12em]"
          style={{ color: titleColor, fontSize: titleSize }}
        >
          CURIONILABS
        </span>
        {subtitle ? (
          <span
            className="mt-1 font-bold uppercase leading-none tracking-[0.38em]"
            style={{ color: subColor, fontSize: subSize }}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export const CURIONILABS_LOGO_ASSETS = {
  mark: "/brand/curionilabs/mark.svg",
  wordmark: "/brand/curionilabs/wordmark.svg",
  fullDark: "/brand/curionilabs/logo-full-dark.svg",
  fullLight: "/brand/curionilabs/logo-full-light.svg",
  favicon: "/brand/curionilabs/favicon.svg",
} as const;

export const CURIONILABS_BRAND_NAME = "CURIONILABS";
