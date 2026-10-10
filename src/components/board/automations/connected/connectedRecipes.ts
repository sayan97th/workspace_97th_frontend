import type { ExternalService } from "@/types/external-account";
import { AUTOMATION_RECIPES, type AutomationRecipe } from "../builder/automationTemplates";

/** The clickable words of a Gmail, Outlook or Google Calendar recipe sentence, each opens its own picker. */
export type ConnectedRecipeSlot = "event" | "calendar" | "email_filter" | "group" | "trigger_column" | "trigger_value" | "email_message" | "email_recipient";

export type ConnectedRecipePart = { text: string } | { slot: ConnectedRecipeSlot; placeholder: string };

/** What the recipe does once filled, decides which payload the editor builds. */
export type ConnectedRecipeKind = "calendar_sync" | "email_to_item" | "status_send_email";

export type ConnectedRecipe = {
  recipe: AutomationRecipe;
  app: ExternalService;
  kind: ConnectedRecipeKind;
  parts: ConnectedRecipePart[];
};

const text = (value: string): ConnectedRecipePart => ({ text: value });
const slot = (name: ConnectedRecipeSlot, placeholder: string): ConnectedRecipePart => ({ slot: name, placeholder });

/** The email every "send an email" recipe starts with, in the API's token format. */
export const DEFAULT_EMAIL_SUBJECT = "{item_name}: {column_name} changed to {new_value}";
export const DEFAULT_EMAIL_MESSAGE = "{column_name} of {item_name} changed to {new_value} in {board_name} board by {actor_name}";

/** The event title a calendar recipe starts with, the item name. */
export const DEFAULT_EVENT_TITLE = "{item_name}";

const SENTENCES: Record<ConnectedRecipeKind, ConnectedRecipePart[]> = {
  calendar_sync: [
    text("When an item is created or updated, create an "),
    slot("event", "event"),
    text(" in "),
    slot("calendar", "Google Calendar"),
    text(", and sync future changes from this board"),
  ],
  email_to_item: [text("When an "), slot("email_filter", "email"), text(" is received, create an item in "), slot("group", "group")],
  status_send_email: [
    text("When "),
    slot("trigger_column", "status"),
    text(" changes to "),
    slot("trigger_value", "something"),
    text(", send an "),
    slot("email_message", "email"),
    text(" to "),
    slot("email_recipient", "someone"),
  ],
};

/** Which flow each connected gallery recipe opens. */
const KIND_BY_RECIPE: Record<string, ConnectedRecipeKind> = {
  google_calendar_item_sync: "calendar_sync",
  gmail_email_create_item: "email_to_item",
  outlook_email_create_item: "email_to_item",
  gmail_status_send_email: "status_send_email",
};

/** The connect and fill flow of a gallery recipe that uses Gmail, Outlook or Google Calendar, null for every other recipe. */
export function connectedRecipeFor(recipe: AutomationRecipe): ConnectedRecipe | null {
  const kind = KIND_BY_RECIPE[recipe.id];
  if (!recipe.connected_app || !kind) return null;
  return { recipe, app: recipe.connected_app, kind, parts: SENTENCES[kind] };
}

/** The recipes of one app, for its page in the gallery's Integrations box. */
export const recipesForApp = (app: ExternalService): AutomationRecipe[] => AUTOMATION_RECIPES.filter((recipe) => recipe.connected_app === app);
