/**
 * Settings and date helpers shared by the Calendar view (`BoardCalendar`)
 * and the board that feeds it (`TableBoardView`).
 *
 * Like monday.com's Calendar view, every Date and Timeline column can place
 * items on the calendar. A Date column puts an item on one day (or at one
 * time, when the date carries a time), a Timeline column spans its range.
 */
import { toIsoDate } from "../gantt/ganttDate";

/** Which colors an item's events: a Status column id, the item's group, or nothing (one neutral color). */
export type BoardCalendarColorBy = string | "group" | "none";

/** A `calendar`-type view's saved settings, persisted as `BoardViewDto.calendar_config`. */
export type BoardCalendarConfig = {
  /** Date/Timeline column ids shown on the calendar. `null` shows every Date and Timeline column. */
  date_column_ids?: string[] | null;
  /** `null` colors by the board's first Status column. */
  color_by?: BoardCalendarColorBy | null;
  /** Groups whose items are left off the calendar (the header's filter). */
  hidden_group_ids?: number[] | null;
  /** Shows the first People column's avatars on each event. Defaults to true. */
  show_people?: boolean;
  /** 0 = Sunday (monday.com's default), 1 = Monday. */
  week_starts_on?: 0 | 1;
};

/** Month/Week/Day, the modes of monday.com's calendar switcher. */
export type BoardCalendarMode = "month" | "week" | "day";

export const CALENDAR_MODES: { key: BoardCalendarMode; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
];

/** Event color when nothing colors it, monday.com's primary blue. */
export const DEFAULT_EVENT_COLOR = "#579bfc";

/** How long a timed (Date column with time) event lasts on the Week/Day grid. */
export const TIMED_EVENT_MINUTES = 60;

export type ParsedCalendarDate = { date: Date; has_time: boolean };

/**
 * Parses a Date column value, `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm`, into a
 * local `Date`. Local components (not `new Date(value)`, which reads a bare
 * date as UTC midnight) keep the event on the day the viewer expects.
 */
export const parseCalendarDate = (value: string): ParsedCalendarDate | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value);
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match;
  const has_time = hours !== undefined;
  const date = new Date(Number(year), Number(month) - 1, Number(day), has_time ? Number(hours) : 0, has_time ? Number(minutes) : 0);
  return Number.isNaN(date.getTime()) ? null : { date, has_time };
};

const pad = (value: number): string => String(value).padStart(2, "0");

/** Formats a `Date` to `YYYY-MM-DDTHH:mm` in local time, the Date column's "with time" format. */
export const toIsoDateTime = (date: Date): string => `${toIsoDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** "10:30 AM", the time label of a timed event. */
export const formatEventTime = (date: Date): string =>
  date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** A `YYYY-MM-DD` start and optional inclusive end, also used by the Gantt view's bars. */
export type BoardCalendarRange = {
  start: string;
  /** Defaults to `start` (a single day) when omitted. */
  end?: string | null;
};
