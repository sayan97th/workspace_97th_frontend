"use client";
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CloseIcon, DragHandleIcon } from "@/icons/board-icons";
import { DuplicateIcon, EyeIcon, EyeOffIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
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
 * list, faded, without narrowing anything. Pause and Duplicate show on hover,
 * so the row reads like monday's: three fields and a remove "x".
 */
function FilterRuleRow<TRow>({ toolbar, rule, prefix, onChange, onRemove, onDuplicate }: FilterRuleRowProps<TRow>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });
  const is_disabled = !!rule.is_disabled;
  const field = toolbar.filter_fields.find((candidate) => candidate.id === rule.column_id);
  const operators = field ? BOARD_FILTER_OPERATORS[field.kind] : [];
  const selected_operator = field && rule.condition ? getOperatorLabel(field.kind, rule.condition) : null;

  const pause_label = is_disabled ? "Turn filter on" : "Pause filter";

  return (
    <div
      ref={setNodeRef}
      className="filter-rule"
      data-dragging={isDragging}
      data-paused={is_disabled}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="filter-rule__handle"
      >
        <DragHandleIcon />
      </button>
      <div className="filter-rule__prefix">{prefix}</div>

      <div className="filter-rule__fields">
        <InlineFieldMenu
          width={190}
          className="flex-none"
          menu_heading="Columns"
          menu_max_height={340}
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
          onClear={field ? () => onChange({ column_id: null, condition: null, value: "", values: [] }) : undefined}
          clear_label="Clear column"
          renderValue={() =>
            field ? (
              <>
                {field.swatch && <ColumnSwatchBadge swatch={field.swatch} size={20} />}
                <span className="field-menu__label">{field.label}</span>
              </>
            ) : (
              <span className="field-menu__placeholder">Column</span>
            )
          }
          renderOption={(option) => (
            <>
              {option.swatch && <ColumnSwatchBadge swatch={option.swatch} size={22} />}
              <span className="field-menu__label flex-1">{option.label}</span>
              {fieldTag(option) && <span className="field-menu__tag">{fieldTag(option)}</span>}
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
            renderValue={() =>
              selected_operator ? (
                <span className="field-menu__label">{selected_operator}</span>
              ) : (
                <span className="field-menu__placeholder">Condition</span>
              )
            }
            renderOption={(option) => <span>{option.label}</span>}
          />
        ) : (
          <div className="field-input field-input--placeholder filter-rule__condition-placeholder" aria-disabled>
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

      <Tooltip content={pause_label} className="filter-rule__secondary-action filter-rule__pause-action">
        <button type="button" onClick={() => onChange({ is_disabled: !is_disabled })} className="filter-panel__icon-button" aria-label={pause_label}>
          {is_disabled ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
        </button>
      </Tooltip>
      <Tooltip content="Duplicate filter" className="filter-rule__secondary-action">
        <button type="button" onClick={onDuplicate} className="filter-panel__icon-button" aria-label="Duplicate filter">
          <DuplicateIcon size={15} />
        </button>
      </Tooltip>
      <Tooltip content="Remove filter">
        <button type="button" onClick={onRemove} className="filter-panel__icon-button" aria-label="Remove filter">
          <CloseIcon size={12} />
        </button>
      </Tooltip>
    </div>
  );
}

export default FilterRuleRow;
