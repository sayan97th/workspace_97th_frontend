"use client";
import React, { useEffect, useState } from "react";
import { CloseIcon } from "@/icons/board-icons";
import { ACTIVE_FILTER_CHIP_PANELS, buildActiveFilterChips, isNarrowingChip, type ActiveFilterChip } from "./activeFilterSummary";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./types";

export type ActiveFiltersBarProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
};

/** Browser key for the viewer's own "collapse the summary" choice. A per viewer convenience only, so losing it is harmless. */
const COLLAPSED_STORAGE_KEY = "board_toolbar_summary_collapsed";

const readCollapsed = () => {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const writeCollapsed = (value: boolean) => {
  try {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Storage can be blocked (private mode), the choice then lasts for this page only.
  }
};

/**
 * Summary strip under the toolbar: one removable chip per active filter
 * (Search, Person, each Quick filters facet, each Advanced rule or group) plus
 * the current Sort and Group by, the "Showing X of Y items" count and a Clear
 * filters shortcut. It collapses into a single line on demand, and offers
 * "Reset to view" while the viewer's remembered changes are applied. Hidden
 * while nothing narrows or reorders the board.
 */
function ActiveFiltersBar<TRow>({ toolbar, view_actions }: ActiveFiltersBarProps<TRow>) {
  const [is_collapsed, setIsCollapsed] = useState(false);
  useEffect(() => setIsCollapsed(readCollapsed()), []);

  const chips = buildActiveFilterChips(toolbar);
  const filter_chip_count = chips.filter(isNarrowingChip).length;
  const advanced_item_count = chips.filter((chip) => chip.kind === "advanced").length;
  const can_reset = !!(view_actions?.has_personal_state && view_actions.resetToView);

  if (!chips.length && !can_reset) return null;

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      writeCollapsed(!current);
      return !current;
    });
  };

  const openChipPanel = (chip: ActiveFilterChip) => {
    if (chip.kind === "search") {
      toolbar.openSearch();
      toolbar.focusSearch();
      return;
    }
    if (chip.kind === "advanced") toolbar.setFilterMode("advanced");
    if (chip.kind === "quick") toolbar.setFilterMode("quick");
    toolbar.openPanel(ACTIVE_FILTER_CHIP_PANELS[chip.kind]);
  };

  const trailing = (
    <>
      {filter_chip_count > 0 && (
        <>
          <span className="ml-1 text-[12.5px] text-boardtree-text-muted">
            Showing {toolbar.visible_row_count} of {toolbar.total_row_count} items
          </span>
          <button
            type="button"
            onClick={toolbar.resetAllFilters}
            className="text-[12.5px] font-semibold text-boardtree-accent hover:text-boardtree-accent-hover"
          >
            Clear filters
          </button>
        </>
      )}
      {can_reset && (
        <button
          type="button"
          onClick={view_actions!.resetToView}
          title="Your unsaved changes to this view are remembered for you. Reset to show the view as saved."
          className="text-[12.5px] font-semibold text-boardtree-text-secondary hover:text-boardtree-text"
        >
          Reset to view
        </button>
      )}
      {chips.length > 0 && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="text-[12.5px] font-medium text-boardtree-text-faint hover:text-boardtree-text"
        >
          {is_collapsed ? "Show details" : "Hide details"}
        </button>
      )}
    </>
  );

  if (is_collapsed) {
    const setting_count = chips.length;
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {setting_count > 0 && (
          <span className="flex h-7 items-center rounded-full border border-boardtree-border bg-boardtree-hover px-3 text-[12.5px] font-medium text-boardtree-text">
            {setting_count === 1 ? "1 setting applied" : `${setting_count} settings applied`}
          </span>
        )}
        {trailing}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="flex h-7 max-w-[340px] items-center gap-1 rounded-full border border-boardtree-border bg-boardtree-hover pl-3 pr-1 text-[12.5px] font-medium text-boardtree-text"
        >
          <button type="button" onClick={() => openChipPanel(chip)} className="min-w-0 truncate text-left hover:text-boardtree-accent" title={chip.label}>
            {chip.label}
          </button>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove ${chip.label}`}
            className="flex h-5 w-5 flex-none items-center justify-center rounded-full text-boardtree-text-faint hover:bg-boardtree-hover-strong hover:text-boardtree-text"
          >
            <CloseIcon size={9} />
          </button>
        </span>
      ))}

      {toolbar.advanced_filter_operator === "or" && advanced_item_count > 1 && (
        <span className="text-[12px] font-medium text-boardtree-text-muted">Advanced rules match any</span>
      )}

      {trailing}
    </div>
  );
}

export default ActiveFiltersBar;
