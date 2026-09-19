"use client";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import WorkspaceBadge from "./WorkspaceBadge";
import { buildBoardPath, BOARD_ROUTE_BASE } from "@/components/workspace-nav/helpers";
import { buildWorkspaceManagePath } from "@/components/workspace-manage/tab-routing";
import {
  BoardGridIcon,
  CloseIcon,
  DashboardIcon,
  FileIcon,
  LockIcon,
  SearchIcon,
  WorkflowIcon,
  type IconComponent,
} from "@/icons/workspace-icons";
import { GLOBAL_SEARCH_MIN_LENGTH, type GlobalSearchResults, type SearchAssetType } from "@/types/search";

type SearchSection = "boards" | "items" | "workspaces";

type SearchOption = {
  key: string;
  section: SearchSection;
  href: string;
  label: string;
  secondary: string;
  leading: React.ReactNode;
  is_private?: boolean;
};

const SECTION_ORDER: SearchSection[] = ["boards", "items", "workspaces"];

const SECTION_LABELS: Record<SearchSection, string> = {
  boards: "Boards and docs",
  items: "Items",
  workspaces: "Workspaces",
};

const ASSET_TYPE_ICONS: Record<SearchAssetType, IconComponent> = {
  board: BoardGridIcon,
  doc: FileIcon,
  dashboard: DashboardIcon,
  workflow: WorkflowIcon,
};

const ASSET_TYPE_LABELS: Record<SearchAssetType, string> = {
  board: "Board",
  doc: "Doc",
  dashboard: "Dashboard",
  workflow: "Workflow",
};

const leading_box_class = "flex h-6 w-6 flex-none items-center justify-center text-shell-text-secondary";

/** Wraps the first case-insensitive occurrence of `term` in `text` so the match stands out. */
const HighlightedText: React.FC<{ text: string; term: string }> = ({ text, term }) => {
  const match_index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (match_index === -1) return <>{text}</>;

  const match_end = match_index + term.length;
  return (
    <>
      {text.slice(0, match_index)}
      <mark className="bg-transparent font-semibold text-brand-500">{text.slice(match_index, match_end)}</mark>
      {text.slice(match_end)}
    </>
  );
};

/** Flattens the grouped API payload into one ordered list, so keyboard navigation can walk every section. */
const buildSearchOptions = (results: GlobalSearchResults): SearchOption[] => {
  const boards: SearchOption[] = results.boards.map((board) => {
    const AssetIcon = ASSET_TYPE_ICONS[board.asset_type] ?? BoardGridIcon;
    const secondary_parts = [board.asset_type === "board" ? null : ASSET_TYPE_LABELS[board.asset_type], board.workspace.name];

    return {
      key: `board-${board.id}`,
      section: "boards",
      href: buildBoardPath(board.id),
      label: board.label,
      secondary: secondary_parts.filter(Boolean).join(" · "),
      leading: (
        <span className={leading_box_class}>
          <AssetIcon size={15} />
        </span>
      ),
      is_private: board.board_type === "private",
    };
  });

  const items: SearchOption[] = results.items.map((item) => ({
    key: `item-${item.id}`,
    section: "items",
    href: `${BOARD_ROUTE_BASE}/${item.board.id}/pulses/${item.id}?view_id=${item.view_id}`,
    label: item.name,
    secondary: [item.is_subitem && item.parent_name ? `Subitem of ${item.parent_name}` : null, item.board.label, item.workspace.name]
      .filter(Boolean)
      .join(" · "),
    leading: (
      <span className={leading_box_class}>
        <span className="h-1.5 w-1.5 rounded-full bg-shell-text-muted" />
      </span>
    ),
  }));

  const workspaces: SearchOption[] = results.workspaces.map((workspace) => ({
    key: `workspace-${workspace.id}`,
    section: "workspaces",
    href: buildWorkspaceManagePath(workspace.id),
    label: workspace.name,
    secondary: "Workspace",
    leading: (
      <WorkspaceBadge
        workspace={{ mono: workspace.mono, color: workspace.color, avatar_url: workspace.avatar_url ?? undefined, is_home: false }}
        size={24}
      />
    ),
  }));

  return [...boards, ...items, ...workspaces];
};

