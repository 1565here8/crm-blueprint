import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthenticatedSiteHeader } from "../components/client/AuthenticatedSiteHeader";
import {
  LandingFeaturesSection,
  LandingHeroSection,
} from "../components/public/SiteLandingSections";
import { LandingBelowFold } from "../components/public/LandingBelowFold";
import { useCrmBranding } from "../context/BrandingContext";

export function HomePage() {
  const navigate = useNavigate();
  const { branding } = useCrmBranding();
  const [brandName, setBrandName] = useState(branding.crmBrandName);

  useEffect(() => {
    setBrandName(branding.crmBrandName);
  }, [branding.crmBrandName]);

  return (
    <div className="landing-site min-h-screen bg-[#050508] text-white">
      <AuthenticatedSiteHeader homePath="/" />
      <LandingHeroSection brandName={brandName} onCta={() => navigate("/trade")} />
      <LandingFeaturesSection />
      <LandingBelowFold brandName={brandName} onCta={() => navigate("/trade")} />
    </div>
  );
}
