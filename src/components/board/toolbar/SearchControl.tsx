"use client";
import React, { useEffect, useRef, useState } from "react";
import { ClockIcon, SearchIcon } from "@/icons/workspace-icons";
import { CheckIcon, CloseIcon, TuneIcon } from "@/icons/board-icons";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ToolbarButton from "./ToolbarButton";
import ToggleSwitch from "./ToggleSwitch";
import { clearRecentSearches, readRecentSearches, rememberSearch } from "./recentSearches";

export type SearchControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** How long a query has to stay unchanged before it is remembered as a recent search. */
const REMEMBER_DELAY_MS = 1500;

/** A checkbox row of the search options panel. */
function CheckRow({ is_checked, label, onClick, className = "" }: { is_checked: boolean; label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-boardtree-text-secondary hover:bg-boardtree-hover ${className}`}
    >
      <span
        className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
          is_checked ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"
        }`}
      >
        {is_checked && <CheckIcon size={10} className="text-white" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Compact width when idle; expands while focused or the search-columns panel is open. Matches the Client Hub design spec. */
const SEARCH_WIDTH_COLLAPSED = "w-[230px]";
const SEARCH_WIDTH_EXPANDED = "w-[360px]";

function SearchControl<TRow>({ toolbar }: SearchControlProps<TRow>) {
  const tune_button_ref = useRef<HTMLButtonElement>(null);
  const is_columns_panel_open = toolbar.active_panel === "search_columns";
  const all_selected = toolbar.search_column_ids.length === toolbar.columns.length;
  const is_expanded = toolbar.is_search_focused || is_columns_panel_open;
  const [column_query, setColumnQuery] = useState("");
  const storage_key = toolbar.recent_search_storage_key;
  const [recent_searches, setRecentSearches] = useState<string[]>([]);
  const search_query = toolbar.search_query;

  useEffect(() => {
    if (storage_key) setRecentSearches(readRecentSearches(storage_key));
  }, [storage_key]);

  // A query that stays put for a moment is a real search, worth remembering.
  useEffect(() => {
    if (!storage_key || !search_query.trim()) return;
    const timeout = window.setTimeout(() => setRecentSearches(rememberSearch(storage_key, search_query)), REMEMBER_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [storage_key, search_query]);

  const is_recent_shown = !!storage_key && toolbar.is_search_focused && !search_query && recent_searches.length > 0;
  const trimmed_column_query = column_query.trim().toLowerCase();
  const visible_columns = toolbar.columns.filter(
    (column) => !trimmed_column_query || (column.label || column.id).toLowerCase().includes(trimmed_column_query)
  );
  const has_scope_options = !!toolbar.getSubRows || !!toolbar.can_search_updates;

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
      className={`relative flex h-[34px] flex-none items-center gap-2 rounded-lg border px-3 transition-[width,border-color] duration-200 ease-out ${
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
          else if (event.key === "Enter") {
            event.preventDefault();
            if (event.shiftKey) toolbar.prevMatch();
            else toolbar.nextMatch();
          }
        }}
        placeholder="Search this board..."
        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-boardtree-text placeholder:text-boardtree-text-muted focus:outline-none"
      />
      {toolbar.search_query && (
        <div className="flex flex-none items-center gap-0.5">
          <span className="px-1 font-mono text-[11.5px] text-boardtree-text-muted">
            {toolbar.search_matches.length ? `${toolbar.active_match_index + 1} of ${toolbar.search_matches.length}` : "0 of 0"}
          </span>
          <button
            type="button"
            onClick={toolbar.prevMatch}
            disabled={!toolbar.search_matches.length}
            aria-label="Previous match"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-boardtree-text-muted hover:bg-boardtree-hover-strong disabled:opacity-40"
          >
            <svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 7.5 L6 4.5 L9 7.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            onClick={toolbar.nextMatch}
            disabled={!toolbar.search_matches.length}
            aria-label="Next match"
            className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-boardtree-text-muted hover:bg-boardtree-hover-strong disabled:opacity-40"
          >
            <svg viewBox="0 0 12 12" width="10" height="10"><path d="M3 4.5 L6 7.5 L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
      <button
        ref={tune_button_ref}
        type="button"
        onClick={() => toolbar.togglePanel("search_columns")}
        className={`flex h-6 w-6 flex-none items-center justify-center rounded-md transition-colors ${
          is_columns_panel_open ? "bg-boardtree-hover-strong text-boardtree-text" : "text-boardtree-text-muted hover:bg-boardtree-hover-strong"
        }`}
        aria-label="Search options"
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

      {is_recent_shown && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[210] w-full rounded-[9px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between px-2 pb-1 pt-0.5">
            <span className="text-[11.5px] font-semibold text-boardtree-text-faint">Recent searches</span>
            <button
              type="button"
              // Keeps the input focused, so the list doesn't close before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                clearRecentSearches(storage_key!);
                setRecentSearches([]);
              }}
              className="text-[12px] font-medium text-boardtree-text-faint hover:text-boardtree-text"
            >
              Clear
            </button>
          </div>
          {recent_searches.map((entry) => (
            <button
              key={entry}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => toolbar.setSearchQuery(entry)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover"
            >
              <span className="flex flex-none text-boardtree-text-faint">
                <ClockIcon size={13} />
              </span>
              <span className="truncate">{entry}</span>
            </button>
          ))}
        </div>
      )}

      <BoardPopover
        anchor_el={tune_button_ref.current}
        is_open={is_columns_panel_open}
        onClose={() => {
          toolbar.closePanel();
          setColumnQuery("");
        }}
        width={280}
      >
        {has_scope_options && (
          <div className="border-b border-boardtree-border-soft px-3 pb-2.5 pt-3">
            <p className="px-2 pb-1.5 text-[14px] font-bold text-boardtree-text">Also search in</p>
            {toolbar.getSubRows && (
              <button
                type="button"
                onClick={() => toolbar.setSearchIncludeSubitems(!toolbar.search_include_subitems)}
                aria-pressed={toolbar.search_include_subitems}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-boardtree-text-secondary hover:bg-boardtree-hover"
              >
                Subitems
                <ToggleSwitch is_on={toolbar.search_include_subitems} size="sm" />
              </button>
            )}
            {toolbar.can_search_updates && (
              <button
                type="button"
                onClick={() => toolbar.setSearchIncludeUpdates(!toolbar.search_include_updates)}
                aria-pressed={toolbar.search_include_updates}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[13px] text-boardtree-text-secondary hover:bg-boardtree-hover"
              >
                Updates and replies
                <ToggleSwitch is_on={toolbar.search_include_updates} size="sm" />
              </button>
            )}
          </div>
        )}
        <div className="border-b border-boardtree-border-soft px-4 pb-3 pt-3.5 text-[14px] font-bold text-boardtree-text">
          Choose columns to search
        </div>
        <div className="p-3">
          <input
            type="text"
            value={column_query}
            onChange={(event) => setColumnQuery(event.target.value)}
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
            {visible_columns.map((column) => (
              <CheckRow
                key={column.id}
                is_checked={toolbar.search_column_ids.includes(column.id)}
                label={column.label || column.id}
                onClick={() => toolbar.toggleSearchColumnId(column.id)}
                className="pl-6"
              />
            ))}
            {visible_columns.length === 0 && (
              <p className="px-2 py-1.5 text-[12.5px] text-boardtree-text-muted">No columns match.</p>
            )}
          </div>
        </div>
      </BoardPopover>
    </div>
  );
}

export default SearchControl;
