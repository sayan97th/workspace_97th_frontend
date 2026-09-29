import type {
  BoardAutomationAction,
  BoardAutomationActionParams,
  BoardAutomationChangeMatch,
  BoardAutomationCondition,
  BoardAutomationDefinition,
  BoardAutomationDynamicValue,
  BoardAutomationSchedule,
  BoardAutomationTriggerConfig,
} from "@/types/board-automation";
import { BOARD_FILTER_DATE_PRESETS } from "../../toolbar/filterEngine";
import {
  AUTOMATION_VALUELESS_OPERATORS,
  CONDITION_KIND_BY_COLUMN,
  COUNT_OPERATORS,
  DYNAMIC_SOURCE_LABELS,
  RECIPIENT_SOURCE_LABELS,
  VIRTUAL_CONDITION_FIELDS,
  WEEKDAY_LABELS,
  conditionOperatorText,
  type AutomationBuilderContext,
  type AutomationColumn,
  type AutomationConditionKind,
} from "./automationCatalog";

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
    case "timeline": {
      const range = value as { start?: string; end?: string };
      return range.start && range.end ? `${range.start} to ${range.end}` : fallback;
    }
    case "link": {
      const link = value as { url?: string; text?: string };
      return typeof value === "string" ? value : link.text || link.url || fallback;
    }
    case "checklist":
      return Array.isArray(value) ? `${value.length} ${value.length === 1 ? "task" : "tasks"}` : fallback;
    case "rating":
      return `${value} ${Number(value) === 1 ? "star" : "stars"}`;
    case "progress":
      return `${value}%`;
    default:
      return Array.isArray(value) ? value.join(", ") : String(value);
  }
}

/** `arrives`, `is 3 days away`, `passed 1 working day ago`. */
export function offsetLabel(offset_days: number | null | undefined, working_days = false): string {
  const days = offset_days ?? 0;
  if (days === 0) return working_days ? "arrives (working days)" : "arrives";
  const noun = working_days ? "working day" : "day";
  const amount = `${Math.abs(days)} ${Math.abs(days) === 1 ? noun : `${noun}s`}`;
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

/** `today + 3 working days`, `the item creator`, `the value of Due date - 2 days`: a dynamic value in words. */
export function dynamicLabel(context: AutomationBuilderContext, dynamic: BoardAutomationDynamicValue | null | undefined): string {
  if (!dynamic?.source) return "a dynamic value";
  const offset = dynamic.offset_days ?? 0;
  const noun = dynamic.use_working_days ? "working day" : "day";
  const shift = offset === 0 ? "" : ` ${offset > 0 ? "+" : "-"} ${Math.abs(offset)} ${Math.abs(offset) === 1 ? noun : `${noun}s`}`;
  if (dynamic.source === "today") return `today${shift}`;
  if (dynamic.source === "column") return dynamic.column_id ? `the ${columnLabel(context, dynamic.column_id)}${shift}` : "the value of a column";
  return DYNAMIC_SOURCE_LABELS[dynamic.source];
}

/** Who a notify or communication action reaches, email addresses included for "send an email". */
export function recipientLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  const parts: string[] = [];
  if (params.notify_user_id) parts.push(personLabel(context, params.notify_user_id));
  else if (params.recipient_source) parts.push(RECIPIENT_SOURCE_LABELS[params.recipient_source].toLowerCase());
  else if (params.notify_from_people_column_id) parts.push(`people in ${columnLabel(context, params.notify_from_people_column_id)}`);
  if (params.email_column_id) parts.push(`the address in ${columnLabel(context, params.email_column_id)}`);
  const addresses = params.email_addresses ?? [];
  if (addresses.length === 1) parts.push(addresses[0]);
  else if (addresses.length > 1) parts.push(`${addresses.length} addresses`);
  return parts.length ? parts.join(" and ") : "someone";
}

