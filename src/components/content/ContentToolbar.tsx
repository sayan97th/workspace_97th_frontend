import React from "react";
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

/**
 * Toolbar for the content table: a search field and a filters button.
 * (The design's "Cleanup mode" toggle is intentionally omitted.)
 */
const ContentToolbar: React.FC<ContentToolbarProps> = ({
  search_value,
  onSearchChange,
  filter_count = 0,
  onToggleFilters,
  filters_button_ref,
  search_placeholder = "Search",
}) => (
  <div className="flex items-center gap-1">
    <label className="flex items-center gap-2.5 rounded-[9px] px-3 py-2 transition-colors hover:bg-gray-100">
      <span className="flex flex-none text-gray-400">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={search_value}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={search_placeholder}
        className="w-[150px] border-none bg-transparent p-0 text-sm font-medium text-gray-700 outline-none placeholder:text-gray-400"
      />
    </label>

    <button
      ref={filters_button_ref}
      type="button"
      onClick={onToggleFilters}
      className="flex items-center gap-2 rounded-[9px] px-3 py-2 transition-colors hover:bg-gray-100"
    >
      <span className="flex flex-none text-gray-500">
        <FilterIcon />
      </span>
      <span className="text-sm font-medium text-gray-700">Filters</span>
      {filter_count > 0 && (
        <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-bold text-white">
          {filter_count}
        </span>
      )}
    </button>
  </div>
);

export default ContentToolbar;
