"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { showDesktopNotification } from "@/lib/desktop-notifications";
import { getEcho } from "@/lib/echo";
import { notificationsService } from "@/services/notifications.service";
import { mapNotificationDto, type NotificationDto } from "@/types/notifications";
import {
  default_notification_filters,
  matchesNotificationFilters,
  resolveSnoozeDate,
  type NotificationFilterOptions,
  type NotificationFilters,
  type NotificationSnoozePresetId,
  type WorkspaceNotification,
} from "@/data/notifications-data";
import { useToast } from "@/components/ui/toast/ToastProvider";

const PAGE_SIZE = 20;

/**
 * Fetches the current user's notifications (cursor paginated, filtered
 * server-side) and unread count, keeps them live via the
 * `notifications.{user_id}` Reverb channel, raises a Slack-style toast (and,
 * when the tab is in the background, a desktop notification) for each incoming
 * one unless the user's quiet hours are active, and exposes the drawer's
 * actions: open, mark as (un)read, snooze, dismiss.
 */
export function useNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [unread_count, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState<NotificationFilters>(default_notification_filters);
  const [filter_options, setFilterOptions] = useState<NotificationFilterOptions>({ boards: [], actors: [] });
  const [next_cursor, setNextCursor] = useState<string | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_loading_more, setIsLoadingMore] = useState(false);

  // The websocket listener and the paging callbacks read these through refs, so
  // a filter change or a fresh profile never tears down the live subscription.
  const filters_ref = useRef(filters);
  const notifications_ref = useRef(notifications);
  const desktop_enabled_ref = useRef(false);
  // Only the newest list request may write its result: a slower response for
  // an older filter combination must never overwrite a newer one.
  const request_id_ref = useRef(0);

  useEffect(() => {
    filters_ref.current = filters;
    notifications_ref.current = notifications;
  }, [filters, notifications]);

  useEffect(() => {
    desktop_enabled_ref.current = user?.desktop_notifications_enabled ?? false;
  }, [user?.desktop_notifications_enabled]);

  const loadUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await notificationsService.getUnreadCount());
    } catch {
      // The bell keeps its last known count.
    }
  }, []);

  const loadNotifications = useCallback(async (next_filters: NotificationFilters) => {
    const request_id = ++request_id_ref.current;
    setIsLoading(true);
    try {
      const page = await notificationsService.listNotifications({ filters: next_filters, limit: PAGE_SIZE });
      if (request_id !== request_id_ref.current) return;
      setNotifications(page.data.map(mapNotificationDto));
      setNextCursor(page.meta.next_cursor);
    } catch {
      // Leave whatever was already loaded, the bell simply won't update this cycle.
    } finally {
      if (request_id === request_id_ref.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadNotifications(filters);
  }, [user, filters, loadNotifications]);

  useEffect(() => {
    if (user) loadUnreadCount();
  }, [user, loadUnreadCount]);

  const loadMore = useCallback(async () => {
    if (!next_cursor || is_loading || is_loading_more) return;
    const request_id = request_id_ref.current;
    setIsLoadingMore(true);
    try {
      const page = await notificationsService.listNotifications({ filters, cursor: next_cursor, limit: PAGE_SIZE });
      if (request_id !== request_id_ref.current) return;
      setNotifications((previous) => {
        const known_ids = new Set(previous.map((item) => item.id));
        return [...previous, ...page.data.map(mapNotificationDto).filter((item) => !known_ids.has(item.id))];
      });
      setNextCursor(page.meta.next_cursor);
    } catch {
      // The sentinel fires again on the next scroll, so a failed page is retried.
    } finally {
      setIsLoadingMore(false);
    }
  }, [next_cursor, is_loading, is_loading_more, filters]);

  const updateFilters = useCallback((patch: Partial<NotificationFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch }));
  }, []);

  const loadFilterOptions = useCallback(async () => {
    try {
      const options = await notificationsService.getFilterOptions();
      setFilterOptions({
        boards: options.boards.map((board) => ({ id: String(board.id), name: board.name })),
        actors: options.actors.map((actor) => ({ id: String(actor.id), name: actor.name })),
      });
    } catch {
      // The menus keep whatever options they already had.
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    const echo = getEcho(token);
    const channel_name = `notifications.${user.id}`;
    const channel = echo
      .private(channel_name)
      .listen(".new_notification", (payload: NotificationDto) => {
        const notification = mapNotificationDto(payload);
        const openNotification = () => {
          setNotifications((previous) =>
            previous.map((item) => (item.id === notification.id ? { ...item, is_unread: false } : item))
          );
          setUnreadCount((previous) => Math.max(0, previous - 1));
          notificationsService.markAsRead(notification.id).catch(() => {});
          if (notification.link) router.push(notification.link);
        };

        // A woken snooze arrives with an id the list may already hold: replace it in place, and only count it as newly unread when it was not.
        const existing = notifications_ref.current.find((item) => item.id === notification.id);
        setUnreadCount((count) => (existing?.is_unread ? count : count + 1));
        setNotifications((previous) => {
          const without_existing = previous.filter((item) => item.id !== notification.id);
          return matchesNotificationFilters(notification, filters_ref.current)
            ? [notification, ...without_existing]
            : without_existing;
        });

        // Quiet hours keep the notification in the bell but never interrupt.
        if (payload.is_silenced) return;

        showToast({
          actor_name: notification.actor.name,
          actor_initials: notification.actor.initials,
          avatar_gradient: notification.actor.avatar_gradient,
          avatar_url: notification.actor.avatar_url,
          action_label: notification.action_label,
          action_target: notification.action_target,
          board_name: notification.board.name || undefined,
          link: notification.link,
          onAction: openNotification,
        });

        // The toast already covers a visible tab, the desktop notification is for one in the background.
        if (desktop_enabled_ref.current && document.visibilityState !== "visible") {
          showDesktopNotification({
            title: `${notification.actor.name} ${notification.action_label.toLowerCase()}`,
            body: [notification.action_target, notification.board.name].filter(Boolean).join(" · "),
            tag: `notification-${notification.group_key}`,
            onClick: openNotification,
          });
        }
      });

    return () => {
      channel.stopListening(".new_notification");
      echo.leave(channel_name);
    };
  }, [user, showToast, router]);

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

  /** Flags one notification read or unread, optimistically, restoring it if the request fails. */
  const setNotificationUnread = useCallback(
    (id: string, is_unread: boolean) => {
      const notification = notifications.find((item) => item.id === id);
      if (!notification || notification.is_unread === is_unread) return;

      const applyState = (value: boolean) => {
        setNotifications((previous) => previous.map((item) => (item.id === id ? { ...item, is_unread: value } : item)));
        setUnreadCount((previous) => Math.max(0, previous + (value ? 1 : -1)));
      };

      applyState(is_unread);
      const request = is_unread ? notificationsService.markAsUnread(id) : notificationsService.markAsRead(id);
      request.catch(() => applyState(!is_unread));
    },
    [notifications]
  );

  const markAsUnread = useCallback((id: string) => setNotificationUnread(id, true), [setNotificationUnread]);
  const markAsRead = useCallback((id: string) => setNotificationUnread(id, false), [setNotificationUnread]);

  const markAllAsRead = useCallback(() => {
    setNotifications((previous) => previous.map((item) => ({ ...item, is_unread: false })));
    setUnreadCount(0);
    notificationsService.markAllAsRead().catch(() => {});
  }, []);

  const dismissNotification = useCallback(
    (id: string) => {
      const notification = notifications.find((item) => item.id === id);
      setNotifications((previous) => previous.filter((item) => item.id !== id));
      if (notification?.is_unread) setUnreadCount((previous) => Math.max(0, previous - 1));
      notificationsService.dismiss(id).catch(() => {});
    },
    [notifications]
  );

  /** "Remind me later": removes the notification from the list now, the server brings it back as unread at the chosen time. */
  const snoozeNotification = useCallback(
    (id: string, preset: NotificationSnoozePresetId) => {
      const notification = notifications.find((item) => item.id === id);
      if (!notification) return;

      setNotifications((previous) => previous.filter((item) => item.id !== id));
      if (notification.is_unread) setUnreadCount((previous) => Math.max(0, previous - 1));

      notificationsService.snooze(id, resolveSnoozeDate(preset).toISOString()).catch(() => {
        // The snooze never reached the server: put the notification back where the list and the count can be trusted again.
        loadNotifications(filters_ref.current);
        loadUnreadCount();
      });
    },
    [notifications, loadNotifications, loadUnreadCount]
  );

  return {
    notifications,
    unread_count,
    filters,
    updateFilters,
    filter_options,
    loadFilterOptions,
    is_loading,
    is_loading_more,
    has_more: next_cursor !== null,
    loadMore,
    selectNotification,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    dismissNotification,
    snoozeNotification,
  };
}
