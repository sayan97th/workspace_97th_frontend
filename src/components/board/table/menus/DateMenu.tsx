"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDownIcon, ClockIcon } from "@/icons/workspace-icons";
import { MONTH_LABELS } from "../constants";
import {
  buildCalendarDays,
  combineDateTime,
  fmtDateInput,
  fmtTimeInput,
  monthOf,
  parseDateInput,
  parseTimeInput,
  shiftMonth,
  splitDateTime,
  todayIso,
  type MonthCursor,
} from "../dateUtils";
import { useOutsideClick } from "../useOutsideClick";
import PopoverPanel from "./PopoverPanel";
import "./date-picker.css";

interface DateMenuProps {
  selected_iso?: string;
  onPick: (iso: string) => void;
  onClear: () => void;
  onClose: () => void;
}

/** monday's two letter weekday headers, Sunday first like `buildCalendarDays`. */
const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
/** The time a date gets when the clock is switched on and no time was set before. */
const DEFAULT_TIME = { hours: 9, minutes: 0 };
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
  const [open_select, setOpenSelect] = useState<OpenSelect>(null);
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

  const month_options = MONTH_LABELS.map((label, index) => ({ value: index, label }));
  const year_options = Array.from({ length: YEAR_SPAN * 2 + 1 }, (_, index) => {
    const year = cursor.year - YEAR_SPAN + index;
    return { value: year, label: String(year) };
  });

  const toggleSelect = (select: Exclude<OpenSelect, null>) => setOpenSelect((current) => (current === select ? null : select));
  const closeSelect = () => setOpenSelect(null);

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
                setCursor((current) => ({ ...current, month }));
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
                setCursor((current) => ({ ...current, year }));
                closeSelect();
              }}
            />
          </div>
          <div className="date-picker__arrows">
            <button type="button" onClick={() => setCursor((current) => shiftMonth(current, -1))} aria-label="Previous month" className="date-picker__icon-button">
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" onClick={() => setCursor((current) => shiftMonth(current, 1))} aria-label="Next month" className="date-picker__icon-button">
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M4.5 2.5 L8 6 L4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

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
