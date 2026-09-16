import { apiClient } from "@/lib/api-client";
import type { BoardAutomationDto, CreateBoardAutomationPayload, UpdateBoardAutomationPayload } from "@/types/board-automation";

/**
 * Talks to the Laravel rule-based (no AI) automations engine
 * (`App\Http\Controllers\Board\BoardAutomationController`) — mirrors
 * {@link import("./board-content.service").boardContentService}'s own style.
 */
export const boardAutomationService = {
  /** GET /api/boards/{board_id}/automations — scoped to `view_id` (a tab), defaulting to the board's primary tab. */
  async getAutomations(board_id: number, view_id?: number | null): Promise<BoardAutomationDto[]> {
    const query = view_id ? `?view_id=${view_id}` : "";
    const response = await apiClient.get<{ data: BoardAutomationDto[] }>(`/api/boards/${board_id}/automations${query}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/automations */
  async createAutomation(board_id: number, payload: CreateBoardAutomationPayload): Promise<BoardAutomationDto> {
    const response = await apiClient.post<{ automation: BoardAutomationDto }>(`/api/boards/${board_id}/automations`, payload);
    return response.automation;
  },

  /** PATCH /api/boards/{board_id}/automations/{automation_id} */
  async updateAutomation(board_id: number, automation_id: number, payload: UpdateBoardAutomationPayload): Promise<BoardAutomationDto> {
    const response = await apiClient.patch<{ automation: BoardAutomationDto }>(
      `/api/boards/${board_id}/automations/${automation_id}`,
      payload
    );
    return response.automation;
  },

  /** DELETE /api/boards/{board_id}/automations/{automation_id} */
  async deleteAutomation(board_id: number, automation_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/automations/${automation_id}`);
  },
};
