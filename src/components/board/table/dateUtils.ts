import { DAY_OF_WEEK_LABELS, MONTH_LABELS } from "./constants";

const pad2 = (n: number) => (n < 10 ? "0" + n : String(n));

export function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function fmtDate(iso: string | undefined): string {
  const { date_iso, time } = splitDateTime(iso);
  const parts = date_iso.split("-");
  if (parts.length !== 3) return "";
  const date_label = `${MONTH_LABELS[Number(parts[1]) - 1]} ${Number(parts[2])}, ${parts[0]}`;
  return time ? `${date_label}, ${fmtTimeInput(time.hours, time.minutes)}` : date_label;
}

/** Splits a possibly time-bearing date column value ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm") into its date and time parts. */
export function splitDateTime(value: string | undefined): { date_iso: string; time: { hours: number; minutes: number } | null } {
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(value || ""));
  if (!match) return { date_iso: "", time: null };
  const [, date_iso, hour_str, minute_str] = match;
  return { date_iso, time: hour_str ? { hours: Number(hour_str), minutes: Number(minute_str) } : null };
}

/** Combines a date-only iso with an optional time-of-day into what a date column stores. */
export function combineDateTime(date_iso: string, time: { hours: number; minutes: number } | null): string {
  return time ? `${date_iso}T${pad2(time.hours)}:${pad2(time.minutes)}` : date_iso;
}

/** Formats an hours/minutes pair into the calendar's editable "9:00AM" time text — spaceless, matching how the user types it. */
export function fmtTimeInput(hours: number, minutes: number): string {
  const period = hours >= 12 ? "PM" : "AM";
  const twelve_hour = hours % 12 || 12;
  return `${twelve_hour}:${pad2(minutes)}${period}`;
}

/** Parses the calendar's editable time text ("9:00 AM", "9:00pm", "14:30") into hours/minutes, or null while incomplete/invalid. */
export function parseTimeInput(value: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(value.trim());
  if (!match) return null;
  const [, hour_str, minute_str, period_str] = match;
  const minutes = minute_str ? Number(minute_str) : 0;
  if (minutes > 59) return null;

  let hours = Number(hour_str);
  if (period_str) {
    if (hours < 1 || hours > 12) return null;
    hours = hours % 12;
    if (period_str.toLowerCase() === "pm") hours += 12;
  } else if (hours > 23) {
    return null;
  }
  return { hours, minutes };
}

export function fmtDateShort(iso: string | undefined): string {
  const parts = String(iso || "").split("-");
  if (parts.length !== 3) return "";
  return `${MONTH_LABELS[Number(parts[1]) - 1]} ${Number(parts[2])}`;
}

export function fmtRange(startIso: string, endIso: string): string {
  if (!startIso && !endIso) return "";
  if (!endIso) return fmtDateShort(startIso);
  const a = startIso.split("-");
  const b = endIso.split("-");
  if (a[0] === b[0] && a[1] === b[1]) return `${fmtDateShort(startIso)} – ${Number(b[2])}`;
  return `${fmtDateShort(startIso)} – ${fmtDateShort(endIso)}`;
}

export interface MonthCursor {
  year: number;
  month: number;
}

export function monthOf(iso: string | undefined): MonthCursor {
  const parts = String(iso || "").split("-");
  if (parts.length === 3) return { year: Number(parts[0]), month: Number(parts[1]) - 1 };
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() };
}

export function shiftMonth(cursor: MonthCursor, delta: number): MonthCursor {
  const d = new Date(cursor.year, cursor.month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export const DOW_CELLS = DAY_OF_WEEK_LABELS.map((label, i) => ({ key: `dow-${i}`, label }));

export interface CalendarDay {
  iso: string;
  label: string;
  in_month: boolean;
  is_today: boolean;
}

export function buildCalendarDays(cursor: MonthCursor): CalendarDay[] {
  const first = new Date(cursor.year, cursor.month, 1);
  const start = 1 - first.getDay();
  const today = new Date();
  const today_iso = isoOf(today.getFullYear(), today.getMonth(), today.getDate());
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(cursor.year, cursor.month, start + i);
    const iso = isoOf(d.getFullYear(), d.getMonth(), d.getDate());
    days.push({
      iso,
      label: String(d.getDate()),
      in_month: d.getMonth() === cursor.month,
      is_today: iso === today_iso,
    });
  }
  return days;
}

export function monthLabelOf(cursor: MonthCursor): string {
  return `${MONTH_LABELS[cursor.month]} ${cursor.year}`;
}

export function parseRangeValue(value: string | undefined): { start_iso: string; end_iso: string } {
  const parts = String(value || "").split("..");
  return { start_iso: parts[0] || "", end_iso: parts[1] || "" };
}

export function encodeRangeValue(start_iso: string, end_iso: string): string {
  return `${start_iso}..${end_iso}`;
}
