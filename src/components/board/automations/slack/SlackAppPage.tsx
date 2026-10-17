"use client";
import React from "react";
import type { IntegrationAppOverviewDto } from "@/types/integration-overview";
import RecipeCard from "../builder/RecipeCard";
import type { AutomationRecipe } from "../builder/automationTemplates";
import IntegrationAppBanner, { BackToIntegrations } from "../center/IntegrationAppBanner";
import { builderRecipesForApp } from "../center/centerNav";
import { COMMUNICATION_TEMPLATES } from "../communicationTemplates";
import SlackRecipeCard from "./SlackRecipeCard";
import { SLACK_RECIPES, isCoveredBySlackRecipe, slackRecipeFor, type SlackRecipe } from "./slackRecipes";

export type SlackAppPageProps = {
  /** Lower case search text from the center's search box. */
  search: string;
  /** The signed in user's Slack status, for the banner. */
  overview?: IntegrationAppOverviewDto | null;
  onBack: () => void;
  onUse: (recipe: SlackRecipe) => void;
  /** Opens a builder recipe that posts to Slack in the sentence builder, the section is hidden when omitted. */
  onUseRecipe?: (recipe: AutomationRecipe) => void;
};

/** Slack's brand aubergine, the banner and the whole connect and recipe flow use it like monday.com. */
export const SLACK_PURPLE = "#4a154b";

/** monday.com's Slack recipes first, then the Slack templates none of them covers, such as a new subitem. */
const ALL_SLACK_RECIPES: SlackRecipe[] = [
  ...SLACK_RECIPES,
  ...COMMUNICATION_TEMPLATES.filter((template) => template.channel !== "email" && !isCoveredBySlackRecipe(template))
    .map((template) => slackRecipeFor(template.trigger, template.channel))
    .filter((recipe): recipe is SlackRecipe => recipe !== null),
];

/**
 * The Slack app inside the Integrations dialog, monday.com's integration
 * page: a banner saying what the integration does, then every Slack recipe as a card. "Use
 * template" starts the flow that connects a Slack account and fills the recipe.
 */
export default function SlackAppPage({ search, overview = null, onBack, onUse, onUseRecipe }: SlackAppPageProps) {
  const recipes = ALL_SLACK_RECIPES.filter((recipe) => recipe.search_text.includes(search));
  const builder_recipes = onUseRecipe ? builderRecipesForApp("slack").filter((recipe) => recipe.title.replaceAll("**", "").toLowerCase().includes(search)) : [];

  return (
    <div>
      <BackToIntegrations onBack={onBack} />

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
