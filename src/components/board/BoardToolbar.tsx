"use client";
import React, { useEffect } from "react";
import { ChevronDownIcon } from "@/icons/workspace-icons";
import { CollapseTableIcon } from "@/icons/board-icons";
import type { BoardToolbarApi } from "./toolbar/types";
import SearchControl from "./toolbar/SearchControl";
import PersonControl from "./toolbar/PersonControl";
import FilterControl from "./toolbar/FilterControl";
import FilterPanel from "./toolbar/FilterPanel";
import SortControl from "./toolbar/SortControl";
import HideColumnsControl from "./toolbar/HideColumnsControl";
import GroupByControl from "./toolbar/GroupByControl";
import OverflowControl from "./toolbar/OverflowControl";
import ConditionalColoringPanel from "./toolbar/ConditionalColoringPanel";

export type BoardToolbarProps<TRow> = {
  new_item_label?: string;
  /** Wires the "New item" button to create a row. Omit to keep it display-only. */
  onNewItem?: () => void;
  toolbar: BoardToolbarApi<TRow>;
};

/** Board toolbar: the red "New item" split button plus the filter/sort/group controls. */
function BoardToolbar<TRow>({ new_item_label = "New item", onNewItem, toolbar }: BoardToolbarProps<TRow>) {
  const is_filter_open = toolbar.active_panel === "filter";
  const is_color_open = toolbar.active_panel === "color";
  const is_inline_panel_open = is_filter_open || is_color_open;

  useEffect(() => {
    if (!is_inline_panel_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") toolbar.closePanel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [is_inline_panel_open, toolbar]);

  return (
    <div className="relative flex items-center gap-1">
      <div className="mr-2 flex flex-none items-center overflow-hidden rounded-lg bg-brand-500">
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
      <PersonControl toolbar={toolbar} />
      <FilterControl toolbar={toolbar} />
      <SortControl toolbar={toolbar} />
      <HideColumnsControl toolbar={toolbar} />
      <GroupByControl toolbar={toolbar} />
      <OverflowControl toolbar={toolbar} />

      <div className="flex-1" />

      <button
        type="button"
        className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-shell-text-muted transition-colors hover:bg-shell-hover"
        aria-label="Collapse all groups"
      >
        <CollapseTableIcon />
      </button>

      {is_inline_panel_open && (
        <>
          {/* Backdrop: dismisses the panel on outside click, matching the other toolbar popovers. */}
          <div className="fixed inset-0 z-40" onClick={toolbar.closePanel} />
          <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full max-w-[832px]">
            {is_filter_open && <FilterPanel toolbar={toolbar} />}
            {is_color_open && <ConditionalColoringPanel toolbar={toolbar} />}
          </div>
        </>
      )}
    </div>
  );
}

export default BoardToolbar;
