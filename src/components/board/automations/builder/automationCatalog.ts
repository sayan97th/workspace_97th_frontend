import type { BoardAutomationActionType, BoardAutomationDynamicSource, BoardAutomationRecipientSource, BoardAutomationTriggerType } from "@/types/board-automation";
import { BOARD_FILTER_OPERATORS, getOperatorLabel } from "../../toolbar/filterEngine";
import type { BoardFilterFieldKind, BoardFilterOperator } from "../../toolbar/types";
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
  /** The active Slack workspace, stamped on a picked channel since channel ids only mean something there. */
  slack_team_id?: string | null;
  slack_team_name?: string | null;
  /** Account teams a "notify team" action can reach, loaded with the dialog. */
  teams?: { id: number; name: string; member_count: number }[];
  /** This board's form views, for the "form is submitted" trigger. */
  forms?: NamedOption[];
};

export type PickerSection<T extends string> = { title: string; entries: { id: T; label: string; hint?: string }[] };

// ── Triggers ──────────────────────────────────────────────────────────────────

export type TriggerDef = {
  type: BoardAutomationTriggerType;
  /** Picker label, lower case like monday's. */
  label: string;
  section: "Most used" | "Status and columns" | "Dates and time" | "Items and updates" | "Subitems and groups" | "Forms and webhooks";
  /** Column kinds the trigger can watch, undefined when it watches no column. */
  column_kinds?: ColumnKind[];
};

/** Every column kind a "column changes" trigger can watch. */
const CHANGEABLE_KINDS: ColumnKind[] = [
  "text", "longtext", "number", "status", "label", "date", "people", "dropdown", "tags", "checkbox", "rating", "progress", "email", "phone", "link", "timeline", "vote", "files", "checklist",
];

export const TRIGGERS: TriggerDef[] = [
  { type: "status_changed", label: "status changes", section: "Most used", column_kinds: ["status", "label"] },
  { type: "item_created", label: "item is created", section: "Most used" },
  { type: "date_arrived", label: "date arrives", section: "Most used", column_kinds: ["date"] },
  { type: "column_changed", label: "column changes", section: "Most used", column_kinds: CHANGEABLE_KINDS },
  { type: "subitem_column_changed", label: "subitem column changes", section: "Subitems and groups", column_kinds: CHANGEABLE_KINDS },
  { type: "user_mentioned", label: "someone is mentioned in an update", section: "Items and updates" },
  { type: "update_replied", label: "update is replied to", section: "Items and updates" },
  { type: "update_keyword", label: "update contains a keyword", section: "Items and updates" },
  { type: "person_assigned", label: "person is assigned", section: "Status and columns", column_kinds: ["people"] },
  { type: "subitem_created", label: "subitem is created", section: "Items and updates" },
  { type: "item_moved_to_group", label: "item is moved to group", section: "Items and updates" },
  { type: "update_posted", label: "update is posted", section: "Items and updates" },
  { type: "item_archived", label: "item is archived", section: "Items and updates" },
  { type: "item_deleted", label: "item is deleted", section: "Items and updates" },
  { type: "recurring", label: "every time period", section: "Dates and time" },
  { type: "date_changed", label: "date changes", section: "Dates and time", column_kinds: ["date", "timeline"] },
  { type: "item_scan", label: "every time period, for each matching item", section: "Dates and time" },
  { type: "name_changed", label: "item name changes", section: "Items and updates" },
  { type: "all_subitems_status", label: "all subitems have a status", section: "Subitems and groups", column_kinds: ["status", "label"] },
  { type: "all_group_items_status", label: "all items in a group have a status", section: "Subitems and groups", column_kinds: ["status", "label"] },
  { type: "form_submitted", label: "form is submitted", section: "Forms and webhooks" },
  { type: "webhook_received", label: "webhook is received", section: "Forms and webhooks" },
  { type: "button_clicked", label: "button is clicked", section: "Status and columns", column_kinds: ["button"] },
  { type: "number_threshold", label: "number goes above or below", section: "Status and columns", column_kinds: ["number", "rating", "progress", "time_tracking"] },
  { type: "checklist_item_checked", label: "checklist task is checked", section: "Status and columns", column_kinds: ["checklist"] },
  { type: "checklist_completed", label: "checklist is completed", section: "Status and columns", column_kinds: ["checklist"] },
  { type: "item_moved_to_board", label: "item is moved to this board", section: "Items and updates" },
  { type: "item_restored", label: "item is restored", section: "Items and updates" },
  { type: "person_unassigned", label: "person is unassigned", section: "Status and columns", column_kinds: ["people"] },
  { type: "file_uploaded", label: "file is uploaded", section: "Status and columns", column_kinds: ["files"] },
  { type: "item_overdue", label: "item becomes overdue", section: "Dates and time", column_kinds: ["date", "timeline"] },
  { type: "status_stuck", label: "status stays the same for a while", section: "Status and columns", column_kinds: ["status", "label"] },
  { type: "item_stale", label: "item is not updated for a while", section: "Dates and time" },
];

