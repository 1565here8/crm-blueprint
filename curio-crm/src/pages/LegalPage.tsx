import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AuthenticatedSiteHeader } from "../components/client/AuthenticatedSiteHeader";
import { PublicSiteHeader } from "../components/public/PublicSiteHeader";
import { legalContent, isLegalPageSlug } from "../content/legalContent";
import { useAuth } from "../context/AuthContext";
import { useCrmBranding } from "../context/BrandingContext";
import { client } from "../api/client";
import { getPublicBrand } from "../lib/publicBrand";

export function LegalPage() {
  const { page } = useParams<{ page: string }>();
  const { user } = useAuth();
  const { branding } = useCrmBranding();
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState(branding.crmBrandName);

  useEffect(() => {
    setBrandName(branding.crmBrandName);
  }, [branding.crmBrandName]);

  useEffect(() => {
    void client.getPublicBranding().then((data) => {
      if (data.branding.crmBrandName) setBrandName(data.branding.crmBrandName);
    });
  }, []);

  if (!isLegalPageSlug(page)) {
    return <Navigate to="/legal/kyc" replace />;
  }

  const { domain, supportEmail } = getPublicBrand();
  const content = legalContent(brandName, domain, supportEmail)[page];

  return (
    <div className="landing-site min-h-screen bg-[#050508] text-white">
      {user ? (
        <AuthenticatedSiteHeader homePath="/" />
      ) : (
        <PublicSiteHeader onLogin={() => navigate("/login")} onSignup={() => navigate("/signup")} />
      )}

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{content.title}</h1>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-white/65 sm:text-base">
          {content.sections.map((section, i) => (
            <section key={i}>
              {section.heading ? (
                <h2 className="mb-3 text-base font-bold text-teal-300">{section.heading}</h2>
              ) : null}
              {section.paragraphs?.map((p, j) => (
                <p key={j} className={j > 0 ? "mt-4" : ""}>
                  {p}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {section.bullets.map((item, k) => (
                    <li key={k}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
