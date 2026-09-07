import { apiClient } from "@/lib/api-client";
import type { BoardImportAnalyzeResponse, BoardImportCommitPayload, BoardImportJobDto } from "@/types/board-import";

/**
 * Talks to `App\Http\Controllers\Board\BoardImportController` — the board
 * header's "More actions" > "Import items" wizard. Mirrors
 * {@link import("./board-content.service").boardContentService}'s style.
 */
export const boardImportService = {
  /** POST /api/boards/{board_id}/import/analyze — Step 1 ("Upload")'s submit. */
  async analyze(board_id: number, file: File, view_id?: number | null): Promise<BoardImportAnalyzeResponse> {
    const form_data = new FormData();
    form_data.append("file", file);
    if (view_id) form_data.append("view_id", String(view_id));
    return apiClient.postFormData<BoardImportAnalyzeResponse>(`/api/boards/${board_id}/import/analyze`, form_data);
  },

  /**
   * POST /api/boards/{board_id}/import/commit — "Handle matches" step's
   * final "Import Now". Queues the background job and returns its initial
   * status (usually already past `"queued"` by the time this resolves);
   * `useBoardImportProgress` takes over from there.
   */
  async commit(board_id: number, payload: BoardImportCommitPayload): Promise<BoardImportJobDto> {
    const response = await apiClient.post<{ data: BoardImportJobDto }>(`/api/boards/${board_id}/import/commit`, payload);
    return response.data;
  },

  /** GET /api/boards/{board_id}/import/{import_job_id} — the progress step's polling fallback for whenever the websocket connection is down. */
  async getStatus(board_id: number, import_job_id: number): Promise<BoardImportJobDto> {
    const response = await apiClient.get<{ data: BoardImportJobDto }>(`/api/boards/${board_id}/import/${import_job_id}`);
    return response.data;
  },

  /** POST /api/boards/{board_id}/import/{import_job_id}/cancel — the progress step's "Stop" button. */
  async cancel(board_id: number, import_job_id: number): Promise<BoardImportJobDto> {
    const response = await apiClient.post<{ data: BoardImportJobDto }>(`/api/boards/${board_id}/import/${import_job_id}/cancel`);
    return response.data;
  },
};
