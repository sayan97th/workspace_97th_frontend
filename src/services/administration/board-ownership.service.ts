import { apiClient } from "@/lib/api-client";
import type { AdminBoardDto, BulkReassignBoardOwnerPayload } from "@/types/administration/board-ownership";

/** Talks to the Laravel `/api/admin/board-ownership` resource. */
export const boardOwnershipService = {
  /** GET /api/admin/board-ownership/orphans */
  async getOrphanBoards(): Promise<AdminBoardDto[]> {
    const response = await apiClient.get<{ data: AdminBoardDto[] }>("/api/admin/board-ownership/orphans");
    return response.data;
  },

  /** POST /api/admin/board-ownership/reassign */
  async bulkReassignOwner(payload: BulkReassignBoardOwnerPayload): Promise<number> {
    const response = await apiClient.post<{ reassigned_count: number }>(
      "/api/admin/board-ownership/reassign",
      payload
    );
    return response.reassigned_count;
  },

  /** PATCH /api/admin/board-ownership/orphans/{id} */
  async assignOrphanOwner(board_id: number, owner_id: number): Promise<AdminBoardDto> {
    const response = await apiClient.patch<{ board: AdminBoardDto }>(
      `/api/admin/board-ownership/orphans/${board_id}`,
      { owner_id }
    );
    return response.board;
  },
};