export const TRIGGER_BY_TYPE = Object.fromEntries(TRIGGERS.map((trigger) => [trigger.type, trigger])) as Record<BoardAutomationTriggerType, TriggerDef>;

export function triggerSections(): PickerSection<BoardAutomationTriggerType>[] {
  const order: TriggerDef["section"][] = ["Most used", "Status and columns", "Dates and time", "Items and updates", "Subitems and groups", "Forms and webhooks"];
  return order
    .map((title) => ({ title, entries: TRIGGERS.filter((trigger) => trigger.section === title).map((trigger) => ({ id: trigger.type, label: trigger.label })) }))
    .filter((section) => section.entries.length > 0);
}

/** Triggers whose item may be a subitem, so their column picker also offers subitem columns. */
export const SUBITEM_AWARE_TRIGGERS: BoardAutomationTriggerType[] = ["status_changed", "column_changed", "date_changed"];

/** The column scope a trigger's column must have, when it is fixed. */
export const TRIGGER_COLUMN_SCOPE: Partial<Record<BoardAutomationTriggerType, "item" | "subitem">> = {
  all_subitems_status: "subitem",
  all_group_items_status: "item",
  subitem_column_changed: "subitem",
  status_stuck: "item",
};

/** Triggers the scheduler checks for how long nothing changed, they wait `amount` `unit`s. */
export const QUIET_TRIGGERS: BoardAutomationTriggerType[] = ["status_stuck", "item_stale"];

/** The longest a quiet trigger may wait, in days, the API's `BoardAutomation::MAX_QUIET_DAYS`. */
export const MAX_QUIET_DAYS = 365;

/** Triggers with no item of their own, they start with an itemless action like recurring ones. */
export const ITEMLESS_TRIGGERS: BoardAutomationTriggerType[] = ["recurring", "webhook_received"];

