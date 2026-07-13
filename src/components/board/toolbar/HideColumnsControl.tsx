"use client";
import React, { useRef, useState } from "react";
import { CheckIcon, HideIcon } from "@/icons/board-icons";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ToolbarButton from "./ToolbarButton";

export type HideColumnsControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

function HideColumnsControl<TRow>({ toolbar }: HideColumnsControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const is_open = toolbar.active_panel === "hide";

  const hideable_columns = toolbar.columns.filter((column) => column.hideable !== false);
  const filtered_columns = hideable_columns.filter((column) =>
    (column.label || column.id).toLowerCase().includes(query.toLowerCase())
  );
  const all_visible = toolbar.hidden_column_ids.length === 0;

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
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={280}>
        <div className="border-b border-white/[0.07] px-4 pb-3 pt-3.5 text-[14px] font-bold text-[#f2f4fb]">
          Display columns
        </div>
        <div className="p-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find columns to hide"
            className="mb-2 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[13px] text-[#e9eded] placeholder:text-[#7f88ac] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (all_visible) {
                hideable_columns.forEach((column) => toolbar.toggleColumnHidden(column.id));
              } else {
                toolbar.showAllColumns();
              }
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-semibold text-[#c3cae6] hover:bg-white/[0.06]"
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                all_visible ? "border-brand-500 bg-brand-500" : "border-white/25"
              }`}
            >
              {all_visible && <CheckIcon size={10} className="text-white" />}
            </span>
            All columns
          </button>
          <div className="mt-1 max-h-[240px] overflow-y-auto">
            {filtered_columns.map((column) => {
              const is_checked = !toolbar.hidden_column_ids.includes(column.id);
              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => toolbar.toggleColumnHidden(column.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 pl-6 text-[13px] text-[#e2e6f4] hover:bg-white/[0.06]"
                >
                  <span
                    className={`flex h-4 w-4 flex-none items-center justify-center rounded border ${
                      is_checked ? "border-brand-500 bg-brand-500" : "border-white/25"
                    }`}
                  >
                    {is_checked && <CheckIcon size={10} className="text-white" />}
                  </span>
                  <span className="truncate">{column.label || column.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      </BoardPopover>
    </>
  );
}

export default HideColumnsControl;
