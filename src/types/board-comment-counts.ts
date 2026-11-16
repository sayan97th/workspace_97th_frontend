/**
 * A row's updates counter (the chat bubble next to the item name), see the API's
 * `BoardItemCommentCounter`. Always the absolute state, never a +1, so the same summary can
 * arrive from the poster's HTTP response and from the socket without counting twice.
 */
export interface ItemCommentSummary {
  item_id: number;
  /** Published updates and replies on the item. Scheduled ones only count once they go live. */
  comment_count: number;
  /** Everyone tagged in those updates, the viewer is in it when the bubble should turn blue. */
  mentioned_user_ids: number[];
  /** Server time in milliseconds, an older summary than the one already shown is dropped. */
  changed_at: number;
}

export type ItemCommentsAction = "posted" | "deleted" | "restored";

/** The `board_item_comments_changed` event on the private `board-comments.{board_id}` channel. */
export interface BoardItemCommentsChangedEvent extends ItemCommentSummary {
  board_id: number;
  action: ItemCommentsAction;
  actor_id: number | null;
  comment_id: number | null;
  parent_id: number | null;
}

/** GET /api/boards/{board_id}/items/comment-counts, the catch up read after the socket was down. */
export interface BoardCommentCountsSnapshot {
  /** Item id => published updates. Items with none are left out. */
  counts: Record<string, number>;
  /** Items where the viewer is tagged. */
  mentioned_item_ids: number[];
  changed_at: number;
}

/** What a row should show, or null to leave it as it is. */
export type CommentCountPatch = { comment_count: number; has_viewer_mention: boolean } | null;

/** Answers, per row of the board, how its updates counter changes. */
export type CommentCountResolver = (item_id: number) => CommentCountPatch;
