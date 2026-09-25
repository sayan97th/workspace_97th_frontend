"use client";
import React, { useState } from "react";
import { BOARD_FILTER_DATE_PRESETS, BOARD_FILTER_ME_VALUE, isValuelessOperator } from "./filterEngine";
import FilterOptionPicker from "./FilterOptionPicker";
import InlineFieldMenu from "./InlineFieldMenu";
import type { BoardAdvancedFilterRow, BoardFilterField, BoardPersonOption, BoardQuickFilterFacetOption } from "./types";

export type FilterRuleValueInputProps<TRow> = {
  field: BoardFilterField<TRow> | undefined;
  rule: BoardAdvancedFilterRow;
  persons: BoardPersonOption[];
  current_person_id: string | null;
  onChange: (patch: Partial<BoardAdvancedFilterRow>) => void;
};

const input_class =
  "h-[38px] min-w-0 flex-1 rounded-lg border border-boardtree-border bg-boardtree-hover px-3 text-[13.5px] text-boardtree-text transition-colors placeholder:text-boardtree-text-faint hover:border-boardtree-text-faint focus:border-boardtree-accent focus:outline-none";

/** Native date inputs follow the page's color scheme, so the calendar popup matches the dark theme too. */
const date_input_class = `${input_class} dark:[color-scheme:dark]`;

const EXACT_DATE_OPTION_ID = "exact";
const DATE_VALUE_OPTIONS = [...BOARD_FILTER_DATE_PRESETS, { id: EXACT_DATE_OPTION_ID, label: "Exact date" }];
const EXACT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Placeholder shown where a value would go, for conditions that take none or before a column is picked. */
function DisabledValue({ label }: { label: string }) {
  return (
    <div className="flex h-[38px] min-w-0 flex-1 items-center rounded-lg border border-boardtree-border-soft px-3 text-[13.5px] text-boardtree-text-faint opacity-60">
      {label}
    </div>
  );
}

function DateValueInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  // "Exact date" is picked before the day itself, so the mode lives here while
  // the rule's value stays empty (and the rule inactive) until a day is chosen.
  const [is_exact_mode, setIsExactMode] = useState(() => EXACT_DATE_PATTERN.test(value));
  const is_exact = is_exact_mode || EXACT_DATE_PATTERN.test(value);
  const selected_id = is_exact ? EXACT_DATE_OPTION_ID : value;
  const selected_label = DATE_VALUE_OPTIONS.find((option) => option.id === selected_id)?.label;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <InlineFieldMenu
        width={is_exact ? 132 : undefined}
        className="flex-none"
        menu_max_height={300}
        options={DATE_VALUE_OPTIONS}
        getOptionId={(option) => option.id}
        isSelected={(option) => option.id === selected_id}
        onSelect={(option) => {
          const is_exact_option = option.id === EXACT_DATE_OPTION_ID;
          setIsExactMode(is_exact_option);
          if (is_exact_option) {
            if (!EXACT_DATE_PATTERN.test(value)) onChange("");
          } else {
            onChange(option.id);
          }
        }}
        renderValue={() =>
          selected_label ? (
            <span className="truncate text-[13.5px] text-boardtree-text">{selected_label}</span>
          ) : (
            <span className="truncate text-[13.5px] text-boardtree-text-faint">Choose date</span>
          )
        }
        renderOption={(option) => <span>{option.label}</span>}
      />
      {is_exact && (
        <input
          type="date"
          value={EXACT_DATE_PATTERN.test(value) ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className={date_input_class}
        />
      )}
    </div>
  );
}

/**
 * The value editor of one filter rule, shaped by the column's filter kind:
 * a multi-select for Status/Label/Dropdown/Tags/People/Group, a number field
 * (or two for "Between"), a relative or exact date, or free text. Conditions
 * without a value (Is empty, Is checked, ...) render a disabled placeholder.
 */
function FilterRuleValueInput<TRow>({ field, rule, persons, current_person_id, onChange }: FilterRuleValueInputProps<TRow>) {
  if (!field || !rule.condition) return <DisabledValue label="Value" />;
  if (isValuelessOperator(rule.condition)) return <DisabledValue label="No value needed" />;

  const values = rule.values ?? [];
  const setBound = (index: 0 | 1, value: string) => {
    const next = [values[0] ?? "", values[1] ?? ""];
    next[index] = value;
    onChange({ values: next, value: "" });
  };

  switch (field.kind) {
    case "option":
    case "group":
      return (
        <FilterOptionPicker
          options={field.options ?? []}
          selected_ids={values}
          persons={persons}
          onChange={(ids) => onChange({ values: ids, value: "" })}
        />
      );
    case "people": {
      const base_options: BoardQuickFilterFacetOption[] =
        field.options ?? persons.map((person) => ({ id: person.id, label: person.name, person_id: person.id }));
      const options: BoardQuickFilterFacetOption[] = [
        { id: BOARD_FILTER_ME_VALUE, label: "Me", person_id: current_person_id ?? undefined, dot_color: "#579bfc" },
        ...base_options.filter((option) => option.id !== current_person_id),
      ];
      return (
        <FilterOptionPicker
          options={options}
          selected_ids={values}
          persons={persons}
          placeholder="Choose people"
          onChange={(ids) => onChange({ values: ids, value: "" })}
        />
      );
    }
    case "number":
      if (rule.condition === "between") {
        return (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input type="number" value={values[0] ?? ""} onChange={(event) => setBound(0, event.target.value)} placeholder="From" className={input_class} />
            <span className="flex-none text-[13px] text-boardtree-text-muted">and</span>
            <input type="number" value={values[1] ?? ""} onChange={(event) => setBound(1, event.target.value)} placeholder="To" className={input_class} />
          </div>
        );
      }
      return (
        <input
          type="number"
          value={rule.value}
          onChange={(event) => onChange({ value: event.target.value, values: [] })}
          placeholder="Number"
          className={input_class}
        />
      );
    case "date":
      if (rule.condition === "between") {
        return (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <input type="date" value={values[0] ?? ""} onChange={(event) => setBound(0, event.target.value)} className={date_input_class} />
            <span className="flex-none text-[13px] text-boardtree-text-muted">and</span>
            <input type="date" value={values[1] ?? ""} onChange={(event) => setBound(1, event.target.value)} className={date_input_class} />
          </div>
        );
      }
      return <DateValueInput value={rule.value} onChange={(value) => onChange({ value, values: [] })} />;
    case "checkbox":
      return <DisabledValue label="No value needed" />;
    case "text":
    default:
      return (
        <input
          type="text"
          value={rule.value}
          onChange={(event) => onChange({ value: event.target.value, values: [] })}
          placeholder="Value"
          className={input_class}
        />
      );
  }
}

export default FilterRuleValueInput;
