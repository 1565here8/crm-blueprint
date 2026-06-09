import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthenticatedSiteHeader } from "../components/client/AuthenticatedSiteHeader";
import { PublicSiteHeader } from "../components/public/PublicSiteHeader";
import { useAuth } from "../context/AuthContext";
import { useCrmBranding } from "../context/BrandingContext";
import { getPublicBrand, isPublicDemoSkin } from "../lib/publicBrand";

function PageShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const demoSkin = isPublicDemoSkin();

  return (
    <div className={`landing-site min-h-screen bg-[#050508] text-white ${demoSkin ? "" : "landing-site--pro"}`}>
      {user ? (
        <AuthenticatedSiteHeader homePath="/" />
      ) : (
        <PublicSiteHeader onLogin={() => navigate("/login")} onSignup={() => navigate("/signup")} />
      )}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export function AboutPage() {
  const { branding } = useCrmBranding();
  const brand = branding.crmBrandName;
  const { domain } = getPublicBrand();

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-white">About {domain}</h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-white/65 sm:text-base">
        <p>
          {brand} on {domain} provides multi-asset access to global markets — forex (FX), stocks &amp;
          shares, cryptocurrencies, indices, metals, and commodities — through one unified platform and client
          portal.
        </p>
        <p>
          Trade EUR/USD and major FX pairs, US equities like AAPL and TSLA, and digital assets including BTC
          and ETH from a single wallet with transparent spreads and dedicated support.
        </p>
        <h2 className="text-lg font-semibold text-teal-300">Our commitment</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Segregated client funds and rigorous compliance procedures</li>
          <li>24/5 multilingual client support</li>
          <li>Advanced charting, risk tools, and AI-assisted market insights</li>
          <li>Full transaction history, verification, and secure document upload</li>
        </ul>
      </div>
    </PageShell>
  );
}

export function ContactPage() {
  const { branding } = useCrmBranding();
  const brand = branding.crmBrandName;
  const { domain, supportEmail: email } = getPublicBrand();
  const demoSkin = isPublicDemoSkin();

  return (
    <PageShell>
      <h1 className="text-3xl font-bold text-white">Contact us</h1>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 shadow-sm">
          <h2 className="font-semibold text-white">Client support</h2>
          <p className="mt-2 text-sm text-white/55">Available 24/7</p>
          <a href={`mailto:${email}`} className="mt-4 block text-teal-400 hover:underline">
            {email}
          </a>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 shadow-sm">
          <h2 className="font-semibold text-white">Account opening</h2>
          <p className="mt-2 text-sm text-white/55">
            {demoSkin
              ? `Register at ${domain} for a demo account (FX, shares, and crypto). Complete KYC in the simulated environment to explore funding and trading flows.`
              : `Register at ${domain} to open a multi-asset account. Complete verification in the client portal to fund and trade FX, shares, and crypto.`}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 sm:col-span-2">
          <h2 className="font-semibold text-white">Jurisdiction</h2>
          <p className="mt-2 text-sm text-white/55">
            {brand} services are governed by the laws of the Republic of the Marshall Islands. See Legal for
            Terms &amp; Conditions and Privacy Policy.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
