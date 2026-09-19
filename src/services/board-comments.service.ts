import { apiClient } from "@/lib/api-client";
import type { BoardItemCommentDto, CommentRevisionDto, CreateBoardItemCommentPayload } from "@/types/board-comments";

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
    (payload.notified_user_ids ?? []).forEach((user_id) => form_data.append("notified_user_ids[]", String(user_id)));
    (payload.attachments ?? []).forEach((file) => form_data.append("attachments[]", file));
    if (payload.scheduled_at) form_data.append("scheduled_at", payload.scheduled_at);
    (payload.assign_user_ids ?? []).forEach((user_id) => form_data.append("assign_user_ids[]", String(user_id)));
    if (payload.assign_due_date) form_data.append("assign_due_date", payload.assign_due_date);

    const response = await apiClient.postFormData<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments`,
      form_data
    );
    return response.comment;
  },

  /** GET /api/boards/{board_id}/items/{item_id}/updates/export, item drawer's "Export updates to Excel", downloads every update and reply as an .xlsx workbook. */
  async exportUpdates(board_id: number, item_id: number): Promise<Blob> {
    return apiClient.get<Blob>(`/api/boards/${board_id}/items/${item_id}/updates/export`, { responseType: "blob" });
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

  /** GET /api/boards/{board_id}/items/{item_id}/comments/{comment_id}/revisions, earlier bodies of an edited comment, newest edit first. */
  async listRevisions(board_id: number, item_id: number, comment_id: number): Promise<CommentRevisionDto[]> {
    const response = await apiClient.get<{ data: CommentRevisionDto[] }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}/revisions`
    );
    return response.data;
  },

  /** POST /api/boards/{board_id}/items/{item_id}/comments/{comment_id}/pin */
  async togglePin(board_id: number, item_id: number, comment_id: number): Promise<BoardItemCommentDto> {
    const response = await apiClient.post<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}/pin`
    );
    return response.comment;
  },

  /** POST /api/boards/{board_id}/items/{item_id}/comments/{comment_id}/bookmark */
  async toggleBookmark(board_id: number, item_id: number, comment_id: number): Promise<BoardItemCommentDto> {
    const response = await apiClient.post<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}/bookmark`
    );
    return response.comment;
  },

  /** GET /api/boards/{board_id}/items/{item_id}/comments/scheduled, the viewer's own comments and replies still waiting to be sent, soonest first. */
  async listScheduled(board_id: number, item_id: number): Promise<BoardItemCommentDto[]> {
    const response = await apiClient.get<{ data: BoardItemCommentDto[] }>(
      `/api/boards/${board_id}/items/${item_id}/comments/scheduled`
    );
    return response.data;
  },

  /** PATCH /api/boards/{board_id}/items/{item_id}/comments/{comment_id}/schedule, moves a scheduled comment to a new time, or sends it now when `scheduled_at` is null. */
  async updateSchedule(board_id: number, item_id: number, comment_id: number, scheduled_at: string | null): Promise<BoardItemCommentDto> {
    const response = await apiClient.patch<{ comment: BoardItemCommentDto }>(
      `/api/boards/${board_id}/items/${item_id}/comments/${comment_id}/schedule`,
      { scheduled_at }
    );
    return response.comment;
  },
};
