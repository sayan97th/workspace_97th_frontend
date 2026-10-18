"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import useRecentBoards from "@/hooks/useRecentBoards";
import { useShortcutLabel } from "@/hooks/useShortcutLabel";
import { onShellPanelOpen, openSearchEverything } from "./shell-events";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import GlobalSearchOptionRow from "@/components/global-search/GlobalSearchOptionRow";
import {
  buildRecentOptions,
  buildSearchOptions,
  SECTION_LABELS,
  SECTION_ORDER,
  type SearchOption,
} from "@/components/global-search/searchOptions";
import { AlertCircleIcon, ArrowRightIcon, CloseIcon, SearchIcon } from "@/icons/workspace-icons";
import { GLOBAL_SEARCH_MIN_LENGTH } from "@/types/search";
import "@/components/global-search/global-search.scss";

type StatusMessage = {
  title: string;
  text: string;
  tone?: "error";
  show_scopes?: boolean;
};

const SEARCH_SCOPES = ["Boards", "Docs", "Items", "Workspaces"];
const SKELETON_ROWS = [62, 48, 70];

const formatVisit = (iso: string): string => {
  const visited_at = new Date(iso);
  return Number.isNaN(visited_at.getTime()) ? "" : formatDistanceToNow(visited_at, { addSuffix: true });
};

/**
 * The top bar's "Search for anything..." box. A typeahead over boards, docs,
 * items and workspaces backed by `GET /api/search` (see `useGlobalSearch`),
 * which suggests recently visited boards before the user types.
 * Implements the ARIA combobox pattern: arrow keys move through the results,
 * Enter opens the highlighted one, Escape closes, and Ctrl/Cmd+K focuses the
 * box from anywhere in the app. Styles live in `global-search.scss`.
 */
