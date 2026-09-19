import type { CellValue, ColumnKind, FormulaSourceColumn, LinkValue } from "../types";
import { findFormulaFunction } from "./formulaFunctions";
import { FormulaSyntaxError, parseFormula, walkFormula, type FormulaNode } from "./formulaParser";
import {
  FormulaError,
  compareValues,
  daysBetween,
  formatFormulaValue,
  parseDateText,
  toNumber,
  toText,
  type FormulaErrorCode,
  type FormulaValue,
  type FormulaValueType,
} from "./formulaValues";
import { addDays, addMinutes } from "date-fns";

/** The pseudo column that reads the row's own name, so a formula can use `{Item}` next to the real columns. */
export const NAME_COLUMN_ID = "__name";

/** The column kinds a formula can read. Anything else (files, checklists, other formulas, mirrors...) has no single sensible value. */
export const FORMULA_SOURCE_KINDS: readonly ColumnKind[] = [
  "text", "longtext", "phone", "email", "link", "number", "status", "label", "dropdown", "tags", "date", "checkbox", "rating", "progress", "auto_number", "people", "vote",
];

export type { FormulaSourceColumn };

export interface FormulaEvalContext {
  sources: FormulaSourceColumn[];
  /** The row's cell values by column id, including any edit that is not saved yet. */
  values: Record<string, CellValue>;
  /** The row's own name, read by the `__name` pseudo column. */
  item_name?: string;
}

export type FormulaOutcome =
  | { ok: true; value: FormulaValue; text: string }
  | { ok: false; code: FormulaErrorCode; message: string };

export interface FormulaIssue {
  message: string;
  start: number;
  end: number;
}

const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, " ").toLowerCase();

/** Whether `kind` can be read by a formula, see `FORMULA_SOURCE_KINDS`. */
export function isFormulaSourceKind(kind: ColumnKind): boolean {
  return FORMULA_SOURCE_KINDS.includes(kind);
}

/** The stored form of a reference, immune to column renames: `{#12}`. */
export function columnReferenceToken(column_id: string): string {
  return `{#${column_id}}`;
}

type Resolution = { source: FormulaSourceColumn } | { error: string };

/** Finds the column a `{...}` reference names: `#id` exactly, otherwise a case insensitive title match. */
function resolveReference(ref: string, sources: FormulaSourceColumn[]): Resolution {
  if (ref.startsWith("#")) {
    const id = ref.slice(1);
    const by_id = sources.find((source) => source.id === id);
    return by_id ? { source: by_id } : { error: "This column no longer exists or cannot be used in a formula." };
  }
  const wanted = normalizeTitle(ref);
  const matches = sources.filter((source) => normalizeTitle(source.title) === wanted);
  if (matches.length === 1) return { source: matches[0] };
  if (matches.length > 1) return { error: `More than one column is named "${ref}". Rename one of them first.` };
  return { error: `There is no column named "${ref}".` };
}

function optionLabel(source: FormulaSourceColumn, id: string): string {
  return source.options?.find((option) => option.id === id)?.label ?? id;
}

/** Converts one raw cell value into what a formula sees, according to the column's kind. */
function readSourceValue(source: FormulaSourceColumn, raw: CellValue): FormulaValue {
  if (raw === null || raw === undefined) return null;

  switch (source.kind) {
    case "number":
    case "rating":
    case "progress":
    case "auto_number": {
      if (raw === "") return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case "checkbox":
      return raw === true || raw === "true" || raw === "1";
    case "date":
      return typeof raw === "string" ? parseDateText(raw) : null;
    case "status":
    case "label":
      return typeof raw === "string" && raw !== "" ? optionLabel(source, raw) : null;
    case "dropdown":
    case "tags":
      if (Array.isArray(raw)) return raw.length ? (raw as string[]).map((id) => optionLabel(source, String(id))).join(", ") : null;
      return typeof raw === "string" && raw !== "" ? optionLabel(source, raw) : null;
    case "people":
    case "vote":
      return Array.isArray(raw) ? raw.length : 0;
    case "link": {
      const link = raw as LinkValue;
      return typeof link === "object" && link ? link.text || link.url || null : typeof raw === "string" ? raw : null;
    }
    default:
      return typeof raw === "string" ? (raw === "" ? null : raw) : typeof raw === "number" ? raw : null;
  }
}

function readColumn(ref: string, context: FormulaEvalContext): FormulaValue {
  const resolved = resolveReference(ref, context.sources);
  if ("error" in resolved) throw new FormulaError("#REF!", resolved.error);
  const { source } = resolved;
  if (source.id === NAME_COLUMN_ID) return context.item_name ? context.item_name : null;
  return readSourceValue(source, context.values[source.id]);
}

function arithmetic(operator: "+" | "-" | "*" | "/" | "^", left: FormulaValue, right: FormulaValue): FormulaValue {
  // Dates take part in `+`/`-`: a date shifted by days, or the days between two dates.
  // A blank next to a date stays blank, so a row with no date does not fill the column with errors.
  if ((operator === "+" || operator === "-") && ((left instanceof Date && right === null) || (right instanceof Date && left === null))) return null;
  if (operator === "-" && left instanceof Date && right instanceof Date) return daysBetween(left, right);
  if ((operator === "+" || operator === "-") && (left instanceof Date || right instanceof Date)) {
    if (left instanceof Date && !(right instanceof Date)) return shiftDate(left, operator === "+" ? toNumber(right) : -toNumber(right));
    if (operator === "+" && right instanceof Date && !(left instanceof Date)) return shiftDate(right, toNumber(left));
    throw new FormulaError("#VALUE!", "Two dates can only be subtracted, not added.");
  }

  const a = toNumber(left);
  const b = toNumber(right);
  switch (operator) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/":
      if (b === 0) throw new FormulaError("#DIV/0!", "Cannot divide by zero.");
      return a / b;
    case "^": {
      const result = Math.pow(a, b);
      if (!Number.isFinite(result)) throw new FormulaError("#NUM!", "The result is not a valid number.");
      return result;
    }
  }
}

