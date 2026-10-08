/**
 * API types for the Table Board's rule-based (no AI) automations — mirrors
 * the Laravel `BoardAutomation*` payloads under `App\Http\Controllers\Board\BoardAutomationController`.
 * See `board-content.ts`'s own doc comment for the sibling engine types this pairs with.
 */

export type BoardAutomationTriggerType =
  | "status_changed"
  | "date_arrived"
  | "item_created"
  | "subitem_created"
  | "person_assigned"
  | "column_changed"
  | "update_posted"
  | "item_moved_to_group"
  | "item_archived"
  | "item_deleted"
  | "recurring"
  | "all_subitems_status"
  | "all_group_items_status"
  | "item_scan"
  | "form_submitted"
  | "name_changed"
  | "date_changed"
  | "webhook_received"
  | "button_clicked"
  | "number_threshold"
  | "item_moved_to_board"
  | "item_restored"
  | "checklist_completed"
  | "checklist_item_checked"
  | "person_unassigned"
  | "file_uploaded"
  | "item_overdue"
  | "subitem_column_changed"
  | "user_mentioned"
  | "update_replied"
  | "update_keyword"
  | "status_stuck"
  | "item_stale";

export type BoardAutomationActionType =
  | "move_to_group"
  | "move_to_board"
  | "notify_person"
  | "send_email"
  | "slack_notify_channel"
  | "slack_notify_person"
  | "archive_item"
  | "delete_item"
  | "duplicate_item"
  | "set_column_value"
  | "clear_column"
  | "assign_person"
  | "unassign_people"
  | "set_date"
  | "adjust_number"
  | "create_item"
  | "create_subitem"
  | "post_update"
  | "shift_date"
  | "set_date_from_column"
  | "ensure_date_after"
  | "set_timeline"
  | "create_group"
  | "duplicate_group"
  | "archive_group"
  | "copy_column_value"
  | "time_tracking"
  | "connect_items"
  | "notify_team"
  | "send_webhook"
  | "wait"
  | "shift_dependents"
  | "assign_round_robin"
  | "set_subitems_value"
  | "set_parent_value"
  | "add_checklist_items"
  | "rename_item"
  | "change_values"
  | "update_connected_items"
  | "group_items"
  | "subscribe_people"
  | "unsubscribe_people"
  | "notify_subscribers"
  | "clear_subitems"
  | "convert_subitem"
  | "send_digest"
  | "move_item_position"
  | "sort_group";

/**
 * Where a dynamic value comes from, see the Laravel `AutomationDynamicValueResolver`: whoever set
 * the automation off, the item creator, the automation owner, the person a mention trigger fired
 * for, today (plus `offset_days`) or what another column holds on the item.
 */
export type BoardAutomationDynamicSource = "actor" | "creator" | "owner" | "mentioned" | "today" | "column";

/** A value read on every run instead of a fixed one, such as "today + 3 days" or "the item creator". */
export type BoardAutomationDynamicValue = {
  source: BoardAutomationDynamicSource;
  /** `today` and date `column` sources: days added, negative to go back. */
  offset_days?: number | null;
  /** Count `offset_days` in working days of the board. */
  use_working_days?: boolean;
  /** `column` only: the column read. */
  column_id?: number | null;
};

/** Who a recipient token stands for besides fixed people and people columns. `subscribers` is everyone following the item. */
export type BoardAutomationRecipientSource = "actor" | "creator" | "owner" | "mentioned" | "subscribers";

/** How the owner hears about a failed run. */
export type BoardAutomationFailureAlert = "app" | "app_and_email" | "none";

/** `number_threshold` only: which side of the threshold the number must reach. */
export type BoardAutomationThresholdOperator = "above" | "below" | "equals";

export type BoardAutomationImportance = "minor" | "major" | "critical";

/** How often a `recurring` automation runs. */
export type BoardAutomationScheduleFrequency = "daily" | "weekly" | "monthly";

export type BoardAutomationSchedule = {
  frequency: BoardAutomationScheduleFrequency;
  /** ISO weekdays, 1 Monday to 7 Sunday, for a weekly schedule. */
  weekdays?: number[];
  /** 1 to 31 for a monthly schedule, shorter months run on their last day. */
  day_of_month?: number | null;
  /** `HH:MM` in `timezone`. */
  time?: string | null;
  timezone?: string | null;
};

