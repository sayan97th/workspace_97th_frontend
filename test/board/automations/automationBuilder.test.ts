import { describe, expect, test } from "vitest";
import type { BoardAutomationDto } from "@/types/board-automation";
import type { AutomationBuilderContext } from "@/components/board/automations/builder/automationCatalog";
import {
  actionFromPicker,
  draftFromAutomation,
  draftProblems,
  draftToDefinition,
  emptyAction,
  emptyDraft,
  isConditionComplete,
} from "@/components/board/automations/builder/builderDraft";
import { describeDefinition, offsetLabel, scheduleLabel, sentenceText } from "@/components/board/automations/builder/automationSentence";
import { AUTOMATION_RECIPES } from "@/components/board/automations/builder/automationTemplates";

const context: AutomationBuilderContext = {
  board_id: 1,
  columns: [
    { id: "10", title: "Status", kind: "status", width: 140, scope: "item", options: [{ id: "done", label: "Done", color: "#00c875" }, { id: "stuck", label: "Stuck", color: "#e2445c" }] },
    { id: "11", title: "Owner", kind: "people", width: 140, scope: "item" },
    { id: "12", title: "Due date", kind: "date", width: 140, scope: "item" },
    { id: "13", title: "Budget", kind: "number", width: 140, scope: "item" },
    { id: "20", title: "Status", kind: "status", width: 140, scope: "subitem", options: [{ id: "done", label: "Done", color: "#00c875" }] },
  ],
  groups: [{ id: "100", label: "To do" }, { id: "101", label: "Completed" }],
  people: [{ id: "7", name: "Amanda", initials: "A", color: "#579bfc" }],
  board_targets: [{ id: 2, label: "Requests", groups: [{ id: 200, name: "Inbox" }] }],
  slack_channels: [],
  is_slack_connected: false,
};

const makeAutomation = (overrides: Partial<BoardAutomationDto> = {}): BoardAutomationDto => ({
  id: 5,
  board_id: 1,
  board_view_id: 1,
  name: null,
  description: null,
  is_enabled: true,
  importance: "minor",
  trigger_type: "status_changed",
  trigger_column_id: 10,
  trigger_value: "done",
  trigger_config: {},
  conditions: [],
  action_type: "move_to_group",
  action_params: { target_group_id: 101 },
  actions: [{ type: "move_to_group", params: { target_group_id: 101 } }],
  created_at: null,
  updated_at: null,
  run_count: 0,
  last_run_at: null,
  created_by: null,
  ...overrides,
});

describe("draftProblems", () => {
  test("an empty draft asks for a trigger and an action", () => {
    expect(draftProblems(emptyDraft(), context)).toEqual(["Choose what starts the automation.", "Choose what action 1 does."]);
  });

  test("a complete status to move automation has no problems", () => {
    const draft = draftFromAutomation(makeAutomation(), context);
    expect(draftProblems(draft, context)).toEqual([]);
  });

  test("an unfinished condition and a missing group are both reported", () => {
    const draft = draftFromAutomation(makeAutomation({ actions: [{ type: "move_to_group", params: {} }] }), context);
    draft.conditions = [{ key: "c1", column_id: "13", condition: "greater_than", value: "", values: [] }];
    expect(draftProblems(draft, context)).toEqual(["Finish or remove condition 1.", "Choose the group for action 1."]);
  });

  test("a recurring automation needs create item before actions that need an item", () => {
    const draft = { ...emptyDraft(), trigger_type: "recurring" as const, trigger_config: { schedule: { frequency: "daily" as const, time: "09:00" } } };
    draft.actions = [{ ...actionFromPicker("archive_item", context) }];
    expect(draftProblems(draft, context)).toContain('This trigger has no item, add "create item" before action 1.');

    draft.actions = [{ ...actionFromPicker("create_item", context), params: { target_group_id: 100 } }, actionFromPicker("archive_item", context)];
    expect(draftProblems(draft, context)).toEqual([]);
  });

  test("a weekly schedule needs a weekday", () => {
    const draft = { ...emptyDraft(), trigger_type: "recurring" as const, trigger_config: { schedule: { frequency: "weekly" as const, weekdays: [] } } };
    draft.actions = [{ ...actionFromPicker("notify_person", context), params: { notify_user_id: 7 } }];
    expect(draftProblems(draft, context)).toEqual(["Choose at least one day of the week."]);
  });
});

