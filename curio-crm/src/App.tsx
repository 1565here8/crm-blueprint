import React, { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LandingPage } from "./pages/LandingPage";
import { HomePage } from "./pages/HomePage";
import { TradePage } from "./pages/TradePage";
import { ClientProfilePage } from "./pages/ClientProfilePage";
import { LegalPage } from "./pages/LegalPage";
import { AboutPage, ContactPage } from "./pages/SiteInfoPages";
import { AdminRoutes } from "./AdminRoutes";
import { PresenceHeartbeat } from "./components/PresenceHeartbeat";
import { ImpersonationBanner } from "./components/admin/ImpersonationBanner";
import { BrandingProvider } from "./context/BrandingContext";
import { ChatBubble } from "./components/site/ChatBubble";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { getPublicBrand } from "./lib/publicBrand";
import { isCrmAdminShellHost } from "./lib/crmAdminShell";
import { isBrokerPublicHost } from "../shared/productHosts";
import { TradeTorosLandingPage } from "./pages/TradeTorosLandingPage";
import { getAdminUrl, getPublicSiteUrl, isAdminHost } from "./lib/siteMode";
import { CURIONILABS_CRM_ADMIN_URL, isRetiredVendorHost } from "../shared/productHosts";
import { usePublicSiteOffline } from "./lib/usePublicSiteOffline";
import { PublicRebrandPage } from "./pages/PublicRebrandPage";
function RedirectToAdminPortal() {
  useEffect(() => {
    const host = window.location.hostname;
    if (isCrmAdminShellHost(host) || host === "localhost" || host === "127.0.0.1") {
      window.location.replace(`/admin${window.location.search}${window.location.hash}`);
      return;
    }
    const target = `${getAdminUrl(host)}/admin`;
    if (isRetiredVendorHost(host) && /xtoropro\.com|etoropros\.com/i.test(target)) {
      window.location.replace(`${CURIONILABS_CRM_ADMIN_URL}/admin`);
      return;
    }
    window.location.replace(target);
  }, []);
  return <LoadingScreen message="Opening operator CRM\u2026" />;
}

function LoadingScreen({ message = "Loading\u2026" }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0c1017] text-slate-400">
      {message}
    </div>
  );
}

function StaffOnlyNotice() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0c1017] px-6 text-center text-slate-300">
      <p className="text-lg font-semibold text-white">Staff accounts only</p>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        This portal is for {getPublicBrand().name} operators. Client accounts must use the public trading site.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={getPublicSiteUrl()}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
        >
          Go to trading site
        </a>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function AdminPortalRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <BrandingProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<AdminLoginPage />} />
          <Route path="/login" element={<AdminLoginPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrandingProvider>
    );
  }

  if (user.role !== "admin" && !user.isStaff) {
    return <StaffOnlyNotice />;
  }

  return (
    <>
      <ImpersonationBanner />
      <PresenceHeartbeat />
      <Routes>
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </>
  );
}

function PublicAppRoutes() {
  const { user, loading } = useAuth();
  const { offline, loading: offlineLoading } = usePublicSiteOffline();

  if (loading || offlineLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-500">Loading\u2026</div>
    );
  }

  if (offline) {
    return <PublicRebrandPage />;
  }

  if (!user) {
    return (
      <>
        <PresenceHeartbeat activity="Landing page" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage initialAuth="login" />} />
          <Route path="/signup" element={<LandingPage initialAuth="register" />} />
          <Route path="/legal/:page" element={<LegalPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/admin/*" element={<RedirectToAdminPortal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ChatBubble />
      </>
    );
  }

  return (
    <>
      <ImpersonationBanner />
      <PresenceHeartbeat />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/profile/*" element={<ClientProfilePage />} />
        <Route path="/legal/:page" element={<LegalPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/admin/*" element={<RedirectToAdminPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ChatBubble />
    </>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const onAdminHost = isCrmAdminShellHost() || isAdminHost();

  useEffect(() => {
    if (!onAdminHost) return;
    const path = window.location.pathname;
    if (path === "/" || path === "/login" || path === "/signup") {
      window.location.replace(`/admin${window.location.search}${window.location.hash}`);
    }
  }, [onAdminHost]);

  if (loading) return <LoadingScreen />;

  if (!onAdminHost && isBrokerPublicHost(window.location.hostname) && !user) {
    return <TradeTorosLandingPage />;
  }

  return onAdminHost ? <AdminPortalRoutes /> : <PublicAppRoutes />;
}

export default function App() {

  return (
    <AuthProvider>
      <BrandingProvider>
        <AppRoutes />
      </BrandingProvider>
    </AuthProvider>
  );
}