const GlobalSearch: React.FC = () => {
  const router = useRouter();
  const { query, setQuery, resetSearch, results, result_count, searched_query, is_searchable, is_loading, has_error } =
    useGlobalSearch();
  const [is_open, setIsOpen] = useState(false);
  const [active_index, setActiveIndex] = useState(0);
  const container_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);
  const list_id = useId();
  const shortcut_label = useShortcutLabel();

  const trimmed_query = query.trim();
  const is_query_empty = trimmed_query === "";
  const { boards: recent_boards, is_loading: is_recent_loading } = useRecentBoards(is_open && is_query_empty);

  const options = useMemo(
    () => (is_query_empty ? buildRecentOptions(recent_boards, formatVisit) : buildSearchOptions(results)),
    [is_query_empty, recent_boards, results]
  );
  const has_options = options.length > 0;
  // Results can shrink between responses, so clamp instead of resetting in an effect.
  const safe_active_index = options.length === 0 ? -1 : Math.min(active_index, options.length - 1);
  const getOptionId = (index: number) => `${list_id}-option-${index}`;
  const active_option_id = safe_active_index >= 0 ? getOptionId(safe_active_index) : undefined;

  const has_current_results = searched_query === trimmed_query && !has_error;
  const is_empty_result = is_searchable && !is_loading && has_current_results && result_count === 0;

  // Ctrl/Cmd+K focuses the box from anywhere.
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input_ref.current?.focus();
        input_ref.current?.select();
        setIsOpen(true);
      }
    };
    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  // Pages (Home's "Search everything") can ask the box to take focus.
  useEffect(
    () =>
      onShellPanelOpen((panel) => {
        if (panel !== "search") return;
        input_ref.current?.focus();
        setIsOpen(true);
      }),
    []
  );

  // Close when the user clicks anywhere outside the box and its dropdown.
  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [is_open]);

  // Keep the highlighted option visible while arrowing through a long list.
  useEffect(() => {
    if (active_option_id) document.getElementById(active_option_id)?.scrollIntoView({ block: "nearest" });
  }, [active_option_id]);

  const handleQueryChange = (next_query: string) => {
    setQuery(next_query);
    setActiveIndex(0);
    setIsOpen(true);
  };

  const closeAndReset = () => {
    setIsOpen(false);
    resetSearch();
    setActiveIndex(0);
    input_ref.current?.blur();
  };

  const selectOption = (option: SearchOption) => {
    router.push(option.href);
    closeAndReset();
  };

  /** Hands the typed query over to the full "Search Everything" dialog. */
  const openFullSearch = () => {
    openSearchEverything({ query: trimmed_query, tab: "all" });
    closeAndReset();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setIsOpen(true);
        if (options.length > 0) setActiveIndex((safe_active_index + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setIsOpen(true);
        if (options.length > 0) setActiveIndex((safe_active_index - 1 + options.length) % options.length);
        break;
      case "Enter":
        if (is_open && safe_active_index >= 0) {
          event.preventDefault();
          selectOption(options[safe_active_index]);
        } else if (!is_query_empty) {
          event.preventDefault();
          openFullSearch();
        }
        break;
      case "Escape":
        event.preventDefault();
        if (is_open && query !== "") {
          setIsOpen(false);
        } else {
          closeAndReset();
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  const resolveStatusMessage = (): StatusMessage | null => {
    if (is_query_empty) {
      if (has_options || is_recent_loading) return null;
      return {
        title: "Search across your account",
        text: "Find boards, docs, items and workspaces by name.",
        show_scopes: true,
      };
    }
    if (!is_searchable) {
      return {
        title: "Keep typing",
        text: `Type at least ${GLOBAL_SEARCH_MIN_LENGTH} characters to see results.`,
      };
    }
    if (has_error) {
      return {
        title: "Search is unavailable right now",
        text: "Something went wrong on our side. Please try again in a moment.",
        tone: "error",
      };
    }
    if (is_empty_result) {
      return {
        title: `No results for "${trimmed_query}"`,
        text: "Check the spelling, or open Search Everything to also look through updates, files and people.",
      };
    }
    return null;
  };

  const status_message = resolveStatusMessage();
  const is_first_search = !is_query_empty && is_searchable && !has_options && !status_message;
  const is_recent_first_load = is_query_empty && !has_options && is_recent_loading;
  const show_skeleton = is_first_search || is_recent_first_load;

  return (
    <div ref={container_ref} className="global-search">
      <div className="global-search__field">
        <span className="global-search__field-icon">
          <SearchIcon size={16} />
        </span>
        <input
          ref={input_ref}
          type="text"
          role="combobox"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search for anything..."
          maxLength={100}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search for anything"
          aria-expanded={is_open && has_options}
          aria-controls={is_open && has_options ? list_id : undefined}
          aria-autocomplete="list"
          aria-activedescendant={is_open && has_options ? active_option_id : undefined}
          className="global-search__input"
        />
        {is_loading ? (
          <span className="global-search__spinner" aria-hidden="true" />
        ) : query ? (
          <PortalTooltip content="Clear search" placement="bottom">
            <button
              type="button"
              onClick={() => {
                resetSearch();
                setActiveIndex(0);
                input_ref.current?.focus();
              }}
              aria-label="Clear search"
              className="global-search__clear"
            >
              <CloseIcon size={12} />
            </button>
          </PortalTooltip>
        ) : (
          <PortalTooltip content={`Press ${shortcut_label} to search from anywhere`} placement="bottom">
            <kbd className="global-search__kbd global-search__shortcut">{shortcut_label}</kbd>
          </PortalTooltip>
        )}
      </div>

      {is_open && (
        <div className="global-search__panel">
          <div className="global-search__scroll shell-scrollbar">
            {status_message && (
              <div className="global-search__message">
                <span className="global-search__message-icon" data-tone={status_message.tone}>
                  {status_message.tone === "error" ? <AlertCircleIcon size={18} /> : <SearchIcon size={18} />}
                </span>
                <p className="global-search__message-title">{status_message.title}</p>
                <p className="global-search__message-text">{status_message.text}</p>
                {status_message.show_scopes && (
                  <div className="global-search__scopes">
                    {SEARCH_SCOPES.map((scope) => (
                      <span key={scope} className="global-search__scope">
                        {scope}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {show_skeleton && (
              <div aria-hidden="true">
                {SKELETON_ROWS.map((width) => (
                  <div key={width} className="global-search__skeleton">
                    <span className="global-search__skeleton-bar" data-shape="icon" />
                    <span className="flex flex-1 flex-col gap-1.5">
                      <span className="global-search__skeleton-bar" style={{ width: `${width}%` }} />
                      <span className="global-search__skeleton-bar" style={{ width: `${width / 2}%`, height: 8 }} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            {has_options && (
              <div id={list_id} role="listbox" aria-label={is_query_empty ? "Recently visited" : "Search results"}>
                {SECTION_ORDER.map((section) => {
                  const section_options = options.filter((option) => option.section === section);
                  if (section_options.length === 0) return null;

                  return (
                    <div
                      key={section}
                      role="group"
                      aria-label={SECTION_LABELS[section]}
                      className="global-search__section"
                      data-stale={is_loading || undefined}
                    >
                      <div className="global-search__section-header" aria-hidden="true">
                        <span>{SECTION_LABELS[section]}</span>
                        {section !== "recent" && (
                          <span className="global-search__section-count">{section_options.length}</span>
                        )}
                      </div>
                      {section_options.map((option) => {
                        const option_index = options.indexOf(option);
                        return (
                          <GlobalSearchOptionRow
                            key={option.key}
                            option={option}
                            option_id={getOptionId(option_index)}
                            term={trimmed_query}
                            is_active={option_index === safe_active_index}
                            onSelect={() => selectOption(option)}
                            onHover={() => setActiveIndex(option_index)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="global-search__footer">
            <button
              type="button"
              // Keep focus on the input so the click doesn't blur and close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={openFullSearch}
              className="global-search__see-all"
            >
              <SearchIcon size={14} className="flex-none" />
              <span>{is_query_empty ? "Open Search Everything" : `See all results for "${trimmed_query}"`}</span>
              <ArrowRightIcon size={14} className="flex-none" />
            </button>
            <div className="global-search__legend" aria-hidden="true">
              <span className="global-search__legend-entry">
                <kbd className="global-search__kbd">↑</kbd>
                <kbd className="global-search__kbd">↓</kbd>
                Navigate
              </span>
              <span className="global-search__legend-entry">
                <kbd className="global-search__kbd">↵</kbd>
                Open
              </span>
              <span className="global-search__legend-entry">
                <kbd className="global-search__kbd">Esc</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {is_open && is_searchable && !is_loading && has_current_results
          ? `${result_count} ${result_count === 1 ? "result" : "results"} found`
          : ""}
      </div>
    </div>
  );
};

export default GlobalSearch;
