import type { CommunicationChannel, CommunicationTrigger } from "../communicationTemplates";

/** Where a Slack recipe delivers: a channel of the chosen Slack account, or people as direct messages. */
export type SlackRecipeTarget = "channel" | "person";

/** The clickable words of a recipe sentence, each opens its own picker. */
export type SlackRecipeSlot = "trigger_column" | "trigger_value" | "message" | "channel" | "recipient";

export type SlackRecipePart = { text: string } | { slot: SlackRecipeSlot; placeholder: string };

export type SlackRecipe = {
  id: string;
  trigger: CommunicationTrigger;
  target: SlackRecipeTarget;
  /** The sentence, plain words and clickable slots, like monday's "When **date** arrives, **notify** in **channel**". */
  parts: SlackRecipePart[];
  /** Card title, `**bold**` marks the slots. */
  title: string;
  /** Lower case text the search box matches against. */
  search_text: string;
  /** Prefilled message, empty keeps the API's default message for the trigger. */
  default_message: string;
};

const text = (value: string): SlackRecipePart => ({ text: value });
const slot = (name: SlackRecipeSlot, placeholder: string): SlackRecipePart => ({ slot: name, placeholder });

/** The trigger half of every sentence. */
const TRIGGER_PARTS: Record<CommunicationTrigger, SlackRecipePart[]> = {
  date_arrived: [text("When "), slot("trigger_column", "date"), text(" arrives")],
  item_created: [text("When an "), slot("trigger_column", "item is created")],
  status_changed: [text("When "), slot("trigger_column", "status"), text(" changes to "), slot("trigger_value", "something")],
  column_changed: [text("When "), slot("trigger_column", "a column"), text(" changes")],
  update_posted: [text("When an "), slot("trigger_column", "update is posted")],
  person_assigned: [text("When a person is assigned in "), slot("trigger_column", "a people column")],
  subitem_created: [text("When a "), slot("trigger_column", "subitem is created")],
};

/** Triggers without a column, their bold words are only a highlight and open nothing. */
export const COLUMNLESS_TRIGGERS: CommunicationTrigger[] = ["item_created", "update_posted", "subitem_created"];

const CHANNEL_ORDER: CommunicationTrigger[] = ["date_arrived", "item_created", "status_changed", "column_changed", "update_posted", "person_assigned", "subitem_created"];
const PERSON_ORDER: CommunicationTrigger[] = ["status_changed", "item_created", "date_arrived", "column_changed", "person_assigned", "update_posted"];

const actionParts = (trigger: CommunicationTrigger, target: SlackRecipeTarget): SlackRecipePart[] => {
  if (target === "person") return [text(", "), slot("message", "notify"), text(" "), slot("recipient", "someone"), text(" on Slack")];
  if (trigger === "update_posted") return [text(", "), slot("message", "send it"), text(" to "), slot("channel", "channel")];
  return [text(", "), slot("message", "notify"), text(" in "), slot("channel", "channel")];
};

const titleOf = (parts: SlackRecipePart[]) => parts.map((part) => ("text" in part ? part.text : `**${part.placeholder}**`)).join("");

const buildRecipe = (trigger: CommunicationTrigger, target: SlackRecipeTarget): SlackRecipe => {
  const parts = [...TRIGGER_PARTS[trigger], ...actionParts(trigger, target)];
  const title = titleOf(parts);

  return {
    id: `slack:${trigger}:${target}`,
    trigger,
    target,
    parts,
    title,
    search_text: `${title.replaceAll("**", "")} slack`.toLowerCase(),
    // "send it to channel" forwards the update itself.
    default_message: trigger === "update_posted" && target === "channel" ? "{update_text}" : "",
  };
};

/** The Slack app page of the Automations center: channel recipes first, then direct message ones, like monday.com. */
export const SLACK_RECIPES: SlackRecipe[] = [
  ...CHANNEL_ORDER.map((trigger) => buildRecipe(trigger, "channel")),
  ...PERSON_ORDER.map((trigger) => buildRecipe(trigger, "person")),
];

/** The recipe behind a Slack communication template, so both dialogs open the same flow. */
export function slackRecipeFor(trigger: CommunicationTrigger, channel: CommunicationChannel): SlackRecipe | null {
  if (channel === "email") return null;
  return buildRecipe(trigger, channel === "slack_channel" ? "channel" : "person");
}

/** The template card badge of a recipe. */
export const recipeChannel = (recipe: SlackRecipe): CommunicationChannel => (recipe.target === "channel" ? "slack_channel" : "slack_person");