/** `above 100`, `below 2.5 hours`, `equal to 3`. */
export function thresholdLabel(config: BoardAutomationTriggerConfig, column: AutomationColumn | undefined): string {
  if (typeof config.threshold !== "number") return "a number";
  const unit = column?.kind === "time_tracking" ? ` ${config.threshold === 1 ? "hour" : "hours"}` : column?.kind === "progress" ? "%" : "";
  const operator = config.operator === "below" ? "below" : config.operator === "equals" ? "equal to" : "above";
  return `${operator} ${config.threshold}${unit}`;
}

/** `2 hours`, `1 day`, `30 minutes`. */
export function waitLabel(params: BoardAutomationActionParams): string {
  const amount = params.amount ?? 1;
  const unit = params.unit === "minutes" || params.unit === "hours" ? params.unit : "days";
  return `${amount} ${amount === 1 ? unit.slice(0, -1) : unit}`;
}

/** `Ada and Grace in turn`, `3 people in turn`. */
export function rotationLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  const ids = params.user_ids ?? [];
  if (ids.length === 0) return "people";
  const names = ids.map((id) => personLabel(context, id));
  return names.length <= 2 ? names.join(" and ") : `${names.length} people`;
}

/** A message template as the editor shows it: `{column:12}` becomes `{#Status}`. */
export function columnTokensToDisplay(template: string, context: AutomationBuilderContext): string {
  return template.replace(/\{column:(\d+)\}/g, (match, id: string) => {
    const column = findColumn(context, id);
    return column ? `{#${column.title}}` : match;
  });
}

