import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bitcoin,
  Copy,
  Download,
  Globe2,
  GraduationCap,
  Laptop,
  LineChart,
  Monitor,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { MT_BRIDGE_DEFAULTS } from "../../../shared/metaTraderBridge";
import { publicTrustBadges } from "../../../shared/demoCopy";
import { DemoDisclaimerBanner } from "./DemoDisclaimerBanner";
import { isPublicDemoSkin } from "../../lib/publicBrand";

type HeroProps = {
  brandName: string;
  ctaLabel?: string;
  onCta: () => void;
};

const DEMO_HERO_SLIDES = [
  {
    kicker: "Demo showcase",
    title: "REGISTER AND OPEN A TRADING ACCOUNT.",
    body: "Multi-asset web terminal with institutional CRM — simulated markets for authorized partner demonstrations.",
    cta: "Start Trading Today",
    bg: "linear-gradient(135deg, rgba(24,33,77,0.92) 0%, rgba(37,40,42,0.88) 100%), radial-gradient(ellipse at 70% 30%, rgba(132,197,97,0.15), transparent 60%)",
  },
  {
    kicker: "Portfolio demo",
    title: "TRADE GLOBAL ASSETS FROM ONE WALLET",
    body: "Shares · Indices · Metals · Forex · Commodities · Cryptocurrencies · Vanilla Options",
    cta: "Start Trading Today",
    bg: "linear-gradient(135deg, rgba(37,40,42,0.9) 0%, rgba(24,33,77,0.85) 100%), radial-gradient(ellipse at 30% 70%, rgba(56,97,251,0.12), transparent 55%)",
  },
];

const PRO_HERO_SLIDES = [
  {
    kicker: "Institutional access",
    title: "Trade global markets from one client portal.",
    body: "Equities, FX, crypto, and metals — unified account, professional execution, and transparent reporting for qualified clients.",
    cta: "Open Account",
    bg: "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(24,33,77,0.94) 50%, rgba(37,40,42,0.9) 100%), radial-gradient(ellipse at 75% 25%, rgba(201,162,39,0.14), transparent 55%)",
  },
  {
    kicker: "Markets & accounts",
    title: "Professional multi-asset execution.",
    body: "Major FX pairs, US and global equities, digital assets, indices, and commodities — one secure wallet and dedicated support.",
    cta: "Open Account",
    bg: "linear-gradient(135deg, rgba(24,33,77,0.95) 0%, rgba(15,23,42,0.92) 100%), radial-gradient(ellipse at 25% 75%, rgba(132,197,97,0.1), transparent 50%)",
  },
];

const DEMO_STATS = [
  { label: "Shares & indices", value: "Global" },
  { label: "Crypto assets", value: "70+" },
  { label: "FX pairs", value: "Major +" },
  { label: "One web wallet", value: "Unified" },
];

const PRO_STATS = [
  { label: "Client accounts", value: "50K+" },
  { label: "Instruments", value: "2,500+" },
  { label: "Avg. execution", value: "< 50ms" },
  { label: "Support", value: "24/5" },
];

const TOROPROS_FEATURES = [
  {
    title: "No Slippage",
    body: "Trades execute at the rate you see on our platforms — no spread surprises during volatility.",
    icon: ShieldCheck,
  },
  {
    title: "Tight Fixed Spreads",
    body: "Spreads stay fixed during trading hours so you know your costs upfront.",
    icon: SlidersHorizontal,
  },
  {
    title: "Free Guaranteed Stop Loss",
    body: "Protect open trades against runaway losses — a standard feature on web and app platforms.",
    icon: Shield,
  },
  {
    title: "Negative Balance Protection",
    body: "Standard on all accounts — you are protected when you trade.",
    icon: Wallet,
  },
];

const TRADING_TOOLS = [
  {
    title: "Limited-risk trades",
    body: "Trade with defined risk and unlimited potential on supported instruments — no margin on select products.",
    icon: TrendingUp,
  },
  {
    title: "Deal protection",
    body: "Undo a losing trade within a configurable window — one of the most innovative desk tools.",
    icon: Copy,
  },
  {
    title: "Freeze rate",
    body: "Freeze the price you see for a few seconds while you confirm your order.",
    icon: Zap,
  },
  {
    title: "Vanilla options",
    body: "Predefined risk amount — often used to hedge against volatility.",
    icon: BarChart3,
  },
];

