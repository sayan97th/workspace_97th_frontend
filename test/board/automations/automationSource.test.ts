import { describe, expect, it } from "vitest";
import { automationKind, automationSource } from "@/components/board/integrations/manage/manageFormat";
import { actionSections, triggerSections } from "@/components/board/automations/builder/automationCatalog";
import { buttonActionEntries } from "@/components/board/automations/builder/buttonFlowCatalog";
import type { BoardAutomationActionType, BoardAutomationDto, BoardAutomationTriggerType } from "@/types/board-automation";

const automation = (trigger_type: BoardAutomationTriggerType, action_types: BoardAutomationActionType[]): BoardAutomationDto =>
  ({ trigger_type, action_type: action_types[0], actions: action_types.map((type) => ({ type, params: {} })) }) as unknown as BoardAutomationDto;

describe("Automations and Integrations split", () => {
  it("keeps automations that stay inside the app as board automations", () => {
    expect(automationKind(automation("status_changed", ["move_to_group"]))).toBe("board");
    expect(automationSource(automation("item_created", ["post_update"]))).toBe("board");
  });

  it("files every automation that reaches an outside app under integrations", () => {
    expect(automationKind(automation("status_changed", ["send_email"]))).toBe("email");
    expect(automationKind(automation("email_received", ["create_item"]))).toBe("email");
    expect(automationKind(automation("item_created", ["slack_notify_channel"]))).toBe("slack");
    expect(automationKind(automation("item_created_or_updated", ["google_calendar_sync"]))).toBe("calendar");
    expect(automationSource(automation("item_created_or_updated", ["google_calendar_sync"]))).toBe("integrations");
    expect(automationSource(automation("recurring", ["send_digest"]))).toBe("integrations");
  });

  it("hides integration triggers and actions from the Automations dialog's pickers", () => {
    const action_ids = actionSections({ only_itemless: false, is_slack_connected: true, allow_integrations: false }).flatMap((section) => section.entries.map((entry) => entry.id));
    expect(action_ids).not.toContain("send_email");
    expect(action_ids).not.toContain("slack_notify_channel");
    expect(action_ids).not.toContain("google_calendar_sync");
    expect(action_ids).toContain("move_to_group");
    expect(triggerSections(false).flatMap((section) => section.entries.map((entry) => entry.id))).not.toContain("email_received");
    expect(triggerSections().flatMap((section) => section.entries.map((entry) => entry.id))).toContain("email_received");
    expect(buttonActionEntries(true, false).some((entry) => entry.picker_id === "send_email")).toBe(false);
  });
});
