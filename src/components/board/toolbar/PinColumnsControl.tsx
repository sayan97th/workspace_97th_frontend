"use client";
import React from "react";
import { PinIcon } from "@/icons/board-icons";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import ToggleSwitch from "./ToggleSwitch";

export type PinColumnsControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  /** Anchor element the popover floats under. Shares the host's "..." overflow button. */
  anchor_el: HTMLElement | null;
  is_open: boolean;
};

/**
 * "Choose columns to pin" popover: lets a board freeze columns to the left edge
 * of the table so they stay visible while scrolling horizontally. Reusable
 * across any board built on {@link useBoardToolbar} — the caller only needs to
 * supply an anchor element (e.g. the toolbar's overflow button).
 */
function PinColumnsControl<TRow>({ toolbar, anchor_el, is_open }: PinColumnsControlProps<TRow>) {
  const pinnable_columns = toolbar.columns.filter((column) => column.pinnable !== false);
  const pin_count = toolbar.pinned_column_ids.length;
  const has_pins = pin_count > 0;

  return (
    <BoardPopover anchor_el={anchor_el} is_open={is_open} onClose={toolbar.closePanel} width={320}>
      <div className="flex items-center gap-2.5 px-[18px] pb-1.5 pt-[15px]">
        <span className="flex flex-none text-[#00c875]">
          <PinIcon size={16} />
        </span>
        <span className="text-[15px] font-bold text-shell-text">Choose columns to pin</span>
      </div>
      <div className="px-[18px] pb-2.5 text-xs leading-relaxed text-shell-text-muted">
        Pinned columns stay fixed on the left while you scroll the table sideways.
      </div>

      <div className="shell-scrollbar max-h-[320px] overflow-y-auto px-2 pb-2">
        {pinnable_columns.map((column) => {
          const is_pinned = toolbar.pinned_column_ids.includes(column.id);
          return (
            <button
              key={column.id}
              type="button"
              onClick={() => toolbar.togglePinnedColumn(column.id)}
              className={`flex h-[42px] w-full items-center gap-[11px] rounded-lg px-2.5 transition-colors ${
                is_pinned ? "bg-[#00c875]/[0.08]" : "hover:bg-shell-hover"
              }`}
            >
              {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={23} />}
              <span className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium text-shell-text">
                {column.full_label ?? column.label ?? column.id}
              </span>
              <ToggleSwitch is_on={is_pinned} />
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-shell-border bg-shell-hover px-[18px] py-[11px]">
        <span className="text-[12.5px] font-semibold text-shell-text-muted">
          {pin_count === 1 ? "1 pinned" : `${pin_count} pinned`}
        </span>
        {has_pins && (
          <button
            type="button"
            onClick={toolbar.unpinAllColumns}
            className="text-[13px] font-semibold text-shell-text-secondary hover:text-shell-text"
          >
            Unpin all
          </button>
        )}
      </div>
    </BoardPopover>
  );
}

export default PinColumnsControl;
