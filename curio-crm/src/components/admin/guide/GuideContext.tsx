import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getButtonTip } from "../../../../shared/crmGuideKnowledge";
import {
  clearCustomGuideTip,
  getTipDisplayText,
  hideGuideTip,
  isTipHidden,
  loadGuideTipPrefs,
  resetAllGuideTips,
  setCustomGuideTip,
  type GuideTipPrefs,
} from "../../../lib/guidePreferences";

type GuideContextValue = {
  prefs: GuideTipPrefs;
  isVisible: (tipId: string) => boolean;
  getText: (tipId: string) => string;
  hide: (tipId: string) => void;
  saveCustom: (tipId: string, text: string) => void;
  resetCustom: (tipId: string) => void;
  resetAll: () => void;
  hiddenCount: number;
};

const GuideCtx = createContext<GuideContextValue | null>(null);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<GuideTipPrefs>(() => loadGuideTipPrefs());

  const isVisible = useCallback((tipId: string) => !isTipHidden(tipId, prefs), [prefs]);

  const getText = useCallback(
    (tipId: string) => {
      const def = getButtonTip(tipId) ?? "No description yet.";
      return getTipDisplayText(tipId, def, prefs);
    },
    [prefs],
  );

  const hide = useCallback((tipId: string) => setPrefs(hideGuideTip(tipId)), []);
  const saveCustom = useCallback((tipId: string, text: string) => setPrefs(setCustomGuideTip(tipId, text)), []);
  const resetCustom = useCallback((tipId: string) => setPrefs(clearCustomGuideTip(tipId)), []);
  const resetAll = useCallback(() => setPrefs(resetAllGuideTips()), []);

  const value = useMemo(
    () => ({
      prefs,
      isVisible,
      getText,
      hide,
      saveCustom,
      resetCustom,
      resetAll,
      hiddenCount: prefs.hidden.length,
    }),
    [prefs, isVisible, getText, hide, saveCustom, resetCustom, resetAll],
  );

  return <GuideCtx.Provider value={value}>{children}</GuideCtx.Provider>;
}

export function useGuide() {
  const ctx = useContext(GuideCtx);
  if (!ctx) throw new Error("useGuide must be used within GuideProvider");
  return ctx;
}
