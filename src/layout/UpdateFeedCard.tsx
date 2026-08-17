"use client";
import React, { useEffect, useRef, useState } from "react";
import { renderMentionText } from "@/components/board/drawer/renderMentionText";
import {
  BookmarkIcon,
  ChevronRightIcon,
  ClockIcon,
  MoreDotsIcon,
  ReplyIcon,
  ThumbsUpIcon,
  ViewsIcon,
} from "@/icons/workspace-icons";
import {
  feed_reply_avatar_gradient,
  feed_reply_placeholder,
  type FeedUpdate,
} from "@/data/update-feed-data";

type UpdateFeedCardProps = {
  update: FeedUpdate;
  /** Fired when the Like action is pressed. */
  onLike?: (id: string) => void;
  /** Fired when the Bookmark action is pressed. */
  onBookmark?: (id: string) => void;
  /** Fired when a reply is submitted from the inline composer. */
  onReply?: (id: string, body: string) => void;
  /** Fired when a reply is scheduled for a later time from the inline composer. */
  onSchedule?: (id: string, body: string, scheduled_at: string) => void;
  /** Fired once, when an unread card mounts — opening the drawer marks it seen, matching Monday's Updates feed. */
  onMarkSeen?: (id: string) => void;
};

/**
 * A single update card in the feed: gradient avatar, author + date, the board
 * breadcrumb it is scoped to, the message body, an optional view count and the
 * Like / Reply footer with an inline reply composer (with a "schedule for
 * later" option). Backed by real `App\Models\BoardItemComment` /
 * `App\Models\BoardComment` rows via `useFeedUpdates` — mention highlighting
 * reuses `renderMentionText`, the same helper board comment threads use.
 */
const UpdateFeedCard: React.FC<UpdateFeedCardProps> = ({
  update,
  onLike,
  onBookmark,
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
    view_count,
    is_unread,
    is_bookmarked,
    show_actions,
    show_composer,
  } = update;

  const [reply_text, setReplyText] = useState("");
  const [is_scheduling, setIsScheduling] = useState(false);
  const [scheduled_at, setScheduledAt] = useState("");
  const reply_input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (is_unread) onMarkSeen?.(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitReply = () => {
    const trimmed = reply_text.trim();
    if (!trimmed) return;
    onReply?.(id, trimmed);
    setReplyText("");
  };

  const submitSchedule = () => {
    const trimmed = reply_text.trim();
    if (!trimmed || !scheduled_at) return;
    onSchedule?.(id, trimmed, new Date(scheduled_at).toISOString());
    setReplyText("");
    setScheduledAt("");
    setIsScheduling(false);
  };

  return (
    <article className="overflow-hidden rounded-[14px] border border-shell-border-strong">
      <div className="p-5">
        {/* Author row */}
        <div className="flex items-center gap-[11px]">
          <span
            className={`h-[34px] w-[34px] flex-none rounded-full bg-gradient-to-br ${actor.avatar_gradient}`}
            aria-hidden="true"
          />
          <span className="text-sm font-bold text-shell-text">{actor.name}</span>
          <span className="text-[12.5px] text-shell-text-muted">{date_label}</span>
          {show_actions && (
            <div className="ml-auto flex items-center gap-1">
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
              <React.Fragment key={crumb}>
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
        <p className="mt-3.5 text-[13.5px] leading-[1.6] text-shell-text-secondary">
          {renderMentionText(body)}
        </p>

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
            onClick={() => reply_input_ref.current?.focus()}
            className="flex items-center gap-[7px] text-[13px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
          >
            <ReplyIcon size={15} />
            Reply
          </button>
        </div>
      )}

      {/* Inline reply composer */}
      {show_composer && (
        <div className="border-t border-shell-border px-5 py-3.5">
          <div className="flex items-center gap-[11px]">
            <span
              className={`h-[30px] w-[30px] flex-none rounded-full bg-gradient-to-br ${feed_reply_avatar_gradient}`}
              aria-hidden="true"
            />
            <input
              ref={reply_input_ref}
              type="text"
              value={reply_text}
              onChange={(event) => setReplyText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !is_scheduling) submitReply();
              }}
              placeholder={feed_reply_placeholder}
              className="flex-1 rounded-[9px] border border-shell-border bg-shell-panel-alt px-[13px] py-2.5 text-[13px] text-shell-text placeholder:text-shell-text-muted focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setIsScheduling((previous) => !previous)}
              className={`flex h-8 w-8 flex-none items-center justify-center rounded-[9px] transition-colors hover:bg-shell-hover ${
                is_scheduling ? "text-[#7fb2ff]" : "text-shell-text-muted hover:text-shell-text"
              }`}
              aria-label="Schedule this update for later"
              aria-pressed={is_scheduling}
            >
              <ClockIcon size={15} />
            </button>
          </div>

          {is_scheduling && (
            <div className="mt-2.5 flex items-center gap-2 pl-[41px]">
              <input
                type="datetime-local"
                value={scheduled_at}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="rounded-[8px] border border-shell-border bg-shell-panel-alt px-2.5 py-1.5 text-[12.5px] text-shell-text focus:border-brand-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={submitSchedule}
                disabled={!reply_text.trim() || !scheduled_at}
                className="rounded-[8px] bg-brand-500 px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Schedule
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default UpdateFeedCard;
