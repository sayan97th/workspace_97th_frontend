import { addDays, addMinutes, getISOWeek, isWeekend } from "date-fns";
import type { FormulaNode } from "./formulaParser";
import {
  FormulaError,
  compareValues,
  daysBetween,
  isBlank,
  roundResult,
  toBoolean,
  toDate,
  toNumber,
  toText,
  wallClockMs,
  type FormulaValue,
  type FormulaValueType,
} from "./formulaValues";

export type FormulaFunctionCategory = "Logical" | "Numeric" | "Text" | "Date";

export const FORMULA_FUNCTION_CATEGORIES: FormulaFunctionCategory[] = ["Logical", "Numeric", "Text", "Date"];

export interface FormulaFunction {
  name: string;
  category: FormulaFunctionCategory;
  /** Shown in the dialog's function reference, e.g. `ROUND(number, [digits])`. */
  syntax: string;
  description: string;
  /** A self contained expression the dialog evaluates live next to the description. */
  example: string;
  min_args: number;
  max_args: number;
  /** `unknown` for the branching functions, whose type comes from `branches`. */
  returns: FormulaValueType;
  /** Eager functions receive every argument already evaluated. */
  run?: (args: FormulaValue[]) => FormulaValue;
  /** Lazy functions decide which arguments to evaluate, so an `IF` never evaluates the branch it skips. */
  runLazy?: (args: FormulaNode[], evaluate: (node: FormulaNode) => FormulaValue) => FormulaValue;
  /** Lazy functions only: the sub-expressions that can become the result, for static type inference. */
  branches?: (args: FormulaNode[]) => FormulaNode[];
}

const MAX_TEXT_LENGTH = 10_000;
const MAX_WORKDAY_SPAN = 36_600;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const INF = Number.POSITIVE_INFINITY;

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Numbers of every argument that has one; blank cells are skipped so an empty Number cell does not drag a MIN to 0. */
function numericArgs(args: FormulaValue[]): number[] {
  return args.filter((arg) => !isBlank(arg)).map(toNumber);
}

/** Rounds half away from zero at `digits` decimals, going through exponent notation to dodge binary float error (1.005 rounds to 1.01). */
function scaledRound(n: number, digits: number, mode: "nearest" | "up" | "down"): number {
  const places = Math.trunc(digits);
  const shift = (value: number, by: number) => Number(`${value}e${by}`);
  const scaled = shift(Math.abs(n), places);
  const rounded = mode === "nearest" ? Math.round(scaled) : mode === "up" ? Math.ceil(scaled) : Math.floor(scaled);
  return Math.sign(n) * shift(rounded, -places);
}

function checkNumber(n: number, message = "The result is not a valid number."): number {
  if (!Number.isFinite(n)) throw new FormulaError("#NUM!", message);
  return n;
}

function clampText(text: string): string {
  if (text.length > MAX_TEXT_LENGTH) throw new FormulaError("#VALUE!", "The text result is too long.");
  return text;
}

/** Turns `YYYY`/`MM`/`DD`/... tokens into the date's own parts. */
function formatDate(date: Date, pattern: string): string {
  const hours = date.getHours();
  const parts: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MMMM: MONTH_NAMES[date.getMonth()],
    MMM: MONTH_NAMES[date.getMonth()].slice(0, 3),
    MM: pad2(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    DD: pad2(date.getDate()),
    D: String(date.getDate()),
    dddd: DAY_NAMES[date.getDay()],
    ddd: DAY_NAMES[date.getDay()].slice(0, 3),
    HH: pad2(hours),
    hh: pad2(hours % 12 || 12),
    mm: pad2(date.getMinutes()),
    ss: pad2(date.getSeconds()),
    A: hours >= 12 ? "PM" : "AM",
  };
  return pattern.replace(/YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|hh|mm|ss|A/g, (token) => parts[token]);
}

