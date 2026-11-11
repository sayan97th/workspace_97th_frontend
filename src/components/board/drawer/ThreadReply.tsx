"use client";
import React, { useId, useLayoutEffect, useRef, useState } from "react";
import PersonAvatar from "../PersonAvatar";
import DeactivatedBadge from "../DeactivatedBadge";
import type { BoardPersonOption } from "../toolbar/types";
import PersonHoverCard from "@/components/people/PersonHoverCard";
import { getDeactivatedClass } from "@/lib/deactivated-user";
import { ReplyIcon, ViewsIcon } from "@/icons/drawer-icons";
import "./thread-reply.scss";

/**
 * One reply inside an update thread, in monday.com's look: the author's avatar
 * beside a soft rounded bubble holding the name, time and message, and a quiet
 * footer under the bubble (views, like, react, "Edited", Reply). Shared by the
 * item drawer, the board discussion drawer and the Update Feed (Inbox), so a
 * reply reads the same everywhere. Purely presentational: the caller passes
 * the body, reactions, menu and footer actions it supports.
 */

export type ThreadReplyProps = {
  author: BoardPersonOption;
  /** False for a deleted author, whose name gets no profile card. */
  has_profile?: boolean;
  /** Relative time, e.g. "7d" or "3 minutes ago". */
  time_label: string;
  /** Full date shown on hover over the time. */
  time_title?: string;
  /** Small markers after the time, such as the "New" badge. */
  header_extra?: React.ReactNode;
  /** The "..." options menu, top right of the bubble. */
  menu?: React.ReactNode;
  /** Not read by the viewer yet: a blue dot by the time and a soft accent on the bubble. */
  is_unread?: boolean;
  /** A deep link points at this reply, so it is outlined. */
  is_highlighted?: boolean;
  /** The edit form is open, so the bubble spans the whole width instead of hugging the text. */
  is_editing?: boolean;
  /** Element id, so a deep link can scroll to the reply. */
  dom_id?: string;
  /** Emoji pills and the "who reacted" summary, shown inside the bubble under the text. */
  reactions?: React.ReactNode;
  /** The actions row under the bubble, built from {@link ThreadReplyViews}, {@link ThreadReplyAction} and friends. */
  footer?: React.ReactNode;
  /** The message, usually a {@link ThreadReplyBody}, or the edit form while editing. */
  children: React.ReactNode;
};

const ThreadReply: React.FC<ThreadReplyProps> = ({
  author,
  has_profile = true,
  time_label,
  time_title,
  header_extra,
  menu,
  is_unread = false,
  is_highlighted = false,
  is_editing = false,
  dom_id,
  reactions,
  footer,
  children,
}) => {
  const avatar = <PersonAvatar person={author} size={32} />;
  const name = <span className={`thread-reply__author ${getDeactivatedClass(author.is_deactivated)}`}>{author.name}</span>;

  return (
    <div
      id={dom_id}
      className="thread-reply"
      data-unread={is_unread || undefined}
      data-highlighted={is_highlighted || undefined}
      data-editing={is_editing || undefined}
    >
      {has_profile ? (
        <PersonHoverCard person={author} className="thread-reply__avatar">
          {avatar}
        </PersonHoverCard>
      ) : (
        <span className="thread-reply__avatar">{avatar}</span>
      )}

      <div className="thread-reply__column">
        <div className="thread-reply__bubble">
          <div className="thread-reply__header">
            <div className="thread-reply__byline">
              {has_profile ? <PersonHoverCard person={author}>{name}</PersonHoverCard> : name}
              <DeactivatedBadge is_deactivated={author.is_deactivated} />
              <span className="thread-reply__time" title={time_title}>
                {time_label}
              </span>
              {is_unread && <span className="thread-reply__unread-dot" role="img" aria-label="Unread" title="Unread" />}
              {header_extra}
            </div>
            {menu && <div className="thread-reply__menu">{menu}</div>}
          </div>
          <div className="thread-reply__content">{children}</div>
          {reactions && <div className="thread-reply__reactions">{reactions}</div>}
        </div>
        {footer && <div className="thread-reply__footer">{footer}</div>}
      </div>
    </div>
  );
};

/** How tall a reply's text may grow before it folds behind "See more". */
const COLLAPSED_BODY_MAX_PX = 168;

/**
 * A reply's text, folded to a few lines with a soft fade and "... See more"
 * when it is long (monday's long reply treatment). "See less" folds it back.
 */
export const ThreadReplyBody: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const content_ref = useRef<HTMLDivElement>(null);
  const content_id = useId();
  const [is_overflowing, setIsOverflowing] = useState(false);
  const [is_expanded, setIsExpanded] = useState(false);

  // Measured again whenever the text reflows (a wider drawer, images loading).
  useLayoutEffect(() => {
    const node = content_ref.current;
    if (!node) return;
    const measure = () => setIsOverflowing(node.scrollHeight > COLLAPSED_BODY_MAX_PX + 8);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const is_folded = is_overflowing && !is_expanded;

  return (
    <>
      <div
        ref={content_ref}
        id={content_id}
        className="thread-reply__body"
        data-folded={is_folded || undefined}
        style={is_folded ? { maxHeight: COLLAPSED_BODY_MAX_PX } : undefined}
      >
        {children}
      </div>
      {is_overflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={is_expanded}
          aria-controls={content_id}
          className="thread-reply__see-more"
        >
          {is_expanded ? "See less" : "... See more"}
        </button>
      )}
    </>
  );
};

/** The "seen by" count at the start of a reply's footer. */
export const ThreadReplyViews: React.FC<{ count: number }> = ({ count }) => (
  <span className="thread-reply__views" title={`Seen by ${count}`} aria-label={`Seen by ${count}`}>
    <ViewsIcon size={15} />
    {count}
  </span>
);

type ThreadReplyActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Shows the action in its "on" color, e.g. a bookmarked reply. */
  is_active?: boolean;
};

/** A quiet text button in a reply's footer. */
export const ThreadReplyAction = React.forwardRef<HTMLButtonElement, ThreadReplyActionProps>(
  ({ is_active = false, className, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      data-active={is_active || undefined}
      className={`thread-reply__action${className ? ` ${className}` : ""}`}
      {...rest}
    />
  )
);
ThreadReplyAction.displayName = "ThreadReplyAction";

/** "Reply" under a reply: answers the thread and `@mentions` the reply's author. */
export const ThreadReplyButton: React.FC<{ author_name: string; onClick: () => void }> = ({ author_name, onClick }) => (
  <ThreadReplyAction onClick={onClick} aria-label={`Reply to ${author_name}`}>
    <ReplyIcon size={14} />
    Reply
  </ThreadReplyAction>
);

/** Class for a {@link LikeButton} placed in a reply's footer. */
export const thread_reply_action_class = "thread-reply__action";

export default ThreadReply;
