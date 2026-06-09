import { Lock, Shield } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { CurioniLabsLogo } from "../../components/brand/CurioniLabsLogo";
import { CurioniLabsPlatformCredit } from "../../components/admin/CurioniLabsPlatformCredit";
import { DemoDisclaimerBanner } from "../../components/public/DemoDisclaimerBanner";
import { getPublicBrand } from "../../lib/publicBrand";

function loginReturnPath(pathname: string, search: string): string {
  const path = `${pathname}${search}`;
  if (path.startsWith("/admin/") && path !== "/admin/") return path;
  return "/admin";
}

export function AdminLoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const returnTo = loginReturnPath(location.pathname, location.search);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const broker = getPublicBrand();

  useEffect(() => {
    document.title = "Curioni Labs — Command";
  }, [broker.name]);

  if (user?.role === "admin" || user?.isStaff) {
    return <Navigate to={returnTo} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setPending(false);
      return;
    }
    setPending(false);
  }

  return (
    <div className="flex min-h-screen bg-[#0c1017] text-slate-100">
      <div className="hidden w-[42%] flex-col justify-between border-r border-slate-800 p-10 lg:flex bg-gradient-to-br from-[#0c1017] via-[#0f1623] to-[#1a3d1a]">
        <div className="space-y-4">
          <CurioniLabsLogo variant="full" theme="dark" height={44} subtitle="COMMAND" />
          <DemoDisclaimerBanner variant="compact" className="max-w-sm text-white/50" />
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Backoffice for marketing, clients, telephony & treasury
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Manage agents, campaigns, client profiles, deposits, trading desk activity, and platform settings. Authorized staff only.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span className="rounded-full border border-slate-700 px-3 py-1">CRM &amp; Clients</span>
            <span className="rounded-full border border-slate-700 px-3 py-1">Marketing Desk</span>
            <span className="rounded-full border border-slate-700 px-3 py-1">Cashier &amp; Treasury</span>
            <span className="rounded-full border border-slate-700 px-3 py-1">Trading Desk</span>
          </div>
        </div>

        <div className="space-y-3">
          <CurioniLabsPlatformCredit compact />
          <p className="text-xs text-slate-600">Internal use · CURIONILABS staff portal</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 space-y-3 lg:hidden">
            <CurioniLabsLogo variant="full" theme="dark" height={40} subtitle="COMMAND" />
            <DemoDisclaimerBanner variant="compact" className="text-white/45" />
          </div>

          <div className="mb-6 flex items-center gap-2 text-broker-green">
            <Shield size={18} />
            <span className="text-sm font-semibold">Staff sign in</span>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-2xl border border-slate-800 bg-[#121820] p-6 shadow-xl shadow-black/20"
          >
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border border-slate-700 bg-[#0c1017] px-3 py-2.5 text-sm outline-none transition focus:border-broker-green focus:ring-2 focus:ring-broker-green/20"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-700 bg-[#0c1017] px-3 py-2.5 text-sm outline-none transition focus:border-broker-green focus:ring-2 focus:ring-broker-green/20"
                required
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-broker-green py-3 text-sm font-semibold text-white transition hover:bg-broker-green-dark disabled:opacity-50"
            >
              <Lock size={15} />
              {pending ? "Signing in…" : "Enter CRM"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-600">
            Client trading accounts use the public site, not this portal.
          </p>
        </div>
      </div>
    </div>
  );
}
