import { apiClient } from "@/lib/api-client";

/** One unsent draft, as returned by `App\Http\Controllers\Comment\CommentDraftController`. */
export type CommentDraftDto = {
  id: number;
  board_id: number;
  /** Null for the board discussion ("Board updates"). */
  item_id: number | null;
  /** The update a reply draft answers, null for the main "Write an update" box. */
  parent_id: number | null;
  /** Markdown, the same format the comment composer produces. */
  body: string;
  mentioned_user_ids: number[];
  notified_user_ids: number[];
  updated_at: string | null;
};

/** A draft of the "Drafts" list, with the names it shows. */
export type CommentDraftListDto = CommentDraftDto & {
  board_name: string | null;
  workspace_name: string | null;
  item_name: string | null;
  is_subitem: boolean;
};

export type CommentDraftPayload = {
  item_id: number | null;
  parent_id: number | null;
  body: string;
  mentioned_user_ids?: number[];
  notified_user_ids?: number[];
};

const buildQuery = (item_id: number | null, parent_id: number | null): string => {
  const params = new URLSearchParams();
  if (item_id !== null) params.set("item_id", String(item_id));
  if (parent_id !== null) params.set("parent_id", String(parent_id));
  const query = params.toString();
  return query ? `?${query}` : "";
};

/**
 * Talks to `App\Http\Controllers\Comment\CommentDraftController`
 * (workspace_97th_api): the signed in user's unsent update and reply drafts.
 */
export const commentDraftsService = {
  /** GET /api/comment-drafts */
  async listAllDrafts(): Promise<CommentDraftListDto[]> {
    const response = await apiClient.get<{ data: CommentDraftListDto[] }>("/api/comment-drafts");
    return response.data;
  },

  /** GET /api/boards/{board_id}/comment-drafts */
  async listBoardDrafts(board_id: number): Promise<CommentDraftDto[]> {
    const response = await apiClient.get<{ data: CommentDraftDto[] }>(`/api/boards/${board_id}/comment-drafts`);
    return response.data;
  },

  /**
   * PUT /api/boards/{board_id}/comment-drafts. An empty body removes the draft.
   * `keepalive` lets a save started while the tab closes still reach the server.
   */
  async saveDraft(board_id: number, payload: CommentDraftPayload, keepalive = false): Promise<CommentDraftDto | null> {
    const response = await apiClient.put<{ data: CommentDraftDto | null }>(`/api/boards/${board_id}/comment-drafts`, payload, { keepalive });
    return response.data;
  },

  /** DELETE /api/boards/{board_id}/comment-drafts?item_id=&parent_id= */
  async discardDraft(board_id: number, item_id: number | null, parent_id: number | null): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/comment-drafts${buildQuery(item_id, parent_id)}`);
  },

  /** DELETE /api/comment-drafts/{id} */
  async discardDraftById(id: number): Promise<void> {
    await apiClient.delete(`/api/comment-drafts/${id}`);
  },
};
