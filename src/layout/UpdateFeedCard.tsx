"use client";
import React, { useEffect, useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import RichTextContent from "@/components/board/drawer/RichTextContent";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import FeedActivityTimeline from "@/components/feed/FeedActivityTimeline";
import FeedReplyComposer, { type FeedReplyComposerRef } from "@/components/feed/FeedReplyComposer";
import FeedThreadReply from "@/components/feed/FeedThreadReply";
import { useFoldedReplies } from "@/components/board/drawer/useFoldedReplies";
import { countThreadUnread, isThreadUnread } from "@/hooks/feedThreads";
import type { FeedActor } from "@/data/update-feed-data";
import PersonHoverCard from "@/components/people/PersonHoverCard";
import { loadFeedBoardPeople, loadFeedBoardTeams } from "@/lib/feed-people";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import DeactivatedBadge from "@/components/board/DeactivatedBadge";
import EmojiPalette from "@/components/board/drawer/EmojiPalette";
import LikeButton from "@/components/board/drawer/LikeButton";
import ReactionPill from "@/components/board/drawer/ReactionPill";
import ReactionsSummary from "@/components/board/drawer/ReactionsSummary";
import { PinIcon } from "@/icons/board-icons";
import { ReactSmileyIcon } from "@/icons/drawer-icons";
import {
  BookmarkIcon,
  ChevronRightIcon,
  EyeIcon,
  LinkIcon,
  MoreDotsIcon,
  ReplyIcon,
  ViewsIcon,
} from "@/icons/workspace-icons";
import { feed_reply_placeholder, type FeedUpdate } from "@/data/update-feed-data";
import "@/components/board/drawer/thread-reply.scss";
import "./update-feed-card.scss";

type UpdateFeedCardProps = {
  update: FeedUpdate;
  /** The signed-in user, shown beside the reply box. */
  current_user: BoardPersonOption;
  /** Fired when the Like action is pressed on the update or one of its replies (`id` says which), toggles the viewer's like. */
  onLike?: (id: string) => void;
  /** Fired when an emoji is picked or a reaction pill is clicked, on the update or one of its replies, toggles the viewer's reaction with that emoji. */
  onReact?: (id: string, emoji: string) => void;
  /** Fired when the Bookmark action is pressed. */
  onBookmark?: (id: string) => void;
  /** Fired when the Pin action is pressed. */
  onPin?: (id: string) => void;
  /** Fired when a reply is submitted from the inline composer, with the ids of everyone it `@mentions`. */
  onReply?: (id: string, body: string, mentioned_user_ids: number[]) => void;
  /** Fired when a reply is scheduled for a later time from the inline composer. */
  onSchedule?: (id: string, body: string, scheduled_at: string, mentioned_user_ids: number[]) => void;
  /** Fired once an unread card has stayed on screen for a moment, so scrolling past it does not count as reading it. */
  onMarkSeen?: (id: string) => void;
  /** Fired by the card menu's "Mark as unread". */
  onMarkUnread?: (id: string) => void;
  /** Fired by the card menu's follow and unfollow entries, for the update's item or its board. */
  onFollow?: (type: "board" | "item", id: number, following: boolean) => void;
};

/** How long an unread card must stay mostly on screen before it counts as read. */
const SEEN_DWELL_MS = 1200;

/** A card counts as on screen when most of it shows, or (for a very tall card) a good slice of it does. */
const SEEN_VISIBLE_RATIO = 0.6;
const SEEN_VISIBLE_MIN_HEIGHT_PX = 240;

/**
 * A single update thread in the feed, laid out like monday.com's inbox: the
 * update itself, then every reply inline under it in soft bubbles
 * (`FeedThreadReply`), then the reply box, so answering a thread never adds a
 * card of its own. The update shows the author's avatar (with a profile hover
 * card), date, an "Unread" marker (or "N new replies") until it has been on screen for a moment
 * (the accent bar stays for the rest of the session), the board breadcrumb it is scoped to, the message body, an
 * reactions row (emoji pills, a "+" for another emoji and the "You, Haley
 * and 2 others" summary) beside the view count, the Like / React / Reply bar
 * (hovering Like or a pill lists who did it) and an inline rich text
 * reply composer (`@mentions`, emoji, and a "schedule for later" option). Backed by real `App\Models\BoardItemComment` /
 * `App\Models\BoardComment` rows via `useFeedUpdates` — mention highlighting
 * reuses `renderMentionText`, the same helper board comment threads use.
 */
const UpdateFeedCard: React.FC<UpdateFeedCardProps> = ({
  update,
  current_user,
  onLike,
  onReact,
  onBookmark,
  onPin,
  onReply,
  onSchedule,
  onMarkSeen,
  onMarkUnread,
  onFollow,
}) => {
  const {
    id,
    actor,
    date_label,
    breadcrumb,
    body,
    mentions,
    board_id,
    view_count,
    is_unread,
    is_bookmarked,
    pinned,
    item_id,
    is_following_item,
    is_following_board,
    activity,
    activity_total,
    link,
    show_actions,
    show_composer,
    replies,
  } = update;

  // The card reads as unread while the update or any reply in it is.
  const is_thread_unread = isThreadUnread(update);
  const unread_reply_count = countThreadUnread(update) - Number(is_unread);

  const [link_copied, setLinkCopied] = useState(false);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  // Whether the card arrived unread, kept so its accent bar survives being marked read while the viewer reads it.
  const [was_unread] = useState(is_thread_unread);
  const article_ref = useRef<HTMLElement>(null);
  const menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const reply_composer_ref = useRef<HTMLDivElement>(null);
  const reply_box_ref = useRef<FeedReplyComposerRef>(null);
  // The React button, or the "+" once the card has reactions, whichever opened the emoji palette.
  const [palette_anchor, setPaletteAnchor] = useState<HTMLElement | null>(null);
  // Read through a ref so a parent re-render never restarts the dwell timer below.
  const mark_seen_ref = useRef(onMarkSeen);
  const is_own = actor.id !== undefined && actor.id === current_user.id;

  useEffect(() => {
    mark_seen_ref.current = onMarkSeen;
  });

  const focusReplyComposer = () =>
    (reply_composer_ref.current?.querySelector(".ProseMirror") as HTMLElement | null)?.focus();

  // Reply under a reply answers this same thread and `@mentions` the reply's author, as in monday.
  const replyTo = (person: FeedActor) => {
    if (person.id && person.id !== current_user.id) {
      reply_box_ref.current?.mentionPerson({ id: person.id, name: person.name });
    } else {
      focusReplyComposer();
    }
    requestAnimationFrame(() => reply_composer_ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };

  // A long thread keeps its newest replies in view, an unread one is never folded away.
  const folded_replies = useFoldedReplies(
    replies,
    new Set(replies.filter((reply) => reply.is_unread).map((reply) => reply.id))
  );

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(`${window.location.origin}${link}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  };

  // An unread card is marked seen once it has stayed mostly on screen for a moment.
  useEffect(() => {
    const node = article_ref.current;
    if (!is_thread_unread || !node || typeof IntersectionObserver === "undefined") return;

    let timeout_id: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const is_visible =
          entry.isIntersecting &&
          (entry.intersectionRatio >= SEEN_VISIBLE_RATIO || entry.intersectionRect.height >= SEEN_VISIBLE_MIN_HEIGHT_PX);
        if (is_visible && timeout_id === null) {
          timeout_id = setTimeout(() => mark_seen_ref.current?.(id), SEEN_DWELL_MS);
        } else if (!is_visible && timeout_id !== null) {
          clearTimeout(timeout_id);
          timeout_id = null;
        }
      },
      { threshold: [0, 0.25, SEEN_VISIBLE_RATIO, 1] }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timeout_id !== null) clearTimeout(timeout_id);
    };
  }, [id, is_thread_unread]);

  const markUnread = () => {
    setIsMenuOpen(false);
    onMarkUnread?.(id);
  };

  const toggleFollow = (type: "board" | "item") => {
    setIsMenuOpen(false);
    if (type === "item" && item_id) onFollow?.("item", Number(item_id), !is_following_item);
    if (type === "board") onFollow?.("board", Number(board_id), !is_following_board);
  };
  const is_following = is_following_item || is_following_board;

  const has_reactions = update.reactions.length > 0;
  const has_reaction_row = has_reactions || update.like_count > 0;
  const has_views = typeof view_count === "number";

  const togglePalette = (event: React.MouseEvent<HTMLElement>) => {
    const trigger = event.currentTarget;
    setPaletteAnchor((current) => (current === trigger ? null : trigger));
  };
  const react = (emoji: string) => {
    setPaletteAnchor(null);
    onReact?.(id, emoji);
  };

  return (
    <article
      ref={article_ref}
      className={`overflow-hidden rounded-[14px] border ${pinned ? "border-[#f5a623]" : "border-shell-border-strong"} ${
        was_unread ? "border-l-[3px] border-l-brand-500" : ""
      }`}
    >
      <div className="p-5">
        {pinned && (
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#f5a623]">
            <PinIcon size={11} />
            Pinned
          </div>
        )}
        {/* Author row */}
        <div className="flex items-center gap-[11px]">
          {actor.id ? (
            <>
              <PersonHoverCard
                person={{ id: actor.id, name: actor.name, avatar_url: actor.avatar_url, is_deactivated: actor.is_deactivated }}
                className="flex-none"
              >
                <PersonAvatar person={{ ...actor, id: actor.id }} size={34} />
              </PersonHoverCard>
              <PersonHoverCard person={{ id: actor.id, name: actor.name, avatar_url: actor.avatar_url, is_deactivated: actor.is_deactivated }}>
                <span className={`text-sm font-bold text-shell-text ${getDeactivatedClass(actor.is_deactivated)}`}>{actor.name}</span>
              </PersonHoverCard>
              <DeactivatedBadge is_deactivated={actor.is_deactivated} />
            </>
          ) : (
            <>
              <PersonAvatar person={{ ...actor, id: "0", is_deactivated: true }} size={34} />
              <span className={`text-sm font-bold text-shell-text ${getDeactivatedClass(true)}`}>{actor.name}</span>
            </>
          )}
          <span className="text-[12.5px] text-shell-text-muted">{date_label}</span>
          {is_thread_unread && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-brand-500">
              <span className="h-[7px] w-[7px] rounded-full bg-brand-500" aria-hidden="true" />
              {is_unread ? "Unread" : `${unread_reply_count} new ${unread_reply_count === 1 ? "reply" : "replies"}`}
            </span>
          )}
          {show_actions && (
            <div className="ml-auto flex items-center gap-1">
              {link && (
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
                  aria-label="Copy link to this update"
                  title={link_copied ? "Link copied!" : "Copy link to this update"}
                >
                  <LinkIcon size={13} />
                </button>
              )}
              {onPin && (
                <button
                  type="button"
                  onClick={() => onPin(id)}
                  className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-shell-hover"
                  style={{ color: pinned ? "#f5a623" : "var(--color-shell-text-muted)" }}
                  aria-label={pinned ? "Unpin update" : "Pin update"}
                  aria-pressed={pinned}
                >
                  <PinIcon size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onBookmark?.(id)}
                className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-shell-hover ${
                  is_bookmarked ? "text-[#7fb2ff]" : "text-shell-text-muted hover:text-shell-text"
                }`}
                aria-label={is_bookmarked ? "Remove bookmark" : "Bookmark this update"}
                aria-pressed={is_bookmarked}
              >
                <BookmarkIcon size={13} filled={is_bookmarked} />
              </button>
              <button
                ref={menu_trigger_ref}
                type="button"
                onClick={() => setIsMenuOpen((previous) => !previous)}
                aria-haspopup="menu"
                aria-expanded={is_menu_open}
                className="flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
                aria-label="Update options"
              >
                <MoreDotsIcon size={15} />
              </button>
              <BoardPopover anchor_el={menu_trigger_ref.current} is_open={is_menu_open} onClose={() => setIsMenuOpen(false)} width={190} align="end">
                <div role="menu" className="p-1.5">
                  {!is_own && !is_thread_unread && onMarkUnread && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={markUnread}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
                    >
                      Mark as unread
                    </button>
                  )}
                  {onFollow && item_id && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => toggleFollow("item")}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
                    >
                      {is_following_item ? "Unfollow this item" : "Follow this item"}
                    </button>
                  )}
                  {onFollow && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => toggleFollow("board")}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
                    >
                      {is_following_board ? "Unfollow this board" : "Follow this board"}
                    </button>
                  )}
                  {link && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        copyLink();
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-shell-text-secondary transition-colors hover:bg-shell-hover"
                    >
                      Copy link
                    </button>
                  )}
                </div>
              </BoardPopover>
            </div>
          )}
        </div>

        {/* Board breadcrumb */}
        <div className="mt-3 flex flex-wrap items-center gap-[7px] text-[12.5px] text-shell-text-muted">
          <span
            className="h-[15px] w-[15px] flex-none rounded"
            style={{ backgroundColor: breadcrumb.board_color }}
            aria-hidden="true"
          />
          {breadcrumb.crumbs.map((crumb, index) => {
            const is_last = index === breadcrumb.crumbs.length - 1;
            return (
              <React.Fragment key={`${crumb}-${index}`}>
                <span className={is_last ? "font-medium text-shell-text-secondary" : ""}>
                  {crumb}
                </span>
                {!is_last && (
                  <ChevronRightIcon size={9} className="text-shell-text-faint" />
                )}
              </React.Fragment>
            );
          })}
          {is_following && (
            <span
              className="ml-1 flex items-center gap-1 rounded-full border border-shell-border-strong px-2 py-px text-[10.5px] font-semibold text-[#7fb2ff]"
              title={is_following_item ? "You follow this item" : "You follow this board"}
            >
              <EyeIcon size={11} />
              Following
            </span>
          )}
        </div>

        {/* Message body */}
        <RichTextContent html={body} people={mentions} className="mt-3.5" />

        {/* Item changes behind this update */}
        <FeedActivityTimeline entries={activity} total={activity_total} />

        {/* Reactions and view count */}
        {((show_actions && has_reaction_row) || has_views) && (
          <div className="feed-card__meta">
            {show_actions && has_reaction_row && (
              <div className="feed-card__reactions">
                {update.reactions.map((reaction) => (
                  <ReactionPill
                    key={reaction.emoji}
                    reaction={reaction}
                    source={update}
                    current_user={current_user}
                    onToggle={() => onReact?.(id, reaction.emoji)}
                  />
                ))}
                {has_reactions && onReact && (
                  <button
                    type="button"
                    onClick={togglePalette}
                    aria-label="Add another reaction"
                    aria-expanded={palette_anchor !== null && palette_anchor.dataset.trigger === "add"}
                    data-trigger="add"
                    title="Add another reaction"
                    className="feed-card__add-reaction"
                  >
                    <ReactSmileyIcon size={13} />
                  </button>
                )}
                <ReactionsSummary source={update} current_user={current_user} />
              </div>
            )}
            {has_views && (
              <span className="feed-card__views" title={`Seen by ${view_count}`}>
                <ViewsIcon size={14} />
                {view_count}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Like / React / Reply actions */}
      {show_actions && (
        <div className="feed-card__actions">
          <LikeButton entry={update} current_user={current_user} onToggle={() => onLike?.(id)} class_name="feed-card__action" />
          {!has_reactions && onReact && (
            <span className="feed-card__action-wrap">
              <button
                type="button"
                onClick={togglePalette}
                aria-expanded={palette_anchor !== null && palette_anchor.dataset.trigger === "react"}
                data-trigger="react"
                className="feed-card__action"
              >
                <ReactSmileyIcon />
                React
              </button>
            </span>
          )}
          <button type="button" onClick={focusReplyComposer} className="feed-card__action">
            <ReplyIcon size={15} />
            Reply
          </button>
        </div>
      )}
      <EmojiPalette anchor_el={palette_anchor} is_open={palette_anchor !== null} onClose={() => setPaletteAnchor(null)} onPick={react} mode="react" />

      {/* Replies, inline under the update like monday's inbox, never as cards of their own */}
      {replies.length > 0 && (
        <section className="feed-card__thread thread-replies" aria-label={`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}>
          {folded_replies.is_folded && (
            <button type="button" onClick={folded_replies.expand} className="thread-replies__toggle">
              View {folded_replies.hidden_count} earlier {folded_replies.hidden_count === 1 ? "reply" : "replies"}
            </button>
          )}
          {folded_replies.can_fold && (
            <button type="button" onClick={folded_replies.collapse} className="thread-replies__toggle">
              Show fewer replies
            </button>
          )}
          {folded_replies.visible.map((reply) => (
            <FeedThreadReply
              key={reply.id}
              reply={reply}
              current_user={current_user}
              onLike={onLike}
              onReact={onReact}
              onReplyTo={() => replyTo(reply.actor)}
            />
          ))}
        </section>
      )}

      {/* Inline reply composer */}
      {show_composer && (
        <div ref={reply_composer_ref} className={`feed-card__composer ${replies.length > 0 ? "feed-card__composer--after-replies" : ""}`}>
          <FeedReplyComposer
            ref={reply_box_ref}
            current_user={current_user}
            loadPeople={() => loadFeedBoardPeople(board_id)}
            loadTeams={() => loadFeedBoardTeams(board_id)}
            onSubmit={(reply_body, mentioned_user_ids) => onReply?.(id, reply_body, mentioned_user_ids)}
            onSchedule={(reply_body, mentioned_user_ids, scheduled_at) =>
              onSchedule?.(id, reply_body, scheduled_at, mentioned_user_ids)
            }
            placeholder={feed_reply_placeholder}
          />
        </div>
      )}
    </article>
  );
};

export default UpdateFeedCard;
