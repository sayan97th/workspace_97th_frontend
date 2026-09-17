import { apiClient } from "@/lib/api-client";

export type MutedBoardDto = {
  board_id: number;
  board_name: string;
};

/**
 * Talks to `App\Http\Controllers\Board\BoardNotificationMuteController`
 * (workspace_97th_api) — per-user, per-board notification muting, checked by
 * `NotificationService::notify()` ahead of the recipient's own per-type
 * preferences (Profile > Notifications).
 */
export const boardMuteService = {
  /** GET /api/boards/muted */
  async listMutedBoards(): Promise<MutedBoardDto[]> {
    const response = await apiClient.get<{ data: MutedBoardDto[] }>("/api/boards/muted");
    return response.data;
  },

  /** POST /api/boards/{board_id}/mute */
  async muteBoard(board_id: number): Promise<void> {
    await apiClient.post(`/api/boards/${board_id}/mute`);
  },

  /** DELETE /api/boards/{board_id}/mute */
  async unmuteBoard(board_id: number): Promise<void> {
    await apiClient.delete(`/api/boards/${board_id}/mute`);
  },
};
