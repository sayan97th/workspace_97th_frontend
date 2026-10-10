"use client";
import React from "react";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import type { ExternalService } from "@/types/external-account";
import type { AutomationRecipe } from "../builder/automationTemplates";
import RecipeCard from "../builder/RecipeCard";
import { recipesForApp } from "./connectedRecipes";

export type ConnectedAppPageProps = {
  app: ExternalService;
  /** Lower case search text from the gallery's search box. */
  search: string;
  onBack: () => void;
  onUse: (recipe: AutomationRecipe) => void;
};

/**
 * One app of the gallery's Integrations box, monday.com's integration page: a banner in the app's
 * colour saying what the integration does, then every recipe that uses it.
 */
export default function ConnectedAppPage({ app, search, onBack, onUse }: ConnectedAppPageProps) {
  const meta = EXTERNAL_APPS[app];
  const recipes = recipesForApp(app).filter((recipe) => `${recipe.title.replaceAll("**", "")} ${meta.label}`.toLowerCase().includes(search));

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[13.5px] text-boardtree-text-secondary hover:text-boardtree-text">
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section aria-label={`About the ${meta.label} integration`} style={{ background: meta.brand_color }} className="flex min-h-[220px] flex-col gap-4 rounded-[6px] p-6 text-white sm:col-span-2 sm:flex-row">
          <div className="flex h-[100px] w-[100px] flex-none items-center justify-center rounded-[6px] bg-white">
            <ExternalAppLogo app={app} size={58} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[30px] font-normal leading-tight">{meta.label}</h2>
            <p className="mt-1 text-[16px] font-semibold leading-snug">{meta.tagline}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/75">Pick a recipe, connect your {meta.label} account once, then fill in the sentence.</p>
          </div>
        </section>

        {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onUse={onUse} />)}
      </div>

      {recipes.length === 0 && <div className="py-10 text-center text-[13.5px] text-boardtree-text-muted">No {meta.label} recipes match your search.</div>}
    </div>
  );
}