export function LandingHeroSection({ ctaLabel = "Start Trading Today", onCta }: HeroProps) {
  const demoSkin = isPublicDemoSkin();
  const slides = demoSkin ? DEMO_HERO_SLIDES : PRO_HERO_SLIDES;
  const stats = demoSkin ? DEMO_STATS : PRO_STATS;
  const trustBadges = publicTrustBadges(demoSkin);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSlide((s) => (s + 1) % slides.length), 7000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const current = slides[slide]!;
  const primaryCta = ctaLabel || current.cta;

  return (
    <section className="relative">
      <div
        className="relative flex min-h-[520px] items-center bg-broker-dark text-white transition-[background] duration-700 sm:min-h-[600px]"
        style={{ background: current.bg }}
      >
        <div className="pointer-events-none absolute inset-0 bg-black/30" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <p
            className={`text-xs font-bold uppercase tracking-[0.35em] ${demoSkin ? "text-white/50" : "text-broker-gold-light/80"}`}
          >
            {current.kicker}
          </p>
          <h1
            className={`mt-4 max-w-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem] ${
              demoSkin ? "text-3xl uppercase" : "text-3xl sm:text-[2.85rem]"
            }`}
          >
            {current.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">{current.body}</p>
          <DemoDisclaimerBanner variant="hero" className="mt-6 max-w-2xl" />
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCta}
              className={`gap-2 px-8 py-3.5 text-sm font-bold ${demoSkin ? "btn-broker-green" : "inline-flex items-center justify-center rounded-md bg-broker-gold text-broker-navy shadow-lg transition hover:bg-broker-gold-light"}`}
            >
              {primaryCta}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={onCta} className="btn-broker-outline px-8 py-3.5 text-sm font-semibold">
              {demoSkin ? "Open Live Account" : "Client portal"}
            </button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {trustBadges.map((badge) => (
              <li
                key={badge}
                className={`rounded-md border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide ${
                  demoSkin
                    ? "border-white/15 bg-black/20 text-white/60"
                    : "border-broker-gold/25 bg-black/25 text-white/70"
                }`}
              >
                {badge}
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className={`h-2 rounded-full transition-all ${i === slide ? (demoSkin ? "w-8 bg-broker-green" : "w-8 bg-broker-gold") : "w-2 bg-white/40"}`}
            />
          ))}
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6 lg:px-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <p className="text-xl font-bold text-broker-navy sm:text-2xl">{s.value}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingToroprosFeaturesSection() {
  return (
    <section className="border-b border-slate-200 bg-white py-14 sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6 lg:px-8">
        {TOROPROS_FEATURES.map(({ title, body, icon: Icon }) => (
          <div key={title} className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-broker-green/10">
              <Icon className="h-7 w-7 text-broker-green" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-broker-navy">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LandingTradingToolsSection({ brandName }: { brandName: string }) {
  return (
    <section className="bg-broker-surface py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-broker-navy sm:text-3xl">
          State of the art trading tools by {brandName}
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRADING_TOOLS.map(({ title, body, icon: Icon }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <Icon className="mx-auto h-8 w-8 text-broker-green" strokeWidth={1.5} />
              <h3 className="mt-4 font-bold text-broker-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const PILLARS = [
  {
    title: "Stocks & Shares",
    body: "US and global equities — AAPL, TSLA, NVDA, indices, and more from one account.",
    icon: TrendingUp,
  },
  {
    title: "Crypto",
    body: "Buy, sell, and convert BTC, ETH, SOL, XRP with transparent fixed fees.",
    icon: Bitcoin,
  },
  {
    title: "Forex (FX)",
    body: "EUR/USD, GBP/USD, USD/JPY — tight spreads and leverage on major pairs.",
    icon: LineChart,
  },
];

export function LandingFeaturesSection() {
  const demoSkin = isPublicDemoSkin();
  return (
    <section className="bg-white py-20 text-broker-navy sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-broker-green">Asset classes</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Diversify from one wallet</h2>
          <p className="mt-4 text-slate-600 sm:text-lg">
            {demoSkin ? "Stocks, crypto, forex, ETFs, and metals — unified funding and reporting in a single demo stack." : "Stocks, crypto, forex, ETFs, and metals — unified funding and reporting from one client account."}
          </p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {PILLARS.map(({ title, body, icon: Icon }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-100 bg-gradient-to-b from-white to-broker-surface p-8 shadow-sm transition hover:border-broker-green/35 hover:shadow-lg"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-broker-green/10">
                <Icon className="h-5 w-5 text-broker-green" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFeesSection() {
  const demoSkin = isPublicDemoSkin();
  const fees = [
    { headline: "0%", sub: demoSkin ? "commission on demo stock trades*" : "commission on stock trades*", icon: TrendingUp },
    { headline: "Tight", sub: "fixed FX spreads from 0.8 pips", icon: LineChart },
    { headline: "Flat", sub: "transparent crypto fees", icon: Bitcoin },
  ];
  return (
    <section className="border-y border-slate-200 bg-broker-surface py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-broker-navy">Low fees, no surprises</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {fees.map(({ headline, sub, icon: Icon }) => (
            <div key={sub} className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <Icon className="mx-auto h-7 w-7 text-broker-green" strokeWidth={1.5} />
              <p className="mt-4 text-4xl font-bold text-broker-navy">{headline}</p>
              <p className="mt-2 text-sm text-slate-600">{sub}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">{demoSkin ? "* Demo pricing. See legal pages for full terms." : "* Terms apply. See legal pages for full fee schedule."}</p>
      </div>
    </section>
  );
}

const WHY_ITEMS = [
  { title: "Desk workflows", body: "Pre-built operator flows with full audit trails — not third-party copy products.", icon: Copy },
  { title: "Institutional CRM", body: "Clients, treasury, trading book, marketing, RBAC.", icon: BarChart3 },
  { title: "Enterprise security", body: "KYC/AML, audit logs, balance events.", icon: Shield },
  { title: "One wallet", body: "Fund once — FX, shares, and crypto from one balance.", icon: Wallet },
];

export function LandingWhySection({ brandName }: { brandName: string }) {
  return (
    <section className="bg-broker-dark py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold">Why {brandName}</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_ITEMS.map(({ title, body, icon: Icon }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-6">
              <Icon className="mb-3 h-7 w-7 text-broker-green" strokeWidth={1.5} />
              <h3 className="font-bold">{title}</h3>
              <p className="mt-2 text-sm text-white/55">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingOperatorCrmSection({ onCta }: { onCta: () => void }) {
  return (
    <section className="bg-white py-16 text-broker-navy sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-3xl font-bold">Operator CRM built in</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Every client, deposit, trade, and permission lives in one back office — Mission Control, treasury,
            marketing attribution, and audit logs. Independent white-label stack; not affiliated with any third-party
            broker brand.
          </p>
          <button type="button" onClick={onCta} className="btn-broker-green mt-8 px-8 py-3 text-sm font-bold">
            Explore demo CRM
          </button>
        </div>
        <div className="grid gap-3 text-sm">
          {[
            { title: "All Clients", body: "Search, filter, bulk edit, import CSV." },
            { title: "Cashier", body: "Deposits, withdrawals, wires, ledger." },
            { title: "Wallstreet AI", body: "Ask Wallstreet AI how any screen works — sovereign desk intelligence on your VPS." },
          ].map((row) => (
            <div key={row.title} className="rounded-xl border border-slate-200 bg-broker-surface px-5 py-4">
              <p className="font-semibold text-broker-green">{row.title}</p>
              <p className="mt-1 text-slate-600">{row.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** @deprecated */
export const LandingCopyTradingSection = LandingOperatorCrmSection;

const ACADEMY = ["Investing 101", "Crypto basics", "FX fundamentals", "Portfolio building", "Risk management"];

export function LandingAcademySection({ brandName, onCta }: { brandName: string; onCta: () => void }) {
  return (
    <section className="bg-broker-navy py-16 text-white sm:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-md">
          <GraduationCap className="h-9 w-9 text-broker-green" />
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.28em] text-broker-green">{brandName} Academy</p>
          <h2 className="mt-2 text-3xl font-bold">Explore, Learn, Grow</h2>
          <p className="mt-3 text-white/55">9 lessons · 70+ videos — free education for stocks, crypto, and FX.</p>
          <button
            type="button"
            onClick={onCta}
            className="mt-6 rounded-md border border-white/20 px-6 py-2.5 text-sm font-semibold hover:bg-white/5"
          >
            Learn more
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACADEMY.map((topic) => (
            <span key={topic} className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/75">
              {topic}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingTrustSection() {
  const stats = [
    { icon: Users, title: "Teams", body: "Multi-tenant desks at scale" },
    { icon: Zap, title: "Reliable", body: "Fintech-grade uptime targets" },
    { icon: Shield, title: "Secured", body: "KYC, AML, and audit logging" },
    { icon: Globe2, title: "Global", body: "FX, equities, crypto — one stack" },
  ];
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold text-broker-navy">Trusted worldwide</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-slate-100 p-6 text-center">
              <Icon className="mx-auto h-7 w-7 text-broker-green" />
              <h3 className="mt-3 font-bold text-broker-navy">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Web platform section — toropros app pitch layout */
const MT_FEATURES = [
  "Expert Advisors & custom indicators",
  "One-click trading & depth of market",
  "Mobile apps — iOS & Android",
  "CRM-synced balances & trade history",
];

export function LandingMetaTraderSection({ brandName }: { brandName: string }) {
  const demoSkin = isPublicDemoSkin();
  const platforms = [
    {
      id: "mt4" as const,
      label: "MetaTrader 4",
      short: "MT4",
      desc: "The world's most deployed FX terminal — EAs, signals, and 15 years of broker trust.",
      gradient: "from-emerald-600 to-teal-700",
      ring: "ring-emerald-500/25",
      glow: "shadow-emerald-500/20",
      win: MT_BRIDGE_DEFAULTS["mt4.download_win"],
      mac: MT_BRIDGE_DEFAULTS["mt4.download_mac"],
      server: MT_BRIDGE_DEFAULTS["mt4.server_name"],
    },
    {
      id: "mt5" as const,
      label: "MetaTrader 5",
      short: "MT5",
      desc: "Multi-asset engine with faster ticks, hedging, and deeper back-office integration.",
      gradient: "from-blue-600 to-indigo-700",
      ring: "ring-blue-500/25",
      glow: "shadow-blue-500/20",
      win: MT_BRIDGE_DEFAULTS["mt5.download_win"],
      mac: MT_BRIDGE_DEFAULTS["mt5.download_mac"],
      server: MT_BRIDGE_DEFAULTS["mt5.server_name"],
    },
  ];

  return (
    <section className="relative overflow-hidden bg-broker-dark py-20 text-white sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(30,132,73,0.18),transparent_50%),radial-gradient(ellipse_at_80%_80%,rgba(41,98,255,0.15),transparent_50%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-400">Desktop & mobile</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Trade on MetaTrader 4 & 5 with {brandName}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/70">
            {demoSkin
              ? "Full MT4/MT5 bridge in the CRM demo — provision logins, sync balances, and ship client download links from one admin screen."
              : "Connect MetaTrader 4 or 5 to your account — professional charts, EAs, and mobile apps with balances synced to your client portal."}
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {platforms.map((p) => (
            <div
              key={p.id}
              className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl ${p.glow} ring-1 ${p.ring} backdrop-blur-sm`}
            >
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${p.gradient} opacity-20 blur-2xl`} />
              <div className="relative">
                <span className={`inline-flex rounded-full bg-gradient-to-r ${p.gradient} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white`}>
                  {p.short}
                </span>
                <h3 className="mt-4 text-2xl font-bold">{p.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{p.desc}</p>
                <p className="mt-4 font-mono text-xs text-white/45">
                  Server: <span className="text-white/80">{p.server}</span>
                </p>
                <ul className="mt-5 space-y-2">
                  {MT_FEATURES.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/75">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={p.win}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-broker-navy transition hover:bg-white/90"
                  >
                    <Laptop size={16} />
                    Windows
                  </a>
                  <a
                    href={p.mac}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    <Download size={16} />
                    macOS
                  </a>
                  <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/60">
                    <Smartphone size={16} />
                    iOS · Android
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-white/40">
          {demoSkin ? "Simulated bridge for partner demonstrations — not a live MetaQuotes server." : "Download links open official MetaQuotes installers."}
        </p>
      </div>
    </section>
  );
}

export function LandingPlatformSection({ brandName, onCta }: { brandName: string; onCta: () => void }) {
  const demoSkin = isPublicDemoSkin();
  return (
    <section className="border-t border-slate-200 bg-white py-16 text-broker-navy sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            Enhance your trading experience with the {brandName} app
          </h2>
          <p className="mt-2 text-lg font-medium text-slate-700">Simple. Intuitive. Powerful.</p>
          <p className="mt-4 leading-relaxed text-slate-600">
            Access to the world&apos;s financial markets at your fingertips — web terminal, no download required for your
            demo.
          </p>
          <button type="button" onClick={onCta} className="btn-broker-green mt-8 px-8 py-3 text-sm font-bold">
            {demoSkin ? "Open web terminal" : "Launch client portal"}
          </button>
        </div>
        <div className="relative">
          <div className="absolute -inset-2 rounded-2xl bg-broker-green/10 blur-xl" />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-broker-surface shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Monitor className="h-4 w-4 text-broker-green" strokeWidth={2} />
              <span className="text-xs font-semibold text-slate-600">{demoSkin ? "Web terminal · live snapshot" : "Markets · live snapshot"}</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-200 p-px">
              {[
                { sym: "EUR/USD", px: "1.0842", ch: "+0.12%", up: true },
                { sym: "AAPL", px: "227.45", ch: "+1.24%", up: true },
                { sym: "BTC", px: "97,842", ch: "+1.71%", up: true },
                { sym: "GBP/USD", px: "1.2718", ch: "-0.08%", up: false },
              ].map((t) => (
                <div key={t.sym} className="bg-white px-4 py-4">
                  <p className="text-sm font-bold text-broker-navy">{t.sym}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums">{t.px}</p>
                  <p className={`text-xs font-medium ${t.up ? "text-broker-green" : "text-red-500"}`}>{t.ch}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
