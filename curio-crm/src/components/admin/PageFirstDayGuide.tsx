import { Check, Sparkles, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPageTutorial } from "../../../shared/crmPageTutorials";
import { findNavLabel, findPageSubtitle } from "./adminNavConfig";
import { isWalkthroughUnderstood, markWalkthroughUnderstood } from "../../lib/pageGuidePrefs";

export function PageFirstDayGuide() {
  const { pathname } = useLocation();
  const [understood, setUnderstood] = useState(() => isWalkthroughUnderstood(pathname));
  const tutorial = getPageTutorial(pathname);
  const label = findNavLabel(pathname);
  const subtitle = findPageSubtitle(pathname);

  useEffect(() => {
    setUnderstood(isWalkthroughUnderstood(pathname));
  }, [pathname]);

  const title = tutorial?.title ?? label;
  const summary =
    tutorial?.firstDaySummary ??
    subtitle ??
    "This screen is part of your daily CRM workflow.";

  const blocks = useMemo(
    () =>
      tutorial?.blocks ?? [
        {
          title: label,
          what: subtitle ?? "Use the sidebar zones — Users, Money, Agents, Marketing, Systems.",
          how: "Read labels on this page, then try one safe action (search, filter, or view).",
          when: "First day on the desk or when training someone new.",
        },
      ],
    [tutorial?.blocks, label, subtitle],
  );

  if (understood) return null;

  const dismiss = () => {
    markWalkthroughUnderstood(pathname);
    setUnderstood(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-teal-500/30 bg-gradient-to-br from-[#0c1017] via-slate-900 to-teal-950/40 shadow-2xl shadow-teal-900/20"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walkthrough-title"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-teal-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-950 transition hover:bg-teal-400"
        >
          <Check size={14} />
          Understood
        </button>

        <div className="border-b border-teal-500/20 px-5 pb-4 pt-5 pr-28">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 ring-1 ring-teal-500/30">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-400">First visit walkthrough</p>
              <h2 id="walkthrough-title" className="mt-1 text-xl font-semibold text-white">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{summary}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          {blocks.map((b, i) => (
            <div
              key={b.title + i}
              className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 text-sm leading-relaxed text-slate-300"
            >
              <h3 className="font-semibold text-teal-200">{b.title}</h3>
              <p className="mt-2">
                <span className="font-medium text-white">What: </span>
                {b.what}
              </p>
              <p className="mt-1.5">
                <span className="font-medium text-white">How: </span>
                {b.how}
              </p>
              {b.when ? (
                <p className="mt-1.5">
                  <span className="font-medium text-white">Why it matters: </span>
                  {b.when}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
          <p className="text-xs text-slate-500">A living guide stays at the bottom after you continue.</p>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-teal-500/40 hover:text-white"
          >
            <X size={14} />
            Skip to page
          </button>
        </div>
      </div>
    </div>
  );
}