/** Working days (Monday to Friday) from `start` to `end`, both included; negative when `end` is earlier. */
function workdaysBetween(start: Date, end: Date): number {
  const forward = wallClockMs(start) <= wallClockMs(end);
  const [from, to] = forward ? [start, end] : [end, start];
  const span = Math.floor(daysBetween(new Date(to.getFullYear(), to.getMonth(), to.getDate()), new Date(from.getFullYear(), from.getMonth(), from.getDate())));
  if (span > MAX_WORKDAY_SPAN) throw new FormulaError("#NUM!", "The two dates are too far apart.");
  let count = 0;
  for (let offset = 0; offset <= span; offset++) {
    if (!isWeekend(addDays(from, offset))) count++;
  }
  return forward ? count : -count;
}

function isoIndexOfWeekday(date: Date): number {
  return date.getDay() === 0 ? 7 : date.getDay();
}

const definitions: FormulaFunction[] = [
  // ── Logical ──
  {
    name: "IF",
    category: "Logical",
    syntax: "IF(condition, value_if_true, [value_if_false])",
    description: "Returns one value when the condition is true and another when it is false. Without a third argument a false condition gives FALSE.",
    example: 'IF(5 > 3, "Yes", "No")',
    min_args: 2,
    max_args: 3,
    returns: "unknown",
    runLazy: ([condition, when_true, when_false], evaluate) => (toBoolean(evaluate(condition)) ? evaluate(when_true) : when_false ? evaluate(when_false) : false),
    branches: ([, when_true, when_false]) => (when_false ? [when_true, when_false] : [when_true]),
  },
  {
    name: "IFS",
    category: "Logical",
    syntax: "IFS(condition1, value1, [condition2, value2], ...)",
    description: "Checks conditions in order and returns the value that belongs to the first true one. Gives #N/A when none is true.",
    example: 'IFS(2 > 5, "High", 2 > 1, "Medium", TRUE, "Low")',
    min_args: 2,
    max_args: INF,
    returns: "unknown",
    runLazy: (args, evaluate) => {
      if (args.length % 2 !== 0) throw new FormulaError("#VALUE!", "IFS needs a value after every condition.");
      for (let index = 0; index < args.length; index += 2) {
        if (toBoolean(evaluate(args[index]))) return evaluate(args[index + 1]);
      }
      throw new FormulaError("#N/A", "None of the IFS conditions is true.");
    },
    branches: (args) => args.filter((_, index) => index % 2 === 1),
  },
  {
    name: "SWITCH",
    category: "Logical",
    syntax: "SWITCH(value, match1, result1, [match2, result2], ..., [default])",
    description: "Compares a value with each match in turn and returns the result of the first equal one, or the default when nothing matches.",
    example: 'SWITCH("b", "a", 1, "b", 2, 0)',
    min_args: 3,
    max_args: INF,
    returns: "unknown",
    runLazy: (args, evaluate) => {
      const subject = evaluate(args[0]);
      const pairs = args.slice(1);
      const has_default = pairs.length % 2 === 1;
      const pair_count = has_default ? pairs.length - 1 : pairs.length;
      for (let index = 0; index < pair_count; index += 2) {
        if (compareValues(subject, evaluate(pairs[index])) === 0) return evaluate(pairs[index + 1]);
      }
      if (has_default) return evaluate(pairs[pairs.length - 1]);
      throw new FormulaError("#N/A", "No SWITCH match was found and no default was given.");
    },
    branches: (args) => {
      const pairs = args.slice(1);
      return pairs.filter((_, index) => index % 2 === 1 || (index === pairs.length - 1 && pairs.length % 2 === 1));
    },
  },
  {
    name: "IFERROR",
    category: "Logical",
    syntax: "IFERROR(value, value_if_error)",
    description: "Returns the value, or the fallback when the value is an error such as a division by zero.",
    example: 'IFERROR(1 / 0, "n/a")',
    min_args: 2,
    max_args: 2,
    returns: "unknown",
    runLazy: ([value, fallback], evaluate) => {
      try {
        return evaluate(value);
      } catch (error) {
        if (error instanceof FormulaError) return evaluate(fallback);
        throw error;
      }
    },
    branches: (args) => args,
  },
  { name: "AND", category: "Logical", syntax: "AND(value1, [value2], ...)", description: "TRUE when every argument is true.", example: "AND(1 < 2, 2 < 3)", min_args: 1, max_args: INF, returns: "boolean", run: (args) => args.every(toBoolean) },
  { name: "OR", category: "Logical", syntax: "OR(value1, [value2], ...)", description: "TRUE when at least one argument is true.", example: "OR(1 > 2, 2 < 3)", min_args: 1, max_args: INF, returns: "boolean", run: (args) => args.some(toBoolean) },
  { name: "XOR", category: "Logical", syntax: "XOR(value1, [value2], ...)", description: "TRUE when an odd number of arguments are true.", example: "XOR(TRUE, FALSE)", min_args: 1, max_args: INF, returns: "boolean", run: (args) => args.filter(toBoolean).length % 2 === 1 },
  { name: "NOT", category: "Logical", syntax: "NOT(value)", description: "Reverses a true or false value.", example: "NOT(FALSE)", min_args: 1, max_args: 1, returns: "boolean", run: ([value]) => !toBoolean(value) },
  { name: "ISBLANK", category: "Logical", syntax: "ISBLANK(value)", description: "TRUE when the value is an empty cell or empty text.", example: 'ISBLANK("")', min_args: 1, max_args: 1, returns: "boolean", run: ([value]) => isBlank(value) },
  { name: "TRUE", category: "Logical", syntax: "TRUE()", description: "The logical value TRUE. You can also type TRUE without parentheses.", example: "TRUE()", min_args: 0, max_args: 0, returns: "boolean", run: () => true },
  { name: "FALSE", category: "Logical", syntax: "FALSE()", description: "The logical value FALSE. You can also type FALSE without parentheses.", example: "FALSE()", min_args: 0, max_args: 0, returns: "boolean", run: () => false },

  // ── Numeric ──
  { name: "SUM", category: "Numeric", syntax: "SUM(number1, [number2], ...)", description: "Adds all the numbers. Blank values count as 0.", example: "SUM(1, 2, 3.5)", min_args: 1, max_args: INF, returns: "number", run: (args) => args.reduce<number>((total, arg) => total + toNumber(arg), 0) },
  {
    name: "AVERAGE",
    category: "Numeric",
    syntax: "AVERAGE(number1, [number2], ...)",
    description: "The mean of the numbers. Blank values are ignored.",
    example: "AVERAGE(2, 4, 9)",
    min_args: 1,
    max_args: INF,
    returns: "number",
    run: (args) => {
      const numbers = numericArgs(args);
      if (numbers.length === 0) throw new FormulaError("#DIV/0!", "There are no numbers to average.");
      return numbers.reduce((total, n) => total + n, 0) / numbers.length;
    },
  },
  { name: "MIN", category: "Numeric", syntax: "MIN(number1, [number2], ...)", description: "The smallest number. Blank values are ignored.", example: "MIN(4, 2, 9)", min_args: 1, max_args: INF, returns: "number", run: (args) => { const numbers = numericArgs(args); return numbers.length ? Math.min(...numbers) : 0; } },
  { name: "MAX", category: "Numeric", syntax: "MAX(number1, [number2], ...)", description: "The largest number. Blank values are ignored.", example: "MAX(4, 2, 9)", min_args: 1, max_args: INF, returns: "number", run: (args) => { const numbers = numericArgs(args); return numbers.length ? Math.max(...numbers) : 0; } },
  { name: "COUNT", category: "Numeric", syntax: "COUNT(value1, [value2], ...)", description: "How many of the arguments are numbers.", example: 'COUNT(1, "a", 3)', min_args: 1, max_args: INF, returns: "number", run: (args) => args.filter((arg) => typeof arg === "number").length },
  { name: "ROUND", category: "Numeric", syntax: "ROUND(number, [digits])", description: "Rounds a number to the given number of decimals (0 by default). A negative count rounds to tens, hundreds and so on.", example: "ROUND(3.14159, 2)", min_args: 1, max_args: 2, returns: "number", run: ([n, digits]) => scaledRound(toNumber(n), digits === undefined ? 0 : toNumber(digits), "nearest") },
  { name: "ROUNDUP", category: "Numeric", syntax: "ROUNDUP(number, [digits])", description: "Rounds a number up, away from zero.", example: "ROUNDUP(3.141, 2)", min_args: 1, max_args: 2, returns: "number", run: ([n, digits]) => scaledRound(toNumber(n), digits === undefined ? 0 : toNumber(digits), "up") },
  { name: "ROUNDDOWN", category: "Numeric", syntax: "ROUNDDOWN(number, [digits])", description: "Rounds a number down, toward zero.", example: "ROUNDDOWN(3.999, 2)", min_args: 1, max_args: 2, returns: "number", run: ([n, digits]) => scaledRound(toNumber(n), digits === undefined ? 0 : toNumber(digits), "down") },
  {
    name: "CEILING",
    category: "Numeric",
    syntax: "CEILING(number, [multiple])",
    description: "Rounds a number up to the nearest multiple (1 by default).",
    example: "CEILING(12, 5)",
    min_args: 1,
    max_args: 2,
    returns: "number",
    run: ([n, multiple]) => {
      const step = multiple === undefined ? 1 : Math.abs(toNumber(multiple));
      return step === 0 ? 0 : Math.ceil(toNumber(n) / step) * step;
    },
  },
  {
    name: "FLOOR",
    category: "Numeric",
    syntax: "FLOOR(number, [multiple])",
    description: "Rounds a number down to the nearest multiple (1 by default).",
    example: "FLOOR(12, 5)",
    min_args: 1,
    max_args: 2,
    returns: "number",
    run: ([n, multiple]) => {
      const step = multiple === undefined ? 1 : Math.abs(toNumber(multiple));
      return step === 0 ? 0 : Math.floor(toNumber(n) / step) * step;
    },
  },
  { name: "INT", category: "Numeric", syntax: "INT(number)", description: "Rounds a number down to the nearest whole number.", example: "INT(-2.5)", min_args: 1, max_args: 1, returns: "number", run: ([n]) => Math.floor(toNumber(n)) },
  { name: "ABS", category: "Numeric", syntax: "ABS(number)", description: "The number without its sign.", example: "ABS(-7)", min_args: 1, max_args: 1, returns: "number", run: ([n]) => Math.abs(toNumber(n)) },
  { name: "SQRT", category: "Numeric", syntax: "SQRT(number)", description: "The square root of a number.", example: "SQRT(81)", min_args: 1, max_args: 1, returns: "number", run: ([n]) => checkNumber(Math.sqrt(toNumber(n)), "The square root of a negative number is not real.") },
  { name: "POWER", category: "Numeric", syntax: "POWER(number, exponent)", description: "Raises a number to a power. The ^ operator does the same.", example: "POWER(2, 10)", min_args: 2, max_args: 2, returns: "number", run: ([n, exponent]) => checkNumber(Math.pow(toNumber(n), toNumber(exponent))) },
  {
    name: "MOD",
    category: "Numeric",
    syntax: "MOD(number, divisor)",
    description: "The remainder after dividing, with the sign of the divisor.",
    example: "MOD(10, 3)",
    min_args: 2,
    max_args: 2,
    returns: "number",
    run: ([n, divisor]) => {
      const by = toNumber(divisor);
      if (by === 0) throw new FormulaError("#DIV/0!", "The divisor cannot be zero.");
      return toNumber(n) - by * Math.floor(toNumber(n) / by);
    },
  },
  {
    name: "LOG",
    category: "Numeric",
    syntax: "LOG(number, [base])",
    description: "The logarithm of a number, base 10 by default.",
    example: "LOG(1000)",
    min_args: 1,
    max_args: 2,
    returns: "number",
    run: ([n, base]) => {
      const value = toNumber(n);
      const by = base === undefined ? 10 : toNumber(base);
      if (value <= 0 || by <= 0 || by === 1) throw new FormulaError("#NUM!", "The logarithm is not defined for these numbers.");
      return Math.log(value) / Math.log(by);
    },
  },
  { name: "EXP", category: "Numeric", syntax: "EXP(number)", description: "e raised to the given power.", example: "EXP(1)", min_args: 1, max_args: 1, returns: "number", run: ([n]) => checkNumber(Math.exp(toNumber(n))) },

  // ── Text ──
  { name: "CONCATENATE", category: "Text", syntax: "CONCATENATE(text1, [text2], ...)", description: "Joins text together. The & operator does the same.", example: 'CONCATENATE("Task ", 12)', min_args: 1, max_args: INF, returns: "text", run: (args) => clampText(args.map(toText).join("")) },
  { name: "CONCAT", category: "Text", syntax: "CONCAT(text1, [text2], ...)", description: "Same as CONCATENATE.", example: 'CONCAT("a", "b")', min_args: 1, max_args: INF, returns: "text", run: (args) => clampText(args.map(toText).join("")) },
  { name: "LEFT", category: "Text", syntax: "LEFT(text, [count])", description: "The first characters of a text (1 by default).", example: 'LEFT("Workspace", 4)', min_args: 1, max_args: 2, returns: "text", run: ([text, count]) => toText(text).slice(0, Math.max(0, count === undefined ? 1 : toNumber(count))) },
  { name: "RIGHT", category: "Text", syntax: "RIGHT(text, [count])", description: "The last characters of a text (1 by default).", example: 'RIGHT("Workspace", 5)', min_args: 1, max_args: 2, returns: "text", run: ([text, count]) => { const value = toText(text); const n = Math.max(0, count === undefined ? 1 : toNumber(count)); return n === 0 ? "" : value.slice(-n); } },
  { name: "MID", category: "Text", syntax: "MID(text, start, count)", description: "Characters from the middle of a text. The first character is position 1.", example: 'MID("Workspace", 5, 3)', min_args: 3, max_args: 3, returns: "text", run: ([text, start, count]) => { const from = Math.max(1, toNumber(start)) - 1; return toText(text).slice(from, from + Math.max(0, toNumber(count))); } },
  { name: "LEN", category: "Text", syntax: "LEN(text)", description: "How many characters a text has.", example: 'LEN("Hello")', min_args: 1, max_args: 1, returns: "number", run: ([text]) => toText(text).length },
  { name: "LOWER", category: "Text", syntax: "LOWER(text)", description: "Converts text to lower case.", example: 'LOWER("Hello")', min_args: 1, max_args: 1, returns: "text", run: ([text]) => toText(text).toLowerCase() },
  { name: "UPPER", category: "Text", syntax: "UPPER(text)", description: "Converts text to upper case.", example: 'UPPER("Hello")', min_args: 1, max_args: 1, returns: "text", run: ([text]) => toText(text).toUpperCase() },
  { name: "TRIM", category: "Text", syntax: "TRIM(text)", description: "Removes leading and trailing spaces and collapses repeated spaces.", example: 'TRIM("  a   b ")', min_args: 1, max_args: 1, returns: "text", run: ([text]) => toText(text).trim().replace(/\s+/g, " ") },
  {
    name: "SUBSTITUTE",
    category: "Text",
    syntax: "SUBSTITUTE(text, old_text, new_text, [occurrence])",
    description: "Replaces text inside a text. Give an occurrence to replace only that match, otherwise every match is replaced.",
    example: 'SUBSTITUTE("a-b-c", "-", "/")',
    min_args: 3,
    max_args: 4,
    returns: "text",
    run: ([text, old_text, new_text, occurrence]) => {
      const source = toText(text);
      const search = toText(old_text);
      const replacement = toText(new_text);
      if (search === "") return source;
      if (occurrence === undefined) return clampText(source.split(search).join(replacement));
      let seen = 0;
      const target = toNumber(occurrence);
      let index = source.indexOf(search);
      while (index !== -1) {
        seen++;
        if (seen === target) return clampText(source.slice(0, index) + replacement + source.slice(index + search.length));
        index = source.indexOf(search, index + search.length);
      }
      return source;
    },
  },
  { name: "REPLACE", category: "Text", syntax: "REPLACE(text, start, count, new_text)", description: "Replaces part of a text, starting at a position and spanning a number of characters.", example: 'REPLACE("Workspace", 1, 4, "Play")', min_args: 4, max_args: 4, returns: "text", run: ([text, start, count, new_text]) => { const value = toText(text); const from = Math.max(1, toNumber(start)) - 1; return clampText(value.slice(0, from) + toText(new_text) + value.slice(from + Math.max(0, toNumber(count)))); } },
  {
    name: "FIND",
    category: "Text",
    syntax: "FIND(search, text, [start])",
    description: "The position of a text inside another, matching upper and lower case exactly. Gives #VALUE! when it is not found.",
    example: 'FIND("space", "Workspace")',
    min_args: 2,
    max_args: 3,
    returns: "number",
    run: ([search, text, start]) => {
      const index = toText(text).indexOf(toText(search), start === undefined ? 0 : Math.max(1, toNumber(start)) - 1);
      if (index === -1) throw new FormulaError("#VALUE!", "The text was not found.");
      return index + 1;
    },
  },
  {
    name: "SEARCH",
    category: "Text",
    syntax: "SEARCH(search, text, [start])",
    description: "Like FIND, but ignores upper and lower case.",
    example: 'SEARCH("SPACE", "Workspace")',
    min_args: 2,
    max_args: 3,
    returns: "number",
    run: ([search, text, start]) => {
      const index = toText(text).toLowerCase().indexOf(toText(search).toLowerCase(), start === undefined ? 0 : Math.max(1, toNumber(start)) - 1);
      if (index === -1) throw new FormulaError("#VALUE!", "The text was not found.");
      return index + 1;
    },
  },
  { name: "REPT", category: "Text", syntax: "REPT(text, times)", description: "Repeats a text a number of times.", example: 'REPT("ab", 3)', min_args: 2, max_args: 2, returns: "text", run: ([text, times]) => { const count = Math.max(0, Math.trunc(toNumber(times))); const value = toText(text); if (value.length * count > MAX_TEXT_LENGTH) throw new FormulaError("#VALUE!", "The text result is too long."); return value.repeat(count); } },
  { name: "VALUE", category: "Text", syntax: "VALUE(text)", description: "Converts a text that looks like a number into a number.", example: 'VALUE("42") + 1', min_args: 1, max_args: 1, returns: "number", run: ([text]) => toNumber(text) },

  // ── Date ──
  { name: "TODAY", category: "Date", syntax: "TODAY()", description: "Today's date.", example: "TODAY()", min_args: 0, max_args: 0, returns: "date", run: () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); } },
  { name: "NOW", category: "Date", syntax: "NOW()", description: "The current date and time.", example: "NOW()", min_args: 0, max_args: 0, returns: "date", run: () => new Date() },
  { name: "DATE", category: "Date", syntax: "DATE(year, month, day)", description: "Builds a date from its parts. Months and days that overflow roll into the next period.", example: "DATE(2026, 9, 19)", min_args: 3, max_args: 3, returns: "date", run: ([year, month, day]) => new Date(toNumber(year), toNumber(month) - 1, toNumber(day)) },
  { name: "YEAR", category: "Date", syntax: "YEAR(date)", description: "The year of a date.", example: "YEAR(DATE(2026, 9, 19))", min_args: 1, max_args: 1, returns: "number", run: ([date]) => toDate(date).getFullYear() },
  { name: "MONTH", category: "Date", syntax: "MONTH(date)", description: "The month of a date, from 1 to 12.", example: "MONTH(DATE(2026, 9, 19))", min_args: 1, max_args: 1, returns: "number", run: ([date]) => toDate(date).getMonth() + 1 },
  { name: "DAY", category: "Date", syntax: "DAY(date)", description: "The day of the month.", example: "DAY(DATE(2026, 9, 19))", min_args: 1, max_args: 1, returns: "number", run: ([date]) => toDate(date).getDate() },
  { name: "HOUR", category: "Date", syntax: "HOUR(date)", description: "The hour of a date and time, from 0 to 23.", example: 'HOUR("2026-09-19T14:30")', min_args: 1, max_args: 1, returns: "number", run: ([date]) => toDate(date).getHours() },
  { name: "MINUTE", category: "Date", syntax: "MINUTE(date)", description: "The minute of a date and time.", example: 'MINUTE("2026-09-19T14:30")', min_args: 1, max_args: 1, returns: "number", run: ([date]) => toDate(date).getMinutes() },
  { name: "WEEKDAY", category: "Date", syntax: "WEEKDAY(date)", description: "The day of the week, from 1 (Monday) to 7 (Sunday).", example: "WEEKDAY(DATE(2026, 9, 19))", min_args: 1, max_args: 1, returns: "number", run: ([date]) => isoIndexOfWeekday(toDate(date)) },
  { name: "WEEKNUM", category: "Date", syntax: "WEEKNUM(date)", description: "The ISO week number of the year.", example: "WEEKNUM(DATE(2026, 9, 19))", min_args: 1, max_args: 1, returns: "number", run: ([date]) => getISOWeek(toDate(date)) },
  { name: "DAYS", category: "Date", syntax: "DAYS(end_date, start_date)", description: "The number of days from the start date to the end date. Subtracting two dates does the same.", example: "DAYS(DATE(2026, 9, 30), DATE(2026, 9, 19))", min_args: 2, max_args: 2, returns: "number", run: ([end, start]) => daysBetween(toDate(end), toDate(start)) },
  { name: "ADD_DAYS", category: "Date", syntax: "ADD_DAYS(date, days)", description: "Moves a date forward by a number of days.", example: "ADD_DAYS(DATE(2026, 9, 19), 14)", min_args: 2, max_args: 2, returns: "date", run: ([date, days]) => { const amount = toNumber(days); const whole = Math.trunc(amount); return addMinutes(addDays(toDate(date), whole), Math.round((amount - whole) * 1440)); } },
  { name: "SUBTRACT_DAYS", category: "Date", syntax: "SUBTRACT_DAYS(date, days)", description: "Moves a date back by a number of days.", example: "SUBTRACT_DAYS(DATE(2026, 9, 19), 7)", min_args: 2, max_args: 2, returns: "date", run: ([date, days]) => { const amount = toNumber(days); const whole = Math.trunc(amount); return addMinutes(addDays(toDate(date), -whole), -Math.round((amount - whole) * 1440)); } },
  { name: "WORKDAYS", category: "Date", syntax: "WORKDAYS(start_date, end_date)", description: "Counts the working days (Monday to Friday) between two dates, both included.", example: "WORKDAYS(DATE(2026, 9, 14), DATE(2026, 9, 25))", min_args: 2, max_args: 2, returns: "number", run: ([start, end]) => workdaysBetween(toDate(start), toDate(end)) },
  { name: "HOURS_DIFF", category: "Date", syntax: "HOURS_DIFF(end_date, start_date)", description: "The hours from the start to the end date and time.", example: 'HOURS_DIFF("2026-09-19T18:00", "2026-09-19T09:30")', min_args: 2, max_args: 2, returns: "number", run: ([end, start]) => roundResult((wallClockMs(toDate(end)) - wallClockMs(toDate(start))) / 3_600_000) },
  { name: "MINUTES_DIFF", category: "Date", syntax: "MINUTES_DIFF(end_date, start_date)", description: "The minutes from the start to the end date and time.", example: 'MINUTES_DIFF("2026-09-19T10:45", "2026-09-19T10:00")', min_args: 2, max_args: 2, returns: "number", run: ([end, start]) => roundResult((wallClockMs(toDate(end)) - wallClockMs(toDate(start))) / 60_000) },
  { name: "FORMAT_DATE", category: "Date", syntax: "FORMAT_DATE(date, [format])", description: "Shows a date as text. Use YYYY, YY, MMMM, MMM, MM, M, DD, D, dddd, ddd, HH, hh, mm, ss and A. The default is YYYY-MM-DD.", example: 'FORMAT_DATE(DATE(2026, 9, 19), "MMM D, YYYY")', min_args: 1, max_args: 2, returns: "text", run: ([date, pattern]) => formatDate(toDate(date), pattern === undefined ? "YYYY-MM-DD" : toText(pattern)) },
];

export const FORMULA_FUNCTIONS: readonly FormulaFunction[] = definitions;

const functions_by_name = new Map(definitions.map((fn) => [fn.name, fn]));

export function findFormulaFunction(name: string): FormulaFunction | undefined {
  return functions_by_name.get(name.toUpperCase());
}
