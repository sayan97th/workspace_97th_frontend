import { TEXT_FAMILY_KINDS } from "./constants";
import type { CellValue, ColumnDef } from "./types";

/** Whether `value` counts as empty for a `required` check — mirrors how each cell kind already treats "no value" (an empty string/array, or a checklist with no items). */
function isEmptyValue(value: CellValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Whether a column's `config.validation` rules flag `value` as invalid —
 * advisory only (see `ColumnValidation`'s own doc comment), used purely to
 * decide whether `ItemRow`/`SubitemRow` render a cell's red "needs
 * attention" outline. Never blocks a save.
 */
export function isValueInvalid(column: ColumnDef, value: CellValue): boolean {
  const validation = column.validation;
  if (!validation) return false;

  if (validation.required && isEmptyValue(value)) return true;
  if (isEmptyValue(value)) return false;

  if (column.kind === "number") {
    const numeric = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
    if (Number.isFinite(numeric)) {
      if (validation.min !== undefined && numeric < validation.min) return true;
      if (validation.max !== undefined && numeric > validation.max) return true;
    }
    return false;
  }

  if (TEXT_FAMILY_KINDS.includes(column.kind) && validation.pattern) {
    try {
      const regex = new RegExp(validation.pattern);
      return typeof value === "string" && !regex.test(value);
    } catch {
      // An invalid regex (e.g. mid-edit in the settings panel) never flags a cell.
      return false;
    }
  }

  return false;
}
