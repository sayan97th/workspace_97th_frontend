"use client";

import { useMemo, useRef, useState } from "react";
import {
  MONTH_SHORT_NAMES,
  WEEKDAY_SHORT_NAMES,
  buildMonthGrid,
  formatBoardDate,
  formatInputDate,
  isSameDay,
  parseBoardDate,
  parseInputDate,
} from "./dateUtils";
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, SparkleIcon } from "./icons";
import { useOutsideClick } from "./useOutsideClick";

interface DateMenuProps {
  /** The cell's current stored date string (e.g. "Sep 17, 2026"), or "" when unset. */
  value: string;
  onPickDate: (date_string: string) => void;
  onClose: () => void;
  top_offset_px: number;
}

const YEAR_OPTIONS = Array.from({ length: 41 }, (_, index) => new Date().getFullYear() - 20 + index);

const DateMenu = ({ value, onPickDate, onClose, top_offset_px }: DateMenuProps) => {
  const menu_ref = useRef<HTMLDivElement>(null);
  useOutsideClick(menu_ref, true, onClose);

  const [selected_date, setSelectedDate] = useState<Date | null>(() => parseBoardDate(value));
  const [view_date, setViewDate] = useState<Date>(() => parseBoardDate(value) ?? new Date());
  const [input_value, setInputValue] = useState<string>(() => {
    const initial = parseBoardDate(value);
    return initial ? formatInputDate(initial) : "";
  });

  const month_grid = useMemo(() => buildMonthGrid(view_date.getFullYear(), view_date.getMonth()), [view_date]);

  const commitDate = (date: Date) => {
    setSelectedDate(date);
    setViewDate(date);
    setInputValue(formatInputDate(date));
    onPickDate(formatBoardDate(date));
  };

  const stepMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const handleInputChange = (raw_value: string) => {
    setInputValue(raw_value);
    const parsed = parseInputDate(raw_value);
    if (!parsed) return;
    setSelectedDate(parsed);
    setViewDate(parsed);
    onPickDate(formatBoardDate(parsed));
  };

  return (
    <div
      ref={menu_ref}
      className="absolute left-1/2 z-[60] w-[300px] -translate-x-1/2 rounded-[10px] border border-[#e3e6ef] bg-white p-3.5 text-left shadow-[0_16px_40px_rgba(30,34,55,0.20)]"
      style={{ top: top_offset_px }}
    >
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
          const is_selected = !!selected_date && isSameDay(day, selected_date);
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

export default DateMenu;
