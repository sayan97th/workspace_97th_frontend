import type { CellValue, ColumnDef, ColumnKind, LinkValue, PersonDef, StatusDef, TagDef } from "./types";
import { encodeRangeValue, parseRangeValue } from "./dateUtils";

/**
 * Pure helpers behind the table's multi-cell copy, paste and fill handle:
 * TSV (the format Excel and Google Sheets put on the clipboard), turning a
 * cell value into readable text and back again for every column kind, and
 * the series logic of the fill handle. Kept free of React so they are easy
 * to test on their own (see `test/board/table/cellClipboard.test.ts`).
 */

/** Board wide lists a cell value is resolved against when it becomes text, or text becomes a value. */
export interface CellTextContext {
  people: PersonDef[];
  tag_defs: TagDef[];
  /** Mock demo fallback for Status columns without their own options. */
  status_defs: StatusDef[];
  /** Mock demo fallback for Label columns without their own options. */
  label_defs: StatusDef[];
}

/** Kinds whose values are computed or managed elsewhere, never written by a paste or a fill. */
const READ_ONLY_KINDS: ReadonlySet<ColumnKind> = new Set<ColumnKind>(["formula", "mirror", "auto_number", "files", "vote", "time_tracking"]);

/** Kinds whose values only make sense inside the same column (ids of items or checklist rows), so they are only pasted from an in-board copy of that same column. */
const SAME_COLUMN_ONLY_KINDS: ReadonlySet<ColumnKind> = new Set<ColumnKind>(["dependency", "connect_board", "checklist"]);

export function isPasteTarget(column: ColumnDef): boolean {
  return !READ_ONLY_KINDS.has(column.kind);
}

export function isSameColumnOnlyKind(kind: ColumnKind): boolean {
  return SAME_COLUMN_ONLY_KINDS.has(kind);
}

// ---- TSV --------------------------------------------------------------------

