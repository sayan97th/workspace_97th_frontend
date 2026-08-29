"use client";
import React, { useMemo } from "react";
import PersonAvatar from "../PersonAvatar";
import type { BoardQuickFilterFacetOption, BoardToolbarApi } from "./types";

export type FilterPanelQuickProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

function FilterPanelQuick<TRow>({ toolbar }: FilterPanelQuickProps<TRow>) {
  const all_rows = useMemo(
    () => toolbar.default_groups.flatMap((group) => group.rows),
    [toolbar.default_groups]
  );

  const countOption = (facet_id: string, option: BoardQuickFilterFacetOption) => {
    const facet = toolbar.quick_filter_facets.find((f) => f.id === facet_id)!;
    return all_rows.filter((row) => facet.getOptionIds(row).includes(option.id)).length;
  };

  const findPerson = (person_id: string) => toolbar.persons.find((p) => p.id === person_id);

  return (
    <div>
      <div className="px-5 pb-2.5 text-[13.5px] font-semibold text-boardtree-text-secondary">All columns</div>
      <div className="board-filter-scroll flex items-start gap-6 overflow-x-auto px-5 pb-4">
        {toolbar.quick_filter_facets.map((facet) => {
          const selected = toolbar.quick_filter_selections[facet.id] ?? [];
          return (
            <div key={facet.id} className="flex w-[172px] flex-none flex-col gap-2">
              <div className="pb-0.5 text-[13px] font-medium text-boardtree-text-muted">{facet.label}</div>
              {/* Capped height with its own scrollbar so a long facet (e.g. Team) can't blow up the whole panel. */}
              <div className="shell-scrollbar flex max-h-[230px] flex-col gap-2 overflow-y-auto pr-1">
                {facet.options.map((option) => {
                  const is_selected = selected.includes(option.id);
                  const person = option.person_id ? findPerson(option.person_id) : undefined;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toolbar.toggleQuickFilterOption(facet.id, option.id)}
                      className={`flex h-[34px] flex-none items-center justify-between gap-2 rounded-[7px] border px-[11px] transition-colors ${
                        is_selected
                          ? "border-boardtree-accent bg-boardtree-accent/10"
                          : "border-boardtree-border-soft bg-boardtree-hover hover:border-boardtree-border hover:bg-boardtree-hover-strong"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {option.dot_color ? (
                          <span
                            className="h-2 w-2 flex-none rounded-full"
                            style={{ background: option.dot_color }}
                          />
                        ) : null}
                        {person ? <PersonAvatar person={person} size={20} /> : null}
                        <span className="truncate text-[13px] font-medium text-boardtree-text">
                          {option.label}
                        </span>
                      </span>
                      <span className="flex-none text-[12.5px] font-medium text-boardtree-text-faint">
                        {countOption(facet.id, option)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FilterPanelQuick;