/**
 * `column_changed` only: what the new value must be, read by the column's type (see the Laravel
 * `BoardAutomationService::changeMatches()`). Text: `is`, `contains`, `starts_with`... Numbers:
 * `equals`, `greater_than`, `less_than`, `between`. Dropdown, tags, people and votes: `added`,
 * `removed`, `holds`. Checkbox: `is_checked`, `is_unchecked`. Date: `is`, `before`, `after`.
 * Status: `is`, `is_not`. Any kind: `is_empty`, `is_not_empty`.
 */
export type BoardAutomationChangeMatch = {
  operator: string;
  value?: string;
  values?: string[];
};

/** What a trigger needs beyond its column and value. */
export type BoardAutomationTriggerConfig = {
  /** `status_changed` only: the option it must change from. */
  from_value?: string | null;
  /** `date_arrived` only: days relative to the date, negative before it, positive after it. */
  offset_days?: number | null;
  /** `date_arrived` only: `HH:MM`, when the date trigger fires on its day. */
  time?: string | null;
  timezone?: string | null;
  /** `item_moved_to_group` and `all_group_items_status`: the one group it watches, null for any group. */
  group_id?: number | null;
  /** `form_submitted` only: the one form it watches, null for any form of the board. */
  form_view_id?: number | null;
  /** `recurring` and `item_scan`. */
  schedule?: BoardAutomationSchedule | null;
  /** `number_threshold` only. */
  operator?: BoardAutomationThresholdOperator | null;
  threshold?: number | null;
  /** `item_moved_to_board` only: the one board items come from, null for any board. */
  from_board_id?: number | null;
  /** `date_arrived` only: count the offset in working days and never fire on a non working day. */
  working_days_only?: boolean;
  /** `file_uploaded` only: file types to watch, such as `pdf`, empty for any file. */
  extensions?: string[] | null;
  /** `item_overdue` only: the status column that says an item is done, and its labels that mean done. */
  status_column_id?: number | null;
  done_values?: string[] | null;
  /** `column_changed` and `subitem_column_changed`: a value condition by column type, instead of a single `trigger_value`. */
  match?: BoardAutomationChangeMatch | null;
  /** `subitem_column_changed` only: run the actions on the parent item (default) or on the subitem. */
  run_on?: "parent" | "subitem" | null;
  /** `update_keyword` only: the words an update must contain, one is enough. */
  keywords?: string[] | null;
  /** `update_keyword` only: replies count too. */
  include_replies?: boolean;
  /** `status_stuck` and `item_stale`: how long nothing may change, `amount` `unit`s. */
  amount?: number | null;
  unit?: "hours" | "days" | null;
  /** `date_changed` on a timeline only: watch its start, its end, or either (`any`, the default). */
  timeline_part?: "any" | "start" | "end" | null;
};

/**
 * One "and only if" rule, the same shape as the toolbar's Advanced filter rules. A "subitems"
 * rule (`column_id` `__subitems__`, `condition` `all_match`, `any_match` or `none_match`) carries
 * the rule its subitems are checked against in `subitem_rule`.
 */
export type BoardAutomationCondition = {
  column_id: string;
  condition: string;
  value: string;
  values: string[];
  subitem_rule?: BoardAutomationSubitemRule | null;
  /** Compares with a value read on every run instead of `value`/`values`. */
  dynamic?: BoardAutomationDynamicValue | null;
};

/** The rule on a subitem column a "subitems" condition checks. */
export type BoardAutomationSubitemRule = {
  column_id: string;
  condition: string;
  value: string;
  values: string[];
};

/** A group of rules combined with its own And/Or, like the toolbar's Advanced filter groups. */
export type BoardAutomationConditionGroup = {
  join_operator: "and" | "or";
  rules: BoardAutomationCondition[];
};

