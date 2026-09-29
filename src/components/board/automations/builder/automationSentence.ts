import type { BoardAutomationAction, BoardAutomationActionParams, BoardAutomationCondition, BoardAutomationDefinition, BoardAutomationSchedule } from "@/types/board-automation";
import { BOARD_FILTER_DATE_PRESETS, getOperatorLabel } from "../../toolbar/filterEngine";
import type { BoardFilterOperator } from "../../toolbar/types";
import { CONDITION_KIND_BY_COLUMN, VIRTUAL_CONDITION_FIELDS, WEEKDAY_LABELS, type AutomationBuilderContext, type AutomationColumn } from "./automationCatalog";

/**
 * Turns an automation into the words the builder's tokens and the Manage list show, like
 * monday's "When **Status** changes to **Done**, move item to **Completed**". Every helper reads
 * raw stored values, so the same text comes out of a draft and a saved automation.
 */

export type SentencePart = { text: string; is_token?: boolean };

const token = (text: string): SentencePart => ({ text, is_token: true });
const plain = (text: string): SentencePart => ({ text });

export const findColumn = (context: AutomationBuilderContext, column_id: unknown): AutomationColumn | undefined =>
  column_id == null || column_id === "" ? undefined : context.columns.find((column) => column.id === String(column_id));

export const columnLabel = (context: AutomationBuilderContext, column_id: unknown, fallback = "column"): string => {
  const column = findColumn(context, column_id);
  if (!column) return fallback;
  return column.scope === "subitem" ? `subitem ${column.title}` : column.title;
};

export const personLabel = (context: AutomationBuilderContext, user_id: unknown, fallback = "someone"): string =>
  user_id == null || user_id === "" ? fallback : context.people.find((person) => person.id === String(user_id))?.name ?? "a person";

export const groupLabel = (context: AutomationBuilderContext, group_id: unknown, fallback = "group"): string =>
  group_id == null || group_id === "" ? fallback : context.groups.find((group) => group.id === String(group_id))?.label ?? "a group";

export const optionLabel = (column: AutomationColumn | undefined, option_id: unknown): string =>
  column?.options?.find((option) => option.id === String(option_id))?.label || String(option_id ?? "");

/** A stored cell value as words: option labels, people names, Checked or the plain text. */
export function valueLabel(context: AutomationBuilderContext, column: AutomationColumn | undefined, value: unknown, fallback = "something"): string {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return fallback;
  if (!column) return String(value);

  switch (column.kind) {
    case "status":
    case "label":
    case "dropdown":
    case "tags":
      return (Array.isArray(value) ? value : [value]).map((id) => optionLabel(column, id)).join(", ");
    case "people":
    case "vote":
      return (Array.isArray(value) ? value : [value]).map((id) => personLabel(context, id)).join(", ");
    case "checkbox":
      return value === true || value === "true" || value === 1 || value === "1" || value === "checked" ? "checked" : "unchecked";
    default:
      return Array.isArray(value) ? value.join(", ") : String(value);
  }
}

/** `on the day`, `3 days before`, `1 day after`. */
export function offsetLabel(offset_days: number | null | undefined): string {
  const days = offset_days ?? 0;
  if (days === 0) return "arrives";
  const amount = `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`;
  return days < 0 ? `is ${amount} away` : `passed ${amount} ago`;
}

/** `today`, `today + 3 days`, `today - 1 day`. */
export function relativeDayLabel(offset_days: number | null | undefined): string {
  const days = offset_days ?? 0;
  if (days === 0) return "today";
  const amount = `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`;
  return days > 0 ? `today + ${amount}` : `today - ${amount}`;
}

export function scheduleLabel(schedule: BoardAutomationSchedule | null | undefined): string {
  if (!schedule?.frequency) return "time period";
  const time = schedule.time ? ` at ${schedule.time}` : "";
  if (schedule.frequency === "daily") return `day${time}`;
  if (schedule.frequency === "monthly") return `month on day ${schedule.day_of_month ?? 1}${time}`;
  const days = WEEKDAY_LABELS.filter((day) => (schedule.weekdays ?? []).includes(day.id)).map((day) => day.label);
  return `${days.length ? days.join(", ") : "week"}${time}`;
}

/** Who a notify or communication action reaches. */
export function recipientLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  if (params.notify_user_id) return personLabel(context, params.notify_user_id);
  if (params.notify_from_people_column_id) return `people in ${columnLabel(context, params.notify_from_people_column_id)}`;
  return "someone";
}

