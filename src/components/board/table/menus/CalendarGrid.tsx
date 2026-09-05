"use client";

import { useState } from "react";
import { ClockIcon } from "@/icons/workspace-icons";
import {
  DOW_CELLS,
  buildCalendarDays,
  combineDateTime,
  fmtTimeInput,
  isoOf,
  monthLabelOf,
  monthOf,
  parseTimeInput,
  shiftMonth,
  splitDateTime,
  type MonthCursor,
} from "../dateUtils";

interface CalendarGridProps {
  selected_iso?: string;
  range_start_iso?: string;
  range_end_iso?: string;
  accent?: string;
  onPick: (iso: string) => void;
  /** Shows the "Today" shortcut and an optional time-of-day field above the day grid — the single-date picker (DateMenu) opts into these; the range picker (Timeline) doesn't. */
  show_today_and_time?: boolean;
}

const DEFAULT_HOUR = 9;

export default function CalendarGrid({
  selected_iso,
  range_start_iso,
  range_end_iso,
  accent = "var(--color-boardtree-accent)",
  onPick,
  show_today_and_time = false,
}: CalendarGridProps) {
  const { date_iso: selected_date_iso, time: selected_time } = splitDateTime(selected_iso);
  const [cursor, setCursor] = useState<MonthCursor>(() => monthOf(range_start_iso || selected_date_iso));
  const [show_time, setShowTime] = useState(!!selected_time);
  const [time_text, setTimeText] = useState(() => (selected_time ? fmtTimeInput(selected_time.hours, selected_time.minutes) : ""));
  const days = buildCalendarDays(cursor);

  const styleFor = (iso: string) => {
    const is_selected = selected_date_iso === iso;
    const is_edge = range_start_iso === iso || (!!range_end_iso && range_end_iso === iso);
    const is_inside = !!range_start_iso && !!range_end_iso && iso > range_start_iso && iso < range_end_iso;
    const day = days.find((d) => d.iso === iso)!;
    if (is_selected || is_edge) return { bg: accent, fg: "#ffffff", weight: "600" };
    if (is_inside) return { bg: "var(--color-boardtree-accent-surface)", fg: "var(--color-boardtree-text)", weight: "400" };
    if (!day.in_month) return { bg: "transparent", fg: "var(--color-boardtree-text-faint)", weight: "400" };
    if (day.is_today) return { bg: "transparent", fg: accent, weight: "600" };
    return { bg: "transparent", fg: "var(--color-boardtree-text)", weight: "400" };
  };

  const pickDate = (date_iso: string) => {
    if (!show_time) {
      onPick(date_iso);
      return;
    }
    const time = parseTimeInput(time_text) ?? selected_time ?? { hours: DEFAULT_HOUR, minutes: 0 };
    setTimeText(fmtTimeInput(time.hours, time.minutes));
    onPick(combineDateTime(date_iso, time));
  };

  const pickToday = () => {
    const today = new Date();
    const today_iso = isoOf(today.getFullYear(), today.getMonth(), today.getDate());
    setCursor(monthOf(today_iso));
    pickDate(today_iso);
  };

  const toggleTime = () => {
    if (show_time) {
      setShowTime(false);
      setTimeText("");
      if (selected_date_iso) onPick(selected_date_iso);
      return;
    }
    setShowTime(true);
    const time = selected_time ?? { hours: DEFAULT_HOUR, minutes: 0 };
    setTimeText(fmtTimeInput(time.hours, time.minutes));
    if (selected_date_iso) onPick(combineDateTime(selected_date_iso, time));
  };

  const handleTimeChange = (raw_value: string) => {
    setTimeText(raw_value);
    const time = parseTimeInput(raw_value);
    if (!time || !selected_date_iso) return;
    onPick(combineDateTime(selected_date_iso, time));
  };

  return (
    <div>
      {show_today_and_time && (
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            onClick={pickToday}
            className="rounded-[6px] border border-boardtree-border px-2.5 py-1 text-[12px] font-medium text-boardtree-text-muted hover:border-boardtree-accent hover:text-boardtree-accent"
          >
            Today
          </button>
          <button
            type="button"
            onClick={toggleTime}
            aria-pressed={show_time}
            title="Set time"
            className={`flex h-6 w-6 items-center justify-center rounded-[6px] ${show_time ? "text-white" : "text-boardtree-text-muted hover:bg-boardtree-hover"}`}
            style={show_time ? { background: accent } : undefined}
          >
            <ClockIcon size={14} />
          </button>
        </div>
      )}
      {show_today_and_time && show_time && (
        <input
          type="text"
          value={time_text}
          onChange={(event) => handleTimeChange(event.target.value)}
          placeholder="9:00AM"
          className="mb-2 h-8 w-full rounded-[6px] border border-boardtree-border px-2.5 text-[12.5px] text-boardtree-text focus:border-boardtree-accent focus:outline-none"
        />
      )}
      <div className="flex items-center justify-between px-0.5 pb-2">
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c, -1))}
          className="flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover"
        >
          <svg viewBox="0 0 12 12" width="11" height="11"><path d="M7.5 3 L4 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div className="text-[13px] font-semibold text-boardtree-text">{monthLabelOf(cursor)}</div>
        <button
          type="button"
          onClick={() => setCursor((c) => shiftMonth(c, 1))}
          className="flex h-6 w-6 items-center justify-center rounded-[5px] text-boardtree-text-muted hover:bg-boardtree-hover"
        >
          <svg viewBox="0 0 12 12" width="11" height="11"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-[2px]">
        {DOW_CELLS.map((dow) => (
          <div key={dow.key} className="flex h-[22px] items-center justify-center text-[10.5px] text-boardtree-text-faint">
            {dow.label}
          </div>
        ))}
        {days.map((day) => {
          const s = styleFor(day.iso);
          return (
            <button
              type="button"
              key={day.iso}
              onClick={() => pickDate(day.iso)}
              className="flex h-[30px] items-center justify-center rounded-[6px] text-[12px] hover:shadow-[inset_0_0_0_1px_var(--color-boardtree-accent)]"
              style={{ background: s.bg, color: s.fg, fontWeight: s.weight }}
            >
              {day.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