export type BoardAutomationActionParams = {
  /** `move_to_group`/`move_to_board`/`create_item`, group actions and digests. Null once a group action reads the item's own group. */
  target_group_id?: number | null;
  /** `move_to_board`, and `create_item` on another board. */
  target_board_id?: number | null;
  /** Notify and communication actions: a fixed recipient. */
  notify_user_id?: number;
  /** Notify and communication actions: whoever a people column currently holds on the item. */
  notify_from_people_column_id?: number;
  /** Column actions: which column to write. */
  target_column_id?: number;
  /** `set_column_value` only: the value to write into `target_column_id`. */
  value?: unknown;
  /** `create_item` only: the new item's name, tokens such as `{item_name}` are filled in. */
  item_name?: string;
  /** `create_item` only: copy the item's values onto matching columns. */
  copy_values?: boolean;
  /** `create_subitem` only: one subitem per name. */
  subitem_names?: string[];
  /** `duplicate_item` only. */
  with_subitems?: boolean;
  /** `assign_person` only: a specific person, the item creator, or whoever triggered it. */
  assign_mode?: "user" | "creator" | "actor";
  /** `assign_person`/`unassign_people`: the person, null on unassign to remove everyone. */
  user_id?: number | null;
  /** `assign_person` only: replace the assignees instead of adding. */
  replace?: boolean;
  /** `set_date` only: today plus this many days. */
  offset_days?: number;
  /** `adjust_number` only: added to the number, negative to subtract. */
  amount?: number;
  /** Notify, communication and `post_update`: the message template, with tokens such as `{item_name}`. */
  message?: string | null;
  /** `send_email` only: the email subject, `{item_name}` and `{board_name}` are filled in. */
  subject?: string | null;
  /** `slack_notify_channel` only: the Slack channel id to post to. */
  slack_channel_id?: string;
  /** `slack_notify_channel` only: the channel name, kept just so the list can show it without asking Slack. */
  slack_channel_name?: string | null;
  /** `slack_notify_channel` only: the Slack workspace the channel belongs to, the API skips the post while another workspace is active. */
  slack_team_id?: string | null;
  /** `slack_notify_channel` only: the owner's own Slack account the post goes through, set by the Slack recipes. */
  slack_connection_id?: number | null;
  /** `create_item` only: columns of the new item filled from text templates, such as `{payload.email}`. */
  field_mappings?: BoardAutomationFieldMapping[];
  /** `shift_date`: how far to push the date, negative to pull it earlier. `wait`: minutes, hours or days. */
  unit?: "minutes" | "hours" | "days" | "weeks" | "months";
  /** Date and copy actions: the column read from. */
  source_column_id?: number;
  /** `set_date_from_column` only: a number column whose days are added. */
  number_column_id?: number | null;
  /** `set_date_from_column` only: 1 adds the number of days, -1 subtracts it. */
  number_sign?: 1 | -1;
  /** `ensure_date_after` only: days between the end of the source and the start of the target. */
  gap_days?: number;
  /** `set_timeline` only. */
  start_offset_days?: number;
  duration_days?: number;
  /** Group actions: the new group's name, tokens such as `{week}` are filled in. */
  group_name?: string | null;
  /** `create_group`: where the new group goes. `move_item_position`: where the item goes in its group. */
  position?: "top" | "bottom";
  accent_color?: string | null;
  /** `duplicate_group`/`archive_group`: act on the item's own group instead of a chosen one. */
  from_item_group?: boolean;
  /** `duplicate_group` only. */
  source_group_id?: number | null;
  with_items?: boolean;
  /** `time_tracking`: start or stop. `shift_dependents`: keep the gap (`strict`) or only push when they would overlap (`flexible`). */
  mode?: "start" | "stop" | "strict" | "flexible" | "add" | "remove";
  /** `connect_items` only: the column of this item to match, `name` for the item name. */
  match_column_id?: string;
  /** `connect_items` only: the column of the connected board to compare with, `name` for the item name. */
  linked_match_column_id?: string;
  /** `notify_team` only. */
  team_id?: number;
  /** `send_webhook` only. */
  url?: string;
  /** `send_webhook` only: signs the body, sent as `X-Automation-Signature: sha256=<hmac>`. */
  secret?: string | null;
  /** `send_email` only: whatever address an Email column holds on the item. */
  email_column_id?: number | null;
  /** `send_email` only: outside addresses typed in. */
  email_addresses?: string[];
  /** `wait` only: check the conditions again once the wait is over (`amount` and `unit` say how long). */
  recheck_conditions?: boolean;
  /** `shift_dependents` only: the dependency column that points at this item. */
  dependency_column_id?: number;
  /** `assign_round_robin` only. */
  user_ids?: number[];
  strategy?: "rotation" | "least_busy";
  /** `add_checklist_items` only: one task per entry. */
  tasks?: string[];
  /** `set_date`, `shift_date` (days), `set_timeline` and `shift_dependents`: count working days of the board. */
  use_working_days?: boolean;
  /** `rename_item` only: the new name, tokens such as `{item_name}` and `{column:12}` are filled in. */
  name_template?: string;
  /** `change_values` only: the option ids or people to add or remove, `__actor__` and `__creator__` for people. `mode` says which. */
  values?: string[];
  /** `update_connected_items` only: the connect boards column whose linked items change. */
  connect_column_id?: number;
  /** `update_connected_items` only: the column of the connected board to set to `value`. */
  linked_column_id?: number;
  /** `create_item` on another board only: the connect boards column of this item the new item is added to. */
  link_column_id?: number | null;
  /** `group_items`: what happens to every item of the group. `clear_subitems`: `archive` or `delete` every subitem. */
  operation?: "set_column_value" | "clear_column" | "archive" | "move_to_group" | "delete";
  /** `group_items` with `move_to_group` only: where the items go. */
  destination_group_id?: number | null;
  /** `set_column_value` only: a value read on every run, `value` is then ignored. */
  dynamic_value?: BoardAutomationDynamicValue | null;
  /** Notify, email, Slack and subscribe actions: someone known only on the run. */
  recipient_source?: BoardAutomationRecipientSource | null;
  /** `unsubscribe_people` only: unsubscribe everyone. */
  everyone?: boolean;
  /** `notify_subscribers` only: notify the person who set the automation off too. */
  include_actor?: boolean;
  /** `send_digest` only: the columns shown after the item name. */
  column_ids?: number[];
  /** `send_digest` only: which items the digest lists, the same rules as the conditions. */
  digest_rules?: BoardAutomationCondition[];
  digest_operator?: "and" | "or";
  /** `send_digest` only: most rows, 1 to 200. */
  max_items?: number;
  /** `send_digest` only: send it even when no item matches. */
  send_when_empty?: boolean;
  /** `sort_group` only: what the items sort by, a column (`sort_column_id`), the item name or the creation date. */
  sort_by?: "column" | "name" | "created_at";
  sort_column_id?: number | null;
  direction?: "asc" | "desc";
};

