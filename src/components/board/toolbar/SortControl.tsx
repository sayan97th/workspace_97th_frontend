"use client";
import React, { useRef } from "react";
import { CloseIcon, PlusIcon, SortIcon } from "@/icons/board-icons";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ToolbarButton from "./ToolbarButton";

export type SortControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const select_class =
  "h-9 flex-1 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 text-[13.5px] text-[#e9eded] focus:outline-none";

function SortControl<TRow>({ toolbar }: SortControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const is_open = toolbar.active_panel === "sort";
  const active_rule_count = toolbar.sort_rules.filter((rule) => rule.sort_option_id).length;

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Sort"
        Icon={SortIcon}
        is_open={is_open}
        has_selection={active_rule_count > 0}
        badge_count={active_rule_count || undefined}
        onClick={() => toolbar.togglePanel("sort")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={360}>
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 pb-3 pt-3.5">
          <span className="text-[14px] font-bold text-[#f2f4fb]">Sort by</span>
        </div>
        <div className="p-3">
          {toolbar.sort_rules.length === 0 && (
            <p className="px-1 pb-2 text-[13px] text-[#8a9495]">No sort applied.</p>
          )}
          {toolbar.sort_rules.map((rule) => (
            <div key={rule.id} className="mb-2 flex items-center gap-2">
              <select
                value={rule.sort_option_id ?? ""}
                onChange={(event) =>
                  toolbar.updateSortRule(rule.id, { sort_option_id: event.target.value || null })
                }
                className={select_class}
              >
                <option value="">Choose column</option>
                {toolbar.sort_options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={rule.direction}
                onChange={(event) =>
                  toolbar.updateSortRule(rule.id, {
                    direction: event.target.value as typeof rule.direction,
                  })
                }
                className={`${select_class} flex-none w-[130px]`}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button
                type="button"
                onClick={() => toolbar.removeSortRule(rule.id)}
                className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-[#8b93b8] hover:bg-white/[0.08] hover:text-white"
                aria-label="Remove sort"
              >
                <CloseIcon size={12} />
              </button>
            </div>
          ))}
          <div className="mt-1 flex items-center gap-4">
            <button
              type="button"
              onClick={toolbar.addSortRule}
              className="flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-500 hover:text-brand-400"
            >
              <PlusIcon size={12} />
              New sort
            </button>
            {toolbar.sort_rules.length > 0 && (
              <button
                type="button"
                onClick={toolbar.clearSort}
                className="text-[13.5px] font-medium text-[#9aa2c4] hover:text-white"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </BoardPopover>
    </>
  );
}

export default SortControl;
