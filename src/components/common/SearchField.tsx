"use client";
import React from "react";
import { CloseIcon, SearchIcon } from "@/icons/workspace-icons";

export type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
};

/**
 * Bordered search input (icon + text + clear button) shared by every "search this list"
 * affordance in the dark workspace shell — dropdown/dialog rails, member pickers, etc. —
 * so they all get the same focus ring and clear-button behavior.
 */
const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = "Search",
  className = "",
  autoFocus,
}) => {
  const [is_focused, setIsFocused] = React.useState(false);

  return (
    <div
      className={`flex h-[36px] items-center gap-2 rounded-[9px] border bg-shell-hover px-[11px] transition-colors ${className}`}
      style={{ borderColor: is_focused ? "var(--color-brand-500)" : "var(--color-shell-border-strong)" }}
    >
      <span className="flex flex-none items-center text-shell-text-faint">
        <SearchIcon size={14} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-shell-text placeholder:text-shell-text-faint focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex flex-none items-center text-shell-text-faint hover:text-shell-text"
        >
          <CloseIcon size={12} />
        </button>
      ) : null}
    </div>
  );
};

export default SearchField;
