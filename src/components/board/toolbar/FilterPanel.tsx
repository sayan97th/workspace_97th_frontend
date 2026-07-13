import React from "react";
import type { BoardToolbarApi } from "./types";
import FilterPanelQuick from "./FilterPanelQuick";
import FilterPanelAdvanced from "./FilterPanelAdvanced";

export type FilterPanelProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Inline banner rendered by BoardToolbar below the button row — pushes the table down, unlike the other popovers. */
function FilterPanel<TRow>({ toolbar }: FilterPanelProps<TRow>) {
  const is_quick = toolbar.filter_mode === "quick";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a1717]">
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-4">
        <span className="text-[16px] font-bold text-[#f2f4fb]">
          {is_quick ? "Quick filters" : "Advanced filters"}
        </span>
        <span className="text-[13.5px] text-[#8a9495]">
          Showing {toolbar.visible_row_count} of {toolbar.total_row_count} items
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={toolbar.clearAllFilters}
          className="text-[13.5px] font-medium text-[#9aa2c4] hover:text-white"
        >
          Clear all
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/[0.16] px-3.5 py-1.5 text-[13px] font-semibold text-[#c8cee6] hover:border-white/[0.34]"
        >
          Save as new view
        </button>
      </div>

      {is_quick ? <FilterPanelQuick toolbar={toolbar} /> : <FilterPanelAdvanced toolbar={toolbar} />}

      <div className="flex justify-end border-t border-white/[0.07] bg-black/10 px-5 py-3">
        <button
          type="button"
          onClick={() => toolbar.setFilterMode(is_quick ? "advanced" : "quick")}
          className="text-[13.5px] font-semibold text-[#c3cae6] hover:text-white"
        >
          Switch to {is_quick ? "advanced" : "quick"} filters
        </button>
      </div>
    </div>
  );
}

export default FilterPanel;
