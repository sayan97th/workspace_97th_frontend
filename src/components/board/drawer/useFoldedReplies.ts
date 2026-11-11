"use client";
import { useState } from "react";

/** A thread with more replies than this folds its older ones behind a "View N earlier replies" button. */
export const COLLAPSE_REPLIES_OVER = 3;
/** How many of the newest replies stay visible while the older ones are folded. */
export const VISIBLE_REPLY_TAIL = 2;

type FoldableReply = { id: string };

/**
 * Pure part of {@link useFoldedReplies}: which replies show and how many hide
 * behind "View N earlier replies". Nothing folds while a hidden reply has to
 * be seen (`must_show_ids`: a deep link, one being edited, or an unread one).
 */
export function foldReplies<T extends FoldableReply>(replies: T[], is_expanded: boolean, must_show_ids: ReadonlySet<string> = new Set()) {
  const is_collapsible = replies.length > COLLAPSE_REPLIES_OVER;
  const hidden_count = is_collapsible ? replies.length - VISIBLE_REPLY_TAIL : 0;
  const is_hidden_needed = replies.slice(0, hidden_count).some((reply) => must_show_ids.has(reply.id));
  const is_folded = is_collapsible && !is_expanded && !is_hidden_needed;

  return {
    visible: is_folded ? replies.slice(hidden_count) : replies,
    hidden_count,
    is_folded,
    /** Whether "Show fewer replies" makes sense, the thread is long and the viewer opened it. */
    can_fold: is_collapsible && is_expanded,
  };
}

/** Folds a long thread to its newest replies, with the toggle state kept per thread. */
export function useFoldedReplies<T extends FoldableReply>(replies: T[], must_show_ids?: ReadonlySet<string>) {
  const [is_expanded, setIsExpanded] = useState(false);
  return {
    ...foldReplies(replies, is_expanded, must_show_ids),
    expand: () => setIsExpanded(true),
    collapse: () => setIsExpanded(false),
  };
}
