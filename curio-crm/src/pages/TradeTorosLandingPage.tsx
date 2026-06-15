import React from "react";
import { ArrowRight, Shield, TrendingUp, Users, Zap, BarChart3, Lock, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BROKER_COLORS, BROKER_DISPLAY, BROKER_NAME, BROKER_TAGLINE } from "../lib/tradetorosBrand";

export function TradeTorosLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white">
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
            <Zap size={14} /> {BROKER_TAGLINE}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {BROKER_DISPLAY}
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
              Sign In
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-3.5 text-base font-semibold text-slate-300 backdrop-blur-sm transition-all hover:border-slate-600 hover:bg-slate-800"
            >
              Create Account
            </button>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-800 px-6 py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: BarChart3, title: "Real-Time Trading", desc: "Execute trades with institutional-grade execution across equities and crypto." },
            { icon: Shield, title: "Secure Platform", desc: "Bank-grade encryption, cold storage, and multi-factor authentication." },
            { icon: TrendingUp, title: "Advanced Analytics", desc: "Real-time market data, technical indicators, and portfolio tracking." },
            { icon: Zap, title: "Lightning Fast", desc: "Sub-millisecond order routing and real-time market data streaming." },
            { icon: Users, title: "Expert Support", desc: "24/7 dedicated support team to help you every step of the way." },
            { icon: Globe, title: "Global Markets", desc: "Trade US equities and crypto from anywhere in the world." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all hover:border-slate-700">
              <div className="mb-4 inline-flex rounded-xl bg-sky-500/10 p-3 text-sky-400">
                <Icon size={24} />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
