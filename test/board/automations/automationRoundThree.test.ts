import { describe, expect, test } from "vitest";
import type { AccountAutomationTemplateDto, BoardAutomationDto } from "@/types/board-automation";
import type { AutomationBuilderContext } from "@/components/board/automations/builder/automationCatalog";
import {
  actionFromPicker,
  draftFromAutomation,
  draftProblems,
  draftToDefinition,
  emptyAction,
  emptyCondition,
  emptyConditionGroup,
  emptyDraft,
  type AutomationDraft,
} from "@/components/board/automations/builder/builderDraft";
import {
  columnTokensFromDisplay,
  columnTokensToDisplay,
  describeDefinition,
  recipientLabel,
  sentenceText,
} from "@/components/board/automations/builder/automationSentence";
import { countAutomationsByColumn, draftForColumn, triggerForColumn } from "@/components/board/automations/builder/automationColumns";
import { definitionFromAccountTemplate } from "@/components/board/automations/builder/accountTemplates";

const context: AutomationBuilderContext = {
  board_id: 1,
  columns: [
    { id: "10", title: "Status", kind: "status", width: 140, scope: "item", options: [{ id: "done", label: "Done", color: "#00c875" }] },
    { id: "11", title: "Owner", kind: "people", width: 140, scope: "item" },
    { id: "12", title: "Budget", kind: "number", width: 140, scope: "item" },
    { id: "13", title: "Approve", kind: "button", width: 140, scope: "item", button: { label: "Approve", color: "#00c875" } },
    { id: "14", title: "Launch list", kind: "checklist", width: 140, scope: "item" },
    { id: "15", title: "Client email", kind: "email", width: 140, scope: "item" },
    { id: "20", title: "Status", kind: "status", width: 140, scope: "subitem", options: [{ id: "sub_done", label: "Done", color: "#00c875" }] },
  ],
  groups: [{ id: "100", label: "To do" }],
  people: [
    { id: "7", name: "Ada", initials: "A", color: "#579bfc" },
    { id: "8", name: "Grace", initials: "G", color: "#00c875" },
  ],
  board_targets: [],
  slack_channels: [],
  is_slack_connected: false,
};

const statusDraft = (patch: Partial<AutomationDraft> = {}): AutomationDraft => ({
  ...emptyDraft(),
  trigger_type: "status_changed",
  trigger_column_id: "10",
  actions: [{ ...actionFromPicker("archive_item", context) }],
  ...patch,
});

describe("condition groups and the otherwise branch", () => {
  test("groups and else actions are saved, empty groups dropped", () => {
    const complete_rule = { ...emptyCondition(), column_id: "12", condition: "greater_than", value: "1000" };
    const draft = statusDraft({
      conditions: [complete_rule],
      condition_operator: "or",
      condition_groups: [
        { ...emptyConditionGroup(), join_operator: "and", rules: [{ ...emptyCondition(), column_id: "name", condition: "contains", value: "VIP" }] },
        { ...emptyConditionGroup(), rules: [] },
      ],
      else_actions: [actionFromPicker("delete_item", context)],
    });

    expect(draftProblems(draft, context)).toEqual([]);
    const definition = draftToDefinition(draft);
    expect(definition.condition_operator).toBe("or");
    expect(definition.condition_groups).toHaveLength(1);
    expect(definition.else_actions).toEqual([{ type: "delete_item", params: {} }]);
    expect(sentenceText(describeDefinition(definition, context))).toBe(
      "When Status changes to anything and only if Budget > 1000 or (Item name contains VIP), archive item, otherwise delete item"
    );
  });

  test("a recurring trigger never saves otherwise actions", () => {
    const draft: AutomationDraft = {
      ...emptyDraft(),
      trigger_type: "recurring",
      trigger_config: { schedule: { frequency: "daily", time: "09:00" } },
      actions: [actionFromPicker("create_group", context)],
      else_actions: [actionFromPicker("create_group", context)],
    };
    expect(draftToDefinition(draft).else_actions).toEqual([]);
  });

  test("an incomplete otherwise action and too long waits are reported", () => {
    const wait = { ...actionFromPicker("wait", context), params: { amount: 20, unit: "days" as const } };
    const draft = statusDraft({
      conditions: [{ ...emptyCondition(), column_id: "12", condition: "is_not_empty" }],
      actions: [wait, { ...wait, key: "second" }, actionFromPicker("archive_item", context)],
      else_actions: [emptyAction()],
    });
    expect(draftProblems(draft, context)).toEqual(['Choose what "otherwise" action 1 does.', "The waits of one branch may add up to 30 days at most."]);
  });

  test("saved automations read their groups, branch and failure alert back", () => {
    const automation: BoardAutomationDto = {
      id: 1, board_id: 1, board_view_id: 1, name: null, description: null, is_enabled: true, importance: "minor",
      trigger_type: "status_changed", trigger_column_id: 10, trigger_value: null, trigger_config: {},
      conditions: [], condition_operator: "or",
      condition_groups: [{ join_operator: "or", rules: [{ column_id: "12", condition: "is_empty", value: "", values: [] }] }],
      action_type: "archive_item", action_params: {}, actions: [{ type: "archive_item", params: {} }],
      else_actions: [{ type: "notify_person", params: { notify_user_id: 7 } }], failure_alert: "app_and_email",
      created_at: null, updated_at: null, run_count: 0, last_run_at: null, created_by: null,
    };
    const draft = draftFromAutomation(automation, context);
    expect(draft.condition_operator).toBe("or");
    expect(draft.condition_groups[0].rules[0].column_id).toBe("12");
    expect(draft.else_actions[0].type).toBe("notify_person");
    expect(draft.failure_alert).toBe("app_and_email");
  });
});

