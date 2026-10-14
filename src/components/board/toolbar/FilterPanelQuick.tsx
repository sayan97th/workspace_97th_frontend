"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "@/icons/board-icons";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MinusIcon, SearchIcon } from "@/icons/workspace-icons";
import PersonAvatar from "../PersonAvatar";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import type { BoardQuickFilterFacet, BoardQuickFilterFacetOption, BoardToolbarApi } from "./types";

export type FilterPanelQuickProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Options shown per facet before "Show more". */
const COLLAPSED_OPTION_COUNT = 8;
/** Share of the visible width one click on a side arrow scrolls the facet columns by. */
const ARROW_SCROLL_RATIO = 0.8;

type VisibleFacet<TRow> = { facet: BoardQuickFilterFacet<TRow>; options: BoardQuickFilterFacetOption[] };

/** "All columns" dropdown: which fields show up as Quick filters facets (saved with the view). */
function FacetColumnChooser<TRow>({ toolbar }: { toolbar: BoardToolbarApi<TRow> }) {
  const [is_open, setIsOpen] = useState(false);
  const container_ref = useRef<HTMLDivElement>(null);
  const all_ids = toolbar.quick_filter_facets.map((facet) => facet.id);
  const shown_ids = toolbar.quick_filter_column_ids ?? all_ids;
  const is_all_shown = toolbar.quick_filter_column_ids === null || all_ids.every((id) => shown_ids.includes(id));

  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!container_ref.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [is_open]);

  const toggleFacet = (facet_id: string) => {
    const next = shown_ids.includes(facet_id) ? shown_ids.filter((id) => id !== facet_id) : [...shown_ids, facet_id];
    // Keep `null` ("every column, including ones added later") whenever everything is ticked.
    toolbar.setQuickFilterColumnIds(all_ids.every((id) => next.includes(id)) ? null : all_ids.filter((id) => next.includes(id)));
  };

  return (
    <div ref={container_ref} className="filter-panel__columns">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={is_open}
        className="filter-panel__text-button filter-panel__columns-button"
      >
        {is_all_shown ? "All columns" : `${shown_ids.length} of ${all_ids.length} columns`}
        <ChevronDownIcon size={11} />
      </button>
      {is_open && (
        <div className="filter-panel__menu">
          <div className="filter-panel__menu-head">
            <span>Show in quick filters</span>
            <button
              type="button"
              onClick={() => toolbar.setQuickFilterColumnIds(is_all_shown ? [] : null)}
              className="filter-panel__link-button"
            >
              {is_all_shown ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="filter-panel__menu-list filter-panel__scroll">
            {toolbar.quick_filter_facets.map((facet) => {
              const is_shown = shown_ids.includes(facet.id);
              return (
                <button
                  key={facet.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={is_shown}
                  onClick={() => toggleFacet(facet.id)}
                  className="filter-panel__menu-option"
                >
                  <span className="filter-panel__checkbox" data-checked={is_shown}>
                    {is_shown && <CheckIcon size={10} />}
                  </span>
                  {facet.swatch && <ColumnSwatchBadge swatch={facet.swatch} size={20} />}
                  <span className="filter-panel__chip-label flex-1">{facet.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tracks whether a horizontal scroller has content hidden past either edge,
 * so the round side arrows only show while there is somewhere to go.
 */
function useHorizontalOverflow(scroller_ref: React.RefObject<HTMLDivElement | null>, content_key: string) {
  const [overflow, setOverflow] = useState({ can_scroll_start: false, can_scroll_end: false });

  const measure = useCallback(() => {
    const scroller = scroller_ref.current;
    if (!scroller) return;
    const can_scroll_start = scroller.scrollLeft > 1;
    const can_scroll_end = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
    setOverflow((current) =>
      current.can_scroll_start === can_scroll_start && current.can_scroll_end === can_scroll_end
        ? current
        : { can_scroll_start, can_scroll_end }
    );
  }, [scroller_ref]);

  useEffect(() => {
    const scroller = scroller_ref.current;
    if (!scroller) return;
    measure();
    scroller.addEventListener("scroll", measure, { passive: true });
    const resize_observer = new ResizeObserver(measure);
    resize_observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", measure);
      resize_observer.disconnect();
    };
  }, [scroller_ref, measure, content_key]);

  const scrollByPage = (direction: 1 | -1) => {
    const scroller = scroller_ref.current;
    if (scroller) scroller.scrollBy({ left: direction * scroller.clientWidth * ARROW_SCROLL_RATIO });
  };

  return { ...overflow, scrollByPage };
}

function FilterPanelQuick<TRow>({ toolbar }: FilterPanelQuickProps<TRow>) {
  const [query, setQuery] = useState("");
  const [expanded_facet_ids, setExpandedFacetIds] = useState<string[]>([]);
  const trimmed_query = query.trim().toLowerCase();

  const shown_ids = toolbar.quick_filter_column_ids;
  const visible_facets: VisibleFacet<TRow>[] = toolbar.quick_filter_facets
    .filter((facet) => shown_ids === null || shown_ids.includes(facet.id))
    .map((facet) => {
      // A facet whose own name matches keeps every option; otherwise only
      // the matching options stay, and a facet with none left is hidden.
      if (!trimmed_query || facet.label.toLowerCase().includes(trimmed_query)) return { facet, options: facet.options };
      return { facet, options: facet.options.filter((option) => option.label.toLowerCase().includes(trimmed_query)) };
    })
    .filter(({ options }) => options.length > 0);

  const findPerson = (person_id: string) => toolbar.persons.find((p) => p.id === person_id);

  const toggleExpanded = (facet_id: string) =>
    setExpandedFacetIds((current) =>
      current.includes(facet_id) ? current.filter((id) => id !== facet_id) : [...current, facet_id]
    );

  const facets_ref = useRef<HTMLDivElement>(null);
  const { can_scroll_start, can_scroll_end, scrollByPage } = useHorizontalOverflow(
    facets_ref,
    visible_facets.map(({ facet, options }) => `${facet.id}:${options.length}`).join("|")
  );

  return (
    <div>
      <div className="filter-panel__quick-bar">
        <FacetColumnChooser toolbar={toolbar} />
        <label className="filter-panel__search">
          <SearchIcon size={14} />
          <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search values" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="filter-panel__search-clear">
              <CloseIcon size={10} />
            </button>
          )}
        </label>
      </div>

      {visible_facets.length === 0 ? (
        <p className="filter-panel__empty">
          {trimmed_query ? `No values match "${query.trim()}".` : "No columns selected. Use All columns to pick some."}
        </p>
      ) : (
        <div className="filter-panel__facets-frame">
          {can_scroll_start && (
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              aria-label="Show previous columns"
              className="filter-panel__scroll-arrow"
              data-side="start"
            >
              <ChevronLeftIcon size={12} />
            </button>
          )}
          <div ref={facets_ref} className="filter-panel__facets filter-panel__scroll">
            {visible_facets.map(({ facet, options }) => {
              const selected = toolbar.quick_filter_selections[facet.id] ?? [];
              const excluded = toolbar.quick_filter_exclusions[facet.id] ?? [];
              const has_picks = selected.length + excluded.length > 0;
              const counts = toolbar.quick_filter_counts[facet.id] ?? {};
              const is_expanded = expanded_facet_ids.includes(facet.id) || !!trimmed_query;
              const shown_options = is_expanded ? options : options.slice(0, COLLAPSED_OPTION_COUNT);
              const hidden_count = options.length - shown_options.length;

              return (
                <div key={facet.id} className="filter-panel__facet" role="group" aria-label={facet.label}>
                  <div className="filter-panel__facet-head">
                    <span className="filter-panel__facet-title">
                      <span className="filter-panel__chip-label">{facet.label}</span>
                      {facet.scope === "subitem" && <span className="filter-panel__facet-tag">Subitem</span>}
                    </span>
                    {has_picks && (
                      <button type="button" onClick={() => toolbar.clearQuickFilterFacet(facet.id)} className="filter-panel__facet-clear">
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="filter-panel__facet-options filter-panel__scroll">
                    {shown_options.map((option) => {
                      const is_selected = selected.includes(option.id);
                      const is_excluded = excluded.includes(option.id);
                      const count = counts[option.id] ?? 0;
                      const person = option.person_id ? findPerson(option.person_id) : undefined;
                      return (
                        <div key={option.id} className="filter-panel__chip-wrap">
                          <button
                            type="button"
                            // Alt (Option) + click excludes the value instead of picking it.
                            onClick={(event) =>
                              event.altKey
                                ? toolbar.toggleQuickFilterExclusion(facet.id, option.id)
                                : toolbar.toggleQuickFilterOption(facet.id, option.id)
                            }
                            aria-pressed={is_selected}
                            title={is_excluded ? `Excluding ${option.label}` : "Click to filter, Alt+click to exclude"}
                            className="filter-panel__chip"
                            data-state={is_excluded ? "excluded" : is_selected ? "selected" : undefined}
                            data-empty={count === 0 && !is_selected && !is_excluded}
                          >
                            <span className="filter-panel__chip-main">
                              {is_excluded ? (
                                <span className="filter-panel__chip-minus">
                                  <MinusIcon size={11} />
                                </span>
                              ) : option.dot_color && !person ? (
                                <span className="filter-panel__chip-dot" style={{ background: option.dot_color }} />
                              ) : null}
                              {person ? <PersonAvatar person={person} size={20} /> : null}
                              <span className="filter-panel__chip-label">{option.label}</span>
                            </span>
                            <span className="filter-panel__chip-count">{count}</span>
                          </button>
                          <span className="filter-panel__chip-actions">
                            <button
                              type="button"
                              onClick={() => toolbar.selectOnlyQuickFilterOption(facet.id, option.id)}
                              title={`Show only ${option.label}`}
                              className="filter-panel__chip-action"
                            >
                              Only
                            </button>
                            <button
                              type="button"
                              onClick={() => toolbar.toggleQuickFilterExclusion(facet.id, option.id)}
                              aria-label={is_excluded ? `Stop excluding ${option.label}` : `Exclude ${option.label}`}
                              aria-pressed={is_excluded}
                              title={is_excluded ? "Stop excluding" : "Exclude"}
                              className="filter-panel__chip-action"
                              data-tone="danger"
                            >
                              <MinusIcon size={11} />
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {!trimmed_query && options.length > COLLAPSED_OPTION_COUNT && (
                    <button type="button" onClick={() => toggleExpanded(facet.id)} className="filter-panel__link-button">
                      {hidden_count > 0 ? `Show ${hidden_count} more` : "Show less"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {can_scroll_end && (
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              aria-label="Show more columns"
              className="filter-panel__scroll-arrow"
              data-side="end"
            >
              <ChevronRightIcon size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterPanelQuick;
