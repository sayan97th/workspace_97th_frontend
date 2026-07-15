import React from "react";
import { InfoIcon } from "@/icons/workspace-icons";
import type { BoardToolbarApi } from "./types";
import FilterPanelQuick from "./FilterPanelQuick";
import FilterPanelAdvanced from "./FilterPanelAdvanced";

export type FilterPanelProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Floating panel rendered by BoardToolbar, anchored below the button row — mirrors the Person/Sort/Group by popovers. */
function FilterPanel<TRow>({ toolbar }: FilterPanelProps<TRow>) {
  const is_quick = toolbar.filter_mode === "quick";

  return (
    <div className="overflow-hidden rounded-xl border border-shell-border-strong bg-shell-panel shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-4">
        <span className="text-[16px] font-bold text-shell-text">
          {is_quick ? "Quick filters" : "Advanced filters"}
        </span>
        <span className="text-[13.5px] text-shell-text-muted">
          Showing {toolbar.visible_row_count} of {toolbar.total_row_count} items
        </span>
        <span className="flex flex-none items-center text-shell-text-faint" title="Filters narrow the items shown in this board">
          <InfoIcon size={15} />
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={toolbar.clearAllFilters}
          className="text-[13.5px] font-medium text-shell-text-muted hover:text-shell-text"
        >
          Clear all
        </button>
        <button
          type="button"
          className="rounded-lg border border-shell-border-strong px-3.5 py-1.5 text-[13px] font-semibold text-shell-text-secondary hover:border-shell-text-faint"
        >
          Save as new view
        </button>
      </div>

      {is_quick ? <FilterPanelQuick toolbar={toolbar} /> : <FilterPanelAdvanced toolbar={toolbar} />}

      <div className="flex justify-end border-t border-shell-border bg-shell-hover px-5 py-3">
        <button
          type="button"
          onClick={() => toolbar.setFilterMode(is_quick ? "advanced" : "quick")}
          className="text-[13.5px] font-semibold text-shell-text-secondary hover:text-shell-text"
        >
          Switch to {is_quick ? "advanced" : "quick"} filters
        </button>
      </div>
    </div>
  );
}

export default FilterPanel;