function shiftDate(date: Date, days: number): Date {
  const whole = Math.trunc(days);
  return addMinutes(addDays(date, whole), Math.round((days - whole) * 1440));
}

function evaluateNode(node: FormulaNode, context: FormulaEvalContext): FormulaValue {
  switch (node.type) {
    case "number":
    case "string":
    case "constant":
      return node.value;
    case "column":
      return readColumn(node.ref, context);
    case "unary": {
      const operand = evaluateNode(node.operand, context);
      return node.operator === "-" ? -toNumber(operand) : toNumber(operand);
    }
    case "binary": {
      const left = evaluateNode(node.left, context);
      const right = evaluateNode(node.right, context);
      switch (node.operator) {
        case "&": return toText(left) + toText(right);
        case "=": return compareValues(left, right) === 0;
        case "<>": return compareValues(left, right) !== 0;
        case "<": return compareValues(left, right) < 0;
        case "<=": return compareValues(left, right) <= 0;
        case ">": return compareValues(left, right) > 0;
        case ">=": return compareValues(left, right) >= 0;
        default: return arithmetic(node.operator, left, right);
      }
    }
    case "call": {
      const definition = findFormulaFunction(node.name);
      if (!definition) throw new FormulaError("#NAME?", `${node.name} is not a known function.`);
      checkArgumentCount(node, definition.min_args, definition.max_args);
      if (definition.runLazy) return definition.runLazy(node.args, (arg) => evaluateNode(arg, context));
      return definition.run!(node.args.map((arg) => evaluateNode(arg, context)));
    }
  }
}

function checkArgumentCount(node: Extract<FormulaNode, { type: "call" }>, min: number, max: number): void {
  if (node.args.length >= min && node.args.length <= max) return;
  const expected = min === max ? `${min}` : max === Infinity ? `at least ${min}` : `${min} to ${max}`;
  throw new FormulaError("#VALUE!", `${node.name} takes ${expected} argument${expected === "1" ? "" : "s"}, but got ${node.args.length}.`);
}

/**
 * Evaluates `expression` against one row. Never throws: a syntax problem or a
 * runtime failure (`#DIV/0!`, `#VALUE!`, ...) comes back as `ok: false` so the
 * cell can show it instead of breaking the whole table.
 */
export function runFormula(expression: string, context: FormulaEvalContext): FormulaOutcome {
  try {
    const value = evaluateNode(parseFormula(expression), context);
    return { ok: true, value, text: formatFormulaValue(value) };
  } catch (error) {
    if (error instanceof FormulaError) return { ok: false, code: error.code, message: error.message };
    if (error instanceof FormulaSyntaxError) return { ok: false, code: "#ERROR!", message: error.message };
    return { ok: false, code: "#ERROR!", message: "The formula could not be evaluated." };
  }
}

/**
 * Checks a formula without any row data: syntax, unknown functions, wrong
 * argument counts and unresolvable column references. Each issue carries the
 * source range to underline; an empty list means the formula can be saved.
 */
export function validateFormula(expression: string, sources: FormulaSourceColumn[]): FormulaIssue[] {
  let tree: FormulaNode;
  try {
    tree = parseFormula(expression);
  } catch (error) {
    if (error instanceof FormulaSyntaxError) return [{ message: error.message, start: error.start, end: error.end }];
    throw error;
  }

  const issues: FormulaIssue[] = [];
  walkFormula(tree, (node) => {
    if (node.type === "column") {
      const resolved = resolveReference(node.ref, sources);
      if ("error" in resolved) issues.push({ message: resolved.error, start: node.start, end: node.end });
    } else if (node.type === "call") {
      const definition = findFormulaFunction(node.name);
      if (!definition) {
        issues.push({ message: `${node.name} is not a known function.`, start: node.start, end: node.start + node.name.length });
      } else if (node.args.length < definition.min_args || node.args.length > definition.max_args) {
        try {
          checkArgumentCount(node, definition.min_args, definition.max_args);
        } catch (error) {
          issues.push({ message: (error as Error).message, start: node.start, end: node.end });
        }
      }
    }
  });
  return issues;
}

