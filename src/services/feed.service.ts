import { apiClient } from "@/lib/api-client";
import type { FeedPersonDto, FeedUpdateDto, FeedUpdatesPageDto } from "@/types/feed";
import type { FeedBoardFilter, UpdateFeedTabId } from "@/data/update-feed-data";

/**
 * Talks to `App\Http\Controllers\Feed\FeedUpdateController`
 * (workspace_97th_api).
 */
export const feedService = {
  /** GET /api/feed/updates?tab=&board_id=&cursor=&limit=, one cursor-paginated page (the first also carries every pinned update). */
  async listUpdates(
    tab: UpdateFeedTabId,
    board_id?: string,
    cursor?: string | null,
    limit?: number
  ): Promise<FeedUpdatesPageDto> {
    const params = new URLSearchParams({ tab });
    if (board_id && board_id !== "all-boards") params.set("board_id", board_id);
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));

    return apiClient.get<FeedUpdatesPageDto>(`/api/feed/updates?${params.toString()}`);
  },

  /** GET /api/feed/boards/{board_id}/people, the workspace members a reply on that board can `@mention`. */
  async listBoardPeople(board_id: string): Promise<FeedPersonDto[]> {
    const response = await apiClient.get<{ data: FeedPersonDto[] }>(`/api/feed/boards/${board_id}/people`);
    return response.data;
  },

  /** GET /api/feed/boards */
  async listBoards(): Promise<FeedBoardFilter[]> {
    const response = await apiClient.get<{ data: FeedBoardFilter[] }>("/api/feed/boards");
    return response.data;
  },

  /** GET /api/feed/unread-count */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ data: { unread_count: number } }>(
      "/api/feed/unread-count"
    );
    return response.data.unread_count;
  },

  /** POST /api/feed/updates/{id}/bookmark */
  async toggleBookmark(id: string): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/bookmark`);
    return response.data;
  },

  /** POST /api/feed/updates/{id}/like */
  async toggleLike(id: string): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/like`);
    return response.data;
  },

  /** POST /api/feed/updates/{id}/pin */
  async togglePin(id: string): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/pin`);
    return response.data;
  },

  /** POST /api/feed/updates/{id}/seen */
  async markSeen(id: string): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/seen`);
    return response.data;
  },

  /** POST /api/feed/updates/{id}/reply */
  async reply(id: string, body: string, mentioned_user_ids: number[] = []): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/reply`, {
      body,
      mentioned_user_ids,
    });
    return response.data;
  },

  /** POST /api/feed/updates/{id}/schedule */
  async schedule(
    id: string,
    body: string,
    scheduled_at: string,
    mentioned_user_ids: number[] = []
  ): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/schedule`, {
      body,
      scheduled_at,
      mentioned_user_ids,
    });
    return response.data;
  },
};
