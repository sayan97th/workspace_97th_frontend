import { describe, expect, test } from "vitest";
import type { AutomationBuilderContext } from "@/components/board/automations/builder/automationCatalog";
import { recipientSourcesFor } from "@/components/board/automations/builder/automationCatalog";
import { actionFromPicker, draftProblems, draftToDefinition, emptyDraft, isConditionComplete, type AutomationDraft } from "@/components/board/automations/builder/builderDraft";
import { describeDefinition, dynamicLabel, keywordsLabel, recipientLabel, sentenceText } from "@/components/board/automations/builder/automationSentence";
import { canUseDynamicCondition, conditionDynamicFamily } from "@/components/board/automations/builder/dynamicValues";

const context: AutomationBuilderContext = {
  board_id: 1,
  columns: [
    { id: "10", title: "Status", kind: "status", width: 140, scope: "item", options: [{ id: "done", label: "Done", color: "#00c875" }] },
    { id: "11", title: "Owner", kind: "people", width: 140, scope: "item" },
    { id: "12", title: "Due date", kind: "date", width: 140, scope: "item" },
    { id: "13", title: "Budget", kind: "number", width: 140, scope: "item" },
    { id: "14", title: "Cost", kind: "number", width: 140, scope: "item" },
    { id: "15", title: "Tasks", kind: "longtext", width: 140, scope: "item" },
    { id: "20", title: "Stage", kind: "status", width: 140, scope: "subitem", options: [{ id: "ready", label: "Ready", color: "#00c875" }] },
  ],
  groups: [{ id: "100", label: "To do" }],
  people: [{ id: "7", name: "Amanda", initials: "A", color: "#579bfc" }, { id: "8", name: "Grace", initials: "G", color: "#fdab3d" }],
  board_targets: [],
  slack_channels: [],
  is_slack_connected: false,
  teams: [{ id: 3, name: "Design", member_count: 4 }],
};

const withTrigger = (patch: Partial<AutomationDraft>): AutomationDraft => ({ ...emptyDraft(), ...patch });

describe("subitem column trigger", () => {
  test("reads as a sentence and runs on the parent by default", () => {
    const draft = withTrigger({ trigger_type: "subitem_column_changed", trigger_column_id: "20", trigger_config: { run_on: "parent", match: { operator: "is", values: ["ready"] } }, actions: [actionFromPicker("notify_subscribers", context)] });
    const text = sentenceText(describeDefinition(draftToDefinition(draft), context));
    expect(text).toContain("When subitem Stage changes to Ready, on the parent item");
    expect(text).toContain("notify the item's subscribers");
    expect(draftProblems(draft, context)).toEqual([]);
  });

  test("asks for both ends of a range", () => {
    const draft = withTrigger({ trigger_type: "subitem_column_changed", trigger_column_id: "20", trigger_config: { match: { operator: "between", values: ["1", ""] } }, actions: [actionFromPicker("archive_item", context)] });
    expect(draftProblems(draft, context)).toContain("Enter both ends of the range the column must reach.");
  });
});

describe("update triggers", () => {
  test("a keyword trigger needs at least one keyword", () => {
    const draft = withTrigger({ trigger_type: "update_keyword", trigger_config: { keywords: [" "], include_replies: true }, actions: [actionFromPicker("archive_item", context)] });
    expect(draftProblems(draft, context)).toContain("Type at least one word the update must contain.");
  });

  test("keywords and mentions read as words", () => {
    expect(keywordsLabel(["urgent", "blocked"])).toBe('"urgent" or "blocked"');
    expect(keywordsLabel(["a", "b", "c", "d", "e"])).toBe('"a" or "b" or "c" or 2 more');
    const draft = withTrigger({ trigger_type: "user_mentioned", trigger_value: 8, actions: [{ ...actionFromPicker("assign_person", context), params: { target_column_id: 11, assign_mode: "actor" } }] });
    expect(sentenceText(describeDefinition(draftToDefinition(draft), context))).toContain("When Grace is mentioned in an update");
  });

  test("only a mention trigger offers the mentioned person", () => {
    expect(recipientSourcesFor("user_mentioned", true)).toContain("mentioned");
    expect(recipientSourcesFor("status_changed", true)).not.toContain("mentioned");
    expect(recipientSourcesFor("recurring", false)).toEqual(["owner"]);
  });
});

