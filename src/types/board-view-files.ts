/**
 * API types for a `file_gallery`-type board view's uploaded files. Mirrors
 * `App\Http\Resources\BoardViewFileResource` under
 * `App\Http\Controllers\Board\BoardViewFileController` — see
 * `@/types/board-comments.ts` for the sibling comment-attachment shape this
 * is modeled on.
 */

export type BoardViewFileUploaderDto = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
} | null;

export type BoardViewFileDto = {
  id: number;
  board_view_id: number;
  file_name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  is_image: boolean;
  download_url: string;
  created_at: string;
  uploader: BoardViewFileUploaderDto;
};