export type BoardAutomationFieldMapping = { column_id: number | null; source: string };

/** Something an automation uses that no longer exists. `path` is `trigger`, `conditions.<index>` or `actions.<index>`. */
export type BoardAutomationProblem = { path: string; message: string };

export type BoardAutomationAction = {
  type: BoardAutomationActionType;
  params: BoardAutomationActionParams;
};

export type BoardAutomationPersonRef = { id: number; name: string };

export type BoardAutomationDto = {
  id: number;
  board_id: number;
  board_view_id: number;
  name: string | null;
  description: string | null;
  is_enabled: boolean;
  importance: BoardAutomationImportance;
  trigger_type: BoardAutomationTriggerType;
  /** Null for triggers that watch no column. */
  trigger_column_id: number | null;
  /** The matched option id (`status_changed`, null for any), a person id (`person_assigned`, null for anyone) or a value (`column_changed`, null for any change). */
  trigger_value: unknown;
  trigger_config: BoardAutomationTriggerConfig;
  conditions: BoardAutomationCondition[];
  /** How the top-level conditions and the groups combine. */
  condition_operator?: "and" | "or";
  condition_groups?: BoardAutomationConditionGroup[];
  /** The "Otherwise" actions, run when an item does not pass the conditions. */
  else_actions?: BoardAutomationAction[];
  failure_alert?: BoardAutomationFailureAlert;
  /** How many saved versions its history holds. */
  version_count?: number;
  /** Mirrors `actions[0]`, kept for the run history and older code paths. */
  action_type: BoardAutomationActionType;
  action_params: BoardAutomationActionParams;
  actions: BoardAutomationAction[];
  created_at: string | null;
  updated_at: string | null;
  /** How many times this automation has run, all outcomes counted. */
  run_count: number;
  /** ISO timestamp of the latest run, null until it has run once. */
  last_run_at: string | null;
  created_by: BoardAutomationPersonRef | null;
  /** Who answers for the automation, the creator until ownership is transferred. */
  owner?: BoardAutomationPersonRef | null;
  /** `webhook_received` only: the secret URL other services post to. */
  webhook_url?: string | null;
  /** Set when the automation switched itself off, because something it uses was deleted or it failed too often. */
  paused_at?: string | null;
  paused_reason?: string | null;
  /** How many runs in a row failed, reset by a run that works. */
  consecutive_failures?: number;
  last_failed_at?: string | null;
  /** What it uses that no longer exists, empty when it can run. */
  problems?: BoardAutomationProblem[];
};

