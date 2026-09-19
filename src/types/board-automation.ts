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
  | "update_posted";
export type BoardAutomationActionType =
  | "move_to_group"
  | "notify_person"
  | "archive_item"
  | "set_column_value"
  | "create_item"
  | "send_email"
  | "slack_notify_channel"
  | "slack_notify_person";

export type BoardAutomationActionParams = {
  /** `move_to_group`/`create_item` only. */
  target_group_id?: number;
  /** `notify_person` only, a fixed recipient. */
  notify_user_id?: number;
  /** `notify_person` only, resolved to whoever a people column currently holds on the triggering item. */
  notify_from_people_column_id?: number;
  /** `set_column_value` only: which column to write. */
  target_column_id?: number;
  /** `set_column_value` only: the value to write into `target_column_id`. */
  value?: unknown;
  /** `create_item` only: the new item's name, defaulting to "New item". */
  item_name?: string;
  /** Communication actions: the message template, with tokens such as `{item_name}`. Blank uses the default sentence for the trigger. */
  message?: string | null;
  /** `send_email` only: the email subject, `{item_name}` and `{board_name}` are filled in. */
  subject?: string | null;
  /** `slack_notify_channel` only: the Slack channel id to post to. */
  slack_channel_id?: string;
  /** `slack_notify_channel` only: the channel name, kept just so the list can show it without asking Slack. */
  slack_channel_name?: string | null;
};

export type BoardAutomationDto = {
  id: number;
  board_id: number;
  board_view_id: number;
  name: string | null;
  is_enabled: boolean;
  trigger_type: BoardAutomationTriggerType;
  /** Null for `item_created`/`subitem_created`/`update_posted`, which watch no column. */
  trigger_column_id: number | null;
  /** The matched status/label option id (`status_changed`) or a specific person id to watch for (`person_assigned`, null meaning "anyone"). Null for every other trigger. */
  trigger_value: string | null;
  action_type: BoardAutomationActionType;
  action_params: BoardAutomationActionParams;
  created_at: string | null;
};

export type CreateBoardAutomationPayload = {
  view_id: number;
  name?: string | null;
  is_enabled?: boolean;
  trigger_type: BoardAutomationTriggerType;
  trigger_column_id?: number | null;
  trigger_value?: string | null;
  action_type: BoardAutomationActionType;
  action_params: BoardAutomationActionParams;
};

export type UpdateBoardAutomationPayload = Partial<Omit<CreateBoardAutomationPayload, "view_id" | "trigger_type" | "trigger_column_id">>;
