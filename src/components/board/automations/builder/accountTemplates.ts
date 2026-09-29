import type { AccountAutomationTemplateDto, BoardAutomationDefinition, PortableColumnKind } from "@/types/board-automation";
import type { ColumnKind } from "../../table/types";
import type { AutomationBuilderContext } from "./automationCatalog";

/**
 * Account wide templates are saved without this board's columns, `column_kinds` says which kind
 * of column goes where (e.g. `actions.0.params.target_column_id` needs an item status column). These
 * helpers fill every such place with a fitting column of this table, or list what is missing.
 */

/** The API column type as the table names it. */
const TABLE_KIND_BY_API_TYPE: Record<string, ColumnKind> = { long_text: "longtext" };

const tableKind = (type: string): ColumnKind => (TABLE_KIND_BY_API_TYPE[type] ?? type) as ColumnKind;

/** Writes `value` at a dotted path like `actions.0.params.target_column_id`, creating nothing that is missing. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let node: unknown = target;
  for (const key of keys.slice(0, -1)) {
    if (node === null || typeof node !== "object") return;
    node = (node as Record<string, unknown>)[key];
  }
  if (node !== null && typeof node === "object") (node as Record<string, unknown>)[keys[keys.length - 1]] = value;
}

/** Condition paths store the column id as text, every other path as a number. */
const isConditionPath = (path: string): boolean => path.startsWith("conditions.") || path.startsWith("condition_groups.");

/**
 * The template's definition with a column of this table in every place it needs one. Places of
 * the same kind take different columns in order, so "copy Start to Due" keeps two date columns.
 */
export function definitionFromAccountTemplate(template: AccountAutomationTemplateDto, context: AutomationBuilderContext): { definition: BoardAutomationDefinition; missing: PortableColumnKind[] } {
  const definition = JSON.parse(JSON.stringify(template.definition)) as BoardAutomationDefinition;
  const used = new Map<string, number>();
  const missing: PortableColumnKind[] = [];

  Object.entries(template.column_kinds ?? {}).forEach(([path, need]) => {
    const key = `${need.scope}:${need.type}`;
    const nth = used.get(key) ?? 0;
    used.set(key, nth + 1);
    const candidates = context.columns.filter((column) => column.scope === need.scope && column.kind === tableKind(need.type));
    const column = candidates[nth] ?? candidates[0];
    if (!column) {
      missing.push(need);
      return;
    }
    setPath(definition as unknown as Record<string, unknown>, path, isConditionPath(path) ? column.id : Number(column.id));
  });

  // Conditions whose column could not be filled would never be complete, they are dropped.
  definition.conditions = (definition.conditions ?? []).filter((condition) => condition.column_id !== "");
  definition.condition_groups = (definition.condition_groups ?? [])
    .map((group) => ({ ...group, rules: group.rules.filter((rule) => rule.column_id !== "") }))
    .filter((group) => group.rules.length > 0);

  return { definition, missing };
}

/** `a Status column`, `a subitem Date column`. */
export function describeColumnNeed(need: PortableColumnKind): string {
  const label = tableKind(need.type).replace("_", " ");
  return `a ${need.scope === "subitem" ? "subitem " : ""}${label} column`;
}
