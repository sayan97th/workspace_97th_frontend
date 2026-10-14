import React from "react";
import { HelpIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./types";
import FilterPanelQuick from "./FilterPanelQuick";
import FilterPanelAdvanced from "./FilterPanelAdvanced";
import SaveViewButtons from "./SaveViewButtons";
import ToggleSwitch from "./ToggleSwitch";
import "./field-menu.css";
import "./filter-panel.css";

export type FilterPanelProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
};

/** "Showing all of 5 items" while nothing narrows the board, "Showing 4 of 5 items" otherwise, as on monday. */
const showingLabel = (visible_count: number, total_count: number) =>
  visible_count === total_count ? `Showing all of ${total_count} items` : `Showing ${visible_count} of ${total_count} items`;

/**
 * Floating panel rendered by BoardToolbar inside a `BoardPopover`, anchored below the button row and spanning its width.
 * Styled by `filter-panel.css` (panel) and `field-menu.css` (Advanced filters fields). No `overflow: hidden` on the
 * container: the column, condition and value pickers are absolutely positioned menus that float past the panel's own
 * edges. Saved filters live in the Filter button's split chevron (see `FilterControl`).
 */
function FilterPanel<TRow>({ toolbar, view_actions }: FilterPanelProps<TRow>) {
  const is_quick = toolbar.filter_mode === "quick";
  const has_filters = toolbar.active_filter_count > 0 || toolbar.advanced_filter_rows.length > 0 || toolbar.advanced_filter_groups.length > 0;
  const has_quick_picks = Object.values(toolbar.quick_filter_selections)
    .concat(Object.values(toolbar.quick_filter_exclusions))
    .some((ids) => ids.length > 0);
  const has_advanced_rules = toolbar.advanced_filter_rows.length + toolbar.advanced_filter_groups.length > 0;

  return (
    <div className="filter-panel" role="dialog" aria-label={is_quick ? "Quick filters" : "Advanced filters"}>
      <div className="filter-panel__header">
        <h2 className="filter-panel__title">{is_quick ? "Quick filters" : "Advanced filters"}</h2>
        <span className="filter-panel__count">{showingLabel(toolbar.visible_row_count, toolbar.total_row_count)}</span>
        <Tooltip
          placement="bottom"
          content="Filters narrow the items shown on this board. Save them to the view to share them with everyone."
        >
          <span className="filter-panel__help" tabIndex={0} aria-label="About filters">
            <HelpIcon size={16} />
          </span>
        </Tooltip>

        <div className="filter-panel__header-actions">
          {view_actions?.has_personal_state && view_actions.resetToView && (
            <Tooltip placement="bottom" content="Drop your remembered changes and show the view as saved">
              <button type="button" onClick={view_actions.resetToView} className="filter-panel__text-button">
                Reset to view
              </button>
            </Tooltip>
          )}
          <button type="button" disabled={!has_filters} onClick={toolbar.clearAllFilters} className="filter-panel__text-button">
            Clear all
          </button>
          <SaveViewButtons view_actions={view_actions} appearance="panel" is_save_as_new_disabled={!has_filters} />
        </div>
      </div>

      {is_quick ? <FilterPanelQuick toolbar={toolbar} /> : <FilterPanelAdvanced toolbar={toolbar} />}

      <div className="filter-panel__footer">
        {toolbar.has_subitem_fields && (
          <Tooltip
            className="filter-panel__subitems-slot"
            content="Filter by subitem columns too. An item shows when one of its subitems matches, with only the matching subitems under it."
          >
            <button
              type="button"
              onClick={() => toolbar.setIncludeSubitems(!toolbar.include_subitems)}
              aria-pressed={toolbar.include_subitems}
              className="filter-panel__text-button"
            >
              <ToggleSwitch is_on={toolbar.include_subitems} size="sm" />
              Filter subitems
            </button>
          </Tooltip>
        )}
        {is_quick && has_advanced_rules && <span className="filter-panel__footer-note">Advanced filters are also applied</span>}
        {is_quick && has_quick_picks && (
          <Tooltip
            content={
              toolbar.can_convert_quick_filters
                ? "Turn these picks into Advanced filter rules you can edit"
                : "Set the Advanced filters top level to And first"
            }
          >
            <button
              type="button"
              disabled={!toolbar.can_convert_quick_filters}
              onClick={toolbar.convertQuickFiltersToAdvanced}
              className="filter-panel__text-button filter-panel__convert-button"
            >
              Convert to advanced filters
            </button>
          </Tooltip>
        )}
        <button
          type="button"
          onClick={() => toolbar.setFilterMode(is_quick ? "advanced" : "quick")}
          className="filter-panel__text-button"
        >
          Switch to {is_quick ? "advanced" : "quick"} filters
        </button>
      </div>
    </div>
  );
}

export default FilterPanel;