/** Back from what the editor shows to what is saved: `{#Status}` becomes `{column:12}`, matched by title without case. */
export function columnTokensFromDisplay(template: string, context: AutomationBuilderContext): string {
  return template.replace(/\{#([^{}]+)\}/g, (match, title: string) => {
    const column = context.columns.find((entry) => entry.title.trim().toLowerCase() === title.trim().toLowerCase());
    return column ? `{column:${column.id}}` : match;
  });
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

/** The family a condition's field is read as, undefined once the column was deleted. */
function kindOf(context: AutomationBuilderContext, field_id: string): AutomationConditionKind | undefined {
  const column = findColumn(context, field_id);
  return VIRTUAL_CONDITION_FIELDS.find((field) => field.id === field_id)?.kind ?? (column ? CONDITION_KIND_BY_COLUMN[column.kind] : undefined);
}

/** `5 days`, `60%`, `3 votes`: the number a counting operator compares with, with its unit. */
function countLabel(operator: string, value: string): string {
  if (value === "") return "a number";
  const is_one = value === "1";
  if (operator.startsWith("duration_")) return `${value} ${is_one ? "day" : "days"}`;
  if (operator.startsWith("progress_")) return `${value}%`;
  if (operator.startsWith("votes_")) return `${value} ${is_one ? "vote" : "votes"}`;
  return `${value} ${is_one ? "task" : "tasks"}`;
}

export function conditionValueLabel(context: AutomationBuilderContext, condition: BoardAutomationCondition): string {
  const column = findColumn(context, condition.column_id);
  const kind = kindOf(context, condition.column_id);

  if (condition.dynamic?.source) return dynamicLabel(context, condition.dynamic);
  if (COUNT_OPERATORS.includes(condition.condition)) return countLabel(condition.condition, condition.value);
  if (kind === "vote" && condition.values.length) return condition.values.map((id) => personLabel(context, id)).join(", ");
  if (kind === "rating" && condition.condition !== "between") return condition.value ? `${condition.value} ${condition.value === "1" ? "star" : "stars"}` : "stars";
  if (kind === "progress" && condition.condition !== "between") return condition.value ? `${condition.value}%` : "a percent";
  if (kind === "dependency") {
    const status = findColumn(context, condition.value);
    const labels = condition.values.map((id) => optionLabel(status, id)).join(", ");
    return labels ? `${labels} in ${status?.title ?? "status"}` : "done labels";
  }
  if (kind === "timer") return condition.value ? `${condition.value} ${condition.value === "1" ? "hour" : "hours"}` : "hours";
  if (condition.condition === "between") return condition.values.filter(Boolean).join(" and ") || "a range";
  if (condition.values.length) {
    if (kind === "group") return condition.values.map((id) => groupLabel(context, id)).join(", ");
    if (kind === "people") return condition.values.map((id) => personLabel(context, id)).join(", ");
    return condition.values.map((id) => optionLabel(column, id)).join(", ");
  }
  if (kind === "date" || kind === "timeline") return BOARD_FILTER_DATE_PRESETS.find((preset) => preset.id === condition.value)?.label.toLowerCase() ?? (condition.value || "a date");
  return condition.value || "value";
}

export function conditionOperatorLabel(context: AutomationBuilderContext, condition: BoardAutomationCondition): string {
  if (!condition.condition) return "is";
  return conditionOperatorText(kindOf(context, condition.column_id) ?? "text", condition.condition);
}

// ── Sentences ─────────────────────────────────────────────────────────────────

/** `anyone`, `Ada`: who a mention or reply trigger waits for. */
const anyonePersonLabel = (context: AutomationBuilderContext, user_id: unknown): string => (user_id == null ? "someone" : personLabel(context, user_id));

/** `"urgent", "blocked"`: the words an update keyword trigger waits for. */
export function keywordsLabel(keywords: string[] | null | undefined): string {
  const words = (keywords ?? []).map((keyword) => keyword.trim()).filter(Boolean);
  if (words.length === 0) return "a keyword";
  const shown = words.slice(0, 3).map((word) => `"${word}"`).join(" or ");
  return words.length > 3 ? `${shown} or ${words.length - 3} more` : shown;
}

export function triggerParts(definition: BoardAutomationDefinition, context: AutomationBuilderContext): SentencePart[] {
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
      if (config.match?.operator) return [plain("When "), token(columnLabel(context, definition.trigger_column_id)), plain(" changes to "), token(changeMatchLabel(context, column, config.match))];
      return definition.trigger_value == null
        ? [plain("When "), token(columnLabel(context, definition.trigger_column_id)), plain(" changes")]
        : [plain("When "), token(columnLabel(context, definition.trigger_column_id)), plain(" changes to "), token(valueLabel(context, column, definition.trigger_value))];
    case "person_assigned":
      return [plain("When "), token(definition.trigger_value == null ? "someone" : personLabel(context, definition.trigger_value)), plain(" is assigned in "), token(columnLabel(context, definition.trigger_column_id, "people"))];
    case "date_arrived": {
      const parts = [plain("When "), token(columnLabel(context, definition.trigger_column_id, "date")), plain(" "), token(offsetLabel(config.offset_days, config.working_days_only))];
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
    case "item_scan":
      return [plain("Every "), token(scheduleLabel(config.schedule)), plain(", for each "), token("matching item")];
    case "all_subitems_status":
      return [plain("When all subitems have "), token(columnLabel(context, definition.trigger_column_id, "status")), plain(" "), token(definition.trigger_value == null ? "something" : optionLabel(column, definition.trigger_value))];
    case "all_group_items_status":
      return [
        plain("When all items in "),
        token(config.group_id ? groupLabel(context, config.group_id) : "a group"),
        plain(" have "),
        token(columnLabel(context, definition.trigger_column_id, "status")),
        plain(" "),
        token(definition.trigger_value == null ? "something" : optionLabel(column, definition.trigger_value)),
      ];
    case "form_submitted":
      return [plain("When "), token(config.form_view_id ? formLabel(context, config.form_view_id) : "a form"), plain(" is submitted")];
    case "name_changed":
      return [plain("When an "), token("item name changes")];
    case "date_changed": {
      const part = column?.kind === "timeline" ? config.timeline_part ?? "any" : "any";
      return part === "any"
        ? [plain("When "), token(columnLabel(context, definition.trigger_column_id, "date")), plain(" changes")]
        : [plain("When the "), token(part === "start" ? "start" : "end"), plain(" of "), token(columnLabel(context, definition.trigger_column_id, "timeline")), plain(" changes")];
    }
    case "status_stuck":
      return [
        plain("When "),
        token(columnLabel(context, definition.trigger_column_id, "status")),
        plain(" stays "),
        token(definition.trigger_value == null || definition.trigger_value === "" ? "on any label" : optionLabel(column, definition.trigger_value)),
        plain(" for "),
        token(quietPeriodLabel(config)),
      ];
    case "item_stale":
      return [
        plain("When an item"),
        ...(config.group_id ? [plain(" in "), token(groupLabel(context, config.group_id))] : []),
        plain(" has no change or update for "),
        token(quietPeriodLabel(config)),
      ];
    case "webhook_received":
      return [plain("When a "), token("webhook"), plain(" is received")];
    case "button_clicked":
      return [plain("When "), token(columnLabel(context, definition.trigger_column_id, "button")), plain(" is clicked")];
    case "number_threshold":
      return [plain("When "), token(columnLabel(context, definition.trigger_column_id, "number")), plain(" goes "), token(thresholdLabel(config, column))];
    case "checklist_completed":
      return [plain("When every task of "), token(columnLabel(context, definition.trigger_column_id, "checklist")), plain(" is done")];
    case "checklist_item_checked":
      return [plain("When "), token(typeof definition.trigger_value === "string" && definition.trigger_value ? `"${definition.trigger_value}"` : "a task"), plain(" is checked in "), token(columnLabel(context, definition.trigger_column_id, "checklist"))];
    case "item_moved_to_board":
      return [plain("When an item is moved here from "), token(config.from_board_id ? boardLabel(context, config.from_board_id) : "any board")];
    case "item_restored":
      return [plain("When an item is "), token("restored")];
    case "person_unassigned":
      return [plain("When "), token(definition.trigger_value == null ? "someone" : personLabel(context, definition.trigger_value)), plain(" is removed from "), token(columnLabel(context, definition.trigger_column_id, "people"))];
    case "file_uploaded":
      return [plain("When "), token(extensionsLabel(config.extensions)), plain(" is added to "), token(columnLabel(context, definition.trigger_column_id, "files"))];
    case "item_overdue": {
      const parts = [plain("When "), token(columnLabel(context, definition.trigger_column_id, "date")), plain(" has passed and "), token(doneLabel(context, config))];
      if (config.time) parts.push(plain(" at "), token(config.time));
      return parts;
    }
    case "subitem_column_changed":
      return [
        plain("When "),
        token(columnLabel(context, definition.trigger_column_id, "subitem column")),
        plain(" changes to "),
        token(changeMatchLabel(context, column, config.match)),
        plain(", on "),
        token(config.run_on === "subitem" ? "the subitem" : "the parent item"),
      ];
    case "user_mentioned":
      return [plain("When "), token(anyonePersonLabel(context, definition.trigger_value)), plain(" is "), token("mentioned in an update")];
    case "update_replied":
      return [plain("When "), token(anyonePersonLabel(context, definition.trigger_value)), plain(" "), token("replies to an update")];
    case "update_keyword":
      return [plain(config.include_replies ? "When an update or reply contains " : "When an update contains "), token(keywordsLabel(config.keywords))];
    default:
      return [plain("When something happens")];
  }
}

/** `3 days`, `12 hours`: how long a stuck or not updated trigger waits. */
export function quietPeriodLabel(config: BoardAutomationTriggerConfig): string {
  const amount = config.amount ?? 0;
  if (amount < 1) return "a while";
  const unit = config.unit === "hours" ? "hour" : "day";
  return `${amount} ${amount === 1 ? unit : `${unit}s`}`;
}

/** What a "sort a group" action sorts by: a column's title, the item name or the creation date. */
export function sortByLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  if (params.sort_by === "created_at") return "creation date";
  if (params.sort_by === "column") return columnLabel(context, params.sort_column_id);
  return "item name";
}

