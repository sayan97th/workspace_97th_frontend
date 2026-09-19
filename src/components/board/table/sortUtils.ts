import type { ColumnDef, SortState, BoardTableNode } from "./types";
import { computeFormulaOutcome, isDateFormula, isNumericFormula } from "./formulaUtils";

function sortableValue(node: BoardTableNode, column_id: string, columns: ColumnDef[]): string | number {
  if (column_id === "__name") return node.name.toLowerCase();
  const column = columns.find((c) => c.id === column_id);
  // A formula column has no `BoardItemValue` of its own (see `computeFormulaOutcome`'s
  // own doc comment), its sortable value is always the same computed result its cell
  // renders. Errors sort as blank, first ascending.
  if (column?.kind === "formula") {
    const outcome = computeFormulaOutcome(column, node.values, node.name);
    if (isNumericFormula(column)) return outcome?.ok ? Number(outcome.value) || 0 : 0;
    if (isDateFormula(column) && outcome?.ok && outcome.value instanceof Date) return outcome.value.getTime();
    return outcome?.ok ? outcome.text.toLowerCase() : "";
  }
  const raw = node.values[column_id];
  if (column && (column.kind === "number" || column.kind === "progress")) return Number(raw) || 0;
  if (Array.isArray(raw)) return raw.join(", ").toLowerCase();
  return String(raw ?? "").toLowerCase();
}

export function applySort<T extends BoardTableNode>(nodes: T[], sort: SortState | null, scope_key: string, columns: ColumnDef[]): T[] {
  if (!sort || sort.scope_key !== scope_key) return nodes;
  const sorted = nodes.slice().sort((a, b) => {
    const va = sortableValue(a, sort.column_id, columns);
    const vb = sortableValue(b, sort.column_id, columns);
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
  return sort.direction === "desc" ? sorted.reverse() : sorted;
}
