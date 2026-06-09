import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { PublicBrandLogo } from "../brand/PublicBrandLogo";
import { publicFooterLegal } from "../../../shared/demoCopy";
import { getPublicBrand, isPublicDemoSkin } from "../../lib/publicBrand";
import {
  LandingAcademySection,
  LandingFeesSection,
  LandingMetaTraderSection,
  LandingOperatorCrmSection,
  LandingPlatformSection,
  LandingTradingToolsSection,
  LandingTrustSection,
  LandingWhySection,
} from "./SiteLandingSections";

type Props = {
  brandName: string;
  onCta: () => void;
};

const DEMO_AWARDS = [
  "Best Multi-Asset Platform · Demo 2026",
  "Best Trading Terminal · Enterprise Pitch",
  "Best for Crypto & FX · Fintech Review",
  "Best CRM Backoffice · Platform Awards",
  "Best Audit & Compliance UX · Innovation Summit",
  "Best Stock Trading App · Broker Choice",
  "#1 Ease of Use · ForexBrokers",
  "Best for Beginners · Crypto & Shares",
];

const TICKERS = [
  { symbol: "EUR/USD", price: "1.0842", change: "+0.12%", up: true, asset: "fx" as const },
  { symbol: "AAPL", price: "227.45", change: "+1.24%", up: true, asset: "stock" as const },
  { symbol: "BTC/USD", price: "97,842", change: "+1.71%", up: true, asset: "crypto" as const },
  { symbol: "TSLA", price: "342.80", change: "-0.65%", up: false, asset: "stock" as const },
  { symbol: "ETH/USD", price: "3,612", change: "+1.42%", up: true, asset: "crypto" as const },
  { symbol: "GBP/USD", price: "1.2718", change: "-0.08%", up: false, asset: "fx" as const },
  { symbol: "NVDA", price: "138.20", change: "+2.10%", up: true, asset: "stock" as const },
  { symbol: "SOL/USD", price: "178.35", change: "-0.65%", up: false, asset: "crypto" as const },
];

const STEPS = [
  { n: "1", title: "Create your account", body: "Sign up in minutes — one profile for stocks, crypto, and FX." },
  { n: "2", title: "Fund your wallet", body: "Deposit once and allocate across asset classes from the web terminal." },
  { n: "3", title: "Trade & review", body: "Place trades in the browser; staff manage clients in the built-in CRM." },
];

function faqItems(brand: ReturnType<typeof getPublicBrand>, demoSkin: boolean) {
  if (!demoSkin) {
    return [
      { q: `What is ${brand.domain}?`, a: `${brand.name} is an independent multi-asset broker platform — client portal, markets, and account services in one secure stack. We are not affiliated with any third-party social trading brand.` },
      { q: "How do I open an account?", a: "Register online, complete verification, and fund your wallet from the client portal. Our support team can guide you through onboarding." },
      { q: "Which markets can I trade?", a: "US and global shares, cryptocurrencies, major FX pairs, indices, metals, and commodities from a unified account." },
      { q: "Is my account secure?", a: "Encryption in transit and at rest, KYC/AML controls, balance event logging, and session security — institutional-grade infrastructure." },
      { q: "How do I reach support?", a: `${brand.supportEmail} — account, funding, and platform enquiries.` },
    ];
  }

  return [
    {
      q: `What is ${brand.domain}?`,
      a: `${brand.name} is an independent white-label broker demonstration platform — multi-asset trading in the browser plus a full institutional CRM. We are not affiliated with, endorsed by, or impersonating any third-party social trading company.`,
    },
    {
      q: "Is this suitable for partner demos?",
      a: "Yes. Consumer-grade web terminal UX plus back office: RBAC, API docs, treasury, marketing tools, and compliance logging for enterprise reviews.",
    },
    {
      q: "Which assets are supported?",
      a: "US and global shares, cryptocurrencies, major FX pairs, indices, metals, and commodities — unified wallet and terminal.",
    },
    {
      q: "Do you offer copy trading?",
      a: "No third-party copy-trading product. Demo desk workflows and strategy templates are for training only, with full audit trails in the CRM.",
    },
    {
      q: "Is my account secure?",
      a: "Encryption, KYC verification, AML monitoring, balance event logs, and session security — built for regulated broker demos.",
    },
    {
      q: "How do I contact support?",
      a: `${brand.supportEmail} — demo and onboarding enquiries.`,
    },
  ];
}

