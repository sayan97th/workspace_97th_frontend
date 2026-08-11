"use client";
import React from "react";

export type CommentEditFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
};

/**
 * Inline "edit this comment/reply" form — a textarea plus Save/Cancel, shown
 * in place of a comment or reply's body while it's being edited. Shared by
 * every drawer flavor the same way `CommentAttachmentChip` already is.
 */
const CommentEditForm: React.FC<CommentEditFormProps> = ({ value, onChange, onSave, onCancel, autoFocus }) => (
  <div className="mt-1.5">
    <textarea
      autoFocus={autoFocus}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onSave();
        }
        if (event.key === "Escape") onCancel();
      }}
      rows={2}
      className="w-full resize-y rounded-lg border border-shell-border-strong bg-shell-panel px-3 py-2 text-[13.5px] leading-relaxed text-shell-text-secondary outline-none focus:border-[#00c875]"
    />
    <div className="mt-1.5 flex items-center gap-2">
      <button
        type="button"
        onClick={onSave}
        className="rounded-lg bg-[#00c875] px-3 py-1 font-sans text-[12px] font-bold text-[#04241a] hover:bg-[#00e084]"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg px-3 py-1 text-[12px] font-semibold text-shell-text-muted hover:bg-shell-hover"
      >
        Cancel
      </button>
    </div>
  </div>
);

export default CommentEditForm;
