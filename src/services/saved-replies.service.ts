import { apiClient } from "@/lib/api-client";

/** Shape returned by `App\Http\Controllers\Comment\SavedReplyController`. */
export type SavedReplyDto = {
  id: number;
  title: string;
  /** Markdown, the same format the comment composer produces. */
  body: string;
};

export type SavedReplyPayload = {
  title: string;
  body: string;
};

/**
 * Talks to `App\Http\Controllers\Comment\SavedReplyController`
 * (workspace_97th_api): the current user's reusable update and reply templates.
 */
export const savedRepliesService = {
  /** GET /api/saved-replies */
  async listSavedReplies(): Promise<SavedReplyDto[]> {
    const response = await apiClient.get<{ data: SavedReplyDto[] }>("/api/saved-replies");
    return response.data;
  },

  /** POST /api/saved-replies */
  async createSavedReply(payload: SavedReplyPayload): Promise<SavedReplyDto> {
    const response = await apiClient.post<{ data: SavedReplyDto }>("/api/saved-replies", payload);
    return response.data;
  },

  /** DELETE /api/saved-replies/{id} */
  async deleteSavedReply(id: number): Promise<void> {
    await apiClient.delete(`/api/saved-replies/${id}`);
  },
};
