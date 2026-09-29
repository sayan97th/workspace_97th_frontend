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
  | "checklist_item_checked";

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
  | "add_checklist_items";

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
};

/** One "and only if" rule, the same shape as the toolbar's Advanced filter rules. */
export type BoardAutomationCondition = {
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
  /** `move_to_group`/`move_to_board`/`create_item`. */
  target_group_id?: number;
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
  /** `create_group` only. */
  position?: "top" | "bottom";
  accent_color?: string | null;
  /** `duplicate_group`/`archive_group`: act on the item's own group instead of a chosen one. */
  from_item_group?: boolean;
  /** `duplicate_group` only. */
  source_group_id?: number | null;
  with_items?: boolean;
  /** `time_tracking`: start or stop. `shift_dependents`: keep the gap (`strict`) or only push when they would overlap (`flexible`). */
  mode?: "start" | "stop" | "strict" | "flexible";
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
  /** Set when the automation switched itself off because something it uses was deleted. */
  paused_at?: string | null;
  paused_reason?: string | null;
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
};

/** Every step of one execution, what retried its failures, and whether it still waits. */
export type BoardAutomationRunDetail = {
  run: BoardAutomationRunDto;
  steps: BoardAutomationRunDto[];
  retries: BoardAutomationRunDto[];
  waiting_until: string | null;
  waiting_id: number | null;
  can_retry: boolean;
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
};

export type UpdateBoardAutomationSettingsPayload = Partial<Pick<BoardAutomationSettingsDto, "workdays" | "holidays">> & { is_paused?: boolean };

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
