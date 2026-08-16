/**
 * API types for the board item drawer's real, backend-persisted comment
 * threads. Mirrors `App\Http\Resources\BoardItemCommentResource` under
 * `App\Http\Controllers\Board\BoardItemCommentController` — see
 * `@/types/board-content.ts` for the sibling "table board" engine types this
 * complements.
 */

export type BoardItemCommentAuthorDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
} | null;

export type BoardItemCommentReactionDto = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
  reactor_names: string[];
};

export type BoardItemCommentAttachmentDto = {
  id: number;
  file_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
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
  like_count: number;
  liked_by_me: boolean;
  view_count: number;
  seen_by_me: boolean;
  reactions: BoardItemCommentReactionDto[];
  mentioned_user_ids: number[];
  attachments: BoardItemCommentAttachmentDto[];
  replies: BoardItemCommentDto[];
};

export type CreateBoardItemCommentPayload = {
  body: string;
  /** Set to reply under an existing top-level comment. */
  parent_id?: number;
  mentioned_user_ids?: number[];
  attachments?: File[];
};
