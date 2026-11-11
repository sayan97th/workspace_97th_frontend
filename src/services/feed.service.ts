import { apiClient } from "@/lib/api-client";
import type { FeedFollowsDto, FeedPersonDto, FeedUpdateDto, FeedUpdatesPageDto } from "@/types/feed";
import type {
  FeedAuthorOption,
  FeedBoardFilter,
  FeedFilters,
  FeedHiddenBoard,
  FeedSavedView,
  UpdateFeedTabId,
} from "@/data/update-feed-data";

/** The filters as `GET /api/feed/updates` and `POST /api/feed/updates/read-all` expect them in the query string. */
function appendFilterParams(params: URLSearchParams, filters: FeedFilters): void {
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.author_id) params.set("author_id", filters.author_id);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.unread_only) params.set("unread", "1");
}

/** Shape of a saved view as `FeedUpdateController` returns it: the tab and board sit inside `filters`. */
type FeedSavedViewDto = {
  id: number;
  name: string;
  filters: {
    tab?: UpdateFeedTabId;
    board_id?: number | null;
    q?: string | null;
    author_id?: number | null;
    kind?: "updates" | "replies" | null;
    from?: string | null;
    to?: string | null;
    unread?: boolean;
  };
};

const mapSavedViewDto = (dto: FeedSavedViewDto): FeedSavedView => ({
  id: dto.id,
  name: dto.name,
  tab: dto.filters.tab ?? "all",
  board_id: dto.filters.board_id ? String(dto.filters.board_id) : "all-boards",
  filters: {
    search: dto.filters.q ?? "",
    author_id: dto.filters.author_id ? String(dto.filters.author_id) : null,
    kind: dto.filters.kind ?? null,
    from: dto.filters.from ?? null,
    to: dto.filters.to ?? null,
    unread_only: dto.filters.unread ?? false,
  },
});

/**
 * Talks to `App\Http\Controllers\Feed\FeedUpdateController`
 * (workspace_97th_api).
 */
