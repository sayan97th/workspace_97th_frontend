/**
 * API types for files attached directly to a board item (the Kanban
 * drawer's "Attachments" affordance), independent of comments. Mirrors
 * `App\Http\Resources\BoardItemAttachmentResource` under
 * `App\Http\Controllers\Board\BoardItemAttachmentController` — sibling of
 * `BoardItemCommentAttachmentDto` in `@/types/board-comments.ts`, which
 * covers files sent along with a comment instead.
 */

export type BoardItemAttachmentDto = {
  id: number;
  file_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  download_url: string;
  created_at: string;
};
