import { describe, expect, it } from "vitest";
import { INTEGRATION_APPS, integrationAppMeta, integrationEventOf } from "@/components/board/automations/center/centerNav";
import type { AutomationBuilderContext } from "@/components/board/automations/builder/automationCatalog";
import { emailTemplateRecipe } from "@/components/board/automations/builder/automationTemplates";
import { recipientLabel } from "@/components/board/automations/builder/automationSentence";
import { COMMUNICATION_TEMPLATES } from "@/components/board/automations/communicationTemplates";

describe("Integrations sidebar events", () => {
  it("lists events for every app whose counts add up to its templates", () => {
    for (const app of INTEGRATION_APPS) {
      expect(app.events.length).toBeGreaterThan(0);
      expect(app.events.reduce((total, event) => total + event.count, 0)).toBe(app.template_count);
    }
  });

  it("classifies the Slack recipes by what sets them off", () => {
    const keys = integrationAppMeta("slack").events.map((event) => event.key);
    expect(keys).toEqual(expect.arrayContaining(["status_changed", "date_arrived", "item_created", "column_changed", "update_posted", "person_assigned", "subitem_created"]));
    expect(keys.indexOf("status_changed")).toBeLessThan(keys.indexOf("update_posted"));
  });

  it("shows the time based triggers as one Scheduled event", () => {
    expect(integrationEventOf("recurring")).toBe("scheduled");
    expect(integrationEventOf("item_scan")).toBe("scheduled");
    expect(integrationAppMeta("email").events.some((event) => event.key === "scheduled" && event.label === "Scheduled")).toBe(true);
  });
});

describe("Email templates in the sentence builder", () => {
  const context: AutomationBuilderContext = {
    board_id: 1,
    columns: [
      { id: "11", title: "Status", kind: "status", scope: "item" },
      { id: "12", title: "Owner", kind: "people", scope: "item" },
      { id: "13", title: "Due date", kind: "date", scope: "item" },
    ] as AutomationBuilderContext["columns"],
    groups: [],
    people: [],
    board_targets: [],
    slack_channels: [],
    is_slack_connected: false,
  };

  it("emails the recipient that fits what set it off", () => {
    const recipientFor = (trigger: string, extra: Partial<AutomationBuilderContext> = {}) => {
      const template = COMMUNICATION_TEMPLATES.find((entry) => entry.channel === "email" && entry.trigger === trigger)!;
      const definition = emailTemplateRecipe(template).build({ ...context, ...extra });
      expect(definition.trigger_type).toBe(trigger);
      expect(definition.actions).toHaveLength(1);
      expect(definition.actions[0].type).toBe("send_email");
      return definition.actions[0].params;
    };
    expect(recipientFor("status_changed")).toEqual({ recipient_source: "creator" });
    expect(recipientFor("date_arrived")).toEqual({ notify_from_people_column_id: 12 });
    expect(recipientFor("date_arrived", { columns: context.columns.filter((column) => column.kind !== "people") })).toEqual({ recipient_source: "creator" });
    expect(recipientFor("item_created", { viewer_id: "57" })).toEqual({ notify_user_id: 57 });
    expect(recipientFor("item_created")).toEqual({ recipient_source: "owner" });
    expect(recipientFor("subitem_created", { viewer_id: "57" })).toEqual({ notify_user_id: 57 });
    expect(recipientFor("person_assigned")).toEqual({ notify_from_people_column_id: 12 });
    expect(recipientFor("column_changed")).toEqual({ recipient_source: "subscribers" });
    expect(recipientFor("update_posted")).toEqual({ recipient_source: "subscribers" });
  });

  it("names the recipients in plain words", () => {
    expect(recipientLabel(context, { recipient_source: "creator" })).toBe("the item creator");
    expect(recipientLabel(context, { notify_from_people_column_id: 12 })).toBe("everyone in Owner");
    expect(recipientLabel({ ...context, viewer_id: "57" }, { notify_user_id: 57 })).toBe("Me");
  });

  it("picks the matching column for the trigger", () => {
    const template = (trigger: string) => COMMUNICATION_TEMPLATES.find((entry) => entry.channel === "email" && entry.trigger === trigger)!;
    expect(emailTemplateRecipe(template("date_arrived")).build(context)).toMatchObject({ trigger_column_id: 13, trigger_config: { offset_days: 0 } });
    expect(emailTemplateRecipe(template("status_changed")).build(context).trigger_column_id).toBe(11);
    expect(emailTemplateRecipe(template("item_created")).build(context).trigger_column_id).toBeNull();
  });
});
