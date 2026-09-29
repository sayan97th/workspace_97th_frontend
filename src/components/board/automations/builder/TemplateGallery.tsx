"use client";
import React, { useState } from "react";
import { Building2, FileText, Mail, MessageCircle, Plus, Trash2, Users, Webhook } from "lucide-react";
import type { AccountAutomationTemplateDto, BoardAutomationTemplateDto } from "@/types/board-automation";
import { SearchIcon } from "@/icons/workspace-icons";
import type { AutomationBuilderContext } from "./automationCatalog";
import { describeDefinition, sentenceText } from "./automationSentence";
import { AUTOMATION_RECIPES, RECIPE_APP_LABELS, missingColumns, titleParts, type AutomationRecipe, type GalleryCategory, type RecipeApp } from "./automationTemplates";

export type TemplateGalleryProps = {
  context: AutomationBuilderContext;
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

const CATEGORIES: { id: GalleryCategory; label: string }[] = [
  { id: "explore", label: "Explore all" },
  { id: "recommended", label: "Recommended" },
  { id: "productivity", label: "Productivity" },
  { id: "dates", label: "Due dates and time" },
  { id: "communication", label: "Notifications and email" },
  { id: "sync", label: "Forms and webhooks" },
  { id: "connected", label: "Connected boards" },
  { id: "account", label: "Created in your account" },
  { id: "saved", label: "Saved on this board" },
];

const APP_ICONS: Record<RecipeApp, React.ReactNode> = {
  email: <Mail size={13} />,
  slack: <MessageCircle size={13} />,
  webhook: <Webhook size={13} />,
  form: <FileText size={13} />,
  team: <Users size={13} />,
};

const NAV_ROW = "flex h-9 w-full items-center rounded-[6px] px-3 text-left text-[13.5px] transition-colors";
const CARD =
  "group relative flex min-h-[132px] flex-col justify-between rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-4 text-left transition-shadow hover:border-boardtree-accent/50 hover:shadow-[0_6px_18px_rgba(30,34,55,0.10)]";

/** A recipe card's sentence, its highlighted words in bold like monday's template cards. */
function RecipeTitle({ title }: { title: string }) {
  return (
    <p className="text-[15px] leading-snug text-boardtree-text">
      {titleParts(title).map((part, index) => (part.is_bold ? <strong key={index} className="font-semibold">{part.text}</strong> : <span key={index}>{part.text}</span>))}
    </p>
  );
}

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
 * The Create tab: built-in recipes by category, the templates published for the whole account,
 * the board's saved templates, and a way to start from a blank sentence. Picking a card opens the
 * builder with the sentence prefilled.
 */
export default function TemplateGallery(props: TemplateGalleryProps) {
  const { context, saved_templates, is_loading_saved, account_templates, is_loading_account, can_manage_account_templates, onUseRecipe, onUseSaved, onUseAccount, onDeleteSaved, onDeleteAccount, onCustom } = props;
  const [category, setCategory] = useState<GalleryCategory>("explore");
  const [search, setSearch] = useState("");
  const [deleting_key, setDeletingKey] = useState<string | null>(null);

  const text = search.trim().toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(text);
  const recipes = AUTOMATION_RECIPES.filter((recipe) => (category === "explore" || recipe.categories.includes(category as AutomationRecipe["categories"][number])) && matches(recipe.title.replace(/\*/g, "")));
  const saved = saved_templates.filter((template) => matches(`${template.name} ${template.description ?? ""}`));
  const account = account_templates.filter((template) => matches(`${template.name} ${template.description ?? ""}`));
  const show_saved = category === "saved" || (category === "explore" && saved.length > 0);
  const show_account = category === "account" || (category === "explore" && account.length > 0);
  const show_recipes = category !== "saved" && category !== "account";

  const remove = async (key: string, action: () => Promise<void>) => {
    setDeletingKey(key);
    try {
      await action();
    } finally {
      setDeletingKey(null);
    }
  };

  const countFor = (id: GalleryCategory): number | null => (id === "saved" ? saved_templates.length : id === "account" ? account_templates.length : null);

  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Template categories" className="hidden w-[240px] flex-none flex-col gap-1 border-r border-boardtree-border-soft bg-boardtree-panel-alt px-3 py-5 md:flex">
        <div className="mb-2 px-3 text-[16px] font-semibold text-boardtree-text">Categories</div>
        {CATEGORIES.map((entry) => {
          const count = countFor(entry.id);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setCategory(entry.id)}
              aria-current={category === entry.id ? "page" : undefined}
              className={`${NAV_ROW} ${category === entry.id ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
            >
              <span className="flex-1 truncate">{entry.label}</span>
              {count ? <span className="text-[12px] text-boardtree-text-faint">{count}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[24px] font-semibold text-boardtree-text">Automation templates</h2>
          <button type="button" onClick={onCustom} className="flex h-9 items-center gap-1.5 rounded-[4px] bg-boardtree-accent px-3.5 text-[13px] font-medium text-white hover:bg-boardtree-accent-hover">
            <Plus size={15} />
            Create custom automation
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <label className="relative w-full max-w-[340px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boardtree-text-faint"><SearchIcon size={14} /></span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates"
              aria-label="Search templates"
              className="h-9 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface pl-9 pr-3 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as GalleryCategory)}
            aria-label="Category"
            className="h-9 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[13px] text-boardtree-text md:hidden"
          >
            {CATEGORIES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </div>

        {show_account && (
          <section aria-label="Created in your account" className="mb-7">
            <h3 className="mb-3 flex items-center gap-1.5 text-[14px] font-semibold text-boardtree-text-secondary">
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
            <h3 className="mb-3 text-[14px] font-semibold text-boardtree-text-secondary">Saved on this board</h3>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.map((recipe) => {
              const missing = missingColumns(recipe.requires, context);
              return (
                <button key={recipe.id} type="button" onClick={() => onUseRecipe(recipe)} className={CARD}>
                  <RecipeTitle title={recipe.title} />
                  <span className="mt-3 flex flex-wrap items-center gap-2">
                    {recipe.apps.map((app) => (
                      <span key={app} title={RECIPE_APP_LABELS[app]} className="flex h-6 items-center gap-1 rounded-full bg-boardtree-hover px-2 text-[11.5px] text-boardtree-text-secondary">
                        {APP_ICONS[app]}
                        {RECIPE_APP_LABELS[app]}
                      </span>
                    ))}
                    {missing.length > 0 && (
                      <span className="text-[11.5px] text-boardtree-text-faint">Needs {missing.map((need) => `a ${need.label} column`).join(", ")}</span>
                    )}
                  </span>
                </button>
              );
            })}
            {recipes.length === 0 && <div className="col-span-full py-10 text-center text-[13.5px] text-boardtree-text-muted">No templates match your search.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
