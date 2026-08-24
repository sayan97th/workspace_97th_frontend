/**
 * Pure date-math for the Gantt timeline — no React, no component state, so
 * `GanttChart` and its drag handlers can share one source of truth for how a
 * `YYYY-MM-DD` column value maps to a pixel offset and back.
 *
 * Every scale uses a *constant* pixel-per-day width (not a proportional
 * per-calendar-month width). A 31-day month therefore renders a few pixels
 * wider than a 28-day one at the "Month" scale — a standard, accepted
 * approximation in this class of chart — in exchange for one big win: a
 * pixel delta converts to a day delta with the same simple division
 * everywhere along the axis, so drag/resize math never has to special-case
 * where on the timeline the pointer happens to be.
 */

export type GanttScale = "day" | "week" | "month";

export type GanttScaleOption = {
  id: GanttScale;
  label: string;
  /** Pixel width of one day at this scale. */
  day_width: number;
};

export const GANTT_SCALES: GanttScaleOption[] = [
  { id: "day", label: "Days", day_width: 36 },
  { id: "week", label: "Weeks", day_width: 18 },
  { id: "month", label: "Months", day_width: 5 },
];

export const getGanttScale = (id: GanttScale): GanttScaleOption =>
  GANTT_SCALES.find((scale) => scale.id === id) ?? GANTT_SCALES[1];

/** Parses a `YYYY-MM-DD` (or full ISO timestamp) column value into a local-midnight `Date` — local, not UTC, components so a bar lands on the day a viewer actually expects regardless of timezone. Mirrors `BoardCalendar`'s own `parseIsoDate`. */
export const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Inverse of {@link parseIsoDate} — formats a `Date` back to `YYYY-MM-DD` in local time. */
export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addDaysLocal = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Whole-day difference `b - a`, ignoring time-of-day (both inputs are already local-midnight). */
export const diffDaysLocal = (a: Date, b: Date): number => Math.round((b.getTime() - a.getTime()) / 86_400_000);

const startOfLocalDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfLocalWeek = (date: Date): Date => addDaysLocal(startOfLocalDay(date), -date.getDay());

const startOfLocalMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const daysInMonth = (date: Date): number => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export type GanttHeaderSegment = { key: string; label: string; days: number };

export type GanttHeader = {
  /** The coarse row, e.g. months ("March 2026") for the Day/Week scales, or years for the Month scale. */
  major: GanttHeaderSegment[];
  /** The fine row, e.g. day numbers, week ranges, or month names. */
  minor: GanttHeaderSegment[];
};

/**
 * Builds the two header rows (mirrors Monday's own Gantt header: a coarse
 * band of months/years above a fine band of days/weeks/months) plus the
 * total day count the timeline spans, for `[range_start, range_end]`
 * inclusive.
 */
export const buildGanttHeader = (range_start: Date, range_end: Date, scale: GanttScale): GanttHeader => {
  const minor: GanttHeaderSegment[] = [];
  const major: GanttHeaderSegment[] = [];

  if (scale === "month") {
    let cursor = startOfLocalMonth(range_start);
    let current_year: number | null = null;
    while (cursor <= range_end) {
      const days = daysInMonth(cursor);
      minor.push({ key: toIsoDate(cursor), label: MONTH_NAMES[cursor.getMonth()].slice(0, 3), days });
      if (cursor.getFullYear() !== current_year) {
        current_year = cursor.getFullYear();
        major.push({ key: `y-${current_year}`, label: String(current_year), days: 0 });
      }
      major[major.length - 1].days += days;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return { major, minor };
  }

  const step_days = scale === "day" ? 1 : 7;
  let cursor = scale === "day" ? startOfLocalDay(range_start) : startOfLocalWeek(range_start);
  let current_month_key: string | null = null;

  while (cursor <= range_end) {
    const segment_end = addDaysLocal(cursor, step_days - 1);
    const label =
      scale === "day"
        ? String(cursor.getDate())
        : `${MONTH_NAMES[cursor.getMonth()].slice(0, 3)} ${cursor.getDate()} - ${
            segment_end.getMonth() !== cursor.getMonth() ? `${MONTH_NAMES[segment_end.getMonth()].slice(0, 3)} ` : ""
          }${segment_end.getDate()}`;
    minor.push({ key: toIsoDate(cursor), label, days: step_days });

    const month_key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    if (month_key !== current_month_key) {
      current_month_key = month_key;
      major.push({ key: month_key, label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`, days: 0 });
    }
    major[major.length - 1].days += step_days;

    cursor = addDaysLocal(cursor, step_days);
  }

  return { major, minor };
};

/** The `[start, end]` window the timeline renders, padded so bars never sit flush against the scroll edge. */
export const resolveGanttRange = (
  dates: Date[],
  scale: GanttScale
): { start: Date; end: Date } => {
  const today = startOfLocalDay(new Date());
  const all = dates.length > 0 ? dates : [today];
  const min = all.reduce((a, b) => (b < a ? b : a));
  const max = all.reduce((a, b) => (b > a ? b : a));

  const padding_days = scale === "month" ? 90 : scale === "week" ? 21 : 10;
  const anchor =
    scale === "month" ? startOfLocalMonth(min < today ? min : today) : scale === "week" ? startOfLocalWeek(min < today ? min : today) : min < today ? min : today;

  return {
    start: addDaysLocal(anchor, -padding_days),
    end: addDaysLocal(max > today ? max : today, padding_days),
  };
};
