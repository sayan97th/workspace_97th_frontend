import { MONTH_LABELS } from "./constants";

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

/** One side of a range label, "Mar 31", plus ", '25" when the date is not in the current year. */
function fmtRangeEdge(iso: string): string {
  const year = iso.slice(0, 4);
  const year_suffix = Number(year) === new Date().getFullYear() ? "" : `, '${year.slice(2)}`;
  return `${fmtDateShort(iso)}${year_suffix}`;
}

/**
 * A Timeline range label, monday style: "Oct 11 - 18" inside one month, "Sep 28 - Oct 4"
 * across months, and "Mar 31, '25 - Apr 5, '25" when the dates are not in the current year.
 */
export function fmtRange(startIso: string, endIso: string): string {
  if (!startIso && !endIso) return "";
  if (!endIso || endIso === startIso) return fmtRangeEdge(startIso || endIso);
  if (startIso.slice(0, 7) === endIso.slice(0, 7)) {
    const end_day = Number(endIso.slice(8, 10));
    const start_label = fmtRangeEdge(startIso);
    const year_suffix = start_label.slice(fmtDateShort(startIso).length);
    return `${fmtDateShort(startIso)} - ${end_day}${year_suffix}`;
  }
  return `${fmtRangeEdge(startIso)} - ${fmtRangeEdge(endIso)}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between two "YYYY-MM-DD" dates, counted in UTC so daylight saving shifts never skew it. */
function daysBetween(from_iso: string, to_iso: string): number {
  const toUtc = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return Math.round((toUtc(to_iso) - toUtc(from_iso)) / MS_PER_DAY);
}

/** How many days a range covers, both ends included, the "7d" a Timeline pill shows on hover. */
export function rangeDayCount(start_iso: string, end_iso: string): number {
  if (!start_iso) return 0;
  return daysBetween(start_iso, end_iso || start_iso) + 1;
}

/** The share of a range that has already gone by (0 to 1), today counted as elapsed, which a Timeline pill fills with the group color. */
export function rangeElapsedRatio(start_iso: string, end_iso: string): number {
  const total_days = rangeDayCount(start_iso, end_iso);
  if (!total_days) return 0;
  const elapsed_days = daysBetween(start_iso, todayIso()) + 1;
  return Math.min(1, Math.max(0, elapsed_days / total_days));
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

/**
 * Reads a Timeline value in either stored shape: the `"start..end"` string
 * this cell itself writes, or the `{ start, end }` object the Gantt view and
 * the monday.com importers write. Either side may carry a `THH:mm` time, which
 * a range ignores.
 */
export function parseRangeValue(value: unknown): { start_iso: string; end_iso: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const range = value as { start?: unknown; end?: unknown };
    const start_iso = typeof range.start === "string" ? range.start.slice(0, 10) : "";
    const end_iso = typeof range.end === "string" ? range.end.slice(0, 10) : "";
    return { start_iso: start_iso || end_iso, end_iso: end_iso || start_iso };
  }
  const parts = String(value || "").split("..");
  return { start_iso: parts[0] || "", end_iso: parts[1] || "" };
}

export function encodeRangeValue(start_iso: string, end_iso: string): string {
  return `${start_iso}..${end_iso}`;
}

const WEEKDAY_SHORT_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Today's date as "YYYY-MM-DD" in the viewer's local time zone. */
export function todayIso(): string {
  const today = new Date();
  return isoOf(today.getFullYear(), today.getMonth(), today.getDate());
}

/** Formats a stored date column value as the date picker's editable "MM/DD/YYYY" text. */
export function fmtDateInput(iso: string | undefined): string {
  const { date_iso } = splitDateTime(iso);
  const parts = date_iso.split("-");
  if (parts.length !== 3) return "";
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

/** Parses the date picker's typed text ("09/18/2026", "9/18/2026" or "2026-09-18") into "YYYY-MM-DD", or null when it is not a real date. */
export function parseDateInput(value: string): string | null {
  const text = value.trim();
  const us_match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  const iso_match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  let year: number;
  let month: number;
  let day: number;
  if (us_match) {
    [month, day, year] = [Number(us_match[1]), Number(us_match[2]), Number(us_match[3])];
  } else if (iso_match) {
    [year, month, day] = [Number(iso_match[1]), Number(iso_match[2]), Number(iso_match[3])];
  } else {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return isoOf(year, month - 1, day);
}

/** The date cell's label while its picker is open, monday style: "Fri, Sep 18", the year only when it is not this year, plus the time when one is set. */
export function fmtDateWithWeekday(iso: string | undefined): string {
  const { date_iso, time } = splitDateTime(iso);
  const parts = date_iso.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts.map(Number);
  const weekday = WEEKDAY_SHORT_LABELS[new Date(year, month - 1, day).getDay()];
  const year_suffix = year === new Date().getFullYear() ? "" : `, ${year}`;
  const date_label = `${weekday}, ${MONTH_LABELS[month - 1]} ${day}${year_suffix}`;
  return time ? `${date_label}, ${fmtTimeInput(time.hours, time.minutes)}` : date_label;
}

/** True when the stored date falls before today, which the date cell flags with a red alert icon. */
export function isPastDate(iso: string | undefined): boolean {
  const { date_iso } = splitDateTime(iso);
  return !!date_iso && date_iso < todayIso();
}
