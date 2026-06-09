import React, { useMemo } from "react";
import { parseWikiSegments } from "../../../../shared/crmWiki";
import { curioni } from "../../../lib/curioniDesign";

type Props = {
  text: string;
  onTermClick?: (termId: string, label: string) => void;
  className?: string;
};

function WikiParagraph({ text, onTermClick }: { text: string; onTermClick?: Props["onTermClick"] }) {
  const segments = useMemo(() => parseWikiSegments(text), [text]);
  return (
    <p className="mb-3 last:mb-0">
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          <button
            key={`${seg.id}-${i}`}
            type="button"
            onClick={() => onTermClick?.(seg.id, seg.label)}
            className={`inline ${curioni.link}`}
            title={`Explain ${seg.label}`}
          >
            {seg.label}
          </button>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </p>
  );
}

/** Renders KNOWME / desk replies with Wikipedia-style linked paragraphs. */
export function WikiRichMessage({ text, onTermClick, className = "" }: Props) {
  const blocks = useMemo(() => {
    const raw = text.trim();
    if (!raw) return [];
    const parts = raw.split(/\n\n+/);
    const out: Array<{ kind: "heading" | "meta" | "para" | "seeAlso"; text: string }> = [];
    for (const part of parts) {
      const line = part.trim();
      if (!line) continue;
      if (/^see also:/i.test(line)) {
        out.push({ kind: "seeAlso", text: line.replace(/^see also:\s*/i, "") });
      } else if (/^route:/i.test(line)) {
        out.push({ kind: "meta", text: line });
      } else if (out.length === 0 && !line.includes("[[") && line.length < 80 && !line.startsWith("•")) {
        out.push({ kind: "heading", text: line });
      } else {
        out.push({ kind: "para", text: line });
      }
    }
    return out;
  }, [text]);

  return (
    <div className={`text-sm leading-relaxed text-slate-700 ${className}`}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <p key={i} className="mb-2 text-[15px] font-semibold text-slate-900">
              {block.text}
            </p>
          );
        }
        if (block.kind === "meta") {
          return (
            <p key={i} className="mb-3 font-mono text-[11px] text-slate-400">
              {block.text}
            </p>
          );
        }
        if (block.kind === "seeAlso") {
          return (
            <div key={i} className="mt-3 border-t border-slate-100 pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">See also</p>
              <WikiParagraph text={block.text} onTermClick={onTermClick} />
            </div>
          );
        }
        if (block.text.startsWith("**") && block.text.includes(":**")) {
          const cleaned = block.text.replace(/\*\*/g, "");
          return <WikiParagraph key={i} text={cleaned} onTermClick={onTermClick} />;
        }
        if (block.text.startsWith("•")) {
          return (
            <div key={i} className="mb-1.5 pl-1">
              <WikiParagraph text={block.text} onTermClick={onTermClick} />
            </div>
          );
        }
        return <WikiParagraph key={i} text={block.text} onTermClick={onTermClick} />;
      })}
    </div>
  );
}
