import React from "react";
import { ArrowRight, Shield, TrendingUp, Users, Zap, BarChart3, Lock, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TRADOTOROS_COLORS, TRADOTOROS_DISPLAY } from "../lib/tradetorosBrand";

export function TradeTorosLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
            <Zap size={14} /> Professional Trading Platform
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {TRADOTOROS_DISPLAY}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Institutional-grade trading infrastructure. Execute trades, manage your portfolio, and access real-time market data — all from one powerful platform.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/admin")}
              className="group inline-flex items-center gap-2 rounded-xl bg-sky-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:bg-sky-400 hover:shadow-sky-500/40"
            >
              Open Backoffice <ArrowRight size={16} />
            </button>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-base font-semibold text-slate-300 transition-all hover:border-sky-500/50 hover:bg-slate-800"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* ── Feature Grid ─────────────────────────────────────── */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-2xl font-semibold text-slate-300">Platform Features</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <TrendingUp size={24} />, title: "Multi-Asset Trading", desc: "Forex, crypto, equities & commodities from a single account." },
              { icon: <BarChart3 size={24} />, title: "Real-Time Analytics", desc: "Live market data, advanced charts, and portfolio insights." },
              { icon: <Shield size={24} />, title: "Bank-Grade Security", desc: "256-bit encryption, 2FA, and cold storage for all assets." },
              { icon: <Users size={24} />, title: "Dedicated Support", desc: "24/7 multilingual support team ready to assist you." },
              { icon: <Lock size={24} />, title: "Secure Vault", desc: "Encrypted document storage for KYC and trading records." },
              { icon: <Globe size={24} />, title: "Global Access", desc: "Trade from anywhere in the world with low-latency execution." },
              { icon: <Zap size={24} />, title: "AI Desk Assistant", desc: "Automated lead management and client communication tools." },
              { icon: <BarChart3 size={24} />, title: "Commission Engine", desc: "Flexible commission structures for partners and affiliates." },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-sky-500/40 hover:bg-slate-800/60"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition-all group-hover:bg-sky-500/20">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/50 px-6 py-12">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "24/7", label: "Market Access" },
            { value: "<50ms", label: "Execution Speed" },
            { value: "50+", label: "Trading Pairs" },
            { value: "99.9%", label: "Uptime SLA" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="mt-1 text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="px-6 py-10 text-center text-sm text-slate-600">
        &copy; {new Date().getFullYear()} {TRADOTOROS_DISPLAY}. All rights reserved.
      </footer>
    </div>
  );
}
