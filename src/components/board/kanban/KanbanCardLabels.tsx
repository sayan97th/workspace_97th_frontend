"use client";
import React, { useState } from "react";
import { PlusIcon } from "@/icons/board-icons";
import BoardPopover from "../toolbar/BoardPopover";
import OptionPicker, { type BoardCellOption, type BoardOptionActions } from "../cells/OptionPicker";
import { KANBAN_COLORS, kanbanTint } from "./kanbanDesign";

export type KanbanCardLabelsProps = {
  options: BoardCellOption[];
  selected_ids: string[];
  onToggle: (option_id: string) => void;
  onCreateOption?: (option: { label: string; color: string }) => Promise<BoardCellOption | null>;
  onEditOptions?: BoardOptionActions;
};

/**
 * Trello-style colored label pills for a Kanban card's "Labels" column
 * (the board's first `tags` column — see `TableBoardView`'s `renderKanbanCard`).
 * Reuses the same `OptionPicker` every status/dropdown cell edits through, just
 * with the closed-state pills carrying each option's own color instead of the
 * generic `ProductTag` chip — owns its own popover state so each card instance
 * is independent.
 */
const KanbanCardLabels: React.FC<KanbanCardLabelsProps> = ({ options, selected_ids, onToggle, onCreateOption, onEditOptions }) => {
  const [anchor_el, setAnchorEl] = useState<HTMLElement | null>(null);
  const selected = selected_ids
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is BoardCellOption => Boolean(option));

  const openPicker = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  return (
    <div onClick={openPicker} className="flex flex-wrap items-center gap-1">
      {selected.length > 0 ? (
        selected.map((label) => (
          <span
            key={label.id}
            className="max-w-[170px] cursor-pointer truncate rounded-[6px] px-2 py-[3px] text-[11px] font-bold transition-opacity hover:opacity-80"
            style={{ background: kanbanTint(label.color), color: label.color }}
          >
            {label.label}
          </span>
        ))
      ) : (
        <button
          type="button"
          className="flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium opacity-0 transition-opacity hover:bg-shell-hover group-hover:opacity-100"
          style={{ color: KANBAN_COLORS.text_placeholder }}
        >
          <PlusIcon size={9} />
          Add label
        </button>
      )}
      <BoardPopover anchor_el={anchor_el} is_open={anchor_el !== null} onClose={() => setAnchorEl(null)} align="start" width={240}>
        <OptionPicker
          options={options}
          selected_ids={selected_ids}
          multi
          onToggle={onToggle}
          onClear={() => {}}
          onCreateOption={onCreateOption}
          option_actions={onEditOptions}
        />
      </BoardPopover>
    </div>
  );
};

export default KanbanCardLabels;