describe("conversions", () => {
  test("change status is kept apart from change column value when an automation is read back", () => {
    const draft = draftFromAutomation(makeAutomation({ actions: [{ type: "set_column_value", params: { target_column_id: 10, value: "done" } }, { type: "set_column_value", params: { target_column_id: 13, value: 5 } }] }), context);
    expect(draft.actions.map((action) => action.picker_id)).toEqual(["change_status", "set_column_value"]);
  });

  test("the saved definition keeps only complete conditions, numbers for ids and trimmed subitem names", () => {
    const draft = draftFromAutomation(makeAutomation(), context);
    draft.conditions = [
      { key: "a", column_id: "13", condition: "greater_than", value: "10", values: [] },
      { key: "b", column_id: "", condition: "", value: "", values: [] },
    ];
    draft.actions = [...draft.actions, { ...emptyAction(), picker_id: "create_subitem", type: "create_subitem", params: { subitem_names: [" Plan ", "", "Build"] } }];

    const definition = draftToDefinition(draft);
    expect(definition.trigger_column_id).toBe(10);
    expect(definition.conditions).toEqual([{ column_id: "13", condition: "greater_than", value: "10", values: [] }]);
    expect(definition.actions[1]).toEqual({ type: "create_subitem", params: { subitem_names: ["Plan", "Build"] } });
  });

  test("a date trigger is saved with the viewer's time zone", () => {
    const draft = { ...emptyDraft(), trigger_type: "date_arrived" as const, trigger_column_id: "12", trigger_config: { offset_days: -2 } };
    draft.actions = [{ ...actionFromPicker("notify_person", context), params: { notify_from_people_column_id: 11 } }];
    const definition = draftToDefinition(draft);
    expect(definition.trigger_config?.offset_days).toBe(-2);
    expect(typeof definition.trigger_config?.timezone).toBe("string");
  });

  test("valueless conditions are complete without a value, between needs both bounds", () => {
    expect(isConditionComplete({ column_id: "13", condition: "is_empty", value: "", values: [] })).toBe(true);
    expect(isConditionComplete({ column_id: "13", condition: "between", value: "", values: ["1"] })).toBe(false);
    expect(isConditionComplete({ column_id: "13", condition: "between", value: "", values: ["1", "5"] })).toBe(true);
  });
});

describe("sentences", () => {
  test("a multi action automation with a condition reads like monday", () => {
    const text = sentenceText(
      describeDefinition(
        {
          trigger_type: "status_changed",
          trigger_column_id: 10,
          trigger_value: "done",
          trigger_config: { from_value: "stuck" },
          conditions: [{ column_id: "13", condition: "greater_than", value: "10", values: [] }],
          actions: [
            { type: "notify_person", params: { notify_user_id: 7 } },
            { type: "move_to_group", params: { target_group_id: 101 } },
            { type: "create_item", params: { target_board_id: 2, target_group_id: 200 } },
          ],
        },
        context
      )
    );
    expect(text).toBe("When Status changes from Stuck to Done and only if Budget > 10, notify Amanda, move item to Completed and create an item in Inbox on Requests");
  });

  test("date offsets and schedules read as words", () => {
    expect(offsetLabel(0)).toBe("arrives");
    expect(offsetLabel(-3)).toBe("is 3 days away");
    expect(offsetLabel(1)).toBe("passed 1 day ago");
    expect(scheduleLabel({ frequency: "weekly", weekdays: [1, 5], time: "09:00" })).toBe("Monday, Friday at 09:00");
    expect(scheduleLabel({ frequency: "monthly", day_of_month: 15 })).toBe("month on day 15");
  });

  test("a subitem column is named as such", () => {
    const text = sentenceText(describeDefinition({ trigger_type: "status_changed", trigger_column_id: 20, trigger_value: null, trigger_config: null, conditions: [], actions: [{ type: "archive_item", params: {} }] }, context));
    expect(text).toBe("When subitem Status changes to anything, archive item");
  });
});

describe("templates", () => {
  test("every built-in recipe builds a definition with at least one action", () => {
    for (const recipe of AUTOMATION_RECIPES) {
      const definition = recipe.build(context);
      expect(definition.actions.length, recipe.id).toBeGreaterThan(0);
      expect(definition.trigger_type, recipe.id).toBeTruthy();
    }
  });

  test("recipes pick the first column of the right kind", () => {
    const status_move = AUTOMATION_RECIPES.find((recipe) => recipe.id === "status_move")!.build(context);
    expect(status_move.trigger_column_id).toBe(10);
    const subitem_parent = AUTOMATION_RECIPES.find((recipe) => recipe.id === "all_subitems_done")!.build(context);
    expect(subitem_parent.trigger_column_id).toBe(20);
  });
});
