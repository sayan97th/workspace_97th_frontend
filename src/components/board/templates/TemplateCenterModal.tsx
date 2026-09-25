"use client";
import React, { useEffect, useMemo, useState } from "react";
import BoardDialog, { DialogPrimaryButton, DialogSecondaryButton } from "../BoardDialog";
import { COLUMN_KIND_SWATCH, type BoardColumnKind } from "../columnTypes";
import ColumnSwatchBadge from "../toolbar/ColumnSwatchBadge";
import { getBoardViewTypeOption } from "../boardViewTypes";
import { boardTemplateService } from "@/services/board-template.service";
import { getApiErrorMessage } from "@/lib/api-error";
import type { BoardTemplateCategory, BoardTemplateDto } from "@/types/board-template";

export type TemplateCenterModalProps = {
  is_open: boolean;
  onClose: () => void;
  /** Creates the board and resolves with its id, the modal then closes and the caller navigates to it. */
  onUseTemplate: (template: BoardTemplateDto, label: string) => Promise<void>;
};

const ALL_KEY = "__all__";

/**
 * The Template center, monday.com style: ready made boards and the boards
 * your team saved as templates, browsable by category and searchable, with a
 * preview of each template's tabs, columns, groups and sample items before
 * creating a board from it.
 */
const TemplateCenterModal: React.FC<TemplateCenterModalProps> = ({ is_open, onClose, onUseTemplate }) => {
  const [templates, setTemplates] = useState<BoardTemplateDto[]>([]);
  const [categories, setCategories] = useState<BoardTemplateCategory[]>([]);
  const [is_loading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(ALL_KEY);
  const [query, setQuery] = useState("");
  const [selected_id, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open) return;
    setSelectedId(null);
    setQuery("");
    setCategory(ALL_KEY);
    setIsLoading(true);
    setError(null);
    boardTemplateService
      .listTemplates()
      .then((response) => {
        setTemplates(response.templates);
        setCategories(response.categories);
      })
      .catch((caught) => setError(getApiErrorMessage(caught, "Couldn't load the templates. Please try again.")))
      .finally(() => setIsLoading(false));
  }, [is_open]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return templates.filter(
      (template) =>
        (category === ALL_KEY || template.category === category) &&
        (!term || template.name.toLowerCase().includes(term) || (template.description ?? "").toLowerCase().includes(term))
    );
  }, [templates, category, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const template of templates) map[template.category] = (map[template.category] ?? 0) + 1;
    return map;
  }, [templates]);

  const selected = templates.find((template) => template.id === selected_id) ?? null;

  const handleDelete = async (template: BoardTemplateDto) => {
    try {
      await boardTemplateService.deleteTemplate(template.id);
      setTemplates((current) => current.filter((entry) => entry.id !== template.id));
      setSelectedId(null);
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Couldn't delete the template."));
    }
  };

  return (
    <BoardDialog is_open={is_open} title="Template center" subtitle="Start a new board from a ready made structure." onClose={onClose} width={1000}>
      {error && <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-500">{error}</p>}

      {selected ? (
        <TemplatePreview template={selected} onBack={() => setSelectedId(null)} onUse={onUseTemplate} onDelete={handleDelete} />
      ) : (
        <div className="flex min-h-[460px] flex-col gap-5 md:flex-row">
          <nav aria-label="Template categories" className="flex flex-none flex-row gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-visible">
            {[{ key: ALL_KEY, label: "All templates" }, ...categories.filter((entry) => counts[entry.key])].map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-current={category === entry.key}
                onClick={() => setCategory(entry.key)}
                className={`flex flex-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] ${
                  category === entry.key ? "bg-shell-hover font-semibold text-shell-text" : "text-shell-text-muted hover:bg-shell-hover"
                }`}
              >
                <span className="whitespace-nowrap">{entry.label}</span>
                <span className="text-[12px] text-shell-text-faint">{entry.key === ALL_KEY ? templates.length : counts[entry.key]}</span>
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates"
              aria-label="Search templates"
              className="mb-4 w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-2.5 text-[13.5px] text-shell-text outline-none focus:border-brand-500"
            />
            {is_loading ? (
              <p className="py-16 text-center text-[13px] text-shell-text-muted">Loading templates…</p>
            ) : visible.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-shell-text-muted">No templates match your search.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((template) => (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(template.id)}
                      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-shell-border bg-shell-panel text-left transition-colors hover:border-brand-500"
                    >
                      <TemplateThumbnail template={template} />
                      <span className="flex flex-1 flex-col gap-1 px-3.5 py-3">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold text-shell-text">{template.name}</span>
                          {template.kind === "custom" && <span className="flex-none rounded bg-shell-hover px-1.5 py-0.5 text-[10.5px] font-medium text-shell-text-muted">Team</span>}
                        </span>
                        <span className="line-clamp-2 text-[12.5px] text-shell-text-muted">{template.description || "No description"}</span>
                        <span className="mt-auto pt-1 text-[11.5px] text-shell-text-faint">
                          {template.preview.columns.length} columns · {template.preview.views.length} {template.preview.views.length === 1 ? "view" : "views"}
                          {template.kind === "custom" && template.creator ? ` · by ${template.creator.full_name}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </BoardDialog>
  );
};

/** A small drawing of the board: its groups as colored bars with item rows. */
function TemplateThumbnail({ template }: { template: BoardTemplateDto }) {
  const groups = template.preview.groups.slice(0, 3);
  return (
    <span aria-hidden className="flex h-24 flex-col gap-1.5 border-b border-shell-border px-3.5 py-3" style={{ background: `${template.color ?? "#579bfc"}14` }}>
      {(groups.length ? groups : [{ name: "", color: template.color, item_names: ["", ""], item_count: 2 }]).map((group, index) => (
        <span key={index} className="flex items-center gap-1.5">
          <span className="h-3.5 w-1 flex-none rounded-full" style={{ background: group.color ?? template.color ?? "#579bfc" }} />
          <span className="h-2 flex-1 rounded-full bg-shell-border" />
          <span className="h-2 w-8 flex-none rounded-full" style={{ background: `${group.color ?? "#579bfc"}88` }} />
        </span>
      ))}
    </span>
  );
}

function TemplatePreview({
  template,
  onBack,
  onUse,
  onDelete,
}: {
  template: BoardTemplateDto;
  onBack: () => void;
  onUse: (template: BoardTemplateDto, label: string) => Promise<void>;
  onDelete: (template: BoardTemplateDto) => Promise<void>;
}) {
  const [label, setLabel] = useState(template.name);
  const [is_creating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [is_confirming_delete, setIsConfirmingDelete] = useState(false);

  const handleUse = async () => {
    if (!label.trim() || is_creating) return;
    setIsCreating(true);
    setError(null);
    try {
      await onUse(template, label.trim());
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Couldn't create the board. Please try again."));
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 md:flex-row">
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onBack} className="mb-3 text-[13px] font-medium text-brand-500 hover:underline">
          ‹ All templates
        </button>
        <h2 className="text-[20px] font-semibold text-shell-text">{template.name}</h2>
        {template.description && <p className="mt-1 text-[13.5px] text-shell-text-muted">{template.description}</p>}

        <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-shell-text-muted">Views</h3>
        <div className="flex flex-wrap gap-2">
          {template.preview.views.map((view, index) => {
            const option = getBoardViewTypeOption(view.view_type);
            const Icon = option.Icon;
            return (
              <span key={index} className="flex items-center gap-1.5 rounded-lg border border-shell-border px-2.5 py-1 text-[12.5px] text-shell-text-secondary">
                <Icon size={13} className="text-shell-text-muted" />
                {view.label}
              </span>
            );
          })}
        </div>

        <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-shell-text-muted">Columns</h3>
        <div className="flex flex-wrap gap-2">
          {template.preview.columns.map((column, index) => (
            <span key={index} className="flex items-center gap-1.5 rounded-lg border border-shell-border py-1 pl-1 pr-2.5 text-[12.5px] text-shell-text-secondary">
              <ColumnSwatchBadge swatch={COLUMN_KIND_SWATCH[column.type as BoardColumnKind] ?? COLUMN_KIND_SWATCH.text} size={18} />
              {column.label}
            </span>
          ))}
        </div>

        <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-wide text-shell-text-muted">
          Groups {template.includes_items ? `and ${template.preview.item_count} sample items` : ""}
        </h3>
        <div className="flex flex-col gap-2.5">
          {template.preview.groups.map((group, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-shell-border">
              <div className="flex items-center gap-2 border-l-4 px-3 py-1.5 text-[13px] font-semibold" style={{ borderColor: group.color ?? "#579bfc", color: group.color ?? undefined }}>
                {group.name}
                <span className="text-[11.5px] font-normal text-shell-text-faint">
                  {group.item_count} {group.item_count === 1 ? "item" : "items"}
                </span>
              </div>
              {group.item_names.map((name, item_index) => (
                <div key={item_index} className="border-t border-shell-border px-4 py-1.5 text-[12.5px] text-shell-text-secondary">
                  {name}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <aside className="flex flex-none flex-col gap-3 rounded-xl border border-shell-border bg-shell-bg p-4 md:w-72 md:self-start">
        <label htmlFor="template-board-name" className="text-[12.5px] font-medium text-shell-text-secondary">
          Board name
        </label>
        <input
          id="template-board-name"
          value={label}
          maxLength={255}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void handleUse()}
          className="w-full rounded-lg border border-shell-border-strong bg-shell-panel px-3.5 py-2.5 text-[14px] text-shell-text outline-none focus:border-brand-500"
        />
        <DialogPrimaryButton onClick={handleUse} disabled={is_creating || !label.trim()} className="w-full">
          {is_creating ? "Creating board…" : "Use template"}
        </DialogPrimaryButton>
        {error && <p className="text-[12.5px] text-red-500">{error}</p>}
        <p className="text-[12px] text-shell-text-faint">The board is created in this workspace. You can move it to a folder later.</p>
        {template.can_delete &&
          (is_confirming_delete ? (
            <DialogSecondaryButton className="text-red-500" onClick={() => void onDelete(template)}>
              Confirm delete
            </DialogSecondaryButton>
          ) : (
            <DialogSecondaryButton className="text-red-500" onClick={() => setIsConfirmingDelete(true)}>
              Delete template
            </DialogSecondaryButton>
          ))}
      </aside>
    </div>
  );
}

export default TemplateCenterModal;
