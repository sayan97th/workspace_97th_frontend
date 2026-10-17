"use client";
import React from "react";
import type { IntegrationAppOverviewDto } from "@/types/integration-overview";
import RecipeCard from "../builder/RecipeCard";
import type { AutomationRecipe } from "../builder/automationTemplates";
import IntegrationAppBanner, { BackToIntegrations, IntegrationEventFilter } from "../center/IntegrationAppBanner";
import { builderRecipesForApp, integrationEventOf, recipeEvent, type IntegrationEventKey } from "../center/centerNav";
import SlackRecipeCard from "./SlackRecipeCard";
import { ALL_SLACK_RECIPES, type SlackRecipe } from "./slackRecipes";

export type SlackAppPageProps = {
  /** Lower case search text from the center's search box. */
  search: string;
  /** Only the recipes of this event, picked in the sidebar, null for all of them. */
  event?: IntegrationEventKey | null;
  onClearEvent?: () => void;
  /** The signed in user's Slack status, for the banner. */
  overview?: IntegrationAppOverviewDto | null;
  onBack: () => void;
  onUse: (recipe: SlackRecipe) => void;
  /** Opens a builder recipe that posts to Slack in the sentence builder, the section is hidden when omitted. */
  onUseRecipe?: (recipe: AutomationRecipe) => void;
};

/** Slack's brand aubergine, the banner and the whole connect and recipe flow use it like monday.com. */
export const SLACK_PURPLE = "#4a154b";

/**
 * The Slack app inside the Integrations dialog, monday.com's integration
 * page: a banner saying what the integration does, then every Slack recipe as a card. "Use
 * template" starts the flow that connects a Slack account and fills the recipe.
 */
export default function SlackAppPage({ search, event = null, onClearEvent = () => {}, overview = null, onBack, onUse, onUseRecipe }: SlackAppPageProps) {
  const recipes = ALL_SLACK_RECIPES.filter((recipe) => recipe.search_text.includes(search) && (!event || integrationEventOf(recipe.trigger) === event));
  const builder_recipes = onUseRecipe
    ? builderRecipesForApp("slack").filter((recipe) => recipe.title.replaceAll("**", "").toLowerCase().includes(search) && (!event || recipeEvent(recipe) === event))
    : [];

  return (
    <div>
      <BackToIntegrations onBack={onBack} />
      <IntegrationEventFilter event={event} count={recipes.length + builder_recipes.length} onClear={onClearEvent} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="sm:col-span-2">
          <IntegrationAppBanner
            app="slack"
            overview={overview}
            tagline="Sync conversations across both platforms, receive updates and track changes. Keep everyone on the same page."
            hint="Pick a recipe, connect your Slack account once, then choose the channel or the people to notify."
          />
        </div>

        {recipes.map((recipe) => <SlackRecipeCard key={recipe.id} recipe={recipe} onUse={onUse} />)}
      </div>

      {onUseRecipe && builder_recipes.length > 0 && (
        <section aria-label="More Slack recipes" className="mt-8">
          <h3 className="mb-3 font-outfit text-section-title text-boardtree-text-secondary">More Slack recipes</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {builder_recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onUse={onUseRecipe} />)}
          </div>
        </section>
      )}

      {recipes.length === 0 && builder_recipes.length === 0 && <div className="py-10 text-center text-[13.5px] text-boardtree-text-muted">No Slack recipes match your search.</div>}
    </div>
  );
}
