import type {
  BoardAutomationAction,
  BoardAutomationActionParams,
  BoardAutomationActionType,
  BoardAutomationCondition,
  BoardAutomationDefinition,
  BoardAutomationDto,
  BoardAutomationFailureAlert,
  BoardAutomationImportance,
  BoardAutomationTriggerConfig,
  BoardAutomationTriggerType,
} from "@/types/board-automation";
import { isValuelessOperator } from "../../toolbar/filterEngine";
import type { BoardFilterOperator } from "../../toolbar/types";
import {
  ACTIONS,
  GROUP_ACTION_TYPES,
  ITEMLESS_ACTION_TYPES,
  ITEMLESS_TRIGGERS,
  MAX_WAIT_DAYS,
  NUMERIC_KINDS,
  SCHEDULED_TRIGGERS,
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

/** A group of conditions combined with its own And/Or. */
export type ConditionGroupDraft = { key: string; join_operator: "and" | "or"; rules: ConditionDraft[] };

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
  /** How the top-level conditions and the groups combine. */
  condition_operator: "and" | "or";
  condition_groups: ConditionGroupDraft[];
  actions: ActionDraft[];
  /** The "Otherwise" actions, run when the item does not pass the conditions. */
  else_actions: ActionDraft[];
  name: string;
  description: string;
  importance: BoardAutomationImportance;
  failure_alert: BoardAutomationFailureAlert;
};

