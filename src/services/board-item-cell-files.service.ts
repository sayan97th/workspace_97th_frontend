import { apiClient } from "@/lib/api-client";
import type { BoardCellFile } from "@/types/board-content";
import { notifyNavItemChanged } from "./workspace.service";

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

  /**
   * POST /api/boards/{board_id}/items/{item_id}/columns/{column_id}/files/link, the cell menu's "From Link"
   * and its cloud provider options. `text` is optional, the API falls back to the URL. A provider `source`
   * only accepts links hosted by that provider.
   */
  async addCellFileLink(
    board_id: number,
    item_id: number,
    column_id: number,
    url: string,
    text: string,
    source: NonNullable<BoardCellFile["source"]> = "link"
  ): Promise<BoardCellFile[]> {
    const response = await apiClient.post<{ files: BoardCellFile[] }>(
      `/api/boards/${board_id}/items/${item_id}/columns/${column_id}/files/link`,
      { url, text, source }
    );
    return response.files;
  },

  /**
   * POST /api/boards/{board_id}/items/{item_id}/columns/{column_id}/files/doc, the cell menu's "Doc".
   * Creates a Doc named after the item next to the board and attaches it, then lets the sidebar reload to list it.
   */
  async addCellFileDoc(board_id: number, item_id: number, column_id: number): Promise<BoardCellFile[]> {
    const response = await apiClient.post<{ files: BoardCellFile[] }>(
      `/api/boards/${board_id}/items/${item_id}/columns/${column_id}/files/doc`,
      {}
    );
    notifyNavItemChanged();
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
