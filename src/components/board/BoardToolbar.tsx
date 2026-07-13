"use client";
import React from "react";
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

export type BoardToolbarProps<TRow> = {
  new_item_label?: string;
  toolbar: BoardToolbarApi<TRow>;
};

/** Board toolbar: the red "New item" split button plus the filter/sort/group controls. */
function BoardToolbar<TRow>({ new_item_label = "New item", toolbar }: BoardToolbarProps<TRow>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1">
        <div className="mr-2 flex flex-none items-center overflow-hidden rounded-lg bg-brand-500">
          <button type="button" className="px-3.5 py-2 text-[13px] font-semibold text-white">
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

        {!toolbar.is_search_open && <div className="flex-1" />}

        <button
          type="button"
          className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-[#8a9495] transition-colors hover:bg-white/[0.07]"
          aria-label="Collapse all groups"
        >
          <CollapseTableIcon />
        </button>
      </div>

      {toolbar.active_panel === "filter" && <FilterPanel toolbar={toolbar} />}
    </div>
  );
}

export default BoardToolbar;
