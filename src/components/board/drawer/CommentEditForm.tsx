"use client";
import React from "react";
import RichTextComposer from "./RichTextComposer";

export type CommentEditFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
};

/**
 * Inline "edit this comment/reply" form — a rich text box plus Save/Cancel,
 * shown in place of a comment or reply's body while it's being edited.
 * Shared by every drawer flavor the same way `CommentAttachmentChip` already
 * is. Uses the same `RichTextComposer` as the main composer (the body being
 * edited is already sanitized HTML), just without its `@mention`/emoji/attach
 * affordances — those apply to composing a new update, not touching up one
 * already posted.
 */
const CommentEditForm: React.FC<CommentEditFormProps> = ({ value, onChange, onSave, onCancel, autoFocus }) => (
  <div className="mt-1.5">
    <RichTextComposer
      value={value}
      onChange={onChange}
      placeholder="Edit your update"
      min_height_class="min-h-10"
      onEnterSubmit={onSave}
      onEscape={onCancel}
      autoFocus={autoFocus}
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
