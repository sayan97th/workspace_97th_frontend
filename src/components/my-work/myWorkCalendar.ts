import type { MyWorkItemDto } from "@/types/personal";
import { addDays, toDateKey } from "./myWorkBuckets";
import type { MyWorkCalendarMode } from "./myWorkPreferences";

export const MY_WORK_CALENDAR_MODE_LABELS: Record<MyWorkCalendarMode, string> = {
  month: "Month",
  week: "Week",
  day: "Day",
};

export const MY_WORK_CALENDAR_MODES: MyWorkCalendarMode[] = ["month", "week", "day"];

/** Legend colors, handed out to date sources in alphabetical order so a source keeps its color between visits. */
const SOURCE_PALETTE = ["#579bfc", "#a25ddc", "#00c875", "#fdab3d", "#e2445c", "#ff642e", "#66ccff", "#9cd326"];

/** A date column label the items are laid out by, shown as one legend entry. */
export type MyWorkCalendarSource = { key: string; label: string; color: string };

/** One item placed on the calendar, from its start day to its due day (inclusive). */
export type MyWorkCalendarEvent = {
  item: MyWorkItemDto;
  start_key: string;
  end_key: string;
  source_key: string;
};

/** One event cut to the days of a single week row, with the lane (line) it sits on. */
export type MyWorkCalendarSegment = {
  event: MyWorkCalendarEvent;
  /** Day index inside the row, 0 based. */
  first_column: number;
  /** Number of days it covers inside the row. */
  span: number;
  lane: number;
  /** Whether the event goes on before or after this row, so the pill keeps a square edge there. */
  continues_before: boolean;
  continues_after: boolean;
};

export type MyWorkCalendarDay = { key: string; date: Date; is_today: boolean; in_month: boolean };

const sourceKeyOf = (label: string): string => label.trim().toLowerCase() || "date";

/**
 * Places every dated item on the calendar and classifies it by the date
 * column it comes from (its label, like "Timeline" or "Due date"), which is
 * what the legend under the calendar lists.
 */
export const buildCalendarEvents = (items: MyWorkItemDto[]): { events: MyWorkCalendarEvent[]; sources: MyWorkCalendarSource[] } => {
  const labels = new Map<string, string>();
  const events: MyWorkCalendarEvent[] = [];

  for (const item of items) {
    if (!item.date) continue;
    const end_key = item.date.value.slice(0, 10);
    const start_candidate = item.date.start?.slice(0, 10) ?? end_key;
    const label = item.date_column?.label ?? (item.date_column?.type === "timeline" ? "Timeline" : "Date");
    const source_key = sourceKeyOf(label);
    if (!labels.has(source_key)) labels.set(source_key, label.trim() || "Date");
    events.push({ item, start_key: start_candidate <= end_key ? start_candidate : end_key, end_key, source_key });
  }

  const sources = [...labels.entries()]
    .sort(([, first], [, second]) => first.localeCompare(second))
    .map(([key, label], index) => ({ key, label, color: SOURCE_PALETTE[index % SOURCE_PALETTE.length] }));

  // Longer events first, so they take the top lanes and shorter ones fill the gaps below.
  events.sort((first, second) => first.start_key.localeCompare(second.start_key) || second.end_key.localeCompare(first.end_key) || first.item.name.localeCompare(second.item.name));

  return { events, sources };
};

const startOfWeek = (date: Date): Date => addDays(date, -date.getDay());

const buildDay = (date: Date, today_key: string, month: number | null): MyWorkCalendarDay => {
  const key = toDateKey(date);
  return { key, date, is_today: key === today_key, in_month: month === null || date.getMonth() === month };
};

/**
 * The week rows a mode shows around `cursor`: every week the month touches
 * (5 or 6 rows), the cursor's week, or just the cursor's day.
 */
export const buildCalendarRows = (cursor: Date, mode: MyWorkCalendarMode, today_key: string): MyWorkCalendarDay[][] => {
  if (mode === "day") return [[buildDay(cursor, today_key, null)]];

  if (mode === "week") {
    const first = startOfWeek(cursor);
    return [Array.from({ length: 7 }, (_, index) => buildDay(addDays(first, index), today_key, null))];
  }

  const month_start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const month_end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const rows: MyWorkCalendarDay[][] = [];
  for (let week_start = startOfWeek(month_start); week_start <= month_end; week_start = addDays(week_start, 7)) {
    rows.push(Array.from({ length: 7 }, (_, index) => buildDay(addDays(week_start, index), today_key, cursor.getMonth())));
  }
  return rows;
};

/** Cuts the events to one row of days and stacks overlapping ones on separate lanes. */
export const layoutRowSegments = (row: MyWorkCalendarDay[], events: MyWorkCalendarEvent[]): MyWorkCalendarSegment[] => {
  const row_start = row[0].key;
  const row_end = row[row.length - 1].key;
  const lane_ends: number[] = [];
  const segments: MyWorkCalendarSegment[] = [];

  for (const event of events) {
    if (event.end_key < row_start || event.start_key > row_end) continue;
    const first_column = Math.max(0, row.findIndex((day) => day.key >= event.start_key));
    const last_found = row.findIndex((day) => day.key > event.end_key);
    const last_column = last_found === -1 ? row.length - 1 : last_found - 1;

    let lane = lane_ends.findIndex((end) => end < first_column);
    if (lane === -1) lane = lane_ends.length;
    lane_ends[lane] = last_column;

    segments.push({
      event,
      first_column,
      span: last_column - first_column + 1,
      lane,
      continues_before: event.start_key < row_start,
      continues_after: event.end_key > row_end,
    });
  }

  return segments;
};

export const shiftCalendarCursor = (cursor: Date, mode: MyWorkCalendarMode, direction: 1 | -1): Date => {
  if (mode === "month") return new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1);
  return addDays(cursor, mode === "week" ? 7 * direction : direction);
};

const ordinalOf = (day: number): string => {
  const tens = day % 100;
  if (tens >= 11 && tens <= 13) return `${day}th`;
  return `${day}${{ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th"}`;
};

/** "October 2026" for Month and Week, "Oct 9th, 2026" for Day, like monday.com. */
export const calendarTitleOf = (cursor: Date, mode: MyWorkCalendarMode): string => {
  if (mode === "day") {
    return `${cursor.toLocaleDateString("en-US", { month: "short" })} ${ordinalOf(cursor.getDate())}, ${cursor.getFullYear()}`;
  }
  return cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};
