/**
 * API types for the board discussion drawer's real, backend-persisted
 * comment thread. Mirrors `App\Http\Resources\BoardCommentResource` under
 * `App\Http\Controllers\Board\BoardCommentController` — see
 * `@/types/board-comments.ts` for the sibling per-item comment types this
 * complements (the board discussion is scoped to the whole board, not a
 * single row).
 */

export type BoardDiscussionCommentAuthorDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
} | null;

export type BoardDiscussionCommentReactionDto = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
  reactor_names: string[];
};

export type BoardDiscussionCommentAttachmentDto = {
  id: number;
  file_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
};

/** A top-level comment ("update"), or a reply when `parent_id` is set. Replies never nest further. */
export type BoardDiscussionCommentDto = {
  id: number;
  board_id: number;
  parent_id: number | null;
  author: BoardDiscussionCommentAuthorDto;
  body: string;
  created_at: string;
  is_edited: boolean;
  like_count: number;
  liked_by_me: boolean;
  view_count: number;
  seen_by_me: boolean;
  reactions: BoardDiscussionCommentReactionDto[];
  mentioned_user_ids: number[];
  attachments: BoardDiscussionCommentAttachmentDto[];
  replies: BoardDiscussionCommentDto[];
};

export type CreateBoardDiscussionCommentPayload = {
  body: string;
  /** Set to reply under an existing top-level comment. */
  parent_id?: number;
  mentioned_user_ids?: number[];
  attachments?: File[];
};