/** The kind of order a sort gives, worded for what it sorts: `A to Z`, `highest first`, `newest first`. */
export function sortDirectionOptions(context: AutomationBuilderContext, params: BoardAutomationActionParams): { asc: string; desc: string } {
  const kind = params.sort_by === "column" ? findColumn(context, params.sort_column_id)?.kind : params.sort_by === "created_at" ? "date" : "text";
  switch (kind) {
    case "status":
    case "label":
      return { asc: "in label order", desc: "in reverse label order" };
    case "number":
    case "rating":
    case "progress":
    case "auto_number":
    case "vote":
    case "files":
    case "checklist":
    case "time_tracking":
    case "formula":
    case "connect_board":
    case "dependency":
      return { asc: "lowest first", desc: "highest first" };
    case "date":
    case "timeline":
      return { asc: "earliest first", desc: "latest first" };
    case "checkbox":
      return { asc: "unchecked first", desc: "checked first" };
    default:
      return { asc: "A to Z", desc: "Z to A" };
  }
}

export function sortDirectionLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  const options = sortDirectionOptions(context, params);
  return params.direction === "desc" ? options.desc : options.asc;
}

/** A form view of this board by id. */
export function formLabel(context: AutomationBuilderContext, form_view_id: unknown, fallback = "a form"): string {
  if (form_view_id == null || form_view_id === "") return fallback;
  return context.forms?.find((form) => form.id === String(form_view_id))?.label ?? "a form";
}

