import React, { useState } from "react";
import { submitEnquiry } from "./enquirySubmit";
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Headphones,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Unplug,
  User,
  XCircle,
} from "lucide-react";

/** @deprecated Legacy Desk CRM marketing — not built; use index.html invite gate + `npm run build`. */
/* CurioniLabs sells one product: Desk CRM */
const CRM_MODULES = [
  {
    id: "core",
    tag: "Desk CRM",
    title: "First-of-its-kind broker CRM platform",
    summary:
      "Desk CRM is our first-of-its-kind air-gapped CRM platform for FX and crypto brokers, with the full feature set we built for live broker operations — client files, deposits and withdrawals, permissions, attribution, and open-position views.",
    bullets: ["CRM & KYC files", "Cashier & ledger", "Staff roles & permissions", "White-label ready"],
  },
  {
    id: "ai",
    tag: "Desk CRM module",
    title: "Air-gapped AI assistant",
    summary:
      "Optional built-in copilot for your agents and operators. Runs on your server only — not connected to ChatGPT or Google. Helps with briefs and call notes; your data stays in your building.",
    bullets: ["Local AI on your VPS", "Zero logs to CurioniLabs", "Agent & desk tools", "Not required to operate"],
  },
  {
    id: "deploy",
    tag: "Implementation",
    title: "Tailor-made VPN and deployment",
    summary:
      "We install Desk CRM on infrastructure you own and can deliver a tailor-made VPN setup for your teams and offices, so your operations stay private and connected under your control.",
    bullets: ["Deploy on your VPS", "Tailor-made VPN setup", "Training & handover", "Ongoing tech support"],
  },
];

/* Plain English for non-technical readers */
const PLAIN_SECURITY = [
  {
    q: "What does “air-gapped” mean?",
    a: "Simple version: your AI lives only on your own computer (server). It is not connected to ChatGPT, Google, or any outside “cloud brain.” Think of it like a safe in your office — not a locker at someone else’s bank.",
  },
  {
    q: "What does “zero logs” mean?",
    a: "We do not keep a secret copy of your chats, client notes, or AI questions. Nothing is sent to CurioniLabs for “analytics.” When the conversation ends, it stays on your box — or nowhere at all.",
  },
  {
    q: "Why is that better than normal AI tools?",
    a: "Most AI tools upload your data to America or Europe. Regulators, hackers, or competitors could get curious. Our way: your data never leaves the room. You get the power of AI without the leak.",
  },
];

const VS_CLOUD = {
  bad: [
    "Your client names go to OpenAI / Google",
    "Vendor can read prompts & answers",
    "Training & retention policies change without you",
    "Internet outage = AI stops working",
  ],
  good: [
    "AI runs on your server only",
    "CurioniLabs never sees production data",
    "Zero logs — no diary of your desk",
    "Works even when Big Tech is down",
  ],
};

const TRUST_POINTS = [
  "CurioniLabs is a CRM software company — we do not run a brokerage or take your clients.",
  "Your clients see your brand; they never need to know our name.",
  "We build and support Desk CRM — you run sales, compliance, and trading.",
];

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071018]/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <a href="#" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg gold-bg text-sm font-black text-[#071018]">
            CL
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Curioni<span className="gold-accent">Labs</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#product" className="hover:text-white">Desk CRM</a>
          <a href="#security" className="hover:text-white">Security</a>
          <a href="#company" className="hover:text-white">About</a>
          <a href="#contact" className="hover:text-white">Contact</a>
        </nav>
        <a
          href="#contact"
          className="rounded-md gold-bg px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#071018] transition hover:brightness-110"
        >
          Get details
        </a>
      </div>
    </header>
  );
}

