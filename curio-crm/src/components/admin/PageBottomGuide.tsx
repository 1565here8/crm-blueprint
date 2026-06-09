import React from "react";
import { BookOpen } from "lucide-react";
import { Panel } from "./CrmShell";

export type GuideBlock = {
  title: string;
  what: string;
  how: string;
  when?: string;
};

export function PageBottomGuide({
  heading = "Plain-English guide",
  intro,
  blocks,
}: {
  heading?: string;
  intro?: string;
  blocks: GuideBlock[];
}) {
  return (
    <Panel className="mt-8 border-teal-100 bg-gradient-to-b from-teal-50/40 to-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
          <BookOpen size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
          {intro ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{intro}</p> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {blocks.map((b) => (
          <div
            key={b.title}
            className="rounded-lg border border-slate-200/80 bg-white p-4 text-sm leading-relaxed text-slate-600"
          >
            <h3 className="font-semibold text-slate-800">{b.title}</h3>
            <p className="mt-2">
              <span className="font-medium text-slate-700">What it is: </span>
              {b.what}
            </p>
            <p className="mt-1.5">
              <span className="font-medium text-slate-700">How you use it: </span>
              {b.how}
            </p>
            {b.when ? (
              <p className="mt-1.5">
                <span className="font-medium text-slate-700">When to touch it: </span>
                {b.when}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}
