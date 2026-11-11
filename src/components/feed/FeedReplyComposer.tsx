"use client";
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import EmojiPalette from "@/components/board/drawer/EmojiPalette";
import MentionPicker from "@/components/board/drawer/MentionPicker";
import {
  buildMentionMatches,
  MENTION_TRIGGER,
  mentionOptionUserIds,
  type MentionOption,
  type MentionTeam,
} from "@/components/board/drawer/mentionOptions";
import RichTextComposer, { type RichTextComposerRef } from "@/components/board/drawer/RichTextComposer";
import { useMentionPickerNavigation } from "@/components/board/drawer/useMentionPickerNavigation";
import { ReactSmileyIcon } from "@/icons/drawer-icons";
import { MentionIcon } from "@/icons/workspace-icons";
import { useModKeyLabel } from "@/hooks/useModKeyLabel";

type FeedReplyComposerProps = {
  current_user: BoardPersonOption;
  /** Resolves who can be `@mentioned` in a reply, called once the first time the composer is focused. */
  loadPeople: () => Promise<BoardPersonOption[]>;
  /** Resolves the account teams that can be group `@mentioned`, loaded together with the people. Optional: without it only Everyone and individuals are offered. */
  loadTeams?: () => Promise<MentionTeam[]>;
  onSubmit: (body: string, mentioned_user_ids: number[]) => void;
  placeholder: string;
  /** Body the box starts with, used by "Edit update". */
  initial_value?: string;
  /** Label of the blue send button, "Reply" by default. */
  submit_label?: string;
  /** Shows a Cancel button next to the send button, for "Edit update". */
  onCancel?: () => void;
  /** Focuses the box as soon as it mounts, used when the Reply button opens it. */
  auto_focus?: boolean;
  /** Hides the viewer's avatar, for the edit box that replaces the update body. */
  hide_avatar?: boolean;
};

/** What a feed card can ask of its reply box. */
export type FeedReplyComposerRef = {
  /** Focuses the box and `@mentions` the person at the end of the draft (Reply under a reply), so they are notified too. */
  mentionPerson: (person: { id: string; name: string }) => void;
  focus: () => void;
};

/** A picked mention, kept with its display name so it only counts while `@Name` is still in the body. */
type MentionPick = { name: string; user_ids: string[] };

/** A rich text body counts as empty when it has no visible text and no inline image (`![alt](url)`). */
const isBodyEmpty = (markdown: string): boolean => markdown.trim().length === 0 && !markdown.includes("![");

/**
 * The Update feed card's reply box, laid out like monday.com's inbox: the
 * viewer's avatar beside a roomy rounded box, and under it the Emoji and
 * Mention tools on the left and the blue Reply button on the right. It is
 * the same Markdown editor the item drawer uses (`@mentions` including the
 * "Everyone" group and teams). People come from the update's board, loaded
 * the first time the box is focused rather than for every card up front.
 * Command/Control + Enter sends, plain Enter adds a new line.
 */
