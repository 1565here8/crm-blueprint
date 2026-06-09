import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        mobile: path.resolve(__dirname, "mobile-trader/index.html"),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:3002", changeOrigin: true },
    },
  },
});
