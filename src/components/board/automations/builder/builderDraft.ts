import type {
  BoardAutomationAction,
  BoardAutomationActionParams,
  BoardAutomationActionType,
  BoardAutomationCondition,
  BoardAutomationDefinition,
  BoardAutomationDto,
  BoardAutomationImportance,
  BoardAutomationTriggerConfig,
  BoardAutomationTriggerType,
} from "@/types/board-automation";
import { isValuelessOperator } from "../../toolbar/filterEngine";
import type { BoardFilterOperator } from "../../toolbar/types";
import {
  ACTIONS,
  ITEMLESS_ACTION_TYPES,
  NUMERIC_KINDS,
  TRIGGER_BY_TYPE,
  browserTimezone,
  type ActionPickerId,
  type AutomationBuilderContext,
} from "./automationCatalog";

/**
 * The sentence builder's editable state and its conversions to and from the API. A draft may be
 * incomplete while the user fills in its tokens, {@link draftProblems} says what is still missing.
 */

export type ConditionDraft = BoardAutomationCondition & { key: string };

export type ActionDraft = {
  key: string;
  /** The picker entry chosen, "change status" is kept apart from "change column value" only here. */
  picker_id: ActionPickerId | null;
  type: BoardAutomationActionType | null;
  params: BoardAutomationActionParams;
};

export type AutomationDraft = {
  trigger_type: BoardAutomationTriggerType | null;
  trigger_column_id: string | null;
  trigger_value: unknown;
  trigger_config: BoardAutomationTriggerConfig;
  conditions: ConditionDraft[];
  actions: ActionDraft[];
  name: string;
  description: string;
  importance: BoardAutomationImportance;
};

