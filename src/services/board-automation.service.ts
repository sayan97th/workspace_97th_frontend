import { apiClient } from "@/lib/api-client";
import type {
  BoardAutomationDto,
  BoardAutomationRunFilters,
  BoardAutomationRunsPage,
  BoardAutomationUsageDto,
  CreateBoardAutomationPayload,
  UpdateBoardAutomationPayload,
} from "@/types/board-automation";

/** Builds `?a=1&b=2`, leaving out every empty value. */
function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

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

  /** POST /api/boards/{board_id}/automations/{automation_id}/duplicate, the copy starts disabled. */
  async duplicateAutomation(board_id: number, automation_id: number): Promise<BoardAutomationDto> {
    const response = await apiClient.post<{ automation: BoardAutomationDto }>(`/api/boards/${board_id}/automations/${automation_id}/duplicate`, {});
    return response.automation;
  },

  /** GET /api/boards/{board_id}/automations/runs, the Manage tab's run history, newest first. */
  async getRuns(board_id: number, view_id: number | null, filters: BoardAutomationRunFilters, page: number, per_page: number): Promise<BoardAutomationRunsPage> {
    return apiClient.get<BoardAutomationRunsPage>(`/api/boards/${board_id}/automations/runs${buildQuery({ view_id, ...filters, page, per_page })}`);
  },

  /** GET /api/boards/{board_id}/automations/usage, run totals for the last 30 days. */
  async getUsage(board_id: number, view_id: number | null): Promise<BoardAutomationUsageDto> {
    const response = await apiClient.get<{ data: BoardAutomationUsageDto }>(`/api/boards/${board_id}/automations/usage${buildQuery({ view_id })}`);
    return response.data;
  },

  /** DELETE /api/boards/{board_id}/automations/{automation_id} */
  async deleteAutomation(board_id: number, automation_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/automations/${automation_id}`);
  },
};
