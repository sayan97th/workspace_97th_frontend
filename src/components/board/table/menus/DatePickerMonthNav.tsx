"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/icons/workspace-icons";
import { MONTH_LABELS } from "../constants";
import { shiftMonth, type MonthCursor } from "../dateUtils";
import { useOutsideClick } from "../useOutsideClick";
import "./date-picker.css";

/** monday's two letter weekday headers, Sunday first like `buildCalendarDays`. */
export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
/** How many years the year dropdown lists on each side of the shown year. */
const YEAR_SPAN = 20;

type OpenSelect = "month" | "year" | null;

interface SelectOption {
  value: number;
  label: string;
}

interface DatePickerSelectProps {
  label: string;
  aria_label: string;
  options: SelectOption[];
  selected_value: number;
  is_open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (value: number) => void;
}

/** The "Sep" and "2026" pickers above the grid: a text button with a chevron that drops a short scrollable list. */
function DatePickerSelect({ label, aria_label, options, selected_value, is_open, onToggle, onClose, onSelect }: DatePickerSelectProps) {
  const wrapper_ref = useOutsideClick<HTMLDivElement>(is_open, onClose);
  const list_ref = useRef<HTMLDivElement>(null);

  // Opens scrolled to the current choice, so a long year list doesn't start at its top.
  useEffect(() => {
    if (!is_open) return;
    list_ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" });
  }, [is_open]);

  return (
    <div ref={wrapper_ref} className="date-picker__select">
      <button
        type="button"
        onClick={onToggle}
        aria-label={aria_label}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        className="date-picker__select-trigger"
      >
        {label}
        <ChevronDownIcon size={14} className="date-picker__select-chevron" />
      </button>
      {is_open && (
        <div ref={list_ref} role="listbox" aria-label={aria_label} className="date-picker__select-list">
          {options.map((option) => (
            <button
              type="button"
              role="option"
              key={option.value}
              aria-selected={option.value === selected_value}
              onClick={() => onSelect(option.value)}
              className="date-picker__select-option"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface DatePickerMonthNavProps {
  cursor: MonthCursor;
  onCursorChange: (cursor: MonthCursor) => void;
}

/** The row above the day grid shared by the Date and Timeline pickers: month and year dropdowns on the left, previous/next arrows on the right. */
export default function DatePickerMonthNav({ cursor, onCursorChange }: DatePickerMonthNavProps) {
  const [open_select, setOpenSelect] = useState<OpenSelect>(null);

  const month_options = MONTH_LABELS.map((label, index) => ({ value: index, label }));
  const year_options = Array.from({ length: YEAR_SPAN * 2 + 1 }, (_, index) => {
    const year = cursor.year - YEAR_SPAN + index;
    return { value: year, label: String(year) };
  });

  const toggleSelect = (select: Exclude<OpenSelect, null>) => setOpenSelect((current) => (current === select ? null : select));
  const closeSelect = () => setOpenSelect(null);

  return (
    <div className="date-picker__nav">
      <div className="date-picker__selects">
        <DatePickerSelect
          label={MONTH_LABELS[cursor.month]}
          aria_label="Month"
          options={month_options}
          selected_value={cursor.month}
          is_open={open_select === "month"}
          onToggle={() => toggleSelect("month")}
          onClose={closeSelect}
          onSelect={(month) => {
            onCursorChange({ ...cursor, month });
            closeSelect();
          }}
        />
        <DatePickerSelect
          label={String(cursor.year)}
          aria_label="Year"
          options={year_options}
          selected_value={cursor.year}
          is_open={open_select === "year"}
          onToggle={() => toggleSelect("year")}
          onClose={closeSelect}
          onSelect={(year) => {
            onCursorChange({ ...cursor, year });
            closeSelect();
          }}
        />
      </div>
      <div className="date-picker__arrows">
        <button type="button" onClick={() => onCursorChange(shiftMonth(cursor, -1))} aria-label="Previous month" className="date-picker__icon-button">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" onClick={() => onCursorChange(shiftMonth(cursor, 1))} aria-label="Next month" className="date-picker__icon-button">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path d="M4.5 2.5 L8 6 L4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
