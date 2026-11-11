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
import SavedRepliesMenu from "@/components/board/drawer/SavedRepliesMenu";
import { markdownToPlainText } from "@/components/board/drawer/commentFilters";
import { useMentionPickerNavigation } from "@/components/board/drawer/useMentionPickerNavigation";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { FormatToggleIcon, ReactSmileyIcon } from "@/icons/drawer-icons";
import { MentionIcon } from "@/icons/workspace-icons";
import { useModKeyLabel } from "@/hooks/useModKeyLabel";
import { useFeedComposerToolbar } from "./useFeedComposerToolbar";

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

/** An inline image (`![alt](url)`), which is content on its own even without text. */
const INLINE_IMAGE_PATTERN = /!\[[^\]]*\]\([^)]+\)/;

/**
 * A draft counts as empty when the editor shows no text and holds no inline
 * image. Read from the editor's plain text, so a body made only of Markdown
 * syntax (an empty bullet, a bare quote) is empty too, as the API rules.
 */
const isDraftEmpty = (markdown: string, plain_text: string): boolean =>
  plain_text.trim().length === 0 && !INLINE_IMAGE_PATTERN.test(markdown);

/** Markdown the editor turns into formatting as it is typed, listed in the "Markdown" hint. */
const MARKDOWN_SHORTCUTS: { syntax: string; result: string }[] = [
  { syntax: "**bold**", result: "Bold" },
  { syntax: "*italic*", result: "Italic" },
  { syntax: "~~strike~~", result: "Strikethrough" },
  { syntax: "`code`", result: "Inline code" },
  { syntax: "# Title", result: "Title" },
  { syntax: "- item", result: "Bulleted list" },
  { syntax: "1. item", result: "Numbered list" },
  { syntax: "[ ] task", result: "To do" },
  { syntax: "> quote", result: "Quote" },
  { syntax: "```", result: "Code block" },
  { syntax: "/", result: "All blocks" },
];

const markdown_help = (
  <span className="feed-composer__md-help">
    <span className="feed-composer__md-help-title">Markdown is supported</span>
    {MARKDOWN_SHORTCUTS.map((shortcut) => (
      <span key={shortcut.syntax} className="feed-composer__md-help-row">
        <code>{shortcut.syntax}</code>
        <span>{shortcut.result}</span>
      </span>
    ))}
    <span className="feed-composer__md-help-note">Pasted Markdown is formatted too.</span>
  </span>
);

/**
 * The Update feed card's reply box, laid out like monday.com's inbox: the
 * viewer's avatar beside a roomy rounded box, and under it the Format,
 * Emoji, Mention and Saved replies tools on the left and the blue Reply
 * button on the right. It is the same Markdown editor the item drawer uses:
 * the formatting toolbar (shown or hidden with Format, remembered per
 * browser), Markdown typed or pasted as formatting, the "/" block menu,
 * links, pasted images and `@mentions` including the "Everyone" group and
 * teams. The body is sent as Markdown and rendered by `RichTextContent`.
 * People come from the update's board, loaded the first time the box is
 * focused rather than for every card up front.
 * Command/Control + Enter sends, plain Enter adds a new line, Escape cancels an edit.
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
  // The editor's own text, without any Markdown syntax, for the empty check.
  const [plain_text, setPlainText] = useState(() => markdownToPlainText(initial_value));
  const { is_toolbar_shown, toggleToolbar } = useFeedComposerToolbar();
  const [people, setPeople] = useState<BoardPersonOption[]>([]);
  const [teams, setTeams] = useState<MentionTeam[]>([]);
  const [mention_query, setMentionQuery] = useState<string | null>(null);
  const [mention_picks, setMentionPicks] = useState<MentionPick[]>([]);
  const [is_emoji_open, setIsEmojiOpen] = useState(false);

  const has_draft = !isDraftEmpty(value, plain_text);

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
    if (isDraftEmpty(body, plain_text)) return;
    onSubmit(body, collectMentionedIds(body));
    setValue("");
    setPlainText("");
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
        <div className="feed-composer__box" data-toolbar={is_toolbar_shown ? "true" : undefined}>
          <RichTextComposer
            ref={rich_text_ref}
            embedded
            show_toolbar={is_toolbar_shown}
            value={value}
            onChange={handleChange}
            onPlainTextChange={setPlainText}
            placeholder={placeholder}
            min_height_class="min-h-[64px]"
            onEscape={onCancel}
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
              type="button"
              onClick={toggleToolbar}
              aria-pressed={is_toolbar_shown}
              title={is_toolbar_shown ? "Hide formatting options" : "Show formatting options"}
              className="feed-composer__tool"
            >
              <FormatToggleIcon size={16} />
              Format
            </button>
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
            <SavedRepliesMenu draft={value} onInsert={(reply) => rich_text_ref.current?.insertMarkdown(reply.body)} icon_size={16} />
            <PortalTooltip content={markdown_help} className="max-sm:!hidden">
              <span className="feed-composer__md-badge" tabIndex={0} aria-label="Markdown is supported">
                <MarkdownMarkIcon />
              </span>
            </PortalTooltip>
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

/** The Markdown mark ("M" and a down arrow in a rounded box). */
const MarkdownMarkIcon: React.FC = () => (
  <svg width="22" height="14" viewBox="0 0 208 128" fill="none" aria-hidden="true">
    <rect x="5" y="5" width="198" height="118" rx="15" stroke="currentColor" strokeWidth="10" />
    <path d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39H30zm125 0l-30-33h20V30h20v35h20l-30 33z" fill="currentColor" />
  </svg>
);

export default FeedReplyComposer;
