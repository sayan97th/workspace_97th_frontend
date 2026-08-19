import { apiClient } from "@/lib/api-client";
import type { BoardItemAttachmentDto } from "@/types/board-attachments";

/**
 * Talks to the board item drawer's attachment endpoints
 * (`App\Http\Controllers\Board\BoardItemAttachmentController`), nested
 * under the same `boards/{board_id}/items/{item_id}` prefix as
 * {@link import("./board-comments.service").boardCommentsService} — but
 * these files are attached directly to the item, not to a comment, so
 * uploading one never creates a comment.
 */
export const boardItemAttachmentsService = {
  /** GET /api/boards/{board_id}/items/{item_id}/attachments */
  async listAttachments(board_id: number, item_id: number): Promise<BoardItemAttachmentDto[]> {
    const response = await apiClient.get<{ data: BoardItemAttachmentDto[] }>(
      `/api/boards/${board_id}/items/${item_id}/attachments`
    );
    return response.data;
  },

  /** POST /api/boards/{board_id}/items/{item_id}/attachments — multipart, one or more files. */
  async uploadAttachments(board_id: number, item_id: number, files: File[]): Promise<BoardItemAttachmentDto[]> {
    const form_data = new FormData();
    files.forEach((file) => form_data.append("files[]", file));

    const response = await apiClient.postFormData<{ data: BoardItemAttachmentDto[] }>(
      `/api/boards/${board_id}/items/${item_id}/attachments`,
      form_data
    );
    return response.data;
  },

  /** DELETE /api/boards/{board_id}/items/{item_id}/attachments/{attachment_id} */
  async deleteAttachment(board_id: number, item_id: number, attachment_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/items/${item_id}/attachments/${attachment_id}`);
  },
};
