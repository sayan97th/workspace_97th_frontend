"use client";
import React, { useEffect, useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import RichTextContent from "@/components/board/drawer/RichTextContent";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import FeedActivityTimeline from "@/components/feed/FeedActivityTimeline";
import FeedReplyComposer from "@/components/feed/FeedReplyComposer";
import PersonHoverCard from "@/components/people/PersonHoverCard";
import { loadFeedBoardPeople, loadFeedBoardTeams } from "@/lib/feed-people";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import DeactivatedBadge from "@/components/board/DeactivatedBadge";
import { PinIcon } from "@/icons/board-icons";
import {
  BookmarkIcon,
  ChevronRightIcon,
  EyeIcon,
  LinkIcon,
  MoreDotsIcon,
  ReplyIcon,
  ThumbsUpIcon,
  ViewsIcon,
} from "@/icons/workspace-icons";
import { feed_reply_placeholder, type FeedUpdate } from "@/data/update-feed-data";

type UpdateFeedCardProps = {
  update: FeedUpdate;
  /** The signed-in user, shown beside the reply box. */
  current_user: BoardPersonOption;
  /** Fired when the Like action is pressed. */
  onLike?: (id: string) => void;
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
 * A single update card in the feed: the author's avatar (with a profile hover
 * card), date, an "Unread" marker until it has been on screen for a moment
 * (the accent bar stays for the rest of the session), the board breadcrumb it is scoped to, the message body, an
 * optional view count and the Like / Reply footer with an inline rich text
 * reply composer (`@mentions`, emoji, and a "schedule for later" option). Backed by real `App\Models\BoardItemComment` /
 * `App\Models\BoardComment` rows via `useFeedUpdates` — mention highlighting
 * reuses `renderMentionText`, the same helper board comment threads use.
 */
const UpdateFeedCard: React.FC<UpdateFeedCardProps> = ({
  update,
  current_user,
  onLike,
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
  } = update;

  const [link_copied, setLinkCopied] = useState(false);
  const [is_menu_open, setIsMenuOpen] = useState(false);
  // Whether the card arrived unread, kept so its accent bar survives being marked read while the viewer reads it.
  const [was_unread] = useState(is_unread);
  const article_ref = useRef<HTMLElement>(null);
  const menu_trigger_ref = useRef<HTMLButtonElement>(null);
  const reply_composer_ref = useRef<HTMLDivElement>(null);
  // Read through a ref so a parent re-render never restarts the dwell timer below.
  const mark_seen_ref = useRef(onMarkSeen);
  const is_own = actor.id !== undefined && actor.id === current_user.id;

  useEffect(() => {
    mark_seen_ref.current = onMarkSeen;
  });

  const focusReplyComposer = () =>
    (reply_composer_ref.current?.querySelector(".ProseMirror") as HTMLElement | null)?.focus();

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
    if (!is_unread || !node || typeof IntersectionObserver === "undefined") return;

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
  }, [id, is_unread]);

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
          {is_unread && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-brand-500">
              <span className="h-[7px] w-[7px] rounded-full bg-brand-500" aria-hidden="true" />
              Unread
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
                  {!is_own && !is_unread && onMarkUnread && (
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
        <RichTextContent html={body} people={mentions} className="mt-3.5 text-[13.5px] leading-[1.6] text-shell-text-secondary" />

        {/* Item changes behind this update */}
        <FeedActivityTimeline entries={activity} total={activity_total} />

        {/* View count */}
        {typeof view_count === "number" && (
          <div className="mt-3.5 flex items-center justify-end gap-[5px] text-xs text-shell-text-muted">
            <ViewsIcon size={14} />
            {view_count}
          </div>
        )}
      </div>

      {/* Like / Reply actions */}
      {show_actions && (
        <div className="flex gap-[22px] border-t border-shell-border px-5 py-3">
          <button
            type="button"
            onClick={() => onLike?.(id)}
            className="flex items-center gap-[7px] text-[13px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
          >
            <ThumbsUpIcon size={15} />
            Like
          </button>
          <button
            type="button"
            onClick={focusReplyComposer}
            className="flex items-center gap-[7px] text-[13px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
          >
            <ReplyIcon size={15} />
            Reply
          </button>
        </div>
      )}

      {/* Inline reply composer */}
      {show_composer && (
        <div ref={reply_composer_ref} className="border-t border-shell-border px-5 py-3.5">
          <FeedReplyComposer
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
