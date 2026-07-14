"use client";
import React from "react";
import { CloseIcon, PlusIcon } from "@/icons/board-icons";
import { BOARD_ADVANCED_FILTER_CONDITIONS, type BoardToolbarApi } from "./types";

export type FilterPanelAdvancedProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

const select_class =
  "h-[38px] rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 text-[13.5px] text-[#e9eded] transition-colors hover:border-white/[0.28] focus:outline-none";

function FilterPanelAdvanced<TRow>({ toolbar }: FilterPanelAdvancedProps<TRow>) {
  return (
    <div className="px-5 pb-4 pt-0.5">
      {toolbar.advanced_filter_rows.map((row, index) => {
        const is_value_disabled = row.condition === "is_empty" || row.condition === "is_not_empty";
        return (
          <div key={row.id} className="mb-2.5 flex items-center gap-3">
            <span className="w-11 flex-none text-[13.5px] font-semibold text-[#c7d0d0]">
              {index === 0 ? "Where" : "And"}
            </span>
            <select
              value={row.column_id ?? ""}
              onChange={(event) =>
                toolbar.updateAdvancedFilterRow(row.id, { column_id: event.target.value || null })
              }
              className={`${select_class} w-[170px]`}
            >
              <option value="">Column</option>
              {toolbar.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.label || column.id}
                </option>
              ))}
            </select>
            <select
              value={row.condition ?? ""}
              onChange={(event) =>
                toolbar.updateAdvancedFilterRow(row.id, {
                  condition: (event.target.value || null) as typeof row.condition,
                })
              }
              className={`${select_class} w-[150px]`}
            >
              <option value="">Condition</option>
              {BOARD_ADVANCED_FILTER_CONDITIONS.map((condition) => (
                <option key={condition.id} value={condition.id}>
                  {condition.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={row.value}
              disabled={is_value_disabled}
              onChange={(event) => toolbar.updateAdvancedFilterRow(row.id, { value: event.target.value })}
              placeholder="Value"
              className={`${select_class} min-w-0 flex-1 disabled:opacity-40`}
            />
            <button
              type="button"
              onClick={() => toolbar.removeAdvancedFilterRow(row.id)}
              className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-[#8a9495] hover:bg-white/[0.08] hover:text-[#e9eded]"
              aria-label="Remove filter"
            >
              <CloseIcon size={12} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={toolbar.addAdvancedFilterRow}
        className="mt-1 flex items-center gap-1.5 text-[13.5px] font-semibold text-[#7fb2ff] hover:text-[#a4c9ff]"
      >
        <PlusIcon size={12} />
        New filter
      </button>
    </div>
  );
}

export default FilterPanelAdvanced;
