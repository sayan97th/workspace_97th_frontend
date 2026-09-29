import type { BoardAutomationActionType, BoardAutomationTriggerType } from "@/types/board-automation";
import type { BoardFilterFieldKind } from "../../toolbar/types";
import type { ColumnDef, ColumnKind, PersonDef } from "../../table/types";

/**
 * The vocabulary of the sentence builder: which triggers and actions exist, how the pickers
 * group them, and which column kinds each one works with. Mirrors the Laravel `BoardAutomation`
 * constants. No AI anywhere, every entry is a fixed rule.
 */

/** A column the builder can offer, item or subitem scope. Subitem columns only feed subitem triggers and conditions. */
export type AutomationColumn = ColumnDef & { scope: "item" | "subitem" };

export type NamedOption = { id: string; label: string };

/** A board an automation can reach across boards, with its tables. */
export type AutomationBoardTarget = { id: number; label: string; groups: { id: number; name: string }[] };

/** Everything the builder reads to fill its pickers and describe an automation. */
export type AutomationBuilderContext = {
  board_id: number;
  columns: AutomationColumn[];
  groups: NamedOption[];
  people: PersonDef[];
  /** Other boards of the workspace the viewer can edit, loaded once a cross-board token opens. */
  board_targets: AutomationBoardTarget[];
  slack_channels: { id: string; name: string }[];
  is_slack_connected: boolean;
};

export type PickerSection<T extends string> = { title: string; entries: { id: T; label: string; hint?: string }[] };

// ── Triggers ──────────────────────────────────────────────────────────────────

export type TriggerDef = {
  type: BoardAutomationTriggerType;
  /** Picker label, lower case like monday's. */
  label: string;
  section: "Most used" | "Status and columns" | "Dates and time" | "Items and updates";
  /** Column kinds the trigger can watch, undefined when it watches no column. */
  column_kinds?: ColumnKind[];
};

export const TRIGGERS: TriggerDef[] = [
  { type: "status_changed", label: "status changes", section: "Most used", column_kinds: ["status", "label"] },
  { type: "item_created", label: "item is created", section: "Most used" },
  { type: "date_arrived", label: "date arrives", section: "Most used", column_kinds: ["date"] },
  { type: "column_changed", label: "column changes", section: "Most used", column_kinds: [
    "text", "longtext", "number", "status", "label", "date", "people", "dropdown", "tags", "checkbox", "rating", "progress", "email", "phone", "link", "timeline", "vote", "files", "checklist",
  ] },
  { type: "person_assigned", label: "person is assigned", section: "Status and columns", column_kinds: ["people"] },
  { type: "subitem_created", label: "subitem is created", section: "Items and updates" },
  { type: "item_moved_to_group", label: "item is moved to group", section: "Items and updates" },
  { type: "update_posted", label: "update is posted", section: "Items and updates" },
  { type: "item_archived", label: "item is archived", section: "Items and updates" },
  { type: "item_deleted", label: "item is deleted", section: "Items and updates" },
  { type: "recurring", label: "every time period", section: "Dates and time" },
];

export const TRIGGER_BY_TYPE = Object.fromEntries(TRIGGERS.map((trigger) => [trigger.type, trigger])) as Record<BoardAutomationTriggerType, TriggerDef>;

export function triggerSections(): PickerSection<BoardAutomationTriggerType>[] {
  const order: TriggerDef["section"][] = ["Most used", "Status and columns", "Dates and time", "Items and updates"];
  return order
    .map((title) => ({ title, entries: TRIGGERS.filter((trigger) => trigger.section === title).map((trigger) => ({ id: trigger.type, label: trigger.label })) }))
    .filter((section) => section.entries.length > 0);
}

/** Triggers whose item may be a subitem, so their column picker also offers subitem columns. */
export const SUBITEM_AWARE_TRIGGERS: BoardAutomationTriggerType[] = ["status_changed", "column_changed"];

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * A picker entry. Most map one to one to an action type, "change status" is `set_column_value`
 * aimed at a Status column, so it is kept apart only in the picker.
 */
export type ActionPickerId = BoardAutomationActionType | "change_status";

export type ActionDef = {
  id: ActionPickerId;
  type: BoardAutomationActionType;
  label: string;
  section: "Most used" | "Items" | "Columns" | "People" | "Notifications" | "Email and Slack" | "Other boards";
  /** The action works without a triggering item, so a recurring automation may start with it. */
  is_itemless?: boolean;
};

export const ACTIONS: ActionDef[] = [
  { id: "move_to_group", type: "move_to_group", label: "move item to group", section: "Most used" },
  { id: "notify_person", type: "notify_person", label: "notify", section: "Most used", is_itemless: true },
  { id: "change_status", type: "set_column_value", label: "change status", section: "Most used" },
  { id: "create_subitem", type: "create_subitem", label: "create subitem", section: "Most used" },
  { id: "set_date", type: "set_date", label: "set date", section: "Most used" },
  { id: "create_item", type: "create_item", label: "create item", section: "Items", is_itemless: true },
  { id: "duplicate_item", type: "duplicate_item", label: "duplicate item", section: "Items" },
  { id: "archive_item", type: "archive_item", label: "archive item", section: "Items" },
  { id: "delete_item", type: "delete_item", label: "delete item", section: "Items" },
  { id: "post_update", type: "post_update", label: "create an update", section: "Items" },
  { id: "set_column_value", type: "set_column_value", label: "change column value", section: "Columns" },
  { id: "clear_column", type: "clear_column", label: "clear column", section: "Columns" },
  { id: "adjust_number", type: "adjust_number", label: "increase or decrease number", section: "Columns" },
  { id: "assign_person", type: "assign_person", label: "assign person", section: "People" },
  { id: "unassign_people", type: "unassign_people", label: "clear assignees", section: "People" },
  { id: "send_email", type: "send_email", label: "send an email", section: "Email and Slack", is_itemless: true },
  { id: "slack_notify_person", type: "slack_notify_person", label: "send a Slack message", section: "Email and Slack", is_itemless: true },
  { id: "slack_notify_channel", type: "slack_notify_channel", label: "post to a Slack channel", section: "Email and Slack", is_itemless: true },
  { id: "move_to_board", type: "move_to_board", label: "move item to board", section: "Other boards" },
];

