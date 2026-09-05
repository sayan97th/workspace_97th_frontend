export const MONTH_SHORT_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const WEEKDAY_SHORT_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const formatInputDate = (date: Date): string =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;

/** Parses the calendar panel's editable MM/DD/YYYY text field into a Date, or null while the text isn't a complete date yet. */
export const parseInputDate = (value: string): Date | null => {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Formats a Date's time-of-day into the calendar panel's editable "9:00AM" text field. */
export const formatInputTime = (date: Date): string => {
  const raw_hours = date.getHours();
  const minutes = date.getMinutes();
  const period = raw_hours >= 12 ? "PM" : "AM";
  const hours = raw_hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")}${period}`;
};

/** Parses the calendar panel's editable time text field ("9:00 AM", "9:00pm", "14:30") into hours/minutes, or null while the text isn't a complete time yet. */
export const parseInputTime = (value: string): { hours: number; minutes: number } | null => {
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
