"use client";
import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BoardAutomationTemplateDto } from "@/types/board-automation";
import { SearchIcon } from "@/icons/workspace-icons";
import type { AutomationBuilderContext } from "./automationCatalog";
import { describeDefinition, sentenceText } from "./automationSentence";
import { AUTOMATION_RECIPES, TEMPLATE_CATEGORIES, titleParts, type AutomationRecipe, type TemplateCategory } from "./automationTemplates";

export type TemplateGalleryProps = {
  context: AutomationBuilderContext;
  saved_templates: BoardAutomationTemplateDto[];
  is_loading_saved: boolean;
  onUseRecipe: (recipe: AutomationRecipe) => void;
  onUseSaved: (template: BoardAutomationTemplateDto) => void;
  onDeleteSaved: (template_id: number) => Promise<void>;
  onCustom: () => void;
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

/**
 * The Create tab: built-in recipes by category, the board's saved templates, and a way to start
 * from a blank sentence. Picking a card opens the builder with the sentence prefilled.
 */
export default function TemplateGallery({ context, saved_templates, is_loading_saved, onUseRecipe, onUseSaved, onDeleteSaved, onCustom }: TemplateGalleryProps) {
  const [category, setCategory] = useState<TemplateCategory | "all" | "saved">("all");
  const [search, setSearch] = useState("");
  const [deleting_id, setDeletingId] = useState<number | null>(null);

  const text = search.trim().toLowerCase();
  const recipes = AUTOMATION_RECIPES.filter((recipe) => (category === "all" || recipe.category === category) && recipe.title.replace(/\*/g, "").toLowerCase().includes(text));
  const saved = saved_templates.filter((template) => `${template.name} ${template.description ?? ""}`.toLowerCase().includes(text));
  const show_saved = category === "saved" || (category === "all" && saved.length > 0);

  const deleteSaved = async (template_id: number) => {
    setDeletingId(template_id);
    try {
      await onDeleteSaved(template_id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <nav aria-label="Template categories" className="hidden w-[230px] flex-none flex-col gap-1 border-r border-boardtree-border-soft bg-boardtree-panel-alt px-3 py-5 md:flex">
        <div className="mb-2 px-3 text-[16px] font-semibold text-boardtree-text">Categories</div>
        {TEMPLATE_CATEGORIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setCategory(entry.id)}
            aria-current={category === entry.id ? "page" : undefined}
            className={`${NAV_ROW} ${category === entry.id ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
          >
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.id === "saved" && saved_templates.length > 0 && <span className="text-[12px] text-boardtree-text-faint">{saved_templates.length}</span>}
          </button>
        ))}
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
            onChange={(event) => setCategory(event.target.value as TemplateCategory | "all" | "saved")}
            aria-label="Category"
            className="h-9 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[13px] text-boardtree-text md:hidden"
          >
            {TEMPLATE_CATEGORIES.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </div>

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
                  <div key={template.id} className={CARD}>
                    <button type="button" onClick={() => onUseSaved(template)} className="absolute inset-0 rounded-[10px]" aria-label={`Use template ${template.name}`} />
                    <div className="pointer-events-none">
                      <div className="mb-1 text-[14px] font-semibold text-boardtree-text">{template.name}</div>
                      <p className="line-clamp-3 text-[13px] leading-snug text-boardtree-text-secondary">{sentenceText(describeDefinition(template.definition, context))}</p>
                    </div>
                    <div className="relative mt-3 flex items-center justify-between">
                      <span className="text-[12px] text-boardtree-text-faint">{template.created_by?.name ? `By ${template.created_by.name}` : "Saved template"}</span>
                      <button
                        type="button"
                        disabled={deleting_id === template.id}
                        onClick={() => void deleteSaved(template.id)}
                        aria-label={`Delete template ${template.name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-[6px] text-boardtree-text-faint opacity-0 transition-opacity hover:bg-boardtree-hover hover:text-boardtree-danger focus:opacity-100 group-hover:opacity-100 disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {category !== "saved" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.map((recipe) => (
              <button key={recipe.id} type="button" onClick={() => onUseRecipe(recipe)} className={CARD}>
                <RecipeTitle title={recipe.title} />
                <span className="mt-3 self-start rounded-[4px] border border-boardtree-border px-2.5 py-1 text-[12px] font-medium text-boardtree-text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                  Use template
                </span>
              </button>
            ))}
            {recipes.length === 0 && <div className="col-span-full py-10 text-center text-[13.5px] text-boardtree-text-muted">No templates match your search.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
