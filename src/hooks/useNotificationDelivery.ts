"use client";

import { useEffect, useRef } from "react";
import { getToken } from "@/lib/api-client";
import { listenOnPrivateChannel, subscribeToConnectionState } from "@/lib/echo";
import { notificationsService } from "@/services/notifications.service";
import type { NotificationDto } from "@/types/notifications";

/** How often the REST fallback asks for new notifications while the websocket is not connected. */
const POLL_INTERVAL_MS = 15_000;

/** A notification delivered by both channels within this window is only handed to the caller once. */
const DUPLICATE_WINDOW_MS = 30_000;

/** How many recent deliveries are remembered for the duplicate check. */
const MAX_TRACKED_DELIVERIES = 200;

/** Matches the API's page size for `GET /api/notifications/latest`, a full page means more may be waiting. */
const LATEST_PAGE_SIZE = 10;

/**
 * Delivers live notifications to `onNotification` through two channels, so the
 * toast and the bell keep working when one of them is unavailable.
 *
 * 1. The `notifications.{user_id}` Reverb channel, instant, but browsers,
 *    extensions (ad blockers, Brave Shields), proxies and corporate networks
 *    often block the websocket, and it needs the queue worker to be running.
 * 2. A REST fallback (`GET /api/notifications/latest`) that polls only while
 *    the socket is not connected, and does one catch-up request whenever the
 *    socket (re)connects, the tab becomes visible again or the network returns.
 *
 * A notification that arrives through both channels is delivered once.
 */
export function useNotificationDelivery(
  user_id: number | undefined,
  onNotification: (payload: NotificationDto) => void
): void {
  const handler_ref = useRef(onNotification);

  useEffect(() => {
    handler_ref.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    const token = getToken();
    if (user_id === undefined || !token) return;

    let last_seen_id = 0;
    let has_baseline = false;
    let is_polling = false;
    let is_disposed = false;
    let poll_timer: ReturnType<typeof setInterval> | null = null;
    const deliveries = new Map<string, number>();

    /** Records a notification and returns false when the other channel already delivered it. */
    const claimDelivery = (payload: NotificationDto): boolean => {
      last_seen_id = Math.max(last_seen_id, Number(payload.id) || 0);

      const now = Date.now();
      const previous = deliveries.get(payload.id);
      if (previous !== undefined && now - previous < DUPLICATE_WINDOW_MS) return false;

      deliveries.delete(payload.id);
      deliveries.set(payload.id, now);
      if (deliveries.size > MAX_TRACKED_DELIVERIES) {
        const oldest = deliveries.keys().next().value;
        if (oldest !== undefined) deliveries.delete(oldest);
      }
      return true;
    };

    const deliver = (payload: NotificationDto) => {
      if (claimDelivery(payload)) handler_ref.current(payload);
    };

    const poll = async () => {
      if (is_polling || is_disposed) return;
      is_polling = true;
      let has_more = false;

      try {
        // The first request only reads the newest id, so notifications that were
        // already waiting when the page opened stay in the bell instead of toasting.
        if (!has_baseline) {
          const baseline = await notificationsService.getLatest();
          if (is_disposed) return;
          last_seen_id = Math.max(last_seen_id, Number(baseline.meta.latest_id) || 0);
          has_baseline = true;
          return;
        }

        const page = await notificationsService.getLatest(String(last_seen_id));
        if (is_disposed) return;
        page.data.forEach(deliver);

        // A full page means more may be waiting, fetch the rest right away.
        has_more = page.data.length >= LATEST_PAGE_SIZE;
      } catch {
        // A failed request is simply retried on the next tick or catch-up trigger.
      } finally {
        is_polling = false;
      }

      if (has_more && !is_disposed) void poll();
    };

    const startPolling = () => {
      if (poll_timer === null) poll_timer = setInterval(poll, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (poll_timer !== null) clearInterval(poll_timer);
      poll_timer = null;
    };

    const stopListening = listenOnPrivateChannel<NotificationDto>(
      token,
      `notifications.${user_id}`,
      ".new_notification",
      deliver
    );

    const stopWatchingConnection = subscribeToConnectionState(token, (state) => {
      if (state === "connected") {
        stopPolling();
        void poll();
      } else {
        startPolling();
      }
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const onOnline = () => void poll();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    void poll();

    return () => {
      is_disposed = true;
      stopPolling();
      stopWatchingConnection();
      stopListening();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [user_id]);
}
