"use client";
import React, { useRef } from "react";
import { CheckIcon, PinIcon } from "@/icons/board-icons";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import type { BoardRowHeight } from "../types";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import PinColumnsControl from "./PinColumnsControl";
import ToolbarButton from "./ToolbarButton";

export type OverflowControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const ROW_HEIGHT_OPTIONS: { id: BoardRowHeight; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

/** Decorative items matching the design's overflow menu (Conditional coloring, Duplicate view) — inert, same convention as BoardHeader's Integrate/Automate buttons. */
const DECORATIVE_ITEMS = ["Conditional coloring", "Duplicate view"];

function OverflowControl<TRow>({ toolbar }: OverflowControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const is_menu_open = toolbar.active_panel === "overflow";
  const is_pin_open = toolbar.active_panel === "pin";

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label=""
        aria_label="More toolbar actions"
        Icon={MoreDotsIcon}
        is_open={is_menu_open || is_pin_open}
        has_selection={toolbar.pinned_column_ids.length > 0}
        onClick={() => toolbar.togglePanel("overflow")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_menu_open} onClose={toolbar.closePanel} width={220}>
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
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8a9495]">
            Item height
          </div>
          {ROW_HEIGHT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => toolbar.setRowHeight(option.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13.5px] text-[#e9eded] hover:bg-white/[0.08]"
            >
              {option.label}
              {toolbar.row_height === option.id && (
                <CheckIcon size={11} className="flex-none text-brand-500" />
              )}
            </button>
          ))}
          <div className="my-1 h-px bg-white/[0.08]" />
          {DECORATIVE_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={toolbar.closePanel}
              className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-[13.5px] text-[#c7d0d0] hover:bg-white/[0.08]"
            >
              {label}
            </button>
          ))}
        </div>
      </BoardPopover>
      <PinColumnsControl toolbar={toolbar} anchor_el={button_ref.current} is_open={is_pin_open} />
    </>
  );
}

export default OverflowControl;
