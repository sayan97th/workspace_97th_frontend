"use client";
import React, { useRef, useState } from "react";
import { CheckIcon, GroupByIcon } from "@/icons/board-icons";
import { BOARD_DEFAULT_GROUP_BY_ID, type BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ToolbarButton from "./ToolbarButton";

export type GroupByControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

function GroupByControl<TRow>({ toolbar }: GroupByControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const is_open = toolbar.active_panel === "group";
  const is_non_default = toolbar.group_by_option_id !== BOARD_DEFAULT_GROUP_BY_ID;

  const filtered_options = toolbar.group_by_options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Group by"
        Icon={GroupByIcon}
        is_open={is_open}
        has_selection={is_non_default}
        onClick={() => toolbar.togglePanel("group")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={340}>
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 pb-3 pt-3.5">
          <span className="text-[14px] font-bold text-[#f2f4fb]">Group items by</span>
        </div>
        <div className="p-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Select or search column name"
            className="mb-2 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[13px] text-[#e9eded] placeholder:text-[#7f88ac] focus:outline-none"
          />
          <div className="mb-2 max-h-[180px] overflow-y-auto">
            {filtered_options.map((option) => {
              const is_selected = option.id === toolbar.group_by_option_id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toolbar.setGroupByOptionId(option.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#e2e6f4] hover:bg-white/[0.06]"
                >
                  {option.label}
                  {is_selected && <CheckIcon size={11} className="flex-none text-brand-500" />}
                </button>
              );
            })}
          </div>

          {is_non_default && (
            <select
              value={toolbar.group_order_direction}
              onChange={(event) =>
                toolbar.setGroupOrderDirection(event.target.value as typeof toolbar.group_order_direction)
              }
              className="mb-2 w-full rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-[13.5px] text-[#e9eded] focus:outline-none"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          )}

          <label className="flex items-center gap-2 px-1 py-1.5 text-[13px] text-[#c3cae6]">
            <input
              type="checkbox"
              checked={toolbar.show_empty_groups}
              onChange={(event) => toolbar.setShowEmptyGroups(event.target.checked)}
              className="h-3.5 w-3.5 accent-brand-500"
            />
            Show empty groups
          </label>
        </div>
      </BoardPopover>
    </>
  );
}

export default GroupByControl;