describe("dynamic values", () => {
  test("a dynamic condition is complete once its source is known", () => {
    expect(isConditionComplete({ column_id: "12", condition: "before", value: "", values: [], dynamic: { source: "today", offset_days: 3 } })).toBe(true);
    expect(isConditionComplete({ column_id: "13", condition: "greater_than", value: "", values: [], dynamic: { source: "column" } })).toBe(false);
    expect(isConditionComplete({ column_id: "13", condition: "greater_than", value: "", values: [], dynamic: { source: "column", column_id: 14 } })).toBe(true);
  });

  test("the definition keeps the dynamic value and drops stale fixed values", () => {
    const draft = withTrigger({
      trigger_type: "item_created",
      conditions: [{ key: "c1", column_id: "11", condition: "is", value: "", values: ["7"], dynamic: { source: "creator" } }],
      actions: [{ ...actionFromPicker("set_column_value", context), params: { target_column_id: 12, value: null, dynamic_value: { source: "today", offset_days: 7, use_working_days: true } } }],
    });
    const definition = draftToDefinition(draft);
    expect(definition.conditions[0]).toEqual({ column_id: "11", condition: "is", value: "", values: [], dynamic: { source: "creator" } });
    expect(definition.actions[0].params.dynamic_value).toEqual({ source: "today", offset_days: 7, use_working_days: true });
    expect(draftProblems(draft, context)).toEqual([]);
    expect(sentenceText(describeDefinition(definition, context))).toContain("set Due date to today + 7 working days");
  });

  test("labels read like the sentence", () => {
    expect(dynamicLabel(context, { source: "column", column_id: 12, offset_days: -2 })).toBe("the Due date - 2 days");
    expect(dynamicLabel(context, { source: "actor" })).toBe("the person who made the change");
  });

  test("only people, dates, numbers and text compare with a dynamic value", () => {
    expect(conditionDynamicFamily(context, "13")).toBe("number");
    expect(conditionDynamicFamily(context, "__created_by__")).toBe("people");
    expect(conditionDynamicFamily(context, "10")).toBeUndefined();
    expect(canUseDynamicCondition(context, { column_id: "12", condition: "between" })).toBe(false);
    expect(canUseDynamicCondition(context, { column_id: "12", condition: "after" })).toBe(true);
  });
});

describe("people, subitem and digest actions", () => {
  test("subscribe needs someone, unsubscribe everyone does not", () => {
    const subscribe = withTrigger({ trigger_type: "item_created", actions: [actionFromPicker("subscribe_people", context)] });
    expect(draftProblems(subscribe, context)).toContain("Choose who action 1 subscribes.");
    const everyone = withTrigger({ trigger_type: "item_created", actions: [{ ...actionFromPicker("unsubscribe_people", context), params: { everyone: true } }] });
    expect(draftProblems(everyone, context)).toEqual([]);
    const by_source = withTrigger({ trigger_type: "item_created", actions: [{ ...actionFromPicker("subscribe_people", context), params: { recipient_source: "creator", team_id: 3 } }] });
    expect(sentenceText(describeDefinition(draftToDefinition(by_source), context))).toContain("subscribe the team Design and item creator to the item");
  });

  test("a recipient source counts as a recipient", () => {
    const draft = withTrigger({ trigger_type: "item_created", actions: [{ ...actionFromPicker("notify_person", context), params: { recipient_source: "subscribers" } }] });
    expect(draftProblems(draft, context)).toEqual([]);
    expect(recipientLabel(context, { recipient_source: "subscribers" })).toBe("item subscribers");
  });

  test("a digest starts with columns to show and needs recipients and complete rules", () => {
    const digest = actionFromPicker("send_digest", context);
    expect(digest.params.column_ids).toEqual([10, 11, 12]);
    const draft = withTrigger({
      trigger_type: "recurring",
      trigger_config: { schedule: { frequency: "weekly", weekdays: [1], time: "09:00" } },
      actions: [{ ...digest, params: { ...digest.params, digest_rules: [{ column_id: "10", condition: "is_not", value: "", values: [] }] } }],
    });
    expect(draftProblems(draft, context)).toEqual(expect.arrayContaining(["Choose who receives the digest of action 1."]));
    const ready = withTrigger({
      ...draft,
      actions: [{ ...digest, params: { ...digest.params, user_ids: [7], digest_rules: [{ column_id: "10", condition: "is_not", value: "", values: ["done"] }, { column_id: "", condition: "", value: "", values: [] }] } }],
    });
    const definition = draftToDefinition(ready);
    expect(definition.actions[0].params.digest_rules).toEqual([{ column_id: "10", condition: "is_not", value: "", values: ["done"] }]);
    expect(sentenceText(describeDefinition(definition, context))).toContain("email a digest of items where Status is not Done to Amanda");
  });

  test("create subitems accepts a list column instead of names", () => {
    const draft = withTrigger({ trigger_type: "item_created", actions: [{ ...actionFromPicker("create_subitem", context), params: { subitem_names: [], source_column_id: 15 } }] });
    expect(draftProblems(draft, context)).toEqual([]);
    expect(sentenceText(describeDefinition(draftToDefinition(draft), context))).toContain("create subitems one per entry of Tasks");
  });
});
