"use client";
import React from "react";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import type { ExternalService } from "@/types/external-account";
import type { IntegrationAppOverviewDto } from "@/types/integration-overview";
import type { AutomationRecipe } from "../builder/automationTemplates";
import RecipeCard from "../builder/RecipeCard";
import IntegrationAppBanner, { BackToIntegrations } from "../center/IntegrationAppBanner";
import { recipesForApp } from "./connectedRecipes";

export type ConnectedAppPageProps = {
  app: ExternalService;
  /** Lower case search text from the center's search box. */
  search: string;
  /** The signed in user's status with the app, for the banner. */
  overview?: IntegrationAppOverviewDto | null;
  onBack: () => void;
  onUse: (recipe: AutomationRecipe) => void;
};

/**
 * One app of the Integrations dialog, monday.com's integration page: a
 * banner in the app's colour saying what the integration does, then every recipe that uses it.
 */
export default function ConnectedAppPage({ app, search, overview = null, onBack, onUse }: ConnectedAppPageProps) {
  const meta = EXTERNAL_APPS[app];
  const recipes = recipesForApp(app).filter((recipe) => `${recipe.title.replaceAll("**", "")} ${meta.label}`.toLowerCase().includes(search));

  return (
    <div>
      <BackToIntegrations onBack={onBack} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="sm:col-span-2">
          <IntegrationAppBanner app={app} overview={overview} tagline={meta.tagline} hint={`Pick a recipe, connect your ${meta.label} account once, then fill in the sentence.`} />
        </div>

        {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onUse={onUse} />)}
      </div>

      {recipes.length === 0 && <div className="py-10 text-center text-[13.5px] text-boardtree-text-muted">No {meta.label} recipes match your search.</div>}
    </div>
  );
}
