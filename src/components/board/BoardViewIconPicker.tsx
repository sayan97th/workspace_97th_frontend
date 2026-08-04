"use client";
import React from "react";
import BoardPopover from "./toolbar/BoardPopover";
import { BOARD_VIEW_ICON_OPTIONS } from "./boardViewIcons";

export type BoardViewIconPickerProps = {
  anchor_el: HTMLElement | null;
  is_open: boolean;
  onClose: () => void;
  current_icon: string | null;
  onSelect: (icon_id: string | null) => void;
};

/**
 * Icon grid opened from a tab's glyph — lets any board view (Client Hub's
 * real tabs and the generic `TableBoardView` engine's) be assigned one of
 * {@link BOARD_VIEW_ICON_OPTIONS}, or cleared back to the default. Shares
 * `BoardPopover` with the rest of the toolbar's controls for consistent
 * anchor positioning, outside-click and Escape handling.
 */
const BoardViewIconPicker: React.FC<BoardViewIconPickerProps> = ({
  anchor_el,
  is_open,
  onClose,
  current_icon,
  onSelect,
}) => (
  <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} width={216} align="start">
    <div className="p-2.5">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="font-mono-accent text-[11px] tracking-[0.05em] text-shell-text-muted">
          TAB ICON
        </span>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className="text-[11.5px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {BOARD_VIEW_ICON_OPTIONS.map((option) => {
          const is_selected = option.id === current_icon;
          return (
            <button
              key={option.id}
              type="button"
              title={option.label}
              aria-label={option.label}
              onClick={() => {
                onSelect(option.id);
                onClose();
              }}
              className={
                is_selected
                  ? "flex h-8 w-8 items-center justify-center rounded-[7px] bg-brand-500/[0.16] text-brand-200"
                  : "flex h-8 w-8 items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
              }
            >
              <option.Icon size={14} />
            </button>
          );
        })}
      </div>
    </div>
  </BoardPopover>
);

export default BoardViewIconPicker;
