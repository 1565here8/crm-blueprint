import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#000000]">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Curioni Labs
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">Command Center</p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-xs font-medium text-zinc-400">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-zinc-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-all duration-200 focus:border-indigo-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2.5">
                <p className="text-xs font-medium text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-50"
            >
              <span className="relative z-10">{pending ? "Signing in…" : "Sign In"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-zinc-600">
            Staff access only · Secured by Curioni Labs
          </p>
        </form>
      </div>
    </div>
  );
}