export function boardLabel(context: AutomationBuilderContext, board_id: unknown, fallback = "board"): string {
  if (board_id == null || board_id === "") return fallback;
  return context.board_targets.find((board) => board.id === Number(board_id))?.label ?? "another board";
}

export function boardGroupLabel(context: AutomationBuilderContext, board_id: unknown, group_id: unknown, fallback = "group"): string {
  if (group_id == null || group_id === "") return fallback;
  if (board_id == null || Number(board_id) === context.board_id) return groupLabel(context, group_id, fallback);
  return context.board_targets.find((board) => board.id === Number(board_id))?.groups.find((group) => group.id === Number(group_id))?.name ?? "a group";
}

/** The label of a condition's field, a column or one of the item details. */
export function conditionFieldLabel(context: AutomationBuilderContext, field_id: string): string {
  return VIRTUAL_CONDITION_FIELDS.find((field) => field.id === field_id)?.label ?? columnLabel(context, field_id);
}

export function conditionValueLabel(context: AutomationBuilderContext, condition: BoardAutomationCondition): string {
  const column = findColumn(context, condition.column_id);
  const kind = VIRTUAL_CONDITION_FIELDS.find((field) => field.id === condition.column_id)?.kind ?? (column ? CONDITION_KIND_BY_COLUMN[column.kind] : undefined);

  if (condition.condition === "between") return condition.values.filter(Boolean).join(" and ") || "a range";
  if (condition.values.length) {
    if (kind === "group") return condition.values.map((id) => groupLabel(context, id)).join(", ");
    if (kind === "people") return condition.values.map((id) => personLabel(context, id)).join(", ");
    return condition.values.map((id) => optionLabel(column, id)).join(", ");
  }
  if (kind === "date") return BOARD_FILTER_DATE_PRESETS.find((preset) => preset.id === condition.value)?.label.toLowerCase() ?? (condition.value || "a date");
  return condition.value || "value";
}

export function conditionOperatorLabel(context: AutomationBuilderContext, condition: BoardAutomationCondition): string {
  if (!condition.condition) return "is";
  const column = findColumn(context, condition.column_id);
  const kind = VIRTUAL_CONDITION_FIELDS.find((field) => field.id === condition.column_id)?.kind ?? (column ? CONDITION_KIND_BY_COLUMN[column.kind] : undefined) ?? "text";
  return getOperatorLabel(kind, condition.condition as BoardFilterOperator).toLowerCase();
}

// ── Sentences ─────────────────────────────────────────────────────────────────

function triggerParts(definition: BoardAutomationDefinition, context: AutomationBuilderContext): SentencePart[] {
  const column = findColumn(context, definition.trigger_column_id);
  const config = definition.trigger_config ?? {};

  switch (definition.trigger_type) {
    case "status_changed": {
      const parts = [plain("When "), token(columnLabel(context, definition.trigger_column_id, "status")), plain(" changes")];
      if (config.from_value) parts.push(plain(" from "), token(optionLabel(column, config.from_value)));
      parts.push(plain(" to "), token(definition.trigger_value == null ? "anything" : optionLabel(column, definition.trigger_value)));
      return parts;
    }
    case "column_changed":
      return definition.trigger_value == null
        ? [plain("When "), token(columnLabel(context, definition.trigger_column_id)), plain(" changes")]
        : [plain("When "), token(columnLabel(context, definition.trigger_column_id)), plain(" changes to "), token(valueLabel(context, column, definition.trigger_value))];
    case "person_assigned":
      return [plain("When "), token(definition.trigger_value == null ? "someone" : personLabel(context, definition.trigger_value)), plain(" is assigned in "), token(columnLabel(context, definition.trigger_column_id, "people"))];
    case "date_arrived": {
      const parts = [plain("When "), token(columnLabel(context, definition.trigger_column_id, "date")), plain(" "), token(offsetLabel(config.offset_days))];
      if (config.time) parts.push(plain(" at "), token(config.time));
      return parts;
    }
    case "item_created":
      return [plain("When an "), token("item is created")];
    case "subitem_created":
      return [plain("When a "), token("subitem is created")];
    case "update_posted":
      return [plain("When an "), token("update is posted")];
    case "item_moved_to_group":
      return [plain("When an item is moved to "), token(config.group_id ? groupLabel(context, config.group_id) : "any group")];
    case "item_archived":
      return [plain("When an item is "), token("archived")];
    case "item_deleted":
      return [plain("When an item is "), token("deleted")];
    case "recurring":
      return [plain("Every "), token(scheduleLabel(config.schedule))];
    default:
      return [plain("When something happens")];
  }
}

