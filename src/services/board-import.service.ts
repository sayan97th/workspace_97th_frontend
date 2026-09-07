import { apiClient } from "@/lib/api-client";
import type {
  BoardImportAnalyzeResponse,
  BoardImportCommitPayload,
  BoardImportCommitResponse,
} from "@/types/board-import";

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

  /** POST /api/boards/{board_id}/import/commit — "Handle matches" step's final "Import Now". */
  async commit(board_id: number, payload: BoardImportCommitPayload): Promise<BoardImportCommitResponse> {
    return apiClient.post<BoardImportCommitResponse>(`/api/boards/${board_id}/import/commit`, payload);
  },
};
