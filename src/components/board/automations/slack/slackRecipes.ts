import type { CommunicationChannel, CommunicationTemplate, CommunicationTrigger } from "../communicationTemplates";

/** Where a Slack recipe delivers: a channel of the chosen Slack account, or people as direct messages. */
export type SlackRecipeTarget = "channel" | "person";

/** Who a direct message recipe can reach: "user" picks people, "someone" also offers people columns and who set it off. */
export type SlackRecipeRecipientKind = "user" | "someone";

/** The clickable words of a recipe sentence, each opens its own picker. */
export type SlackRecipeSlot = "trigger_column" | "trigger_value" | "trigger_item" | "message" | "channel" | "recipient";

export type SlackRecipePart = { text: string } | { slot: SlackRecipeSlot; placeholder: string };

export type SlackRecipe = {
  id: string;
  trigger: CommunicationTrigger;
  target: SlackRecipeTarget;
  /** `update_posted` only: listens to one chosen item ("this item") instead of every item of the board. */
  is_item_scoped: boolean;
  /** Direct message recipes only, null for channel recipes. */
  recipient_kind: SlackRecipeRecipientKind | null;
  /** The sentence, plain words and clickable slots, like monday's "When **date** arrives, **notify** in **channel**". */
  parts: SlackRecipePart[];
  /** Card title, `**bold**` marks the highlighted words, worded exactly like monday.com's Slack app page. */
  title: string;
  /** Lower case text the search box matches against. */
  search_text: string;
  /** The predefined message, in the API's token format, so a recipe works without writing anything. */
  default_message: string;
};

const text = (value: string): SlackRecipePart => ({ text: value });
const slot = (name: SlackRecipeSlot, placeholder: string): SlackRecipePart => ({ slot: name, placeholder });

/** Triggers without a column, they never ask for one. */
export const COLUMNLESS_TRIGGERS: CommunicationTrigger[] = ["item_created", "update_posted", "subitem_created"];

/**
 * The message every recipe starts with, like monday.com's "A new item, {task's Name}, was created in
 * {board.name} board by {user name}". Tokens are filled in by the API's `BoardAutomationMessageRenderer`.
 */
export const SLACK_DEFAULT_MESSAGES: Record<CommunicationTrigger, string> = {
  date_arrived: "{column_name} has arrived for {item_name} in {board_name} board",
  item_created: "A new item, {item_name}, was created in {board_name} board by {actor_name}",
  status_changed: "{column_name} of {item_name} changed to {new_value} in {board_name} board by {actor_name}",
  column_changed: "{column_name} of {item_name} changed to {new_value} in {board_name} board by {actor_name}",
  update_posted: "{actor_name} posted an update on {item_name} in {board_name} board: {update_text}",
  person_assigned: "{new_value} was assigned to {item_name} in {board_name} board by {actor_name}",
  subitem_created: "A new subitem, {item_name}, was created in {board_name} board by {actor_name}",
};

/** The trigger half of the sentences of the featured recipes. */
const TRIGGER_PARTS = {
  date_arrived: [text("When "), slot("trigger_column", "date"), text(" arrives")],
  item_created: [text("When an item is created")],
  status_changed: [text("When "), slot("trigger_column", "a status"), text(" changes to "), slot("trigger_value", "something")],
  column_changed: [text("When "), slot("trigger_column", "a column"), text(" changes")],
  update_posted_in_item: [text("When an update is posted in "), slot("trigger_item", "this item")],
  any_update_posted: [text("When any update is posted")],
} satisfies Record<string, SlackRecipePart[]>;

/** The action half of the sentences of the featured recipes. */
const ACTION_PARTS = {
  notify_in_channel: [text(", "), slot("message", "notify"), text(" in "), slot("channel", "channel")],
  send_to_channel: [text(", "), slot("message", "send it"), text(" to "), slot("channel", "channel")],
  notify_user: [text(", "), slot("message", "notify"), text(" "), slot("recipient", "user")],
  send_to_user: [text(", "), slot("message", "send it"), text(" to "), slot("recipient", "user")],
  notify_someone: [text(", "), slot("message", "notify"), text(" "), slot("recipient", "someone")],
} satisfies Record<string, SlackRecipePart[]>;

type RecipeDefinition = {
  id: string;
  trigger: CommunicationTrigger;
  target: SlackRecipeTarget;
  is_item_scoped?: boolean;
  recipient_kind?: SlackRecipeRecipientKind;
  parts: SlackRecipePart[];
  title: string;
};

const defineRecipe = ({ id, trigger, target, is_item_scoped = false, recipient_kind, parts, title }: RecipeDefinition): SlackRecipe => ({
  id,
  trigger,
  target,
  is_item_scoped,
  recipient_kind: target === "person" ? recipient_kind ?? "someone" : null,
  parts,
  title,
  search_text: `${title.replaceAll("**", "")} slack`.toLowerCase(),
  default_message: SLACK_DEFAULT_MESSAGES[trigger],
});

/**
 * The Slack app page of the Automations center and the first templates of the Integrate dialog, in
 * monday.com's exact order and wording: channel recipes first, then direct message ones.
 */
