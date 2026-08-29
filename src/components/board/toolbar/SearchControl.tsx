"use client";
import React, { useRef } from "react";
import { SearchIcon } from "@/icons/workspace-icons";
import { CheckIcon, CloseIcon, TuneIcon } from "@/icons/board-icons";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ToolbarButton from "./ToolbarButton";

export type SearchControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Compact width when idle; expands while focused or the search-columns panel is open. Matches the Client Hub design spec. */
const SEARCH_WIDTH_COLLAPSED = "w-[230px]";
const SEARCH_WIDTH_EXPANDED = "w-[360px]";

function SearchControl<TRow>({ toolbar }: SearchControlProps<TRow>) {
  const tune_button_ref = useRef<HTMLButtonElement>(null);
  const is_columns_panel_open = toolbar.active_panel === "search_columns";
  const all_selected = toolbar.search_column_ids.length === toolbar.columns.length;
  const is_expanded = toolbar.is_search_focused || is_columns_panel_open;

  if (!toolbar.is_search_open) {
    return (
      <ToolbarButton
        label="Search"
        Icon={SearchIcon}
        onClick={toolbar.openSearch}
      />
    );
  }

  return (
    <div
      className={`flex h-[34px] flex-none items-center gap-2 rounded-lg border px-3 transition-[width,border-color] duration-200 ease-out ${
        is_expanded ? "border-boardtree-border bg-boardtree-hover-strong" : "border-boardtree-border-soft bg-boardtree-hover"
      } ${is_expanded ? SEARCH_WIDTH_EXPANDED : SEARCH_WIDTH_COLLAPSED}`}
    >
      <span className="flex flex-none text-boardtree-text-muted">
        <SearchIcon />
      </span>
      <input
        autoFocus
        type="text"
        value={toolbar.search_query}
        onChange={(event) => toolbar.setSearchQuery(event.target.value)}
        onFocus={toolbar.focusSearch}
        onBlur={toolbar.blurSearch}
        onKeyDown={(event) => {
          if (event.key === "Escape") toolbar.closeSearch();
        }}
        placeholder="Search this board..."
        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-boardtree-text placeholder:text-boardtree-text-muted focus:outline-none"
      />
      <button
        ref={tune_button_ref}
        type="button"
        onClick={() => toolbar.togglePanel("search_columns")}
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-md transition-colors ${
          is_columns_panel_open ? "bg-boardtree-hover-strong text-boardtree-text" : "text-boardtree-text-muted hover:bg-boardtree-hover-strong"
        }`}
        aria-label="Choose columns to search"
      >
        <TuneIcon />
      </button>
      <button
        type="button"
        onClick={toolbar.closeSearch}
        className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-boardtree-text-muted hover:bg-boardtree-hover-strong"
        aria-label="Close search"
      >
        <CloseIcon size={11} />
      </button>

      <BoardPopover
        anchor_el={tune_button_ref.current}
        is_open={is_columns_panel_open}
        onClose={toolbar.closePanel}
        width={260}
      >
        <div className="border-b border-boardtree-border-soft px-4 pb-3 pt-3.5 text-[14px] font-bold text-boardtree-text">
          Choose columns to search
        </div>
        <div className="p-3">
          <input
            type="text"
            placeholder="Find a column"
            className="mb-2 w-full rounded-lg border border-boardtree-border-soft bg-boardtree-hover px-3 py-1.5 text-[13px] text-boardtree-text placeholder:text-boardtree-text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={() => toolbar.setAllSearchColumns(!all_selected)}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] font-semibold text-boardtree-text-secondary hover:bg-boardtree-hover"
          >
            <span className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  all_selected ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"
                }`}
              >
                {all_selected && <CheckIcon size={10} className="text-white" />}
              </span>
              All columns
            </span>
            <span className="text-[12px] font-medium text-boardtree-text-muted">
              {toolbar.search_column_ids.length} selected
            </span>
          </button>
          <div className="mt-1 max-h-[220px] overflow-y-auto">
            {toolbar.columns.map((column) => {
              const is_checked = toolbar.search_column_ids.includes(column.id);
              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => toolbar.toggleSearchColumnId(column.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 pl-6 text-[13px] text-boardtree-text-secondary hover:bg-boardtree-hover"
                >
                  <span
                    className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
                      is_checked ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"
                    }`}
                  >
                    {is_checked && <CheckIcon size={10} className="text-white" />}
                  </span>
                  <span className="truncate">{column.label || column.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      </BoardPopover>
    </div>
  );
}

export default SearchControl;
