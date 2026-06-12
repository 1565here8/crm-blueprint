import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        obsidian: {
          matte: "#000000",
          card: "#07070A",
        },
        merlian: {
          black: "#000000",
          void: "#030303",
          card: "#07070A",
          purple: "#a855f7",
          "purple-light": "#c4b5fd",
          "purple-dark": "#7c3aed",
          red: "#ef4444",
          "red-dark": "#b91c1c",
          green: "#22c55e",
          "green-dark": "#16a34a",
        },
        gold: {
          muted: "#a855f7",
          dim: "#7c3aed",
        },
      },
      letterSpacing: {
        luxury: "0.12em",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        "merlian-purple": "0 0 40px rgba(168, 85, 247, 0.15)",
        "merlian-red": "0 0 40px rgba(239, 68, 68, 0.12)",
        "merlian-green": "0 0 40px rgba(34, 197, 94, 0.12)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
