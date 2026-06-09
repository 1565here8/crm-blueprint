/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        broker: {
          green: "#84c561",
          "green-dark": "#6fad4d",
          blue: "#3861FB",
          "blue-hover": "#6283FF",
          navy: "#18214D",
          dark: "#25282A",
          surface: "#f7f9fc",
          gold: "#c9a227",
          "gold-light": "#d4af37",
        },
        /** Curioni CRM — Apple-grade luxury (refined neutrals, deep indigo authority, champagne micro-luxury) */
        curioni: {
          canvas: "#F5F5F7",
          elevated: "#FFFFFF",
          surface: "#FFFFFF",
          line: "#E5E5EA",
          ink: "#1D1D1F",
          muted: "#6E6E73",
          "muted-on-dark": "#98989D",
          rail: "#0A0A0C",
          "rail-border": "#1C1C1E",
          plum: "#2D1B4E",
          indigo: "#312E81",
          midnight: "#172554",
          accent: "#4F46E5",
          champagne: "#9A8B6F",
          "champagne-light": "#C9B896",
        },
      },
      fontFamily: {
        roboto: ["Roboto", "system-ui", "sans-serif"],
        curioni: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
