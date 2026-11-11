import { apiClient, toApiUrl } from "@/lib/api-client";
import type { BoardExportJobDto, BoardExportOptions, BoardExportSummary } from "@/types/board-export";

/**
 * Talks to `App\Http\Controllers\Board\BoardExportController`. Exports run as
 * a background job on the API, the dialog starts one, follows its progress
 * and then opens the signed download link, see `ExportBoardModal`.
 */
export const boardExportService = {
  /** GET /api/boards/{board_id}/exports/summary, the counts shown before exporting. */
  async getSummary(board_id: number, view_id?: number | null, group_id?: number | null): Promise<BoardExportSummary> {
    const params = new URLSearchParams();
    if (view_id) params.set("view_id", String(view_id));
    if (group_id) params.set("group_id", String(group_id));
    const query = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get<{ data: BoardExportSummary }>(`/api/boards/${board_id}/exports/summary${query}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/exports, queues the export and returns its first snapshot. */
  async start(board_id: number, options: BoardExportOptions): Promise<BoardExportJobDto> {
    const response = await apiClient.post<{ data: BoardExportJobDto }>(`/api/boards/${board_id}/exports`, options);
    return response.data;
  },

  /** GET /api/boards/{board_id}/exports/{export_id}, the polling fallback of the live progress channel. */
  async getStatus(board_id: number, export_id: number): Promise<BoardExportJobDto> {
    const response = await apiClient.get<{ data: BoardExportJobDto }>(`/api/boards/${board_id}/exports/${export_id}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/exports/{export_id}/cancel, stops the export at its next chunk. */
  async cancel(board_id: number, export_id: number): Promise<BoardExportJobDto> {
    const response = await apiClient.post<{ data: BoardExportJobDto }>(`/api/boards/${board_id}/exports/${export_id}/cancel`);
    return response.data;
  },

  /**
   * Starts the browser's own download of a finished export. The link is signed, so no auth
   * header is needed and the file streams straight to disk instead of through JavaScript memory.
   */
  download(job: BoardExportJobDto): boolean {
    if (!job.download_url) return false;
    const link = document.createElement("a");
    link.href = toApiUrl(job.download_url);
    link.download = job.file_name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  },
};
