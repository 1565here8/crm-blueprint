import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { client } from "../api/client";
import { PublicAuthModal } from "../components/public/PublicAuthModal";
import { PublicSiteHeader } from "../components/public/PublicSiteHeader";
import {
  LandingFeaturesSection,
  LandingHeroSection,
  LandingToroprosFeaturesSection,
} from "../components/public/SiteLandingSections";
import { LandingBelowFold } from "../components/public/LandingBelowFold";
import { applyPublicDocumentMeta } from "../lib/applyPublicDocumentMeta";
import { getPublicBrand, isPublicDemoSkin } from "../lib/publicBrand";

type AuthMode = "login" | "register";

export function LandingPage({ initialAuth = null }: { initialAuth?: AuthMode | null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [authMode, setAuthMode] = useState<AuthMode | null>(initialAuth);
  const [brandName, setBrandName] = useState(() => getPublicBrand().name);

  const campaign =
    searchParams.get("utm_campaign") ?? searchParams.get("campaign") ?? null;

  useEffect(() => {
    applyPublicDocumentMeta();
  }, []);

  useEffect(() => {
    void client.getPublicBranding().then((data) => {
      if (data.branding.crmBrandName) setBrandName(data.branding.crmBrandName);
    });
  }, []);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    navigate(mode === "login" ? "/login" : "/signup", { replace: true });
  }

  function closeAuth() {
    setAuthMode(null);
    if (window.location.pathname === "/login" || window.location.pathname === "/signup") {
      navigate("/", { replace: true });
    }
  }

  function switchAuth(mode: AuthMode) {
    setAuthMode(mode);
    navigate(mode === "login" ? "/login" : "/signup", { replace: true });
  }

  const demoSkin = isPublicDemoSkin();

  return (
    <div className={`landing-site min-h-screen${demoSkin ? "" : " landing-site--pro"}`}>
      <PublicSiteHeader onLogin={() => openAuth("login")} onSignup={() => openAuth("register")} />

      <LandingHeroSection brandName={brandName} onCta={() => openAuth("register")} />
      <LandingToroprosFeaturesSection />
      <LandingFeaturesSection />
      <LandingBelowFold brandName={brandName} onCta={() => openAuth("register")} />

      <PublicAuthModal
        mode={authMode}
        onClose={closeAuth}
        onSwitchMode={switchAuth}
        campaign={campaign}
      />
    </div>
  );
}