function CtaButton({ onClick, label = "Sign up free" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="btn-broker-green px-8 py-3.5 text-sm font-bold">
      {label}
    </button>
  );
}

function AwardsMarquee({ demoSkin }: { demoSkin: boolean }) {
  const awards = demoSkin ? DEMO_AWARDS : PRO_AWARDS;
  const row = [...awards, ...awards];
  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white py-5">
      <h2 className="mb-4 text-center text-lg font-bold text-broker-navy">
        Start your trading journey with an award winning broker
      </h2>
      <div className="flex animate-[marquee_35s_linear_infinite] gap-8 whitespace-nowrap">
        {row.map((award, i) => (
          <span
            key={`${award}-${i}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <span className="text-broker-green">★</span>
            {award}
          </span>
        ))}
      </div>
    </section>
  );
}

function TickerMarquee() {
  const row = [...TICKERS, ...TICKERS];
  return (
    <section className="overflow-hidden border-y border-slate-200 bg-broker-dark py-6">
      <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
        Live snapshot · Stocks · Crypto · FX
      </p>
      <div className="flex animate-[marquee_40s_linear_infinite] gap-4 whitespace-nowrap">
        {row.map((t, i) => (
          <div
            key={`${t.symbol}-${i}`}
            className="inline-flex min-w-[180px] flex-col rounded-lg border border-white/10 bg-white/[0.04] px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-broker-green">{t.asset}</span>
              <span className="text-sm font-bold text-white">{t.symbol}</span>
            </div>
            <span className="mt-1 text-lg font-semibold tabular-nums text-white">{t.price}</span>
            <span className={`text-xs font-medium ${t.up ? "text-broker-green" : "text-red-400"}`}>{t.change}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-medium text-white">{q}</span>
        {open ? (
          <ChevronUp className="h-5 w-5 shrink-0 text-broker-green" />
        ) : (
          <ChevronDown className="h-5 w-5 shrink-0 text-white/40" />
        )}
      </button>
      {open ? <p className="pb-5 text-sm leading-relaxed text-white/55">{a}</p> : null}
    </div>
  );
}

export function LandingSpreadsSection({ brandName }: { brandName: string }) {
  const [tab, setTab] = useState<"fx" | "shares" | "crypto">("fx");
  const data = {
    fx: [
      { pair: "EUR / USD", spread: "0.8", leverage: "1:30" },
      { pair: "GBP / USD", spread: "1.4", leverage: "1:30" },
      { pair: "USD / JPY", spread: "1.5", leverage: "1:30" },
    ],
    shares: [
      { pair: "AAPL / USD", spread: "0.14", leverage: "1:5" },
      { pair: "TSLA / USD", spread: "1.00", leverage: "1:5" },
      { pair: "NVDA / USD", spread: "0.85", leverage: "1:5" },
    ],
    crypto: [
      { pair: "BTC / USD", spread: "110 USD", leverage: "1:2" },
      { pair: "ETH / USD", spread: "7 USD", leverage: "1:2" },
      { pair: "SOL / USD", spread: "2 USD", leverage: "1:2" },
    ],
  };
  const rows = data[tab];
  const tabs = [
    { id: "fx" as const, label: "Forex" },
    { id: "shares" as const, label: "Stocks" },
    { id: "crypto" as const, label: "Crypto" },
  ];

  return (
    <section className="bg-broker-surface py-16 text-broker-navy sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Explore {brandName} — Fixed Tight Spreads</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-5 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                tab === t.id ? "bg-broker-green text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Instrument</th>
                <th className="px-4 py-3">Fixed spread from</th>
                <th className="px-4 py-3">Max leverage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.pair} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-broker-navy">{row.pair}</td>
                  <td className="px-4 py-3 text-slate-700">{row.spread}</td>
                  <td className="px-4 py-3 text-slate-700">{row.leverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function LandingFooterSection({ brandName }: { brandName: string }) {
  const legal = publicFooterLegal(isPublicDemoSkin());
  const brand = getPublicBrand();
  return (
    <footer className="border-t border-slate-200 bg-broker-dark py-12 text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <PublicBrandLogo size="sm" theme="dark" showDotCom />
          <p className="mt-4 text-sm leading-relaxed text-white/55">{legal}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Legal</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link to="/legal/terms" className="hover:text-broker-green">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link to="/legal/privacy-policy" className="hover:text-broker-green">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/legal/kyc" className="hover:text-broker-green">
                KYC Policy
              </Link>
            </li>
            <li>
              <Link to="/legal/aml" className="hover:text-broker-green">
                AML Policy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Contact</p>
          <p className="mt-3 text-sm text-white/70">{brand.supportEmail}</p>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-7xl px-4 text-center text-xs text-white/35 sm:px-6 lg:px-8">
        &copy; {new Date().getFullYear()} {brandName} · {brand.domain} · {legal}
      </p>
    </footer>
  );
}

/** Toropros section order: app → tools → spreads → academy → awards → support blocks */
export function LandingBelowFold({ brandName, onCta }: Props) {
  const brand = getPublicBrand();
  const demoSkin = isPublicDemoSkin();
  const faq = faqItems(brand, demoSkin);

  return (
    <>
      <LandingPlatformSection brandName={brandName} onCta={onCta} />
      <LandingMetaTraderSection brandName={brandName} />
      <LandingTradingToolsSection brandName={brandName} />
      <LandingSpreadsSection brandName={brandName} />
      <LandingAcademySection brandName={brandName} onCta={onCta} />
      <AwardsMarquee demoSkin={demoSkin} />
      <LandingFeesSection />
      <TickerMarquee />
      <LandingWhySection brandName={brandName} />
      {demoSkin ? <LandingOperatorCrmSection onCta={onCta} /> : null}
      <LandingTrustSection />
      <section className="bg-broker-dark py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <p className="mt-3 text-center text-white/55">Three steps to open and fund your account</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-broker-green text-sm font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-4 font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-white/55">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <CtaButton onClick={onCta} label="Get started" />
          </div>
        </div>
      </section>
      <section className="bg-broker-navy py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold">Your questions, answered</h2>
          <div className="mt-10">
            {faq.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>
      {demoSkin ? (
        <section className="relative overflow-hidden bg-gradient-to-br from-broker-green via-broker-green to-broker-green-dark py-24 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(255,255,255,0.12),transparent)]" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/80">Demo only</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Ready for your next partner walkthrough?</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/90">Show the web terminal, treasury, and CRM back office — simulated markets on an independent stack.</p>
            <div className="mt-8"><button type="button" onClick={onCta} className="rounded-md bg-white px-10 py-3.5 text-sm font-bold text-broker-green hover:bg-slate-100">Start demo now</button></div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden bg-gradient-to-br from-broker-navy via-[#0f1629] to-broker-dark py-24 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(201,162,39,0.15),transparent)]" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-broker-gold-light/90">Client portal</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Open your account today</h2>
            <p className="mt-4 text-lg leading-relaxed text-white/75">Trade equities, FX, and crypto from one secure wallet — professional tools and dedicated support.</p>
            <div className="mt-8"><button type="button" onClick={onCta} className="rounded-md bg-broker-gold px-10 py-3.5 text-sm font-bold text-broker-navy shadow-lg hover:bg-broker-gold-light">Open account</button></div>
          </div>
        </section>
      )}
      <LandingFooterSection brandName={brandName} />
    </>
  );
}
