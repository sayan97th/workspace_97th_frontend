import React from "react";
import { InfoIcon } from "@/icons/workspace-icons";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./types";
import FilterPanelQuick from "./FilterPanelQuick";
import FilterPanelAdvanced from "./FilterPanelAdvanced";
import SaveViewButtons from "./SaveViewButtons";

export type FilterPanelProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
};

/**
 * Floating panel rendered by BoardToolbar inside a `BoardPopover`, anchored below the button row and spanning its width.
 * No `overflow-hidden` on the container: the column, condition and value pickers are absolutely positioned menus that
 * float past the panel's own edges.
 */
function FilterPanel<TRow>({ toolbar, view_actions }: FilterPanelProps<TRow>) {
  const is_quick = toolbar.filter_mode === "quick";
  const has_filters = toolbar.active_filter_count > 0 || toolbar.advanced_filter_rows.length > 0 || toolbar.advanced_filter_groups.length > 0;

  return (
    <div className="rounded-xl border border-boardtree-border bg-boardtree-surface shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-4">
        <span className="text-[16px] font-bold text-boardtree-text">
          {is_quick ? "Quick filters" : "Advanced filters"}
        </span>
        <span className="text-[13.5px] text-boardtree-text-muted">
          Showing {toolbar.visible_row_count} of {toolbar.total_row_count} items
        </span>
        <span className="flex flex-none items-center text-boardtree-text-faint" title="Filters narrow the items shown in this board">
          <InfoIcon size={15} />
        </span>
        <div className="flex-1" />
        {has_filters && (
          <button
            type="button"
            onClick={toolbar.clearAllFilters}
            className="text-[13.5px] font-medium text-boardtree-text-muted hover:text-boardtree-text"
          >
            Clear all
          </button>
        )}
        <SaveViewButtons view_actions={view_actions} />
      </div>

      {is_quick ? <FilterPanelQuick toolbar={toolbar} /> : <FilterPanelAdvanced toolbar={toolbar} />}

      <div className="flex items-center justify-end gap-3 rounded-b-xl border-t border-boardtree-border-soft bg-boardtree-hover px-5 py-3">
        {is_quick && toolbar.advanced_filter_rows.length + toolbar.advanced_filter_groups.length > 0 && (
          <span className="text-[12.5px] text-boardtree-text-muted">Advanced filters are also applied</span>
        )}
        <button
          type="button"
          onClick={() => toolbar.setFilterMode(is_quick ? "advanced" : "quick")}
          className="text-[13.5px] font-semibold text-boardtree-text-secondary hover:text-boardtree-text"
        >
          Switch to {is_quick ? "advanced" : "quick"} filters
        </button>
      </div>
    </div>
  );
}

export default FilterPanel;
