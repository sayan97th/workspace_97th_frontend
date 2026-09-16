/**
 * API types for the Table Board's rule-based (no AI) automations — mirrors
 * the Laravel `BoardAutomation*` payloads under `App\Http\Controllers\Board\BoardAutomationController`.
 * See `board-content.ts`'s own doc comment for the sibling engine types this pairs with.
 */

export type BoardAutomationTriggerType = "status_changed" | "date_arrived";
export type BoardAutomationActionType = "move_to_group" | "notify_person";

export type BoardAutomationActionParams = {
  /** `move_to_group` only. */
  target_group_id?: number;
  /** `notify_person` only, a fixed recipient. */
  notify_user_id?: number;
  /** `notify_person` only, resolved to whoever a people column currently holds on the triggering item. */
  notify_from_people_column_id?: number;
};

export type BoardAutomationDto = {
  id: number;
  board_id: number;
  board_view_id: number;
  name: string | null;
  is_enabled: boolean;
  trigger_type: BoardAutomationTriggerType;
  trigger_column_id: number;
  /** The matched status/label option id, `status_changed` triggers only. Null for `date_arrived`. */
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
  trigger_column_id: number;
  trigger_value?: string | null;
  action_type: BoardAutomationActionType;
  action_params: BoardAutomationActionParams;
};

export type UpdateBoardAutomationPayload = Partial<Omit<CreateBoardAutomationPayload, "view_id" | "trigger_type" | "trigger_column_id">>;
