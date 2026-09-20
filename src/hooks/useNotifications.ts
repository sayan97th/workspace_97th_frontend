"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { showDesktopNotification } from "@/lib/desktop-notifications";
import { playNotificationSound } from "@/lib/notification-sound";
import { notificationsService, type NotificationBulkAction } from "@/services/notifications.service";
import { useNotificationDelivery } from "@/hooks/useNotificationDelivery";
import { useTabBadge } from "@/hooks/useTabBadge";
import { mapNotificationDto, type NotificationDto } from "@/types/notifications";
import {
  default_notification_filters,
  matchesNotificationFilters,
  resolveSnoozeDate,
  type NotificationFilterOptions,
  type NotificationFilters,
  type NotificationSnoozePresetId,
  type NotificationSummary,
  type WorkspaceNotification,
} from "@/data/notifications-data";
import { useToast } from "@/components/ui/toast/ToastProvider";

const PAGE_SIZE = 20;

/** The API takes at most this many ids per bulk request. */
const BULK_BATCH_SIZE = 100;

/**
 * Fetches the current user's notifications (cursor paginated, filtered
 * server-side) and unread count, keeps them live via the
 * `notifications.{user_id}` Reverb channel (with a REST polling fallback for
 * when the websocket is blocked), raises a Slack-style toast (and,
 * when the tab is in the background, a desktop notification) for each incoming
 * one unless the user's quiet hours are active (with a short chime when they
 * turned the sound on), prefixes the tab title with the unread count when they
 * left that on, and exposes the drawer's actions: open, mark as (un)read,
 * snooze, save for later, dismiss, and the same on a multi-selection. Also
 * loads the summary card's counts of what is waiting for the person.
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
  const [summary, setSummary] = useState<NotificationSummary | null>(null);

  // The websocket listener and the paging callbacks read these through refs, so
  // a filter change or a fresh profile never tears down the live subscription.
  const filters_ref = useRef(filters);
  const notifications_ref = useRef(notifications);
  const desktop_enabled_ref = useRef(false);
  const sound_enabled_ref = useRef(false);
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

  useEffect(() => {
    sound_enabled_ref.current = user?.notification_sound_enabled ?? false;
  }, [user?.notification_sound_enabled]);

  const loadUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await notificationsService.getUnreadCount());
    } catch {
      // The bell keeps its last known count.
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await notificationsService.getSummary());
    } catch {
      // The card keeps its last known counts.
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

  /**
   * Handles one live notification, whichever channel delivered it (websocket or
   * the REST fallback, see {@link useNotificationDelivery}): updates the list and
   * the unread count, then raises the toast, chime and desktop notification.
   */
  const handleIncoming = useCallback(
    (payload: NotificationDto) => {
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

      if (sound_enabled_ref.current) playNotificationSound();

      showToast({
        dedupe_key: `notification-${notification.id}`,
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
      if (desktop_enabled_ref.current && !payload.is_push_muted && document.visibilityState !== "visible") {
        showDesktopNotification({
          title: `${notification.actor.name} ${notification.action_label.toLowerCase()}`,
          body: [notification.action_target, notification.board.name].filter(Boolean).join(" · "),
          tag: `notification-${notification.group_key}`,
          onClick: openNotification,
        });
      }
    },
    [showToast, router]
  );

  useNotificationDelivery(user?.id, handleIncoming);

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

  // Notifications saved for later stay unread, saving one is how a person keeps it out of a bulk clear.
  const markAllAsRead = useCallback(() => {
    setNotifications((previous) => previous.map((item) => (item.is_saved ? item : { ...item, is_unread: false })));
    notificationsService
      .markAllAsRead()
      .catch(() => {})
      .finally(() => {
        loadUnreadCount();
        loadSummary();
      });
  }, [loadUnreadCount, loadSummary]);

  /** "Save for later": flags one notification saved (or removes the flag), optimistically. Removing it on the Saved tab takes it out of the list. */
  const setNotificationSaved = useCallback(
    (id: string, is_saved: boolean) => {
      const notification = notifications.find((item) => item.id === id);
      if (!notification || notification.is_saved === is_saved) return;

      const applyState = (value: boolean) =>
        setNotifications((previous) =>
          value === false && filters_ref.current.tab === "saved"
            ? previous.filter((item) => item.id !== id)
            : previous.map((item) => (item.id === id ? { ...item, is_saved: value } : item))
        );

      applyState(is_saved);
      const request = is_saved ? notificationsService.save(id) : notificationsService.unsave(id);
      request.then(loadSummary).catch(() => {
        loadNotifications(filters_ref.current);
        loadSummary();
      });
    },
    [notifications, loadNotifications, loadSummary]
  );

  const saveNotification = useCallback((id: string) => setNotificationSaved(id, true), [setNotificationSaved]);
  const unsaveNotification = useCallback((id: string) => setNotificationSaved(id, false), [setNotificationSaved]);

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

  /**
   * Applies one action to several notifications at once (the drawer's
   * multi-select toolbar). The list updates right away, the server confirms
   * in batches of {@link BULK_BATCH_SIZE}, and a failure reloads the list and
   * the count so neither can drift from the server.
   */
  const bulkAction = useCallback(
    (action: NotificationBulkAction, ids: string[]) => {
      const id_set = new Set(ids);
      if (id_set.size === 0) return;

      const affected = notifications.filter((item) => id_set.has(item.id));
      const is_save_action = action === "save" || action === "unsave";
      const unread_delta = is_save_action
        ? 0
        : affected.reduce((delta, item) => {
            if (action === "read" || action === "dismiss") return item.is_unread ? delta - 1 : delta;
            return item.is_unread ? delta : delta + 1;
          }, 0);

      setNotifications((previous) => {
        if (action === "dismiss" || (action === "unsave" && filters_ref.current.tab === "saved")) {
          return previous.filter((item) => !id_set.has(item.id));
        }
        if (is_save_action) return previous.map((item) => (id_set.has(item.id) ? { ...item, is_saved: action === "save" } : item));
        return previous.map((item) => (id_set.has(item.id) ? { ...item, is_unread: action === "unread" } : item));
      });
      setUnreadCount((previous) => Math.max(0, previous + unread_delta));

      const batches: string[][] = [];
      for (let index = 0; index < ids.length; index += BULK_BATCH_SIZE) batches.push(ids.slice(index, index + BULK_BATCH_SIZE));

      batches
        .reduce((chain, batch) => chain.then(() => notificationsService.bulk(action, batch)), Promise.resolve<{ unread_count: number } | null>(null))
        .then((result) => {
          if (result) setUnreadCount(result.unread_count);
          loadSummary();
        })
        .catch(() => {
          loadNotifications(filters_ref.current);
          loadUnreadCount();
        });
    },
    [notifications, loadNotifications, loadUnreadCount, loadSummary]
  );

  useTabBadge(unread_count, user?.tab_badge_enabled ?? true);

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
    saveNotification,
    unsaveNotification,
    bulkAction,
    summary,
    loadSummary,
  };
}
