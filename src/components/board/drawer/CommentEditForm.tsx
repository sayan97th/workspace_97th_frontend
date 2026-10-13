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
 * Inline "edit this comment/reply" form, a rich text box plus Save/Cancel,
 * shown in place of a comment or reply's body while it's being edited.
 * Shared by every drawer flavor the same way `CommentAttachmentChip` already
 * is. Uses the same `RichTextComposer` as the main composer (the body being
 * edited is already Markdown, as stored), just without its `@mention`/emoji/attach
 * affordances, which apply to composing a new update, not touching up one
 * already posted.
 */
const CommentEditForm: React.FC<CommentEditFormProps> = ({ value, onChange, onSave, onCancel, autoFocus }) => (
  <div className="mt-2">
    <RichTextComposer
      value={value}
      onChange={onChange}
      placeholder="Edit your update"
      min_height_class="min-h-10"
      onEnterSubmit={onSave}
      onEscape={onCancel}
      autoFocus={autoFocus}
    />
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="rich-text-hint max-sm:!hidden">
        <kbd>Esc</kbd> to cancel, <kbd>Enter</kbd> to save
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <button type="button" onClick={onCancel} className="rich-text-button rich-text-button--ghost rich-text-button--sm">
          Cancel
        </button>
        <button type="button" onClick={onSave} className="rich-text-button rich-text-button--primary rich-text-button--sm">
          Save
        </button>
      </div>
    </div>
  </div>
);

export default CommentEditForm;
