"use client";
import React, { useRef } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { AttachIcon, ReactSmileyIcon } from "@/icons/drawer-icons";
import { useEmojiShortcut } from "@/hooks/useEmojiShortcut";
import CommentAttachmentChip from "./CommentAttachmentChip";
import EmojiPalette from "./EmojiPalette";
import MentionPicker from "./MentionPicker";
import type { DrawerAttachment, DrawerComposerTarget } from "./types";

export type CommentComposerProps = {
  /** Identifies this composer among the drawer's shared mention/emoji palette state: "composer" for the top-level update box, or the parent comment id for a reply box. */
  target: DrawerComposerTarget;
  avatar_person: BoardPersonOption;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submit_label: string;
  /** "update" shows the always-visible toolbar + attachments tray; "reply" only reveals its (lighter) toolbar once a draft is in progress. */
  variant?: "update" | "reply";
  mention_target: DrawerComposerTarget | null;
  mention_matches: BoardPersonOption[];
  onPickMention: (person: BoardPersonOption) => void;
  emoji_palette_target: DrawerComposerTarget | null;
  onToggleEmojiPalette: (target: DrawerComposerTarget) => void;
  onCloseEmojiPalette: () => void;
  onInsertEmoji: (emoji: string) => void;
  attachments?: DrawerAttachment[];
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (attachment_id: string) => void;
};

/**
 * Textarea + `@mention` autocomplete + emoji insert (+ file attach, for updates) used
 * both for the drawer's top-level "write an update" box and every comment's reply box.
 */
const CommentComposer: React.FC<CommentComposerProps> = ({
  target,
  avatar_person,
  value,
  onChange,
  onSubmit,
  placeholder,
  submit_label,
  variant = "update",
  mention_target,
  mention_matches,
  onPickMention,
  emoji_palette_target,
  onToggleEmojiPalette,
  onCloseEmojiPalette,
  onInsertEmoji,
  attachments = [],
  onAddFiles,
  onRemoveAttachment,
}) => {
  const file_input_ref = useRef<HTMLInputElement>(null);
  const emoji_trigger_ref = useRef<HTMLButtonElement>(null);
  const textarea_ref = useRef<HTMLTextAreaElement>(null);
  const is_update = variant === "update";
  const has_draft = value.trim().length > 0;
  const show_mention_picker = mention_target === target && mention_matches.length > 0;
  const show_emoji_palette = emoji_palette_target === target;

  // Mac's own emoji-picker chord (Control + Command + Space), scoped to this
  // composer's own textarea so it opens this draft's palette rather than
  // whichever one last toggled.
  useEmojiShortcut(textarea_ref, () => onToggleEmojiPalette(target));

  return (
    <div className={`flex ${is_update ? "gap-[11px]" : "gap-2.5"}`}>
      <PersonAvatar person={avatar_person} size={is_update ? 34 : 27} className="mt-0.5" />
      <div className="relative flex-1">
        <textarea
          ref={textarea_ref}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full resize-none overflow-hidden rounded-[11px] border border-shell-border-strong bg-shell-panel px-[13px] py-[11px] font-sans text-[13.5px] leading-relaxed text-shell-text outline-none transition-[height] duration-100 placeholder:text-shell-text-faint focus:border-[#00c875] ${
            is_update ? "h-16" : has_draft ? "h-[52px]" : "h-10"
          }`}
        />

        {show_mention_picker && <MentionPicker people={mention_matches} onPick={onPickMention} />}

        {(is_update || has_draft) && (
          <div className="mt-2.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-1">
              <span className="relative">
                <button
                  ref={emoji_trigger_ref}
                  type="button"
                  onClick={() => onToggleEmojiPalette(target)}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
                >
                  <ReactSmileyIcon size={is_update ? 17 : 16} />
                </button>
                <EmojiPalette
                  anchor_el={emoji_trigger_ref.current}
                  is_open={show_emoji_palette}
                  onClose={onCloseEmojiPalette}
                  onPick={onInsertEmoji}
                  mode="insert"
                />
              </span>
              {is_update && onAddFiles && (
                <>
                  <button
                    type="button"
                    onClick={() => file_input_ref.current?.click()}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
                  >
                    <AttachIcon />
                  </button>
                  <input
                    ref={file_input_ref}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      onAddFiles(Array.from(event.target.files ?? []));
                      event.target.value = "";
                    }}
                  />
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {is_update && <span className="text-xs text-shell-text-faint">Shift + Enter for a new line</span>}
              <button
                type="button"
                onClick={onSubmit}
                className={`rounded-lg bg-[#00c875] font-sans font-bold text-[#04241a] hover:bg-[#00e084] ${
                  is_update ? "px-[18px] py-2 text-[13px]" : "px-4 py-[7px] text-[12.5px]"
                }`}
              >
                {submit_label}
              </button>
            </div>
          </div>
        )}

        {is_update && attachments.length > 0 && onRemoveAttachment && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <CommentAttachmentChip key={attachment.id} attachment={attachment} onRemove={onRemoveAttachment} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentComposer;
