"use client";

import { useMemo, useState } from "react";
import {
  MONTH_SHORT_NAMES,
  WEEKDAY_SHORT_NAMES,
  buildMonthGrid,
  formatInputDate,
  isSameDay,
  parseInputDate,
} from "./dateUtils";
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "./icons";

export interface DateCalendarPanelProps {
  /** The currently selected date, or `null` when unset. */
  value: Date | null;
  /** Fired with the picked date — on a day click, the "Today" shortcut, or a completed text entry. */
  onChange: (date: Date) => void;
}

const YEAR_OPTIONS = Array.from({ length: 41 }, (_, index) => new Date().getFullYear() - 20 + index);

/**
 * The month/year selectors + day grid shared by every "Date"-type cell across
 * the table board — the tree table's fixed Date column ({@link DateMenu})
 * and any dynamically-added Date column (`BoardValueCell`'s date editor).
 * Each caller supplies its own positioning/chrome/outside-click handling and
 * mounts this fresh on open, so it owns no state beyond what's needed to
 * navigate the calendar before a pick is committed.
 */
const DateCalendarPanel = ({ value, onChange }: DateCalendarPanelProps) => {
  const [view_date, setViewDate] = useState<Date>(() => value ?? new Date());
  const [input_value, setInputValue] = useState<string>(() => (value ? formatInputDate(value) : ""));

  const month_grid = useMemo(() => buildMonthGrid(view_date.getFullYear(), view_date.getMonth()), [view_date]);

  const commitDate = (date: Date) => {
    setViewDate(date);
    setInputValue(formatInputDate(date));
    onChange(date);
  };

  const stepMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const handleInputChange = (raw_value: string) => {
    setInputValue(raw_value);
    const parsed = parseInputDate(raw_value);
    if (!parsed) return;
    setViewDate(parsed);
    onChange(parsed);
  };

  return (
    <div className="rounded-xl bg-white p-3.5 text-left">
      <div className="mb-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => commitDate(new Date())}
          className="rounded-[6px] border border-[#dfe3ef] px-2.5 py-1 text-[12px] font-medium text-[#4a5068] hover:border-[#4f6bed] hover:text-[#4f6bed]"
        >
          Today
        </button>
        <div className="flex h-6 w-6 items-center justify-center text-[#8b90a6]">
          <ClockIcon size={15} />
        </div>
      </div>

      <input
        type="text"
        value={input_value}
        onChange={(event) => handleInputChange(event.target.value)}
        placeholder="MM/DD/YYYY"
        className="mb-3 h-9 w-full rounded-[6px] border border-[#dfe3ef] px-2.5 text-[13px] text-[#1e2237] focus:border-[#4f6bed] focus:outline-none"
      />

      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <select
            value={view_date.getMonth()}
            onChange={(event) => setViewDate((current) => new Date(current.getFullYear(), Number(event.target.value), 1))}
            className="rounded-[4px] border-none bg-transparent text-[13px] font-medium text-[#1e2237] focus:outline-none"
          >
            {MONTH_SHORT_NAMES.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={view_date.getFullYear()}
            onChange={(event) => setViewDate((current) => new Date(Number(event.target.value), current.getMonth(), 1))}
            className="rounded-[4px] border-none bg-transparent text-[13px] font-medium text-[#1e2237] focus:outline-none"
          >
            {YEAR_OPTIONS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => stepMonth(-1)}
            className="flex h-6 w-6 items-center justify-center rounded text-[#8b90a6] hover:bg-[#eef1f9] hover:text-[#1e2237]"
          >
            <ChevronLeftIcon size={11} />
          </button>
          <button
            type="button"
            onClick={() => stepMonth(1)}
            className="flex h-6 w-6 items-center justify-center rounded text-[#8b90a6] hover:bg-[#eef1f9] hover:text-[#1e2237]"
          >
            <ChevronRightIcon size={11} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_SHORT_NAMES.map((weekday) => (
          <div key={weekday} className="text-[11px] font-medium text-[#a4aac2]">
            {weekday}
          </div>
        ))}
        {month_grid.map((day) => {
          const is_current_month = day.getMonth() === view_date.getMonth();
          const is_selected = !!value && isSameDay(day, value);
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => commitDate(day)}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12.5px] ${is_selected
                ? "bg-[#4f6bed] font-semibold text-white"
                : is_current_month
                  ? "text-[#1e2237] hover:bg-[#eef1f9]"
                  : "text-[#c6cbd8] hover:bg-[#f4f6fb]"
                }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateCalendarPanel;
