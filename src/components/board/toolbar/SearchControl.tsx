"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClockIcon, SearchIcon } from "@/icons/workspace-icons";
import { CheckIcon, CloseIcon, TuneIcon } from "@/icons/board-icons";
import { FeedbackIcon } from "@/icons/board-options-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import GiveFeedbackModal from "../GiveFeedbackModal";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import ToolbarButton from "./ToolbarButton";
import ToggleSwitch from "./ToggleSwitch";
import type { ToolbarCheckboxState } from "./ToolbarCheckbox";
import { clearRecentSearches, readRecentSearches, rememberSearch } from "./recentSearches";
import "./filter-panel.css";
import "./toolbar-panel.css";
import "./search-control.scss";

export type SearchControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  /** Wires the panel's "Give feedback" button. Omit to hide it. */
  onSubmitFeedback?: (message: string) => Promise<void>;
};

/** How long a query has to stay unchanged before it is remembered as a recent search. */
const REMEMBER_DELAY_MS = 1500;

/** monday style checkbox drawn with the Filter panel tokens: blue when checked, a dash when partly checked. */
const PanelCheckbox: React.FC<{ state: ToolbarCheckboxState }> = ({ state }) => (
  <span className="filter-panel__checkbox" data-checked={state === "checked" ? "true" : state === "partial" ? "partial" : "false"} aria-hidden>
    {state === "checked" && <CheckIcon size={10} />}
    {state === "partial" && <span className="toolbar-panel__checkbox-dash" />}
  </span>
);

