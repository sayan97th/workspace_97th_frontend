"use client";
import React from "react";
import { CloseIcon, DragHandleIcon, PlusIcon } from "@/icons/board-icons";
import { InfoIcon } from "@/icons/workspace-icons";
import {
  BOARD_ADVANCED_FILTER_CONDITIONS,
  BOARD_CONDITIONAL_COLOR_SCOPES,
  type BoardToolbarApi,
} from "./types";
import ColorSwatchPicker from "./ColorSwatchPicker";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import InlineFieldMenu from "./InlineFieldMenu";

export type ConditionalColoringPanelProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

/**
 * Floating panel rendered by BoardToolbar, matching the Filter/Sort panels'
 * "Where" row layout: color swatch, Row/Cell scope, column, condition and value,
 * one rule per row, evaluated top to bottom.
 */
function ConditionalColoringPanel<TRow>({ toolbar }: ConditionalColoringPanelProps<TRow>) {
  const colorable_columns = toolbar.columns.filter((column) => column.swatch);

  return (
    // No overflow-hidden here (unlike FilterPanel): this panel's Column/Condition
    // dropdowns are InlineFieldMenu popups that float outside the panel's own
    // bounds, whereas FilterPanel's dropdowns are native <select> elements the
    // browser always renders above the page regardless of parent overflow.
    <div className="rounded-xl border border-shell-border-strong bg-shell-panel shadow-2xl shadow-black/40">
      <div className="flex items-center gap-[10px] px-5 pb-3.5 pt-4">
        <span className="text-[16px] font-bold text-shell-text">Conditional coloring</span>
        <span
          className="flex flex-none items-center text-shell-text-faint"
          title="Paints a row or cell's background when its column matches a condition"
        >
          <InfoIcon size={15} />
        </span>
        <div className="flex-1" />
        <div className="flex h-8 flex-none cursor-default items-center gap-[7px] rounded-lg border border-shell-border-strong px-3.5 text-[13px] font-semibold text-shell-text-faint">
          Save as new view
        </div>
      </div>

      <div className="flex flex-col gap-3 px-5 pb-1.5 pt-0.5">
        {toolbar.conditional_color_rules.length === 0 && (
          <p className="pb-2 text-[13px] text-shell-text-muted">No coloring rules yet.</p>
        )}
        {toolbar.conditional_color_rules.map((rule) => {
          const selected_column = colorable_columns.find((column) => column.id === rule.column_id);
          const selected_condition = BOARD_ADVANCED_FILTER_CONDITIONS.find(
            (condition) => condition.id === rule.condition
          );
          const is_value_disabled = rule.condition === "is_empty" || rule.condition === "is_not_empty";

          return (
            <div key={rule.id} className="flex items-center gap-[10px]">
              <span className="flex flex-none cursor-grab text-shell-text-faint">
                <DragHandleIcon />
              </span>

              <ColorSwatchPicker
                color={rule.color}
                onSelect={(color) => toolbar.updateConditionalColorRule(rule.id, { color })}
              />

              <InlineFieldMenu
                width={104}
                options={BOARD_CONDITIONAL_COLOR_SCOPES}
                getOptionId={(option) => option.id}
                isSelected={(option) => option.id === rule.scope}
                onSelect={(option) => toolbar.updateConditionalColorRule(rule.id, { scope: option.id })}
                renderValue={() => (
                  <span className="truncate text-[13.5px] font-medium text-shell-text">
                    {BOARD_CONDITIONAL_COLOR_SCOPES.find((option) => option.id === rule.scope)?.label}
                  </span>
                )}
                renderOption={(option) => <span>{option.label}</span>}
              />

              <span className="flex-none text-[13.5px] text-shell-text-muted">When</span>

              <InlineFieldMenu
                menu_heading="Item columns"
                menu_max_height={280}
                options={colorable_columns}
                getOptionId={(column) => column.id}
                isSelected={(column) => column.id === rule.column_id}
                onSelect={(column) => toolbar.updateConditionalColorRule(rule.id, { column_id: column.id })}
                renderValue={() =>
                  selected_column ? (
                    <>
                      {selected_column.swatch && <ColumnSwatchBadge swatch={selected_column.swatch} />}
                      <span className="truncate text-[13.5px] font-medium text-shell-text">
                        {selected_column.full_label ?? selected_column.label}
                      </span>
                    </>
                  ) : (
                    <span className="truncate text-[13.5px] text-shell-text-faint">Column</span>
                  )
                }
                renderOption={(column) => (
                  <>
                    {column.swatch && <ColumnSwatchBadge swatch={column.swatch} size={22} />}
                    <span>{column.full_label ?? column.label}</span>
                  </>
                )}
              />

              <InlineFieldMenu
                width={150}
                options={BOARD_ADVANCED_FILTER_CONDITIONS}
                getOptionId={(option) => option.id}
                isSelected={(option) => option.id === rule.condition}
                onSelect={(option) => toolbar.updateConditionalColorRule(rule.id, { condition: option.id })}
                renderValue={() => (
                  <span className="truncate text-[13.5px] font-medium text-shell-text">
                    {selected_condition?.label ?? "Condition"}
                  </span>
                )}
                renderOption={(option) => <span>{option.label}</span>}
              />

              <input
                type="text"
                value={rule.value}
                disabled={is_value_disabled}
                onChange={(event) =>
                  toolbar.updateConditionalColorRule(rule.id, { value: event.target.value })
                }
                placeholder="Value"
                className="h-[38px] w-[170px] flex-none rounded-lg border border-shell-border-strong bg-shell-hover px-3 text-[13.5px] font-medium text-shell-text outline-none transition-colors placeholder:text-shell-text-faint hover:border-shell-text-faint focus:outline-none disabled:opacity-40"
              />

              <button
                type="button"
                onClick={() => toolbar.removeConditionalColorRule(rule.id)}
                className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-shell-text-faint hover:bg-shell-hover hover:text-shell-text"
                aria-label="Remove condition"
              >
                <CloseIcon size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-[22px] px-5 pb-[18px] pt-3">
        <button
          type="button"
          onClick={toolbar.addConditionalColorRule}
          className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[#7fb2ff] hover:text-brand-400"
        >
          <PlusIcon size={14} />
          New condition
        </button>
        {toolbar.conditional_color_rules.length > 0 && (
          <button
            type="button"
            onClick={toolbar.clearConditionalColorRules}
            className="text-[13.5px] font-medium text-shell-text-muted hover:text-shell-text"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

export default ConditionalColoringPanel;
