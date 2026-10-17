import React from "react";
import { Bookmark, Building2, CalendarDays, Heart, Link2, MessageCircle, RefreshCw, Rocket, Telescope } from "lucide-react";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import type { ExternalService } from "@/types/external-account";
import type { IntegrationAppCategory, IntegrationAppKey, IntegrationAppStatus } from "@/types/integration-overview";
import { isIntegrationDefinition, type AutomationBuilderContext } from "../builder/automationCatalog";
import { AUTOMATION_RECIPES, type AutomationRecipe, type GalleryCategory } from "../builder/automationTemplates";
import { COMMUNICATION_TEMPLATES } from "../communicationTemplates";
import { SLACK_RECIPES, isCoveredBySlackRecipe } from "../slack/slackRecipes";

/** What the Integrations dialog's sidebar can show: the app catalog, one app, or the connection setup. */
export type IntegrationPage = "overview" | IntegrationAppKey | "connections";

/**
 * The page on the right of the Create tab. The Automations dialog shows board automation categories,
 * events that stay inside the app. The Integrations dialog shows integration pages, grouped by app.
 */
export type CenterPage = { section: "automations"; category: GalleryCategory } | { section: "integrations"; page: IntegrationPage };

export const DEFAULT_AUTOMATIONS_PAGE: CenterPage = { section: "automations", category: "explore" };
export const DEFAULT_INTEGRATIONS_PAGE: CenterPage = { section: "integrations", page: "overview" };

export const AUTOMATION_CATEGORIES: { id: GalleryCategory; label: string; icon: React.ReactNode }[] = [
  { id: "explore", label: "Explore all", icon: <Telescope size={15} /> },
  { id: "recommended", label: "Recommended", icon: <Heart size={15} /> },
  { id: "productivity", label: "Productivity", icon: <Rocket size={15} /> },
  { id: "dates", label: "Due dates and time", icon: <CalendarDays size={15} /> },
  { id: "communication", label: "Notifications", icon: <MessageCircle size={15} /> },
  { id: "sync", label: "Forms and webhooks", icon: <RefreshCw size={15} /> },
  { id: "connected", label: "Connected boards", icon: <Link2 size={15} /> },
  { id: "account", label: "Created in your account", icon: <Building2 size={15} /> },
  { id: "saved", label: "Saved on this board", icon: <Bookmark size={15} /> },
];

export type IntegrationAppMeta = {
  key: IntegrationAppKey;
  label: string;
  category: IntegrationAppCategory;
  /** One line for the overview card. */
  description: string;
  /** The banner of the app page and the card's logo tile are drawn in this colour. */
  brand_color: string;
  /** How many templates the app page lists. */
  template_count: number;
};

/** A context with nothing in it, enough to read which trigger and actions a recipe builds. */
const EMPTY_CONTEXT: AutomationBuilderContext = { board_id: 0, columns: [], groups: [], people: [], board_targets: [], slack_channels: [], is_slack_connected: false };

/** The outside app a built-in recipe uses, null for recipes that stay inside the app. */
function recipeApp(recipe: AutomationRecipe): IntegrationAppKey | null {
  if (recipe.connected_app) return recipe.connected_app;
  let definition;
  try {
    definition = recipe.build(EMPTY_CONTEXT);
  } catch {
    return null;
  }
  if (!isIntegrationDefinition(definition)) return null;
  const types = definition.actions.map((action) => action.type);
  if (types.some((type) => type === "slack_notify_channel" || type === "slack_notify_person")) return "slack";
  if (types.includes("google_calendar_sync")) return "google_calendar";
  return "email";
}

const RECIPE_APPS = new Map(AUTOMATION_RECIPES.map((recipe) => [recipe.id, recipeApp(recipe)]));

/** Whether a built-in recipe needs an integration, those only show in the Integrations dialog. */
export const isIntegrationRecipe = (recipe: AutomationRecipe): boolean => RECIPE_APPS.get(recipe.id) != null;

/**
 * The built-in builder recipes of an app that are not one of its own guided recipes: Email and
 * Slack sentences such as a weekly email. Gmail, Outlook and Google Calendar recipes already are
 * their guided recipes, so they have none.
 */
export const builderRecipesForApp = (app: "email" | "slack"): AutomationRecipe[] => AUTOMATION_RECIPES.filter((recipe) => !recipe.connected_app && RECIPE_APPS.get(recipe.id) === app);

const EMAIL_TEMPLATE_COUNT = COMMUNICATION_TEMPLATES.filter((template) => template.channel === "email").length + builderRecipesForApp("email").length;
const SLACK_TEMPLATE_COUNT =
  SLACK_RECIPES.length + COMMUNICATION_TEMPLATES.filter((template) => template.channel !== "email" && !isCoveredBySlackRecipe(template)).length + builderRecipesForApp("slack").length;

const externalApp = (service: ExternalService): IntegrationAppMeta => ({
  key: service,
  label: EXTERNAL_APPS[service].label,
  category: service === "google_calendar" ? "calendar" : "email",
  description: EXTERNAL_APPS[service].tagline,
  brand_color: EXTERNAL_APPS[service].brand_color,
  template_count: AUTOMATION_RECIPES.filter((recipe) => recipe.connected_app === service).length,
});

/** Every integration app in the order the sidebar and the overview list them. */
export const INTEGRATION_APPS: IntegrationAppMeta[] = [
  {
    key: "email",
    label: "Email",
    category: "communication",
    description: "Email people when an item is created, a status changes or a date arrives. Built in, nothing to connect.",
    brand_color: "#0073ea",
    template_count: EMAIL_TEMPLATE_COUNT,
  },
  {
    key: "slack",
    label: "Slack",
    category: "communication",
    description: "Post to a channel or message people in Slack when something changes on the board.",
    brand_color: "#4a154b",
    template_count: SLACK_TEMPLATE_COUNT,
  },
  externalApp("gmail"),
  externalApp("outlook"),
  externalApp("google_calendar"),
];

export const integrationAppMeta = (key: IntegrationAppKey): IntegrationAppMeta => INTEGRATION_APPS.find((app) => app.key === key) ?? INTEGRATION_APPS[0];

export const INTEGRATION_CATEGORY_LABELS: Record<IntegrationAppCategory, string> = {
  communication: "Communication",
  email: "Email",
  calendar: "Calendar",
};

export const INTEGRATION_STATUS_LABELS: Record<IntegrationAppStatus, string> = {
  ready: "Ready",
  connected: "Connected",
  available: "Not connected",
  needs_setup: "Setup required",
};

/** Every integration template, the count next to "All integrations". */
export const INTEGRATION_TEMPLATE_COUNT = INTEGRATION_APPS.reduce((total, app) => total + app.template_count, 0);
