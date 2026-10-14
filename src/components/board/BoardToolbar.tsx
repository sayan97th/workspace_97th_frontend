"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@/icons/workspace-icons";
import { CollapseTableIcon } from "@/icons/board-icons";
import type {
  BoardSavedFilterActions,
  BoardToolbarApi,
  BoardToolbarExportOptions,
  BoardToolbarViewActions,
} from "./toolbar/types";
import SearchControl from "./toolbar/SearchControl";
import PersonControl from "./toolbar/PersonControl";
import FilterControl from "./toolbar/FilterControl";
import FilterPanel from "./toolbar/FilterPanel";
import StarredFilterControl from "./toolbar/StarredFilterControl";
import SortControl from "./toolbar/SortControl";
import HideColumnsControl from "./toolbar/HideColumnsControl";
import GroupByControl from "./toolbar/GroupByControl";
import OverflowControl from "./toolbar/OverflowControl";
import ConditionalColoringPanel from "./toolbar/ConditionalColoringPanel";
import BoardPopover from "./toolbar/BoardPopover";
import ActiveFiltersBar from "./toolbar/ActiveFiltersBar";
import GiveFeedbackModal from "./GiveFeedbackModal";

/** The inline panel's width matches the toolbar row's own width, capped at this value. */
const INLINE_PANEL_MAX_WIDTH = 900;

export type BoardToolbarProps<TRow> = {
  new_item_label?: string;
  /** Wires the "New item" button to create a row. Omit to keep it display-only. */
  onNewItem?: () => void;
  toolbar: BoardToolbarApi<TRow>;
  /** Wires the panels' "Save to this view"/"Save as new view" buttons. Omit to hide them. */
  view_actions?: BoardToolbarViewActions;
  /** Wires the Filter panel's personal "Saved filters" menu. Omit to hide it. */
  saved_filter_actions?: BoardSavedFilterActions;
  /** Wires the "..." menu's export of the visible items. Omit to hide it. */
  export_options?: BoardToolbarExportOptions;
  /** Wires the Group by panel's "Give feedback" link. Omit to hide it. */
  onSubmitFeedback?: (message: string) => Promise<void>;
};

/** Board toolbar: the accent "New item" split button plus the filter/sort/group controls. */
function BoardToolbar<TRow>({
  new_item_label = "New item",
  onNewItem,
  toolbar,
  view_actions,
  saved_filter_actions,
  export_options,
  onSubmitFeedback,
}: BoardToolbarProps<TRow>) {
  const is_filter_open = toolbar.active_panel === "filter";
  const is_color_open = toolbar.active_panel === "color";
  const is_inline_panel_open = is_filter_open || is_color_open;

  const toolbar_row_ref = useRef<HTMLDivElement>(null);
  const [inline_panel_width, setInlinePanelWidth] = useState(INLINE_PANEL_MAX_WIDTH);
  const [is_color_feedback_open, setIsColorFeedbackOpen] = useState(false);

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
        <div className="mr-3 flex h-8 flex-none items-stretch overflow-hidden rounded-[4px] bg-boardtree-accent text-white">
          <button
            type="button"
            onClick={onNewItem}
            className="px-2 text-board-nav transition-colors hover:bg-boardtree-accent-hover"
          >
            {new_item_label}
          </button>
          <button
            type="button"
            className="flex w-7 items-center justify-center border-l border-black/15 transition-colors hover:bg-boardtree-accent-hover"
            aria-label="New item options"
          >
            <ChevronDownIcon size={14} />
          </button>
        </div>

        <SearchControl toolbar={toolbar} />
        <PersonControl toolbar={toolbar} view_actions={view_actions} />
        <FilterControl toolbar={toolbar} />
        <StarredFilterControl toolbar={toolbar} />
        <SortControl toolbar={toolbar} view_actions={view_actions} />
        <HideColumnsControl toolbar={toolbar} view_actions={view_actions} />
        <GroupByControl toolbar={toolbar} view_actions={view_actions} onSubmitFeedback={onSubmitFeedback} />
        <OverflowControl toolbar={toolbar} export_options={export_options} view_actions={view_actions} />

        <div className="flex-1" />

        <button
          type="button"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-boardtree-border text-boardtree-text transition-colors hover:bg-boardtree-hover-strong"
          aria-label="Collapse all groups"
        >
          <CollapseTableIcon size={14} />
        </button>

        <BoardPopover
          anchor_el={toolbar_row_ref.current}
          is_open={is_inline_panel_open}
          onClose={toolbar.closePanel}
          width={inline_panel_width}
          align="start"
          unstyled
        >
          {is_filter_open && <FilterPanel toolbar={toolbar} view_actions={view_actions} saved_filter_actions={saved_filter_actions} />}
          {is_color_open && (
            <ConditionalColoringPanel
              toolbar={toolbar}
              view_actions={view_actions}
              onRequestFeedback={
                onSubmitFeedback
                  ? () => {
                      toolbar.closePanel();
                      setIsColorFeedbackOpen(true);
                    }
                  : undefined
              }
            />
          )}
        </BoardPopover>
      </div>
      <ActiveFiltersBar toolbar={toolbar} view_actions={view_actions} />

      {is_color_feedback_open &&
        onSubmitFeedback &&
        typeof document !== "undefined" &&
        createPortal(
          <GiveFeedbackModal
            is_open
            description="Tell us what is working, what is not, or what you would like to see when coloring items."
            onSubmit={(message) => onSubmitFeedback(`[Conditional coloring] ${message}`)}
            onClose={() => setIsColorFeedbackOpen(false)}
          />,
          document.body
        )}
    </div>
  );
}

export default BoardToolbar;
