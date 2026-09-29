import type { BoardAutomationAction, BoardAutomationDto, BoardAutomationTriggerType } from "@/types/board-automation";
import type { AutomationBuilderContext, AutomationColumn } from "./automationCatalog";
import { emptyDraft, type AutomationDraft } from "./builderDraft";

/**
 * Which columns automations use, for the column header's "Automate" shortcut: how many
 * automations already use a column, and the sentence the builder starts from for one.
 */

/** Action params that hold a column id of the automation's own table. */
const COLUMN_PARAMS = ["target_column_id", "source_column_id", "number_column_id", "notify_from_people_column_id", "dependency_column_id", "email_column_id"] as const;

/** Every column id one automation reads or writes: its trigger, conditions and both branches. */
export function automationColumnIds(automation: Pick<BoardAutomationDto, "trigger_column_id" | "conditions" | "condition_groups" | "actions" | "else_actions" | "action_type" | "action_params">): Set<string> {
  const ids = new Set<string>();
  if (automation.trigger_column_id != null) ids.add(String(automation.trigger_column_id));
  const rules = [...(automation.conditions ?? []), ...(automation.condition_groups ?? []).flatMap((group) => group.rules)];
  rules.forEach((rule) => {
    if (/^\d+$/.test(rule.column_id)) ids.add(rule.column_id);
  });
  const actions: BoardAutomationAction[] = [
    ...(automation.actions?.length ? automation.actions : [{ type: automation.action_type, params: automation.action_params ?? {} }]),
    ...(automation.else_actions ?? []),
  ];
  actions.forEach((action) => {
    COLUMN_PARAMS.forEach((key) => {
      const value = action.params[key];
      if (value != null) ids.add(String(value));
    });
    (action.params.field_mappings ?? []).forEach((mapping) => {
      if (mapping.column_id != null) ids.add(String(mapping.column_id));
    });
  });
  return ids;
}

/** How many automations use each column, keyed by column id. */
export function countAutomationsByColumn(automations: BoardAutomationDto[]): Record<string, number> {
  const counts: Record<string, number> = {};
  automations.forEach((automation) => {
    automationColumnIds(automation).forEach((id) => {
      counts[id] = (counts[id] ?? 0) + 1;
    });
  });
  return counts;
}

/** The trigger that fits a column best, like monday's column "Automate" menu. */
export function triggerForColumn(column: AutomationColumn): BoardAutomationTriggerType {
  switch (column.kind) {
    case "status":
    case "label":
      return "status_changed";
    case "date":
      return "date_arrived";
    case "timeline":
      return "date_changed";
    case "people":
      return "person_assigned";
    case "number":
    case "rating":
    case "progress":
    case "time_tracking":
      return "number_threshold";
    case "checklist":
      return "checklist_completed";
    case "button":
      return "button_clicked";
    default:
      return "column_changed";
  }
}

/** A draft watching `column_id` with the trigger that fits it, the actions left for the user. */
export function draftForColumn(column_id: string, context: AutomationBuilderContext): AutomationDraft {
  const column = context.columns.find((entry) => entry.id === column_id);
  if (!column) return emptyDraft();

  const trigger_type = triggerForColumn(column);
  const needs_schedule = trigger_type === "date_arrived";
  return {
    ...emptyDraft(),
    trigger_type,
    trigger_column_id: column.id,
    trigger_config: trigger_type === "number_threshold" ? { operator: "above", threshold: null } : needs_schedule ? { offset_days: 0 } : {},
  };
}

/** Automations of this table that use `column_id` anywhere. */
export function automationsUsingColumn(automations: BoardAutomationDto[], column_id: string): BoardAutomationDto[] {
  return automations.filter((automation) => automationColumnIds(automation).has(column_id));
}
