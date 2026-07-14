"use client";
import React, { useRef, useState } from "react";
import { CloseIcon, HideIcon } from "@/icons/board-icons";
import { SearchIcon } from "@/icons/workspace-icons";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import ToolbarButton from "./ToolbarButton";
import ToolbarCheckbox, { type ToolbarCheckboxState } from "./ToolbarCheckbox";

export type HideColumnsControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/** Derives the tri-state checkbox for a master row from how many of `ids` are currently hidden. */
const getMasterState = (ids: string[], hidden_column_ids: string[]): ToolbarCheckboxState => {
  const hidden_count = ids.filter((id) => hidden_column_ids.includes(id)).length;
  if (hidden_count === 0) return "checked";
  if (hidden_count === ids.length) return "unchecked";
  return "partial";
};

function HideColumnsControl<TRow>({ toolbar }: HideColumnsControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const is_open = toolbar.active_panel === "hide";

  const hideable_columns = toolbar.columns.filter((column) => column.hideable !== false);
  const hideable_ids = hideable_columns.map((column) => column.id);
  const has_query = query.trim().length > 0;
  const filtered_columns = hideable_columns.filter((column) =>
    (column.full_label ?? column.label ?? column.id).toLowerCase().includes(query.trim().toLowerCase())
  );

  const visible_count = hideable_ids.length - toolbar.hidden_column_ids.length;
  const master_state = getMasterState(hideable_ids, toolbar.hidden_column_ids);

  const onToggleAll = () => {
    if (master_state === "unchecked") toolbar.showAllColumns();
    else toolbar.hideAllColumns();
  };

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Hide"
        Icon={HideIcon}
        is_open={is_open}
        has_selection={toolbar.hidden_column_ids.length > 0}
        badge_count={toolbar.hidden_column_ids.length || undefined}
        onClick={() => toolbar.togglePanel("hide")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={320}>
        <div className="flex items-center gap-[9px] px-5 pb-3 pt-4">
          <span className="text-[16px] font-bold text-[#eef2f2]">Display columns</span>
          <div className="flex-1" />
          <div className="flex h-8 flex-none cursor-default items-center gap-[7px] rounded-lg border border-white/[0.12] px-3.5 text-[13px] font-semibold text-[#71807f]">
            Save as new view
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="flex h-9 items-center gap-[9px] rounded-lg border border-white/10 bg-black/20 px-3">
            <span className="flex flex-none text-[#7e8889]">
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find columns to show/hide"
              className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[#e9eded] placeholder:text-[#7f88ac] focus:outline-none"
            />
            {has_query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex flex-none items-center justify-center text-[#7e8889] hover:text-[#e9eded]"
                aria-label="Clear search"
              >
                <CloseIcon size={11} />
              </button>
            )}
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto px-3 pb-3">
          {has_query && filtered_columns.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="text-[#4e5b5b]">
                <SearchIcon size={22} />
              </span>
              <span className="text-[13px] text-[#8a9495]">No columns match &ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onToggleAll}
                className="flex w-full items-center gap-[11px] rounded-lg px-2.5 py-2 hover:bg-white/[0.05]"
              >
                <ToolbarCheckbox state={master_state} />
                <span className="text-[13.5px] font-semibold text-[#e9eded]">All columns</span>
                <span className="ml-auto flex-none text-[12.5px] font-medium text-[#7e8889]">
                  {visible_count}/{hideable_ids.length} shown
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleAll}
                className="mt-0.5 flex w-full items-center gap-[11px] rounded-lg px-2.5 py-2 hover:bg-white/[0.05]"
              >
                <ToolbarCheckbox state={master_state} />
                <span className="text-[13px] font-semibold text-[#b7c0c0]">Item columns</span>
              </button>

              <div className="mt-0.5">
                {filtered_columns.map((column) => {
                  const is_checked = !toolbar.hidden_column_ids.includes(column.id);
                  return (
                    <button
                      key={column.id}
                      type="button"
                      onClick={() => toolbar.toggleColumnHidden(column.id)}
                      className="flex w-full items-center gap-[11px] rounded-lg py-2 pl-8 pr-2.5 hover:bg-white/[0.05]"
                    >
                      <ToolbarCheckbox state={is_checked ? "checked" : "unchecked"} />
                      {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={22} />}
                      <span className="truncate text-[13.5px] font-medium text-[#e4e9e9]">
                        {column.full_label ?? column.label ?? column.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.08] bg-black/10 px-5 py-3">
          <button
            type="button"
            onClick={toolbar.showAllColumns}
            className="text-[13px] font-semibold text-[#c7d0d0] hover:text-white"
          >
            Show all
          </button>
          <button
            type="button"
            onClick={toolbar.hideAllColumns}
            className="text-[13px] font-semibold text-[#c7d0d0] hover:text-white"
          >
            Hide all
          </button>
        </div>
      </BoardPopover>
    </>
  );
}

export default HideColumnsControl;