/** Triggers that run on a schedule. */
export const SCHEDULED_TRIGGERS: BoardAutomationTriggerType[] = ["recurring", "item_scan"];

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
  section: "Most used" | "Flow" | "Items" | "Subitems" | "Columns" | "Dates" | "Groups" | "People" | "Notifications" | "Email and Slack" | "Other boards" | "Webhooks";
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
  { id: "connect_items", type: "connect_items", label: "connect items on another board", section: "Other boards" },
  { id: "shift_date", type: "shift_date", label: "push date", section: "Dates" },
  { id: "set_date_from_column", type: "set_date_from_column", label: "set date from another date", section: "Dates" },
  { id: "ensure_date_after", type: "ensure_date_after", label: "keep date after another date", section: "Dates" },
  { id: "set_timeline", type: "set_timeline", label: "set timeline", section: "Dates" },
  { id: "create_group", type: "create_group", label: "create a group", section: "Groups", is_itemless: true },
  { id: "duplicate_group", type: "duplicate_group", label: "duplicate a group", section: "Groups", is_itemless: true },
  { id: "archive_group", type: "archive_group", label: "archive a group", section: "Groups", is_itemless: true },
  { id: "copy_column_value", type: "copy_column_value", label: "copy column value", section: "Columns" },
  { id: "time_tracking", type: "time_tracking", label: "start or stop time tracking", section: "Columns" },
  { id: "notify_team", type: "notify_team", label: "notify a team", section: "Notifications", is_itemless: true },
  { id: "send_webhook", type: "send_webhook", label: "send a webhook", section: "Webhooks", is_itemless: true },
  { id: "wait", type: "wait", label: "wait, then continue", section: "Flow", is_itemless: true },
  { id: "shift_dependents", type: "shift_dependents", label: "shift dependent items", section: "Dates" },
  { id: "assign_round_robin", type: "assign_round_robin", label: "assign in turn (round robin)", section: "People" },
  { id: "set_subitems_value", type: "set_subitems_value", label: "set every subitem's column", section: "Subitems" },
  { id: "set_parent_value", type: "set_parent_value", label: "set the parent item's column", section: "Subitems" },
  { id: "add_checklist_items", type: "add_checklist_items", label: "add checklist tasks", section: "Columns" },
  { id: "rename_item", type: "rename_item", label: "rename item", section: "Items" },
  { id: "change_values", type: "change_values", label: "add or remove a label or person", section: "Columns" },
  { id: "update_connected_items", type: "update_connected_items", label: "change connected items", section: "Other boards" },
  { id: "group_items", type: "group_items", label: "change every item of a group", section: "Groups", is_itemless: true },
  { id: "subscribe_people", type: "subscribe_people", label: "subscribe people to the item", section: "People" },
  { id: "unsubscribe_people", type: "unsubscribe_people", label: "unsubscribe people from the item", section: "People" },
  { id: "notify_subscribers", type: "notify_subscribers", label: "notify the item's subscribers", section: "Notifications" },
  { id: "clear_subitems", type: "clear_subitems", label: "archive or delete every subitem", section: "Subitems" },
  { id: "convert_subitem", type: "convert_subitem", label: "turn the subitem into an item", section: "Subitems" },
  { id: "send_digest", type: "send_digest", label: "email a digest of items", section: "Email and Slack", is_itemless: true },
  { id: "move_item_position", type: "move_item_position", label: "move item to the top or bottom", section: "Items" },
  { id: "sort_group", type: "sort_group", label: "sort a group", section: "Groups", is_itemless: true },
];

export const ITEMLESS_ACTION_TYPES = ACTIONS.filter((action) => action.is_itemless).map((action) => action.type);

/** Actions that name no item of their own but can take the item's group (`from_item_group`), which needs an item. */
export const GROUP_ACTION_TYPES: BoardAutomationActionType[] = ["duplicate_group", "archive_group", "group_items", "sort_group"];

export function actionSections(options: { only_itemless: boolean; is_slack_connected: boolean }): PickerSection<ActionPickerId>[] {
  const order: ActionDef["section"][] = ["Most used", "Flow", "Items", "Subitems", "Columns", "Dates", "Groups", "People", "Notifications", "Email and Slack", "Other boards", "Webhooks"];
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
  shift_date: "Push date",
  set_date_from_column: "Set date from date",
  ensure_date_after: "Keep date after",
  set_timeline: "Set timeline",
  create_group: "Create group",
  duplicate_group: "Duplicate group",
  archive_group: "Archive group",
  copy_column_value: "Copy value",
  time_tracking: "Time tracking",
  connect_items: "Connect items",
  notify_team: "Notify team",
  send_webhook: "Send webhook",
  wait: "Wait",
  shift_dependents: "Shift dependents",
  assign_round_robin: "Assign in turn",
  set_subitems_value: "Set subitems",
  set_parent_value: "Set parent",
  add_checklist_items: "Add checklist tasks",
  rename_item: "Rename item",
  change_values: "Add or remove values",
  update_connected_items: "Change connected items",
  group_items: "Change group items",
  subscribe_people: "Subscribe people",
  unsubscribe_people: "Unsubscribe people",
  notify_subscribers: "Notify subscribers",
  clear_subitems: "Clear subitems",
  convert_subitem: "Subitem to item",
  send_digest: "Send digest",
  move_item_position: "Move to top or bottom",
  sort_group: "Sort group",
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
  all_subitems_status: "All subitems status",
  all_group_items_status: "All group items status",
  item_scan: "Scheduled item check",
  form_submitted: "Form submitted",
  name_changed: "Name changed",
  date_changed: "Date changed",
  webhook_received: "Webhook received",
  button_clicked: "Button clicked",
  number_threshold: "Number threshold",
  item_moved_to_board: "Moved to board",
  item_restored: "Item restored",
  checklist_completed: "Checklist completed",
  checklist_item_checked: "Checklist task checked",
  person_unassigned: "Person unassigned",
  file_uploaded: "File uploaded",
  item_overdue: "Item overdue",
  subitem_column_changed: "Subitem column changes",
  user_mentioned: "Someone mentioned",
  update_replied: "Update replied to",
  update_keyword: "Update keyword",
  status_stuck: "Status stuck",
  item_stale: "Not updated",
};

