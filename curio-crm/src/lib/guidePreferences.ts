/** Per-browser guide tip prefs — hidden tips + custom edited text. */

const STORAGE_KEY = "curionilabs.guide.tips.v1";

export type GuideTipPrefs = {
  hidden: string[];
  custom: Record<string, string>;
};

function readRaw(): GuideTipPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hidden: [], custom: {} };
    const j = JSON.parse(raw) as GuideTipPrefs;
    return { hidden: j.hidden ?? [], custom: j.custom ?? {} };
  } catch {
    return { hidden: [], custom: {} };
  }
}

function writeRaw(prefs: GuideTipPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function loadGuideTipPrefs(): GuideTipPrefs {
  return readRaw();
}

export function isTipHidden(tipId: string, prefs: GuideTipPrefs): boolean {
  return prefs.hidden.includes(tipId);
}

export function getTipDisplayText(tipId: string, defaultText: string, prefs: GuideTipPrefs): string {
  return prefs.custom[tipId]?.trim() || defaultText;
}

export function hideGuideTip(tipId: string): GuideTipPrefs {
  const prefs = readRaw();
  if (!prefs.hidden.includes(tipId)) prefs.hidden.push(tipId);
  writeRaw(prefs);
  return prefs;
}

export function showGuideTip(tipId: string): GuideTipPrefs {
  const prefs = readRaw();
  prefs.hidden = prefs.hidden.filter((id) => id !== tipId);
  writeRaw(prefs);
  return prefs;
}

export function setCustomGuideTip(tipId: string, text: string): GuideTipPrefs {
  const prefs = readRaw();
  prefs.custom[tipId] = text.trim();
  prefs.hidden = prefs.hidden.filter((id) => id !== tipId);
  writeRaw(prefs);
  return prefs;
}

export function clearCustomGuideTip(tipId: string): GuideTipPrefs {
  const prefs = readRaw();
  delete prefs.custom[tipId];
  writeRaw(prefs);
  return prefs;
}

export function resetAllGuideTips(): GuideTipPrefs {
  const empty = { hidden: [], custom: {} };
  writeRaw(empty);
  return empty;
}

export function listHiddenTips(): string[] {
  return readRaw().hidden;
}
