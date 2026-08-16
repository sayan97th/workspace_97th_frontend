import { apiClient } from "@/lib/api-client";
import type { NotificationDto } from "@/types/notifications";

/**
 * Talks to `App\Http\Controllers\Notification\NotificationController`
 * (workspace_97th_api).
 */
export const notificationsService = {
  /** GET /api/notifications */
  async listNotifications(): Promise<NotificationDto[]> {
    const response = await apiClient.get<{ data: NotificationDto[] }>("/api/notifications");
    return response.data;
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
};
