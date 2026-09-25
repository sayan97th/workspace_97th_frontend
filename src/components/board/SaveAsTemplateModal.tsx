"use client";
import React, { useEffect, useState } from "react";
import BoardDialog, { DialogPrimaryButton, DialogSecondaryButton } from "./BoardDialog";
import { boardTemplateService } from "@/services/board-template.service";
import { getApiErrorMessage } from "@/lib/api-error";

export type SaveAsTemplateModalProps = {
  is_open: boolean;
  board_id: number;
  board_label: string;
  onSaved?: (template_name: string) => void;
  onClose: () => void;
};

const CATEGORIES: { key: string; label: string }[] = [
  { key: "custom", label: "Saved by your team" },
  { key: "project_management", label: "Project management" },
  { key: "marketing", label: "Marketing" },
  { key: "sales_crm", label: "Sales and CRM" },
  { key: "software", label: "Software development" },
  { key: "operations", label: "Operations" },
  { key: "hr", label: "HR" },
];

/**
 * The board menu's "Save as a template": stores the board's tabs, columns
 * and groups (and optionally its items as sample content) so anyone can
 * start a new board from it in the Template center.
 */
const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({ is_open, board_id, board_label, onSaved, onClose }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [include_items, setIncludeItems] = useState(false);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open) return;
    setName(board_label);
    setDescription("");
    setCategory("custom");
    setIncludeItems(false);
    setError(null);
    setIsSaving(false);
  }, [is_open, board_label]);

  const handleSubmit = async () => {
    const trimmed_name = name.trim();
    if (!trimmed_name || is_saving) return;
    setIsSaving(true);
    setError(null);
    try {
      await boardTemplateService.saveBoardAsTemplate({ board_id, name: trimmed_name, description: description.trim() || null, category, include_items });
      onSaved?.(trimmed_name);
      onClose();
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Couldn't save the template. Please try again."));
      setIsSaving(false);
    }
  };

  const field_class = "w-full rounded-lg border border-shell-border-strong bg-shell-bg px-3.5 py-2.5 text-[14px] text-shell-text outline-none focus:border-brand-500";

  return (
    <BoardDialog
      is_open={is_open}
      title="Save as a template"
      subtitle="Anyone can then create a board like this one from the Template center."
      onClose={onClose}
      footer={
        <>
          <DialogSecondaryButton onClick={onClose}>Cancel</DialogSecondaryButton>
          <DialogPrimaryButton onClick={handleSubmit} disabled={is_saving || !name.trim()}>
            {is_saving ? "Saving…" : "Save template"}
          </DialogPrimaryButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="template-name" className="mb-1.5 block text-[12.5px] font-medium text-shell-text-secondary">
            Template name
          </label>
          <input id="template-name" autoFocus value={name} maxLength={120} onChange={(event) => setName(event.target.value)} className={field_class} />
        </div>
        <div>
          <label htmlFor="template-description" className="mb-1.5 block text-[12.5px] font-medium text-shell-text-secondary">
            Description
          </label>
          <textarea
            id="template-description"
            rows={3}
            value={description}
            maxLength={1000}
            placeholder="What is this template for?"
            onChange={(event) => setDescription(event.target.value)}
            className={`${field_class} resize-none`}
          />
        </div>
        <div>
          <label htmlFor="template-category" className="mb-1.5 block text-[12.5px] font-medium text-shell-text-secondary">
            Category
          </label>
          <select id="template-category" value={category} onChange={(event) => setCategory(event.target.value)} className={field_class}>
            {CATEGORIES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-shell-border px-3.5 py-3 hover:bg-shell-hover">
          <input type="checkbox" checked={include_items} onChange={(event) => setIncludeItems(event.target.checked)} className="mt-0.5" />
          <span>
            <span className="block text-[13.5px] font-medium text-shell-text">Keep the items as sample content</span>
            <span className="block text-[12.5px] text-shell-text-muted">Files and updates are never included.</span>
          </span>
        </label>
        {error && <p className="text-[12.5px] text-red-500">{error}</p>}
      </div>
    </BoardDialog>
  );
};

export default SaveAsTemplateModal;
