"use client";
import React, { useState } from "react";
import { EditPencilIcon } from "@/icons/board-icons";
import { boardTreeFontClassName } from "../board-tree-font";
import EditLabelsPanel, { STATUS_PICKER_MAX_ROWS } from "./EditLabelsPanel";
import type { BoardCellOption, BoardOptionActions } from "./OptionPicker";
import "./status-label-picker.css";

export type StatusOptionGridProps = {
  /** All options. Inactive ones are hidden from the grid unless `selected_id` is already set to one. */
  options: BoardCellOption[];
  selected_id: string | null;
  onPick: (option_id: string | null) => void;
  /** Every option including inactive ones, with description, which is what "Edit Labels" manages. Falls back to `options` when omitted. */
  full_options?: BoardCellOption[];
  /** Rename/recolor/delete/deactivate/describe an existing option. Supplying this unlocks the "Edit Labels" footer; omit to hide it. */
  option_actions?: BoardOptionActions;
  /** Creates a new option and resolves to it with its persisted id, shared with {@link EditLabelsPanel}'s own "+ New label" field. */
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  /** Labels set on at least one item, which Edit Labels won't let you delete. */
  used_option_ids?: ReadonlySet<string>;
};

/**
 * The monday.com style Status picker: solid label pills in columns of up to
 * six, filled top to bottom, with the blank "no status" pill closing the
 * list, plus an "Edit Labels" footer that swaps the grid for
 * {@link EditLabelsPanel} in place. Renders its own card (see
 * `status-label-picker.css`), so its host popover should be `unstyled`.
 * Shared by every Status column across the app ({@link "./BoardValueCell"}'s
 * own `StatusCell`), so every Status cell renders identically.
 */
const StatusOptionGrid: React.FC<StatusOptionGridProps> = ({
  options,
  selected_id,
  onPick,
  full_options,
  option_actions,
  onCreateOption,
  used_option_ids,
}) => {
  const [is_editing_labels, setIsEditingLabels] = useState(false);

  // Deactivated labels drop out of the grid, unless the cell is already set
  // to one, in which case it stays visible so the assignment remains legible.
  const pickable_options = options.filter((option) => option.is_active !== false || option.id === selected_id);
  // One extra cell for the blank "no status" pill.
  const row_count = Math.min(STATUS_PICKER_MAX_ROWS, pickable_options.length + 1);

  return (
    <div
      className={`status-picker status-picker--card ${boardTreeFontClassName}`}
      onClick={(event) => event.stopPropagation()}
    >
      {is_editing_labels && option_actions ? (
        <EditLabelsPanel
          options={full_options ?? options}
          actions={option_actions}
          onCreateOption={onCreateOption}
          used_option_ids={used_option_ids}
          onDone={() => setIsEditingLabels(false)}
        />
      ) : (
        <>
          <div
            role="listbox"
            aria-label="Status labels"
            className={`status-picker__grid ${option_actions ? "" : "status-picker__grid--last"}`}
            style={{ "--status-picker-rows": row_count } as React.CSSProperties}
          >
            {pickable_options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.id === selected_id}
                key={option.id}
                onClick={() => onPick(option.id)}
                title={option.description || option.label}
                data-inactive={option.is_active === false || undefined}
                className="status-picker__pill"
                style={{ background: option.color }}
              >
                <span className="status-picker__pill-text">{option.label}</span>
              </button>
            ))}
            <button
              type="button"
              role="option"
              aria-selected={selected_id === null}
              onClick={() => onPick(null)}
              aria-label="Clear status"
              className="status-picker__pill status-picker__pill--empty"
            />
          </div>

          {option_actions && (
            <div className="status-picker__footer">
              <button type="button" onClick={() => setIsEditingLabels(true)} className="status-picker__footer-button">
                <EditPencilIcon />
                Edit Labels
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatusOptionGrid;