export function actionParts(action: BoardAutomationAction, context: AutomationBuilderContext): SentencePart[] {
  const params = action.params;
  const column = findColumn(context, params.target_column_id);

  switch (action.type) {
    case "move_to_group":
      return [token("move item"), plain(" to "), token(groupLabel(context, params.target_group_id))];
    case "move_to_board":
      return [token("move item"), plain(" to "), token(boardLabel(context, params.target_board_id)), plain(" in "), token(boardGroupLabel(context, params.target_board_id, params.target_group_id))];
    case "create_item": {
      const parts = [token("create an item"), plain(" in "), token(boardGroupLabel(context, params.target_board_id, params.target_group_id))];
      if (params.target_board_id && Number(params.target_board_id) !== context.board_id) parts.push(plain(" on "), token(boardLabel(context, params.target_board_id)));
      return parts;
    }
    case "create_subitem": {
      const names = (params.subitem_names ?? []).filter((name) => name.trim());
      return [token("create subitems"), plain(" "), token(names.length ? names.join(", ") : "names")];
    }
    case "duplicate_item":
      return [token("duplicate item"), plain(params.with_subitems === false ? "" : " with its subitems")];
    case "archive_item":
      return [token("archive item")];
    case "delete_item":
      return [token("delete item")];
    case "set_column_value":
      return [plain("set "), token(columnLabel(context, params.target_column_id)), plain(" to "), token(valueLabel(context, column, params.value))];
    case "clear_column":
      return [token("clear"), plain(" "), token(columnLabel(context, params.target_column_id))];
    case "assign_person": {
      const who = params.assign_mode === "creator" ? "item creator" : params.assign_mode === "actor" ? "person who made the change" : personLabel(context, params.user_id);
      return [token("assign"), plain(" "), token(who), plain(" in "), token(columnLabel(context, params.target_column_id, "people"))];
    }
    case "unassign_people":
      return [token("remove"), plain(" "), token(params.user_id ? personLabel(context, params.user_id) : "everyone"), plain(" from "), token(columnLabel(context, params.target_column_id, "people"))];
    case "set_date":
      return [plain("set "), token(columnLabel(context, params.target_column_id, "date")), plain(" to "), token(relativeDayLabel(params.offset_days))];
    case "adjust_number": {
      const amount = params.amount ?? 0;
      return [token(amount < 0 ? "decrease" : "increase"), plain(" "), token(columnLabel(context, params.target_column_id, "number")), plain(" by "), token(String(Math.abs(amount)))];
    }
    case "notify_person":
      return [token("notify"), plain(" "), token(recipientLabel(context, params))];
    case "post_update":
      return [token("create an update")];
    case "send_email":
      return [plain("send an "), token("email"), plain(" to "), token(recipientLabel(context, params))];
    case "slack_notify_person":
      return [plain("send a "), token("Slack message"), plain(" to "), token(recipientLabel(context, params))];
    case "slack_notify_channel":
      return [plain("post to Slack channel "), token(`#${params.slack_channel_name || params.slack_channel_id || "channel"}`)];
    default:
      return [plain("do something")];
  }
}

function joinActions(actions: SentencePart[][]): SentencePart[] {
  return actions.flatMap((parts, index) => {
    if (index === 0) return parts;
    return [plain(index === actions.length - 1 ? " and " : ", "), ...parts];
  });
}

/** The whole automation as one sentence, tokens marked so the list can bold them. */
export function describeDefinition(definition: BoardAutomationDefinition, context: AutomationBuilderContext): SentencePart[] {
  const parts = [...triggerParts(definition, context)];

  definition.conditions.forEach((condition, index) => {
    parts.push(
      plain(index === 0 ? " and only if " : " and "),
      token(conditionFieldLabel(context, condition.column_id)),
      plain(` ${conditionOperatorLabel(context, condition)} `),
      ...(condition.condition === "is_empty" || condition.condition === "is_not_empty" || condition.condition === "is_checked" || condition.condition === "is_unchecked"
        ? []
        : [token(conditionValueLabel(context, condition))])
    );
  });

  parts.push(plain(", "), ...joinActions(definition.actions.map((action) => actionParts(action, context))));
  return parts;
}

export const sentenceText = (parts: SentencePart[]): string => parts.map((part) => part.text).join("").replace(/\s+/g, " ").trim();
