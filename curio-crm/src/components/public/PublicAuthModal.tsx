import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ACCOUNT_CURRENCIES, type AccountCurrency } from "../../api/client";
import { publicAuthNote } from "../../../shared/demoCopy";
import { isPublicDemoSkin } from "../../lib/publicBrand";
import { useAuth } from "../../context/AuthContext";

type AuthMode = "login" | "register";

type Props = {
  mode: AuthMode | null;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  campaign?: string | null;
  onLoginSuccess?: () => void;
};

const COUNTRY_OPTIONS = [
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "CY", label: "Cyprus" },
  { code: "AU", label: "Australia" },
  { code: "SC", label: "Seychelles" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "ES", label: "Spain" },
  { code: "IT", label: "Italy" },
  { code: "CA", label: "Canada" },
];

export function PublicAuthModal({ mode, onClose, onSwitchMode, campaign }: Props) {
  const { login, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("GB");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [currency, setCurrency] = useState<AccountCurrency>("USD");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [notUsCitizen, setNotUsCitizen] = useState(false);

  useEffect(() => {
    if (mode) setError(null);
  }, [mode]);

  if (!mode) return null;

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(username.trim(), password);
      onClose();
      props.onLoginSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setPending(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms || !notUsCitizen) {
      setError("Please accept the terms and confirm you are not a US citizen.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: regPassword,
        countryCode,
        phone: phone.trim(),
        promoCode: promoCode.trim() || undefined,
        currency,
        campaign: campaign ?? undefined,
        acceptedTerms: true,
        notUsCitizen: true,
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(
        msg.includes("already registered")
          ? `${msg} Use Login below if you signed up before.`
          : msg,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wide text-slate-800">
            {mode === "login" ? "Login" : "Sign Up"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-2 text-xs leading-relaxed text-teal-900/80">
          {DEMO_AUTH_NOTE}
        </p>

        {mode === "login" ? (
          <form onSubmit={onLogin} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Email or username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-[#1a3a7a] py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#152f66] disabled:opacity-50"
            >
              {pending ? "Signing in…" : "Login"}
            </button>
            <p className="text-center text-sm text-slate-500">
              No account?{" "}
              <button
                type="button"
                className="font-semibold text-[#1a3a7a] hover:underline"
                onClick={() => onSwitchMode("register")}
              >
                Sign up
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={onRegister} className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">First name</span>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Last name</span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  required
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Country</span>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Account currency</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as AccountCurrency)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                >
                  {ACCOUNT_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                required
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Promo code (optional)</span>
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Password (min 8 characters)</span>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-600"
                required
              />
            </label>
            {campaign ? (
              <p className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Campaign: <span className="font-medium text-slate-700">{campaign}</span>
              </p>
            ) : null}
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5"
              />
              I accept the terms and conditions
            </label>
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={notUsCitizen}
                onChange={(e) => setNotUsCitizen(e.target.checked)}
                className="mt-0.5"
              />
              I confirm I am not a US citizen
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full bg-teal-600 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-teal-500 disabled:opacity-50"
            >
              {pending ? "Creating account…" : "Sign Up"}
            </button>
            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <button
                type="button"
                className="font-semibold text-[#1a3a7a] hover:underline"
                onClick={() => onSwitchMode("login")}
              >
                Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
