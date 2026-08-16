"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { getEcho } from "@/lib/echo";
import { notificationsService } from "@/services/notifications.service";
import { mapNotificationDto, type NotificationDto } from "@/types/notifications";
import type { WorkspaceNotification } from "@/data/notifications-data";

/**
 * Fetches the current user's notifications and unread count, keeps them
 * live via the `notifications.{user_id}` Reverb channel, and exposes
 * `selectNotification` for the drawer's click-to-read behavior.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [unread_count, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        notificationsService.listNotifications(),
        notificationsService.getUnreadCount(),
      ]);
      setNotifications(list.map(mapNotificationDto));
      setUnreadCount(count);
    } catch {
      // Leave whatever was already loaded, the bell simply won't update this cycle.
    }
  }, []);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user, loadNotifications]);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    const echo = getEcho(token);
    const channel_name = `notifications.${user.id}`;
    const channel = echo
      .private(channel_name)
      .listen(".new_notification", (payload: NotificationDto) => {
        setNotifications((previous) => [mapNotificationDto(payload), ...previous]);
        setUnreadCount((previous) => previous + 1);
      });

    return () => {
      channel.stopListening(".new_notification");
      echo.leave(channel_name);
    };
  }, [user]);

  const selectNotification = useCallback(
    (id: string): WorkspaceNotification | undefined => {
      const notification = notifications.find((item) => item.id === id);

      setNotifications((previous) =>
        previous.map((item) => (item.id === id ? { ...item, is_unread: false } : item))
      );

      if (notification?.is_unread) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
        notificationsService.markAsRead(id).catch(() => {});
      }

      return notification;
    },
    [notifications]
  );

  return { notifications, unread_count, selectNotification };
}