export const SLACK_RECIPES: SlackRecipe[] = [
  defineRecipe({ id: "slack:date_arrived:channel", trigger: "date_arrived", target: "channel", parts: [...TRIGGER_PARTS.date_arrived, ...ACTION_PARTS.notify_in_channel], title: "**When date** arrives, **notify** in **channel**" }),
  defineRecipe({ id: "slack:item_created:channel", trigger: "item_created", target: "channel", parts: [...TRIGGER_PARTS.item_created, ...ACTION_PARTS.notify_in_channel], title: "When an item is created, **notify** in **channel**" }),
  defineRecipe({ id: "slack:status_changed:channel", trigger: "status_changed", target: "channel", parts: [...TRIGGER_PARTS.status_changed, ...ACTION_PARTS.notify_in_channel], title: "When **a status** changes to **something**, **notify** in **channel**" }),
  defineRecipe({ id: "slack:column_changed:channel", trigger: "column_changed", target: "channel", parts: [...TRIGGER_PARTS.column_changed, ...ACTION_PARTS.notify_in_channel], title: "When **a column** changes, **notify** in **channel**" }),
  defineRecipe({ id: "slack:update_posted_in_item:channel", trigger: "update_posted", target: "channel", is_item_scoped: true, parts: [...TRIGGER_PARTS.update_posted_in_item, ...ACTION_PARTS.send_to_channel], title: "When an update is posted in **this item**, send it to **channel**" }),
  defineRecipe({ id: "slack:update_posted:channel", trigger: "update_posted", target: "channel", parts: [...TRIGGER_PARTS.any_update_posted, ...ACTION_PARTS.send_to_channel], title: "When any update is posted, send it to **channel**" }),
  defineRecipe({ id: "slack:status_changed:person", trigger: "status_changed", target: "person", recipient_kind: "user", parts: [...TRIGGER_PARTS.status_changed, ...ACTION_PARTS.notify_user], title: "When **a status** changes to **something**, **notify user**" }),
  defineRecipe({ id: "slack:item_created:person", trigger: "item_created", target: "person", recipient_kind: "user", parts: [...TRIGGER_PARTS.item_created, ...ACTION_PARTS.notify_user], title: "When an item is created, **notify user**" }),
  defineRecipe({ id: "slack:date_arrived:person", trigger: "date_arrived", target: "person", recipient_kind: "user", parts: [...TRIGGER_PARTS.date_arrived, ...ACTION_PARTS.notify_user], title: "**When date** arrives, **notify user**" }),
  defineRecipe({ id: "slack:column_changed:person", trigger: "column_changed", target: "person", recipient_kind: "user", parts: [...TRIGGER_PARTS.column_changed, ...ACTION_PARTS.notify_user], title: "When **a column** changes, **notify user**" }),
  defineRecipe({ id: "slack:update_posted_in_item:person", trigger: "update_posted", target: "person", recipient_kind: "user", is_item_scoped: true, parts: [...TRIGGER_PARTS.update_posted_in_item, ...ACTION_PARTS.send_to_user], title: "When an update is posted in **this item**, send it to **user**" }),
  defineRecipe({ id: "slack:update_posted:person", trigger: "update_posted", target: "person", recipient_kind: "user", parts: [...TRIGGER_PARTS.any_update_posted, ...ACTION_PARTS.send_to_user], title: "When any update is posted, send it to **user**" }),
  defineRecipe({ id: "slack:status_changed:someone", trigger: "status_changed", target: "person", recipient_kind: "someone", parts: [...TRIGGER_PARTS.status_changed, ...ACTION_PARTS.notify_someone], title: "When **a status** changes to **something**, **notify someone**" }),
];

/** The sentences of the triggers monday.com has no Slack recipe for, still reachable from the Integrate dialog's templates. */
const EXTRA_TRIGGER_PARTS: Partial<Record<CommunicationTrigger, SlackRecipePart[]>> = {
  person_assigned: [text("When a person is assigned in "), slot("trigger_column", "a people column")],
  subitem_created: [text("When a subitem is created")],
};

const titleOf = (parts: SlackRecipePart[]) => parts.map((part) => ("text" in part ? part.text : `**${part.placeholder}**`)).join("");

const targetOf = (channel: Exclude<CommunicationChannel, "email">): SlackRecipeTarget => (channel === "slack_channel" ? "channel" : "person");

/** The recipe behind a Slack communication template, so both dialogs open the same flow. */
export function slackRecipeFor(trigger: CommunicationTrigger, channel: CommunicationChannel): SlackRecipe | null {
  if (channel === "email") return null;
  const target = targetOf(channel);
  const featured = SLACK_RECIPES.find((recipe) => recipe.trigger === trigger && recipe.target === target && !recipe.is_item_scoped && recipe.recipient_kind !== "user");
  if (featured) return featured;

  const parts = [...(EXTRA_TRIGGER_PARTS[trigger] ?? TRIGGER_PARTS.item_created), ...(target === "channel" ? ACTION_PARTS.notify_in_channel : ACTION_PARTS.notify_someone)];
  return defineRecipe({ id: `slack:${trigger}:${target}`, trigger, target, parts, title: titleOf(parts) });
}

/** True when a featured Slack recipe already covers a communication template, so the Integrate dialog does not list it twice. */
export const isCoveredBySlackRecipe = (template: CommunicationTemplate): boolean =>
  template.channel !== "email" && SLACK_RECIPES.some((recipe) => recipe.trigger === template.trigger && recipe.target === targetOf(template.channel as Exclude<CommunicationChannel, "email">));

/** The template card badge of a recipe. */
export const recipeChannel = (recipe: SlackRecipe): CommunicationChannel => (recipe.target === "channel" ? "slack_channel" : "slack_person");