export function teamLabel(context: AutomationBuilderContext, team_id: unknown, fallback = "team"): string {
  if (team_id == null || team_id === "") return fallback;
  return context.teams?.find((team) => team.id === Number(team_id))?.name ?? "a team";
}

/** `3 days`, `1 week`, `-2 months`. */
export function amountLabel(amount: number | null | undefined, unit: "minutes" | "hours" | "days" | "weeks" | "months" = "days"): string {
  const value = Math.abs(amount ?? 0);
  const singular = unit.slice(0, -1);
  return `${value} ${value === 1 ? singular : unit}`;
}

/** The host a webhook action sends to, the whole URL stays in the editor. */
export function urlHost(url: string | null | undefined, fallback = "URL"): string {
  if (!url) return fallback;
  try {
    return new URL(url).host || fallback;
  } catch {
    return url.length > 28 ? `${url.slice(0, 27)}...` : url;
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
      if (params.link_column_id) parts.push(plain(" and connect it in "), token(columnLabel(context, params.link_column_id)));
      return parts;
    }
    case "create_subitem": {
      const names = (params.subitem_names ?? []).filter((name) => name.trim());
      if (!names.length && params.source_column_id) return [token("create subitems"), plain(" one per entry of "), token(columnLabel(context, params.source_column_id))];
      const parts = [token("create subitems"), plain(" "), token(names.length ? columnTokensToDisplay(names.join(", "), context) : "names")];
      if (params.source_column_id) parts.push(plain(" and one per entry of "), token(columnLabel(context, params.source_column_id)));
      return parts;
    }
    case "duplicate_item":
      return [token("duplicate item"), plain(params.with_subitems === false ? "" : " with its subitems")];
    case "archive_item":
      return [token("archive item")];
    case "delete_item":
      return [token("delete item")];
    case "set_column_value":
      return [plain("set "), token(columnLabel(context, params.target_column_id)), plain(" to "), token(params.dynamic_value ? dynamicLabel(context, params.dynamic_value) : valueLabel(context, column, params.value))];
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
    case "shift_date":
      return [token((params.amount ?? 0) < 0 ? "pull" : "push"), plain(" "), token(columnLabel(context, params.target_column_id, "date")), plain(" by "), token(amountLabel(params.amount, params.unit ?? "days"))];
    case "set_date_from_column": {
      const parts = [plain("set "), token(columnLabel(context, params.target_column_id, "date")), plain(" to "), token(columnLabel(context, params.source_column_id, "another date"))];
      if (params.offset_days) parts.push(plain(` ${params.offset_days > 0 ? "+" : "-"} `), token(amountLabel(params.offset_days)));
      if (params.number_column_id) parts.push(plain(params.number_sign === -1 ? " minus the days in " : " plus the days in "), token(columnLabel(context, params.number_column_id, "number")));
      return parts;
    }
    case "ensure_date_after":
      return [plain("keep "), token(columnLabel(context, params.target_column_id, "this date")), plain(" after "), token(columnLabel(context, params.source_column_id, "that date"))];
    case "set_timeline":
      return [plain("set "), token(columnLabel(context, params.target_column_id, "timeline")), plain(" to "), token(`${relativeDayLabel(params.start_offset_days)} for ${amountLabel(params.duration_days ?? 7)}`)];
    case "create_group":
      return [token("create a group"), plain(" named "), token(params.group_name || "group")];
    case "duplicate_group":
      return [token("duplicate"), plain(" "), token(params.from_item_group ? "the item's group" : groupLabel(context, params.source_group_id)), plain(params.with_items ? " with its items" : "")];
    case "archive_group":
      return [token("archive"), plain(" "), token(params.from_item_group ? "the item's group" : groupLabel(context, params.target_group_id))];
    case "copy_column_value":
      return [token("copy"), plain(" "), token(columnLabel(context, params.source_column_id)), plain(" to "), token(columnLabel(context, params.target_column_id))];
    case "time_tracking":
      return [token(params.mode === "stop" ? "stop" : "start"), plain(" "), token(columnLabel(context, params.target_column_id, "time tracking"))];
    case "connect_items":
      return [token("connect"), plain(" the item in "), token(columnLabel(context, params.target_column_id, "connect boards")), plain(" by matching "), token(params.match_column_id && params.match_column_id !== "name" ? columnLabel(context, params.match_column_id) : "name")];
    case "notify_team":
      return [token("notify"), plain(" the team "), token(teamLabel(context, params.team_id))];
    case "send_webhook":
      return [plain("send a "), token("webhook"), plain(" to "), token(urlHost(params.url))];
    case "wait":
      return [token("wait"), plain(" "), token(waitLabel(params))];
    case "shift_dependents":
      return [token("shift"), plain(" "), token(columnLabel(context, params.target_column_id, "dates")), plain(" of the items that depend on it")];
    case "assign_round_robin":
      return [token("assign"), plain(" "), token(rotationLabel(context, params)), plain(params.strategy === "least_busy" ? " by workload in " : " in turn in "), token(columnLabel(context, params.target_column_id, "people"))];
    case "set_subitems_value":
      return [plain("set "), token(columnLabel(context, params.target_column_id, "column")), plain(" of every subitem to "), token(valueLabel(context, column, params.value))];
    case "set_parent_value":
      return [plain("set the parent's "), token(columnLabel(context, params.target_column_id, "column")), plain(" to "), token(valueLabel(context, column, params.value))];
    case "add_checklist_items":
      return [token("add"), plain(" "), token(`${(params.tasks ?? []).length || "some"} ${(params.tasks ?? []).length === 1 ? "task" : "tasks"}`), plain(" to "), token(columnLabel(context, params.target_column_id, "checklist"))];
    case "rename_item":
      return [token("rename item"), plain(" to "), token(`"${columnTokensToDisplay(params.name_template ?? "", context) || "a new name"}"`)];
    case "change_values": {
      const people = column && ["people", "vote"].includes(column.kind);
      const names = (params.values ?? []).map((id) => (id === "__actor__" ? "the person who made the change" : id === "__creator__" ? "the item creator" : people ? personLabel(context, id) : optionLabel(column, id))).join(", ");
      return [token(params.mode === "remove" ? "remove" : "add"), plain(" "), token(names || "values"), plain(params.mode === "remove" ? " from " : " to "), token(columnLabel(context, params.target_column_id))];
    }
    case "update_connected_items":
      return [token("change"), plain(" the items connected in "), token(columnLabel(context, params.connect_column_id, "connect boards"))];
    case "group_items":
      return [token(groupOperationLabel(context, params)), plain(" every item of "), token(params.from_item_group ? "the item's group" : groupLabel(context, params.target_group_id))];
    case "subscribe_people":
      return [token("subscribe"), plain(" "), token(peopleSelectionLabel(context, params)), plain(" to the item")];
    case "unsubscribe_people":
      return [token("unsubscribe"), plain(" "), token(params.everyone ? "everyone" : peopleSelectionLabel(context, params)), plain(" from the item")];
    case "notify_subscribers":
      return [token("notify"), plain(" the item's "), token("subscribers")];
    case "clear_subitems":
      return [token(params.operation === "delete" ? "delete" : "archive"), plain(" every "), token("subitem")];
    case "convert_subitem":
      return [token("turn the subitem into an item"), plain(" of "), token(params.target_group_id ? groupLabel(context, params.target_group_id) : "its parent's group")];
    case "send_digest":
      return [plain("email a "), token("digest"), plain(" of "), token(digestFilterLabel(context, params)), plain(" to "), token(peopleSelectionLabel(context, params))];
    case "move_item_position":
      return [token("move item"), plain(" to the "), token(params.position === "bottom" ? "bottom" : "top"), plain(" of its group")];
    case "sort_group":
      return [
        token("sort"),
        plain(" "),
        token(params.from_item_group ? "the item's group" : groupLabel(context, params.target_group_id)),
        plain(" by "),
        token(sortByLabel(context, params)),
        plain(", "),
        token(sortDirectionLabel(context, params)),
      ];
    default:
      return [plain("do something")];
  }
}

