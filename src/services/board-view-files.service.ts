import { apiClient } from "@/lib/api-client";
import type { BoardViewFileDto } from "@/types/board-view-files";

/**
 * Talks to a `file_gallery`-type board view's file endpoints
 * (`App\Http\Controllers\Board\BoardViewFileController`), nested under the
 * same `boards/{board_id}/views/{view_id}` prefix as
 * {@link import("./board-content.service").boardContentService}.
 */
export const boardViewFilesService = {
  /** GET /api/boards/{board_id}/views/{view_id}/files */
  async listFiles(board_id: number, view_id: number): Promise<BoardViewFileDto[]> {
    const response = await apiClient.get<{ data: BoardViewFileDto[] }>(
      `/api/boards/${board_id}/views/${view_id}/files`
    );
    return response.data;
  },

  /** POST /api/boards/{board_id}/views/{view_id}/files — multipart, any number of files in one request. */
  async uploadFiles(board_id: number, view_id: number, files: File[]): Promise<BoardViewFileDto[]> {
    const form_data = new FormData();
    files.forEach((file) => form_data.append("files[]", file));

    const response = await apiClient.postFormData<{ data: BoardViewFileDto[] }>(
      `/api/boards/${board_id}/views/${view_id}/files`,
      form_data
    );
    return response.data;
  },

  /** DELETE /api/boards/{board_id}/views/{view_id}/files/{file_id} */
  async deleteFile(board_id: number, view_id: number, file_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/views/${view_id}/files/${file_id}`);
  },
};
