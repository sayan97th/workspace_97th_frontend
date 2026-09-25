"use client";
import React, { useEffect, useRef, useState } from "react";
import { FilterIcon } from "@/icons/board-icons";
import { buildActiveFilterChips, isNarrowingChip } from "./activeFilterSummary";
import type { BoardToolbarApi } from "./types";
import ToolbarButton from "./ToolbarButton";

export type FilterControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Lines listed in the hover summary before it says "and N more". */
const MAX_SUMMARY_LINES = 8;
/** Hover delay before the summary shows, so moving across the toolbar doesn't flash it. */
const SUMMARY_DELAY_MS = 350;

/**
 * Button only. The (wide) Filter panel itself is rendered by BoardToolbar via a `BoardPopover` anchored to the whole toolbar row instead of this button, since it spans the full row's width.
 * Hovering it while filters apply shows what they are and how many items they leave, without opening the panel.
 */
function FilterControl<TRow>({ toolbar }: FilterControlProps<TRow>) {
  const is_open = toolbar.active_panel === "filter";
  const [is_hovered, setIsHovered] = useState(false);
  const hover_timeout_ref = useRef<number | null>(null);

  useEffect(() => () => {
    if (hover_timeout_ref.current) window.clearTimeout(hover_timeout_ref.current);
  }, []);

  const lines = buildActiveFilterChips(toolbar)
    .filter((chip) => isNarrowingChip(chip) && chip.kind !== "search")
    .map((chip) => chip.label);
  const shown_lines = lines.slice(0, MAX_SUMMARY_LINES);
  const is_summary_shown = is_hovered && !is_open && lines.length > 0;

  const handleMouseEnter = () => {
    hover_timeout_ref.current = window.setTimeout(() => setIsHovered(true), SUMMARY_DELAY_MS);
  };
  const handleMouseLeave = () => {
    if (hover_timeout_ref.current) window.clearTimeout(hover_timeout_ref.current);
    setIsHovered(false);
  };

  return (
    <span className="relative flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <ToolbarButton
        label="Filter"
        Icon={FilterIcon}
        is_open={is_open}
        has_selection={toolbar.active_filter_count > 0}
        variant="accent"
        badge_count={toolbar.active_filter_count || undefined}
        onClick={() => {
          setIsHovered(false);
          toolbar.togglePanel("filter");
        }}
      />
      {is_summary_shown && (
        <div
          role="tooltip"
          className="absolute left-0 top-[calc(100%+6px)] z-[220] w-[300px] rounded-[9px] border border-boardtree-border bg-boardtree-surface px-3.5 py-3 shadow-2xl shadow-black/40"
        >
          <p className="pb-1.5 text-[12px] font-semibold text-boardtree-text-muted">
            Showing {toolbar.visible_row_count} of {toolbar.total_row_count} items
          </p>
          <ul className="flex flex-col gap-1">
            {shown_lines.map((line, index) => (
              <li key={`${line}-${index}`} className="truncate text-[12.5px] text-boardtree-text" title={line}>
                {line}
              </li>
            ))}
          </ul>
          {lines.length > shown_lines.length && (
            <p className="pt-1.5 text-[12px] text-boardtree-text-faint">and {lines.length - shown_lines.length} more</p>
          )}
        </div>
      )}
    </span>
  );
}

export default FilterControl;
