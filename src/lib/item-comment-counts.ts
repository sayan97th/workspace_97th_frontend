import type { ItemCommentSummary } from "@/types/board-comment-counts";

/**
 * In memory hub for the `item_comments` summary the comment endpoints return (post, delete,
 * restore). `board-comments.service` publishes every one it receives, so the board the viewer is
 * looking at updates the row's counter the moment their own request finishes, even when the
 * websocket is blocked. Changes made by other people arrive over the socket instead, see
 * `useBoardCommentCounts`.
 */

type ItemCommentSummaryHandler = (board_id: number, summary: ItemCommentSummary) => void;

const handlers = new Set<ItemCommentSummaryHandler>();

function isItemCommentSummary(value: unknown): value is ItemCommentSummary {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ItemCommentSummary>;
  return (
    typeof candidate.item_id === "number" &&
    typeof candidate.comment_count === "number" &&
    typeof candidate.changed_at === "number" &&
    Array.isArray(candidate.mentioned_user_ids)
  );
}

/** Publishes the `item_comments` of a comment endpoint's response, ignoring responses without one. */
export function publishItemCommentSummary(board_id: number, summary: unknown): void {
  if (!isItemCommentSummary(summary)) return;
  handlers.forEach((handler) => {
    try {
      handler(board_id, summary);
    } catch (error) {
      console.error("An item comment count handler failed", error);
    }
  });
}

/** @returns A function that stops listening. */
export function subscribeToItemCommentSummaries(handler: ItemCommentSummaryHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}