/** Everything the sentence builder saves: the trigger, the conditions and the actions. */
export type BoardAutomationDefinition = {
  trigger_type: BoardAutomationTriggerType;
  trigger_column_id: number | null;
  trigger_value: unknown;
  trigger_config: BoardAutomationTriggerConfig | null;
  conditions: BoardAutomationCondition[];
  condition_operator?: "and" | "or";
  condition_groups?: BoardAutomationConditionGroup[];
  actions: BoardAutomationAction[];
  else_actions?: BoardAutomationAction[];
};

export type CreateBoardAutomationPayload = {
  view_id: number;
  name?: string | null;
  description?: string | null;
  is_enabled?: boolean;
  importance?: BoardAutomationImportance;
  trigger_type: BoardAutomationTriggerType;
  trigger_column_id?: number | null;
  trigger_value?: unknown;
  trigger_config?: BoardAutomationTriggerConfig | null;
  conditions?: BoardAutomationCondition[];
  condition_operator?: "and" | "or";
  condition_groups?: BoardAutomationConditionGroup[];
  /** The ordered actions. Older callers may send a single `action_type` + `action_params` instead. */
  actions?: BoardAutomationAction[];
  else_actions?: BoardAutomationAction[];
  failure_alert?: BoardAutomationFailureAlert;
  action_type?: BoardAutomationActionType;
  action_params?: BoardAutomationActionParams;
};

export type UpdateBoardAutomationPayload = Partial<Omit<CreateBoardAutomationPayload, "view_id">> & {
  /** "Transfer ownership". */
  owner_id?: number;
};

/** An automation saved with "Save as template", listed in the Create tab. */
export type BoardAutomationTemplateDto = {
  id: number;
  board_id: number;
  name: string;
  description: string | null;
  definition: BoardAutomationDefinition;
  created_at: string | null;
  created_by?: BoardAutomationPersonRef | null;
};

/** How one run of an automation ended: it did its job, had nothing to do, or could not be delivered. */
export type BoardAutomationRunStatus = "success" | "skipped" | "failed";

/** One row of the Manage tab's "Run history". */
export type BoardAutomationRunDto = {
  id: number;
  /** Null once the automation was deleted, `automation_name` still names it. */
  automation_id: number | null;
  automation_name: string | null;
  board_item_id: number | null;
  item_name: string | null;
  trigger_type: BoardAutomationTriggerType;
  action_type: BoardAutomationActionType;
  status: BoardAutomationRunStatus;
  message: string;
  /** Full name of whoever caused the run, null for scheduled runs. */
  actor_name: string | null;
  ran_at: string;
  /** Every step of one execution shares it. */
  run_uuid?: string | null;
  /** Whether the step came from the "Then" or the "Otherwise" actions. */
  branch?: "then" | "else";
  step_index?: number | null;
  /** Set on a step that retried a failed one. */
  retry_of_id?: number | null;
  /** Set once the run this step belongs to was undone. */
  undone_at?: string | null;
  /** Whether the run still has changes "Undo" can take back. */
  can_undo?: boolean;
};

/** Every step of one execution, what retried its failures, and whether it still waits. */
export type BoardAutomationRunDetail = {
  run: BoardAutomationRunDto;
  steps: BoardAutomationRunDto[];
  retries: BoardAutomationRunDto[];
  waiting_until: string | null;
  waiting_id: number | null;
  can_retry: boolean;
  can_undo?: boolean;
  undone_at?: string | null;
};

/** What "Undo" took back, and the changes it left alone because they changed again since. */
export type BoardAutomationUndoResult = { message: string; data: { reverted: number; skipped: string[] } };

