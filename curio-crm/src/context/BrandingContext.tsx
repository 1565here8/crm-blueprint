import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { client, type CrmBranding } from "../api/client";

import { CURIONILABS_DISPLAY } from "../lib/curioniLabs";

const defaultBranding: CrmBranding = {
  goToSiteUrl: "/",
  crmBrandName: CURIONILABS_DISPLAY,
  goToSiteLabel: "Go to site",
};

type BrandingContextValue = {
  branding: CrmBranding;
  refreshBranding: () => Promise<void>;
};

const BrandingContext = createContext<BrandingContextValue>({
  branding: defaultBranding,
  refreshBranding: async () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState(defaultBranding);

  const refreshBranding = useCallback(async () => {
    try {
      const data = await client.getPublicBranding();
      setBranding(data.branding);
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    void refreshBranding();
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>{children}</BrandingContext.Provider>
  );
}

export function useCrmBranding() {
  return useContext(BrandingContext);
}

export function isExternalSiteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}
