/**
 * What the automations of one request changed, see the API's `AutomationEffectCollector`.
 * Arrives two ways: as `automation_effects` on the JSON response of the request that set the
 * automations off, and as the `board_automations_ran` event on the `board-automations.{board_id}`
 * private channel for everyone else with the board open (and for scheduled runs).
 */

/** One finished step of a run that changed something (skipped steps are left out). */
export type AutomationRunLine = {
  /** The run log entry, what "Undo" takes back. Null when the log could not be written. */
  run_log_id: number | null;
  run_uuid: string | null;
  automation_id: number | null;
  automation_name: string | null;
  board_id: number;
  item_id: number | null;
  item_name: string | null;
  action_type: string;
  status: "success" | "failed";
  /** What the step did, e.g. `Moved the item to "Completed".` */
  message: string;
  ran_at: string;
};

export type AutomationBoardEffects = {
  board_id: number;
  /** Root item ids to read again. A requested row that does not come back was archived, deleted or moved away. */
  item_ids: number[];
  /** Groups were created, archived or reordered, so the board reloads its groups too. */
  needs_structure_refresh: boolean;
};

/** The `automation_effects` key of a response. */
export type AutomationEffectsPayload = {
  boards: AutomationBoardEffects[];
  runs: AutomationRunLine[];
  /** Ids of the socket events already sent for these effects, so the board does not apply them twice. */
  broadcast_ids: string[];
};

/** The `board_automations_ran` socket event. */
export type BoardAutomationsRanEvent = AutomationBoardEffects & {
  broadcast_id: string;
  actor_id: number | null;
  runs: AutomationRunLine[];
};

/** What a board receives, from either source. */
export type BoardAutomationEffect = AutomationBoardEffects & {
  runs: AutomationRunLine[];
  /** `self`: the viewer's own change set it off. `others`: someone else, or a scheduled run. */
  source: "self" | "others";
};
