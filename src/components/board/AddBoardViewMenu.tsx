"use client";
import React from "react";
import BoardPopover from "./toolbar/BoardPopover";
import { BOARD_VIEW_TYPES, type BoardViewTypeOption } from "./boardViewTypes";

export type AddBoardViewMenuProps = {
  /** The "+" tab-bar button the menu is anchored beneath. */
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  /** Fired with the chosen type; the caller creates the tab. The menu closes itself first. */
  onSelectType: (type: BoardViewTypeOption) => void;
  /** Override the offered types (defaults to {@link BOARD_VIEW_TYPES}). */
  types?: BoardViewTypeOption[];
};

/**
 * Monday-style "Board views" picker shown from a board's tab-bar "+" button —
 * lets the user choose what *kind* of tab to add (Table, Kanban, …), so the
 * new tab renders through the matching component instead of always being
 * another table. Purely presentational: it reports the chosen
 * {@link BoardViewTypeOption} and lets the consumer own creation, mirroring
 * {@link import("./AddColumnMenu").default}'s column-type picker.
 */
const AddBoardViewMenu: React.FC<AddBoardViewMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  onSelectType,
  types = BOARD_VIEW_TYPES,
}) => {
  const handleSelect = (type: BoardViewTypeOption) => {
    onSelectType(type);
    onClose();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={280}>
      <div className="flex flex-col gap-1 p-2">
        <span className="px-1.5 pb-1 pt-0.5 text-[11.5px] font-semibold uppercase tracking-wide text-shell-text-faint">
          Board views
        </span>
        {types.map((type) => (
          <button
            key={type.kind}
            type="button"
            title={type.description}
            onClick={() => handleSelect(type)}
            className="flex items-center gap-2.5 rounded-[7px] px-2 py-2 text-left transition-colors hover:bg-shell-hover"
          >
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] bg-shell-hover text-shell-text-muted">
              <type.Icon size={15} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium text-shell-text">{type.label}</span>
              <span className="truncate text-[11.5px] text-shell-text-faint">{type.description}</span>
            </span>
            {!type.is_available && (
              <span className="flex-none rounded-full bg-brand-500/[0.14] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-200">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>
    </BoardPopover>
  );
};

export default AddBoardViewMenu;
