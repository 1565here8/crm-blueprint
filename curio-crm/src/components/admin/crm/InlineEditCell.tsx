import React, { useEffect, useState } from "react";
import { inputCls } from "../CrmShell";

type Props = {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  multiline?: boolean;
  title?: string;
  className?: string;
  onSave: (value: string) => void;
};

/** Inline editable cell — saves on blur or Enter. */
export function InlineEditCell({
  value,
  disabled,
  placeholder = "—",
  multiline,
  title,
  className,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const next = draft.trim();
    const prev = value.trim();
    if (next !== prev) onSave(next);
  };

  const cls = `${inputCls} min-w-[72px] max-w-[160px] py-0.5 text-xs ${className ?? ""}`;

  if (multiline) {
    return (
      <textarea
        rows={2}
        disabled={disabled}
        title={title ?? value}
        placeholder={placeholder}
        className={`${cls} max-w-[200px] resize-y`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
    );
  }

  return (
    <input
      type="text"
      disabled={disabled}
      title={title ?? value}
      placeholder={placeholder}
      className={cls}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
