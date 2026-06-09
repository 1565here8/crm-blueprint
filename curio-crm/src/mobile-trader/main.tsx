import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { MobileTraderApp } from "./MobileTraderApp";
import "../index.css";
import "./mobile-trader.css";

function mobileTraderBasename(): string {
  const h = window.location.hostname.toLowerCase();
  return h === "trader.curionilabs.com" ? "" : "/mobile";
}

function mobileTraderScope(): string {
  return mobileTraderBasename() === "" ? "/" : "/mobile/";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/mobile-trader/sw.js", { scope: mobileTraderScope() })
      .catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={mobileTraderBasename()}>
      <AuthProvider>
        <MobileTraderApp />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
