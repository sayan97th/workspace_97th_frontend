"use client";
import React, { useMemo, useRef, useState } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import { AttachIcon, FormatToggleIcon, ReactSmileyIcon } from "@/icons/drawer-icons";
import { BellIcon, MentionIcon } from "@/icons/workspace-icons";
import { useEmojiShortcut } from "@/hooks/useEmojiShortcut";
import { useModKeyLabel } from "@/hooks/useModKeyLabel";
import CommentAttachmentChip from "./CommentAttachmentChip";
import { COMMENT_ATTACHMENT_ACCEPT } from "./drawerAttachments";
import EmojiPalette from "./EmojiPalette";
import MentionPicker from "./MentionPicker";
import { hasMentionText } from "./pastedMentions";
import { usePastedMentions } from "./usePastedMentions";
import { buildMentionMatches, mentionOptionUserIds, type MentionOption, type MentionTeam } from "./mentionOptions";
import RichTextComposer, { type RichTextComposerRef } from "./RichTextComposer";
import SavedRepliesMenu from "./SavedRepliesMenu";
import { useMentionPickerNavigation } from "./useMentionPickerNavigation";
import type { DrawerAttachment } from "./types";
import "./comment-edit-form.scss";

export type CommentEditFormProps = {
  value: string;
  onChange: (value: string) => void;
  /** Saves the edit. `mentioned_user_ids` are everyone picked from the `@` list while editing whose `@Name` is still in the text. */
  onSave: (mentioned_user_ids: string[]) => void;
  onCancel: () => void;
  autoFocus?: boolean;
  /** Files of the update being edited, listed under the box with a remove button each. Omitted for a reply, which carries no files. */
  attachments?: DrawerAttachment[];
  /** Switches the "Attach a file" button (and the "/" menu's "File" row) on. Omitted for a reply. */
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (attachment_id: string) => void;
  /** Who typing `@` can tag, the same board roster the composer offers. Empty or omitted switches mentions off. */
  mentionable_people?: BoardPersonOption[];
  /** Account teams offered as group mentions next to "Everyone". */
  mention_teams?: MentionTeam[];
  /** The viewer, never offered in "Everyone" and never listed as someone the save notifies. */
  current_user_id?: string;
  /** People the update already mentions. Saving does not notify them again, so the notice leaves them out. */
  existing_mention_ids?: string[];
};

/** A picked mention, kept with its display name so it only counts while `@Name` is still in the text. */
type MentionPick = { name: string; user_ids: string[] };

// Stable empty defaults: a fresh `[]` per render would rebuild the matches and reset the picker's keyboard cursor.
const NO_PEOPLE: BoardPersonOption[] = [];
const NO_TEAMS: MentionTeam[] = [];
const NO_IDS: string[] = [];

/** How many faces the "Saving notifies" notice stacks before it only counts the rest. */
const NOTICE_AVATAR_LIMIT = 3;

/** "Ana", "Ana and Ben", "Ana, Ben and 2 others". */
const describePeople = (people: BoardPersonOption[]): React.ReactNode => {
  const [first, second] = people;
  if (people.length === 1) return <strong>{first.name}</strong>;
  if (people.length === 2) {
    return (
      <>
        <strong>{first.name}</strong> and <strong>{second.name}</strong>
      </>
    );
  }
  const others = people.length - 2;
  return (
    <>
      <strong>{first.name}</strong>, <strong>{second.name}</strong> and{" "}
      <strong>
        {others} {others === 1 ? "other" : "others"}
      </strong>
    </>
  );
};

