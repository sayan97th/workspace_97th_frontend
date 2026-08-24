import { apiClient } from "@/lib/api-client";
import type { ChartDataDto } from "@/components/board/chart/types";

/**
 * Talks to a `chart`-type board view's aggregation endpoint
 * (`App\Http\Controllers\Board\BoardViewController::chartData`), nested
 * under the same `boards/{board_id}/views/{view_id}` prefix as
 * {@link import("./board-content.service").boardContentService}. Saving a
 * chart's own config (`chart_config`) reuses that service's `saveView`
 * instead of a dedicated write endpoint here.
 */
export const boardChartService = {
  /** GET /api/boards/{board_id}/views/{view_id}/chart-data */
  async getChartData(board_id: number, view_id: number): Promise<ChartDataDto> {
    return apiClient.get<ChartDataDto>(`/api/boards/${board_id}/views/${view_id}/chart-data`);
  },
};
