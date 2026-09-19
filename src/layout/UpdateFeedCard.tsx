"use client";
import React, { useEffect, useRef, useState } from "react";
import PersonAvatar from "@/components/board/PersonAvatar";
import RichTextContent from "@/components/board/drawer/RichTextContent";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import FeedReplyComposer from "@/components/feed/FeedReplyComposer";
import PersonHoverCard from "@/components/people/PersonHoverCard";
import { loadFeedBoardPeople } from "@/lib/feed-people";
import { PinIcon } from "@/icons/board-icons";
import {
  BookmarkIcon,
  ChevronRightIcon,
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
  /** Fired once, when an unread card mounts — opening the drawer marks it seen, matching Monday's Updates feed. */
  onMarkSeen?: (id: string) => void;
};

/**
 * A single update card in the feed: the author's avatar (with a profile hover
 * card), date, the board breadcrumb it is scoped to, the message body, an
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
    link,
    show_actions,
    show_composer,
  } = update;

  const [link_copied, setLinkCopied] = useState(false);
  const reply_composer_ref = useRef<HTMLDivElement>(null);

  const focusReplyComposer = () =>
    (reply_composer_ref.current?.querySelector(".ProseMirror") as HTMLElement | null)?.focus();

  const copyLink = () => {
    if (!link) return;
    navigator.clipboard.writeText(`${window.location.origin}${link}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  };

  useEffect(() => {
    if (is_unread) onMarkSeen?.(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <article
      className={`overflow-hidden rounded-[14px] border ${pinned ? "border-[#f5a623]" : "border-shell-border-strong"}`}
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
              <PersonHoverCard person={{ id: actor.id, name: actor.name, avatar_url: actor.avatar_url }} className="flex-none">
                <PersonAvatar person={{ ...actor, id: actor.id }} size={34} />
              </PersonHoverCard>
              <PersonHoverCard person={{ id: actor.id, name: actor.name, avatar_url: actor.avatar_url }}>
                <span className="text-sm font-bold text-shell-text">{actor.name}</span>
              </PersonHoverCard>
            </>
          ) : (
            <>
              <PersonAvatar person={{ ...actor, id: "0" }} size={34} />
              <span className="text-sm font-bold text-shell-text">{actor.name}</span>
            </>
          )}
          <span className="text-[12.5px] text-shell-text-muted">{date_label}</span>
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
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
                aria-label="Update options"
              >
                <MoreDotsIcon size={15} />
              </button>
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
        </div>

        {/* Message body */}
        <RichTextContent html={body} people={mentions} className="mt-3.5 text-[13.5px] leading-[1.6] text-shell-text-secondary" />

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
