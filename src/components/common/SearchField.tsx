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
      className={`flex h-[36px] items-center gap-2 rounded-[9px] border bg-[#142020] px-[11px] transition-colors ${className}`}
      style={{ borderColor: is_focused ? "var(--color-brand-500)" : "rgba(255,255,255,0.10)" }}
    >
      <span className="flex flex-none items-center text-[#7e8889]">
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
        className="min-w-0 flex-1 bg-transparent text-[13px] text-[#e9eded] placeholder:text-[#7e8889] focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex flex-none items-center text-[#7e8889] hover:text-[#e9eded]"
        >
          <CloseIcon size={12} />
        </button>
      ) : null}
    </div>
  );
};

export default SearchField;