function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    market: "both" as "fx" | "crypto" | "both" | "other",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const data = await submitEnquiry(form);
      if (data.ok) {
        setResult({ ok: true, text: data.text });
        setForm({ name: "", email: "", phone: "", company: "", market: "both", message: "" });
      } else {
        setResult({ ok: false, text: data.text });
      }
    } catch {
      setResult({ ok: false, text: "Could not send — email hello@curionilabs.com" });
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#c9a227] focus:ring-2 focus:ring-[#c9a227]/20";

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-left">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
            <User size={12} /> Your name *
          </span>
          <input required className={field} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </label>
        <label className="block text-left">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
            <Building2 size={12} /> Company *
          </span>
          <input required className={field} value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
        </label>
        <label className="block text-left">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
            <Mail size={12} /> Email *
          </span>
          <input required type="email" className={field} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </label>
        <label className="block text-left">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
            <Phone size={12} /> Phone / WhatsApp
          </span>
          <input className={field} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </label>
      </div>
      <label className="block text-left">
        <span className="mb-1 text-xs font-semibold text-slate-600">Market</span>
        <select className={field} value={form.market} onChange={(e) => setForm((f) => ({ ...f, market: e.target.value as typeof form.market }))}>
          <option value="fx">Forex / CFD</option>
          <option value="crypto">Crypto</option>
          <option value="both">FX + Crypto</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="block text-left">
        <span className="mb-1 text-xs font-semibold text-slate-600">Message (optional)</span>
        <textarea rows={3} className={`${field} resize-none`} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
      </label>
      {result ? (
        <p className={`rounded-lg px-4 py-3 text-sm ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {result.text}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg gold-bg py-3.5 text-sm font-bold uppercase tracking-wide text-[#071018] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send enquiry"}
        {!busy ? <ArrowRight size={16} /> : null}
      </button>
    </form>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero — Titan-style full bleed */}
      <section className="titan-hero px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c9a227]">
            CRM software provider · FX &amp; crypto brokers
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
            CurioniLabs builds{" "}
            <span className="gradient-headline">broker CRM software</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            We supply <strong className="font-semibold text-white">Desk CRM</strong> — the back-office your
            brokerage runs on. It is a first-of-its-kind air-gapped CRM with the full feature set we built
            in-house. You keep your brand, your clients, and your server. We also offer tailor-made VPN
            solutions for secure team access. We are not a broker; we are the trusted technology partner
            behind the desk.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a href="#contact" className="rounded-md gold-bg px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-[#071018]">
              Get more details
            </a>
            <a href="#security" className="rounded-md border border-white/20 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/5">
              How security works
            </a>
          </div>
        </div>
      </section>

      {/* Solutions intro — Titan "best packages" */}
      <section id="product" className="titan-section-light px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold navy-text md:text-4xl">Desk CRM — our product</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            One platform, built for broker back-offices. Desk CRM is positioned as a first-of-its-kind
            air-gapped CRM, and includes air-gapped AI as a module — not a separate product, not a cloud
            subscription.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-6xl gap-8 md:grid-cols-3">
          {CRM_MODULES.map((s) => (
            <article key={s.id} id={s.id === "ai" ? "ai" : undefined} className="titan-card flex flex-col rounded-xl p-8 text-left">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c9a227]">{s.tag}</span>
              <h3 className="mt-3 text-xl font-bold navy-text">{s.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{s.summary}</p>
              <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                    {b}
                  </li>
                ))}
              </ul>
              <a href="#contact" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-[#0a1628] hover:text-[#c9a227]">
                Learn more <ArrowRight size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* Plain English security */}
      <section id="security" className="titan-section-dark px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#c9a227]/15">
              <Unplug size={28} className="text-[#c9a227]" />
            </div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">Air-gapped AI — explained simply</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Desk CRM keeps AI on your server. Here is what that means in plain language.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PLAIN_SECURITY.map((item) => (
              <div key={item.q} className="titan-card-dark rounded-xl p-6">
                <h3 className="text-base font-bold text-[#c9a227]">{item.q}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.a}</p>
              </div>
            ))}
          </div>

          {/* vs cloud comparison */}
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-6">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-rose-400">
                <XCircle size={16} /> Typical cloud AI CRM
              </p>
              <ul className="mt-4 space-y-3">
                {VS_CLOUD.bad.map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-slate-400">
                    <XCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-6">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-400">
                <ShieldCheck size={16} /> Desk CRM on your server
              </p>
              <ul className="mt-4 space-y-3">
                {VS_CLOUD.good.map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-slate-300">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AI highlight band */}
      <section className="border-y border-[#c9a227]/20 bg-gradient-to-r from-[#0a1628] via-[#0f2744] to-[#0a1628] px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:gap-12">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#c9a227]/15 ring-1 ring-[#c9a227]/30">
            <BrainCircuit size={40} className="text-[#c9a227]" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9a227]">Desk CRM module</p>
            <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Air-gapped AI for your desk</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
              Included with Desk CRM: an on-server assistant for agents and operators. It never sends client
              data to CurioniLabs or to OpenAI. Your brokerage stays independent; your team gets extra help.
            </p>
          </div>
          <a href="#contact" className="shrink-0 rounded-md gold-bg px-6 py-3 text-sm font-bold uppercase text-[#071018]">
            Request demo
          </a>
        </div>
      </section>

      {/* Trusted provider — Titan mirror */}
      <section id="company" className="titan-section-light px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9a227]">About CurioniLabs</p>
              <h2 className="mt-3 text-3xl font-bold navy-text">We only sell CRM software</h2>
              <p className="mt-4 text-slate-600 leading-relaxed">
                CurioniLabs is a B2B technology company. We do not offer trading accounts, hold client funds,
                or compete with the brokers who license Desk CRM. We focus on software only: a first-of-its-
                kind air-gapped CRM with the complete feature set built by our team, plus tailor-made VPN
                deployment options. That separation is what makes us a reliable long-term partner.
              </p>
              <ul className="mt-6 space-y-3">
                {TRUST_POINTS.map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-slate-700">
                    <Lock size={16} className="shrink-0 text-[#c9a227]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-[#0a1628] p-8 text-white">
              <Headphones size={32} className="text-[#c9a227]" />
              <h3 className="mt-4 text-xl font-bold">Dedicated partner support</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Questions about Desk CRM, deployment, or licensing? Our team works with broker operators —
                  not retail traders.
                </p>
              <a href="#contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#c9a227] hover:underline">
                Contact support <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact — Titan "Get more details" */}
      <section id="contact" className="titan-section-dark px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="grid lg:grid-cols-2">
              <div className="bg-[#0a1628] p-8 text-white md:p-12">
                <Sparkles size={24} className="text-[#c9a227]" />
                <h2 className="mt-4 text-2xl font-bold md:text-3xl">Get more details</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                  Request a private Desk CRM walkthrough. Tell us your market (FX, crypto, or both) and we
                  will show you how brokers run on our software.
                </p>
                <div className="mt-8 space-y-2 text-sm text-slate-400">
                  <p className="flex items-center gap-2">
                    <Mail size={14} className="text-[#c9a227]" /> hello@curionilabs.com
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone size={14} className="text-[#c9a227]" /> curionilabs.com
                  </p>
                </div>
              </div>
              <div className="p-8 md:p-12">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#071018] px-6 py-8 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-400">
          CurioniLabs — CRM software for FX &amp; crypto brokerages.
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} CurioniLabs · B2B software only · Not investment advice · Not a regulated broker
        </p>
      </footer>
    </div>
  );
}
