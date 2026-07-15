"use client";
import React from "react";
import {
  ChevronRightIcon,
  MoreDotsIcon,
  ReplyIcon,
  ThumbsUpIcon,
  ViewsIcon,
} from "@/icons/workspace-icons";
import {
  feed_reply_avatar_gradient,
  feed_reply_placeholder,
  type FeedMessageSegment,
  type FeedUpdate,
} from "@/data/update-feed-data";

type UpdateFeedCardProps = {
  update: FeedUpdate;
  /** Fired when the Like action is pressed. */
  onLike?: (id: string) => void;
  /** Fired when the Reply action is pressed. */
  onReply?: (id: string) => void;
};

/** Paints one inline run of message text (plain, blue link or @mention chip). */
const MessageSegment: React.FC<{ segment: FeedMessageSegment }> = ({
  segment,
}) => {
  if (segment.variant === "mention") {
    return (
      <span className="rounded bg-[#7fb2ff]/[0.18] px-1 py-px font-semibold text-[#9cc4ff]">
        {segment.text}
      </span>
    );
  }
  if (segment.variant === "link") {
    return <span className="cursor-pointer text-[#7fb2ff]">{segment.text}</span>;
  }
  return <>{segment.text}</>;
};

/**
 * A single update card in the feed: gradient avatar, author + date, the board
 * breadcrumb it is scoped to, the message body, an optional view count and the
 * Like / Reply footer with an inline reply composer. Presentation only —
 * interactions are surfaced through callbacks so it can be wired to the API
 * later. Reusable anywhere an activity/update feed is rendered.
 */
const UpdateFeedCard: React.FC<UpdateFeedCardProps> = ({
  update,
  onLike,
  onReply,
}) => {
  const {
    id,
    actor,
    date_label,
    breadcrumb,
    paragraphs,
    view_count,
    show_actions,
    show_composer,
  } = update;

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
            <button
              type="button"
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
              aria-label="Update options"
            >
              <MoreDotsIcon size={15} />
            </button>
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
        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="mt-3.5 text-[13.5px] leading-[1.6] text-shell-text-secondary"
          >
            {paragraph.map((segment, segment_index) => (
              <MessageSegment key={segment_index} segment={segment} />
            ))}
          </p>
        ))}

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
            onClick={() => onReply?.(id)}
            className="flex items-center gap-[7px] text-[13px] font-medium text-shell-text-muted transition-colors hover:text-shell-text"
          >
            <ReplyIcon size={15} />
            Reply
          </button>
        </div>
      )}

      {/* Inline reply composer */}
      {show_composer && (
        <div className="flex items-center gap-[11px] border-t border-shell-border px-5 py-3.5">
          <span
            className={`h-[30px] w-[30px] flex-none rounded-full bg-gradient-to-br ${feed_reply_avatar_gradient}`}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder={feed_reply_placeholder}
            className="flex-1 rounded-[9px] border border-shell-border bg-shell-panel-alt px-[13px] py-2.5 text-[13px] text-shell-text placeholder:text-shell-text-muted focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}
    </article>
  );
};

export default UpdateFeedCard;
