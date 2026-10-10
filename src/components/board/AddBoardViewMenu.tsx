"use client";
import React, { useEffect, useRef } from "react";
import { InfoIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import BoardPopover from "./toolbar/BoardPopover";
import { BOARD_VIEW_TYPES, type BoardViewTypeOption } from "./boardViewTypes";
import "./monday-palette.css";

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
 * Monday-style "Board views" picker shown from a board's tab-bar "+" button.
 * Lets the user choose what *kind* of tab to add (Table, Kanban, …), so the
 * new tab renders through the matching component instead of always being
 * another table. Rows are a compact icon and label, as on monday; each
 * kind's description shows as the row's tooltip. Purely presentational: it
 * reports the chosen {@link BoardViewTypeOption} and lets the consumer own
 * creation, mirroring {@link import("./AddColumnMenu").default}'s column-type
 * picker. The Up/Down arrow keys move between rows.
 */
const AddBoardViewMenu: React.FC<AddBoardViewMenuProps> = ({
  anchor_el,
  is_open,
  onClose,
  onSelectType,
  types = BOARD_VIEW_TYPES,
}) => {
  const list_ref = useRef<HTMLDivElement>(null);

  // Focuses the first row on open, so the menu is usable from the keyboard right away.
  useEffect(() => {
    if (!is_open) return;
    const frame = window.requestAnimationFrame(() => {
      list_ref.current?.querySelector<HTMLButtonElement>("[role='menuitem']")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [is_open]);

  const handleSelect = (type: BoardViewTypeOption) => {
    onSelectType(type);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(list_ref.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") ?? []);
    if (items.length === 0) return;
    event.preventDefault();
    const current_index = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(current_index + step + items.length) % items.length].focus();
  };

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={onClose} align="start" width={280} unstyled>
      <div
        role="menu"
        aria-label="Board views"
        onKeyDown={handleKeyDown}
        className="board-chrome-theme rounded-[8px] border border-shell-border bg-shell-panel py-2 text-shell-text shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center justify-between px-4 pb-1 pt-1">
          <span className="text-[14px] leading-5 text-shell-text-secondary">Board views</span>
          <Tooltip content="Each view shows this board's items in a different way" placement="left" className="flex">
            <span className="flex h-6 w-6 items-center justify-center text-shell-text-secondary" aria-hidden="true">
              <InfoIcon size={14} />
            </span>
          </Tooltip>
        </div>

        <div ref={list_ref} className="shell-scrollbar flex max-h-[420px] flex-col overflow-y-auto px-2">
          {types.map((type) => (
            <button
              key={type.kind}
              type="button"
              role="menuitem"
              title={type.description}
              onClick={() => handleSelect(type)}
              className="flex h-8 flex-none items-center gap-2 rounded-[4px] px-2 text-left text-board-nav text-shell-text outline-none transition-colors hover:bg-shell-hover focus-visible:bg-shell-hover"
            >
              <type.Icon size={16} className="flex-none text-shell-text" />
              <span className="min-w-0 flex-1 truncate">{type.label}</span>
              {type.is_new && (
                <span className="flex-none rounded-[4px] border border-boardtree-accent px-1.5 text-[14px] leading-5 text-boardtree-accent">
                  New
                </span>
              )}
              {!type.is_available && (
                <span className="flex-none rounded-[4px] border border-shell-border-strong px-1.5 text-[12px] leading-[18px] text-shell-text-secondary">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </BoardPopover>
  );
};

export default AddBoardViewMenu;
