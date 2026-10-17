"use client";
import React, { useState } from "react";
import Link from "next/link";
import type { SlackAutomationOptions } from "@/hooks/useSlackAutomationOptions";
import type { CreateBoardAutomationPayload } from "@/types/board-automation";
import type { IntegrationAppOverviewDto } from "@/types/integration-overview";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { ColumnDef, PersonDef } from "../../table/types";
import CommunicationRecipeForm from "../CommunicationRecipeForm";
import CommunicationTemplateCard from "../CommunicationTemplateCard";
import RecipeCard from "../builder/RecipeCard";
import type { AutomationRecipe } from "../builder/automationTemplates";
import { COMMUNICATION_TEMPLATES, type CommunicationTemplate } from "../communicationTemplates";
import IntegrationAppBanner, { BackToIntegrations } from "./IntegrationAppBanner";
import { builderRecipesForApp } from "./centerNav";

export type EmailAppPageProps = {
  /** Lower case search text from the center's search box. */
  search: string;
  columns: ColumnDef[];
  people: PersonDef[];
  /** The form is shared with Slack templates, email ones never read it. */
  slack: SlackAutomationOptions;
  /** Email's entry of the integrations overview, for the banner. */
  overview?: IntegrationAppOverviewDto | null;
  onBack: () => void;
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  /** Called once an automation was saved, so the center can show it in Manage. */
  onCreated: () => void;
  /** Opens a builder recipe that sends an email, such as a weekly digest, in the sentence builder. */
  onUseRecipe: (recipe: AutomationRecipe) => void;
};

const EMAIL_TEMPLATES = COMMUNICATION_TEMPLATES.filter((template) => template.channel === "email");

/**
 * Integrations > Email. The built in channel needs nothing connected, so the page goes straight
 * from the template list to the form: pick a template, choose the column and the recipients, save.
 */
export default function EmailAppPage({ search, columns, people, slack, overview = null, onBack, onCreate, onCreated, onUseRecipe }: EmailAppPageProps) {
  const [template, setTemplate] = useState<CommunicationTemplate | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);

  const templates = EMAIL_TEMPLATES.filter((entry) => entry.search_text.includes(search));
  const recipes = builderRecipesForApp("email").filter((recipe) => recipe.title.replaceAll("**", "").toLowerCase().includes(search));

  const save = async (payload: Omit<CreateBoardAutomationPayload, "view_id">) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onCreate(payload);
      setTemplate(null);
      onCreated();
    } catch (failure) {
      setSaveError(apiErrorMessage(failure, "The automation could not be created."));
    } finally {
      setIsSaving(false);
    }
  };

  if (template) {
    return (
      <div className="max-w-[560px]">
        <button
          type="button"
          onClick={() => {
            setTemplate(null);
            setSaveError(null);
          }}
          className="mb-3 flex items-center gap-1.5 text-[13px] text-boardtree-text-secondary hover:text-boardtree-text"
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M7.5 3 L4.3 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to email templates
        </button>
        {save_error && <div role="alert" className="mb-3 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2 text-[12.5px] text-boardtree-danger">{save_error}</div>}
        <CommunicationRecipeForm template={template} columns={columns} people={people} slack={slack} is_saving={is_saving} onSave={save} />
      </div>
    );
  }

  return (
    <div>
      <BackToIntegrations onBack={onBack} />

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

        {templates.map((entry) => <CommunicationTemplateCard key={entry.id} template={entry} onUse={setTemplate} />)}
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
