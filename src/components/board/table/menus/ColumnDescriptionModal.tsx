"use client";

import { useState } from "react";

/** Matches the API's `config.description` limit. */
const MAX_DESCRIPTION_LENGTH = 1000;

interface ColumnDescriptionModalProps {
  title: string;
  description: string;
  onSave: (description: string | null) => void;
  onClose: () => void;
}

/** The column menu's "Add description": the text the header's (i) shows as "Column description". */
export default function ColumnDescriptionModal({ title, description, onSave, onClose }: ColumnDescriptionModalProps) {
  const [draft, setDraft] = useState(description);
  const trimmed = draft.trim();

  const save = () => {
    onSave(trimmed || null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)] p-2" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Description of the ${title} column`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
        }}
        className="flex w-[440px] max-w-full flex-col rounded-[8px] bg-boardtree-surface p-6 text-left shadow-[0_6px_20px_rgba(0,0,0,0.2)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.55)]"
      >
        <h2 className="mb-1 text-[18px] font-medium leading-6 text-boardtree-text">Column description</h2>
        <p className="mb-4 truncate text-[14px] text-boardtree-text-muted">{title}</p>
        <textarea
          autoFocus
          value={draft}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Describe what this column is for"
          rows={5}
          className="w-full resize-none rounded-[4px] border border-boardtree-border bg-transparent px-3 py-2 text-[14px] leading-5 text-boardtree-text outline-none hover:border-boardtree-text focus:border-[#0073ea]"
        />
        <div className="mt-1 text-right text-[12px] text-boardtree-text-faint">
          {draft.length}/{MAX_DESCRIPTION_LENGTH}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {description && (
            <button
              type="button"
              onClick={() => {
                onSave(null);
                onClose();
              }}
              className="mr-auto flex h-8 items-center rounded-[4px] px-3 text-[14px] text-boardtree-danger hover:bg-boardtree-hover"
            >
              Remove
            </button>
          )}
          <button type="button" onClick={onClose} className="flex h-8 items-center rounded-[4px] px-4 text-[14px] text-boardtree-text hover:bg-boardtree-hover">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={trimmed === description.trim()}
            className="flex h-8 items-center rounded-[4px] bg-[#0073ea] px-4 text-[14px] font-medium text-white hover:bg-[#0060b9] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
