import { apiClient } from "@/lib/api-client";
import type { BoardActivityLogEntry, BoardTrashIndex } from "@/types/board-options";
import type { BoardDetail } from "@/types/workspace";

/**
 * Talks to the board options menu's own endpoints — archive/unarchive the
 * whole board, its per-board archived/deleted-items panel, its activity log,
 * exporting to Excel, and product feedback. Mirrors
 * {@link import("./board-content.service").boardContentService}'s style.
 */
export const boardOptionsService = {
  /** POST /api/boards/{id}/archive — board options menu's "Archive board". */
  async archiveBoard(board_id: number): Promise<BoardDetail> {
    const response = await apiClient.post<{ item: BoardDetail }>(`/api/boards/${board_id}/archive`);
    return response.item;
  },

  /** POST /api/boards/{id}/unarchive — "View archive / trash" > Archive tab's "Restore". */
  async unarchiveBoard(board_id: number): Promise<BoardDetail> {
    const response = await apiClient.post<{ item: BoardDetail }>(`/api/boards/${board_id}/unarchive`);
    return response.item;
  },

  /** GET /api/boards/{id}/activity-log */
  async getActivityLog(board_id: number): Promise<BoardActivityLogEntry[]> {
    const response = await apiClient.get<{ data: BoardActivityLogEntry[] }>(`/api/boards/${board_id}/activity-log`);
    return response.data;
  },

  /** GET /api/boards/{id}/trash — this board's own archived + deleted items. */
  async getTrash(board_id: number): Promise<BoardTrashIndex> {
    return apiClient.get<BoardTrashIndex>(`/api/boards/${board_id}/trash`);
  },

  /** PATCH /api/boards/{id}/trash/{item_id}/restore */
  async restoreTrashItem(board_id: number, item_id: string): Promise<void> {
    await apiClient.patch(`/api/boards/${board_id}/trash/${item_id}/restore`);
  },

  /** DELETE /api/boards/{id}/trash/{item_id} — permanent, no further undo. */
  async deleteTrashItemForever(board_id: number, item_id: string): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/trash/${item_id}`);
  },

  /** GET /api/boards/{id}/export — downloads the active tab as an .xlsx workbook. */
  async exportToExcel(board_id: number, view_id?: number | null): Promise<Blob> {
    const query = view_id ? `?view_id=${view_id}` : "";
    return apiClient.get<Blob>(`/api/boards/${board_id}/export${query}`, { responseType: "blob" });
  },

  /** POST /api/feedback — board options menu's "Give feedback". */
  async submitFeedback(message: string, board_id?: number): Promise<void> {
    await apiClient.post("/api/feedback", {
      message,
      board_id,
      page_url: typeof window !== "undefined" ? window.location.href : undefined,
    });
  },
};