export const feedService = {
  /** GET /api/feed/updates?tab=&board_id=&cursor=&limit=&q=&author_id=&kind=&from=&to=&unread=, one cursor-paginated page (the first also carries every pinned update). */
  async listUpdates(
    tab: UpdateFeedTabId,
    board_id?: string,
    cursor?: string | null,
    limit?: number,
    filters?: FeedFilters
  ): Promise<FeedUpdatesPageDto> {
    const params = new URLSearchParams({ tab });
    if (board_id && board_id !== "all-boards") params.set("board_id", board_id);
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    if (filters) appendFilterParams(params, filters);

    return apiClient.get<FeedUpdatesPageDto>(`/api/feed/updates?${params.toString()}`);
  },

  /** GET /api/feed/updates/export?tab=&board_id=&q=&author_id=&kind=&from=&to=&unread=, the tab and filters the viewer has open as an .xlsx workbook. */
  async exportUpdates(tab: UpdateFeedTabId, board_id?: string, filters?: FeedFilters): Promise<Blob> {
    const params = new URLSearchParams({ tab });
    if (board_id && board_id !== "all-boards") params.set("board_id", board_id);
    if (filters) appendFilterParams(params, filters);

    return apiClient.get<Blob>(`/api/feed/updates/export?${params.toString()}`, { responseType: "blob" });
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

  /** GET /api/feed/filters, the people who wrote the updates in the viewer's feed. */
  async listAuthors(): Promise<FeedAuthorOption[]> {
    const response = await apiClient.get<{ data: { authors: { id: number; name: string }[] } }>("/api/feed/filters");
    return response.data.authors.map((author) => ({ id: String(author.id), name: author.name }));
  },

  /** POST /api/feed/updates/read-all, marks every unread update the tab, board and filters match as seen. */
  async markAllSeen(
    tab: UpdateFeedTabId,
    board_id: string | undefined,
    filters: FeedFilters
  ): Promise<{ marked_count: number; unread_count: number }> {
    const params = new URLSearchParams({ tab });
    if (board_id && board_id !== "all-boards") params.set("board_id", board_id);
    appendFilterParams(params, filters);

    const response = await apiClient.post<{ data: { marked_count: number; unread_count: number } }>(
      `/api/feed/updates/read-all?${params.toString()}`
    );
    return response.data;
  },

  /** DELETE /api/feed/updates/{id}/seen, "Mark as unread". With `whole_thread` the replies under the update come back as unread too. */
  async markUnseen(id: string, whole_thread = false): Promise<FeedUpdateDto> {
    const response = await apiClient.delete<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/seen`, whole_thread ? { thread: true } : undefined);
    return response.data;
  },

  /**
   * DELETE /api/feed/updates/{id}/seen with `comment_ids`, the inbox "Undo the
   * last close": only the rows that close marked as seen come back as unread.
   */
  async reopenClosed(id: string, comment_ids: number[]): Promise<FeedUpdateDto> {
    const response = await apiClient.delete<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/seen`, { thread: true, comment_ids });
    return response.data;
  },

  /** GET /api/feed/hidden-boards, the boards the viewer hid from their inbox. */
  async listHiddenBoards(): Promise<FeedHiddenBoard[]> {
    const response = await apiClient.get<{ data: FeedHiddenBoard[] }>("/api/feed/hidden-boards");
    return response.data;
  },

  /** POST /api/feed/hidden-boards, "Hide board updates from inbox". */
  async hideBoard(board_id: string): Promise<FeedHiddenBoard> {
    const response = await apiClient.post<{ data: FeedHiddenBoard }>("/api/feed/hidden-boards", { board_id: Number(board_id) });
    return response.data;
  },

  /** DELETE /api/feed/hidden-boards/{board_id}, shows a hidden board in the inbox again. */
  async showBoard(board_id: string): Promise<void> {
    await apiClient.delete(`/api/feed/hidden-boards/${board_id}`);
  },

  /** PATCH /api/feed/updates/{id}, "Edit update" (author only). */
  async editUpdate(id: string, body: string): Promise<FeedUpdateDto> {
    const response = await apiClient.patch<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}`, { body });
    return response.data;
  },

  /** DELETE /api/feed/updates/{id}, "Delete update for everyone" (author only, soft delete). */
  async deleteUpdate(id: string): Promise<void> {
    await apiClient.delete(`/api/feed/updates/${id}`);
  },

  /** POST /api/feed/updates/{id}/restore, the "Undo" after a delete. */
  async restoreUpdate(id: string): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/restore`);
    return response.data;
  },

  /** GET /api/feed/saved-views */
  async listSavedViews(): Promise<FeedSavedView[]> {
    const response = await apiClient.get<{ data: FeedSavedViewDto[] }>("/api/feed/saved-views");
    return response.data.map(mapSavedViewDto);
  },

  /** POST /api/feed/saved-views, saves the tab, board and filters under `name`. */
  async createSavedView(
    name: string,
    tab: UpdateFeedTabId,
    board_id: string | undefined,
    filters: FeedFilters
  ): Promise<FeedSavedView> {
    const body: Record<string, unknown> = { name, tab, unread: filters.unread_only };
    if (board_id && board_id !== "all-boards") body.board_id = Number(board_id);
    if (filters.search.trim()) body.q = filters.search.trim();
    if (filters.author_id) body.author_id = Number(filters.author_id);
    if (filters.kind) body.kind = filters.kind;
    if (filters.from) body.from = filters.from;
    if (filters.to) body.to = filters.to;

    const response = await apiClient.post<{ data: FeedSavedViewDto }>("/api/feed/saved-views", body);
    return mapSavedViewDto(response.data);
  },

  /** DELETE /api/feed/saved-views/{id} */
  async deleteSavedView(id: number): Promise<void> {
    await apiClient.delete(`/api/feed/saved-views/${id}`);
  },

  /** GET /api/feed/follows, the boards and items the viewer follows. */
  async listFollows(): Promise<FeedFollowsDto> {
    const response = await apiClient.get<{ data: FeedFollowsDto }>("/api/feed/follows");
    return response.data;
  },

  /** POST /api/feed/follows, follows a board or an item so its updates fill the Following tab. */
  async follow(type: "board" | "item", id: number): Promise<void> {
    await apiClient.post("/api/feed/follows", { type, id });
  },

  /** DELETE /api/feed/follows/{type}/{id} */
  async unfollow(type: "board" | "item", id: number): Promise<void> {
    await apiClient.delete(`/api/feed/follows/${type}/${id}`);
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

  /** POST /api/feed/updates/{id}/reactions, adds the emoji, or removes it when the viewer already reacted with it. */
  async toggleReaction(id: string, emoji: string): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/reactions`, { emoji });
    return response.data;
  },

  /** POST /api/feed/updates/{id}/pin */
  async togglePin(id: string): Promise<FeedUpdateDto> {
    const response = await apiClient.post<{ data: FeedUpdateDto }>(`/api/feed/updates/${id}/pin`);
    return response.data;
  },

  /** POST /api/feed/updates/{id}/seen, with `whole_thread` an update is marked seen together with every reply under it. */
  async markSeen(id: string, whole_thread = false): Promise<FeedUpdateDto> {
    const { data } = await feedService.closeThread(id, whole_thread);
    return data;
  },

  /**
   * POST /api/feed/updates/{id}/seen, also returning `closed_comment_ids`:
   * the rows this call marked as seen, which an undo hands back to
   * {@link reopenClosed}.
   */
  async closeThread(id: string, whole_thread = true): Promise<{ data: FeedUpdateDto; closed_comment_ids: number[] }> {
    const response = await apiClient.post<{ data: FeedUpdateDto; meta?: { closed_comment_ids?: number[] } }>(
      `/api/feed/updates/${id}/seen`,
      whole_thread ? { thread: true } : undefined
    );
    return { data: response.data, closed_comment_ids: response.meta?.closed_comment_ids ?? [] };
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
