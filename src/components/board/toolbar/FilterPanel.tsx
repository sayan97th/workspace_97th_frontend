import React from "react";
import { InfoIcon } from "@/icons/workspace-icons";
import type { BoardSavedFilterActions, BoardToolbarApi, BoardToolbarViewActions } from "./types";
import FilterPanelQuick from "./FilterPanelQuick";
import FilterPanelAdvanced from "./FilterPanelAdvanced";
import SavedFiltersMenu from "./SavedFiltersMenu";
import SaveViewButtons from "./SaveViewButtons";
import ToggleSwitch from "./ToggleSwitch";

export type FilterPanelProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
  saved_filter_actions?: BoardSavedFilterActions;
};

/**
 * Floating panel rendered by BoardToolbar inside a `BoardPopover`, anchored below the button row and spanning its width.
 * No `overflow-hidden` on the container: the column, condition and value pickers are absolutely positioned menus that
 * float past the panel's own edges.
 */
function FilterPanel<TRow>({ toolbar, view_actions, saved_filter_actions }: FilterPanelProps<TRow>) {
  const is_quick = toolbar.filter_mode === "quick";
  const has_filters = toolbar.active_filter_count > 0 || toolbar.advanced_filter_rows.length > 0 || toolbar.advanced_filter_groups.length > 0;
  const has_quick_picks = Object.values(toolbar.quick_filter_selections)
    .concat(Object.values(toolbar.quick_filter_exclusions))
    .some((ids) => ids.length > 0);

  return (
    <div className="rounded-xl border border-boardtree-border bg-boardtree-surface shadow-2xl shadow-black/40">
      <div className="flex flex-wrap items-center gap-3 px-5 pb-3.5 pt-4">
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
        {view_actions?.has_personal_state && view_actions.resetToView && (
          <button
            type="button"
            onClick={view_actions.resetToView}
            title="Drop your remembered changes and show the view as saved"
            className="text-[13.5px] font-medium text-boardtree-text-muted hover:text-boardtree-text"
          >
            Reset to view
          </button>
        )}
        {saved_filter_actions && <SavedFiltersMenu toolbar={toolbar} actions={saved_filter_actions} />}
        <SaveViewButtons view_actions={view_actions} />
      </div>

      {is_quick ? <FilterPanelQuick toolbar={toolbar} /> : <FilterPanelAdvanced toolbar={toolbar} />}

      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 rounded-b-xl border-t border-boardtree-border-soft bg-boardtree-hover px-5 py-3">
        {toolbar.has_subitem_fields && (
          <button
            type="button"
            onClick={() => toolbar.setIncludeSubitems(!toolbar.include_subitems)}
            aria-pressed={toolbar.include_subitems}
            title="Filter by subitem columns too. An item shows when one of its subitems matches, with only the matching subitems under it."
            className="mr-auto flex items-center gap-2 text-[13px] font-medium text-boardtree-text-secondary hover:text-boardtree-text"
          >
            <ToggleSwitch is_on={toolbar.include_subitems} size="sm" />
            Filter subitems
          </button>
        )}
        {is_quick && toolbar.advanced_filter_rows.length + toolbar.advanced_filter_groups.length > 0 && (
          <span className="text-[12.5px] text-boardtree-text-muted">Advanced filters are also applied</span>
        )}
        {is_quick && has_quick_picks && (
          <button
            type="button"
            disabled={!toolbar.can_convert_quick_filters}
            onClick={toolbar.convertQuickFiltersToAdvanced}
            title={
              toolbar.can_convert_quick_filters
                ? "Turn these picks into Advanced filter rules you can edit"
                : "Set the Advanced filters top level to And first"
            }
            className="text-[13.5px] font-semibold text-boardtree-accent hover:text-boardtree-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Convert to advanced filters
          </button>
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
