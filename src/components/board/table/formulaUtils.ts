import type { CellValue, ColumnDef } from "./types";
import { columnReferenceToken, inferFormulaType, runFormula, type FormulaOutcome } from "./formula/formulaEngine";
import type { FormulaValueType } from "./formula/formulaValues";

/** The pre-expression shape of a formula column's config: one fixed operation over an ordered list of source columns. */
export interface LegacyFormulaConfig {
  operation?: "sum" | "subtract" | "multiply" | "divide" | "concat";
  source_column_ids?: (number | string)[];
}

const LEGACY_OPERATORS = { sum: " + ", subtract: " - ", multiply: " * ", divide: " / " } as const;

/**
 * Converts a formula saved before expressions existed (`operation` +
 * `source_column_ids`) into the equivalent expression, so old columns keep
 * their result and open in the dialog as an ordinary editable formula.
 * Returns `undefined` when the column was never configured.
 */
export function legacyFormulaToExpression(config: LegacyFormulaConfig | null | undefined): string | undefined {
  const references = (config?.source_column_ids ?? []).map((id) => columnReferenceToken(String(id)));
  if (!config?.operation || references.length === 0) return undefined;
  if (config.operation === "concat") return references.join(' & " " & ');
  return references.join(LEGACY_OPERATORS[config.operation]);
}

/**
 * A `formula`-kind column's outcome for one row: evaluates `column.formula`'s
 * expression against that same row's cells. Purely derived, no
 * `BoardItemValue` of its own, recomputed on every render from `values`, so
 * it always reflects the source cells' current state, including an in-flight
 * (not-yet-saved) edit. `null` while the column has no formula yet.
 */
export function computeFormulaOutcome(column: ColumnDef, values: Record<string, CellValue>, item_name?: string): FormulaOutcome | null {
  if (!column.formula?.expression.trim()) return null;
  return runFormula(column.formula.expression, { sources: column.formula_sources ?? [], values, item_name });
}

/** The display text of `computeFormulaOutcome`, or an empty string when there is no formula or it errored. */
export function computeFormulaValue(column: ColumnDef, values: Record<string, CellValue>, item_name?: string): string {
  const outcome = computeFormulaOutcome(column, values, item_name);
  return outcome?.ok ? outcome.text : "";
}

const type_cache = new WeakMap<ColumnDef, FormulaValueType>();

/** What kind of result the column's formula always produces, known from the expression alone. Cached per column object because sorting asks for it on every comparison. */
export function formulaResultType(column: ColumnDef): FormulaValueType {
  if (!column.formula?.expression.trim()) return "unknown";
  let type = type_cache.get(column);
  if (!type) {
    type = inferFormulaType(column.formula.expression, column.formula_sources ?? []);
    type_cache.set(column, type);
  }
  return type;
}

/** Whether the column's formula always yields a number, so `sortUtils`/`summaryUtils` can order and total its computed values numerically. */
export function isNumericFormula(column: ColumnDef): boolean {
  return formulaResultType(column) === "number";
}

/** Whether the column's formula always yields a date, so it sorts chronologically. */
export function isDateFormula(column: ColumnDef): boolean {
  return formulaResultType(column) === "date";
}
