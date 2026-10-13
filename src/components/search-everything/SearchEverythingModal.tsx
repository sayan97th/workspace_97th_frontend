"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSearchEverything } from "@/hooks/useSearchEverything";
import { searchEverythingService } from "@/services/search.service";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { boardTreeFontClassName } from "@/components/board/board-tree-font";
import { CloseIcon, SearchIcon, StarIcon } from "@/icons/workspace-icons";
import type {
  AllTabResults,
  BoardResult,
  DocResult,
  FileKind,
  FileResult,
  PersonResult,
  SavedSearch,
  SearchEverythingSort,
  SearchEverythingTab,
  TagResult,
  UpdateResult,
  UpdatesFilter,
} from "@/types/search-everything";
import DateFilterMenu, { ANY_TIME, type DateRange } from "./DateFilterMenu";
import DocsEmptyIllustration from "./DocsEmptyIllustration";
import { FacetCheckboxes, FILE_KIND_LABELS, ResultSummary, SortSwitch, UPDATES_FILTER_LABELS } from "./SearchSidebar";
import { TAB_LABELS, TAB_ORDER } from "./shared";
import AllResults from "./results/AllResults";
import BoardResults from "./results/BoardResults";
import DocResults from "./results/DocResults";
import FileResults from "./results/FileResults";
import PeopleResults from "./results/PeopleResults";
import TagResults from "./results/TagResults";
import UpdateResults from "./results/UpdateResults";
import "./search-everything.css";

type SearchEverythingModalProps = {
  initial_query?: string;
  initial_tab?: SearchEverythingTab;
  onClose: () => void;
};

/** Pixels left before the bottom of the results at which the next page starts loading. */
const LOAD_MORE_MARGIN = "400px";

/**
 * monday.com's "Search Everything": one dialog over the whole app that
 * searches boards (and their items), updates, files, people, tags and docs.
 * Tabs show their counts, Updates and Files have facet checkboxes and a
 * Relevance/Time switch, "Filter by date" narrows every tab and "Search
 * archives" brings archived boards and items in. "Save" stars the current
 * search, saved searches are listed under the empty field. Results load page
 * by page while scrolling. Styles live in `search-everything.css`.
 */
