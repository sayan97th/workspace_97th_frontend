"use client";
import React from "react";
import SlackLogo from "@/components/slack/SlackLogo";
import SlackRecipeCard from "./SlackRecipeCard";
import { SLACK_RECIPES, type SlackRecipe } from "./slackRecipes";

export type SlackAppPageProps = {
  /** Lower case search text from the gallery's search box. */
  search: string;
  onBack: () => void;
  onUse: (recipe: SlackRecipe) => void;
};

/** Slack's brand aubergine, the banner and the whole connect and recipe flow use it like monday.com. */
export const SLACK_PURPLE = "#4a154b";

/**
 * The Slack app inside the Automations center, monday.com's integration page: a banner saying what
 * the integration does, then every Slack recipe as a card. "Use template" starts the flow that
 * connects a Slack account and fills the recipe.
 */
export default function SlackAppPage({ search, onBack, onUse }: SlackAppPageProps) {
  const recipes = SLACK_RECIPES.filter((recipe) => recipe.search_text.includes(search));

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 flex items-center gap-1.5 text-[13.5px] text-boardtree-text-secondary hover:text-boardtree-text">
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Back
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section
          aria-label="About the Slack integration"
          style={{ background: SLACK_PURPLE }}
          className="flex min-h-[220px] flex-col gap-4 rounded-[6px] p-6 text-white sm:col-span-2 sm:flex-row"
        >
          <div className="flex h-[100px] w-[100px] flex-none items-center justify-center rounded-[6px] bg-white">
            <SlackLogo size={58} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[30px] font-normal leading-tight">Slack</h2>
            <p className="mt-1 text-[16px] font-semibold leading-snug">
              Sync conversations across both platforms, receive updates and track changes. Keep everyone on the same page.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-white/75">
              Pick a recipe, connect your Slack account once, then choose the channel or the people to notify.
            </p>
          </div>
        </section>

        {recipes.map((recipe) => <SlackRecipeCard key={recipe.id} recipe={recipe} onUse={onUse} />)}
      </div>

      {recipes.length === 0 && <div className="py-10 text-center text-[13.5px] text-boardtree-text-muted">No Slack recipes match your search.</div>}
    </div>
  );
}