/** `Ada and Grace`, `people in Owner`, `the team Design`, `the item creator`: who a subscribe, unsubscribe or digest action names. */
export function peopleSelectionLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  const parts: string[] = [];
  const ids = params.user_ids ?? [];
  if (ids.length === 1) parts.push(personLabel(context, ids[0]));
  else if (ids.length === 2) parts.push(`${personLabel(context, ids[0])} and ${personLabel(context, ids[1])}`);
  else if (ids.length > 2) parts.push(`${ids.length} people`);
  if (params.notify_from_people_column_id) parts.push(`people in ${columnLabel(context, params.notify_from_people_column_id)}`);
  if (params.team_id) parts.push(`the team ${teamLabel(context, params.team_id)}`);
  if (params.recipient_source) parts.push(RECIPIENT_SOURCE_LABELS[params.recipient_source].toLowerCase());
  return parts.length ? parts.join(" and ") : "people";
}

/** `every item`, `items where Status is Done`, `3 filtered items of Backlog`: which items a digest lists. */
export function digestFilterLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  const rules = params.digest_rules ?? [];
  const where = params.target_group_id ? ` of ${groupLabel(context, params.target_group_id)}` : "";
  if (rules.length === 0) return `every item${where}`;
  if (rules.length === 1) return `items${where} where ${sentenceText(conditionParts(rules[0], context))}`;
  return `items${where} matching ${rules.length} rules`;
}

