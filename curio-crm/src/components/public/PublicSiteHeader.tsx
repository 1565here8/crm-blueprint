import React from "react";
import { Link, useLocation } from "react-router-dom";
import { PublicBrandLogo } from "../brand/PublicBrandLogo";
import { DemoDisclaimerBanner } from "./DemoDisclaimerBanner";
import { isPublicDemoSkin } from "../../lib/publicBrand";

type Props = {
  onLogin: () => void;
  onSignup: () => void;
};

export function PublicSiteHeader({ onLogin, onSignup }: Props) {
  const { pathname } = useLocation();
  const demoSkin = isPublicDemoSkin();

  const nav = (to: string, label: string) => {
    const active = pathname === to;
    const accent = demoSkin ? "text-broker-green" : "text-broker-gold-light";
    const cls = `text-sm font-medium transition ${active ? accent : "text-white/70 hover:text-white"}`;
    return (
      <Link to={to} className={cls}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <DemoDisclaimerBanner variant="ribbon" />
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md ${
          demoSkin
            ? "border-white/10 bg-black/80"
            : "border-broker-navy/40 bg-broker-navy/95 shadow-lg shadow-black/20"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0">
            <PublicBrandLogo size="sm" theme="dark" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav("/", demoSkin ? "Home" : "Markets")}
            {!demoSkin ? nav("/about", "Platform") : null}
            {!demoSkin ? (
              <button
                type="button"
                onClick={onLogin}
                className="text-sm font-medium text-white/70 transition hover:text-white"
              >
                Client portal
              </button>
            ) : null}
            {nav("/legal/terms", "Legal")}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onLogin}
              className={`rounded-md border px-4 py-2 text-sm font-medium text-white transition ${
                demoSkin
                  ? "border-white/25 hover:bg-white/10"
                  : "border-broker-gold/40 hover:border-broker-gold/60 hover:bg-white/5"
              }`}
            >
              {demoSkin ? "Login" : "Client login"}
            </button>
            <button
              type="button"
              onClick={onSignup}
              className={`px-5 py-2 text-sm font-bold ${demoSkin ? "btn-broker-green" : "rounded-md bg-broker-gold text-broker-navy shadow-md transition hover:bg-broker-gold-light"}`}
            >
              {demoSkin ? "Sign Up" : "Open account"}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
