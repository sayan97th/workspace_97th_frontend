"use client";
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CloseIcon, DragHandleIcon } from "@/icons/board-icons";
import { DuplicateIcon, EyeIcon, EyeOffIcon } from "@/icons/workspace-icons";
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
  onDuplicate: () => void;
};

const ICON_BUTTON_CLASS =
  "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[7px] text-boardtree-text-faint hover:bg-boardtree-hover hover:text-boardtree-text";

/** Faint tag after a field's name in the column picker, telling subitem and item detail fields apart from item columns. */
const fieldTag = (field: { scope?: string; section?: string }) =>
  field.scope === "subitem" ? "Subitem" : field.section ?? null;

/** Whether switching operators changes what the value looks like (one value, two bounds, or none), which means the old value no longer fits. */
const valueShape = (operator: BoardFilterOperator | null) =>
  operator === null ? "none" : isValuelessOperator(operator) ? "none" : operator === "between" ? "range" : "single";

/**
 * One Advanced filters rule: column, condition and value. Picking a column
 * keeps the condition when that column's kind supports it and otherwise
 * resets it to the kind's first one; values are cleared whenever their shape
 * no longer fits the new column or condition. The handle drags it within its
 * own list (top level or one condition group), and a paused rule stays in the
 * list, faded, without narrowing anything.
 */
function FilterRuleRow<TRow>({ toolbar, rule, prefix, onChange, onRemove, onDuplicate }: FilterRuleRowProps<TRow>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  const is_disabled = !!rule.is_disabled;
  const field = toolbar.filter_fields.find((candidate) => candidate.id === rule.column_id);
  const operators = field ? BOARD_FILTER_OPERATORS[field.kind] : [];
  const selected_operator = field && rule.condition ? getOperatorLabel(field.kind, rule.condition) : null;

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2.5 rounded-lg ${isDragging ? "relative z-10 bg-boardtree-surface shadow-lg shadow-black/30" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="-mr-1 flex flex-none cursor-grab touch-none text-boardtree-text-faint hover:text-boardtree-text active:cursor-grabbing"
      >
        <DragHandleIcon />
      </button>
      <div className="flex w-[74px] flex-none items-center">{prefix}</div>

      <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${is_disabled ? "opacity-45" : ""}`}>

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
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {fieldTag(option) && (
              <span className="flex-none text-[11px] font-medium text-boardtree-text-faint">{fieldTag(option)}</span>
            )}
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
      </div>

      <button
        type="button"
        onClick={() => onChange({ is_disabled: !is_disabled })}
        className={ICON_BUTTON_CLASS}
        aria-label={is_disabled ? "Turn filter on" : "Pause filter"}
        title={is_disabled ? "Turn filter on" : "Pause filter"}
      >
        {is_disabled ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
      </button>
      <button type="button" onClick={onDuplicate} className={ICON_BUTTON_CLASS} aria-label="Duplicate filter" title="Duplicate filter">
        <DuplicateIcon size={14} />
      </button>
      <button type="button" onClick={onRemove} className={ICON_BUTTON_CLASS} aria-label="Remove filter" title="Remove filter">
        <CloseIcon size={13} />
      </button>
    </div>
  );
}

export default FilterRuleRow;
