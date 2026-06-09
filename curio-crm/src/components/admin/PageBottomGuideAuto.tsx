import { BookOpen, MessageCircle, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getKnowledgeArticle } from "../../../shared/crmKnowledgeGraph";
import { getPageTutorial, type GuideBlock } from "../../../shared/crmPageTutorials";
import { autoLinkText } from "../../../shared/crmWiki";
import { findNavLabel, findPageSubtitle } from "./adminNavConfig";
import { WikiRichMessage } from "./knowme/WikiRichMessage";
import {
  dismissBottomGuide,
  isBottomGuideDismissed,
  restoreBottomGuide,
} from "../../lib/pageGuidePrefs";

function linkify(text: string): string {
  return autoLinkText(text.trim());
}

function GuideField({
  label,
  text,
  onTermClick,
}: {
  label: string;
  text: string;
  onTermClick: (termId: string) => void;
}) {
  if (!text.trim()) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700/80">{label}</p>
      <WikiRichMessage text={linkify(text)} onTermClick={(id) => onTermClick(id)} className="text-slate-600" />
    </div>
  );
}

function GuideBlockCard({
  block,
  onTermClick,
}: {
  block: GuideBlock;
  onTermClick: (termId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-4 text-sm">
      <h3 className="font-semibold text-slate-800">{block.title}</h3>
      <GuideField label="What this is" text={block.what} onTermClick={onTermClick} />
      <GuideField label="What to do" text={block.how} onTermClick={onTermClick} />
      {block.when ? <GuideField label="When to use it" text={block.when} onTermClick={onTermClick} /> : null}
      {block.detail ? <GuideField label="More detail" text={block.detail} onTermClick={onTermClick} /> : null}
    </div>
  );
}

/** Auto bottom guide on every admin page — dismissible with reopen bubble. */
export function PageBottomGuideAuto() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => isBottomGuideDismissed(pathname));
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDismissed(isBottomGuideDismissed(pathname));
    setExpanded(false);
  }, [pathname]);

  const tutorial = getPageTutorial(pathname);
  const label = findNavLabel(pathname);
  const subtitle = findPageSubtitle(pathname);
  const summary = useMemo(() => {
    const raw = tutorial?.firstDaySummary ?? subtitle ?? `${label} is part of your CurioCRM back office.`;
    return linkify(raw);
  }, [tutorial, subtitle, label]);
  const blocks = tutorial?.blocks ?? [];

  const onTermClick = useCallback(
    (termId: string) => {
      const article = getKnowledgeArticle(termId);
      if (article?.path && article.path !== pathname) navigate(article.path);
    },
    [navigate, pathname],
  );

  const onDismiss = () => {
    dismissBottomGuide(pathname);
    setDismissed(true);
    setExpanded(false);
  };

  const onRestore = () => {
    restoreBottomGuide(pathname);
    setDismissed(false);
    setExpanded(true);
  };

  if (dismissed && !expanded) {
    return (
      <button
        type="button"
        onClick={onRestore}
        title="Reopen page guide"
        className="fixed bottom-24 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-900/30 transition hover:scale-105 hover:bg-teal-500"
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="relative mt-8 rounded-xl border border-teal-100/80 bg-gradient-to-b from-teal-50/50 to-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
            <BookOpen size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">{tutorial?.title ?? label} — living guide</h2>
            <WikiRichMessage text={summary} onTermClick={onTermClick} className="mt-2 max-w-4xl text-slate-600" />
            <p className="mt-2 text-xs text-slate-500">
              Blue links jump to related screens — like a mini encyclopedia inside the CRM.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          title="Dismiss guide on this page"
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          <X size={16} />
        </button>
      </div>
      {blocks.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {blocks.map((b, i) => (
            <GuideBlockCard key={b.title + i} block={b} onTermClick={onTermClick} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