/** How long a "wait" step may wait, all waits of one branch together, in days. */
export const MAX_WAIT_DAYS = 30;

export const FAILURE_ALERT_LABELS = { app: "Notify me in the app", app_and_email: "Notify me in the app and by email", none: "Do not notify me" } as const;

// ── Column kinds ──────────────────────────────────────────────────────────────

/** Kinds whose value an action can write with a picker. */
export const SETTABLE_KINDS: ColumnKind[] = ["status", "label", "dropdown", "tags", "people", "date", "timeline", "number", "rating", "progress", "checkbox", "text", "longtext", "email", "phone", "link", "checklist"];

/** Kinds a "clear column" action can empty. */
export const CLEARABLE_KINDS: ColumnKind[] = [...SETTABLE_KINDS, "files", "vote", "time_tracking", "connect_board", "dependency"];

/** Kinds "copy column value" reads from, every kind that stores a value, and formulas and mirrors, which the server computes. */
export const COPYABLE_SOURCE_KINDS: ColumnKind[] = [...SETTABLE_KINDS, "vote", "auto_number", "formula", "mirror"];

/** Kinds whose value is a list single values can be added to or removed from, for "add or remove a label or person". */
export const MULTI_VALUE_KINDS: ColumnKind[] = ["dropdown", "tags", "people", "vote"];

/** Date and timeline kinds, for the date actions. */
export const DATE_KINDS: ColumnKind[] = ["date", "timeline"];

/** Kinds whose value a trigger can only watch for "any change", there is no single value to wait for. */
export const ANY_CHANGE_ONLY_KINDS: ColumnKind[] = ["timeline", "files", "checklist", "time_tracking", "connect_board", "dependency"];

/** Kinds `adjust_number` works on. */
export const NUMERIC_KINDS: ColumnKind[] = ["number", "rating", "progress"];

/** Kinds that are calculated and never written. */
export const READ_ONLY_KINDS: ColumnKind[] = ["formula", "mirror", "auto_number", "button"];

/**
 * The families a condition reads a field as: the board filter ones, and the ones only automations
 * have. `formula` compares a computed result, `files` its file names, `linked` a connect boards
 * column's items, `dependency` whether the items it waits on are done, `timer` a time tracking
 * column and `subitems` checks a rule on every subitem.
 *
 * The column shaped families read one column type with operators of its own, see the Laravel
 * `AutomationConditionEvaluator`: `timeline` (start, end, length, today), `checklist` (tasks done),
 * `vote` (voters and vote count), `rating` (stars), `progress` (percent), `email` (domain),
 * `phone` (country code) and `link` (address, text and domain).
 */
export type AutomationConditionKind =
  | BoardFilterFieldKind
  | "formula"
  | "files"
  | "linked"
  | "dependency"
  | "timer"
  | "subitems"
  | "timeline"
  | "checklist"
  | "vote"
  | "rating"
  | "progress"
  | "email"
  | "phone"
  | "link";

