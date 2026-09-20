/**
 * API types for the board item drawer's real, backend-persisted comment
 * threads. Mirrors `App\Http\Resources\BoardItemCommentResource` under
 * `App\Http\Controllers\Board\BoardItemCommentController` — see
 * `@/types/board-content.ts` for the sibling "table board" engine types this
 * complements.
 */

/** `null` only for a comment whose author was hard deleted before accounts were soft deleted. */
export type BoardItemCommentAuthorDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  /** The account was disabled or deleted, so the author is shown faded. */
  is_deactivated?: boolean;
} | null;

/** One person who reacted with an emoji, with when they did. */
export type CommentReactorDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  is_deactivated?: boolean;
  reacted_at: string | null;
};

export type BoardItemCommentReactionDto = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
  reactor_names: string[];
  /** Who reacted and when, oldest first. */
  reactors: CommentReactorDto[];
};

export type BoardItemCommentAttachmentDto = {
  id: number;
  file_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
};

export type BoardItemCommentSeenByDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  is_deactivated?: boolean;
  /** When this person saw the comment. */
  seen_at?: string | null;
};

/** A top-level comment ("update"), or a reply when `parent_id` is set. Replies never nest further. */
export type BoardItemCommentDto = {
  id: number;
  item_id: number;
  parent_id: number | null;
  author: BoardItemCommentAuthorDto;
  body: string;
  created_at: string;
  is_edited: boolean;
  /** When the body was last edited, null for a comment that never was. */
  edited_at: string | null;
  like_count: number;
  liked_by_me: boolean;
  view_count: number;
  seen_by_me: boolean;
  seen_by: BoardItemCommentSeenByDto[];
  bookmarked_by_me: boolean;
  /** Set while the comment is scheduled and not visible to anyone else yet, null once it is live. */
  scheduled_at: string | null;
  pinned: boolean;
  /** True once someone marked this update as done. Only top-level updates can be resolved. */
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: { id: number; full_name: string } | null;
  notified_user_ids: number[];
  reactions: BoardItemCommentReactionDto[];
  mentioned_user_ids: number[];
  attachments: BoardItemCommentAttachmentDto[];
  replies: BoardItemCommentDto[];
};

/** One earlier version of an edited comment or reply, from `GET .../comments/{id}/revisions`. Mirrors `App\Http\Resources\CommentRevisionResource`. */
export type CommentRevisionDto = {
  id: number;
  body: string;
  /** When this version was written. */
  written_at: string | null;
  /** When an edit replaced it. */
  replaced_at: string;
  edited_by: { id: number; full_name: string; profile_photo_url: string | null; is_deactivated?: boolean } | null;
};

export type CreateBoardItemCommentPayload = {
  body: string;
  /** Set to reply under an existing top-level comment. */
  parent_id?: number;
  mentioned_user_ids?: number[];
  /** Explicitly flagged via the composer's "Notify" action — distinct from `mentioned_user_ids`, never shown inline in the body. */
  notified_user_ids?: number[];
  attachments?: File[];
  /** ISO time to publish the comment at instead of posting it now. */
  scheduled_at?: string;
  /** The composer's "Assign" action: people to add to the item's People column. Cannot be combined with `scheduled_at`. */
  assign_user_ids?: number[];
  /** Due date (`YYYY-MM-DD`) to set on the item's Date column. */
  assign_due_date?: string;
};
