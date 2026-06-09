import React, { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CRM_COUNTRIES, CRM_PRIORITY_COUNTRIES } from "../../lib/crmCountries";
import { inputCls } from "./CrmShell";

type Props = {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
  searchable?: boolean;
};

export function CountrySelect({
  value,
  onChange,
  className,
  disabled,
  placeholder = "Select country…",
  allowEmpty = true,
  searchable = true,
}: Props) {
  const [query, setQuery] = useState("");
  const priorityCodes = new Set(CRM_PRIORITY_COUNTRIES.map((c) => c.code));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = CRM_COUNTRIES;
    if (!q) return all;
    return all.filter(
      (c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (q === "uk" && c.code === "GB"),
    );
  }, [query]);

  const filteredPriority = filtered.filter((c) => priorityCodes.has(c.code));
  const filteredRest = filtered.filter((c) => !priorityCodes.has(c.code));

  const selectCls =
    className ??
    `${inputCls} mt-1 w-full appearance-none bg-white py-2 pl-3 pr-9 text-sm text-slate-800`;

  return (
    <div className="mt-1 space-y-1">
      {searchable ? (
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search countries…"
            className={`${inputCls} w-full py-1.5 pl-8 text-xs`}
            aria-label="Search countries"
          />
        </div>
      ) : null}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={selectCls}
          aria-label="Country"
        >
          {allowEmpty ? <option value="">{placeholder}</option> : null}
          {filteredPriority.length > 0 ? (
            <optgroup label="Common">
              {filteredPriority.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {filteredRest.length > 0 ? (
            <optgroup label={query.trim() ? "Matches" : "All countries"}>
              {filteredRest.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {filtered.length === 0 ? <option value="">No countries match</option> : null}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-teal-600"
          aria-hidden
        />
      </div>
      <p className="text-[10px] text-slate-400">Pick from the list — scroll or search, then select.</p>
    </div>
  );
}

/** Compact country picker for table rows — same full list, no search box. */
export function InlineCountrySelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const priorityCodes = new Set(CRM_PRIORITY_COUNTRIES.map((c) => c.code));
  const rest = CRM_COUNTRIES.filter((c) => !priorityCodes.has(c.code));

  return (
    <div className={`relative inline-block min-w-[150px] max-w-[180px] ${className ?? ""}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full cursor-pointer appearance-none rounded border py-1 pl-2 pr-7 text-xs focus:outline-none disabled:opacity-50 ${
          value
            ? "border-teal-300 bg-teal-50/40 font-medium text-slate-800 focus:border-teal-500"
            : "border-teal-400 bg-teal-50 font-medium text-teal-800 focus:border-teal-600"
        }`}
        aria-label="Country"
        title="Click to choose country"
      >
        <option value="">Select country…</option>
        <optgroup label="Common">
          {CRM_PRIORITY_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="All countries">
          {rest.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </optgroup>
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-teal-600"
        aria-hidden
      />
    </div>
  );
}
