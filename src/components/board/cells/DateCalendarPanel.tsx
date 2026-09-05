"use client";

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "@/icons/workspace-icons";
import {
  MONTH_SHORT_NAMES,
  WEEKDAY_SHORT_NAMES,
  buildMonthGrid,
  formatInputDate,
  formatInputTime,
  isSameDay,
  parseInputDate,
  parseInputTime,
} from "./dateCalendarUtils";

export interface DateCalendarPanelProps {
  /** The currently selected date, or `null` when unset. */
  value: Date | null;
  /** Whether `value`'s time-of-day is meaningful — shows the optional time field pre-filled with it. */
  has_time?: boolean;
  /** Fired with the picked date/time — on a day click, the "Today" shortcut, or a completed text entry. `has_time` says whether the time-of-day should be persisted alongside the date. */
  onChange: (date: Date, has_time: boolean) => void;
}

const YEAR_OPTIONS = Array.from({ length: 41 }, (_, index) => new Date().getFullYear() - 20 + index);

/** Time-of-day a freshly-enabled time field starts from, absent any prior value. */
const DEFAULT_HOUR = 9;

/**
 * The month/year selectors + day grid behind `BoardValueCell`'s date editor.
 * The caller supplies its own positioning/chrome/outside-click handling and
 * mounts this fresh on open, so it owns no state beyond what's needed to
 * navigate the calendar before a pick is committed.
 */
const DateCalendarPanel = ({ value, has_time = false, onChange }: DateCalendarPanelProps) => {
  const [view_date, setViewDate] = useState<Date>(() => value ?? new Date());
  const [input_value, setInputValue] = useState<string>(() => (value ? formatInputDate(value) : ""));
  const [show_time, setShowTime] = useState<boolean>(has_time);
  const [time_text, setTimeText] = useState<string>(() => (value && has_time ? formatInputTime(value) : ""));

  const month_grid = useMemo(() => buildMonthGrid(view_date.getFullYear(), view_date.getMonth()), [view_date]);

  /** The time-of-day to apply to a newly picked date: what's typed if it parses, else the last committed time, else the default. */
  const resolveTime = () =>
    parseInputTime(time_text) ?? (value ? { hours: value.getHours(), minutes: value.getMinutes() } : { hours: DEFAULT_HOUR, minutes: 0 });

  const commitDate = (date: Date) => {
    setViewDate(date);
    setInputValue(formatInputDate(date));
    if (!show_time) {
      onChange(date, false);
      return;
    }
    const { hours, minutes } = resolveTime();
    const with_time = new Date(date);
    with_time.setHours(hours, minutes, 0, 0);
    setTimeText(formatInputTime(with_time));
    onChange(with_time, true);
  };

  const stepMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const handleInputChange = (raw_value: string) => {
    setInputValue(raw_value);
    const parsed = parseInputDate(raw_value);
    if (!parsed) return;
    if (show_time) {
      const { hours, minutes } = resolveTime();
      parsed.setHours(hours, minutes, 0, 0);
    }
    setViewDate(parsed);
    onChange(parsed, show_time);
  };

  const handleTimeChange = (raw_value: string) => {
    setTimeText(raw_value);
    const parsed_time = parseInputTime(raw_value);
    if (!parsed_time) return;
    const base = value ?? view_date;
    const with_time = new Date(base);
    with_time.setHours(parsed_time.hours, parsed_time.minutes, 0, 0);
    onChange(with_time, true);
  };

  const toggleTime = () => {
    const base = value ?? view_date;
    if (show_time) {
      setShowTime(false);
      setTimeText("");
      const without_time = new Date(base);
      without_time.setHours(0, 0, 0, 0);
      onChange(without_time, false);
      return;
    }
    setShowTime(true);
    const with_time = new Date(base);
    with_time.setHours(DEFAULT_HOUR, 0, 0, 0);
    setTimeText(formatInputTime(with_time));
    onChange(with_time, true);
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
        <button
          type="button"
          onClick={toggleTime}
          aria-pressed={show_time}
          title="Set time"
          className={`flex h-6 w-6 items-center justify-center rounded-[6px] ${show_time ? "bg-[#4f6bed] text-white" : "text-[#8b90a6] hover:bg-[#eef1f9] hover:text-[#1e2237]"}`}
        >
          <ClockIcon size={15} />
        </button>
      </div>

      <div className="mb-3 flex gap-1.5">
        <input
          type="text"
          value={input_value}
          onChange={(event) => handleInputChange(event.target.value)}
          placeholder="MM/DD/YYYY"
          className="h-9 min-w-0 flex-1 rounded-[6px] border border-[#dfe3ef] px-2.5 text-[13px] text-[#1e2237] focus:border-[#4f6bed] focus:outline-none"
        />
        {show_time && (
          <input
            type="text"
            value={time_text}
            onChange={(event) => handleTimeChange(event.target.value)}
            placeholder="9:00AM"
            className="h-9 w-[84px] shrink-0 rounded-[6px] border border-[#dfe3ef] px-2.5 text-[13px] text-[#1e2237] focus:border-[#4f6bed] focus:outline-none"
          />
        )}
      </div>

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
