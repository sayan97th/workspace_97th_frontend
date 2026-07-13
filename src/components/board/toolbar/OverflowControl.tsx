"use client";
import React, { useRef } from "react";
import { CheckIcon } from "@/icons/board-icons";
import { MoreDotsIcon } from "@/icons/workspace-icons";
import type { BoardRowHeight } from "../types";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ToolbarButton from "./ToolbarButton";

export type OverflowControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const ROW_HEIGHT_OPTIONS: { id: BoardRowHeight; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "medium", label: "Medium" },
  { id: "large", label: "Large" },
];

/** Decorative items matching the design's overflow menu (Pin column, Conditional coloring, Duplicate view) — inert, same convention as BoardHeader's Integrate/Automate buttons. */
const DECORATIVE_ITEMS = ["Pin column", "Conditional coloring", "Duplicate view"];

function OverflowControl<TRow>({ toolbar }: OverflowControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const is_open = toolbar.active_panel === "overflow";

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label=""
        aria_label="More toolbar actions"
        Icon={MoreDotsIcon}
        is_open={is_open}
        onClick={() => toolbar.togglePanel("overflow")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={220}>
        <div className="p-1.5">
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
    </>
  );
}

export default OverflowControl;