const ChevronGlyph: React.FC<{ direction: "up" | "down" }> = ({ direction }) => (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden>
    <path
      d={direction === "up" ? "M3 7.5 L6 4.5 L9 7.5" : "M3 4.5 L6 7.5 L9 4.5"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Board toolbar search, styled after monday.com: a "Search" button that opens a "Search this board" box with a
 * match counter and a tune button. The tune button opens the "Choose columns to search" panel, built on the same
 * `filter-panel.css` and `toolbar-panel.css` kit as the Hide panel. The box folds back into the button once it
 * loses focus while empty, like monday. Box styles live in `search-control.scss`.
 */
function SearchControl<TRow>({ toolbar, onSubmitFeedback }: SearchControlProps<TRow>) {
  const box_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);
  const [column_query, setColumnQuery] = useState("");
  const [is_feedback_open, setIsFeedbackOpen] = useState(false);
  const storage_key = toolbar.recent_search_storage_key;
  const [recent_searches, setRecentSearches] = useState<string[]>([]);
  const search_query = toolbar.search_query;
  const is_columns_panel_open = toolbar.active_panel === "search_columns";
  const is_expanded = toolbar.is_search_focused || is_columns_panel_open || !!search_query;

  useEffect(() => {
    if (storage_key) setRecentSearches(readRecentSearches(storage_key));
  }, [storage_key]);

  // A query that stays put for a moment is a real search, worth remembering.
  useEffect(() => {
    if (!storage_key || !search_query.trim()) return;
    const timeout = window.setTimeout(() => setRecentSearches(rememberSearch(storage_key, search_query)), REMEMBER_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [storage_key, search_query]);

  const column_ids = toolbar.columns.map((column) => column.id);
  // An empty selection searches every column (see `deriveBoardRows`), so it shows as all checked.
  const selected_ids = toolbar.search_column_ids.length ? column_ids.filter((id) => toolbar.search_column_ids.includes(id)) : column_ids;
  const selected_count = selected_ids.length;
  const master_state: ToolbarCheckboxState = selected_count === column_ids.length ? "checked" : "partial";
  const is_column_subset = master_state !== "checked";

  // At least one column is always searched, so unchecking "All columns" keeps the item name column.
  const toggleAllColumns = () => {
    if (master_state !== "checked") toolbar.setAllSearchColumns(true);
    else if (column_ids.length > 1) {
      toolbar.setAllSearchColumns(true);
      column_ids.slice(1).forEach((id) => toolbar.toggleSearchColumnId(id));
    }
  };

  const trimmed_column_query = column_query.trim();
  const visible_columns = toolbar.columns.filter((column) =>
    (column.full_label || column.label || column.id).toLowerCase().includes(trimmed_column_query.toLowerCase())
  );
  const has_scope_options = !!toolbar.getSubRows || !!toolbar.can_search_updates;
  const is_recent_shown = !!storage_key && toolbar.is_search_focused && !search_query && recent_searches.length > 0;

  const closeColumnsPanel = () => {
    toolbar.closePanel();
    setColumnQuery("");
    // The panel only closes from a click or key outside the box, so an empty search folds back into the button.
    if (!search_query) toolbar.closeSearch();
  };

  const clearQuery = () => {
    toolbar.setSearchQuery("");
    input_ref.current?.focus();
  };

  const openFeedback = () => {
    toolbar.closePanel();
    setColumnQuery("");
    setIsFeedbackOpen(true);
  };

  const feedback_modal =
    is_feedback_open && onSubmitFeedback && typeof document !== "undefined"
      ? createPortal(
          <GiveFeedbackModal
            is_open
            description="Tell us what is working, what is not, or what you would like to see when searching a board."
            onSubmit={(message) => onSubmitFeedback(`[Search] ${message}`)}
            onClose={() => setIsFeedbackOpen(false)}
          />,
          document.body
        )
      : null;

  // A saved view can bring its own query, the box then shows it instead of hiding an active search.
  if (!toolbar.is_search_open && !search_query) {
    return (
      <>
        <Tooltip content="Search this board" className="flex">
          <ToolbarButton label="Search" Icon={SearchIcon} onClick={toolbar.openSearch} />
        </Tooltip>
        {feedback_modal}
      </>
    );
  }

  return (
    <div ref={box_ref} className="board-search" data-expanded={is_expanded} role="search">
      <span className="board-search__icon">
        <SearchIcon size={16} />
      </span>
      <input
        ref={input_ref}
        autoFocus
        type="text"
        value={search_query}
        onChange={(event) => toolbar.setSearchQuery(event.target.value)}
        onFocus={toolbar.focusSearch}
        onBlur={(event) => {
          toolbar.blurSearch();
          const next_target = event.relatedTarget as Node | null;
          const is_inside_box = !!next_target && !!box_ref.current?.contains(next_target);
          if (!search_query && !is_columns_panel_open && !is_inside_box) toolbar.closeSearch();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") toolbar.closeSearch();
          else if (event.key === "Enter") {
            event.preventDefault();
            if (event.shiftKey) toolbar.prevMatch();
            else toolbar.nextMatch();
          }
        }}
        placeholder="Search this board"
        aria-label="Search this board"
        className="board-search__input"
      />

      {search_query && (
        <div className="board-search__matches">
          <span className="board-search__count" data-empty={toolbar.search_matches.length === 0} aria-live="polite">
            {toolbar.search_matches.length ? `${toolbar.active_match_index + 1} of ${toolbar.search_matches.length}` : "No results"}
          </span>
          <Tooltip content="Previous result" placement="bottom" className="flex">
            <button
              type="button"
              onClick={toolbar.prevMatch}
              disabled={!toolbar.search_matches.length}
              aria-label="Previous result"
              className="board-search__icon-button"
            >
              <ChevronGlyph direction="up" />
            </button>
          </Tooltip>
          <Tooltip content="Next result" placement="bottom" className="flex">
            <button
              type="button"
              onClick={toolbar.nextMatch}
              disabled={!toolbar.search_matches.length}
              aria-label="Next result"
              className="board-search__icon-button"
            >
              <ChevronGlyph direction="down" />
            </button>
          </Tooltip>
          <Tooltip content="Clear search" placement="bottom" className="flex">
            <button type="button" onClick={clearQuery} aria-label="Clear search" className="board-search__icon-button">
              <CloseIcon size={11} />
            </button>
          </Tooltip>
        </div>
      )}

      <Tooltip content="Choose columns to search" placement="bottom" disabled={is_columns_panel_open} className="flex">
        <button
          type="button"
          // Keeps the input focused, so the box does not fold away before the click lands.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (is_columns_panel_open) setColumnQuery("");
            toolbar.togglePanel("search_columns");
          }}
          aria-label="Choose columns to search"
          aria-expanded={is_columns_panel_open}
          aria-haspopup="dialog"
          data-active={is_column_subset}
          className="board-search__icon-button"
        >
          <TuneIcon />
        </button>
      </Tooltip>

      {is_recent_shown && (
        <div className="board-search__recent">
          <div className="board-search__recent-head">
            <span>Recent searches</span>
            <button
              type="button"
              // Keeps the input focused, so the list does not close before the click lands.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                clearRecentSearches(storage_key!);
                setRecentSearches([]);
              }}
              className="board-search__recent-clear"
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
              className="board-search__recent-row"
            >
              <ClockIcon size={14} />
              <span className="board-search__recent-label">{entry}</span>
            </button>
          ))}
        </div>
      )}

      <BoardPopover anchor_el={box_ref.current} is_open={is_columns_panel_open} onClose={closeColumnsPanel} width={340} align="start" unstyled>
        <div className="filter-panel toolbar-panel toolbar-panel--compact" role="dialog" aria-label="Choose columns to search">
          <div className="filter-panel__header">
            <h2 className="filter-panel__title">Choose columns to search</h2>
            {onSubmitFeedback && (
              <div className="filter-panel__header-actions">
                <Tooltip content="Give feedback" placement="bottom" className="flex">
                  <button type="button" onClick={openFeedback} className="filter-panel__icon-button" aria-label="Give feedback">
                    <FeedbackIcon size={16} />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>

          <label className="toolbar-panel__search">
            <SearchIcon size={15} />
            <input
              type="text"
              autoFocus
              value={column_query}
              onChange={(event) => setColumnQuery(event.target.value)}
              placeholder="Find a column"
              aria-label="Find a column"
            />
            {trimmed_column_query && (
              <button type="button" onClick={() => setColumnQuery("")} className="filter-panel__search-clear" aria-label="Clear column search">
                <CloseIcon size={11} />
              </button>
            )}
          </label>

          <div className="toolbar-panel__list filter-panel__scroll">
            {trimmed_column_query && visible_columns.length === 0 ? (
              <div className="toolbar-panel__empty">
                <SearchIcon size={22} />
                <span>No columns match &ldquo;{trimmed_column_query}&rdquo;</span>
              </div>
            ) : (
              <>
                {!trimmed_column_query && (
                  <>
                    <button
                      type="button"
                      onClick={toggleAllColumns}
                      className="toolbar-panel__check-row"
                      data-depth="0"
                      aria-pressed={master_state === "checked"}
                    >
                      <PanelCheckbox state={master_state} />
                      <span className="toolbar-panel__check-label" data-strong="true">
                        All columns
                      </span>
                      <span className="toolbar-panel__check-meta">{selected_count} selected</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleAllColumns}
                      className="toolbar-panel__check-row"
                      data-depth="0"
                      aria-pressed={master_state === "checked"}
                    >
                      <PanelCheckbox state={master_state} />
                      <span className="toolbar-panel__check-label" data-muted="true">
                        Item columns
                      </span>
                    </button>
                  </>
                )}
                {visible_columns.map((column) => {
                  const is_checked = selected_ids.includes(column.id);
                  const label = column.full_label || column.label || column.id || "Untitled column";
                  return (
                    <button
                      key={column.id}
                      type="button"
                      onClick={() => toolbar.toggleSearchColumnId(column.id)}
                      className="toolbar-panel__check-row"
                      data-depth={trimmed_column_query ? "0" : "1"}
                      aria-pressed={is_checked}
                      title={label}
                    >
                      <PanelCheckbox state={is_checked ? "checked" : "unchecked"} />
                      {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={20} />}
                      <span className="toolbar-panel__check-label">{label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {has_scope_options && (
            <div className="search-panel__scope">
              <p className="toolbar-panel__section-title">Also search in</p>
              {toolbar.getSubRows && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={toolbar.search_include_subitems}
                  onClick={() => toolbar.setSearchIncludeSubitems(!toolbar.search_include_subitems)}
                  className="toolbar-panel__check-row search-panel__toggle-row"
                >
                  <span className="toolbar-panel__check-label">Subitems</span>
                  <ToggleSwitch is_on={toolbar.search_include_subitems} size="sm" />
                </button>
              )}
              {toolbar.can_search_updates && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={toolbar.search_include_updates}
                  onClick={() => toolbar.setSearchIncludeUpdates(!toolbar.search_include_updates)}
                  className="toolbar-panel__check-row search-panel__toggle-row"
                >
                  <span className="toolbar-panel__check-label">Updates and replies</span>
                  <ToggleSwitch is_on={toolbar.search_include_updates} size="sm" />
                </button>
              )}
            </div>
          )}
        </div>
      </BoardPopover>

      {feedback_modal}
    </div>
  );
}

export default SearchControl;
