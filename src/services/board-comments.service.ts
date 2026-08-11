import { apiClient } from "@/lib/api-client";
import type { BoardItemCommentDto, CreateBoardItemCommentPayload } from "@/types/board-comments";

/**
 * Talks to the board item drawer's comment endpoints
 * (`App\Http\Controllers\Board\BoardItemCommentController`), nested under
 * the same `boards/{board_id}/items/{item_id}` prefix as
 * {@link import("./board-content.service").boardContentService}.
 */
export const boardCommentsService = {
  /** GET /api/boards/{board_id}/items/{item_id}/comments */
  async listComments(board_id: number, item_id: number): Promise<BoardItemCommentDto[]> {
    const response = await apiClient.get<{ data: BoardItemCommentDto[] }>(
      `/api/boards/${board_id}/items/${item_id}/comments`
    );
    return response.data;
  },

  /** POST /api/boards/{board_id}/items/{item_id}/comments — multipart, body + mentions + files in one request. */
  async postComment(
    board_id: number,
    item_id: number,
    payload: CreateBoardItemCommentPayload
  ): Promise<BoardItemCommentDto> {
    const form_data = new FormData();
    form_data.append("body", payload.body);
    if (payload.parent_id !== undefined) form_data.append("parent_id", String(payload.parent_id));
    (payload.mentioned_user_ids ?? []).forEach((user_id) => form_data.append("mentioned_user_ids[]", String(user_id)));
    (payload.attachments ?? []).forEach((file) => form_data.append("attachments[]", file));

    const response = await apiClient.postFormData<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments`,
      form_data
    );
    return response.comment;
  },

  /** PATCH /api/boards/{board_id}/items/{item_id}/comments/{comment_id} */
  async updateComment(board_id: number, item_id: number, comment_id: number, body: string): Promise<BoardItemCommentDto> {
    const response = await apiClient.patch<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}`,
      { body }
    );
    return response.comment;
  },

  /** DELETE /api/boards/{board_id}/items/{item_id}/comments/{comment_id} */
  async deleteComment(board_id: number, item_id: number, comment_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/items/${item_id}/comments/${comment_id}`);
  },

  /** POST /api/boards/{board_id}/items/{item_id}/comments/{comment_id}/like */
  async toggleLike(board_id: number, item_id: number, comment_id: number): Promise<BoardItemCommentDto> {
    const response = await apiClient.post<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}/like`
    );
    return response.comment;
  },

  /** POST /api/boards/{board_id}/items/{item_id}/comments/{comment_id}/reactions */
  async toggleReaction(
    board_id: number,
    item_id: number,
    comment_id: number,
    emoji: string
  ): Promise<BoardItemCommentDto> {
    const response = await apiClient.post<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}/reactions`,
      { emoji }
    );
    return response.comment;
  },

  /** POST /api/boards/{board_id}/items/{item_id}/comments/{comment_id}/seen */
  async toggleSeen(board_id: number, item_id: number, comment_id: number): Promise<BoardItemCommentDto> {
    const response = await apiClient.post<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}/seen`
    );
    return response.comment;
  },
};
