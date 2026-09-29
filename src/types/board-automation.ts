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
  | "recurring";

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
  | "post_update";

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
  /** `item_moved_to_group` only: the one group it watches, null for any group. */
  group_id?: number | null;
  /** `recurring` only. */
  schedule?: BoardAutomationSchedule | null;
};

/** One "and only if" rule, the same shape as the toolbar's Advanced filter rules. */
export type BoardAutomationCondition = {
  column_id: string;
  condition: string;
  value: string;
  values: string[];
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
};

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
};

/** Everything the sentence builder saves: the trigger, the conditions and the actions. */
export type BoardAutomationDefinition = {
  trigger_type: BoardAutomationTriggerType;
  trigger_column_id: number | null;
  trigger_value: unknown;
  trigger_config: BoardAutomationTriggerConfig | null;
  conditions: BoardAutomationCondition[];
  actions: BoardAutomationAction[];
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
  /** The ordered actions. Older callers may send a single `action_type` + `action_params` instead. */
  actions?: BoardAutomationAction[];
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
};

export type BoardAutomationRunFilters = {
  status?: BoardAutomationRunStatus | null;
  automation_id?: number | null;
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