type OperatorOption = { id: string; label: string };

/** Operators of the automation only condition families, the board filter families use `BOARD_FILTER_OPERATORS`. */
export const AUTOMATION_CONDITION_OPERATORS: Record<Exclude<AutomationConditionKind, BoardFilterFieldKind>, OperatorOption[]> = {
  formula: [
    { id: "is", label: "Is" },
    { id: "is_not", label: "Is not" },
    { id: "contains", label: "Contains" },
    { id: "not_contains", label: "Does not contain" },
    { id: "greater_than", label: ">" },
    { id: "greater_or_equal", label: "≥" },
    { id: "less_than", label: "<" },
    { id: "less_or_equal", label: "≤" },
    { id: "between", label: "Between" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  files: [
    { id: "is_not_empty", label: "Has files" },
    { id: "is_empty", label: "Has no files" },
    { id: "contains", label: "Has a file named" },
    { id: "not_contains", label: "Has no file named" },
  ],
  linked: [
    { id: "is_not_empty", label: "Is linked to an item" },
    { id: "is_empty", label: "Is not linked" },
    { id: "contains", label: "Is linked to an item named" },
    { id: "not_contains", label: "Is not linked to an item named" },
  ],
  dependency: [
    { id: "all_done", label: "All dependencies are done" },
    { id: "has_unfinished", label: "Waits on an unfinished item" },
    { id: "is_not_empty", label: "Has dependencies" },
    { id: "is_empty", label: "Has no dependencies" },
  ],
  timer: [
    { id: "is_running", label: "Is running" },
    { id: "is_not_running", label: "Is stopped" },
    { id: "greater_than", label: "Tracked more than (hours)" },
    { id: "less_than", label: "Tracked less than (hours)" },
    { id: "is_empty", label: "Has no time" },
  ],
  subitems: [
    { id: "all_match", label: "All match" },
    { id: "any_match", label: "At least one matches" },
    { id: "none_match", label: "None match" },
  ],
  // Rules saved before timelines had their own family kept the date operators, they read the whole range.
  timeline: [
    { id: "start_is", label: "Starts on" },
    { id: "start_before", label: "Starts before" },
    { id: "start_after", label: "Starts after" },
    { id: "end_is", label: "Ends on" },
    { id: "end_before", label: "Ends before" },
    { id: "end_after", label: "Ends after" },
    { id: "includes_today", label: "Includes today" },
    { id: "not_includes_today", label: "Does not include today" },
    { id: "duration_greater_than", label: "Lasts more than" },
    { id: "duration_less_than", label: "Lasts less than" },
    { id: "duration_equals", label: "Lasts exactly" },
    { id: "is", label: "Overlaps" },
    { id: "is_not", label: "Does not overlap" },
    { id: "between", label: "Overlaps the range" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  checklist: [
    { id: "is_complete", label: "Has every task done" },
    { id: "is_not_complete", label: "Has open tasks" },
    { id: "progress_at_least", label: "Is done at least" },
    { id: "progress_below", label: "Is done less than" },
    { id: "open_tasks_greater_than", label: "Has more open tasks than" },
    { id: "open_tasks_less_than", label: "Has fewer open tasks than" },
    { id: "contains", label: "Has a task named" },
    { id: "not_contains", label: "Has no task named" },
    { id: "is_empty", label: "Has no tasks" },
    { id: "is_not_empty", label: "Has tasks" },
  ],
  vote: [
    { id: "votes_at_least", label: "Has at least" },
    { id: "votes_less_than", label: "Has fewer than" },
    { id: "votes_equals", label: "Has exactly" },
    { id: "is", label: "Was voted by" },
    { id: "is_not", label: "Was not voted by" },
    { id: "is_empty", label: "Has no votes" },
    { id: "is_not_empty", label: "Has votes" },
  ],
  rating: [
    { id: "greater_or_equal", label: "Is at least" },
    { id: "less_or_equal", label: "Is at most" },
    { id: "equals", label: "Is exactly" },
    { id: "not_equals", label: "Is not" },
    { id: "greater_than", label: "Is more than" },
    { id: "less_than", label: "Is less than" },
    { id: "between", label: "Is between" },
    { id: "is_empty", label: "Is not rated" },
    { id: "is_not_empty", label: "Is rated" },
  ],
  progress: [
    { id: "greater_or_equal", label: "Is at least" },
    { id: "less_than", label: "Is below" },
    { id: "equals", label: "Is exactly" },
    { id: "not_equals", label: "Is not" },
    { id: "greater_than", label: "Is above" },
    { id: "less_or_equal", label: "Is at most" },
    { id: "between", label: "Is between" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  email: [
    { id: "domain_is", label: "Domain is" },
    { id: "domain_is_not", label: "Domain is not" },
    { id: "is_valid", label: "Is a valid address" },
    { id: "is_not_valid", label: "Is not a valid address" },
    { id: "is", label: "Is" },
    { id: "is_not", label: "Is not" },
    { id: "contains", label: "Contains" },
    { id: "not_contains", label: "Does not contain" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  phone: [
    { id: "country_code_is", label: "Country code is" },
    { id: "country_code_is_not", label: "Country code is not" },
    { id: "is_valid", label: "Is a valid number" },
    { id: "is_not_valid", label: "Is not a valid number" },
    { id: "is", label: "Is" },
    { id: "contains", label: "Contains" },
    { id: "not_contains", label: "Does not contain" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
  link: [
    { id: "domain_is", label: "Domain is" },
    { id: "domain_is_not", label: "Domain is not" },
    { id: "url_contains", label: "Address contains" },
    { id: "url_not_contains", label: "Address does not contain" },
    { id: "label_contains", label: "Text contains" },
    { id: "label_not_contains", label: "Text does not contain" },
    { id: "is_valid", label: "Is a valid address" },
    { id: "is_not_valid", label: "Is not a valid address" },
    { id: "contains", label: "Contains" },
    { id: "is_empty", label: "Is empty" },
    { id: "is_not_empty", label: "Is not empty" },
  ],
};

const isAutomationOnlyKind = (kind: AutomationConditionKind): kind is Exclude<AutomationConditionKind, BoardFilterFieldKind> => kind in AUTOMATION_CONDITION_OPERATORS;

/** The operators a condition of this family offers. */
export function conditionOperatorOptions(kind: AutomationConditionKind): OperatorOption[] {
  return isAutomationOnlyKind(kind) ? AUTOMATION_CONDITION_OPERATORS[kind] : BOARD_FILTER_OPERATORS[kind];
}

/** An operator's label, lower case as the sentence reads it. */
export function conditionOperatorText(kind: AutomationConditionKind, operator: string): string {
  const own = isAutomationOnlyKind(kind) ? AUTOMATION_CONDITION_OPERATORS[kind].find((option) => option.id === operator)?.label : undefined;
  return (own ?? getOperatorLabel(isAutomationOnlyKind(kind) ? "text" : kind, operator as BoardFilterOperator)).toLowerCase();
}

/** The operator a condition starts with once its field is picked. */
export const defaultOperatorFor = (kind: AutomationConditionKind): string => conditionOperatorOptions(kind)[0].id;

/** Operators that need no value, beyond the board filter ones. */
export const AUTOMATION_VALUELESS_OPERATORS = [
  "is_empty", "is_not_empty", "is_checked", "is_unchecked", "is_running", "is_not_running",
  "includes_today", "not_includes_today", "is_complete", "is_not_complete", "is_valid", "is_not_valid",
];

/** Column family operators that compare with a number, whatever the column holds: days, percent, votes or tasks. */
export const COUNT_OPERATORS = [
  "duration_greater_than", "duration_less_than", "duration_equals", "progress_at_least", "progress_below",
  "open_tasks_greater_than", "open_tasks_less_than", "votes_at_least", "votes_less_than", "votes_equals",
];

/** How a condition reads each column kind. Kinds missing here cannot be used in a condition. */
export const CONDITION_KIND_BY_COLUMN: Partial<Record<ColumnKind, AutomationConditionKind>> = {
  status: "option",
  label: "option",
  dropdown: "option",
  tags: "option",
  people: "people",
  vote: "vote",
  date: "date",
  timeline: "timeline",
  number: "number",
  rating: "rating",
  progress: "progress",
  auto_number: "number",
  time_tracking: "timer",
  checkbox: "checkbox",
  text: "text",
  longtext: "text",
  email: "email",
  phone: "phone",
  link: "link",
  checklist: "checklist",
  files: "files",
  formula: "formula",
  mirror: "text",
  connect_board: "linked",
  dependency: "dependency",
};

/** Condition fields that are not columns, the same ids the board filters use. */
export const VIRTUAL_CONDITION_FIELDS: { id: string; label: string; kind: AutomationConditionKind; is_item_only?: boolean }[] = [
  { id: "name", label: "Item name", kind: "text" },
  { id: "__group__", label: "Group", kind: "group", is_item_only: true },
  { id: "__created_by__", label: "Creator", kind: "people", is_item_only: true },
  { id: "__starred__", label: "Starred", kind: "checkbox", is_item_only: true },
  { id: "__actor__", label: "Person who made the change", kind: "people" },
  { id: "__created_at__", label: "Creation date", kind: "date", is_item_only: true },
  { id: "__updated_at__", label: "Last updated", kind: "date", is_item_only: true },
  { id: "__update_count__", label: "Number of updates", kind: "number" },
  { id: "__subitem_count__", label: "Number of subitems", kind: "number", is_item_only: true },
  { id: "__subitems__", label: "Subitems", kind: "subitems", is_item_only: true },
];

/** File types offered by "file is uploaded", any other can be typed. */
export const COMMON_FILE_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "png", "jpg", "jpeg", "gif", "svg", "zip", "txt", "mp4"];

/** Message tokens every communication and update action understands, see `BoardAutomationMessageRenderer`. */
export const MESSAGE_TOKENS: { token: string; label: string }[] = [
  { token: "{item_name}", label: "Item name" },
  { token: "{board_name}", label: "Board name" },
  { token: "{group_name}", label: "Group name" },
  { token: "{actor_name}", label: "Who made the change" },
  { token: "{column_name}", label: "Column name" },
  { token: "{new_value}", label: "New value" },
  { token: "{old_value}", label: "Previous value" },
  { token: "{date}", label: "Today's date" },
  { token: "{week}", label: "Week number" },
  { token: "{month}", label: "Month" },
];

/** Tokens only some triggers fill in, offered next to the others when the trigger has them. */
export const TRIGGER_MESSAGE_TOKENS: Partial<Record<BoardAutomationTriggerType, { token: string; label: string }[]>> = {
  update_posted: [{ token: "{update_text}", label: "Update text" }],
  update_replied: [{ token: "{update_text}", label: "Reply text" }],
  update_keyword: [{ token: "{update_text}", label: "Update text" }],
  user_mentioned: [{ token: "{update_text}", label: "Update text" }, { token: "{mentioned_name}", label: "Mentioned person" }],
  subitem_column_changed: [{ token: "{subitem_name}", label: "Subitem name" }],
};

// ── Dynamic values ────────────────────────────────────────────────────────────

export type DynamicFamily = "people" | "date" | "number" | "text";

/** What each dynamic source reads as, lower case like the sentence. */
export const DYNAMIC_SOURCE_LABELS: Record<BoardAutomationDynamicSource, string> = {
  actor: "the person who made the change",
  creator: "the item creator",
  owner: "the automation owner",
  mentioned: "the mentioned person",
  today: "today",
  column: "the value of a column",
};

/** The sources a value of each family can come from. `mentioned` only exists for actions of a mention trigger. */
export const DYNAMIC_SOURCES_BY_FAMILY: Record<DynamicFamily, BoardAutomationDynamicSource[]> = {
  people: ["actor", "creator", "owner", "mentioned", "column"],
  date: ["today", "column"],
  number: ["column"],
  text: ["actor", "creator", "owner", "mentioned", "column"],
};

/** The column kinds each family reads, for the "value of a column" source. */
export const DYNAMIC_KINDS_BY_FAMILY: Record<DynamicFamily, ColumnKind[]> = {
  people: ["people", "vote"],
  date: ["date", "timeline"],
  number: ["number", "rating", "progress", "auto_number", "time_tracking"],
  text: ["text", "longtext", "email", "phone", "link", "mirror", "formula", "checklist", "files"],
};

/** Kinds "change column value" can fill from a dynamic value, mirrors the API's `DYNAMIC_TARGET_TYPES`. */
export const DYNAMIC_TARGET_KINDS: ColumnKind[] = ["people", "vote", "date", "number", "rating", "progress", "text", "longtext", "email", "phone"];

/** Operators a dynamic value cannot stand in for: no value, two values, or an automation only family. */
export const DYNAMIC_EXCLUDED_OPERATORS = [
  "between", "is_empty", "is_not_empty", "is_checked", "is_unchecked", "all_match", "any_match", "none_match", "all_done", "has_unfinished", "is_running", "is_not_running",
  "includes_today", "not_includes_today", "is_complete", "is_not_complete", "is_valid", "is_not_valid", ...COUNT_OPERATORS,
  "domain_is", "domain_is_not", "country_code_is", "country_code_is_not", "url_contains", "url_not_contains", "label_contains", "label_not_contains",
];

/** The family a column kind reads as, undefined for kinds a dynamic value cannot fill. */
export function dynamicFamilyOfKind(kind: ColumnKind): DynamicFamily | undefined {
  return (Object.keys(DYNAMIC_KINDS_BY_FAMILY) as DynamicFamily[]).find((family) => DYNAMIC_KINDS_BY_FAMILY[family].includes(kind));
}

/** Item details a condition reads as a family, the rest cannot compare with a dynamic value. */
export const DYNAMIC_FAMILY_BY_FIELD: Record<string, DynamicFamily> = {
  __created_by__: "people",
  __actor__: "people",
  __created_at__: "date",
  __updated_at__: "date",
  __update_count__: "number",
  __subitem_count__: "number",
  name: "text",
};

/** Who a recipient token can stand for beyond a fixed person or a people column. */
export const RECIPIENT_SOURCE_LABELS: Record<BoardAutomationRecipientSource, string> = {
  actor: "Person who made the change",
  creator: "Item creator",
  owner: "Automation owner",
  mentioned: "Mentioned person",
  subscribers: "Item subscribers",
};

/**
 * The recipient sources that make sense for a trigger: the person who made the change and the
 * item's creator and subscribers need an item, the mentioned person a mention trigger.
 */
export function recipientSourcesFor(trigger_type: BoardAutomationTriggerType | null | undefined, has_trigger_item: boolean, with_subscribers = true): BoardAutomationRecipientSource[] {
  return (["actor", "creator", "owner", "mentioned", "subscribers"] as BoardAutomationRecipientSource[]).filter((source) => {
    if (source === "owner") return true;
    if (source === "mentioned") return trigger_type === "user_mentioned";
    if (source === "subscribers") return with_subscribers && has_trigger_item;
    return has_trigger_item;
  });
}

/** Kinds "create subitems" can read a list from, one subitem per entry. */
export const LIST_SOURCE_KINDS: ColumnKind[] = ["text", "longtext", "checklist", "tags", "dropdown", "people"];

/** A column's value in a message, stored by id so a renamed column keeps working: `{column:12}`. */
export const COLUMN_TOKEN_PATTERN = /\{column:(\d+)\}/g;

/** The token a webhook's JSON value is read with, e.g. `{payload.email}`. */
export const PAYLOAD_TOKEN_HINT = "{payload.field}";

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
