"use client";
import React, { useMemo, useState } from "react";
import { PersonAvatar } from "@/components/board";
import {
  ALL_DATE_PRESETS,
  DATE_PRESET_LABELS,
  emptyFilterValue,
  type AdminDateRangeFilterDef,
  type AdminDateRangeValue,
  type AdminFilterDef,
  type AdminFilterValue,
  type AdminMultiSelectFilterDef,
  type AdminMultiSelectValue,
  type AdminNumberRangeValue,
  type AdminTextFilterDef,
  type AdminTextValue,
} from "./adminFilterTypes";

export type AdminFilterEditorProps = {
  def: AdminFilterDef;
  value: AdminFilterValue | undefined;
  onChange: (value: AdminFilterValue) => void;
};

const inputClass =
  "h-[34px] w-full rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500";

const optionRowClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-[7px] text-left text-[12.5px] font-medium text-shell-text-secondary hover:bg-shell-hover";

/** Square checkbox matching the Administration tables' row selection boxes. */
export const AdminCheckbox: React.FC<{ is_checked: boolean; is_indeterminate?: boolean; className?: string }> = ({
  is_checked,
  is_indeterminate = false,
  className = "",
}) => (
  <span
    aria-hidden="true"
    className={`flex h-4 w-4 flex-none items-center justify-center rounded-[4px] border transition-colors ${
      is_checked || is_indeterminate ? "border-brand-500 bg-brand-500 text-white" : "border-shell-text-faint"
    } ${className}`}
  >
    {is_indeterminate ? (
      <svg width="9" height="9" viewBox="0 0 12 12">
        <path d="M2.5 6h7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
      </svg>
    ) : is_checked ? (
      <svg width="10" height="10" viewBox="0 0 12 12">
        <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : null}
  </span>
);

const MultiSelectEditor: React.FC<{
  def: AdminMultiSelectFilterDef;
  value: AdminMultiSelectValue;
  onChange: (value: AdminMultiSelectValue) => void;
}> = ({ def, value, onChange }) => {
  const [query, setQuery] = useState("");
  const is_searchable = def.options.length > 8;
  const visible_options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? def.options.filter((option) => option.label.toLowerCase().includes(needle)) : def.options;
  }, [def.options, query]);

  const toggle = (id: string) =>
    onChange({
      kind: "multi_select",
      values: value.values.includes(id) ? value.values.filter((existing) => existing !== id) : [...value.values, id],
    });

  return (
    <div>
      {is_searchable ? (
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${def.label.toLowerCase()}`}
          className={`${inputClass} mb-1.5`}
        />
      ) : null}
      <div className="max-h-[260px] overflow-y-auto">
        {visible_options.length === 0 ? (
          <div className="px-2 py-3 text-[12.5px] text-shell-text-faint">No options</div>
        ) : (
          visible_options.map((option) => (
            <button key={option.id} type="button" onClick={() => toggle(option.id)} className={optionRowClass}>
              <AdminCheckbox is_checked={value.values.includes(option.id)} />
              {option.person ? (
                <PersonAvatar person={option.person} size={20} />
              ) : option.color ? (
                <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: option.color }} />
              ) : null}
              <span className="truncate">{option.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const DateRangeEditor: React.FC<{
  def: AdminDateRangeFilterDef;
  value: AdminDateRangeValue;
  onChange: (value: AdminDateRangeValue) => void;
}> = ({ def, value, onChange }) => {
  const presets = def.presets ?? ALL_DATE_PRESETS;
  const is_custom = value.preset === "custom";

  return (
    <div>
      {presets.map((preset) => {
        const is_selected = value.preset === preset;
        return (
          <button
            key={preset}
            type="button"
            onClick={() =>
              onChange({ ...value, preset: is_selected ? null : preset, from: preset === "custom" ? value.from : "", to: preset === "custom" ? value.to : "" })
            }
            className={optionRowClass}
          >
            <span
              className={`flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                is_selected ? "border-brand-500" : "border-shell-text-faint"
              }`}
            >
              {is_selected ? <span className="h-2 w-2 rounded-full bg-brand-500" /> : null}
            </span>
            {DATE_PRESET_LABELS[preset]}
          </button>
        );
      })}

      {is_custom ? (
        <div className="mt-1.5 grid grid-cols-2 gap-2 px-2">
          <label className="text-[11px] font-semibold text-shell-text-muted">
            From
            <input
              type="date"
              value={value.from}
              max={value.to || undefined}
              onChange={(event) => onChange({ ...value, from: event.target.value })}
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="text-[11px] font-semibold text-shell-text-muted">
            To
            <input
              type="date"
              value={value.to}
              min={value.from || undefined}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>
      ) : null}

      {def.never_param ? (
        <>
          <div className="mx-2 my-1.5 h-px bg-shell-border" />
          <button type="button" onClick={() => onChange({ ...value, never: !value.never })} className={optionRowClass}>
            <AdminCheckbox is_checked={value.never} />
            {def.never_label ?? "Never"}
          </button>
        </>
      ) : null}
    </div>
  );
};

const NumberRangeEditor: React.FC<{ value: AdminNumberRangeValue; onChange: (value: AdminNumberRangeValue) => void }> = ({
  value,
  onChange,
}) => (
  <div className="grid grid-cols-2 gap-2 p-1">
    <label className="text-[11px] font-semibold text-shell-text-muted">
      Min
      <input
        autoFocus
        type="number"
        value={value.min}
        onChange={(event) => onChange({ ...value, min: event.target.value })}
        className={`${inputClass} mt-1`}
      />
    </label>
    <label className="text-[11px] font-semibold text-shell-text-muted">
      Max
      <input
        type="number"
        value={value.max}
        onChange={(event) => onChange({ ...value, max: event.target.value })}
        className={`${inputClass} mt-1`}
      />
    </label>
  </div>
);

const TextEditor: React.FC<{ def: AdminTextFilterDef; value: AdminTextValue; onChange: (value: AdminTextValue) => void }> = ({
  def,
  value,
  onChange,
}) => (
  <div className="p-1">
    <input
      autoFocus
      value={value.text}
      onChange={(event) => onChange({ kind: "text", text: event.target.value })}
      placeholder={def.placeholder ?? "Contains…"}
      className={inputClass}
    />
  </div>
);

/** The editor inside a column's filter popover, picked by the column's filter kind. */
const AdminFilterEditor: React.FC<AdminFilterEditorProps> = ({ def, value, onChange }) => {
  const current = value && value.kind === def.kind ? value : emptyFilterValue(def);

  switch (def.kind) {
    case "multi_select":
      return <MultiSelectEditor def={def} value={current as AdminMultiSelectValue} onChange={onChange} />;
    case "date_range":
      return <DateRangeEditor def={def} value={current as AdminDateRangeValue} onChange={onChange} />;
    case "number_range":
      return <NumberRangeEditor value={current as AdminNumberRangeValue} onChange={onChange} />;
    default:
      return <TextEditor def={def} value={current as AdminTextValue} onChange={onChange} />;
  }
};

export default AdminFilterEditor;
