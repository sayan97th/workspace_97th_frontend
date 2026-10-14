"use client";
import React, { useEffect, useRef, useState } from "react";
import { FilterIcon } from "@/icons/board-icons";
import { ChevronDownIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
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
 * Like monday, it is a split button: the button opens Quick filters and the chevron opens Advanced filters.
 * Clicking the half whose mode is already showing closes the panel; the other half switches the mode in place.
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
  const has_filters = toolbar.active_filter_count > 0;
  const is_advanced_open = is_open && toolbar.filter_mode === "advanced";

  const openFilterMode = (mode: "quick" | "advanced") => {
    setIsHovered(false);
    if (is_open && toolbar.filter_mode === mode) {
      toolbar.closePanel();
      return;
    }
    toolbar.setFilterMode(mode);
    toolbar.openPanel("filter");
  };

  const handleMouseEnter = () => {
    hover_timeout_ref.current = window.setTimeout(() => setIsHovered(true), SUMMARY_DELAY_MS);
  };
  const handleMouseLeave = () => {
    if (hover_timeout_ref.current) window.clearTimeout(hover_timeout_ref.current);
    setIsHovered(false);
  };

  return (
    <span className="relative flex">
      <Tooltip content="Filter board by anything" className="flex">
      <span className="flex" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <ToolbarButton
          label="Filter"
          Icon={FilterIcon}
          is_open={is_open}
          has_selection={has_filters}
          variant="accent"
          badge_count={toolbar.active_filter_count || undefined}
          is_split
          onClick={() => openFilterMode("quick")}
        />
      </span>
      </Tooltip>
      <Tooltip content="Advanced filters" className="flex">
        <button
          type="button"
          onClick={() => openFilterMode("advanced")}
          aria-label="Open advanced filters"
          aria-expanded={is_advanced_open}
          className={`flex h-8 w-6 items-center justify-center rounded-r-[4px] border-l border-boardtree-surface text-boardtree-text transition-colors ${
            is_open || has_filters ? "bg-boardtree-accent-surface" : "hover:bg-boardtree-hover-strong"
          }`}
        >
          <ChevronDownIcon size={11} />
        </button>
      </Tooltip>
      {is_summary_shown && (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-[220] w-[300px] rounded-[4px] bg-[#323338] px-3 py-2.5 font-[family-name:var(--font-figtree)] text-white shadow-[0_6px_20px_rgba(0,0,0,0.2)] dark:bg-[#1e2a2b]"
        >
          <p className="pb-1 text-[13px] font-medium">
            Showing {toolbar.visible_row_count} of {toolbar.total_row_count} items
          </p>
          <ul className="flex flex-col gap-0.5">
            {shown_lines.map((line, index) => (
              <li key={`${line}-${index}`} className="truncate text-[13px] text-white/85">
                {line}
              </li>
            ))}
          </ul>
          {lines.length > shown_lines.length && (
            <p className="pt-1 text-[12px] text-white/60">and {lines.length - shown_lines.length} more</p>
          )}
        </div>
      )}
    </span>
  );
}

export default FilterControl;
