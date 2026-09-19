"use client";
import React, { useEffect, useRef, useState } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { AttachIcon, FormatToggleIcon, ReactSmileyIcon, SendIcon } from "@/icons/drawer-icons";
import { BellIcon } from "@/icons/workspace-icons";
import { useEmojiShortcut } from "@/hooks/useEmojiShortcut";
import CommentAttachmentChip from "./CommentAttachmentChip";
import EmojiPalette from "./EmojiPalette";
import MentionPicker from "./MentionPicker";
import type { MentionOption } from "./mentionOptions";
import RichTextComposer, { type RichTextComposerRef } from "./RichTextComposer";
import type { DrawerAttachment, DrawerComposerTarget } from "./types";

export type CommentComposerProps = {
  /** Identifies this composer among the drawer's shared mention/emoji palette state: "composer" for the top-level update box, or the parent comment id for a reply box. */
  target: DrawerComposerTarget;
  /**
   * Shown beside the box when given — the per-reply box inside a thread
   * uses this to stay visually aligned with the avatar column every posted
   * reply already has. Omitted by the top-level "write an update" composer,
   * which reclaims that width for the editor instead (who's typing there is
   * implicit: it's always the current user).
   */
  avatar_person?: BoardPersonOption;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  submit_label: string;
  /** "update" shows the always-visible toolbar + attachments tray; "reply" only reveals its (lighter) toolbar once a draft is in progress. */
  variant?: "update" | "reply";
  mention_target: DrawerComposerTarget | null;
  mention_matches: MentionOption[];
  onPickMention: (option: MentionOption) => void;
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
  // An update can also be submitted with only an attachment and no text
  // (mirrors the `isRichTextEmpty(body) && attachments.length === 0` guard
  // in `useBoardItemDrawer`'s `postComment`), so the send button shouldn't
  // disable itself in that case.
  const has_draft = value.trim().length > 0 || value.includes("![") || attachments.length > 0;
  const show_mention_picker = mention_target === target && mention_matches.length > 0;
  const show_notify_picker = notify_target === target;
  const show_emoji_palette = emoji_palette_target === target;
  const can_notify = Boolean(onToggleNotifyPicker && onPickNotifyPerson);
  // The "Aa" button toggles this directly — independent of `variant`, so it
  // actually does something for the always-visible "update" box too, not
  // just the reply box (which only shows the toggle once `has_draft`, same
  // as the rest of its action row).
  const [toolbar_hidden, setToolbarHidden] = useState(false);
  const show_toolbar = !toolbar_hidden;

  const handlePickMention = (option: MentionOption) => {
    rich_text_ref.current?.insertMentionText(option.name);
    onPickMention(option);
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
    // The top-level "write an update" composer omits `avatar_person` (who's
    // typing there is implicit — it's always the current user — and the
    // reclaimed width goes straight to the editor); each thread's reply box
    // still passes it, to stay aligned with the avatar column every posted
    // reply already has.
    <div className={avatar_person ? `flex ${is_update ? "gap-[11px]" : "gap-2.5"}` : undefined}>
      {avatar_person && <PersonAvatar person={avatar_person} size={is_update ? 34 : 27} className="mt-0.5" />}
      <div className={avatar_person ? "relative flex-1" : "relative"}>
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

        {/* One Slack-style bordered container: formatting toolbar, editor, then the action row — each separated by a hairline divider instead of the toolbar floating detached above its own boxed textarea. */}
        <div
          ref={editor_root_ref}
          className="overflow-hidden rounded-xl border border-shell-border-strong bg-shell-panel transition-colors focus-within:border-[#00c875]"
        >
          <RichTextComposer
            ref={rich_text_ref}
            embedded
            show_toolbar={show_toolbar}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            min_height_class={is_update ? "min-h-16" : has_draft ? "min-h-[52px]" : "min-h-10"}
            // Enter sends, matching Slack's own convention, except while a
            // mention/notify picker is open: neither has its own
            // Enter-to-select yet (only click), so Enter falls back to its
            // default behavior instead of firing a submit mid-pick.
            onEnterSubmit={show_mention_picker || show_notify_picker ? undefined : onSubmit}
          />

          {(is_update || has_draft) && (
            <div className="flex items-center justify-between gap-2.5 border-t border-shell-border px-[7px] py-[6px]">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setToolbarHidden((hidden) => !hidden)}
                  aria-label={show_toolbar ? "Hide formatting options" : "Show formatting options"}
                  aria-pressed={show_toolbar}
                  title={show_toolbar ? "Hide formatting options" : "Show formatting options"}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-lg hover:bg-shell-hover hover:text-shell-text ${
                    show_toolbar ? "bg-shell-hover text-shell-text" : "text-shell-text-muted"
                  }`}
                >
                  <FormatToggleIcon size={is_update ? 16 : 15} />
                </button>
                {is_update && onAddFiles && (
                  <>
                    <button
                      type="button"
                      onClick={() => file_input_ref.current?.click()}
                      aria-label="Attach a file"
                      title="Attach a file"
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
                <span className="relative">
                  <button
                    ref={emoji_trigger_ref}
                    type="button"
                    onClick={() => onToggleEmojiPalette(target)}
                    aria-label="Add an emoji"
                    title="Add an emoji"
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
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden text-xs text-shell-text-faint sm:inline">Shift + Enter for a new line</span>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!has_draft}
                  aria-label={submit_label}
                  title={submit_label}
                  className={`flex items-center justify-center rounded-lg font-sans font-bold transition-colors ${
                    is_update ? "h-[34px] w-[34px]" : "h-[30px] w-[30px]"
                  } ${
                    has_draft
                      ? "bg-[#00c875] text-[#04241a] hover:bg-[#00e084]"
                      : "cursor-not-allowed bg-shell-hover text-shell-text-faint"
                  }`}
                >
                  <SendIcon size={is_update ? 16 : 15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {show_mention_picker && <MentionPicker people={mention_matches} onPick={handlePickMention} />}
        {show_notify_picker && onPickNotifyPerson && (
          <div ref={notify_picker_ref}>
            <MentionPicker people={mentionable_people} onPick={onPickNotifyPerson} />
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
