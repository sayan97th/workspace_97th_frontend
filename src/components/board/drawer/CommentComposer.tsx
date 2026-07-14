"use client";
import React, { useRef } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { AttachIcon, ReactSmileyIcon } from "@/icons/drawer-icons";
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
  onInsertEmoji,
  attachments = [],
  onAddFiles,
  onRemoveAttachment,
}) => {
  const file_input_ref = useRef<HTMLInputElement>(null);
  const is_update = variant === "update";
  const has_draft = value.trim().length > 0;
  const show_mention_picker = mention_target === target && mention_matches.length > 0;
  const show_emoji_palette = emoji_palette_target === target;

  return (
    <div className={`flex ${is_update ? "gap-[11px]" : "gap-2.5"}`}>
      <PersonAvatar person={avatar_person} size={is_update ? 34 : 27} className="mt-0.5" />
      <div className="relative flex-1">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`w-full resize-none rounded-[11px] border border-white/[0.12] bg-[#132524] px-[13px] py-[11px] font-sans text-[13.5px] leading-relaxed text-[#e9eded] outline-none transition-[height] duration-100 placeholder:text-[#6e7b7d] focus:border-[#00c875] ${
            is_update ? "h-16" : has_draft ? "h-[52px]" : "h-10"
          }`}
        />

        {show_mention_picker && <MentionPicker people={mention_matches} onPick={onPickMention} />}

        {(is_update || has_draft) && (
          <div className="mt-2.5 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-1">
              <span className="relative">
                <button
                  type="button"
                  onClick={() => onToggleEmojiPalette(target)}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#8a9495] hover:bg-white/[0.08] hover:text-white"
                >
                  <ReactSmileyIcon size={is_update ? 17 : 16} />
                </button>
                {show_emoji_palette && <EmojiPalette onPick={onInsertEmoji} />}
              </span>
              {is_update && onAddFiles && (
                <>
                  <button
                    type="button"
                    onClick={() => file_input_ref.current?.click()}
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-lg text-[#8a9495] hover:bg-white/[0.08] hover:text-white"
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
              {is_update && <span className="text-xs text-[#6e7b7d]">Shift + Enter for a new line</span>}
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
