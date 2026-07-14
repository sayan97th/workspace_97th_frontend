"use client";
import React, { useRef, useState } from "react";
import { ColorFillIcon, EditPencilIcon, ItemHeightIcon, PinIcon, RowHeightIcon } from "@/icons/board-icons";
import { ChevronRightIcon, MoreDotsIcon } from "@/icons/workspace-icons";
import type { BoardRowHeight } from "../types";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import MenuFlyout from "./MenuFlyout";
import PinColumnsControl from "./PinColumnsControl";
import ToolbarButton from "./ToolbarButton";

export type OverflowControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Selected-row accent used by the "..." menu and its "Item height" submenu, matching the design's active-state blue. */
const MENU_ACTIVE_BG = "#2b6fe0";

const ROW_HEIGHT_OPTIONS: { id: BoardRowHeight; label: string; lines: 1 | 2 | 3 }[] = [
  { id: "single", label: "Single", lines: 1 },
  { id: "double", label: "Double", lines: 2 },
  { id: "triple", label: "Triple", lines: 3 },
];

function OverflowControl<TRow>({ toolbar }: OverflowControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const height_row_ref = useRef<HTMLButtonElement>(null);
  const [is_height_sub_open, setIsHeightSubOpen] = useState(false);
  const is_menu_open = toolbar.active_panel === "overflow";
  const is_pin_open = toolbar.active_panel === "pin";
  const is_color_open = toolbar.active_panel === "color";
  const has_color_rules = toolbar.conditional_color_rules.length > 0;
  const is_height_sub_shown = is_menu_open && is_height_sub_open;

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label=""
        aria_label="More toolbar actions"
        Icon={MoreDotsIcon}
        is_open={is_menu_open || is_pin_open || is_color_open}
        has_selection={toolbar.pinned_column_ids.length > 0}
        onClick={() => {
          toolbar.togglePanel("overflow");
          setIsHeightSubOpen(false);
        }}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_menu_open} onClose={toolbar.closePanel} width={236}>
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => toolbar.openPanel("pin")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] text-[#e9eded] hover:bg-white/[0.08]"
          >
            <span className="flex flex-none text-[#9aa4a5]">
              <PinIcon size={15} />
            </span>
            Pin columns
            {toolbar.pinned_column_ids.length > 0 && (
              <span className="ml-auto flex-none text-[12.5px] font-medium text-[#7e8889]">
                {toolbar.pinned_column_ids.length}
              </span>
            )}
          </button>

          <button
            ref={height_row_ref}
            type="button"
            onClick={() => setIsHeightSubOpen((current) => !current)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors ${
              is_height_sub_shown ? "" : "hover:bg-white/[0.08]"
            }`}
            style={{
              color: is_height_sub_shown ? "#fff" : "#e9eded",
              background: is_height_sub_shown ? MENU_ACTIVE_BG : "transparent",
            }}
          >
            <span className="flex flex-none" style={{ color: is_height_sub_shown ? "#fff" : "#9aa4a5" }}>
              <ItemHeightIcon size={15} />
            </span>
            Item height
            <span className="ml-auto flex flex-none rotate-180" style={{ color: is_height_sub_shown ? "#fff" : "#9aa4a5" }}>
              <ChevronRightIcon size={11} />
            </span>
          </button>

          <div className="my-1 h-px bg-white/[0.08]" />
          <button
            type="button"
            onClick={() => toolbar.openPanel("color")}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] text-[#e9eded] hover:bg-white/[0.08]"
          >
            <span className="flex flex-none text-[#9aa4a5]">
              <ColorFillIcon size={15} />
            </span>
            Conditional coloring
            {has_color_rules && (
              <span className="ml-auto flex-none text-[12.5px] font-medium text-[#7e8889]">
                {toolbar.conditional_color_rules.length}
              </span>
            )}
          </button>
          {/* Decorative, matching the design's disabled "Default item values" entry — same convention as BoardHeader's Integrate/Automate buttons. */}
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] text-[#5a6667]"
          >
            <span className="flex flex-none text-[#4e5b5b]">
              <EditPencilIcon size={15} />
            </span>
            Default item values
          </button>
        </div>
      </BoardPopover>

      {/* Item height submenu: opens to the left of the "..." menu, matching the source design. */}
      <MenuFlyout
        anchor_el={height_row_ref.current}
        is_open={is_height_sub_shown}
        onClose={() => setIsHeightSubOpen(false)}
        side="left"
        width={196}
      >
        <div className="p-1.5">
          {ROW_HEIGHT_OPTIONS.map((option) => {
            const is_selected = toolbar.row_height === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  toolbar.setRowHeight(option.id);
                  setIsHeightSubOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                  is_selected ? "" : "hover:bg-white/[0.08]"
                }`}
                style={{
                  color: is_selected ? "#fff" : "#e4e9e9",
                  background: is_selected ? MENU_ACTIVE_BG : "transparent",
                }}
              >
                <span className="flex flex-none" style={{ color: is_selected ? "#fff" : "#9aa4a5" }}>
                  <RowHeightIcon size={16} lines={option.lines} />
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      </MenuFlyout>

      <PinColumnsControl toolbar={toolbar} anchor_el={button_ref.current} is_open={is_pin_open} />
    </>
  );
}

export default OverflowControl;
