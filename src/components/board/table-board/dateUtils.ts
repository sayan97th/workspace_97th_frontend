export const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const WEEKDAY_SHORT_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Parses the board's stored date string (e.g. "Sep 17, 2026") into a Date, or null when empty/unparseable. */
export const parseBoardDate = (value: string): Date | null => {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Formats a Date back into the board's stored date string shape, matching the existing mock data (e.g. "Sep 17, 2026"). */
export const formatBoardDate = (date: Date): string =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatInputDate = (date: Date): string =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;

/** Parses the menu's editable MM/DD/YYYY text field into a Date, or null while the text isn't a complete date yet. */
export const parseInputDate = (value: string): Date | null => {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Builds the 6-week (42-day) grid for a given view month, padded with the trailing/leading days of neighboring months. */
export const buildMonthGrid = (view_year: number, view_month: number): Date[] => {
  const first_of_month = new Date(view_year, view_month, 1);
  const grid_start = new Date(first_of_month);
  grid_start.setDate(grid_start.getDate() - first_of_month.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(grid_start);
    day.setDate(grid_start.getDate() + index);
    return day;
  });
};