function joinActions(actions: SentencePart[][]): SentencePart[] {
  return actions.flatMap((parts, index) => {
    if (index === 0) return parts;
    return [plain(index === actions.length - 1 ? " and " : ", "), ...parts];
  });
}

export function conditionParts(condition: BoardAutomationCondition, context: AutomationBuilderContext): SentencePart[] {
  const kind = kindOf(context, condition.column_id);
  const parts = [token(conditionFieldLabel(context, condition.column_id)), plain(` ${conditionOperatorLabel(context, condition)}`)];
  if (kind === "subitems") {
    return condition.subitem_rule?.column_id ? [...parts, plain(", where "), ...conditionParts(condition.subitem_rule, context)] : parts;
  }
  return AUTOMATION_VALUELESS_OPERATORS.includes(condition.condition) ? parts : [...parts, plain(" "), token(conditionValueLabel(context, condition))];
}

/** `contains "urgent"`, `between 10 and 20`, `is added: Urgent`: what a "column changes" trigger waits for. */
export function changeMatchLabel(context: AutomationBuilderContext, column: AutomationColumn | undefined, match: BoardAutomationChangeMatch | null | undefined): string {
  if (!match?.operator) return "anything";
  const values = (match.values ?? []).filter(Boolean);
  const names = column && ["people", "vote"].includes(column.kind) ? values.map((id) => personLabel(context, id)).join(", ") : values.map((id) => optionLabel(column, id)).join(", ");
  switch (match.operator) {
    case "is_empty":
      return "empty";
    case "is_not_empty":
      return "any value";
    case "is_checked":
      return "checked";
    case "is_unchecked":
      return "unchecked";
    case "between":
      return `between ${values.join(" and ")}`;
    case "added":
      return names ? `get ${names} added` : "get something added";
    case "removed":
      return names ? `lose ${names}` : "lose something";
    case "holds":
      return names ? `hold ${names}` : "hold anything";
    case "is":
      return column && ["status", "label"].includes(column.kind) ? names || "something" : `"${match.value ?? ""}"`;
    case "is_not":
      return `anything but ${column && ["status", "label"].includes(column.kind) ? names : `"${match.value ?? ""}"`}`;
    case "greater_than":
      return `more than ${match.value ?? ""}`;
    case "less_than":
      return `less than ${match.value ?? ""}`;
    case "equals":
      return match.value ?? "";
    case "before":
    case "after":
      return `${match.operator} ${match.value ?? ""}`;
    default:
      return `${match.operator.replace("_", " ")} "${match.value ?? ""}"`;
  }
}

