"use client";
import React, { useMemo, useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import EmojiPalette from "@/components/board/drawer/EmojiPalette";
import MentionPicker from "@/components/board/drawer/MentionPicker";
import {
  buildMentionMatches,
  MENTION_TRIGGER,
  mentionOptionUserIds,
  type MentionOption,
} from "@/components/board/drawer/mentionOptions";
import RichTextComposer, { type RichTextComposerRef } from "@/components/board/drawer/RichTextComposer";
import { FormatToggleIcon, ReactSmileyIcon, SendIcon } from "@/icons/drawer-icons";
import { ClockIcon } from "@/icons/workspace-icons";

type FeedReplyComposerProps = {
  current_user: BoardPersonOption;
  /** Resolves who can be `@mentioned` in a reply, called once the first time the composer is focused. */
  loadPeople: () => Promise<BoardPersonOption[]>;
  onSubmit: (body: string, mentioned_user_ids: number[]) => void;
  onSchedule: (body: string, mentioned_user_ids: number[], scheduled_at: string) => void;
  placeholder: string;
};

/** A picked mention, kept with its display name so it only counts while `@Name` is still in the body. */
type MentionPick = { name: string; user_ids: string[] };

/** A rich text body counts as empty when it has no visible text and no inline image (`![alt](url)`). */
const isBodyEmpty = (markdown: string): boolean => markdown.trim().length === 0 && !markdown.includes("![");

/**
 * The Update feed card's inline reply box: the same Markdown editor the item
 * drawer uses (formatting, emoji, `@mentions` including the "Everyone" group)
 * plus "schedule for later". People come from the update's board, loaded the
 * first time the box is focused rather than for every card up front.
 */
const FeedReplyComposer: React.FC<FeedReplyComposerProps> = ({
  current_user,
  loadPeople,
  onSubmit,
  onSchedule,
  placeholder,
}) => {
  const rich_text_ref = useRef<RichTextComposerRef>(null);
  const emoji_trigger_ref = useRef<HTMLButtonElement>(null);
  const has_requested_people_ref = useRef(false);

  const [value, setValue] = useState("");
  const [people, setPeople] = useState<BoardPersonOption[]>([]);
  const [mention_query, setMentionQuery] = useState<string | null>(null);
  const [mention_picks, setMentionPicks] = useState<MentionPick[]>([]);
  const [is_emoji_open, setIsEmojiOpen] = useState(false);
  const [is_toolbar_visible, setIsToolbarVisible] = useState(false);
  const [is_scheduling, setIsScheduling] = useState(false);
  const [scheduled_at, setScheduledAt] = useState("");

  const has_draft = !isBodyEmpty(value);

  const mention_matches = useMemo(
    () => (mention_query === null ? [] : buildMentionMatches(people, mention_query, current_user.id)),
    [mention_query, people, current_user.id]
  );
  const is_picker_open = mention_matches.length > 0;

  const ensurePeopleLoaded = () => {
    if (has_requested_people_ref.current) return;
    has_requested_people_ref.current = true;
    loadPeople()
      .then(setPeople)
      .catch(() => {
        // Let the next focus retry, mentions just won't autocomplete until then.
        has_requested_people_ref.current = false;
      });
  };

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

  /** Ids of everyone still `@mentioned` in the body: a pick whose text was edited away no longer notifies anyone. */
  const collectMentionedIds = (body: string): number[] => {
    const ids = mention_picks
      .filter((pick) => body.includes(`@${pick.name}`))
      .flatMap((pick) => pick.user_ids.map(Number));
    return Array.from(new Set(ids));
  };

  const reset = () => {
    setValue("");
    setMentionPicks([]);
    setMentionQuery(null);
    setScheduledAt("");
    setIsScheduling(false);
  };

  const submit = () => {
    const body = value.trim();
    if (isBodyEmpty(body) || is_scheduling) return;
    onSubmit(body, collectMentionedIds(body));
    reset();
  };

  const submitSchedule = () => {
    const body = value.trim();
    if (isBodyEmpty(body) || !scheduled_at) return;
    onSchedule(body, collectMentionedIds(body), new Date(scheduled_at).toISOString());
    reset();
  };

  return (
    <div className="flex gap-[11px]" onFocusCapture={ensurePeopleLoaded}>
      <PersonAvatar person={current_user} size={30} className="mt-0.5" />

      <div className="relative min-w-0 flex-1">
        <div className="overflow-hidden rounded-xl border border-shell-border bg-shell-panel-alt transition-colors focus-within:border-brand-500">
          <RichTextComposer
            ref={rich_text_ref}
            embedded
            show_toolbar={is_toolbar_visible}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            min_height_class="min-h-10"
            // Enter sends, except while the mention list is open: it has no
            // Enter-to-select yet (only click), so Enter keeps its default there.
            onEnterSubmit={is_picker_open ? undefined : submit}
          />

          <div className="flex items-center justify-between gap-2.5 border-t border-shell-border px-[7px] py-[5px]">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setIsToolbarVisible((visible) => !visible)}
                aria-label={is_toolbar_visible ? "Hide formatting options" : "Show formatting options"}
                aria-pressed={is_toolbar_visible}
                title={is_toolbar_visible ? "Hide formatting options" : "Show formatting options"}
                className={`flex h-[28px] w-[28px] items-center justify-center rounded-lg hover:bg-shell-hover hover:text-shell-text ${
                  is_toolbar_visible ? "bg-shell-hover text-shell-text" : "text-shell-text-muted"
                }`}
              >
                <FormatToggleIcon size={15} />
              </button>
              <span className="relative">
                <button
                  ref={emoji_trigger_ref}
                  type="button"
                  onClick={() => setIsEmojiOpen((open) => !open)}
                  aria-label="Add an emoji"
                  title="Add an emoji"
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
                >
                  <ReactSmileyIcon size={16} />
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
              </span>
              <button
                type="button"
                onClick={() => setIsScheduling((previous) => !previous)}
                aria-label="Schedule this update for later"
                aria-pressed={is_scheduling}
                title="Schedule for later"
                className={`flex h-[28px] w-[28px] items-center justify-center rounded-lg hover:bg-shell-hover ${
                  is_scheduling ? "text-[#7fb2ff]" : "text-shell-text-muted hover:text-shell-text"
                }`}
              >
                <ClockIcon size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!has_draft || is_scheduling}
              aria-label="Reply"
              title="Reply"
              className={`flex h-[28px] w-[28px] items-center justify-center rounded-lg transition-colors ${
                has_draft && !is_scheduling
                  ? "bg-[#00c875] text-[#04241a] hover:bg-[#00e084]"
                  : "cursor-not-allowed bg-shell-hover text-shell-text-faint"
              }`}
            >
              <SendIcon size={14} />
            </button>
          </div>
        </div>

        {is_picker_open && <MentionPicker people={mention_matches} onPick={handlePickMention} placement="above" />}

        {is_scheduling && (
          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduled_at}
              onChange={(event) => setScheduledAt(event.target.value)}
              aria-label="Send at"
              className="rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={submitSchedule}
              disabled={!has_draft || !scheduled_at}
              className="rounded-[8px] bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Schedule
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedReplyComposer;
