/**
 * Pure date math for the Gantt timeline. No React and no component state, so
 * `GanttChart` and its drag handlers share one source of truth for how a
 * `YYYY-MM-DD` column value maps to a pixel offset and back.
 *
 * Every scale uses a constant pixel per day width (not a proportional per
 * calendar month width), so a pixel delta converts to a day delta with the
 * same division everywhere on the axis and drag math never has to care where
 * on the timeline the pointer is. The header bands are still drawn day exact:
 * a month band ends on the month's last day, even in the middle of a week.
 */

/** Days, Weeks, Months, Quarters and Years, the scales of monday.com's Gantt. */
export type GanttScale = "day" | "week" | "month" | "quarter" | "year";

export type GanttScaleOption = {
  id: GanttScale;
  label: string;
  /** Pixel width of one day at this scale, before zooming. */
  day_width: number;
  /** Days of padding kept around the items, so bars never sit flush against the scroll edge. */
  padding_days: number;
  /** Length of a bar created by clicking an undated row's empty track. */
  new_bar_days: number;
};

export const GANTT_SCALES: GanttScaleOption[] = [
  { id: "day", label: "Days", day_width: 40, padding_days: 14, new_bar_days: 1 },
  { id: "week", label: "Weeks", day_width: 32, padding_days: 28, new_bar_days: 1 },
  { id: "month", label: "Months", day_width: 6, padding_days: 92, new_bar_days: 7 },
  { id: "quarter", label: "Quarters", day_width: 2.2, padding_days: 184, new_bar_days: 14 },
  { id: "year", label: "Years", day_width: 0.8, padding_days: 366, new_bar_days: 30 },
];

/** Multipliers the "-" and "+" buttons step through, 1 being the scale's own width. */
export const GANTT_ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2] as const;

export const isGanttScale = (value: unknown): value is GanttScale => GANTT_SCALES.some((scale) => scale.id === value);

export const getGanttScale = (id: GanttScale): GanttScaleOption =>
  GANTT_SCALES.find((scale) => scale.id === id) ?? GANTT_SCALES[1];

/** Parses a `YYYY-MM-DD` (or full ISO timestamp) column value into a local midnight `Date`, local components so a bar lands on the day a viewer expects regardless of timezone. */
export const parseIsoDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Inverse of {@link parseIsoDate}, formats a `Date` back to `YYYY-MM-DD` in local time. Also used by the Calendar view. */
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

/** Whole day difference `b - a`, ignoring time of day and daylight saving shifts. */
export const diffDaysLocal = (a: Date, b: Date): number => {
  const utc_a = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc_b = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utc_b - utc_a) / 86_400_000);
};

export const startOfLocalDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Weeks start on Sunday, like monday.com's Gantt header. */
const startOfLocalWeek = (date: Date): Date => addDaysLocal(startOfLocalDay(date), -date.getDay());

const startOfLocalMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

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

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const shortMonth = (date: Date): string => MONTH_NAMES[date.getMonth()].slice(0, 3);

/**
 * US week number (weeks start on Sunday, week 1 holds January 1st), the
 * numbering monday.com prints in its header: Jun 8 - 14, 2025 is "W24" and
 * Sep 27 - Oct 3, 2026 is "W40".
 */
export const getWeekNumber = (date: Date): number => {
  const week_start = startOfLocalWeek(date);
  // The week holding Jan 1st of the year the week ends in is week 1.
  const week_end = addDaysLocal(week_start, 6);
  const first_week_start = startOfLocalWeek(new Date(week_end.getFullYear(), 0, 1));
  return Math.floor(diffDaysLocal(first_week_start, week_start) / 7) + 1;
};

export type GanttHeaderSegment = {
  key: string;
  /** Full label, e.g. "W24 8 - 14", "June", "Mon 8". */
  label: string;
  /** Shorter label used when the full one doesn't fit the segment, e.g. "W24", "Jun", "8". */
  compact_label: string;
  /** Bold leading part of a major band label ("June" of "June 2025"), empty when the whole label is one weight. */
  strong_label?: string;
  /** Offset from the range start, in days. */
  offset_days: number;
  days: number;
  /** The segment holds today, painted as monday.com's blue pill. */
  is_today: boolean;
  /** A Saturday or Sunday, only set at the Days scale. */
  is_weekend?: boolean;
};