/** Quotes a field when it holds a tab, a line break or a quote, the way spreadsheets do. */
function tsvField(text: string): string {
  return /[\t\n\r"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toTsv(rows: string[][]): string {
  return rows.map((row) => row.map(tsvField).join("\t")).join("\n");
}

/**
 * Parses clipboard text copied from Excel, Google Sheets or this table.
 * Handles quoted fields (with tabs, line breaks and doubled quotes inside) and
 * drops the trailing line break spreadsheets add after the last row.
 */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let in_quotes = false;
  let at_field_start = true;

  for (let index = 0; index < text.length; index++) {
    const char = text[index];

    if (in_quotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index++;
        } else {
          in_quotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && at_field_start) {
      in_quotes = true;
      at_field_start = false;
      continue;
    }
    if (char === "\t") {
      row.push(field);
      field = "";
      at_field_start = true;
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      at_field_start = true;
      continue;
    }
    field += char;
    at_field_start = false;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---- value to text ---------------------------------------------------------

function optionsFor(column: ColumnDef, context: CellTextContext): StatusDef[] {
  if (column.options) return column.options;
  if (column.kind === "status") return context.status_defs;
  if (column.kind === "label") return context.label_defs;
  return [];
}

function asStringArray(value: CellValue): string[] {
  return Array.isArray(value) ? (value as unknown[]).filter((entry): entry is string => typeof entry === "string") : [];
}

/** How a cell reads once copied out of the board: labels instead of option ids, names instead of person ids. */
export function cellValueToText(value: CellValue, column: ColumnDef, context: CellTextContext): string {
  if (value == null || value === "") return "";

  switch (column.kind) {
    case "status":
    case "label": {
      const option = optionsFor(column, context).find((def) => def.id === value);
      return option?.label ?? "";
    }
    case "dropdown": {
      const options = optionsFor(column, context);
      return asStringArray(value).map((id) => options.find((def) => def.id === id)?.label).filter(Boolean).join(", ");
    }
    case "tags":
      return asStringArray(value).map((id) => context.tag_defs.find((tag) => tag.id === id)?.label).filter(Boolean).join(", ");
    case "people":
      return asStringArray(value).map((id) => context.people.find((person) => person.id === id)?.name).filter(Boolean).join(", ");
    case "timeline": {
      const { start_iso, end_iso } = parseRangeValue(value);
      if (!start_iso) return "";
      return end_iso && end_iso !== start_iso ? `${start_iso} - ${end_iso}` : start_iso;
    }
    case "checkbox":
      return value === true ? "Yes" : "No";
    case "link": {
      const link = value as LinkValue;
      return typeof link === "object" && link ? link.url ?? "" : String(value);
    }
    case "checklist":
    case "dependency":
    case "connect_board":
    case "files":
    case "time_tracking":
    case "vote":
      return "";
    default:
      return typeof value === "string" || typeof value === "number" ? String(value) : "";
  }
}

// ---- text to value ---------------------------------------------------------

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function isoOrNull(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Reads a date typed or pasted in the usual spreadsheet forms: `2026-09-25`,
 * `2026/09/25`, `09/25/2026` (US order, like Excel's default export),
 * `Sep 25, 2026` and `25 Sep 2026`. Returns an ISO date or null.
 */
export function parseDateText(text: string): string | null {
  const trimmed = text.trim();
  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(trimmed);
  if (match) return isoOrNull(Number(match[1]), Number(match[2]), Number(match[3]));

  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    // US order unless the first part cannot be a month.
    return first > 12 ? isoOrNull(Number(match[3]), second, first) : isoOrNull(Number(match[3]), first, second);
  }

  match = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i.exec(trimmed);
  if (match) {
    const month = MONTHS.indexOf(match[1].toLowerCase()) + 1;
    return month ? isoOrNull(Number(match[3]), month, Number(match[2])) : null;
  }

  match = /^(\d{1,2})\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})$/i.exec(trimmed);
  if (match) {
    const month = MONTHS.indexOf(match[2].toLowerCase()) + 1;
    return month ? isoOrNull(Number(match[3]), month, Number(match[1])) : null;
  }
  return null;
}

function splitList(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findByLabel<T extends { label: string }>(defs: T[], label: string): T | undefined {
  const wanted = label.trim().toLowerCase();
  return defs.find((def) => def.label.trim().toLowerCase() === wanted);
}

const TRUE_WORDS = new Set(["yes", "true", "1", "x", "v", "checked", "done", "✓", "✔"]);
const FALSE_WORDS = new Set(["no", "false", "0", "unchecked", ""]);

/**
 * Turns pasted text into the value a column stores. Returns `undefined` when
 * the text cannot become a value of this column (an unknown status label, a
 * name that is not on the board, a date it cannot read), so that cell is
 * skipped and keeps its value. Empty text clears the cell (`null`).
 */
export function textToCellValue(text: string, column: ColumnDef, context: CellTextContext): CellValue | undefined {
  const trimmed = text.trim();
  if (!isPasteTarget(column) || isSameColumnOnlyKind(column.kind)) return undefined;
  if (trimmed === "" && column.kind !== "checkbox") return null;

  switch (column.kind) {
    case "text":
    case "phone":
    case "email":
      return text.replace(/[\r\n]+/g, " ").trim();
    case "longtext":
      return text;
    case "number": {
      const normalized = trimmed.replace(/[\s$€£%]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
      const number = Number(normalized);
      return Number.isFinite(number) ? String(number) : undefined;
    }
    case "rating": {
      const number = Math.round(Number(trimmed));
      return Number.isFinite(number) ? Math.max(0, Math.min(5, number)) : undefined;
    }
    case "progress": {
      const number = Number(trimmed.replace("%", ""));
      return Number.isFinite(number) ? String(Math.max(0, Math.min(100, Math.round(number)))) : undefined;
    }
    case "checkbox": {
      const word = trimmed.toLowerCase();
      if (TRUE_WORDS.has(word)) return true;
      if (FALSE_WORDS.has(word)) return false;
      return undefined;
    }
    case "status":
    case "label":
      return findByLabel(optionsFor(column, context), trimmed)?.id;
    case "dropdown": {
      const options = optionsFor(column, context);
      const ids = splitList(trimmed).map((label) => findByLabel(options, label)?.id);
      return ids.every(Boolean) ? (ids as string[]) : undefined;
    }
    case "tags": {
      const ids = splitList(trimmed).map((label) => findByLabel(context.tag_defs, label)?.id);
      return ids.every(Boolean) ? (ids as string[]) : undefined;
    }
    case "people": {
      const people = context.people.filter((person) => !person.is_deactivated);
      const ids = splitList(trimmed).map((name) => {
        const wanted = name.toLowerCase();
        return people.find((person) => person.name.toLowerCase() === wanted || person.initials.toLowerCase() === wanted)?.id;
      });
      return ids.every(Boolean) ? Array.from(new Set(ids as string[])) : undefined;
    }
    case "date":
      return parseDateText(trimmed) ?? undefined;
    case "timeline": {
      const parts = trimmed.includes("..") ? trimmed.split("..") : trimmed.split(/\s+(?:-|to|–)\s+/i);
      const start = parseDateText(parts[0] ?? "");
      const end = parts.length > 1 ? parseDateText(parts[1]) : start;
      if (!start || !end) return undefined;
      return start <= end ? encodeRangeValue(start, end) : encodeRangeValue(end, start);
    }
    case "link":
      return { url: trimmed, text: trimmed };
    default:
      return undefined;
  }
}

/**
 * Moves a value copied from one column into another. The same column keeps
 * the value as is. Another column of the same kind keeps it too, except for
 * option based kinds (their option ids differ per column), which go through
 * the text form like a paste from a spreadsheet would.
 */
export function convertCellValue(value: CellValue, source: ColumnDef, target: ColumnDef, context: CellTextContext): CellValue | undefined {
  if (!isPasteTarget(target)) return undefined;
  if (source.id === target.id) return value ?? null;
  if (isSameColumnOnlyKind(target.kind)) return undefined;

  const has_own_options = target.kind === "status" || target.kind === "label" || target.kind === "dropdown";
  if (source.kind === target.kind && !has_own_options) return value ?? null;

  return textToCellValue(cellValueToText(value, source, context), target, context);
}

// ---- fill handle -----------------------------------------------------------

function numericValue(value: CellValue): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function dayDiff(from_iso: string, to_iso: string): number {
  const [from_year, from_month, from_day] = from_iso.split("-").map(Number);
  const [to_year, to_month, to_day] = to_iso.split("-").map(Number);
  return Math.round((Date.UTC(to_year, to_month - 1, to_day) - Date.UTC(from_year, from_month - 1, from_day)) / 86_400_000);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The values the fill handle writes into `count` cells after `source`, the
 * selected cells of one column, top to bottom. Like a spreadsheet: two or
 * more numbers (or dates) with a steady step continue the series, anything
 * else repeats the selected values in order.
 */
export function fillSeries(source: CellValue[], column: ColumnDef, count: number): CellValue[] {
  if (count <= 0 || source.length === 0) return [];

  if (source.length >= 2 && (column.kind === "number" || column.kind === "progress" || column.kind === "rating")) {
    const numbers = source.map(numericValue);
    if (numbers.every((number): number is number => number !== null)) {
      const step = numbers[1] - numbers[0];
      const is_steady = numbers.every((number, index) => index === 0 || Math.abs(number - numbers[index - 1] - step) < 1e-9);
      if (is_steady) {
        const last = numbers[numbers.length - 1];
        return Array.from({ length: count }, (_, index) => {
          const next = Math.round((last + step * (index + 1)) * 1e6) / 1e6;
          if (column.kind === "rating") return Math.max(0, Math.min(5, next));
          return typeof source[0] === "number" ? next : String(next);
        });
      }
    }
  }

  if (source.length >= 2 && column.kind === "date") {
    const dates = source.map((value) => (typeof value === "string" && ISO_DATE.test(value) ? value : null));
    if (dates.every((date): date is string => date !== null)) {
      const step = dayDiff(dates[0], dates[1]);
      const is_steady = dates.every((date, index) => index === 0 || dayDiff(dates[index - 1], date) === step);
      if (is_steady) {
        const last = dates[dates.length - 1];
        return Array.from({ length: count }, (_, index) => addDays(last, step * (index + 1)));
      }
    }
  }

  return Array.from({ length: count }, (_, index) => source[index % source.length] ?? null);
}
