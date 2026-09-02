"use client";
import React, { useState } from "react";
import { EditPencilIcon } from "@/icons/board-icons";
import EditLabelsPanel from "./EditLabelsPanel";
import type { BoardCellOption, BoardOptionActions } from "./OptionPicker";

export type StatusOptionGridProps = {
  /** All options — inactive ones are hidden from the grid unless `selected_id` is already set to one. */
  options: BoardCellOption[];
  selected_id: string | null;
  onPick: (option_id: string | null) => void;
  /** Every option including inactive ones, with description — what "Edit Labels" manages. Falls back to `options` when omitted. */
  full_options?: BoardCellOption[];
  /** Rename/recolor/delete/deactivate/describe an existing option. Supplying this unlocks the "Edit Labels" footer link; omit to hide it. */
  option_actions?: BoardOptionActions;
  /** Creates a new option and resolves to it with its persisted id, shared with {@link EditLabelsPanel}'s own "+ New label" field. */
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
};

/**
 * The Monday-style Status picker: a grid of solid colour pills (a blank grey
 * one first, for "no status") plus an "Edit Labels" footer. Shared by every
 * Status column across the app ({@link "./BoardValueCell"}'s own
 * `StatusCell`), so every Status cell renders identically regardless of
 * which column it belongs to.
 */
const StatusOptionGrid: React.FC<StatusOptionGridProps> = ({
  options,
  selected_id,
  onPick,
  full_options,
  option_actions,
  onCreateOption,
}) => {
  const [is_editing_labels, setIsEditingLabels] = useState(false);

  if (is_editing_labels && option_actions) {
    return (
      <EditLabelsPanel
        options={full_options ?? options}
        actions={option_actions}
        onCreateOption={onCreateOption}
        onDone={() => setIsEditingLabels(false)}
      />
    );
  }

  // Deactivated labels drop out of the grid — unless the cell is already set
  // to one, in which case it stays visible so the assignment remains legible.
  const pickable_options = options.filter((option) => option.is_active !== false || option.id === selected_id);

  return (
    <div className="p-3.5" onClick={(event) => event.stopPropagation()}>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onPick(null)}
          aria-label="Clear status"
          className="flex h-[30px] items-center justify-center rounded text-[11.5px] font-medium hover:brightness-[1.07]"
          style={{ background: "#c9ccd4", color: "#ffffff" }}
        />
        {pickable_options.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => onPick(option.id)}
            className="flex h-[30px] items-center justify-center truncate rounded px-1.5 text-[11.5px] font-medium hover:brightness-[1.07]"
            style={{ background: option.color, color: "#ffffff" }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {option_actions && (
        <>
          <div className="mt-3.5 h-px bg-boardtree-border-soft" />
          <button
            type="button"
            onClick={() => setIsEditingLabels(true)}
            className="flex h-[42px] w-full items-center justify-center gap-2 text-[13.5px] text-boardtree-text-secondary hover:text-boardtree-accent"
          >
            <EditPencilIcon />
            Edit Labels
          </button>
        </>
      )}
    </div>
  );
};

export default StatusOptionGrid;
