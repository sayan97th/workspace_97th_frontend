import React, { useRef, useState } from "react";
import { FilterIcon, SearchIcon } from "@/icons/workspace-icons";

export type ContentToolbarProps = {
  search_value: string;
  onSearchChange: (value: string) => void;
  /** Number of active filters; renders a count badge when greater than 0. */
  filter_count?: number;
  onToggleFilters?: () => void;
  /** Ref to the Filters button, for a caller-owned popover (e.g. `WorkspaceManageContentFilters`) to anchor to. */
  filters_button_ref?: React.Ref<HTMLButtonElement>;
  search_placeholder?: string;
};

const TOOLBAR_BUTTON_CLASS =
  "flex h-8 flex-none items-center gap-2 rounded-[4px] px-2 text-[14px] text-shell-text transition-colors hover:bg-shell-hover-strong";

/**
 * Toolbar for the content table, styled after monday.com's workspace Content
 * tab: "Search" and "Filters" read as plain ghost buttons. Clicking Search
 * turns it into a bordered field in place, and it folds back into the button
 * once it loses focus while empty.
 */
const ContentToolbar: React.FC<ContentToolbarProps> = ({
  search_value,
  onSearchChange,
  filter_count = 0,
  onToggleFilters,
  filters_button_ref,
  search_placeholder = "Search",
}) => {
  const [is_search_open, setIsSearchOpen] = useState(false);
  const search_input_ref = useRef<HTMLInputElement>(null);
  const is_search_expanded = is_search_open || search_value.length > 0;

  return (
    <div className="flex items-center gap-2">
      {is_search_expanded ? (
        <div className="flex h-8 w-[240px] flex-none items-center gap-2 rounded-[4px] border border-[var(--color-workspace-manage-accent)] bg-shell-panel px-2">
          <span className="flex flex-none text-shell-text-secondary">
            <SearchIcon size={16} />
          </span>
          <input
            ref={search_input_ref}
            type="text"
            autoFocus
            value={search_value}
            onChange={(event) => onSearchChange(event.target.value)}
            onBlur={() => setIsSearchOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onSearchChange("");
                search_input_ref.current?.blur();
              }
            }}
            placeholder={search_placeholder}
            aria-label={search_placeholder}
            className="min-w-0 flex-1 border-none bg-transparent p-0 text-[14px] text-shell-text outline-none placeholder:text-shell-text-faint"
          />
        </div>
      ) : (
        <button type="button" onClick={() => setIsSearchOpen(true)} className={TOOLBAR_BUTTON_CLASS}>
          <span className="flex flex-none text-shell-text">
            <SearchIcon size={16} />
          </span>
          Search
        </button>
      )}

      <button
        ref={filters_button_ref}
        type="button"
        onClick={onToggleFilters}
        className={`${TOOLBAR_BUTTON_CLASS} ${filter_count > 0 ? "bg-[var(--color-workspace-manage-selected)]" : ""}`}
      >
        <span className="flex flex-none text-shell-text">
          <FilterIcon size={16} />
        </span>
        Filters
        {filter_count > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-workspace-manage-accent)] px-1.5 text-[11px] font-semibold text-white">
            {filter_count}
          </span>
        )}
      </button>
    </div>
  );
};

export default ContentToolbar;
