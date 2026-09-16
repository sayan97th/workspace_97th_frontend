import { apiClient } from "@/lib/api-client";
import type { BoardCellFile } from "@/types/board-content";

/**
 * Talks to a Files-type column's own upload/delete endpoints
 * (`App\Http\Controllers\Board\BoardItemCellFileController`) — distinct from
 * {@link import("./board-item-attachments.service").boardItemAttachmentsService},
 * which attaches a file to the item as a whole rather than one specific
 * column's cell. Both calls resolve with the cell's *entire* updated file
 * list, which `TableBoardView` writes straight back as that column's value.
 */
export const boardItemCellFilesService = {
  /** POST /api/boards/{board_id}/items/{item_id}/columns/{column_id}/files — multipart, one or more files. */
  async uploadCellFiles(board_id: number, item_id: number, column_id: number, files: File[]): Promise<BoardCellFile[]> {
    const form_data = new FormData();
    files.forEach((file) => form_data.append("files[]", file));

    const response = await apiClient.postFormData<{ files: BoardCellFile[] }>(
      `/api/boards/${board_id}/items/${item_id}/columns/${column_id}/files`,
      form_data
    );
    return response.files;
  },

  /** DELETE /api/boards/{board_id}/items/{item_id}/columns/{column_id}/files/{file_id} */
  async deleteCellFile(board_id: number, item_id: number, column_id: number, file_id: string): Promise<BoardCellFile[]> {
    const response = await apiClient.delete<{ files: BoardCellFile[] }>(
      `/api/boards/${board_id}/items/${item_id}/columns/${column_id}/files/${file_id}`
    );
    return response.files;
  },
};