/**
 * Inline "edit this comment/reply" form, shown in place of a comment or
 * reply's body while it's being edited. Shared by every drawer flavor the
 * same way `CommentAttachmentChip` already is.
 *
 * Built like `CommentComposer`'s Slack style box (formatting row, editor,
 * then an action row) so editing feels the same as writing: the "Aa"
 * toggle, attaching files (updates only), emoji, saved replies and `@`
 * mention on the left, Cancel and Save on the right. The body being edited
 * is already Markdown, as stored. Nothing is sent until Save, so Cancel (or
 * Escape) drops the text and file changes together.
 *
 * Typing `@` anywhere in the text (or pressing the `@` button) opens the same
 * people picker as the composer, as monday does when editing an update. The
 * form keeps its own picker state rather than the drawer's shared one, since
 * only one edit is open at a time. People tagged here are sent with the save,
 * and the API notifies only the ones the update did not mention before, which
 * the notice under the box spells out. Notify and Schedule stay with the
 * composer, they only apply to a new update.
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
  mentionable_people = NO_PEOPLE,
  mention_teams = NO_TEAMS,
  current_user_id,
  existing_mention_ids = NO_IDS,
}) => {
  const mod_key_label = useModKeyLabel();
  const editor_root_ref = useRef<HTMLDivElement>(null);
  const rich_text_ref = useRef<RichTextComposerRef>(null);
  const file_input_ref = useRef<HTMLInputElement>(null);
  const emoji_trigger_ref = useRef<HTMLButtonElement>(null);
  const [is_toolbar_shown, setIsToolbarShown] = useState(true);
  const [is_emoji_palette_open, setIsEmojiPaletteOpen] = useState(false);
  const [mention_query, setMentionQuery] = useState<string | null>(null);
  const [mention_picks, setMentionPicks] = useState<MentionPick[]>([]);

  const can_mention = mentionable_people.length > 0;

  // Slack style tags from pasted text, kept as picks so they count only while `@Name` is still in the text.
  const pasted_mentions = usePastedMentions({
    markdown: value,
    people: mentionable_people,
    onTag: (tagged) =>
      setMentionPicks((current) => [...current, ...tagged.map((person) => ({ name: person.name, user_ids: [person.id] }))]),
  });

  // Mirrors the hooks' save guard: an update may be only files, but never nothing at all.
  const can_save = value.trim().length > 0 || value.includes("![") || attachments.length > 0;

  const mention_matches = useMemo(
    () =>
      can_mention && mention_query !== null
        ? buildMentionMatches(mentionable_people, mention_query.toLowerCase(), current_user_id, undefined, mention_teams)
        : [],
    [can_mention, mention_query, mentionable_people, current_user_id, mention_teams]
  );

  /** Everyone picked while editing whose `@Name` is still in the text: a pick typed away again tags nobody. */
  const mentioned_ids = useMemo(() => {
    const ids = mention_picks.filter((pick) => hasMentionText(value, pick.name)).flatMap((pick) => pick.user_ids);
    return Array.from(new Set(ids));
  }, [mention_picks, value]);

  // The people this save will notify: new to the update, and never the viewer.
  const newly_mentioned_people = useMemo(
    () =>
      mentioned_ids
        .filter((id) => id !== current_user_id && !existing_mention_ids.includes(id))
        .map((id) => mentionable_people.find((person) => person.id === id))
        .filter((person): person is BoardPersonOption => person !== undefined),
    [mentioned_ids, current_user_id, existing_mention_ids, mentionable_people]
  );

  const handlePickMention = (option: MentionOption) => {
    rich_text_ref.current?.insertMentionText(option.name);
    setMentionPicks((current) => [...current, { name: option.name, user_ids: mentionOptionUserIds(option) }]);
    setMentionQuery(null);
  };

  const mention_navigation = useMentionPickerNavigation(mention_matches, handlePickMention);
  const is_mention_picker_open = mention_navigation.is_open;

  const save = () => onSave(mentioned_ids);

  /** The `@` button types an "@" at the caret, so the picker opens exactly as if it was typed. */
  const startMention = () => rich_text_ref.current?.startMention();

  const toggleEmojiPalette = () => setIsEmojiPaletteOpen((is_open) => !is_open);
  const openFilePicker = () => file_input_ref.current?.click();

  const handleInsertEmoji = (emoji: string) => {
    rich_text_ref.current?.insertText(emoji);
    setIsEmojiPaletteOpen(false);
  };

  // Mac's own emoji picker chord (Control + Command + Space), scoped to this form.
  useEmojiShortcut(editor_root_ref, toggleEmojiPalette);

  return (
    <div className="comment-edit-form mt-2">
      <div ref={editor_root_ref} className="rich-text-box">
        <RichTextComposer
          ref={rich_text_ref}
          embedded
          show_toolbar={is_toolbar_shown}
          value={value}
          onChange={onChange}
          placeholder={can_mention ? "Edit your update, type @ to mention someone" : "Edit your update"}
          min_height_class="min-h-10"
          // While the picker is open Enter picks the highlighted person, so the save chord waits.
          onSubmitShortcut={can_save && !is_mention_picker_open ? save : undefined}
          onEscape={onCancel}
          onMentionQueryChange={can_mention ? setMentionQuery : undefined}
          onSuggestionKeyDown={mention_navigation.handleKeyDown}
          can_mention={can_mention}
          {...pasted_mentions.editor_props}
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
            {can_mention && (
              <button
                type="button"
                // Keeps the caret where it is, so the "@" lands right where the person was typing.
                onMouseDown={(event) => event.preventDefault()}
                onClick={startMention}
                aria-label="Mention someone"
                aria-expanded={is_mention_picker_open}
                title="Mention someone (@)"
                data-active={is_mention_picker_open ? "true" : undefined}
                className="rich-text-tool"
              >
                <MentionIcon size={15} />
              </button>
            )}
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
              onClick={save}
              disabled={!can_save}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              title={`Save (${mod_key_label} + Enter)`}
              className="rich-text-button rich-text-button--primary rich-text-button--sm"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {newly_mentioned_people.length > 0 && (
        <div className="comment-edit-form__notice" role="status" aria-live="polite">
          <span className="comment-edit-form__notice-icon" aria-hidden="true">
            <BellIcon size={12} />
          </span>
          <span className="comment-edit-form__notice-faces" aria-hidden="true">
            {newly_mentioned_people.slice(0, NOTICE_AVATAR_LIMIT).map((person) => (
              <PersonAvatar key={person.id} person={person} size={20} className="comment-edit-form__notice-face" />
            ))}
          </span>
          <span className="comment-edit-form__notice-text">Saving notifies {describePeople(newly_mentioned_people)}</span>
        </div>
      )}

      {is_mention_picker_open && (
        <MentionPicker
          people={mention_matches}
          onPick={handlePickMention}
          getAnchorRect={() => rich_text_ref.current?.getTriggerAnchorRect("@") ?? null}
          active_index={mention_navigation.active_index}
          onHover={mention_navigation.setActiveIndex}
        />
      )}

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
