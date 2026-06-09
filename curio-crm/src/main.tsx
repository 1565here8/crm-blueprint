import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { bootstrapCrmAdminShell } from "./lib/crmAdminShell";
import { installCurionilabsNavigationGuard } from "./lib/curionilabsGuard";
import { CrmErrorBoundary } from "./components/CrmErrorBoundary";

bootstrapCrmAdminShell();
installCurionilabsNavigationGuard();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CrmErrorBoundary scope="root">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </CrmErrorBoundary>
  </React.StrictMode>,
);
