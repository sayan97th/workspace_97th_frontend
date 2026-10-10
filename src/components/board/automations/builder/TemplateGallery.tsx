"use client";
import React, { useState } from "react";
import { Bookmark, Building2, CalendarDays, Heart, Link2, MessageCircle, Plus, RefreshCw, Rocket, Telescope, Trash2 } from "lucide-react";
import type { AccountAutomationTemplateDto, BoardAutomationTemplateDto } from "@/types/board-automation";
import { SearchIcon } from "@/icons/workspace-icons";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import SlackLogo from "@/components/slack/SlackLogo";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import type { ExternalService } from "@/types/external-account";
import ConnectedAppPage from "../connected/ConnectedAppPage";
import SlackAppPage from "../slack/SlackAppPage";
import { SLACK_RECIPES, type SlackRecipe } from "../slack/slackRecipes";
import type { AutomationBuilderContext } from "./automationCatalog";
import { describeDefinition, sentenceText } from "./automationSentence";
import { AUTOMATION_RECIPES, missingColumns, type AutomationRecipe, type GalleryCategory } from "./automationTemplates";
import RecipeCard, { CustomRecipeCard } from "./RecipeCard";

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
  /** Starts the Slack integration flow for a recipe of the Slack app page, the Slack entry is hidden when omitted. */
  onUseSlackRecipe?: (recipe: SlackRecipe) => void;
  /** Starts the Gmail, Outlook or Google Calendar flow of a recipe that uses one, those recipes open the builder when omitted. */
  onUseConnectedRecipe?: (recipe: AutomationRecipe) => void;
};

/** Apps listed in the Integrations box at the bottom of the categories, in monday.com's order. */
type GalleryApp = "slack" | ExternalService;

const INTEGRATION_APPS: GalleryApp[] = ["outlook", "gmail", "slack", "google_calendar"];

const CATEGORIES: { id: GalleryCategory; label: string; icon: React.ReactNode }[] = [
  { id: "explore", label: "Explore all", icon: <Telescope size={15} /> },
  { id: "recommended", label: "Recommended", icon: <Heart size={15} /> },
  { id: "productivity", label: "Productivity", icon: <Rocket size={15} /> },
  { id: "dates", label: "Due dates and time", icon: <CalendarDays size={15} /> },
  { id: "communication", label: "Notifications and email", icon: <MessageCircle size={15} /> },
  { id: "sync", label: "Forms and webhooks", icon: <RefreshCw size={15} /> },
  { id: "connected", label: "Connected boards", icon: <Link2 size={15} /> },
  { id: "account", label: "Created in your account", icon: <Building2 size={15} /> },
  { id: "saved", label: "Saved on this board", icon: <Bookmark size={15} /> },
];

const appLabel = (app: GalleryApp): string => (app === "slack" ? "Slack" : EXTERNAL_APPS[app].label);

const NAV_ROW = "flex h-9 w-full items-center gap-2.5 rounded-[6px] px-3 text-left text-[13.5px] transition-colors";
const CARD =
  "group relative flex min-h-[132px] flex-col justify-between rounded-[10px] border border-boardtree-border-soft bg-boardtree-surface p-4 text-left transition-shadow hover:border-boardtree-accent/50 hover:shadow-[0_6px_18px_rgba(30,34,55,0.10)]";

/** How many templates the Integrations box leads to, every Slack recipe plus every Gmail, Outlook and Google Calendar one. */
const INTEGRATION_RECIPE_COUNT = SLACK_RECIPES.length + AUTOMATION_RECIPES.filter((recipe) => recipe.connected_app).length;

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
  const { context, saved_templates, is_loading_saved, account_templates, is_loading_account, can_manage_account_templates, onUseRecipe, onUseSaved, onUseAccount, onDeleteSaved, onDeleteAccount, onCustom, onUseSlackRecipe, onUseConnectedRecipe } = props;
  const [category, setCategory] = useState<GalleryCategory>("explore");
  const [app, setApp] = useState<GalleryApp | null>(null);
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

  const pickRecipe = (recipe: AutomationRecipe) => (recipe.connected_app && onUseConnectedRecipe ? onUseConnectedRecipe(recipe) : onUseRecipe(recipe));

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
      <nav aria-label="Template categories" className="hidden w-[240px] flex-none flex-col gap-1 overflow-y-auto border-r border-boardtree-border-soft bg-boardtree-panel-alt px-3 py-5 md:flex">
        <div className="mb-2 px-3 text-[16px] font-semibold text-boardtree-text">Categories</div>
        {CATEGORIES.map((entry) => {
          const count = countFor(entry.id);
          const is_current = app === null && category === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setApp(null);
                setCategory(entry.id);
              }}
              aria-current={is_current ? "page" : undefined}
              className={`${NAV_ROW} ${is_current ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
            >
              <span className="flex-none opacity-80" aria-hidden="true">{entry.icon}</span>
              <span className="flex-1 truncate">{entry.label}</span>
              {count ? <span className="text-[12px] text-boardtree-text-faint">{count}</span> : null}
            </button>
          );
        })}

        {onUseSlackRecipe && (
          <div aria-label="Integrations" role="group" className="mt-auto pt-6">
            <div className="rounded-[4px] border border-boardtree-border bg-boardtree-surface py-2 text-center text-[13.5px] text-boardtree-text">Integrations / {INTEGRATION_RECIPE_COUNT}</div>
            <div className="mt-3 flex items-center justify-around px-2">
              {INTEGRATION_APPS.filter((entry) => entry === "slack" || onUseConnectedRecipe).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setApp(entry)}
                  title={appLabel(entry)}
                  aria-label={appLabel(entry)}
                  aria-current={app === entry ? "page" : undefined}
                  className={`flex h-9 w-9 items-center justify-center rounded-[6px] hover:bg-boardtree-hover ${app === entry ? "bg-boardtree-accent-surface ring-1 ring-boardtree-accent" : ""}`}
                >
                  {entry === "slack" ? <SlackLogo size={20} /> : <ExternalAppLogo app={entry} size={21} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-boardtree-text font-heading text-page-title">Automation templates</h2>
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
            value={app ?? category}
            onChange={(event) => {
              const value = event.target.value;
              if (INTEGRATION_APPS.includes(value as GalleryApp)) {
                setApp(value as GalleryApp);
                return;
              }
              setApp(null);
              setCategory(value as GalleryCategory);
            }}
            aria-label="Category"
            className="h-9 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[13px] text-boardtree-text md:hidden"
          >
            {CATEGORIES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
            {onUseSlackRecipe && INTEGRATION_APPS.filter((entry) => entry === "slack" || onUseConnectedRecipe).map((entry) => <option key={entry} value={entry}>{appLabel(entry)}</option>)}
          </select>
        </div>

        {app === "slack" && onUseSlackRecipe && <SlackAppPage search={text} onBack={() => setApp(null)} onUse={onUseSlackRecipe} />}
        {app !== null && app !== "slack" && onUseConnectedRecipe && <ConnectedAppPage app={app} search={text} onBack={() => setApp(null)} onUse={onUseConnectedRecipe} />}

        {app === null && show_account && (
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

        {app === null && show_saved && (
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

        {app === null && show_recipes && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} missing={missingColumns(recipe.requires, context)} onUse={pickRecipe} />)}
            {recipes.length === 0 && text !== "" && <div className="col-span-full py-10 text-center text-[13.5px] text-boardtree-text-muted">No templates match your search.</div>}
            {text === "" && <CustomRecipeCard onCustom={onCustom} />}
          </div>
        )}
      </div>
    </div>
  );
}
