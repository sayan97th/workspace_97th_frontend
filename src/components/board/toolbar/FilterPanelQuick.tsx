"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckIcon, CloseIcon } from "@/icons/board-icons";
import { ChevronDownIcon, MinusIcon, SearchIcon } from "@/icons/workspace-icons";
import PersonAvatar from "../PersonAvatar";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import type { BoardQuickFilterFacet, BoardQuickFilterFacetOption, BoardToolbarApi } from "./types";

export type FilterPanelQuickProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Options shown per facet before "Show more". */
const COLLAPSED_OPTION_COUNT = 8;

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
    <div ref={container_ref} className="relative flex-none">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13.5px] font-semibold text-boardtree-text-secondary hover:bg-boardtree-hover hover:text-boardtree-text"
      >
        {is_all_shown ? "All columns" : `${shown_ids.length} of ${all_ids.length} columns`}
        <ChevronDownIcon size={10} className={`transition-transform ${is_open ? "rotate-180" : ""}`} />
      </button>
      {is_open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[210] w-[260px] rounded-[9px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
            <span className="text-[11.5px] font-semibold tracking-wide text-boardtree-text-faint">Show in quick filters</span>
            <button
              type="button"
              onClick={() => toolbar.setQuickFilterColumnIds(is_all_shown ? [] : null)}
              className="text-[12px] font-medium text-boardtree-accent hover:text-boardtree-accent-hover"
            >
              {is_all_shown ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="shell-scrollbar max-h-[280px] overflow-y-auto">
            {toolbar.quick_filter_facets.map((facet) => {
              const is_shown = shown_ids.includes(facet.id);
              return (
                <button
                  key={facet.id}
                  type="button"
                  onClick={() => toggleFacet(facet.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13.5px] text-boardtree-text hover:bg-boardtree-hover"
                >
                  <span
                    className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
                      is_shown ? "border-boardtree-accent bg-boardtree-accent" : "border-boardtree-border"
                    }`}
                  >
                    {is_shown && <CheckIcon size={10} className="text-white" />}
                  </span>
                  {facet.swatch && <ColumnSwatchBadge swatch={facet.swatch} size={20} />}
                  <span className="min-w-0 flex-1 truncate">{facet.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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

  return (
    <div>
      <div className="flex items-center gap-3 px-5 pb-2.5">
        <FacetColumnChooser toolbar={toolbar} />
        <div className="flex h-8 w-[220px] items-center gap-2 rounded-lg border border-boardtree-border bg-boardtree-hover px-2.5 focus-within:border-boardtree-accent">
          <span className="flex flex-none text-boardtree-text-faint">
            <SearchIcon size={13} />
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search values"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-boardtree-text placeholder:text-boardtree-text-faint focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex flex-none text-boardtree-text-faint hover:text-boardtree-text"
            >
              <CloseIcon size={11} />
            </button>
          )}
        </div>
      </div>

      {visible_facets.length === 0 ? (
        <p className="px-5 pb-5 pt-2 text-[13px] text-boardtree-text-muted">
          {trimmed_query ? `No values match "${query.trim()}".` : "No columns selected. Use All columns to pick some."}
        </p>
      ) : (
        <div className="board-filter-scroll flex items-start gap-6 overflow-x-auto px-5 pb-4">
          {visible_facets.map(({ facet, options }) => {
            const selected = toolbar.quick_filter_selections[facet.id] ?? [];
            const excluded = toolbar.quick_filter_exclusions[facet.id] ?? [];
            const has_picks = selected.length + excluded.length > 0;
            const counts = toolbar.quick_filter_counts[facet.id] ?? {};
            const is_expanded = expanded_facet_ids.includes(facet.id) || !!trimmed_query;
            const shown_options = is_expanded ? options : options.slice(0, COLLAPSED_OPTION_COUNT);
            const hidden_count = options.length - shown_options.length;

            return (
              <div key={facet.id} className="flex w-[180px] flex-none flex-col gap-2">
                <div className="flex h-5 items-center justify-between gap-2 pb-0.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium text-boardtree-text-muted">{facet.label}</span>
                    {facet.scope === "subitem" && (
                      <span className="flex-none rounded bg-boardtree-hover-strong px-1 text-[10.5px] font-semibold text-boardtree-text-faint">
                        Subitem
                      </span>
                    )}
                  </span>
                  {has_picks && (
                    <button
                      type="button"
                      onClick={() => toolbar.clearQuickFilterFacet(facet.id)}
                      className="flex-none text-[12px] font-medium text-boardtree-text-faint hover:text-boardtree-text"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {/* Capped height with its own scrollbar so a long facet (e.g. Team) can't blow up the whole panel. */}
                <div className="shell-scrollbar flex max-h-[260px] flex-col gap-2 overflow-y-auto pr-1">
                  {shown_options.map((option) => {
                    const is_selected = selected.includes(option.id);
                    const is_excluded = excluded.includes(option.id);
                    const count = counts[option.id] ?? 0;
                    const person = option.person_id ? findPerson(option.person_id) : undefined;
                    return (
                      <div key={option.id} className="group relative flex-none">
                        <button
                          type="button"
                          // Alt (Option) + click excludes the value instead of picking it.
                          onClick={(event) =>
                            event.altKey
                              ? toolbar.toggleQuickFilterExclusion(facet.id, option.id)
                              : toolbar.toggleQuickFilterOption(facet.id, option.id)
                          }
                          title={is_excluded ? `Excluding ${option.label}` : "Click to filter, Alt+click to exclude"}
                          className={`flex h-[34px] w-full items-center justify-between gap-2 rounded-[7px] border px-[11px] transition-colors ${
                            is_excluded
                              ? "border-[#e2445c] bg-[#e2445c]/10"
                              : is_selected
                                ? "border-boardtree-accent bg-boardtree-accent/10"
                                : "border-boardtree-border-soft bg-boardtree-hover hover:border-boardtree-border hover:bg-boardtree-hover-strong"
                          } ${count === 0 && !is_selected && !is_excluded ? "opacity-50" : ""}`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {is_excluded ? (
                              <span className="flex flex-none text-[#e2445c]">
                                <MinusIcon size={11} />
                              </span>
                            ) : option.dot_color && !person ? (
                              <span className="h-2 w-2 flex-none rounded-full" style={{ background: option.dot_color }} />
                            ) : null}
                            {person ? <PersonAvatar person={person} size={20} /> : null}
                            <span
                              className={`truncate text-[13px] font-medium ${
                                is_excluded ? "text-boardtree-text-muted line-through" : "text-boardtree-text"
                              }`}
                            >
                              {option.label}
                            </span>
                          </span>
                          <span className="flex-none text-[12.5px] font-medium text-boardtree-text-faint group-hover:invisible">{count}</span>
                        </button>
                        {/* Hover actions, over the count: pick only this value, or exclude it. */}
                        <span className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 group-hover:flex">
                          <button
                            type="button"
                            onClick={() => toolbar.selectOnlyQuickFilterOption(facet.id, option.id)}
                            className="rounded px-1.5 py-0.5 text-[11.5px] font-semibold text-boardtree-accent hover:bg-boardtree-surface"
                          >
                            Only
                          </button>
                          <button
                            type="button"
                            onClick={() => toolbar.toggleQuickFilterExclusion(facet.id, option.id)}
                            aria-label={is_excluded ? `Stop excluding ${option.label}` : `Exclude ${option.label}`}
                            title={is_excluded ? "Stop excluding" : "Exclude"}
                            className={`flex h-5 w-5 items-center justify-center rounded hover:bg-boardtree-surface ${
                              is_excluded ? "text-[#e2445c]" : "text-boardtree-text-faint hover:text-[#e2445c]"
                            }`}
                          >
                            <MinusIcon size={11} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                {!trimmed_query && options.length > COLLAPSED_OPTION_COUNT && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(facet.id)}
                    className="self-start text-[12.5px] font-semibold text-boardtree-accent hover:text-boardtree-accent-hover"
                  >
                    {hidden_count > 0 ? `Show ${hidden_count} more` : "Show less"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FilterPanelQuick;
