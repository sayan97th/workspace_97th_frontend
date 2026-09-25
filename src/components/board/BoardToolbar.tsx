"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/icons/workspace-icons";
import { CollapseTableIcon } from "@/icons/board-icons";
import type { BoardToolbarApi, BoardToolbarViewActions } from "./toolbar/types";
import SearchControl from "./toolbar/SearchControl";
import PersonControl from "./toolbar/PersonControl";
import FilterControl from "./toolbar/FilterControl";
import FilterPanel from "./toolbar/FilterPanel";
import SortControl from "./toolbar/SortControl";
import HideColumnsControl from "./toolbar/HideColumnsControl";
import GroupByControl from "./toolbar/GroupByControl";
import OverflowControl from "./toolbar/OverflowControl";
import ConditionalColoringPanel from "./toolbar/ConditionalColoringPanel";
import BoardPopover from "./toolbar/BoardPopover";
import ActiveFiltersBar from "./toolbar/ActiveFiltersBar";

/** The inline panel's width matches the toolbar row's own width, capped at this value. */
const INLINE_PANEL_MAX_WIDTH = 900;

export type BoardToolbarProps<TRow> = {
  new_item_label?: string;
  /** Wires the "New item" button to create a row. Omit to keep it display-only. */
  onNewItem?: () => void;
  toolbar: BoardToolbarApi<TRow>;
  /** Wires the panels' "Save to this view"/"Save as new view" buttons. Omit to hide them. */
  view_actions?: BoardToolbarViewActions;
};

/** Board toolbar: the accent "New item" split button plus the filter/sort/group controls. */
function BoardToolbar<TRow>({ new_item_label = "New item", onNewItem, toolbar, view_actions }: BoardToolbarProps<TRow>) {
  const is_filter_open = toolbar.active_panel === "filter";
  const is_color_open = toolbar.active_panel === "color";
  const is_inline_panel_open = is_filter_open || is_color_open;

  const toolbar_row_ref = useRef<HTMLDivElement>(null);
  const [inline_panel_width, setInlinePanelWidth] = useState(INLINE_PANEL_MAX_WIDTH);

  // Tracks the toolbar row's own width so the Filter/Conditional coloring panel keeps
  // spanning it (capped at INLINE_PANEL_MAX_WIDTH) now that BoardPopover portals it to
  // document.body — outside the row's own layout flow, so it can no longer size itself
  // off the row with plain CSS (`w-full`) the way it did before.
  useLayoutEffect(() => {
    const el = toolbar_row_ref.current;
    if (!el) return;
    const updateWidth = () => setInlinePanelWidth(Math.min(el.offsetWidth, INLINE_PANEL_MAX_WIDTH));
    updateWidth();
    const resize_observer = new ResizeObserver(updateWidth);
    resize_observer.observe(el);
    return () => resize_observer.disconnect();
  }, []);

  return (
    <div>
      <div ref={toolbar_row_ref} className="relative flex items-center gap-1">
        <div className="mr-2 flex flex-none items-center overflow-hidden rounded-lg bg-boardtree-accent">
          <button type="button" onClick={onNewItem} className="px-3.5 py-2 text-[13px] font-semibold text-white">
            {new_item_label}
          </button>
          <button
            type="button"
            className="flex items-center border-l border-white/25 py-2 pl-2 pr-2 text-white"
            aria-label="New item options"
          >
            <ChevronDownIcon size={11} />
          </button>
        </div>

        <SearchControl toolbar={toolbar} />
        <PersonControl toolbar={toolbar} view_actions={view_actions} />
        <FilterControl toolbar={toolbar} />
        <SortControl toolbar={toolbar} view_actions={view_actions} />
        <HideColumnsControl toolbar={toolbar} />
        <GroupByControl toolbar={toolbar} view_actions={view_actions} />
        <OverflowControl toolbar={toolbar} />

        <div className="flex-1" />

        <button
          type="button"
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-boardtree-text-muted transition-colors hover:bg-boardtree-hover"
          aria-label="Collapse all groups"
        >
          <CollapseTableIcon />
        </button>

        <BoardPopover
          anchor_el={toolbar_row_ref.current}
          is_open={is_inline_panel_open}
          onClose={toolbar.closePanel}
          width={inline_panel_width}
          align="start"
          unstyled
        >
          {is_filter_open && <FilterPanel toolbar={toolbar} view_actions={view_actions} />}
          {is_color_open && <ConditionalColoringPanel toolbar={toolbar} view_actions={view_actions} />}
        </BoardPopover>
      </div>
      <ActiveFiltersBar toolbar={toolbar} />
    </div>
  );
}

export default BoardToolbar;