export const ITEMLESS_ACTION_TYPES = ACTIONS.filter((action) => action.is_itemless).map((action) => action.type);

export function actionSections(options: { only_itemless: boolean; is_slack_connected: boolean }): PickerSection<ActionPickerId>[] {
  const order: ActionDef["section"][] = ["Most used", "Items", "Columns", "People", "Notifications", "Email and Slack", "Other boards"];
  return order
    .map((title) => ({
      title,
      entries: ACTIONS.filter((action) => action.section === title)
        .filter((action) => !options.only_itemless || action.is_itemless)
        .filter((action) => options.is_slack_connected || (action.type !== "slack_notify_person" && action.type !== "slack_notify_channel"))
        .map((action) => ({ id: action.id, label: action.label })),
    }))
    .filter((section) => section.entries.length > 0);
}

/** Short action names for the Manage list, the run history and the usage chart. */
export const ACTION_LABELS: Record<BoardAutomationActionType, string> = {
  move_to_group: "Move item",
  move_to_board: "Move to board",
  notify_person: "Notify person",
  send_email: "Send email",
  slack_notify_channel: "Slack channel post",
  slack_notify_person: "Slack message",
  archive_item: "Archive item",
  delete_item: "Delete item",
  duplicate_item: "Duplicate item",
  set_column_value: "Change column",
  clear_column: "Clear column",
  assign_person: "Assign person",
  unassign_people: "Clear assignees",
  set_date: "Set date",
  adjust_number: "Change number",
  create_item: "Create item",
  create_subitem: "Create subitem",
  post_update: "Create update",
};

export const TRIGGER_LABELS: Record<BoardAutomationTriggerType, string> = {
  status_changed: "Status changes",
  date_arrived: "Date arrives",
  item_created: "Item created",
  subitem_created: "Subitem created",
  person_assigned: "Person assigned",
  column_changed: "Column changes",
  update_posted: "Update posted",
  item_moved_to_group: "Item moved",
  item_archived: "Item archived",
  item_deleted: "Item deleted",
  recurring: "Recurring",
};

// ── Column kinds ──────────────────────────────────────────────────────────────

/** Kinds whose value an action can write with a picker. */
export const SETTABLE_KINDS: ColumnKind[] = ["status", "label", "dropdown", "tags", "people", "date", "number", "rating", "progress", "checkbox", "text", "longtext", "email", "phone"];

/** Kinds `adjust_number` works on. */
export const NUMERIC_KINDS: ColumnKind[] = ["number", "rating", "progress"];

/** Kinds that are calculated and never written. */
export const READ_ONLY_KINDS: ColumnKind[] = ["formula", "mirror", "auto_number"];

/** How a condition reads each column kind, the same families the board filters use. Kinds missing here cannot be used in a condition. */
export const CONDITION_KIND_BY_COLUMN: Partial<Record<ColumnKind, BoardFilterFieldKind>> = {
  status: "option",
  label: "option",
  dropdown: "option",
  tags: "option",
  people: "people",
  vote: "people",
  date: "date",
  timeline: "date",
  number: "number",
  rating: "number",
  progress: "number",
  auto_number: "number",
  time_tracking: "number",
  checkbox: "checkbox",
  text: "text",
  longtext: "text",
  email: "text",
  phone: "text",
  link: "text",
  checklist: "text",
};

/** Condition fields that are not columns, the same ids the board filters use. */
export const VIRTUAL_CONDITION_FIELDS: { id: string; label: string; kind: BoardFilterFieldKind }[] = [
  { id: "name", label: "Item name", kind: "text" },
  { id: "__group__", label: "Group", kind: "group" },
  { id: "__created_by__", label: "Creator", kind: "people" },
  { id: "__starred__", label: "Starred", kind: "checkbox" },
];

/** Message tokens every communication and update action understands, see `BoardAutomationMessageRenderer`. */
export const MESSAGE_TOKENS: { token: string; label: string }[] = [
  { token: "{item_name}", label: "Item name" },
  { token: "{board_name}", label: "Board name" },
  { token: "{actor_name}", label: "Who made the change" },
  { token: "{column_name}", label: "Column name" },
  { token: "{new_value}", label: "New value" },
  { token: "{old_value}", label: "Previous value" },
  { token: "{date}", label: "Today's date" },
];

export const IMPORTANCE_LABELS = { minor: "Minor", major: "Major", critical: "Critical" } as const;

export const WEEKDAY_LABELS: { id: number; short: string; label: string }[] = [
  { id: 1, short: "Mon", label: "Monday" },
  { id: 2, short: "Tue", label: "Tuesday" },
  { id: 3, short: "Wed", label: "Wednesday" },
  { id: 4, short: "Thu", label: "Thursday" },
  { id: 5, short: "Fri", label: "Friday" },
  { id: 6, short: "Sat", label: "Saturday" },
  { id: 7, short: "Sun", label: "Sunday" },
];

/** The viewer's IANA time zone, sent with date and recurring triggers so their times mean what the viewer picked. */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
