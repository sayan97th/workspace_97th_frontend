import React, { useState } from "react";
import { FilterIcon, SearchIcon } from "@/icons/workspace-icons";

export type ContentToolbarProps = {
  search_value: string;
  onSearchChange: (value: string) => void;
  /** Number of active filters; renders a red count badge when greater than 0. */
  filter_count?: number;
  onToggleFilters?: () => void;
  /** Ref to the Filters button, for a caller-owned popover (e.g. `WorkspaceManageContentFilters`) to anchor to. */
  filters_button_ref?: React.Ref<HTMLButtonElement>;
  search_placeholder?: string;
};

/** Compact width when idle; expands while focused. Matches Client Hub's board search (`SearchControl`). */
const SEARCH_WIDTH_COLLAPSED = "w-[200px]";
const SEARCH_WIDTH_EXPANDED = "w-[320px]";

/**
 * Toolbar for the content table: a search field and a filters button.
 * (The design's "Cleanup mode" toggle is intentionally omitted.)
 *
 * The search field's styling mirrors Client Hub's board search
 * (`SearchControl`) for visual consistency across the app: a bordered pill
 * on the `shell-*` design tokens that widens and darkens while focused.
 */
const ContentToolbar: React.FC<ContentToolbarProps> = ({
  search_value,
  onSearchChange,
  filter_count = 0,
  onToggleFilters,
  filters_button_ref,
  search_placeholder = "Search",
}) => {
  const [is_search_focused, setIsSearchFocused] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <div
        className={`flex h-[34px] flex-none items-center gap-2 rounded-lg border px-3 transition-[width,border-color] duration-200 ease-out ${
          is_search_focused
            ? `border-shell-border-strong bg-shell-hover-strong ${SEARCH_WIDTH_EXPANDED}`
            : `border-shell-border bg-shell-hover ${SEARCH_WIDTH_COLLAPSED}`
        }`}
      >
        <span className="flex flex-none text-shell-text-muted">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={search_value}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder={search_placeholder}
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-[13.5px] text-shell-text outline-none placeholder:text-shell-text-muted"
        />
      </div>

      <button
        ref={filters_button_ref}
        type="button"
        onClick={onToggleFilters}
        className="flex items-center gap-2 rounded-[9px] px-3 py-2 transition-colors hover:bg-shell-hover"
      >
        <span className="flex flex-none text-shell-text-muted">
          <FilterIcon />
        </span>
        <span className="text-sm font-medium text-shell-text">Filters</span>
        {filter_count > 0 && (
          <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
            {filter_count}
          </span>
        )}
      </button>
    </div>
  );
};

export default ContentToolbar;
