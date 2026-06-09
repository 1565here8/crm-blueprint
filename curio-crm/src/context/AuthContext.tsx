import React, { createContext, useContext, useEffect, useState } from "react";
import { client, type MarketStatus, type UserSummary } from "../api/client";

type RegisterBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  countryCode: string;
  phone: string;
  promoCode?: string;
  currency?: "USD" | "EUR" | "GBP";
  acceptedTerms: true;
  notUsCitizen: true;
  campaign?: string;
};

type AuthState = {
  user: UserSummary | null;
  loading: boolean;
  impersonating: boolean;
  impersonatorUsername: string | null;
  freeLiveFeeds: boolean;
  market: MarketStatus | null;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  register: (body: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
  stopImpersonate: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonatorUsername, setImpersonatorUsername] = useState<string | null>(null);
  const [freeLiveFeeds, setFreeLiveFeeds] = useState(true);
  const [market, setMarket] = useState<MarketStatus | null>(null);

  async function refresh() {
    const data = await client.session();
    setUser(data.authenticated && data.user ? data.user : null);
    setImpersonating(Boolean(data.impersonating));
    setImpersonatorUsername(data.impersonatorUsername ?? null);
    setFreeLiveFeeds(Boolean(data.freeLiveFeeds ?? true));
    setMarket(data.market ?? null);
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const data = await client.login(username, password);
    setUser(data.user);
    setImpersonating(false);
    setImpersonatorUsername(null);
    setFreeLiveFeeds(data.freeLiveFeeds);
    setMarket(data.market);
  }

  async function register(body: RegisterBody) {
    const data = await client.register(body);
    setUser(data.user);
    setImpersonating(false);
    setImpersonatorUsername(null);
    setFreeLiveFeeds(data.freeLiveFeeds);
    setMarket(data.market);
  }

  async function logout() {
    if (impersonating) {
      await stopImpersonate();
      return;
    }
    await client.logout();
    setUser(null);
    setImpersonating(false);
    setImpersonatorUsername(null);
  }

  async function stopImpersonate() {
    const data = await client.stopImpersonate();
    setUser(data.user);
    setImpersonating(false);
    setImpersonatorUsername(null);
    setFreeLiveFeeds(data.freeLiveFeeds);
    setMarket(data.market);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        impersonating,
        impersonatorUsername,
        freeLiveFeeds,
        market,
        refresh,
        login,
        register,
        logout,
        stopImpersonate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