/** `pdf, png` or `any file`. */
export const extensionsLabel = (extensions: string[] | null | undefined): string => (extensions?.length ? extensions.map((extension) => `.${extension}`).join(", ") : "any file");

/** The labels an overdue trigger treats as done, `Done in Status`. */
export function doneLabel(context: AutomationBuilderContext, config: BoardAutomationTriggerConfig): string {
  const status = findColumn(context, config.status_column_id);
  const labels = (config.done_values ?? []).map((id) => optionLabel(status, id)).join(", ");
  return status && labels ? `${status.title} is not ${labels}` : "it is not done";
}

/** What a group wide action does, `archive every item`, `set Status to Done on every item`. */
export function groupOperationLabel(context: AutomationBuilderContext, params: BoardAutomationActionParams): string {
  const column = findColumn(context, params.target_column_id);
  switch (params.operation) {
    case "set_column_value":
      return `set ${columnLabel(context, params.target_column_id)} to ${valueLabel(context, column, params.value)} on`;
    case "clear_column":
      return `clear ${columnLabel(context, params.target_column_id)} on`;
    case "move_to_group":
      return `move to ${groupLabel(context, params.destination_group_id)}`;
    case "archive":
      return "archive";
    default:
      return "change";
  }
}

/** The whole automation as one sentence, tokens marked so the list can bold them. */
export function describeDefinition(definition: BoardAutomationDefinition, context: AutomationBuilderContext): SentencePart[] {
  const parts = [...triggerParts(definition, context)];
  const joiner = definition.condition_operator === "or" ? " or " : " and ";

  const clauses: SentencePart[][] = [
    ...definition.conditions.map((condition) => conditionParts(condition, context)),
    ...(definition.condition_groups ?? []).filter((group) => group.rules.length > 0).map((group) => [
      plain("("),
      ...group.rules.flatMap((rule, index) => [...(index > 0 ? [plain(group.join_operator === "or" ? " or " : " and ")] : []), ...conditionParts(rule, context)]),
      plain(")"),
    ]),
  ];
  clauses.forEach((clause, index) => parts.push(plain(index === 0 ? " and only if " : joiner), ...clause));

  parts.push(plain(", "), ...joinActions(definition.actions.map((action) => actionParts(action, context))));
  if (definition.else_actions?.length) {
    parts.push(plain(", otherwise "), ...joinActions(definition.else_actions.map((action) => actionParts(action, context))));
  }
  return parts;
}

export const sentenceText = (parts: SentencePart[]): string => parts.map((part) => part.text).join("").replace(/\s+/g, " ").trim();
