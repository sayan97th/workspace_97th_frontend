"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { AssignPersonIcon, AttachIcon, FormatToggleIcon, ReactSmileyIcon, SendIcon } from "@/icons/drawer-icons";
import { BellIcon, ClockIcon } from "@/icons/workspace-icons";
import { useEmojiShortcut } from "@/hooks/useEmojiShortcut";
import { useSavedReplies } from "@/hooks/useSavedReplies";
import CommentAttachmentChip from "./CommentAttachmentChip";
import ComposerAssignMenu from "./ComposerAssignMenu";
import ComposerScheduleMenu from "./ComposerScheduleMenu";
import ComposerSuggestionMenu from "./ComposerSuggestionMenu";
import EmojiPalette from "./EmojiPalette";
import MentionPicker from "./MentionPicker";
import type { MentionOption } from "./mentionOptions";
import RichTextComposer, { type ComposerTrigger, type RichTextComposerRef } from "./RichTextComposer";
import SavedRepliesMenu from "./SavedRepliesMenu";
import { formatDueDate, formatScheduledTime } from "./scheduleFormat";
import { buildSlashSuggestions, filterReferenceItems, type SlashSuggestion } from "./slashCommands";
import { empty_assignment } from "./useCommentCollaboration";
import type { CommentQuoteRequest, ComposerAssignment, DrawerAttachment, DrawerComposerTarget, DrawerReferenceItem } from "./types";

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
  /** Items typing `#` can link to. Omit to switch the `#` picker off. */
  reference_items?: DrawerReferenceItem[];
  /** ISO time the update will be sent at. Passing `onScheduleChange` switches the "Schedule send" button on. */
  schedule_at?: string | null;
  onScheduleChange?: (scheduled_at: string | null) => void;
  /** Who and when the update assigns on the item. Passing `onAssignmentChange` switches the "Assign" button on. */
  assignment?: ComposerAssignment;
  onAssignmentChange?: (assignment: ComposerAssignment) => void;
  /** A comment to quote into this box, appended below whatever is already typed. */
  quote_request?: CommentQuoteRequest;
};

/** Which menu the composer is offering for the text at the caret, if any. */
type ComposerMenuKind = "slash" | "reference";