/** "Ctrl K" or the Command glyph, resolved after mount so server and client markup match. */
const useShortcutLabel = (): string => {
  const [shortcut_label, setShortcutLabel] = useState("Ctrl K");

  useEffect(() => {
    if (/mac|iphone|ipad/i.test(navigator.userAgent)) setShortcutLabel("⌘ K");
  }, []);

  return shortcut_label;
};

/**
 * The top bar's "Search for anything..." box. A typeahead over boards, docs,
 * items and workspaces backed by `GET /api/search` (see `useGlobalSearch`).
 * Implements the ARIA combobox pattern: arrow keys move through the results,
 * Enter opens the highlighted one, Escape closes, and Ctrl/Cmd+K focuses the
 * box from anywhere in the app.
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
  const options = useMemo(() => buildSearchOptions(results), [results]);
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
        }
        break;
      case "Escape":
        event.preventDefault();
        if (is_open && query === "") {
          closeAndReset();
        } else if (is_open) {
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

  const renderStatusMessage = () => {
    if (trimmed_query === "") {
      return "Search boards, docs, items and workspaces.";
    }
    if (!is_searchable) {
      return `Keep typing, at least ${GLOBAL_SEARCH_MIN_LENGTH} characters are needed.`;
    }
    if (has_error) {
      return "Search is unavailable right now. Please try again.";
    }
    if (is_empty_result) {
      return `No results for "${trimmed_query}".`;
    }
    if (options.length === 0) {
      return "Searching...";
    }
    return null;
  };

  const status_message = renderStatusMessage();

  return (
    <div ref={container_ref} className="relative w-full max-w-[520px]">
      <div className="flex w-full items-center gap-2.5 rounded-[10px] border border-shell-border bg-shell-hover px-3.5 py-2 text-shell-text-muted transition-colors hover:bg-shell-hover-strong focus-within:border-brand-500 focus-within:bg-shell-surface">
        <SearchIcon size={15} className="flex-none" />
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
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-shell-text placeholder:text-shell-text-muted focus:outline-none"
        />
        {is_loading ? (
          <span
            className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-shell-border-strong border-t-brand-500"
            aria-hidden="true"
          />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              resetSearch();
              input_ref.current?.focus();
            }}
            aria-label="Clear search"
            className="flex flex-none items-center text-shell-text-faint hover:text-shell-text"
          >
            <CloseIcon size={12} />
          </button>
        ) : (
          <kbd className="hidden flex-none rounded border border-shell-border-strong px-1.5 py-0.5 font-sans text-[10.5px] text-shell-text-muted sm:block">
            {shortcut_label}
          </kbd>
        )}
      </div>

      {is_open && (
        <div className="shell-scrollbar absolute left-0 right-0 top-full z-[70] mt-2 max-h-[min(70vh,480px)] overflow-y-auto rounded-xl border border-shell-border-strong bg-shell-panel p-1.5 shadow-lg">
          {status_message && <p className="px-3 py-3 text-[13px] text-shell-text-muted">{status_message}</p>}

          {has_options && (
            <div id={list_id} role="listbox" aria-label="Search results">
              {SECTION_ORDER.map((section) => {
                const section_options = options.filter((option) => option.section === section);
                if (section_options.length === 0) return null;
    
                return (
                  <div
                    key={section}
                    role="group"
                    aria-label={SECTION_LABELS[section]}
                    className={is_loading ? "opacity-60 transition-opacity" : "transition-opacity"}
                  >
                    <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-shell-text-muted">
                      {SECTION_LABELS[section]}
                    </div>
                    {section_options.map((option) => {
                      const option_index = options.indexOf(option);
                      const is_active = option_index === safe_active_index;
    
                      return (
                        <div
                          key={option.key}
                          id={getOptionId(option_index)}
                          role="option"
                          aria-selected={is_active}
                          // Keep focus on the input so the click doesn't blur and close the list first.
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectOption(option)}
                          onMouseEnter={() => setActiveIndex(option_index)}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 ${
                            is_active ? "bg-shell-hover-strong" : ""
                          }`}
                        >
                          {option.leading}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] text-shell-text">
                              <HighlightedText text={option.label} term={trimmed_query} />
                            </span>
                            <span className="block truncate text-[12px] text-shell-text-muted">{option.secondary}</span>
                          </span>
                          {option.is_private && (
                            <span className="flex-none text-shell-text-muted" title="Private board">
                              <LockIcon size={12} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
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