export type GanttHeader = {
  /** The coarse band: months at the Days/Weeks scales, years at the Months/Quarters/Years scales. */
  major: GanttHeaderSegment[];
  /** The fine band: days, weeks, months, quarters or half years. */
  minor: GanttHeaderSegment[];
};

type UnitStep = (date: Date) => Date;

/**
 * Splits `[range_start, range_end]` into consecutive units starting at
 * `first_unit_start` and advancing with `next`, clipping the first and last
 * unit to the range so every band covers exactly the rendered days.
 */
const buildSegments = (
  range_start: Date,
  range_end: Date,
  first_unit_start: Date,
  next: UnitStep,
  describe: (unit_start: Date, unit_end: Date) => Omit<GanttHeaderSegment, "key" | "offset_days" | "days" | "is_today">
): GanttHeaderSegment[] => {
  const today = startOfLocalDay(new Date());
  const segments: GanttHeaderSegment[] = [];
  let unit_start = first_unit_start;
  while (unit_start <= range_end) {
    const unit_next = next(unit_start);
    const unit_end = addDaysLocal(unit_next, -1);
    const visible_start = unit_start < range_start ? range_start : unit_start;
    const visible_end = unit_end > range_end ? range_end : unit_end;
    segments.push({
      key: toIsoDate(unit_start),
      offset_days: diffDaysLocal(range_start, visible_start),
      days: diffDaysLocal(visible_start, visible_end) + 1,
      is_today: today >= unit_start && today <= unit_end,
      ...describe(unit_start, unit_end),
    });
    unit_start = unit_next;
  }
  return segments;
};

const nextMonth: UnitStep = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);
const nextQuarter: UnitStep = (date) => new Date(date.getFullYear(), date.getMonth() + 3, 1);
const nextHalf: UnitStep = (date) => new Date(date.getFullYear(), date.getMonth() + 6, 1);
const nextYear: UnitStep = (date) => new Date(date.getFullYear() + 1, 0, 1);

const describeMonthMajor = (unit_start: Date) => ({
  label: `${MONTH_NAMES[unit_start.getMonth()]} ${unit_start.getFullYear()}`,
  compact_label: `${shortMonth(unit_start)} ${String(unit_start.getFullYear()).slice(2)}`,
  strong_label: MONTH_NAMES[unit_start.getMonth()],
});

const describeYearMajor = (unit_start: Date) => ({
  label: String(unit_start.getFullYear()),
  compact_label: `'${String(unit_start.getFullYear()).slice(2)}`,
});

/** Builds the two header bands (a coarse band above a fine one, as in monday.com's Gantt) for `[range_start, range_end]` inclusive. */
export const buildGanttHeader = (range_start: Date, range_end: Date, scale: GanttScale): GanttHeader => {
  const year_start = new Date(range_start.getFullYear(), 0, 1);

  if (scale === "day") {
    return {
      major: buildSegments(range_start, range_end, startOfLocalMonth(range_start), nextMonth, describeMonthMajor),
      minor: buildSegments(range_start, range_end, range_start, (date) => addDaysLocal(date, 1), (unit_start) => ({
        label: `${WEEKDAY_NAMES[unit_start.getDay()]} ${unit_start.getDate()}`,
        compact_label: String(unit_start.getDate()),
        is_weekend: unit_start.getDay() === 0 || unit_start.getDay() === 6,
      })),
    };
  }

  if (scale === "week") {
    return {
      major: buildSegments(range_start, range_end, startOfLocalMonth(range_start), nextMonth, describeMonthMajor),
      minor: buildSegments(range_start, range_end, startOfLocalWeek(range_start), (date) => addDaysLocal(date, 7), (unit_start, unit_end) => {
        const week = `W${getWeekNumber(unit_start)}`;
        const crosses_month = unit_start.getMonth() !== unit_end.getMonth();
        const start_label = crosses_month ? `${shortMonth(unit_start)} ${unit_start.getDate()}` : String(unit_start.getDate());
        return { label: `${week} ${start_label} - ${unit_end.getDate()}`, compact_label: week };
      }),
    };
  }

  if (scale === "month") {
    return {
      major: buildSegments(range_start, range_end, year_start, nextYear, describeYearMajor),
      minor: buildSegments(range_start, range_end, startOfLocalMonth(range_start), nextMonth, (unit_start) => ({
        label: MONTH_NAMES[unit_start.getMonth()],
        compact_label: shortMonth(unit_start),
      })),
    };
  }

  if (scale === "quarter") {
    const quarter_start = new Date(range_start.getFullYear(), Math.floor(range_start.getMonth() / 3) * 3, 1);
    return {
      major: buildSegments(range_start, range_end, year_start, nextYear, describeYearMajor),
      minor: buildSegments(range_start, range_end, quarter_start, nextQuarter, (unit_start) => {
        const quarter = `Q${Math.floor(unit_start.getMonth() / 3) + 1}`;
        return { label: quarter, compact_label: quarter };
      }),
    };
  }

  const half_start = new Date(range_start.getFullYear(), range_start.getMonth() < 6 ? 0 : 6, 1);
  return {
    major: buildSegments(range_start, range_end, year_start, nextYear, describeYearMajor),
    minor: buildSegments(range_start, range_end, half_start, nextHalf, (unit_start) => {
      const half = unit_start.getMonth() < 6 ? "H1" : "H2";
      return { label: half, compact_label: half };
    }),
  };
};