describe("new triggers and actions", () => {
  test("a number threshold needs its number, and reads as a sentence", () => {
    const draft: AutomationDraft = { ...emptyDraft(), trigger_type: "number_threshold", trigger_column_id: "12", trigger_config: { operator: "above", threshold: null }, actions: [actionFromPicker("archive_item", context)] };
    expect(draftProblems(draft, context)).toEqual(["Enter the number the column must reach."]);

    const ready = { ...draft, trigger_config: { operator: "below" as const, threshold: 50 } };
    expect(draftProblems(ready, context)).toEqual([]);
    expect(sentenceText(describeDefinition(draftToDefinition(ready), context))).toBe("When Budget goes below 50, archive item");
  });

  test("flow actions start with sensible params and say what is missing", () => {
    expect(actionFromPicker("wait", context).params).toEqual({ amount: 1, unit: "days", recheck_conditions: false });
    expect(actionFromPicker("add_checklist_items", context).params).toEqual({ tasks: [], target_column_id: 14 });
    expect(actionFromPicker("set_subitems_value", context).params).toEqual({ target_column_id: 20 });

    const draft = statusDraft({
      actions: [actionFromPicker("assign_round_robin", context), actionFromPicker("shift_dependents", context), actionFromPicker("add_checklist_items", context)],
    });
    expect(draftProblems(draft, context)).toEqual([
      "Choose the people action 1 assigns in turn.",
      "Choose the column for action 2.",
      "Write the tasks action 3 adds.",
    ]);
  });

  test("emails can go to an email column and typed addresses, bad addresses are caught", () => {
    const email = { ...actionFromPicker("send_email", context), params: { email_column_id: 15, email_addresses: ["boss@example.com"] } };
    expect(draftProblems(statusDraft({ actions: [email] }), context)).toEqual([]);
    expect(recipientLabel(context, email.params)).toBe("the address in Client email and boss@example.com");

    const broken = { ...email, params: { email_addresses: ["not an email"] } };
    expect(draftProblems(statusDraft({ actions: [broken] }), context)).toEqual(["Fix the email addresses of action 1."]);
    expect(draftToDefinition(statusDraft({ actions: [{ ...email, params: { email_addresses: [" a@b.co ", ""] } }] })).actions[0].params).toEqual({ email_addresses: ["a@b.co"] });
  });
});

describe("column tokens", () => {
  test("messages show column titles and save column ids", () => {
    expect(columnTokensToDisplay("Now {column:10} for {item_name}", context)).toBe("Now {#Status} for {item_name}");
    expect(columnTokensFromDisplay("Budget is {#budget}, {#Unknown}", context)).toBe("Budget is {column:12}, {#Unknown}");
  });
});

describe("column shortcuts", () => {
  test("each column kind opens the trigger that fits it", () => {
    expect(triggerForColumn(context.columns[3])).toBe("button_clicked");
    expect(triggerForColumn(context.columns[4])).toBe("checklist_completed");
    expect(triggerForColumn(context.columns[2])).toBe("number_threshold");
    expect(triggerForColumn(context.columns[5])).toBe("column_changed");
    expect(draftForColumn("12", context)).toMatchObject({ trigger_type: "number_threshold", trigger_column_id: "12", trigger_config: { operator: "above", threshold: null } });
  });

  test("automations are counted on every column they use", () => {
    const base = { id: 1, board_id: 1, board_view_id: 1, name: null, description: null, is_enabled: true, importance: "minor" as const, trigger_value: null, trigger_config: {}, created_at: null, updated_at: null, run_count: 0, last_run_at: null, created_by: null };
    const automations: BoardAutomationDto[] = [
      { ...base, trigger_type: "status_changed", trigger_column_id: 10, conditions: [{ column_id: "12", condition: "is_empty", value: "", values: [] }], action_type: "set_column_value", action_params: {}, actions: [{ type: "set_column_value", params: { target_column_id: 10, value: "done" } }] },
      { ...base, id: 2, trigger_type: "item_created", trigger_column_id: null, conditions: [], action_type: "send_email", action_params: {}, actions: [{ type: "send_email", params: { email_column_id: 15 } }], else_actions: [] },
    ];
    expect(countAutomationsByColumn(automations)).toEqual({ "10": 1, "12": 1, "15": 1 });
  });
});

describe("account templates", () => {
  test("column places are filled with columns of this table, conditions without one are dropped", () => {
    const template: AccountAutomationTemplateDto = {
      id: 1,
      name: "Done to owner",
      description: null,
      created_at: null,
      definition: {
        trigger_type: "status_changed",
        trigger_column_id: null,
        trigger_value: null,
        trigger_config: null,
        conditions: [{ column_id: "", condition: "is_not_empty", value: "", values: [] }],
        condition_groups: [{ join_operator: "and", rules: [{ column_id: "", condition: "is_empty", value: "", values: [] }] }],
        actions: [{ type: "notify_person", params: {} }],
      },
      column_kinds: {
        trigger_column_id: { type: "status", scope: "item" },
        "conditions.0.column_id": { type: "timeline", scope: "item" },
        "condition_groups.0.rules.0.column_id": { type: "number", scope: "item" },
        "actions.0.params.notify_from_people_column_id": { type: "people", scope: "item" },
      },
    };

    const { definition, missing } = definitionFromAccountTemplate(template, context);
    expect(definition.trigger_column_id).toBe(10);
    expect(definition.actions[0].params.notify_from_people_column_id).toBe(11);
    expect(definition.conditions).toEqual([]);
    expect(definition.condition_groups?.[0].rules[0].column_id).toBe("12");
    expect(missing).toEqual([{ type: "timeline", scope: "item" }]);
  });
});
