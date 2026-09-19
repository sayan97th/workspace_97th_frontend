/**
 * Value model shared by the formula engine and its function library: what an
 * expression can evaluate to, the spreadsheet style errors it can raise, and
 * the coercion rules between numbers, text, booleans and dates.
 */

/** `null` is a blank cell. A `Date` is a wall-clock date or date-time in the viewer's timezone. */
export type FormulaValue = number | string | boolean | Date | null;

/** What a formula (or one of its sub-expressions) produces, known without evaluating it. `unknown` means it depends on the row's data. */
export type FormulaValueType = "number" | "text" | "boolean" | "date" | "unknown";

export type FormulaErrorCode = "#DIV/0!" | "#VALUE!" | "#NAME?" | "#REF!" | "#NUM!" | "#N/A" | "#ERROR!";

/** A runtime evaluation failure, shown in the cell as its `code` with `message` as the tooltip. */
export class FormulaError extends Error {
  readonly code: FormulaErrorCode;

  constructor(code: FormulaErrorCode, message: string) {
    super(message);
    this.name = "FormulaError";
    this.code = code;
  }
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/;
const MS_PER_DAY = 86_400_000;

/** Rounds to 6 decimal places to absorb float artifacts (e.g. `0.1 + 0.2`) without visibly truncating a legitimate fractional result. */
export function roundResult(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Parses a date column's stored text ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm") as a local wall-clock date, or `null` when it is not a date. */
export function parseDateText(text: string): Date | null {
  const match = DATE_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, year, month, day, hours, minutes, seconds] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hours ?? 0), Number(minutes ?? 0), Number(seconds ?? 0));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Milliseconds of the date's wall-clock fields as if they were UTC, so differences ignore daylight-saving jumps. */
export function wallClockMs(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
}

/** Whole and fractional days from `start` to `end` on the wall clock. */
export function daysBetween(end: Date, start: Date): number {
  return roundResult((wallClockMs(end) - wallClockMs(start)) / MS_PER_DAY);
}

export function hasTimeOfDay(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}

/** How a value is shown in a cell and when joined into text. */
export function formatFormulaValue(value: FormulaValue): string {
  if (value === null) return "";
  if (typeof value === "number") return String(roundResult(value));
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) {
    const day = `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
    return hasTimeOfDay(value) ? `${day} ${pad2(value.getHours())}:${pad2(value.getMinutes())}` : day;
  }
  return value;
}

export function toNumber(value: FormulaValue): number {
  if (typeof value === "number") return value;
  if (value === null) return 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) throw new FormulaError("#VALUE!", "A date cannot be used as a number here. Subtract two dates to get a number of days.");
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) throw new FormulaError("#VALUE!", `"${value}" is not a number.`);
  return parsed;
}

export function toText(value: FormulaValue): string {
  return formatFormulaValue(value);
}

export function toBoolean(value: FormulaValue): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (value === null) return false;
  if (value instanceof Date) return true;
  const lowered = value.trim().toLowerCase();
  if (lowered === "true") return true;
  if (lowered === "false" || lowered === "") return false;
  throw new FormulaError("#VALUE!", `"${value}" is not TRUE or FALSE.`);
}

export function toDate(value: FormulaValue): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = parseDateText(value);
    if (parsed) return parsed;
  }
  throw new FormulaError("#VALUE!", `${value === null ? "A blank value" : `"${formatFormulaValue(value)}"`} is not a date.`);
}

/** `true` for a blank cell or an empty text. */
export function isBlank(value: FormulaValue): boolean {
  return value === null || value === "";
}

const TYPE_RANK = { number: 0, string: 1, boolean: 2 } as const;

/**
 * Spreadsheet style ordering: dates by time, numbers numerically, text case
 * insensitively, and across types number < text < boolean. A blank equals
 * the empty value of whatever it is compared with.
 */
export function compareValues(a: FormulaValue, b: FormulaValue): number {
  if (a === null && b === null) return 0;
  if (a instanceof Date || b instanceof Date) {
    if (a === null) return -1;
    if (b === null) return 1;
    const left = a instanceof Date ? a : parseDateText(String(a));
    const right = b instanceof Date ? b : parseDateText(String(b));
    if (left && right) return Math.sign(left.getTime() - right.getTime());
    return compareValues(toText(a), toText(b));
  }

  const left = a === null ? (typeof b === "number" ? 0 : typeof b === "boolean" ? false : "") : a;
  const right = b === null ? (typeof a === "number" ? 0 : typeof a === "boolean" ? false : "") : b;

  const left_type = typeof left as keyof typeof TYPE_RANK;
  const right_type = typeof right as keyof typeof TYPE_RANK;

  // A numeric-looking text compares as a number against a real number, so `{Number} = "5"` behaves.
  if (left_type !== right_type && (left_type === "number" || right_type === "number")) {
    const text = left_type === "string" ? (left as string) : right_type === "string" ? (right as string) : null;
    if (text !== null && text.trim() !== "" && Number.isFinite(Number(text))) {
      return Math.sign((left_type === "number" ? (left as number) : Number(left)) - (right_type === "number" ? (right as number) : Number(right)));
    }
  }

  if (left_type !== right_type) return Math.sign(TYPE_RANK[left_type] - TYPE_RANK[right_type]);
  if (left_type === "string") {
    const l = (left as string).toLowerCase();
    const r = (right as string).toLowerCase();
    return l < r ? -1 : l > r ? 1 : 0;
  }
  return Math.sign(Number(left) - Number(right));
}