/**
 * The `[start, end]` window the timeline renders: every dated item and today,
 * padded by the scale's own padding, then stretched so the timeline is never
 * narrower than `min_days` (the visible track width in days).
 */
export const resolveGanttRange = (dates: Date[], scale: GanttScale, min_days = 0): { start: Date; end: Date } => {
  const today = startOfLocalDay(new Date());
  const all = [...dates, today];
  const min = all.reduce((a, b) => (b < a ? b : a));
  const max = all.reduce((a, b) => (b > a ? b : a));
  const padding_days = getGanttScale(scale).padding_days;

  // Anchoring on a whole unit keeps the first header segment from being a sliver.
  const padded_start = addDaysLocal(min, -padding_days);
  const start =
    scale === "day" || scale === "week"
      ? startOfLocalWeek(padded_start)
      : scale === "month"
        ? startOfLocalMonth(padded_start)
        : new Date(padded_start.getFullYear(), scale === "quarter" ? Math.floor(padded_start.getMonth() / 3) * 3 : 0, 1);
  let end = addDaysLocal(max, padding_days);
  const span_days = diffDaysLocal(start, end) + 1;
  if (span_days < min_days) end = addDaysLocal(end, Math.ceil(min_days - span_days));
  return { start, end };
};

/** "Jun 5, '25", the date label of the Gantt's item list and group summaries. */
export const formatGanttDate = (date: Date): string => `${shortMonth(date)} ${date.getDate()}, '${String(date.getFullYear()).slice(2)}`;

/** "Jun 5, '25 - Jun 30, '25", or a single date when both ends are the same day. */
export const formatGanttRange = (start: Date, end: Date): string =>
  diffDaysLocal(start, end) === 0 ? formatGanttDate(start) : `${formatGanttDate(start)} - ${formatGanttDate(end)}`;

/** "1 day" or "26 days", both ends included. */
export const formatGanttDuration = (start: Date, end: Date): string => {
  const days = diffDaysLocal(start, end) + 1;
  return `${days} ${days === 1 ? "day" : "days"}`;
};

/** The item list's date label: "Jun 5, '25", "Jun 5 - 12, '25", "Jun 28 - Jul 3, '25" or "Dec 28, '25 - Jan 4, '26". */
export const formatGanttRangeCompact = (start: Date, end: Date): string => {
  if (diffDaysLocal(start, end) === 0) return formatGanttDate(start);
  const year_suffix = `, '${String(end.getFullYear()).slice(2)}`;
  if (start.getFullYear() !== end.getFullYear()) return `${formatGanttDate(start)} - ${formatGanttDate(end)}`;
  if (start.getMonth() === end.getMonth()) return `${shortMonth(start)} ${start.getDate()} - ${end.getDate()}${year_suffix}`;
  return `${shortMonth(start)} ${start.getDate()} - ${shortMonth(end)} ${end.getDate()}${year_suffix}`;
};
