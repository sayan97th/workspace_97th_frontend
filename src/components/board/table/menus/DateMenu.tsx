"use client";

import { useState, type KeyboardEvent } from "react";
import { ClockIcon } from "@/icons/workspace-icons";
import {
  buildCalendarDays,
  combineDateTime,
  fmtDateInput,
  fmtTimeInput,
  monthOf,
  parseDateInput,
  parseTimeInput,
  splitDateTime,
  todayIso,
  type MonthCursor,
} from "../dateUtils";
import DatePickerMonthNav, { WEEKDAY_LABELS } from "./DatePickerMonthNav";
import PopoverPanel from "./PopoverPanel";
import "./date-picker.css";

interface DateMenuProps {
  selected_iso?: string;
  onPick: (iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/** The time a date gets when the clock is switched on and no time was set before. */
const DEFAULT_TIME = { hours: 9, minutes: 0 };

/**
 * The table's Date cell picker, styled after monday.com: a "Today" shortcut and a clock toggle
 * on top, an editable "MM/DD/YYYY" field (plus the time when the clock is on), month and year
 * dropdowns with arrows, and the day grid. The time is optional, the value stays a plain
 * "YYYY-MM-DD" until the user switches the clock on. The card draws its own chrome
 * (`date-picker.css`), so the panel is `unstyled`.
 */
export default function DateMenu({ selected_iso, onPick, onClear, onClose }: DateMenuProps) {
  const { date_iso: selected_date_iso, time: selected_time } = splitDateTime(selected_iso);
  const [cursor, setCursor] = useState<MonthCursor>(() => monthOf(selected_date_iso));
  const [show_time, setShowTime] = useState(!!selected_time);
  const [date_text, setDateText] = useState(() => fmtDateInput(selected_iso));
  const [time_text, setTimeText] = useState(() => (selected_time ? fmtTimeInput(selected_time.hours, selected_time.minutes) : ""));
  // The stored value the text fields were last filled from. When it changes from outside
  // (another tab, a realtime update) the fields follow it, see React's "adjusting state on prop change".
  const [synced_iso, setSyncedIso] = useState(selected_iso);

  if (synced_iso !== selected_iso) {
    setSyncedIso(selected_iso);
    setDateText(fmtDateInput(selected_iso));
    if (selected_time) setTimeText(fmtTimeInput(selected_time.hours, selected_time.minutes));
  }

  const days = buildCalendarDays(cursor);
  const today_iso = todayIso();

  /** The time the next pick carries: the typed one, else the stored one, else 9:00AM. Null while the clock is off. */
  const activeTime = () => (show_time ? parseTimeInput(time_text) ?? selected_time ?? DEFAULT_TIME : null);

  const pickDate = (date_iso: string) => {
    const time = activeTime();
    if (time) setTimeText(fmtTimeInput(time.hours, time.minutes));
    setDateText(fmtDateInput(date_iso));
    setCursor(monthOf(date_iso));
    onPick(combineDateTime(date_iso, time));
  };

  const toggleTime = () => {
    if (show_time) {
      setShowTime(false);
      setTimeText("");
      if (selected_date_iso) onPick(selected_date_iso);
      return;
    }
    const time = selected_time ?? DEFAULT_TIME;
    setShowTime(true);
    setTimeText(fmtTimeInput(time.hours, time.minutes));
    if (selected_date_iso) onPick(combineDateTime(selected_date_iso, time));
  };

  // Typed text is committed on Enter or blur, not on every keystroke, so a half typed
  // value never reaches the server. Text that doesn't parse goes back to the stored value.
  const commitDateText = () => {
    const parsed_iso = parseDateInput(date_text);
    if (!parsed_iso) {
      setDateText(fmtDateInput(selected_iso));
      return;
    }
    if (parsed_iso !== selected_date_iso) pickDate(parsed_iso);
    else setDateText(fmtDateInput(parsed_iso));
  };

  const commitTimeText = () => {
    const time = parseTimeInput(time_text);
    if (!time) {
      const fallback = selected_time ?? DEFAULT_TIME;
      setTimeText(fmtTimeInput(fallback.hours, fallback.minutes));
      return;
    }
    setTimeText(fmtTimeInput(time.hours, time.minutes));
    const next_iso = selected_date_iso ? combineDateTime(selected_date_iso, time) : "";
    if (next_iso && next_iso !== selected_iso) onPick(next_iso);
  };

  const commitOnEnter = (commit: () => void) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commit();
  };

  const clearDate = () => {
    setDateText("");
    setTimeText("");
    setShowTime(false);
    onClear();
  };

  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full w-max -translate-x-1/2">
      <div className="date-picker" role="dialog" aria-label="Pick a date">
        <div className="date-picker__header">
          <button type="button" onClick={() => pickDate(today_iso)} className="date-picker__today">
            Today
          </button>
          <button
            type="button"
            onClick={toggleTime}
            aria-pressed={show_time}
            aria-label={show_time ? "Remove time" : "Add time"}
            title={show_time ? "Remove time" : "Add time"}
            className="date-picker__icon-button"
          >
            <ClockIcon size={18} />
          </button>
        </div>

        <div className="date-picker__field">
          <input
            type="text"
            value={date_text}
            onChange={(event) => setDateText(event.target.value)}
            onBlur={commitDateText}
            onKeyDown={commitOnEnter(commitDateText)}
            placeholder="MM/DD/YYYY"
            aria-label="Date"
            className="date-picker__input date-picker__input--date"
          />
          {show_time && (
            <>
              <span className="date-picker__field-divider" aria-hidden="true" />
              <input
                type="text"
                value={time_text}
                onChange={(event) => setTimeText(event.target.value)}
                onBlur={commitTimeText}
                onKeyDown={commitOnEnter(commitTimeText)}
                placeholder="9:00AM"
                aria-label="Time"
                className="date-picker__input date-picker__input--time"
              />
            </>
          )}
          {selected_date_iso && (
            <button type="button" onClick={clearDate} aria-label="Clear date" title="Clear date" className="date-picker__clear">
              <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                <path d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <DatePickerMonthNav cursor={cursor} onCursorChange={setCursor} />

        <div className="date-picker__grid" role="grid">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} role="columnheader" className="date-picker__weekday">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const is_selected = day.iso === selected_date_iso;
            const day_class = [
              "date-picker__day",
              !day.in_month && "date-picker__day--outside",
              day.iso === today_iso && "date-picker__day--today",
              is_selected && "date-picker__day--selected",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button type="button" role="gridcell" key={day.iso} aria-selected={is_selected} onClick={() => pickDate(day.iso)} className={day_class}>
                {day.label}
              </button>
            );
          })}
        </div>
      </div>
    </PopoverPanel>
  );
}