let key_counter = 0;
export const nextDraftKey = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${(key_counter++).toString(36)}`;

export const emptyAction = (): ActionDraft => ({ key: nextDraftKey("action"), picker_id: null, type: null, params: {} });

export const emptyCondition = (): ConditionDraft => ({ key: nextDraftKey("condition"), column_id: "", condition: "", value: "", values: [] });

export const emptyConditionGroup = (): ConditionGroupDraft => ({ key: nextDraftKey("group"), join_operator: "and", rules: [emptyCondition()] });

/** Most conditions of one automation, top-level and grouped together. */
export const MAX_CONDITIONS = 20;

export const MAX_CONDITION_GROUPS = 5;

/** Every condition of the draft, top-level first, then group by group. */
export const allConditions = (draft: Pick<AutomationDraft, "conditions" | "condition_groups">): ConditionDraft[] => [...draft.conditions, ...draft.condition_groups.flatMap((group) => group.rules)];

/** Triggers whose item cannot fail conditions, so they get no "Otherwise" branch. */
export const hasNoElseBranch = (trigger_type: BoardAutomationTriggerType | null): boolean => trigger_type === null || isItemlessTrigger(trigger_type) || trigger_type === "item_scan";

export function emptyDraft(): AutomationDraft {
  return {
    trigger_type: null,
    trigger_column_id: null,
    trigger_value: null,
    trigger_config: {},
    conditions: [],
    condition_operator: "and",
    condition_groups: [],
    actions: [emptyAction()],
    else_actions: [],
    name: "",
    description: "",
    importance: "minor",
    failure_alert: "app",
  };
}

/** Whether a trigger has no item of its own (recurring, webhook). */
export const isItemlessTrigger = (trigger_type: BoardAutomationTriggerType | null): boolean => trigger_type !== null && ITEMLESS_TRIGGERS.includes(trigger_type);

/** The picker entry an existing action reads as. */
function pickerIdFor(action: BoardAutomationAction, context: AutomationBuilderContext): ActionPickerId {
  if (action.type === "set_column_value") {
    const column = context.columns.find((c) => c.id === String(action.params.target_column_id));
    if (column?.kind === "status") return "change_status";
  }
  return action.type;
}

const toConditionDraft = (condition: BoardAutomationCondition): ConditionDraft => ({ ...condition, values: condition.values ?? [], value: condition.value ?? "", key: nextDraftKey("condition") });

const toActionDraft = (action: BoardAutomationAction, context: AutomationBuilderContext): ActionDraft => ({ key: nextDraftKey("action"), picker_id: pickerIdFor(action, context), type: action.type, params: { ...action.params } });

export function draftFromDefinition(definition: BoardAutomationDefinition, context: AutomationBuilderContext): AutomationDraft {
  return {
    ...emptyDraft(),
    trigger_type: definition.trigger_type,
    trigger_column_id: definition.trigger_column_id != null ? String(definition.trigger_column_id) : null,
    trigger_value: definition.trigger_value ?? null,
    trigger_config: { ...(definition.trigger_config ?? {}) },
    conditions: (definition.conditions ?? []).map(toConditionDraft),
    condition_operator: definition.condition_operator === "or" ? "or" : "and",
    condition_groups: (definition.condition_groups ?? []).map((group) => ({ key: nextDraftKey("group"), join_operator: group.join_operator === "or" ? "or" : "and", rules: group.rules.map(toConditionDraft) })),
    actions: definition.actions.length ? definition.actions.map((action) => toActionDraft(action, context)) : [emptyAction()],
    else_actions: (definition.else_actions ?? []).map((action) => toActionDraft(action, context)),
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
        condition_operator: automation.condition_operator,
        condition_groups: automation.condition_groups ?? [],
        actions,
        else_actions: automation.else_actions ?? [],
      },
      context
    ),
    name: automation.name ?? "",
    description: automation.description ?? "",
    importance: automation.importance ?? "minor",
    failure_alert: automation.failure_alert ?? "app",
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
    case "shift_date": {
      const date = first(["date", "timeline"]);
      return { amount: 1, unit: "days", ...(date ? { target_column_id: Number(date.id) } : {}) };
    }
    case "set_date_from_column":
      return { offset_days: 0, number_sign: 1 };
    case "ensure_date_after":
      return { gap_days: 1 };
    case "set_timeline": {
      const timeline = first(["timeline"]);
      return { start_offset_days: 0, duration_days: 7, ...(timeline ? { target_column_id: Number(timeline.id) } : {}) };
    }
    case "create_group":
      return { group_name: "Week {week}", position: "top" };
    case "duplicate_group":
      return { group_name: "", with_items: false };
    case "time_tracking": {
      const timer = first(["time_tracking"]);
      return { mode: "start", ...(timer ? { target_column_id: Number(timer.id) } : {}) };
    }
    case "connect_items": {
      const connect = first(["connect_board"]);
      return { match_column_id: "name", linked_match_column_id: "name", ...(connect ? { target_column_id: Number(connect.id) } : {}) };
    }
    case "wait":
      return { amount: 1, unit: "days", recheck_conditions: false };
    case "shift_dependents": {
      const dates = first(["timeline", "date"]);
      const dependency = first(["dependency"]);
      return { mode: "strict", ...(dates ? { target_column_id: Number(dates.id) } : {}), ...(dependency ? { dependency_column_id: Number(dependency.id) } : {}) };
    }
    case "assign_round_robin": {
      const people = first(["people"]);
      return { strategy: "rotation", user_ids: [], ...(people ? { target_column_id: Number(people.id) } : {}) };
    }
    case "set_subitems_value": {
      const status = context.columns.find((column) => column.scope === "subitem" && (column.kind === "status" || column.kind === "label"));
      return status ? { target_column_id: Number(status.id) } : {};
    }
    case "set_parent_value": {
      const status = first(["status", "label"]);
      return status ? { target_column_id: Number(status.id) } : {};
    }
    case "add_checklist_items": {
      const checklist = first(["checklist"]);
      return { tasks: [], ...(checklist ? { target_column_id: Number(checklist.id) } : {}) };
    }
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

/** Action types that write one column of the item, `target_column_id` is required. */
const COLUMN_ACTION_TYPES: BoardAutomationActionType[] = [
  "set_column_value", "clear_column", "assign_person", "unassign_people", "set_date", "adjust_number", "shift_date",
  "set_date_from_column", "ensure_date_after", "set_timeline", "copy_column_value", "time_tracking", "connect_items",
  "shift_dependents", "assign_round_robin", "set_subitems_value", "set_parent_value", "add_checklist_items",
];

/** Action types that also read another column, `source_column_id` is required. */
const SOURCE_COLUMN_ACTION_TYPES: BoardAutomationActionType[] = ["set_date_from_column", "ensure_date_after", "copy_column_value"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function actionProblem(action: ActionDraft, index: number, context: AutomationBuilderContext, branch: "then" | "else" = "then"): string | null {
  const params = action.params;
  const where = branch === "else" ? `"otherwise" action ${index + 1}` : `action ${index + 1}`;
  if (!action.type) return `Choose what ${where} does.`;

  if (COLUMN_ACTION_TYPES.includes(action.type) && !params.target_column_id) return `Choose the column for ${where}.`;
  if (SOURCE_COLUMN_ACTION_TYPES.includes(action.type) && !params.source_column_id) return `Choose the column ${where} reads from.`;

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
    case "set_subitems_value":
    case "set_parent_value":
      return isBlank(params.value) && typeof params.value !== "boolean" ? `Choose the value for ${where}.` : null;
    case "assign_person":
      return params.assign_mode === "user" && !params.user_id ? `Choose the person ${where} assigns.` : null;
    case "adjust_number":
      return params.amount ? null : `Set a number other than zero for ${where}.`;
    case "notify_person":
    case "slack_notify_person":
      return params.notify_user_id || params.notify_from_people_column_id ? null : `Choose who ${where} reaches.`;
    case "send_email":
      if ((params.email_addresses ?? []).some((address) => !EMAIL_PATTERN.test(address))) return `Fix the email addresses of ${where}.`;
      return params.notify_user_id || params.notify_from_people_column_id || params.email_column_id || params.email_addresses?.length ? null : `Choose who ${where} reaches.`;
    case "wait":
      return params.amount && params.amount > 0 ? null : `Set how long ${where} waits.`;
    case "shift_dependents":
      return params.dependency_column_id ? null : `Choose the dependency column of ${where}.`;
    case "assign_round_robin":
      return params.user_ids?.length ? null : `Choose the people ${where} assigns in turn.`;
    case "add_checklist_items":
      return params.tasks?.some((task) => task.trim()) ? null : `Write the tasks ${where} adds.`;
    case "slack_notify_channel":
      if (!context.is_slack_connected) return "Connect Slack before posting to a channel.";
      return params.slack_channel_id ? null : `Choose the Slack channel for ${where}.`;
    case "post_update":
      return (params.message ?? "").trim() ? null : `Write the update ${where} posts.`;
    case "shift_date":
      return params.amount ? null : `Set how far ${where} pushes the date.`;
    case "ensure_date_after":
    case "copy_column_value":
      return params.source_column_id === params.target_column_id ? `Choose two different columns for ${where}.` : null;
    case "create_group":
      return (params.group_name ?? "").trim() ? null : `Name the group ${where} creates.`;
    case "duplicate_group":
      return params.from_item_group || params.source_group_id ? null : `Choose the group ${where} duplicates.`;
    case "archive_group":
      return params.from_item_group || params.target_group_id ? null : `Choose the group ${where} archives.`;
    case "connect_items":
      if (!context.columns.find((column) => column.id === String(params.target_column_id))?.linked_board_id) return `Connect the column of ${where} to a board first.`;
      return params.match_column_id && params.linked_match_column_id ? null : `Choose what ${where} matches on.`;
    case "notify_team":
      return params.team_id ? null : `Choose the team ${where} notifies.`;
    case "send_webhook":
      return /^https?:\/\/\S+$/i.test((params.url ?? "").trim()) ? null : `Enter the URL ${where} sends to.`;
    default:
      return null;
  }
}

/** Minutes a branch waits in total, over all its "wait" steps. */
export function branchWaitMinutes(actions: ActionDraft[]): number {
  return actions.reduce((total, action) => {
    if (action.type !== "wait") return total;
    const amount = action.params.amount ?? 0;
    return total + (action.params.unit === "minutes" ? amount : action.params.unit === "hours" ? amount * 60 : amount * 1440);
  }, 0);
}

/** Everything still missing before the draft can be saved, in reading order. Empty once it is complete. */
export function draftProblems(draft: AutomationDraft, context: AutomationBuilderContext): string[] {
  const problems: string[] = [];
  const trigger = draft.trigger_type ? TRIGGER_BY_TYPE[draft.trigger_type] : null;

  if (!trigger) {
    problems.push("Choose what starts the automation.");
  } else {
    if (trigger.column_kinds && !draft.trigger_column_id) problems.push("Choose the column the trigger watches.");
    if (SCHEDULED_TRIGGERS.includes(trigger.type)) {
      const schedule = draft.trigger_config.schedule;
      if (!schedule?.frequency) problems.push("Choose how often it runs.");
      else if (schedule.frequency === "weekly" && !(schedule.weekdays ?? []).length) problems.push("Choose at least one day of the week.");
    }
    if ((trigger.type === "all_subitems_status" || trigger.type === "all_group_items_status") && draft.trigger_value == null) {
      problems.push("Choose the status every item must have.");
    }
    if (trigger.type === "item_scan" && allConditions(draft).length === 0) problems.push("Add a condition, it decides which items the scheduled check acts on.");
    if (trigger.type === "number_threshold" && typeof draft.trigger_config.threshold !== "number") problems.push("Enter the number the column must reach.");
  }

  allConditions(draft).forEach((condition, index) => {
    if (!isConditionComplete(condition)) problems.push(`Finish or remove condition ${index + 1}.`);
  });
  if (allConditions(draft).length > MAX_CONDITIONS) problems.push(`Keep it to ${MAX_CONDITIONS} conditions, groups included.`);

  let has_item = !isItemlessTrigger(draft.trigger_type);
  draft.actions.forEach((action, index) => {
    const problem = actionProblem(action, index, context);
    if (problem) problems.push(problem);
    if (!has_item && action.type && !ITEMLESS_ACTION_TYPES.includes(action.type)) {
      problems.push(`This trigger has no item, add "create item" before action ${index + 1}.`);
    }
    if (!has_item && action.type && GROUP_ACTION_TYPES.includes(action.type) && action.params.from_item_group) {
      problems.push(`There is no item yet, choose the group for action ${index + 1}.`);
    }
    if (action.type === "create_item") has_item = true;
  });

  draft.else_actions.forEach((action, index) => {
    const problem = actionProblem(action, index, context, "else");
    if (problem) problems.push(problem);
  });

  const max_minutes = MAX_WAIT_DAYS * 1440;
  if (branchWaitMinutes(draft.actions) > max_minutes || branchWaitMinutes(draft.else_actions) > max_minutes) {
    problems.push(`The waits of one branch may add up to ${MAX_WAIT_DAYS} days at most.`);
  }

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
    if ((key === "tasks" || key === "email_addresses") && Array.isArray(value)) {
      const entries = value.map((entry) => String(entry).trim()).filter(Boolean);
      if (entries.length) cleaned[key] = entries;
      return;
    }
    if (key === "field_mappings" && Array.isArray(value)) {
      const mappings = value.filter((mapping) => mapping?.column_id && String(mapping.source ?? "").trim());
      if (mappings.length) cleaned[key] = mappings;
      return;
    }
    cleaned[key] = value;
  });
  return cleaned as BoardAutomationActionParams;
}

const completeRules = (rules: ConditionDraft[]): BoardAutomationCondition[] =>
  rules.filter(isConditionComplete).map(({ column_id, condition, value, values }) => ({ column_id, condition, value, values }));

const toActions = (actions: ActionDraft[]): BoardAutomationAction[] =>
  actions
    .filter((action): action is ActionDraft & { type: BoardAutomationActionType } => action.type !== null)
    .map((action) => ({ type: action.type, params: cleanParams(action.params) }));

/** The definition as it stands, for a save once {@link draftProblems} is empty, or for a test run. */
export function draftToDefinition(draft: AutomationDraft): BoardAutomationDefinition {
  const trigger_type = draft.trigger_type as BoardAutomationTriggerType;
  const needs_timezone = trigger_type === "date_arrived" || SCHEDULED_TRIGGERS.includes(trigger_type);
  const trigger_config: BoardAutomationTriggerConfig = { ...draft.trigger_config };
  if (needs_timezone) trigger_config.timezone = trigger_config.timezone ?? browserTimezone();
  if (SCHEDULED_TRIGGERS.includes(trigger_type) && trigger_config.schedule) {
    trigger_config.schedule = { ...trigger_config.schedule, timezone: trigger_config.schedule.timezone ?? browserTimezone() };
  }

  return {
    trigger_type,
    trigger_column_id: TRIGGER_BY_TYPE[trigger_type]?.column_kinds && draft.trigger_column_id ? Number(draft.trigger_column_id) : null,
    trigger_value: draft.trigger_value ?? null,
    trigger_config: Object.keys(trigger_config).length ? trigger_config : null,
    conditions: completeRules(draft.conditions),
    condition_operator: draft.condition_operator,
    condition_groups: draft.condition_groups
      .map((group) => ({ join_operator: group.join_operator, rules: completeRules(group.rules) }))
      .filter((group) => group.rules.length > 0),
    actions: toActions(draft.actions),
    else_actions: hasNoElseBranch(trigger_type) ? [] : toActions(draft.else_actions),
  };
}