const KIND_TYPE: Partial<Record<ColumnKind, FormulaValueType>> = {
  number: "number", rating: "number", progress: "number", auto_number: "number", people: "number", vote: "number",
  checkbox: "boolean",
  date: "date",
};

function unifyTypes(types: FormulaValueType[]): FormulaValueType {
  const [first, ...rest] = types;
  return first !== undefined && rest.every((type) => type === first) ? first : "unknown";
}

function inferNode(node: FormulaNode, sources: FormulaSourceColumn[]): FormulaValueType {
  switch (node.type) {
    case "number": return "number";
    case "string": return "text";
    case "constant": return "boolean";
    case "column": {
      const resolved = resolveReference(node.ref, sources);
      return "error" in resolved ? "unknown" : (KIND_TYPE[resolved.source.kind] ?? "text");
    }
    case "unary": return "number";
    case "binary":
      if (node.operator === "&") return "text";
      if (["=", "<>", "<", "<=", ">", ">="].includes(node.operator)) return "boolean";
      if (node.operator === "+" || node.operator === "-") {
        const left = inferNode(node.left, sources);
        const right = inferNode(node.right, sources);
        if (node.operator === "-" && left === "date" && right === "date") return "number";
        if (left === "date" || right === "date") return "date";
      }
      return "number";
    case "call": {
      const definition = findFormulaFunction(node.name);
      if (!definition) return "unknown";
      if (definition.branches) return unifyTypes(definition.branches(node.args).map((branch) => inferNode(branch, sources)));
      return definition.returns;
    }
  }
}

/** The type a formula's result always has, worked out from the expression alone (`unknown` when it depends on the row's data). Drives alignment, sorting and the group summary. */
export function inferFormulaType(expression: string, sources: FormulaSourceColumn[]): FormulaValueType {
  try {
    return inferNode(parseFormula(expression), sources);
  } catch {
    return "unknown";
  }
}

/**
 * Rewrites every `{Title}` reference into the stable `{#id}` form that is
 * saved, or reports the references that cannot be resolved. References that
 * already use the `{#id}` form are kept, and text inside quotes is untouched.
 */
export function toStoredExpression(expression: string, sources: FormulaSourceColumn[]): { stored: string; unresolved: string[] } {
  return rewriteReferences(expression, (ref) => {
    if (ref.startsWith("#")) return ref.slice(1) && sources.some((source) => source.id === ref.slice(1)) ? columnReferenceToken(ref.slice(1)) : null;
    const resolved = resolveReference(ref, sources);
    return "source" in resolved ? columnReferenceToken(resolved.source.id) : null;
  });
}

/** How a column is written in the editor: `{Title}`, or the unambiguous `{#id}` when another column shares its title or the title has braces in it. */
export function referenceTextFor(source: FormulaSourceColumn, sources: FormulaSourceColumn[]): string {
  const is_unique = sources.filter((candidate) => normalizeTitle(candidate.title) === normalizeTitle(source.title)).length === 1;
  return is_unique && !/[{}]/.test(source.title) ? `{${source.title.trim()}}` : columnReferenceToken(source.id);
}

/** The inverse of `toStoredExpression`: shows `{#id}` references as the columns' current titles, so a rename is reflected in the editor. */
export function toDisplayExpression(stored: string, sources: FormulaSourceColumn[]): string {
  return rewriteReferences(stored, (ref) => {
    if (!ref.startsWith("#")) return `{${ref}}`;
    const source = sources.find((candidate) => candidate.id === ref.slice(1));
    return source ? referenceTextFor(source, sources) : null;
  }).stored;
}

/** Applies `replace` to every `{...}` reference outside string literals; a `null` result keeps the original text and records the reference as unresolved. */
function rewriteReferences(expression: string, replace: (ref: string) => string | null): { stored: string; unresolved: string[] } {
  const unresolved: string[] = [];
  let output = "";
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];
    if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < expression.length) {
        if (expression[end] === char) {
          if (expression[end + 1] === char) { end += 2; continue; }
          break;
        }
        end++;
      }
      output += expression.slice(index, end + 1);
      index = end + 1;
    } else if (char === "{") {
      const close = expression.indexOf("}", index + 1);
      if (close === -1) {
        output += expression.slice(index);
        break;
      }
      const ref = expression.slice(index + 1, close).trim();
      const replacement = ref ? replace(ref) : null;
      if (replacement === null) unresolved.push(ref);
      output += replacement ?? expression.slice(index, close + 1);
      index = close + 1;
    } else {
      output += char;
      index++;
    }
  }
  return { stored: output, unresolved };
}

/** Evaluates a function's own `example` for the dialog's reference panel. */
export function evaluateExample(expression: string): string {
  const outcome = runFormula(expression, { sources: [], values: {} });
  return outcome.ok ? outcome.text || "(blank)" : outcome.code;
}

