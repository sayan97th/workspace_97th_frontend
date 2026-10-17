"use client";
import React from "react";
import Link from "next/link";
import type { IntegrationAppOverviewDto } from "@/types/integration-overview";
import CommunicationTemplateCard from "../CommunicationTemplateCard";
import RecipeCard from "../builder/RecipeCard";
import { emailTemplateRecipe, type AutomationRecipe } from "../builder/automationTemplates";
import { COMMUNICATION_TEMPLATES } from "../communicationTemplates";
import IntegrationAppBanner, { BackToIntegrations, IntegrationEventFilter } from "./IntegrationAppBanner";
import { builderRecipesForApp, integrationEventOf, recipeEvent, type IntegrationEventKey } from "./centerNav";

export type EmailAppPageProps = {
  /** Lower case search text from the center's search box. */
  search: string;
  /** Only the templates of this event, picked in the sidebar, null for all of them. */
  event?: IntegrationEventKey | null;
  onClearEvent?: () => void;
  /** Email's entry of the integrations overview, for the banner. */
  overview?: IntegrationAppOverviewDto | null;
  onBack: () => void;
  /** Opens a template or recipe in the sentence builder, where the trigger, recipients and message are picked. */
  onUseRecipe: (recipe: AutomationRecipe) => void;
};

const EMAIL_TEMPLATES = COMMUNICATION_TEMPLATES.filter((template) => template.channel === "email");

/**
 * Integrations > Email. The built in channel needs nothing connected, so "Use template" goes
 * straight to the sentence builder with the template's trigger and email action filled in, the
 * same builder every other automation uses.
 */
export default function EmailAppPage({ search, event = null, onClearEvent = () => {}, overview = null, onBack, onUseRecipe }: EmailAppPageProps) {
  const templates = EMAIL_TEMPLATES.filter((entry) => entry.search_text.includes(search) && (!event || integrationEventOf(entry.trigger) === event));
  const recipes = builderRecipesForApp("email").filter((recipe) => recipe.title.replaceAll("**", "").toLowerCase().includes(search) && (!event || recipeEvent(recipe) === event));

  return (
    <div>
      <BackToIntegrations onBack={onBack} />
      <IntegrationEventFilter event={event} count={templates.length + recipes.length} onClear={onClearEvent} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="sm:col-span-2">
          <IntegrationAppBanner
            app="email"
            overview={overview}
            tagline="Email the right people when an item is created, a status changes or a date arrives."
            hint="Sent by your account's mail service, so there is nothing to connect. To send from your own inbox, use a Gmail or Outlook recipe."
          />
        </div>

        <div className="flex flex-col justify-center gap-2 rounded-[8px] border border-dashed border-boardtree-border p-4 text-[13px] text-boardtree-text-secondary">
          <span className="font-semibold text-boardtree-text">Your own email notifications</span>
          Choose which in-app notifications also reach your inbox.
          <Link href="/profile?section=notifications" className="font-medium text-boardtree-accent hover:underline">Email preferences</Link>
        </div>

        {templates.map((entry) => <CommunicationTemplateCard key={entry.id} template={entry} onUse={(template) => onUseRecipe(emailTemplateRecipe(template))} />)}
      </div>

      {recipes.length > 0 && (
        <section aria-label="More email recipes" className="mt-8">
          <h3 className="mb-3 font-outfit text-section-title text-boardtree-text-secondary">More email recipes</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onUse={onUseRecipe} />)}
          </div>
        </section>
      )}

      {templates.length === 0 && recipes.length === 0 && <div className="py-10 text-center text-[13.5px] text-boardtree-text-muted">No email templates match your search.</div>}
    </div>
  );
}
