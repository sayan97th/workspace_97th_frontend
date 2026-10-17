"use client";
import React, { useState } from "react";
import { Building2, Trash2 } from "lucide-react";
import type { AccountAutomationTemplateDto, BoardAutomationTemplateDto } from "@/types/board-automation";
import { AUTOMATION_CATEGORIES, isIntegrationRecipe } from "../center/centerNav";
import type { AutomationBuilderContext } from "./automationCatalog";
import { describeDefinition, sentenceText } from "./automationSentence";
import { AUTOMATION_RECIPES, missingColumns, type AutomationRecipe, type GalleryCategory } from "./automationTemplates";
import RecipeCard, { CustomRecipeCard } from "./RecipeCard";

export type TemplateGalleryProps = {
  context: AutomationBuilderContext;
  /** The sidebar category on show. */
  category: GalleryCategory;
  /** Lower case search text from the center's search box. */
  search: string;
  saved_templates: BoardAutomationTemplateDto[];
  is_loading_saved: boolean;
  /** Templates an administrator published for every board. */
  account_templates: AccountAutomationTemplateDto[];
  is_loading_account: boolean;
  /** Administrators may remove account templates. */
  can_manage_account_templates: boolean;
  onUseRecipe: (recipe: AutomationRecipe) => void;
  onUseSaved: (template: BoardAutomationTemplateDto) => void;
  onUseAccount: (template: AccountAutomationTemplateDto) => void;
  onDeleteSaved: (template_id: number) => Promise<void>;
  onDeleteAccount: (template_id: number) => Promise<void>;
  onCustom: () => void;
};

const CARD =
  "group relative flex min-h-[132px] flex-col justify-between rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-4 text-left transition-shadow hover:border-boardtree-accent/50 hover:shadow-[0_6px_18px_rgba(30,34,55,0.10)]";

/** A template card that is not a built-in recipe, with an optional delete button. */
function TemplateCard({ name, sentence, footer, onUse, onDelete, is_deleting }: { name: string; sentence: string; footer: string; onUse: () => void; onDelete?: () => void; is_deleting: boolean }) {
  return (
    <div className={CARD}>
      <button type="button" onClick={onUse} className="absolute inset-0 rounded-[10px]" aria-label={`Use template ${name}`} />
      <div className="pointer-events-none">
        <div className="mb-1 text-[14px] font-semibold text-boardtree-text">{name}</div>
        <p className="line-clamp-3 text-[13px] leading-snug text-boardtree-text-secondary">{sentence}</p>
      </div>
      <div className="relative mt-3 flex items-center justify-between">
        <span className="text-[12px] text-boardtree-text-faint">{footer}</span>
        {onDelete && (
          <button
            type="button"
            disabled={is_deleting}
            onClick={onDelete}
            aria-label={`Delete template ${name}`}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-boardtree-text-faint opacity-0 transition-opacity hover:bg-boardtree-hover hover:text-boardtree-danger focus:opacity-100 group-hover:opacity-100 disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The Automations dialog's Create tab: built-in recipes of the sidebar category, the templates
 * published for the whole account, the board's saved templates, and a way to start from a blank
 * sentence. Picking a card opens the builder with the sentence prefilled. Recipes that need an
 * integration (email, Slack, Gmail, Outlook, Google Calendar) live in the Integrations dialog.
 */
export default function TemplateGallery(props: TemplateGalleryProps) {
  const { context, category, search, saved_templates, is_loading_saved, account_templates, is_loading_account, can_manage_account_templates, onUseRecipe, onUseSaved, onUseAccount, onDeleteSaved, onDeleteAccount, onCustom } = props;
  const [deleting_key, setDeletingKey] = useState<string | null>(null);

  const text = search;
  const matches = (value: string) => value.toLowerCase().includes(text);
  const recipes = AUTOMATION_RECIPES.filter((recipe) => !isIntegrationRecipe(recipe) && (category === "explore" || recipe.categories.includes(category as AutomationRecipe["categories"][number])) && matches(recipe.title.replace(/\*/g, "")));
  const saved = saved_templates.filter((template) => matches(`${template.name} ${template.description ?? ""}`));
  const account = account_templates.filter((template) => matches(`${template.name} ${template.description ?? ""}`));
  const show_saved = category === "saved" || (category === "explore" && saved.length > 0);
  const show_account = category === "account" || (category === "explore" && account.length > 0);
  const show_recipes = category !== "saved" && category !== "account";
  const title = category === "explore" ? "Automation templates" : AUTOMATION_CATEGORIES.find((entry) => entry.id === category)?.label ?? "Automation templates";

  const remove = async (key: string, action: () => Promise<void>) => {
    setDeletingKey(key);
    try {
      await action();
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <div>
      <h2 className="mb-5 font-heading text-page-title text-boardtree-text">{title}</h2>

      {show_account && (
        <section aria-label="Created in your account" className="mb-7">
          <h3 className="mb-3 flex items-center gap-1.5 font-outfit text-section-title text-boardtree-text-secondary">
            <Building2 size={15} />
            Created in your account
          </h3>
          {is_loading_account ? (
            <div className="text-[13px] text-boardtree-text-faint">Loading templates...</div>
          ) : account.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-boardtree-border px-4 py-6 text-center text-[13px] text-boardtree-text-muted">
              No account templates yet. An administrator can publish any automation for every board from its menu in Manage.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {account.map((template) => (
                <TemplateCard
                  key={template.id}
                  name={template.name}
                  sentence={template.description || sentenceText(describeDefinition(template.definition, context))}
                  footer={template.created_by?.name ? `By ${template.created_by.name}` : "Account template"}
                  onUse={() => onUseAccount(template)}
                  onDelete={can_manage_account_templates ? () => void remove(`account_${template.id}`, () => onDeleteAccount(template.id)) : undefined}
                  is_deleting={deleting_key === `account_${template.id}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {show_saved && (
        <section aria-label="Saved templates" className="mb-7">
          <h3 className="mb-3 font-outfit text-section-title text-boardtree-text-secondary">Saved on this board</h3>
          {is_loading_saved ? (
            <div className="text-[13px] text-boardtree-text-faint">Loading saved templates...</div>
          ) : saved.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-boardtree-border px-4 py-6 text-center text-[13px] text-boardtree-text-muted">
              No saved templates yet. Use &quot;Save as template&quot; on any automation in Manage.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {saved.map((template) => (
                <TemplateCard
                  key={template.id}
                  name={template.name}
                  sentence={sentenceText(describeDefinition(template.definition, context))}
                  footer={template.created_by?.name ? `By ${template.created_by.name}` : "Saved template"}
                  onUse={() => onUseSaved(template)}
                  onDelete={() => void remove(`saved_${template.id}`, () => onDeleteSaved(template.id))}
                  is_deleting={deleting_key === `saved_${template.id}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {show_recipes && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} missing={missingColumns(recipe.requires, context)} onUse={onUseRecipe} />)}
          {recipes.length === 0 && text !== "" && <div className="col-span-full py-10 text-center text-[13.5px] text-boardtree-text-muted">No templates match your search.</div>}
          {text === "" && <CustomRecipeCard onCustom={onCustom} />}
        </div>
      )}
    </div>
  );
}
