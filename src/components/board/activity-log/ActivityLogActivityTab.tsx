"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CircleUserRound, FileSpreadsheet, History, RefreshCw, Search, X } from "lucide-react";
import { boardOptionsService } from "@/services/board-options.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { publishAutomationEffectsFromResponse } from "@/lib/automation-effects";
import { useToast } from "@/components/ui/toast/ToastProvider";
import type { BoardActivityEntry, BoardActivityFacets, BoardActivityFilters } from "@/types/board-activity-log";
import ActivityLogEntryRow from "./ActivityLogEntryRow";
import { ActivityLogFilterPanel, ActivityLogPersonPanel, ActivityLogPopover } from "./ActivityLogFilterPanels";
import { EVENT_TYPE_OPTIONS, PERIOD_OPTIONS, dayKeyOf, formatDayLabel, formatShortDate } from "./activityLogFormat";

export type ActivityLogActivityTabProps = {
  board_id: number;
  board_name: string;
  current_user_id: number | null;
  onOpenItem: (item_id: number) => void;
};

export const EMPTY_FILTERS: BoardActivityFilters = {
  search: "",
  user_ids: [],
  column_ids: [],
  group_ids: [],
  event_types: [],
  period: "all",
  automation_only: false,
};

const SEARCH_DEBOUNCE_MS = 300;
/** Entries one load aims for, the API page size. */
const PAGE_SIZE = 50;
/** Requests one load may chain while a filtered search walks back through a long history. */
const MAX_AUTO_REQUESTS = 25;

/** How many "Filter log" choices are active, for the badge on the button. */
const countFilterLog = (filters: BoardActivityFilters): number =>
  filters.event_types.length + filters.column_ids.length + filters.group_ids.length + (filters.period !== "all" ? 1 : 0);

/**
 * Asks the open board to read the rows an Undo changed again, through the same channel
 * automation changes use (see `useBoardAutomationEffects`), so the table updates at once.
 */
const refreshBoardRows = (board_id: number, item_ids: number[], needs_structure_refresh: boolean) =>
  publishAutomationEffectsFromResponse({
    automation_effects: { boards: [{ board_id, item_ids, needs_structure_refresh }], runs: [], broadcast_ids: [] },
  });

/**
 * The "Activity" tab of the board Activity log: every change made on the
 * board, newest first, with monday.com's toolbar (Filter log, Search,
 * Person, refresh and export), the "Automation activity" shortcut, day
 * headings, endless scrolling and Undo on each entry that allows it.
 */
