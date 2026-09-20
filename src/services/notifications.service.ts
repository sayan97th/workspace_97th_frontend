import { apiClient } from "@/lib/api-client";
import type { NotificationFilters, NotificationSummary } from "@/data/notifications-data";
import type { NotificationFiltersDto, NotificationsLatestDto, NotificationsPageDto } from "@/types/notifications";

/** What a multi-select toolbar can do to a batch of notifications. */
export type NotificationBulkAction = "read" | "unread" | "dismiss" | "save" | "unsave";

type ListNotificationsOptions = {
  filters: NotificationFilters;
  cursor?: string | null;
  limit?: number;
};

/**
 * Talks to `App\Http\Controllers\Notification\NotificationController`
 * (workspace_97th_api).
 */
export const notificationsService = {
  /** GET /api/notifications, one cursor-paginated page with every drawer filter applied server-side. */
  async listNotifications({ filters, cursor, limit }: ListNotificationsOptions): Promise<NotificationsPageDto> {
    const params = new URLSearchParams();
    if (filters.tab !== "all") params.set("tab", filters.tab);
    if (filters.unread_only) params.set("unread", "1");
    if (filters.board_id) params.set("board_id", filters.board_id);
    if (filters.actor_id) params.set("actor_id", filters.actor_id);
    if (filters.search.trim()) params.set("q", filters.search.trim());
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));

    const query = params.toString();
    return apiClient.get<NotificationsPageDto>(`/api/notifications${query ? `?${query}` : ""}`);
  },

  /** GET /api/notifications/filters, the boards and people the filter menus offer. */
  async getFilterOptions(): Promise<NotificationFiltersDto> {
    const response = await apiClient.get<{ data: NotificationFiltersDto }>("/api/notifications/filters");
    return response.data;
  },

  /**
   * GET /api/notifications/latest, the polling fallback for the live toast. Without `after_id` it only
   * returns the newest id (the baseline), with it the visible notifications created after that id, oldest first.
   */
  async getLatest(after_id?: string): Promise<NotificationsLatestDto> {
    const query = after_id ? `?after_id=${encodeURIComponent(after_id)}` : "";
    return apiClient.get<NotificationsLatestDto>(`/api/notifications/latest${query}`);
  },

  /** GET /api/notifications/unread-count */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<{ data: { unread_count: number } }>(
      "/api/notifications/unread-count"
    );
    return response.data.unread_count;
  },

  /** PATCH /api/notifications/{id}/read */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/api/notifications/${id}/read`);
  },

  /** PATCH /api/notifications/{id}/unread */
  async markAsUnread(id: string): Promise<void> {
    await apiClient.patch(`/api/notifications/${id}/unread`);
  },

  /** PATCH /api/notifications/read-all */
  async markAllAsRead(): Promise<void> {
    await apiClient.patch("/api/notifications/read-all");
  },

  /** POST /api/notifications/bulk, applies one action to up to 100 notifications and returns the fresh unread count. */
  async bulk(action: NotificationBulkAction, ids: string[]): Promise<{ ids: string[]; unread_count: number }> {
    const response = await apiClient.post<{ data: { ids: string[]; unread_count: number } }>("/api/notifications/bulk", {
      action,
      ids: ids.map(Number),
    });
    return response.data;
  },

  /** PATCH /api/notifications/{id}/snooze, hides it until `snoozed_until` (an ISO timestamp), then it returns as unread. */
  async snooze(id: string, snoozed_until: string): Promise<void> {
    await apiClient.patch(`/api/notifications/${id}/snooze`, { snoozed_until });
  },

  /** PATCH /api/notifications/{id}/save, "Save for later": keeps it in the Saved tab and out of "Mark all as read". */
  async save(id: string): Promise<void> {
    await apiClient.patch(`/api/notifications/${id}/save`);
  },

  /** DELETE /api/notifications/{id}/save */
  async unsave(id: string): Promise<void> {
    await apiClient.delete(`/api/notifications/${id}/save`);
  },

  /** GET /api/notifications/summary, what is waiting for the person, for the summary card. */
  async getSummary(): Promise<NotificationSummary> {
    const response = await apiClient.get<{ data: NotificationSummary }>("/api/notifications/summary");
    return response.data;
  },

  /** DELETE /api/notifications/{id} */
  async dismiss(id: string): Promise<void> {
    await apiClient.delete(`/api/notifications/${id}`);
  },
};
