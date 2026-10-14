"use client";
import React from "react";
import { CheckIcon } from "@/icons/board-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import SaveViewButtons from "./SaveViewButtons";
import "./filter-panel.css";
import "./toolbar-panel.css";

export type PinColumnsControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  /** Anchor element the popover floats under. Shares the host's "..." overflow button. */
  anchor_el: HTMLElement | null;
  is_open: boolean;
  view_actions?: BoardToolbarViewActions;
};

/**
 * monday style "Choose columns to pin" panel: an "Item columns" list with one checkbox row per column, the item
 * name first (always pinned, so its box is checked and locked), and a "Save as new view" footer. Pinned columns
 * stay fixed on the left while the table scrolls sideways. Shares the Hide panel's compact card (see
 * `toolbar-panel.css`), so long boards scroll inside the list instead of growing past the window.
 */
function PinColumnsControl<TRow>({ toolbar, anchor_el, is_open, view_actions }: PinColumnsControlProps<TRow>) {
  // Columns that are never pinnable but have a title (the item name) always stay frozen, so they show locked.
  const locked_columns = toolbar.columns.filter((column) => column.pinnable === false && (column.full_label ?? column.label));
  const pinnable_columns = toolbar.columns.filter((column) => column.pinnable !== false);
  const pin_count = toolbar.pinned_column_ids.length;

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={toolbar.closePanel} width={300} unstyled>
      <div className="filter-panel toolbar-panel toolbar-panel--compact toolbar-panel--pin" role="dialog" aria-label="Choose columns to pin">
        <div className="filter-panel__header">
          <h2 className="filter-panel__title">Choose columns to pin</h2>
        </div>

        <p className="toolbar-panel__section-title toolbar-panel__section-title--inset">Item columns</p>
        <div className="toolbar-panel__list filter-panel__scroll">
          {locked_columns.map((column) => {
            const label = column.full_label ?? column.label ?? column.id;
            return (
              <Tooltip key={column.id} content="The item name is always pinned" placement="right" className="flex w-full">
                <div className="toolbar-panel__check-row" data-locked="true" aria-disabled="true">
                  {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={20} />}
                  <span className="toolbar-panel__check-label">{label}</span>
                  <span className="filter-panel__checkbox toolbar-panel__check-end" data-checked="locked" aria-hidden>
                    <CheckIcon size={10} />
                  </span>
                </div>
              </Tooltip>
            );
          })}
          {pinnable_columns.length === 0 && <div className="toolbar-panel__empty">No other columns to pin</div>}
          {pinnable_columns.map((column) => {
            const is_pinned = toolbar.pinned_column_ids.includes(column.id);
            const label = column.full_label ?? column.label ?? column.id;
            return (
              <button
                key={column.id}
                type="button"
                role="checkbox"
                aria-checked={is_pinned}
                onClick={() => toolbar.togglePinnedColumn(column.id)}
                className="toolbar-panel__check-row"
                title={label}
              >
                {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={20} />}
                <span className="toolbar-panel__check-label">{label}</span>
                <span className="filter-panel__checkbox toolbar-panel__check-end" data-checked={is_pinned} aria-hidden>
                  {is_pinned && <CheckIcon size={10} />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="toolbar-panel__footer toolbar-panel__footer--pin">
          {pin_count > 0 ? (
            <button type="button" onClick={toolbar.unpinAllColumns} className="filter-panel__text-button">
              Unpin all ({pin_count})
            </button>
          ) : (
            <span className="toolbar-panel__footer-note">No columns pinned</span>
          )}
          <SaveViewButtons view_actions={view_actions} appearance="panel" is_save_as_new_disabled={pin_count === 0} />
        </div>
      </div>
    </BoardPopover>
  );
}

export default PinColumnsControl;
