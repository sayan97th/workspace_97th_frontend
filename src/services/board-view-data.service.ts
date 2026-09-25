import { apiClient } from "@/lib/api-client";
import type { WorkloadDataDto } from "@/components/board/workload/types";
import type { DashboardDataDto, DashboardSourceBoard } from "@/components/board/dashboard/types";

/**
 * Computed data for the Workload and Dashboard tabs
 * (`App\Http\Controllers\Board\BoardViewDataController`). Their settings are
 * saved through `boardContentService.saveView` (`workload_config`,
 * `dashboard_config`), like a Chart tab's `chart_config`.
 */
export const boardViewDataService = {
  /** GET /api/boards/{board_id}/views/{view_id}/workload-data */
  async getWorkload(board_id: number, view_id: number, start?: string | null): Promise<WorkloadDataDto> {
    const query = start ? `?start=${encodeURIComponent(start)}` : "";
    return apiClient.get<WorkloadDataDto>(`/api/boards/${board_id}/views/${view_id}/workload-data${query}`);
  },

  /** GET /api/boards/{board_id}/views/{view_id}/dashboard-data */
  async getDashboard(board_id: number, view_id: number): Promise<DashboardDataDto> {
    return apiClient.get<DashboardDataDto>(`/api/boards/${board_id}/views/${view_id}/dashboard-data`);
  },

  /** GET /api/boards/{board_id}/dashboard-sources, the boards a widget may read (this board first). */
  async getDashboardSources(board_id: number, search = ""): Promise<DashboardSourceBoard[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const response = await apiClient.get<{ boards: DashboardSourceBoard[] }>(`/api/boards/${board_id}/dashboard-sources${query}`);
    return response.boards;
  },
};
