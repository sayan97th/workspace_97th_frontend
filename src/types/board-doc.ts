/** Minimal profile of whoever last saved a doc. */
export type BoardDocAuthor = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
};

/** `GET /api/boards/{id}/doc`, the body of a Doc (a navigation leaf with `view_key = doc`). */
export type BoardDocDto = {
  board_id: number;
  /** The editor's JSON document as a string, null when nothing was saved yet. */
  content: string | null;
  updated_at: string | null;
  updated_by: BoardDocAuthor | null;
};

/** `POST /api/boards/{id}/doc/files`, a file embedded in a doc. */
export type DocUploadedFile = {
  url: string;
  name: string;
  size: number;
  mime_type: string;
};