const FeedReplyComposer = forwardRef<FeedReplyComposerRef, FeedReplyComposerProps>(function FeedReplyComposer(
  { current_user, loadPeople, loadTeams, onSubmit, placeholder, initial_value = "", submit_label = "Reply", onCancel, auto_focus = false, hide_avatar = false },
  ref
) {
  const mod_key_label = useModKeyLabel();
  const rich_text_ref = useRef<RichTextComposerRef>(null);
  const emoji_trigger_ref = useRef<HTMLButtonElement>(null);
  const has_requested_people_ref = useRef(false);

  const [value, setValue] = useState(initial_value);
  const [people, setPeople] = useState<BoardPersonOption[]>([]);
  const [teams, setTeams] = useState<MentionTeam[]>([]);
  const [mention_query, setMentionQuery] = useState<string | null>(null);
  const [mention_picks, setMentionPicks] = useState<MentionPick[]>([]);
  const [is_emoji_open, setIsEmojiOpen] = useState(false);

  const has_draft = !isBodyEmpty(value);

  const mention_matches = useMemo(
    () => (mention_query === null ? [] : buildMentionMatches(people, mention_query, current_user.id, undefined, teams)),
    [mention_query, people, teams, current_user.id]
  );

  const ensurePeopleLoaded = () => {
    if (has_requested_people_ref.current) return;
    has_requested_people_ref.current = true;
    loadPeople()
      .then(setPeople)
      .catch(() => {
        // Let the next focus retry, mentions just won't autocomplete until then.
        has_requested_people_ref.current = false;
      });
    loadTeams?.()
      .then(setTeams)
      .catch(() => {
        // Without teams the picker still offers Everyone and every person.
      });
  };

  useEffect(() => {
    if (!auto_focus) return;
    // The editor mounts a frame after this box, so focus waits for it.
    const frame = requestAnimationFrame(() => rich_text_ref.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [auto_focus]);

  const handleChange = (next_value: string) => {
    setValue(next_value);
    const match = MENTION_TRIGGER.exec(next_value);
    setMentionQuery(match ? match[1].toLowerCase() : null);
  };

  const handlePickMention = (option: MentionOption) => {
    rich_text_ref.current?.insertMentionText(option.name);
    setMentionPicks((current) => [...current, { name: option.name, user_ids: mentionOptionUserIds(option) }]);
    setMentionQuery(null);
  };

  useImperativeHandle(
    ref,
    () => ({
      mentionPerson: (person) => {
        ensurePeopleLoaded();
        rich_text_ref.current?.mentionAtEnd(person.name);
        setMentionPicks((current) =>
          current.some((pick) => pick.name === person.name) ? current : [...current, { name: person.name, user_ids: [person.id] }]
        );
      },
      focus: () => rich_text_ref.current?.focus(),
    }),
    // ensurePeopleLoaded only reads refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const mention_navigation = useMentionPickerNavigation(mention_matches, handlePickMention);
  const is_picker_open = mention_navigation.is_open;

  /** Ids of everyone still `@mentioned` in the body: a pick whose text was edited away no longer notifies anyone. */
  const collectMentionedIds = (body: string): number[] => {
    const ids = mention_picks
      .filter((pick) => body.includes(`@${pick.name}`))
      .flatMap((pick) => pick.user_ids.map(Number));
    return Array.from(new Set(ids));
  };

  const submit = () => {
    const body = value.trim();
    if (isBodyEmpty(body)) return;
    onSubmit(body, collectMentionedIds(body));
    setValue("");
    setMentionPicks([]);
    setMentionQuery(null);
  };

  /** The Mention tool types "@" so the people picker opens, the same as typing it. */
  const startMention = () => {
    ensurePeopleLoaded();
    rich_text_ref.current?.focus();
    const needs_space = value.length > 0 && !/\s$/.test(value);
    rich_text_ref.current?.insertText(needs_space ? " @" : "@");
  };

  return (
    <div className="feed-composer" onFocusCapture={ensurePeopleLoaded}>
      {!hide_avatar && <PersonAvatar person={current_user} size={28} className="feed-composer__avatar" />}

      <div className="feed-composer__main">
        <div className="feed-composer__box">
          <RichTextComposer
            ref={rich_text_ref}
            embedded
            show_toolbar={false}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            min_height_class="min-h-[64px]"
            // Command/Control + Enter sends, plain Enter adds a new line. Not while the
            // mention list is open: there Enter picks the highlighted person.
            onSubmitShortcut={is_picker_open ? undefined : submit}
            onSuggestionKeyDown={mention_navigation.handleKeyDown}
            can_mention
            onOpenEmojiPalette={() => setIsEmojiOpen(true)}
          />
        </div>

        <div className="feed-composer__footer">
          <div className="feed-composer__tools">
            <button
              ref={emoji_trigger_ref}
              type="button"
              onClick={() => setIsEmojiOpen((open) => !open)}
              aria-expanded={is_emoji_open}
              className="feed-composer__tool"
            >
              <ReactSmileyIcon size={15} />
              Emoji
            </button>
            <EmojiPalette
              anchor_el={emoji_trigger_ref.current}
              is_open={is_emoji_open}
              onClose={() => setIsEmojiOpen(false)}
              onPick={(emoji) => {
                rich_text_ref.current?.insertText(emoji);
                setIsEmojiOpen(false);
              }}
              mode="insert"
            />
            <button type="button" onClick={startMention} className="feed-composer__tool">
              <MentionIcon size={14} />
              Mention
            </button>
          </div>

          <div className="feed-composer__buttons">
            {onCancel && (
              <button type="button" onClick={onCancel} className="feed-composer__cancel">
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={!has_draft}
              aria-keyshortcuts="Meta+Enter Control+Enter"
              title={`${submit_label} (${mod_key_label} + Enter)`}
              className="feed-composer__send"
            >
              {submit_label}
            </button>
          </div>
        </div>

        {is_picker_open && (
          <MentionPicker
            people={mention_matches}
            onPick={handlePickMention}
            getAnchorRect={() => rich_text_ref.current?.getTriggerAnchorRect("@") ?? null}
            active_index={mention_navigation.active_index}
            onHover={mention_navigation.setActiveIndex}
          />
        )}
      </div>
    </div>
  );
});

export default FeedReplyComposer;