let key_counter = 0;
export const nextDraftKey = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${(key_counter++).toString(36)}`;

export const emptyAction = (): ActionDraft => ({ key: nextDraftKey("action"), picker_id: null, type: null, params: {} });

export const emptyCondition = (): ConditionDraft => ({ key: nextDraftKey("condition"), column_id: "", condition: "", value: "", values: [] });

export function emptyDraft(): AutomationDraft {
  return {
    trigger_type: null,
    trigger_column_id: null,
    trigger_value: null,
    trigger_config: {},
    conditions: [],
    actions: [emptyAction()],
    name: "",
    description: "",
    importance: "minor",
  };
}

/** The picker entry an existing action reads as. */
function pickerIdFor(action: BoardAutomationAction, context: AutomationBuilderContext): ActionPickerId {
  if (action.type === "set_column_value") {
    const column = context.columns.find((c) => c.id === String(action.params.target_column_id));
    if (column?.kind === "status") return "change_status";
  }
  return action.type;
}

export function draftFromDefinition(definition: BoardAutomationDefinition, context: AutomationBuilderContext): AutomationDraft {
  return {
    ...emptyDraft(),
    trigger_type: definition.trigger_type,
    trigger_column_id: definition.trigger_column_id != null ? String(definition.trigger_column_id) : null,
    trigger_value: definition.trigger_value ?? null,
    trigger_config: { ...(definition.trigger_config ?? {}) },
    conditions: (definition.conditions ?? []).map((condition) => ({ ...condition, values: condition.values ?? [], value: condition.value ?? "", key: nextDraftKey("condition") })),
    actions: definition.actions.length
      ? definition.actions.map((action) => ({ key: nextDraftKey("action"), picker_id: pickerIdFor(action, context), type: action.type, params: { ...action.params } }))
      : [emptyAction()],
  };
}

export function draftFromAutomation(automation: BoardAutomationDto, context: AutomationBuilderContext): AutomationDraft {
  const actions = automation.actions?.length ? automation.actions : [{ type: automation.action_type, params: automation.action_params ?? {} }];
  return {
    ...draftFromDefinition(
      {
        trigger_type: automation.trigger_type,
        trigger_column_id: automation.trigger_column_id,
        trigger_value: automation.trigger_value,
        trigger_config: automation.trigger_config,
        conditions: automation.conditions ?? [],
        actions,
      },
      context
    ),
    name: automation.name ?? "",
    description: automation.description ?? "",
    importance: automation.importance ?? "minor",
  };
}

/** The params a freshly picked action starts with. Tokens the user must choose stay empty. */
export function defaultActionParams(picker_id: ActionPickerId, context: AutomationBuilderContext): BoardAutomationActionParams {
  const first = (kinds: string[]) => context.columns.find((c) => c.scope === "item" && kinds.includes(c.kind));
  switch (picker_id) {
    case "change_status": {
      const status = first(["status"]);
      return status ? { target_column_id: Number(status.id) } : {};
    }
    case "set_date": {
      const date = first(["date"]);
      return { offset_days: 0, ...(date ? { target_column_id: Number(date.id) } : {}) };
    }
    case "adjust_number": {
      const number = first(NUMERIC_KINDS);
      return { amount: 1, ...(number ? { target_column_id: Number(number.id) } : {}) };
    }
    case "assign_person":
    case "unassign_people": {
      const people = first(["people"]);
      return { ...(picker_id === "assign_person" ? { assign_mode: "user" as const } : {}), ...(people ? { target_column_id: Number(people.id) } : {}) };
    }
    case "duplicate_item":
      return { with_subitems: true };
    case "create_item":
      return { item_name: "", copy_values: false };
    case "create_subitem":
      return { subitem_names: [""] };
    default:
      return {};
  }
}

export function actionFromPicker(picker_id: ActionPickerId, context: AutomationBuilderContext, key?: string): ActionDraft {
  const def = ACTIONS.find((action) => action.id === picker_id);
  return { key: key ?? nextDraftKey("action"), picker_id, type: def?.type ?? null, params: defaultActionParams(picker_id, context) };
}

const isBlank = (value: unknown): boolean => value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

/** Whether a condition row is filled in enough to save. */
export function isConditionComplete(condition: BoardAutomationCondition): boolean {
  if (!condition.column_id || !condition.condition) return false;
  if (isValuelessOperator(condition.condition as BoardFilterOperator)) return true;
  if (condition.condition === "between") return condition.values.length === 2 && condition.values.every((value) => value !== "");
  return condition.values.length > 0 || condition.value.trim() !== "";
}

function actionProblem(action: ActionDraft, index: number, context: AutomationBuilderContext): string | null {
  const params = action.params;
  const where = `action ${index + 1}`;
  if (!action.type) return `Choose what ${where} does.`;

  const needs_column = ["set_column_value", "clear_column", "assign_person", "unassign_people", "set_date", "adjust_number"];
  if (needs_column.includes(action.type) && !params.target_column_id) return `Choose the column for ${where}.`;

  switch (action.type) {
    case "move_to_group":
      return params.target_group_id ? null : `Choose the group for ${where}.`;
    case "move_to_board":
      return params.target_board_id && params.target_group_id ? null : `Choose the board and group for ${where}.`;
    case "create_item":
      return params.target_group_id ? null : `Choose where ${where} creates the item.`;
    case "create_subitem":
      return (params.subitem_names ?? []).some((name) => name.trim() !== "") ? null : `Name at least one subitem for ${where}.`;
    case "set_column_value":
      return isBlank(params.value) && typeof params.value !== "boolean" ? `Choose the value for ${where}.` : null;
    case "assign_person":
      return params.assign_mode === "user" && !params.user_id ? `Choose the person ${where} assigns.` : null;
    case "adjust_number":
      return params.amount ? null : `Set a number other than zero for ${where}.`;
    case "notify_person":
    case "send_email":
    case "slack_notify_person":
      return params.notify_user_id || params.notify_from_people_column_id ? null : `Choose who ${where} reaches.`;
    case "slack_notify_channel":
      if (!context.is_slack_connected) return "Connect Slack before posting to a channel.";
      return params.slack_channel_id ? null : `Choose the Slack channel for ${where}.`;
    case "post_update":
      return (params.message ?? "").trim() ? null : `Write the update ${where} posts.`;
    default:
      return null;
  }
}

/** Everything still missing before the draft can be saved, in reading order. Empty once it is complete. */
export function draftProblems(draft: AutomationDraft, context: AutomationBuilderContext): string[] {
  const problems: string[] = [];
  const trigger = draft.trigger_type ? TRIGGER_BY_TYPE[draft.trigger_type] : null;

  if (!trigger) {
    problems.push("Choose what starts the automation.");
  } else {
    if (trigger.column_kinds && !draft.trigger_column_id) problems.push("Choose the column the trigger watches.");
    if (draft.trigger_type === "recurring") {
      const schedule = draft.trigger_config.schedule;
      if (!schedule?.frequency) problems.push("Choose how often it runs.");
      else if (schedule.frequency === "weekly" && !(schedule.weekdays ?? []).length) problems.push("Choose at least one day of the week.");
    }
  }

  draft.conditions.forEach((condition, index) => {
    if (!isConditionComplete(condition)) problems.push(`Finish or remove condition ${index + 1}.`);
  });

  let has_item = draft.trigger_type !== "recurring";
  draft.actions.forEach((action, index) => {
    const problem = actionProblem(action, index, context);
    if (problem) problems.push(problem);
    if (!has_item && action.type && !ITEMLESS_ACTION_TYPES.includes(action.type)) {
      problems.push(`A recurring automation has no item, add "create item" before action ${index + 1}.`);
    }
    if (action.type === "create_item") has_item = true;
  });

  return problems;
}

/** Keeps only the params worth sending, empty strings and undefined dropped. */
function cleanParams(params: BoardAutomationActionParams): BoardAutomationActionParams {
  const cleaned: Record<string, unknown> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === "subitem_names" && Array.isArray(value)) {
      cleaned[key] = value.map((name) => String(name).trim()).filter(Boolean);
      return;
    }
    cleaned[key] = value;
  });
  return cleaned as BoardAutomationActionParams;
}

/** The definition to save. Call only once {@link draftProblems} is empty. */
export function draftToDefinition(draft: AutomationDraft): BoardAutomationDefinition {
  const trigger_type = draft.trigger_type as BoardAutomationTriggerType;
  const needs_timezone = trigger_type === "date_arrived" || trigger_type === "recurring";
  const trigger_config: BoardAutomationTriggerConfig = { ...draft.trigger_config };
  if (needs_timezone) trigger_config.timezone = trigger_config.timezone ?? browserTimezone();
  if (trigger_type === "recurring" && trigger_config.schedule) {
    trigger_config.schedule = { ...trigger_config.schedule, timezone: trigger_config.schedule.timezone ?? browserTimezone() };
  }

  return {
    trigger_type,
    trigger_column_id: TRIGGER_BY_TYPE[trigger_type]?.column_kinds && draft.trigger_column_id ? Number(draft.trigger_column_id) : null,
    trigger_value: draft.trigger_value ?? null,
    trigger_config: Object.keys(trigger_config).length ? trigger_config : null,
    conditions: draft.conditions.filter(isConditionComplete).map(({ column_id, condition, value, values }) => ({ column_id, condition, value, values })),
    actions: draft.actions
      .filter((action): action is ActionDraft & { type: BoardAutomationActionType } => action.type !== null)
      .map((action) => ({ type: action.type, params: cleanParams(action.params) })),
  };
}