/**
 * "Preview impact": which items an automation that is not saved yet would act on. `mode` says what
 * that means: `conditions` (the items that pass the conditions now), `scan` (a scheduled check's
 * next run), `upcoming` (date and overdue triggers in the coming days, with `fires_on`) or
 * `itemless` (recurring and webhook triggers, only the sample run applies).
 */
export type BoardAutomationPreviewResult = {
  mode: "conditions" | "scan" | "upcoming" | "itemless";
  total_items: number;
  matching_count: number;
  is_truncated: boolean;
  items: { id: number; name: string; group_name: string; fires_on: string | null }[];
  /** A test run on the first matching item, null when nothing matches. */
  sample: BoardAutomationTestResult | null;
};

/** The JSON file "Export" writes and "Import" reads. */
export type BoardAutomationExportFile = {
  format: "workspace97.automations";
  version: number;
  exported_at: string;
  source: { board_id: number; board_name: string; view_id: number };
  columns: { id: number; label: string; type: string; scope: "item" | "subitem"; options: { id: string; label: string }[] }[];
  groups: { id: number; name: string }[];
  automations: (BoardAutomationDefinition & { name: string | null; description: string | null; importance: BoardAutomationImportance; failure_alert?: BoardAutomationFailureAlert })[];
};

export type BoardAutomationImportResult = {
  message: string;
  /** One entry per imported automation, with what found no match on this board. */
  data: { automation_id: number; name: string | null; unmapped: string[] }[];
};

export type BoardAutomationRunFilters = {
  status?: BoardAutomationRunStatus | null;
  automation_id?: number | null;
  item_id?: number | null;
  /** `YYYY-MM-DD`, inclusive. */
  from?: string | null;
  /** `YYYY-MM-DD`, inclusive. */
  to?: string | null;
};