const ActivityLogActivityTab: React.FC<ActivityLogActivityTabProps> = ({ board_id, board_name, current_user_id, onOpenItem }) => {
  const toast = useToast();
  const [filters, setFilters] = useState<BoardActivityFilters>(EMPTY_FILTERS);
  const [search_draft, setSearchDraft] = useState("");
  const [is_search_open, setIsSearchOpen] = useState(false);
  const [entries, setEntries] = useState<BoardActivityEntry[]>([]);
  const [facets, setFacets] = useState<BoardActivityFacets | null>(null);
  const [next_cursor, setNextCursor] = useState<string | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_loading_more, setIsLoadingMore] = useState(false);
  /** How far back a filtered search looked so far, while it walks back through a long history. */
  const [scanned_until, setScannedUntil] = useState<string | null>(null);
  /** A search stopped after {@link MAX_AUTO_REQUESTS} requests without filling a page, only "Keep searching" continues it. */
  const [is_search_paused, setIsSearchPaused] = useState(false);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [undoing_key, setUndoingKey] = useState<string | null>(null);
  const [is_exporting, setIsExporting] = useState(false);
  const [open_panel, setOpenPanel] = useState<"filter" | "person" | null>(null);

  const request_id_ref = useRef(0);
  const filter_button_ref = useRef<HTMLButtonElement>(null);
  const person_button_ref = useRef<HTMLButtonElement>(null);
  const search_input_ref = useRef<HTMLInputElement>(null);
  const sentinel_ref = useRef<HTMLDivElement>(null);
  const scroll_ref = useRef<HTMLDivElement>(null);
  /** The filter menus' choices are asked for once per drawer opening, not on every filter change. */
  const needs_facets_ref = useRef(true);

  /**
   * Loads the log from `start_cursor` (null = from the top, replacing the list). On a long history
   * a filtered request scans a bounded window and can come back short with a `next_cursor`, so this
   * keeps asking, appending what each request finds right away, until a page worth of entries
   * arrived, the history ended, or {@link MAX_AUTO_REQUESTS} requests ran (then the list offers
   * "Keep searching"). Any newer load bumps `request_id_ref` and stops an older chain.
   */
  const fetchPages = useCallback(
    async (active_filters: BoardActivityFilters, start_cursor: string | null, { quiet = false }: { quiet?: boolean } = {}) => {
      const request_id = ++request_id_ref.current;
      const is_replacing = start_cursor === null;
      if (is_replacing && !quiet) setIsLoading(true);
      if (!is_replacing) setIsLoadingMore(true);
      setLoadError(null);
      setIsSearchPaused(false);

      let cursor = start_cursor;
      let found = 0;
      let requests = 0;
      try {
        do {
          const page = await boardOptionsService.getActivityFeed(board_id, active_filters, { cursor, with_facets: needs_facets_ref.current });
          if (request_id !== request_id_ref.current) return;
          if (page.meta.facets) {
            setFacets(page.meta.facets);
            needs_facets_ref.current = false;
          }
          const replace_list = is_replacing && requests === 0;
          setEntries((current) => {
            if (replace_list) return page.data;
            const known = new Set(current.map((entry) => entry.key));
            return [...current, ...page.data.filter((entry) => !known.has(entry.key))];
          });
          found += page.data.length;
          requests += 1;
          cursor = page.meta.next_cursor;
          setNextCursor(cursor);
          setScannedUntil(page.meta.scanned_until);
          // The first results show at once, the rest of the search runs as "Searching older activity".
          if (is_replacing && requests === 1) {
            setIsLoading(false);
            if (cursor && found < PAGE_SIZE) setIsLoadingMore(true);
          }
        } while (cursor && found < PAGE_SIZE && requests < MAX_AUTO_REQUESTS);
        setIsSearchPaused(cursor !== null && found < PAGE_SIZE);
      } catch (error) {
        if (request_id !== request_id_ref.current) return;
        if (is_replacing && requests === 0) setLoadError(getApiErrorMessage(error, "We couldn't load the activity log. Please try again."));
        else toast.error(getApiErrorMessage(error, "We couldn't load older activity. Please try again."));
      } finally {
        if (request_id === request_id_ref.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [board_id, toast]
  );

  const loadFirstPage = useCallback(
    (active_filters: BoardActivityFilters, options: { quiet?: boolean } = {}) => fetchPages(active_filters, null, options),
    [fetchPages]
  );

  useEffect(() => {
    void loadFirstPage(filters);
  }, [filters, loadFirstPage]);

  // Typing settles before the search runs.
  useEffect(() => {
    if (search_draft === filters.search) return;
    const timeout_id = setTimeout(() => setFilters((current) => ({ ...current, search: search_draft })), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout_id);
  }, [search_draft, filters.search]);

  const loadMore = useCallback(() => {
    if (!next_cursor || is_loading_more || is_loading) return;
    void fetchPages(filters, next_cursor);
  }, [fetchPages, filters, next_cursor, is_loading, is_loading_more]);

  // Endless scrolling: the next page loads as the end of the list comes within 400px of the
  // drawer's own scroll area (the observer's root, so the margin is measured there).
  useEffect(() => {
    const sentinel = sentinel_ref.current;
    if (!sentinel || !next_cursor || is_search_paused || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) loadMore();
      },
      { root: scroll_ref.current, rootMargin: "400px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [next_cursor, loadMore, is_search_paused]);

  const patchFilters = useCallback((patch: Partial<BoardActivityFilters>) => setFilters((current) => ({ ...current, ...patch })), []);

  const clearAll = () => {
    setSearchDraft("");
    setFilters(EMPTY_FILTERS);
  };

  const handleUndo = async (entry: BoardActivityEntry) => {
    setUndoingKey(entry.key);
    try {
      const result = await boardOptionsService.undoActivity(board_id, entry.source, entry.id);
      setEntries((current) => current.map((candidate) => (candidate.key === entry.key ? { ...candidate, can_undo: false, undone_at: new Date().toISOString() } : candidate)));
      refreshBoardRows(board_id, result.item_ids, result.needs_structure_refresh);
      toast.success(result.message);
      // The undo is a change of its own, it shows at the top.
      void loadFirstPage(filters, { quiet: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't undo this change. Please try again."));
    } finally {
      setUndoingKey(null);
    }
  };

  // Rows are memoized, so they get callbacks that never change identity.
  const undo_ref = useRef(handleUndo);
  undo_ref.current = handleUndo;
  const open_item_ref = useRef(onOpenItem);
  open_item_ref.current = onOpenItem;
  const onRowUndo = useCallback((entry: BoardActivityEntry) => void undo_ref.current(entry), []);
  const onRowOpenItem = useCallback((item_id: number) => open_item_ref.current(item_id), []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await boardOptionsService.exportActivityLog(board_id, filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${board_name.trim().replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "board"}-activity-log.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "We couldn't export the activity log. Please try again."));
    } finally {
      setIsExporting(false);
    }
  };

  const filter_log_count = countFilterLog(filters);
  const is_filtering = filter_log_count > 0 || filters.user_ids.length > 0 || filters.search.trim() !== "" || filters.automation_only;

  // Removable chips for every active choice, so it is always clear why the list is short.
  const active_chips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (filters.automation_only) chips.push({ key: "automation", label: "Automation activity", onRemove: () => patchFilters({ automation_only: false }) });
    if (filters.period !== "all") {
      chips.push({ key: "period", label: PERIOD_OPTIONS.find((option) => option.value === filters.period)?.label ?? "Date", onRemove: () => patchFilters({ period: "all" }) });
    }
    filters.event_types.forEach((type) =>
      chips.push({
        key: `type-${type}`,
        label: EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type,
        onRemove: () => patchFilters({ event_types: filters.event_types.filter((candidate) => candidate !== type) }),
      })
    );
    const column_labels = new Map<string, number[]>();
    facets?.columns.filter((column) => filters.column_ids.includes(column.id)).forEach((column) => column_labels.set(column.label, [...(column_labels.get(column.label) ?? []), column.id]));
    column_labels.forEach((ids, label) =>
      chips.push({ key: `column-${label}`, label, onRemove: () => patchFilters({ column_ids: filters.column_ids.filter((id) => !ids.includes(id)) }) })
    );
    facets?.groups
      .filter((group) => filters.group_ids.includes(group.id))
      .forEach((group) => chips.push({ key: `group-${group.id}`, label: group.name, onRemove: () => patchFilters({ group_ids: filters.group_ids.filter((id) => id !== group.id) }) }));
    facets?.people
      .filter((person) => filters.user_ids.includes(person.id))
      .forEach((person) => chips.push({ key: `person-${person.id}`, label: person.full_name, onRemove: () => patchFilters({ user_ids: filters.user_ids.filter((id) => id !== person.id) }) }));
    return chips;
  }, [filters, facets, patchFilters]);

  const person_label = filters.user_ids.length === 1
    ? facets?.people.find((person) => person.id === filters.user_ids[0])?.full_name ?? "Person"
    : filters.user_ids.length > 1
      ? `${filters.user_ids.length} people`
      : "Person";

  return (
    <div className="activity-log__tab-body">
      <div className="activity-log__other">
        <span>Other activities</span>
        <button
          type="button"
          className="activity-log__link"
          aria-pressed={filters.automation_only}
          onClick={() => patchFilters({ automation_only: !filters.automation_only })}
        >
          {filters.automation_only ? "Show all activity" : "Automation activity"}
        </button>
      </div>

      <div className="activity-log__toolbar">
        <div className="activity-log__toolbar-anchor">
          <button
            ref={filter_button_ref}
            type="button"
            className="activity-log__filter-button"
            aria-haspopup="dialog"
            aria-expanded={open_panel === "filter"}
            onClick={() => setOpenPanel((current) => (current === "filter" ? null : "filter"))}
          >
            Filter log
            {filter_log_count > 0 && <span className="activity-log__count">{filter_log_count}</span>}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          <ActivityLogPopover is_open={open_panel === "filter"} onClose={() => setOpenPanel(null)} trigger_ref={filter_button_ref} label="Filter log">
            <ActivityLogFilterPanel
              filters={filters}
              facets={facets}
              onChange={patchFilters}
              onClearAll={() => patchFilters({ event_types: [], column_ids: [], group_ids: [], period: "all" })}
            />
          </ActivityLogPopover>
        </div>

        {is_search_open || search_draft ? (
          <label className="activity-log__search" data-active={search_draft ? true : undefined}>
            <Search size={15} aria-hidden="true" />
            <input
              ref={search_input_ref}
              value={search_draft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onBlur={() => !search_draft && setIsSearchOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setSearchDraft("");
                  setIsSearchOpen(false);
                }
              }}
              placeholder="Search the log"
              aria-label="Search the log"
              autoFocus
            />
            {search_draft && (
              <button type="button" className="activity-log__search-clear" onClick={() => setSearchDraft("")} aria-label="Clear search">
                <X size={13} />
              </button>
            )}
          </label>
        ) : (
          <button type="button" className="activity-log__tool" onClick={() => setIsSearchOpen(true)}>
            <Search size={16} aria-hidden="true" />
            Search
          </button>
        )}

        <div className="activity-log__toolbar-anchor">
          <button
            ref={person_button_ref}
            type="button"
            className="activity-log__tool"
            data-active={filters.user_ids.length > 0 || undefined}
            aria-haspopup="dialog"
            aria-expanded={open_panel === "person"}
            onClick={() => setOpenPanel((current) => (current === "person" ? null : "person"))}
          >
            <CircleUserRound size={16} aria-hidden="true" />
            <span className="activity-log__tool-label">{person_label}</span>
          </button>
          <ActivityLogPopover is_open={open_panel === "person"} onClose={() => setOpenPanel(null)} trigger_ref={person_button_ref} label="Filter by person" class_name="activity-log__popover--narrow">
            <ActivityLogPersonPanel selected_ids={filters.user_ids} facets={facets} current_user_id={current_user_id} onChange={(user_ids) => patchFilters({ user_ids })} />
          </ActivityLogPopover>
        </div>

        <div className="activity-log__toolbar-end">
          <button type="button" className="activity-log__icon-button" onClick={() => void loadFirstPage(filters)} aria-label="Refresh the log" title="Refresh">
            <RefreshCw size={16} className={is_loading ? "animate-spin" : undefined} />
          </button>
          <button type="button" className="activity-log__icon-button" onClick={() => void handleExport()} disabled={is_exporting} aria-label="Export the log to a CSV file" title="Export to CSV">
            <FileSpreadsheet size={16} className={is_exporting ? "animate-pulse" : undefined} />
          </button>
        </div>
      </div>

      {active_chips.length > 0 && (
        <div className="activity-log__chips">
          {active_chips.map((chip) => (
            <span key={chip.key} className="activity-log__chip">
              <span className="activity-log__chip-label">{chip.label}</span>
              <button type="button" onClick={chip.onRemove} aria-label={`Remove filter ${chip.label}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" className="activity-log__text-button" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      <div ref={scroll_ref} className="activity-log__scroll shell-scrollbar">
        {load_error && (
          <div role="alert" className="activity-log__error">
            {load_error}
            <button type="button" className="activity-log__text-button" onClick={() => void loadFirstPage(filters)}>
              Try again
            </button>
          </div>
        )}

        {is_loading && entries.length === 0 && !load_error && (
          <ul className="activity-log__list" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <li key={index} className="activity-log__row activity-log__row--skeleton">
                <span className="activity-log__skeleton" style={{ width: 36 }} />
                <span className="activity-log__skeleton activity-log__skeleton--round" />
                <span className="activity-log__skeleton" style={{ width: `${60 + ((index * 17) % 30)}%` }} />
                <span className="activity-log__skeleton" style={{ width: "70%" }} />
                <span className="activity-log__skeleton" style={{ width: "85%" }} />
                <span />
              </li>
            ))}
          </ul>
        )}

        {!is_loading && !load_error && entries.length === 0 && !next_cursor && (
          <div className="activity-log__empty">
            <span className="activity-log__empty-icon">
              <History size={24} />
            </span>
            <h3 className="activity-log__empty-title">{is_filtering ? "Nothing matches these filters" : "No activity yet"}</h3>
            <p className="activity-log__empty-text">
              {is_filtering
                ? "Try another person, column or date range."
                : "Every change made on this board, from status updates to new items, groups and columns, will show up here."}
            </p>
            {is_filtering && (
              <button type="button" className="activity-log__secondary-button" onClick={clearAll}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {entries.length > 0 && (
          <ul className="activity-log__list" aria-busy={is_loading || undefined}>
            {entries.map((entry, index) => {
              const show_day = index === 0 || dayKeyOf(entries[index - 1].created_at) !== dayKeyOf(entry.created_at);
              return (
                <React.Fragment key={entry.key}>
                  {show_day && (
                    <li className="activity-log__day" aria-hidden="true">
                      {formatDayLabel(entry.created_at)}
                    </li>
                  )}
                  <ActivityLogEntryRow entry={entry} is_undoing={undoing_key === entry.key} onUndo={onRowUndo} onOpenItem={onRowOpenItem} />
                </React.Fragment>
              );
            })}
          </ul>
        )}

        {next_cursor && !is_loading && (
          <div ref={sentinel_ref} className="activity-log__more">
            {is_loading_more ? (
              <p className="activity-log__searching" role="status">
                <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                {scanned_until ? `Searching older activity, back to ${formatShortDate(scanned_until)}` : "Loading older activity"}
              </p>
            ) : (
              <>
                {is_search_paused && scanned_until && (
                  <p className="activity-log__searching">
                    {entries.length === 0 ? "No matches" : "No more matches"} in the activity back to {formatShortDate(scanned_until)}.
                  </p>
                )}
                <button type="button" className="activity-log__secondary-button" onClick={loadMore}>
                  {is_search_paused ? "Keep searching" : "Load older activity"}
                </button>
              </>
            )}
          </div>
        )}
        {!next_cursor && entries.length > 0 && !is_loading && <p className="activity-log__end">You reached the beginning of this log.</p>}
      </div>
    </div>
  );
};

export default ActivityLogActivityTab;
