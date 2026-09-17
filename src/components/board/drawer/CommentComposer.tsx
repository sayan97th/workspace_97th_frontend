"use client";
import React, { useEffect, useRef } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { AttachIcon, ReactSmileyIcon } from "@/icons/drawer-icons";
import { BellIcon } from "@/icons/workspace-icons";
import { useEmojiShortcut } from "@/hooks/useEmojiShortcut";
import CommentAttachmentChip from "./CommentAttachmentChip";
import EmojiPalette from "./EmojiPalette";
import MentionPicker from "./MentionPicker";
import RichTextComposer, { type RichTextComposerRef } from "./RichTextComposer";
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
  /** All people who could be flagged via "Notify" — same roster as `mention_matches` draws from, unfiltered. */
  mentionable_people?: BoardPersonOption[];
  notify_target?: DrawerComposerTarget | null;
  onToggleNotifyPicker?: (target: DrawerComposerTarget) => void;
  onCloseNotifyPicker?: () => void;
  onPickNotifyPerson?: (person: BoardPersonOption) => void;
  notified_people?: BoardPersonOption[];
  onRemoveNotifyPerson?: (person_id: string) => void;
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
  mentionable_people = [],
  notify_target,
  onToggleNotifyPicker,
  onCloseNotifyPicker,
  onPickNotifyPerson,
  notified_people = [],
  onRemoveNotifyPerson,
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
  const notify_trigger_ref = useRef<HTMLButtonElement>(null);
  const notify_picker_ref = useRef<HTMLDivElement>(null);
  const editor_root_ref = useRef<HTMLDivElement>(null);
  const rich_text_ref = useRef<RichTextComposerRef>(null);
  const is_update = variant === "update";
  const has_draft = value.replace(/<[^>]*>/g, "").trim().length > 0 || value.includes("<img");
  const show_mention_picker = mention_target === target && mention_matches.length > 0;
  const show_notify_picker = notify_target === target;
  const show_emoji_palette = emoji_palette_target === target;
  const can_notify = Boolean(onToggleNotifyPicker && onPickNotifyPerson);

  const handlePickMention = (person: BoardPersonOption) => {
    rich_text_ref.current?.insertMentionText(person.name);
    onPickMention(person);
  };

  const handleInsertEmoji = (emoji: string) => {
    rich_text_ref.current?.insertText(emoji);
    onInsertEmoji(emoji);
  };

  // Mac's own emoji-picker chord (Control + Command + Space), scoped to this
  // composer's own editable root so it opens this draft's palette rather
  // than whichever one last toggled.
  useEmojiShortcut(editor_root_ref, () => onToggleEmojiPalette(target));

  // Unlike the `@mention` picker (which closes itself once the trigger text
  // no longer matches), the Notify picker is opened by an explicit button
  // press and has no such natural close signal — dismiss it on any click
  // outside its own trigger + dropdown instead.
  useEffect(() => {
    if (!show_notify_picker || !onCloseNotifyPicker) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target_node = event.target as Node;
      if (notify_trigger_ref.current?.contains(target_node)) return;
      if (notify_picker_ref.current?.contains(target_node)) return;
      onCloseNotifyPicker();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [show_notify_picker, onCloseNotifyPicker]);

  return (
    <div className={`flex ${is_update ? "gap-[11px]" : "gap-2.5"}`}>
      <PersonAvatar person={avatar_person} size={is_update ? 34 : 27} className="mt-0.5" />
      <div className="relative flex-1">
        {notified_people.length > 0 && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <BellIcon size={12} className="text-shell-text-faint" />
            {notified_people.map((person) => (
              <span
                key={person.id}
                className="flex items-center gap-1 rounded-full bg-shell-hover-strong px-2 py-0.5 text-[11.5px] font-semibold text-shell-text-secondary"
              >
                {person.name}
                {onRemoveNotifyPerson && (
                  <button
                    type="button"
                    onClick={() => onRemoveNotifyPerson(person.id)}
                    aria-label={`Stop notifying ${person.name}`}
                    className="text-shell-text-faint hover:text-shell-text"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        <div ref={editor_root_ref}>
          <RichTextComposer
            ref={rich_text_ref}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            min_height_class={is_update ? "min-h-16" : has_draft ? "min-h-[52px]" : "min-h-10"}
          />
        </div>

        {show_mention_picker && <MentionPicker people={mention_matches} onPick={handlePickMention} />}
        {show_notify_picker && onPickNotifyPerson && (
          <div ref={notify_picker_ref}>
            <MentionPicker people={mentionable_people} onPick={onPickNotifyPerson} />
          </div>
        )}

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
                  onPick={handleInsertEmoji}
                  mode="insert"
                />
              </span>
              {can_notify && (
                <span className="relative">
                  <button
                    ref={notify_trigger_ref}
                    type="button"
                    onClick={() => onToggleNotifyPicker?.(target)}
                    aria-label="Notify someone"
                    title="Notify someone without mentioning them"
                    className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-shell-hover hover:text-shell-text ${
                      show_notify_picker ? "bg-shell-hover text-shell-text" : "text-shell-text-muted"
                    }`}
                  >
                    <BellIcon size={is_update ? 16 : 15} />
                  </button>
                </span>
              )}
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
