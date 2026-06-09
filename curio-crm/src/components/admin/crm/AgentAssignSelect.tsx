import React from "react";

type Props = {
  agents: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

/** Dropdown of desk agent names — same list as All Clients bulk assign. */
export function AgentAssignSelect(props: Props) {
  const {
    agents,
    value,
    onChange,
    disabled,
    className = "",
    placeholder = "Choose agent…",
    allowEmpty = true,
    emptyLabel = "— Unassigned —",
  } = props;

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={className || "w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800"}
      aria-label="Assign agent"
    >
      {allowEmpty ? (
        <option value="">{emptyLabel}</option>
      ) : (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {agents.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  );
}
