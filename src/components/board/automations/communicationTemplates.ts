import type { BoardAutomationActionType, BoardAutomationTriggerType } from "@/types/board-automation";

/** How an automation reaches people outside the app. */
export type CommunicationChannel = "email" | "slack_channel" | "slack_person";

export type CommunicationTrigger = Extract<
  BoardAutomationTriggerType,
  "status_changed" | "date_arrived" | "item_created" | "subitem_created" | "person_assigned" | "column_changed" | "update_posted"
>;

export type CommunicationTemplate = {
  id: string;
  trigger: CommunicationTrigger;
  channel: CommunicationChannel;
  /** Card title, `**bold**` marks the words the card highlights. */
  title: string;
  /** Lower case text the search box matches against. */
  search_text: string;
};

export const CHANNEL_LABELS: Record<CommunicationChannel, string> = {
  email: "Email",
  slack_channel: "Slack",
  slack_person: "Slack",
};

export const CHANNEL_ACTION_TYPES: Record<CommunicationChannel, BoardAutomationActionType> = {
  email: "send_email",
  slack_channel: "slack_notify_channel",
  slack_person: "slack_notify_person",
};

const TRIGGER_PHRASES: Record<CommunicationTrigger, string> = {
  status_changed: "When **status** changes to **something**",
  date_arrived: "When **date** arrives",
  item_created: "When an **item is created**",
  subitem_created: "When a **subitem is created**",
  person_assigned: "When **someone is assigned**",
  column_changed: "When a **column** changes",
  update_posted: "When an **update is posted**",
};

const CHANNEL_PHRASES: Record<CommunicationChannel, string> = {
  email: "send an **email** to **someone**",
  slack_channel: "**notify** in **channel**",
  slack_person: "**notify** **user** on Slack",
};

const TRIGGER_ORDER: CommunicationTrigger[] = [
  "status_changed",
  "date_arrived",
  "item_created",
  "subitem_created",
  "person_assigned",
  "column_changed",
  "update_posted",
];
const CHANNEL_ORDER: CommunicationChannel[] = ["email", "slack_channel", "slack_person"];

/** Every trigger paired with every channel, the templates shown under the automations "Communication" category. */
export const COMMUNICATION_TEMPLATES: CommunicationTemplate[] = TRIGGER_ORDER.flatMap((trigger) =>
  CHANNEL_ORDER.map((channel) => {
    const title = `${TRIGGER_PHRASES[trigger]}, ${CHANNEL_PHRASES[channel]}`;
    return {
      id: `${trigger}:${channel}`,
      trigger,
      channel,
      title,
      search_text: `${title.replaceAll("**", "")} ${CHANNEL_LABELS[channel]}`.toLowerCase(),
    };
  })
);

/** The placeholders a message template may contain, shown as insert buttons in the form. */
export const MESSAGE_TOKENS: { token: string; label: string; triggers?: CommunicationTrigger[] }[] = [
  { token: "{item_name}", label: "Item name" },
  { token: "{board_name}", label: "Board name" },
  { token: "{actor_name}", label: "Who did it" },
  { token: "{column_name}", label: "Column name", triggers: ["status_changed", "date_arrived", "person_assigned", "column_changed"] },
  { token: "{new_value}", label: "New value", triggers: ["status_changed", "date_arrived", "person_assigned", "column_changed"] },
  { token: "{old_value}", label: "Old value", triggers: ["status_changed", "person_assigned", "column_changed"] },
  { token: "{update_text}", label: "Update text", triggers: ["update_posted"] },
];

/** Splits a `**bold**` marked title into alternating plain and bold segments. */
export function splitTitle(title: string): { text: string; is_bold: boolean }[] {
  return title
    .split("**")
    .map((text, index) => ({ text, is_bold: index % 2 === 1 }))
    .filter((segment) => segment.text !== "");
}