export type BoardAutomationRunsPage = {
  data: BoardAutomationRunDto[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export type BoardAutomationUsageDto = {
  period_days: number;
  runs: number;
  success: number;
  failed: number;
  skipped: number;
  automations: number;
  enabled_automations: number;
  /** One entry per day of the period, oldest first, zero filled. */
  daily: { date: string; runs: number }[];
  top_automations: {
    automation_id: number | null;
    automation_name: string | null;
    trigger_type: BoardAutomationTriggerType;
    action_type: BoardAutomationActionType;
    runs: number;
  }[];
  by_action: { action_type: BoardAutomationActionType; runs: number }[];
  /** The account's monthly action quota, shared by every board. */
  monthly_quota?: AutomationMonthlyQuotaDto;
};

/**
 * The account's monthly automation action quota, see the Laravel `AutomationUsageMeter`. Every
 * action an automation performs counts once, `limit` null means no limit.
 */
export type AutomationMonthlyQuotaDto = {
  /** `YYYY-MM`. */
  month: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  /** 0 to 100, null without a limit. */
  percent: number | null;
  is_exhausted: boolean;
  /** `YYYY-MM-DD`, the first day of next month. */
  resets_on: string;
};

/** `GET /api/automations/usage`: the quota, the boards that used the most and whether the viewer may change the limit. */
export type AutomationUsageSummaryDto = AutomationMonthlyQuotaDto & {
  warning_percents: number[];
  top_boards: { board_id: number; board_name: string; action_count: number }[];
  can_manage: boolean;
};

/** One action of a test run, of this automation or of one it set off (`is_chained`). */
export type BoardAutomationTestAction = {
  automation_name: string;
  is_chained: boolean;
  branch?: "then" | "else";
  action_type: BoardAutomationActionType;
  status: BoardAutomationRunStatus;
  message: string;
};

/** What "Test run on an item" found: which conditions the item passes and what each action did or would do. Nothing is saved. */
export type BoardAutomationTestResult = {
  item: { id: number; name: string } | null;
  conditions: { index: number; passes: boolean }[];
  groups?: { index: number; passes: boolean }[];
  passes: boolean;
  /** Which actions ran: the "Then" ones, the "Otherwise" ones, or none. */
  branch?: "then" | "else" | null;
  actions: BoardAutomationTestAction[];
};

export type TestBoardAutomationPayload = BoardAutomationDefinition & {
  view_id: number;
  item_id?: number | null;
  name?: string | null;
  /** A sample JSON body for a webhook trigger. */
  payload?: Record<string, unknown> | null;
};

/** A team a "notify team" action can reach. */
export type BoardAutomationTeamDto = { id: number; name: string; member_count: number };

/** Where a board agnostic template needs a column, the API column type and scope. */
export type PortableColumnKind = { type: string; scope: "item" | "subitem" };

/** A template an administrator published for every board, the "Created by" category. */
export type AccountAutomationTemplateDto = {
  id: number;
  name: string;
  description: string | null;
  definition: BoardAutomationDefinition;
  /** Path in `definition` (e.g. `actions.0.params.target_column_id`) to the kind of column it needs. */
  column_kinds: Record<string, PortableColumnKind>;
  created_at: string | null;
  created_by?: BoardAutomationPersonRef | null;
};

/** The board's automation settings: "Pause all automations" and the working calendar. */
export type BoardAutomationSettingsDto = {
  is_paused: boolean;
  paused_at: string | null;
  paused_by: BoardAutomationPersonRef | null;
  /** ISO weekdays, 1 Monday to 7 Sunday. */
  workdays: number[];
  /** `YYYY-MM-DD`. */
  holidays: string[];
  /** An automation that fails this many runs in a row is paused, 0 never pauses. */
  auto_pause_after_failures: number;
};

export type UpdateBoardAutomationSettingsPayload = Partial<Pick<BoardAutomationSettingsDto, "workdays" | "holidays" | "auto_pause_after_failures">> & { is_paused?: boolean };

/** The parts of the sentence a version changed compared with the one before. */
export type BoardAutomationVersionPart = "trigger" | "conditions" | "actions" | "else_actions" | "details";

/** One saved state of an automation. */
export type BoardAutomationVersionDto = {
  id: number;
  version: number;
  snapshot: BoardAutomationDefinition & {
    name: string | null;
    description: string | null;
    importance: BoardAutomationImportance;
    failure_alert?: BoardAutomationFailureAlert;
  };
  changed_parts: BoardAutomationVersionPart[];
  changed_by: BoardAutomationPersonRef | null;
  created_at: string | null;
};

export type BoardAutomationBulkAction = "enable" | "disable" | "delete";

export type BoardAutomationBulkResult = {
  message: string;
  affected_ids: number[];
  /** Automations that could not be turned on, with why. */
  skipped: { id: number; message: string }[];
};

export type BoardAutomationCopyResult = {
  message: string;
  target_board: { id: number; label: string };
  /** One entry per copied automation, with what found no match on the other board. */
  data: { source_id: number; automation_id: number; unmapped: string[] }[];
};

/** The item drawer's Automations tab. */
export type BoardItemAutomationsDto = {
  automations: {
    id: number;
    is_enabled: boolean;
    /** Null when the automation has no condition. */
    passes_conditions: boolean | null;
    has_else: boolean;
  }[];
  runs: BoardAutomationRunDto[];
  /** Runs of this item waiting behind a "wait" step. */
  waiting: { id: number; automation_id: number; run_at: string }[];
  is_board_paused: boolean;
};

export type BoardButtonPressResult = { message: string; automations_run: number; is_board_paused: boolean };

/** One row of the account wide Automations center, an automation with its board and recent runs. */
export type AccountAutomationDto = BoardAutomationDto & {
  board: { id: number; label: string | null; workspace_name: string | null };
  /** The tab the automation belongs to. */
  view_label: string | null;
  /** Whether the viewer may turn it on or off, which needs edit rights on its board. */
  can_edit: boolean;
  /** Runs and failed runs in the last `summary.recent_days` days. */
  recent_runs: number;
  recent_failures: number;
};

export type AccountAutomationsSummary = {
  total: number;
  enabled: number;
  /** Switched themselves off, because something they use was deleted or they failed too often. */
  paused: number;
  /** Failed at least their latest run. */
  failing: number;
  /** Use something that no longer exists. */
  broken: number;
  boards: number;
  recent_runs: number;
  recent_days: number;
};

export type AccountAutomationsResponse = {
  data: AccountAutomationDto[];
  summary: AccountAutomationsSummary;
  /** More automations exist than the center lists. */
  is_truncated: boolean;
};
