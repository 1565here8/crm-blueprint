import { useEffect, useState } from "react";
import { isAdminHost } from "./siteMode";
import { sanitizeApiJsonForCurionilabs } from "./curionilabsGuard";

type PublicConfig = {
  publicSiteOffline?: boolean;
  rebranding?: boolean;
};

export function usePublicSiteOffline(): { offline: boolean; loading: boolean } {
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdminHost()) {
      setOffline(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetch("/api/public/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PublicConfig | null) => {
        if (cancelled) return;
        const safe = data ? sanitizeApiJsonForCurionilabs(data) : null;
        setOffline(Boolean(safe?.publicSiteOffline || safe?.rebranding));
      })
      .catch(() => {
        if (!cancelled) setOffline(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { offline, loading };
}
