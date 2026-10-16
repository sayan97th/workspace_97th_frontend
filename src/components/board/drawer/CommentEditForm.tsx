"use client";
import React, { useRef, useState } from "react";
import { AttachIcon, FormatToggleIcon, ReactSmileyIcon } from "@/icons/drawer-icons";
import { useEmojiShortcut } from "@/hooks/useEmojiShortcut";
import CommentAttachmentChip from "./CommentAttachmentChip";
import { COMMENT_ATTACHMENT_ACCEPT } from "./drawerAttachments";
import EmojiPalette from "./EmojiPalette";
import RichTextComposer, { type RichTextComposerRef } from "./RichTextComposer";
import SavedRepliesMenu from "./SavedRepliesMenu";
import type { DrawerAttachment } from "./types";

export type CommentEditFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
  /** Files of the update being edited, listed under the box with a remove button each. Omitted for a reply, which carries no files. */
  attachments?: DrawerAttachment[];
  /** Switches the "Attach a file" button (and the "/" menu's "File" row) on. Omitted for a reply. */
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (attachment_id: string) => void;
};

/**
 * Inline "edit this comment/reply" form, shown in place of a comment or
 * reply's body while it's being edited. Shared by every drawer flavor the
 * same way `CommentAttachmentChip` already is.
 *
 * Built like `CommentComposer`'s Slack style box (formatting row, editor,
 * then an action row) so editing feels the same as writing: the "Aa"
 * toggle, attaching files (updates only), emoji and saved replies on the
 * left, Cancel and Save on the right. The body being edited is already
 * Markdown, as stored. Nothing is sent until Save, so Cancel (or Escape)
 * drops the text and file changes together. `@mention`, Notify and Schedule
 * stay with the composer, they only apply to a new update.
 */
const CommentEditForm: React.FC<CommentEditFormProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  autoFocus,
  attachments = [],
  onAddFiles,
  onRemoveAttachment,
}) => {
  const editor_root_ref = useRef<HTMLDivElement>(null);
  const rich_text_ref = useRef<RichTextComposerRef>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const emoji_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_toolbar_shown, setIsToolbarShown] = useState(true);
  const [is_emoji_palette_open, setIsEmojiPaletteOpen] = useState(false);

  // Mirrors the hooks' save guard: an update may be only files, but never nothing at all.
  const can_save = value.trim().length > 0 || value.includes("![") || attachments.length > 0;

  const toggleEmojiPalette = () => setIsEmojiPaletteOpen((is_open) => !is_open);
  const openFilePicker = () => file_input_ref.current?.click();

  const handleInsertEmoji = (emoji: string) => {
    rich_text_ref.current?.insertText(emoji);
    setIsEmojiPaletteOpen(false);
  };

  // Mac's own emoji picker chord (Control + Command + Space), scoped to this form.
  useEmojiShortcut(editor_root_ref, toggleEmojiPalette);

  return (
    <div className="mt-2">
      <div ref={editor_root_ref} className="rich-text-box">
        <RichTextComposer
          ref={rich_text_ref}
          embedded
          show_toolbar={is_toolbar_shown}
          value={value}
          onChange={onChange}
          placeholder="Edit your update"
          min_height_class="min-h-10"
          onEnterSubmit={can_save ? onSave : undefined}
          onEscape={onCancel}
          autoFocus={autoFocus}
          onOpenEmojiPalette={toggleEmojiPalette}
          onAttachFiles={onAddFiles ? openFilePicker : undefined}
        />

        <div className="rich-text-actions">
          <div className="rich-text-actions__group">
            <button
              type="button"
              onClick={() => setIsToolbarShown((is_shown) => !is_shown)}
              aria-label={is_toolbar_shown ? "Hide formatting options" : "Show formatting options"}
              aria-pressed={is_toolbar_shown}
              title={is_toolbar_shown ? "Hide formatting options" : "Show formatting options"}
              data-active={is_toolbar_shown ? "true" : undefined}
              className="rich-text-tool"
            >
              <FormatToggleIcon size={15} />
            </button>
            {onAddFiles && (
              <>
                <button type="button" onClick={openFilePicker} aria-label="Attach a file" title="Attach a file" className="rich-text-tool">
                  <AttachIcon />
                </button>
                <input
                  ref={file_input_ref}
                  type="file"
                  multiple
                  accept={COMMENT_ATTACHMENT_ACCEPT}
                  className="hidden"
                  onChange={(event) => {
                    onAddFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </>
            )}
            <span className="relative">
              <button
                ref={emoji_trigger_ref}
                type="button"
                onClick={toggleEmojiPalette}
                aria-label="Add an emoji"
                aria-expanded={is_emoji_palette_open}
                title="Add an emoji"
                className="rich-text-tool"
              >
                <ReactSmileyIcon size={16} />
              </button>
              <EmojiPalette
                anchor_el={emoji_trigger_ref.current}
                is_open={is_emoji_palette_open}
                onClose={() => setIsEmojiPaletteOpen(false)}
                onPick={handleInsertEmoji}
                mode="insert"
              />
            </span>
            <SavedRepliesMenu draft={value} onInsert={(reply) => rich_text_ref.current?.insertMarkdown(reply.body)} icon_size={16} />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCancel}
              title="Cancel (Esc)"
              className="rich-text-button rich-text-button--ghost rich-text-button--sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!can_save}
              title="Save (Enter)"
              className="rich-text-button rich-text-button--primary rich-text-button--sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {attachments.length > 0 && onRemoveAttachment && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <CommentAttachmentChip key={attachment.id} attachment={attachment} onRemove={onRemoveAttachment} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentEditForm;
