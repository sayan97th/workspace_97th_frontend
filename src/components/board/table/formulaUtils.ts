import type { CellValue, ColumnDef } from "./types";

/** Coerces a cell's raw value to a number for `sum`/`subtract`/`multiply`/`divide` — mirrors `summaryUtils.ts`'s own `numberValueOf`, which is why a Number column's value is read as a string here too. */
function numberValueOf(raw: CellValue): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== "string") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Coerces a cell's raw value to display text for `concat` — array/object-valued kinds (people, files, ...) contribute nothing rather than `"[object Object]"`. */
function textValueOf(raw: CellValue): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "number") return String(raw);
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  return "";
}

/**
 * A `formula`-kind column's computed display value: applies `column.formula`'s
 * operation to the same row's `source_column_ids` cells. Purely derived, no
 * `BoardItemValue` of its own — recomputed on every render from `values`, so
 * it always reflects the source cells' current state, including an in-flight
 * (not-yet-saved) edit.
 */
export function computeFormulaValue(column: ColumnDef, values: Record<string, CellValue>): string {
  const formula = column.formula;
  if (!formula || formula.source_column_ids.length === 0) return "";

  const source_values = formula.source_column_ids.map((id) => values[id]);

  if (formula.operation === "concat") {
    return source_values.map(textValueOf).filter(Boolean).join(" ");
  }

  const numbers = source_values.map(numberValueOf);
  switch (formula.operation) {
    case "sum":
      return String(numbers.reduce((total, n) => total + n, 0));
    case "subtract":
      return String(numbers.reduce((total, n, index) => (index === 0 ? n : total - n)));
    case "multiply":
      return String(numbers.reduce((total, n) => total * n, 1));
    case "divide":
      return String(numbers.reduce((total, n, index) => (index === 0 ? n : n === 0 ? total : total / n)));
    default:
      return "";
  }
}
