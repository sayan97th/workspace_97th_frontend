"use client";
import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import ColumnSwatchBadge from "./ColumnSwatchBadge";
import {
  BOARD_FILTER_OPERATORS,
  getDefaultOperator,
  getOperatorLabel,
  isOperatorAllowed,
  isValuelessOperator,
} from "./filterEngine";
import FilterRuleValueInput from "./FilterRuleValueInput";
import InlineFieldMenu from "./InlineFieldMenu";
import type { BoardAdvancedFilterRow, BoardFilterOperator, BoardToolbarApi } from "./types";

export type FilterRuleRowProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
  rule: BoardAdvancedFilterRow;
  /** "Where", or the And/Or picker joining this rule to the ones above. */
  prefix: React.ReactNode;
  onChange: (patch: Partial<BoardAdvancedFilterRow>) => void;
  onRemove: () => void;
};

/** Whether switching operators changes what the value looks like (one value, two bounds, or none), which means the old value no longer fits. */
const valueShape = (operator: BoardFilterOperator | null) =>
  operator === null ? "none" : isValuelessOperator(operator) ? "none" : operator === "between" ? "range" : "single";

/**
 * One Advanced filters rule: column, condition and value. Picking a column
 * keeps the condition when that column's kind supports it and otherwise
 * resets it to the kind's first one; values are cleared whenever their shape
 * no longer fits the new column or condition.
 */
function FilterRuleRow<TRow>({ toolbar, rule, prefix, onChange, onRemove }: FilterRuleRowProps<TRow>) {
  const field = toolbar.filter_fields.find((candidate) => candidate.id === rule.column_id);
  const operators = field ? BOARD_FILTER_OPERATORS[field.kind] : [];
  const selected_operator = field && rule.condition ? getOperatorLabel(field.kind, rule.condition) : null;

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex w-[74px] flex-none items-center">{prefix}</div>

      <InlineFieldMenu
        width={180}
        className="flex-none"
        menu_heading="Columns"
        menu_max_height={320}
        options={toolbar.filter_fields}
        getOptionId={(option) => option.id}
        getSearchText={(option) => option.label}
        search_placeholder="Search columns"
        isSelected={(option) => option.id === rule.column_id}
        onSelect={(option) => {
          if (option.id === rule.column_id) return;
          const is_same_kind = field?.kind === option.kind;
          const condition = isOperatorAllowed(option.kind, rule.condition) ? rule.condition : getDefaultOperator(option.kind);
          onChange({
            column_id: option.id,
            condition,
            // Option ids from another Status column mean nothing here, so
            // only same-kind text/number/date values carry over.
            value: is_same_kind && option.kind !== "option" ? rule.value : "",
            values: [],
          });
        }}
        renderValue={() =>
          field ? (
            <>
              {field.swatch && <ColumnSwatchBadge swatch={field.swatch} />}
              <span className="truncate text-[13.5px] text-boardtree-text">{field.label}</span>
            </>
          ) : (
            <span className="truncate text-[13.5px] text-boardtree-text-faint">Column</span>
          )
        }
        renderOption={(option) => (
          <>
            {option.swatch && <ColumnSwatchBadge swatch={option.swatch} size={22} />}
            <span className="truncate">{option.label}</span>
          </>
        )}
      />

      {field ? (
        <InlineFieldMenu
          width={150}
          className="flex-none"
          options={operators}
          getOptionId={(option) => option.id}
          isSelected={(option) => option.id === rule.condition}
          onSelect={(option) => {
            const patch: Partial<BoardAdvancedFilterRow> = { condition: option.id };
            if (valueShape(option.id) !== valueShape(rule.condition)) {
              patch.value = "";
              patch.values = [];
            }
            onChange(patch);
          }}
          renderValue={() => (
            <span className={`truncate text-[13.5px] ${selected_operator ? "text-boardtree-text" : "text-boardtree-text-faint"}`}>
              {selected_operator ?? "Condition"}
            </span>
          )}
          renderOption={(option) => <span>{option.label}</span>}
        />
      ) : (
        <div className="flex h-[38px] w-[150px] flex-none items-center rounded-lg border border-boardtree-border-soft px-3 text-[13.5px] text-boardtree-text-faint opacity-60">
          Condition
        </div>
      )}

      <FilterRuleValueInput
        // Remount when the column changes, so local picker state (e.g. "Exact date" mode) starts fresh.
        key={rule.column_id ?? "none"}
        field={field}
        rule={rule}
        persons={toolbar.persons}
        current_person_id={toolbar.current_person_id}
        onChange={onChange}
      />

      <button
        type="button"
        onClick={onRemove}
        className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-text"
        aria-label="Remove filter"
      >
        <CloseIcon size={13} />
      </button>
    </div>
  );
}

export default FilterRuleRow;