export default function SearchEverythingModal({ initial_query = "", initial_tab = "all", onClose }: SearchEverythingModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState(initial_query);
  const [tab, setTab] = useState<SearchEverythingTab>(initial_tab);
  const [sort, setSort] = useState<SearchEverythingSort>("relevance");
  const [date_range, setDateRange] = useState<DateRange>(ANY_TIME);
  const [is_date_menu_open, setIsDateMenuOpen] = useState(false);
  const [include_archived, setIncludeArchived] = useState(false);
  const [updates_filters, setUpdatesFilters] = useState<UpdatesFilter[]>([]);
  const [file_types, setFileTypes] = useState<FileKind[]>([]);
  const [saved_searches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [is_input_focused, setIsInputFocused] = useState(true);
  const input_ref = useRef<HTMLInputElement>(null);
  const results_ref = useRef<HTMLDivElement>(null);
  const sentinel_ref = useRef<HTMLDivElement>(null);

  const search = useSearchEverything(
    {
      q: query,
      tab,
      sort,
      date_from: date_range.date_from,
      date_to: date_range.date_to,
      include_archived,
      // Facets only mean something on their own tab, sending them elsewhere would just refetch for nothing.
      filters: tab === "updates" ? updates_filters : [],
      file_types: tab === "files" ? file_types : [],
    },
    true
  );

  // Right after a tab switch the hook still holds the previous tab's rows, which the new tab can't render.
  const results = search.results_tab === tab ? search.results : null;
  const trimmed_query = query.trim();
  const saved_match = saved_searches.find((saved) => saved.query === trimmed_query && saved.tab === tab) ?? null;

  useEffect(() => {
    let is_cancelled = false;
    searchEverythingService
      .listSaved()
      .then((saved) => {
        if (!is_cancelled) setSavedSearches(saved);
      })
      .catch(() => {
        // Saved searches are a shortcut, the dialog works the same without them.
      });
    return () => {
      is_cancelled = true;
    };
  }, []);

  // The page behind the sheet must not scroll while it is open.
  useEffect(() => {
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous_overflow;
    };
  }, []);

  // A new search starts at the top of the results.
  useEffect(() => {
    results_ref.current?.scrollTo({ top: 0 });
  }, [tab, search.searched_query, sort, date_range, include_archived, updates_filters, file_types]);

  // Infinite scroll: the next page loads when the sentinel under the list comes near the viewport.
  const { loadMore } = search;
  useEffect(() => {
    const sentinel = sentinel_ref.current;
    if (!sentinel || !search.has_more) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { root: results_ref.current, rootMargin: LOAD_MORE_MARGIN }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [search.has_more, results, loadMore]);

  const navigateTo = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router]
  );

  const switchTab = (next_tab: SearchEverythingTab) => {
    setTab(next_tab);
    setIsDateMenuOpen(false);
  };

  const pickTag = (tag: TagResult) => {
    setQuery(tag.label.startsWith("#") ? tag.label : `#${tag.label}`);
    switchTab("boards");
  };

  const toggleSaved = async () => {
    if (!trimmed_query) return;
    if (saved_match) {
      setSavedSearches((current) => current.filter((saved) => saved.id !== saved_match.id));
      await searchEverythingService.removeSaved(saved_match.id).catch(() => setSavedSearches((current) => [saved_match, ...current]));
      return;
    }
    const created = await searchEverythingService.save(trimmed_query, tab).catch(() => null);
    if (created) setSavedSearches((current) => [created, ...current.filter((saved) => saved.id !== created.id)]);
  };

  const removeSaved = (saved: SavedSearch) => {
    setSavedSearches((current) => current.filter((entry) => entry.id !== saved.id));
    void searchEverythingService.removeSaved(saved.id).catch(() => setSavedSearches((current) => [saved, ...current]));
  };

  const runSaved = (saved: SavedSearch) => {
    setQuery(saved.query);
    switchTab(saved.tab);
    input_ref.current?.blur();
  };

  const toggleIn = <TValue,>(list: TValue[], value: TValue): TValue[] =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    if (is_date_menu_open) setIsDateMenuOpen(false);
    else onClose();
  };

  const show_saved_list = is_input_focused && trimmed_query === "" && saved_searches.length > 0;
  const is_busy = search.is_loading || search.is_typing;
  const has_sidebar = tab === "boards" || tab === "updates" || tab === "files";

  const results_content = useMemo(() => {
    const term = search.searched_query;

    if (tab === "docs" && term === "") {
      const suggestion = user?.full_name?.trim();
      return (
        <div className="search-everything__empty">
          <DocsEmptyIllustration />
          <p className="search-everything__empty-title">Type to search docs</p>
          <p className="search-everything__empty-text">Find anything in your docs, from personal notes to project plans.</p>
          {suggestion && (
            <button type="button" className="search-everything__empty-button" onClick={() => setQuery(suggestion)}>
              Try searching for &quot;{suggestion}&quot;
            </button>
          )}
        </div>
      );
    }

    if (search.has_error && results === null) {
      return (
        <div className="search-everything__empty">
          <p className="search-everything__empty-title">Search is unavailable right now</p>
          <p className="search-everything__empty-text">Please try again in a moment.</p>
        </div>
      );
    }

    if (results === null) return null;

    const is_empty = Array.isArray(results)
      ? results.length === 0
      : Object.values(results as AllTabResults).every((section) => section.length === 0);
    if (is_empty) {
      return (
        <div className="search-everything__empty">
          <SearchIcon size={44} className="text-[var(--se-text-faint)]" />
          <p className="search-everything__empty-title">No results found</p>
          <p className="search-everything__empty-text">
            {term ? `Nothing matches "${term}". Try another word or clear the filters.` : "Nothing to show here yet."}
          </p>
        </div>
      );
    }

    switch (tab) {
      case "all":
        return (
          <AllResults
            results={results as AllTabResults}
            counts={search.counts}
            term={term}
            onNavigate={navigateTo}
            onSeeAll={switchTab}
            onPickTag={pickTag}
          />
        );
      case "boards":
        return <BoardResults boards={results as BoardResult[]} term={term} onNavigate={navigateTo} />;
      case "updates":
        return <UpdateResults updates={results as UpdateResult[]} term={term} onNavigate={navigateTo} />;
      case "files":
        return <FileResults files={results as FileResult[]} onNavigate={navigateTo} />;
      case "people":
        return <PeopleResults people={results as PersonResult[]} term={term} />;
      case "tags":
        return <TagResults tags={results as TagResult[]} onPickTag={pickTag} />;
      case "docs":
        return <DocResults docs={results as DocResult[]} term={term} onNavigate={navigateTo} />;
    }
    // `switchTab` and `pickTag` only call state setters, so they never go stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, results, search.searched_query, search.has_error, search.counts, user?.full_name, navigateTo]);

  return createPortal(
    <>
      <div className="search-everything-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={`search-everything ${boardTreeFontClassName}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search Everything"
        onKeyDown={handleKeyDown}
      >
        <Tooltip content="Close" placement="left" className="!absolute right-3 top-3 z-10">
          <button type="button" className="search-everything__close !static" onClick={onClose} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        </Tooltip>

        <div className="search-everything__header">
          <input
            ref={input_ref}
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Search Everything ..."
            aria-label="Search Everything"
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            className="search-everything__input"
          />
          <Tooltip
            content={!trimmed_query ? "Type something to save this search" : saved_match ? "Remove from saved searches" : "Save this search"}
            placement="bottom"
          >
            <button
              type="button"
              className="search-everything__save"
              onClick={() => void toggleSaved()}
              disabled={!trimmed_query}
              data-saved={saved_match ? true : undefined}
              aria-pressed={Boolean(saved_match)}
            >
              <StarIcon size={14} filled />
              {saved_match ? "Saved" : "Save"}
            </button>
          </Tooltip>

          {show_saved_list && (
            // `onMouseDown` keeps the field focused, so the list doesn't close before the click lands.
            <div className="search-everything__saved" onMouseDown={(event) => event.preventDefault()}>
              <div className="search-everything__saved-title">Saved searches</div>
              {saved_searches.map((saved) => (
                <div key={saved.id} className="search-everything__saved-row">
                  <button type="button" className="search-everything__saved-run" onClick={() => runSaved(saved)}>
                    <StarIcon size={13} filled />
                    <span className="search-everything__saved-query">{saved.query}</span>
                    <span className="search-everything__saved-tab">in {TAB_LABELS[saved.tab]}</span>
                  </button>
                  <Tooltip content="Remove saved search" placement="left">
                    <button type="button" className="search-everything__icon-button" aria-label="Remove saved search" onClick={() => removeSaved(saved)}>
                      <CloseIcon size={10} />
                    </button>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="search-everything__toolbar">
          <div className="search-everything__tabs" role="tablist" aria-label="Search in">
            {TAB_ORDER.map((tab_key) => (
              <button
                key={tab_key}
                type="button"
                role="tab"
                aria-selected={tab === tab_key}
                className="search-everything__tab"
                onClick={() => switchTab(tab_key)}
              >
                {TAB_LABELS[tab_key]}
                {tab_key !== "all" && search.counts && <span className="search-everything__tab-count">/ {search.counts[tab_key]}</span>}
              </button>
            ))}
          </div>
          {tab !== "people" && tab !== "tags" && (
            <DateFilterMenu value={date_range} onChange={setDateRange} is_open={is_date_menu_open} onOpenChange={setIsDateMenuOpen} />
          )}
        </div>

        <div className="search-everything__body">
          <div
            ref={results_ref}
            className="search-everything__results shell-scrollbar"
            role="tabpanel"
            aria-label={TAB_LABELS[tab]}
            aria-busy={is_busy}
            data-loading={is_busy && results !== null ? true : undefined}
          >
            {results_content}
            {results === null && is_busy && (
              <div className="search-everything__spinner-row">
                <span className="search-everything__spinner" aria-label="Loading" />
              </div>
            )}
            <div ref={sentinel_ref} aria-hidden="true" />
            {search.is_loading_more && (
              <div className="search-everything__spinner-row">
                <span className="search-everything__spinner" aria-label="Loading more results" />
              </div>
            )}
          </div>

          {has_sidebar && (
            <aside className="search-everything__sidebar shell-scrollbar" aria-label="Search options">
              {tab === "boards" ? (
                <label className="search-everything__check justify-end">
                  <input type="checkbox" checked={include_archived} onChange={() => setIncludeArchived((current) => !current)} />
                  <span>Search archives</span>
                </label>
              ) : (
                <>
                  <ResultSummary total={search.total} term={search.searched_query} />
                  <SortSwitch sort={sort} onChange={setSort} />
                  {tab === "updates" ? (
                    <FacetCheckboxes
                      labels={UPDATES_FILTER_LABELS}
                      selected={updates_filters}
                      counts={search.facets}
                      onToggle={(filter) => setUpdatesFilters((current) => toggleIn(current, filter))}
                    />
                  ) : (
                    <FacetCheckboxes
                      labels={FILE_KIND_LABELS}
                      selected={file_types}
                      counts={search.facets}
                      onToggle={(kind) => setFileTypes((current) => toggleIn(current, kind))}
                    />
                  )}
                </>
              )}
            </aside>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
