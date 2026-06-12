import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  bootstrapSession,
  ensureCsrfToken,
  fetchMe,
  type MeResponse,
} from "../api/apiClient";

type SessionContextValue = {
  user: MeResponse["user"] | null;
  authenticated: boolean;
  loading: boolean;
  creating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function sessionErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await ensureCsrfToken().catch(() => null);
      const res = await fetchMe();
      setUser(res?.user ?? null);
      if (res?.user) setError(null);
    } catch (err) {
      setError(sessionErrorMessage(err, "Failed to load session."));
      setUser(null);
    }
  }, []);

  const createSession = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await bootstrapSession();
      setUser(res.user);
      setError(null);
    } catch (err) {
      setError(sessionErrorMessage(err, "Failed to create session."));
      setUser(null);
    } finally {
      setCreating(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const forceDone = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    (async () => {
      setLoading(true);
      try {
        await ensureCsrfToken().catch(() => null);
        let res = await fetchMe();
        if (cancelled) return;
        if (!res?.user) {
          try {
            res = await bootstrapSession();
          } catch (bootErr) {
            if (!cancelled) {
              setError(sessionErrorMessage(bootErr, "Failed to create session."));
              setUser(null);
            }
            return;
          }
        }
        if (cancelled) return;
        setUser(res?.user ?? null);
        if (res?.user) setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(sessionErrorMessage(err, "Failed to load session."));
          setUser(null);
        }
      } finally {
        window.clearTimeout(forceDone);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(forceDone);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      authenticated: Boolean(user),
      loading,
      creating,
      error,
      refresh,
      createSession,
    }),
    [user, loading, creating, error, refresh, createSession],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      {loading ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[color:var(--surface-0)]/90 backdrop-blur-[2px]"
          aria-live="polite"
          aria-busy="true"
        >
          <p className="label-premium text-[color:var(--text-tertiary)]">Initializing session…</p>
        </div>
      ) : null}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider.");
  return ctx;
}

export function useUserIdentity() {
  const { user, authenticated } = useSession();
  return useMemo(
    () => ({
      userId: user?.id ?? "",
      tokens: user?.tokens ?? 0,
      role: user?.role ?? "user",
      authenticated,
    }),
    [user, authenticated],
  );
}