/**
 * Textarea + `@mention` autocomplete + emoji insert (+ file attach, for updates) used
 * both for the drawer's top-level "write an update" box and every comment's reply box.
 * Typing `/` opens a command menu (mention, date, emoji, lists, quote, code, divider and
 * the user's saved replies), typing `#` links another item of the board, and the
 * "Saved replies" toolbar button inserts or saves reusable templates.
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
  reference_items = [],
  schedule_at = null,
  onScheduleChange,
  assignment = empty_assignment,
  onAssignmentChange,
  quote_request,
}) => {
  const file_input_ref = useRef<HTMLInputElement>(null);
  const emoji_trigger_ref = useRef<HTMLButtonElement>(null);
  const notify_trigger_ref = useRef<HTMLButtonElement>(null);
  const notify_picker_ref = useRef<HTMLDivElement>(null);
  const editor_root_ref = useRef<HTMLDivElement>(null);
  const rich_text_ref = useRef<RichTextComposerRef>(null);
  const is_update = variant === "update";
  const can_schedule = Boolean(onScheduleChange);
  const can_assign = Boolean(onAssignmentChange);
  const is_assigning = assignment.user_ids.length > 0 || assignment.due_date !== null;
  const assigned_people = mentionable_people.filter((person) => assignment.user_ids.includes(person.id));
  const effective_submit_label = schedule_at ? "Schedule" : submit_label;
  // Only quote requests that arrive after this box mounted count, so remounting a thread never replays an old one.
  const handled_quote_key_ref = useRef(quote_request?.key ?? 0);
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

  // `/` and `#` menus: the editor reports the trigger at the caret, this owns the keyboard cursor.
  const { saved_replies, ensureLoaded: ensureSavedRepliesLoaded } = useSavedReplies();
  const [trigger, setTrigger] = useState<ComposerTrigger | null>(null);
  const [suggestion_index, setSuggestionIndex] = useState(0);
  // Escape hides the menu for the text typed so far, it returns once the query changes.
  const [dismissed_key, setDismissedKey] = useState<string | null>(null);
  const trigger_key = trigger ? `${trigger.kind}:${trigger.query}` : null;

  const slash_suggestions = useMemo(
    () => (trigger?.kind === "slash" ? buildSlashSuggestions(trigger.query, saved_replies) : []),
    [trigger, saved_replies]
  );
  const reference_matches = useMemo(
    () => (trigger?.kind === "reference" ? filterReferenceItems(reference_items, trigger.query) : []),
    [trigger, reference_items]
  );
  const menu_kind: ComposerMenuKind | null = trigger?.kind ?? null;
  const menu_length = menu_kind === "slash" ? slash_suggestions.length : reference_matches.length;
  const is_suggestion_menu_open = menu_kind !== null && menu_length > 0 && dismissed_key !== trigger_key;

  useEffect(() => {
    setSuggestionIndex(0);
  }, [trigger_key]);

  useEffect(() => {
    if (!quote_request || quote_request.key === handled_quote_key_ref.current) return;
    handled_quote_key_ref.current = quote_request.key;
    rich_text_ref.current?.appendMarkdownBlock(quote_request.markdown);
  }, [quote_request]);

  // A schedule and an assignment cannot go out together (the assignment happens the moment the update is posted), so choosing one clears the other.
  const changeSchedule = (next: string | null) => {
    onScheduleChange?.(next);
    if (next !== null && is_assigning) onAssignmentChange?.(empty_assignment);
  };
  const changeAssignment = (next: ComposerAssignment) => {
    onAssignmentChange?.(next);
    if ((next.user_ids.length > 0 || next.due_date !== null) && schedule_at !== null) onScheduleChange?.(null);
  };

  useEffect(() => {
    if (trigger?.kind === "slash") ensureSavedRepliesLoaded();
  }, [trigger?.kind, ensureSavedRepliesLoaded]);

  const handleTriggerChange = (next: ComposerTrigger | null) => {
    setTrigger(next);
    if (next === null) setDismissedKey(null);
  };

  const pickSuggestion = (index: number) => {
    const editor = rich_text_ref.current;
    if (!editor) return;

    if (menu_kind === "slash") {
      const suggestion: SlashSuggestion | undefined = slash_suggestions[index];
      if (!suggestion) return;
      editor.applySlashCommand(suggestion.action);
      if (suggestion.action.type === "emoji") onToggleEmojiPalette(target);
    } else {
      const item = reference_matches[index];
      if (!item) return;
      editor.insertItemReference(item.name, item.href);
    }
    setTrigger(null);
  };

  // While a menu is open it claims the arrows, Enter, Tab and Escape, so Enter picks a row instead of sending the update.
  const handleSuggestionKeyDown = (event: KeyboardEvent): boolean => {
    if (!is_suggestion_menu_open) return false;

    if (event.key === "ArrowDown") setSuggestionIndex((index) => (index + 1) % menu_length);
    else if (event.key === "ArrowUp") setSuggestionIndex((index) => (index - 1 + menu_length) % menu_length);
    else if (event.key === "Enter" || event.key === "Tab") pickSuggestion(suggestion_index);
    else if (event.key === "Escape") setDismissedKey(trigger_key);
    else return false;

    return true;
  };

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

        {(schedule_at || is_assigning) && (
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {schedule_at && (
              <span className="flex items-center gap-1.5 rounded-full bg-shell-hover-strong px-2.5 py-0.5 text-[11.5px] font-semibold text-[#7fb2ff]">
                <ClockIcon size={11} />
                Sends {formatScheduledTime(schedule_at)}
                <button
                  type="button"
                  onClick={() => changeSchedule(null)}
                  aria-label="Send right away instead"
                  className="text-shell-text-faint hover:text-shell-text"
                >
                  ×
                </button>
              </span>
            )}
            {is_assigning && (
              <span className="flex items-center gap-1.5 rounded-full bg-shell-hover-strong px-2.5 py-0.5 text-[11.5px] font-semibold text-shell-text-secondary">
                <AssignPersonIcon size={11} className="text-[#7fb2ff]" />
                {assigned_people.length > 0
                  ? `Assigns ${assigned_people.map((person) => person.name).join(", ")}`
                  : "Sets a due date"}
                {assignment.due_date ? `, due ${formatDueDate(assignment.due_date)}` : ""}
                <button
                  type="button"
                  onClick={() => changeAssignment(empty_assignment)}
                  aria-label="Do not assign"
                  className="text-shell-text-faint hover:text-shell-text"
                >
                  ×
                </button>
              </span>
            )}
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
            onTriggerChange={handleTriggerChange}
            onSuggestionKeyDown={handleSuggestionKeyDown}
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
                <SavedRepliesMenu
                  draft={value}
                  onInsert={(reply) => rich_text_ref.current?.insertMarkdown(reply.body)}
                  icon_size={is_update ? 17 : 16}
                />
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
                {can_schedule && <ComposerScheduleMenu value={schedule_at} onChange={changeSchedule} icon_size={is_update ? 16 : 15} />}
                {can_assign && (
                  <ComposerAssignMenu
                    people={mentionable_people}
                    value={assignment}
                    onChange={changeAssignment}
                    icon_size={is_update ? 16 : 15}
                  />
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <span className="hidden text-xs text-shell-text-faint sm:inline">Shift + Enter for a new line</span>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={!has_draft}
                  aria-label={effective_submit_label}
                  title={effective_submit_label}
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
        {is_suggestion_menu_open && (
          <ComposerSuggestionMenu
            title={menu_kind === "slash" ? "Commands" : "Link an item"}
            items={
              menu_kind === "slash"
                ? slash_suggestions.map((suggestion) => ({ id: suggestion.id, label: suggestion.label, description: suggestion.description }))
                : reference_matches.map((item) => ({ id: item.id, label: item.name }))
            }
            active_index={suggestion_index}
            onPick={pickSuggestion}
            onHover={setSuggestionIndex}
          />
        )}
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
