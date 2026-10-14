"use client";
import React, { useRef, useState } from "react";
import { CheckIcon, CloseIcon, HideIcon } from "@/icons/board-icons";
import { SearchIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import SaveViewButtons from "./SaveViewButtons";
import ToolbarButton from "./ToolbarButton";
import type { ToolbarCheckboxState } from "./ToolbarCheckbox";
import "./filter-panel.css";
import "./toolbar-panel.css";

export type HideColumnsControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  view_actions?: BoardToolbarViewActions;
};

/** Derives the tri-state checkbox for a master row from how many of `ids` are currently hidden. */
const getMasterState = (ids: string[], hidden_column_ids: string[]): ToolbarCheckboxState => {
  const hidden_count = ids.filter((id) => hidden_column_ids.includes(id)).length;
  if (hidden_count === 0) return "checked";
  if (hidden_count === ids.length) return "unchecked";
  return "partial";
};

/** monday style checkbox drawn with the Filter panel tokens: blue when checked, a dash when partly checked. */
const PanelCheckbox: React.FC<{ state: ToolbarCheckboxState }> = ({ state }) => (
  <span className="filter-panel__checkbox" data-checked={state === "checked" ? "true" : state === "partial" ? "partial" : "false"} aria-hidden>
    {state === "checked" && <CheckIcon size={10} />}
    {state === "partial" && <span className="toolbar-panel__checkbox-dash" />}
  </span>
);

/**
 * Hide button and its monday style "Display columns" panel: a search box, an "All columns" master row with the
 * selected count, an "Item columns" group and one checkbox row per column. The list grows with the window (see
 * `toolbar-panel.css`), so long boards show as many columns as fit before scrolling.
 */
function HideColumnsControl<TRow>({ toolbar, view_actions }: HideColumnsControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const is_open = toolbar.active_panel === "hide";

  const hideable_columns = toolbar.columns.filter((column) => column.hideable !== false);
  const hideable_ids = hideable_columns.map((column) => column.id);
  const trimmed_query = query.trim();
  const filtered_columns = hideable_columns.filter((column) =>
    (column.full_label ?? column.label ?? column.id).toLowerCase().includes(trimmed_query.toLowerCase())
  );

  const hidden_count = hideable_ids.filter((id) => toolbar.hidden_column_ids.includes(id)).length;
  const visible_count = hideable_ids.length - hidden_count;
  const master_state = getMasterState(hideable_ids, toolbar.hidden_column_ids);

  const onToggleAll = () => {
    if (master_state === "unchecked") toolbar.showAllColumns();
    else toolbar.hideAllColumns();
  };

  const handleClose = () => {
    toolbar.closePanel();
    setQuery("");
  };

  return (
    <>
      <Tooltip content="Hidden columns" className="flex">
        <ToolbarButton
          ref={button_ref}
          label="Hide"
          Icon={HideIcon}
          is_open={is_open}
          has_selection={toolbar.hidden_column_ids.length > 0}
          variant="accent"
          badge_count={toolbar.hidden_column_ids.length || undefined}
          onClick={() => toolbar.togglePanel("hide")}
        />
      </Tooltip>
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={handleClose} width={340} unstyled>
        <div className="filter-panel toolbar-panel toolbar-panel--compact" role="dialog" aria-label="Display columns">
          <div className="filter-panel__header">
            <h2 className="filter-panel__title">Display columns</h2>
            <div className="filter-panel__header-actions">
              <SaveViewButtons view_actions={view_actions} appearance="panel" is_save_as_new_disabled={hidden_count === 0} />
            </div>
          </div>

          <label className="toolbar-panel__search">
            <SearchIcon size={15} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find columns to show/hide"
              aria-label="Find columns to show or hide"
            />
            {trimmed_query && (
              <button type="button" onClick={() => setQuery("")} className="filter-panel__search-clear" aria-label="Clear search">
                <CloseIcon size={11} />
              </button>
            )}
          </label>

          <div className="toolbar-panel__list filter-panel__scroll">
            {trimmed_query && filtered_columns.length === 0 ? (
              <div className="toolbar-panel__empty">
                <SearchIcon size={22} />
                <span>No columns match &ldquo;{trimmed_query}&rdquo;</span>
              </div>
            ) : (
              <>
                {!trimmed_query && (
                  <>
                    <button type="button" onClick={onToggleAll} className="toolbar-panel__check-row" data-depth="0" aria-pressed={master_state === "checked"}>
                      <PanelCheckbox state={master_state} />
                      <span className="toolbar-panel__check-label" data-strong="true">
                        All columns
                      </span>
                      <span className="toolbar-panel__check-meta">{visible_count} selected</span>
                    </button>
                    <button type="button" onClick={onToggleAll} className="toolbar-panel__check-row" data-depth="0" aria-pressed={master_state === "checked"}>
                      <PanelCheckbox state={master_state} />
                      <span className="toolbar-panel__check-label" data-muted="true">
                        Item columns
                      </span>
                    </button>
                  </>
                )}
                {filtered_columns.map((column) => {
                  const is_checked = !toolbar.hidden_column_ids.includes(column.id);
                  const label = column.full_label ?? column.label ?? column.id;
                  return (
                    <button
                      key={column.id}
                      type="button"
                      onClick={() => toolbar.toggleColumnHidden(column.id)}
                      className="toolbar-panel__check-row"
                      data-depth={trimmed_query ? "0" : "1"}
                      aria-pressed={is_checked}
                      title={label}
                    >
                      <PanelCheckbox state={is_checked ? "checked" : "unchecked"} />
                      {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={20} />}
                      <span className="toolbar-panel__check-label">{label}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </BoardPopover>
    </>
  );
}

export default HideColumnsControl;
