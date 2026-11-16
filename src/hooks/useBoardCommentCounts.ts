"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { listenOnPrivateChannel, subscribeToConnectionState } from "@/lib/echo";
import { subscribeToItemCommentSummaries } from "@/lib/item-comment-counts";
import { boardCommentsService } from "@/services/board-comments.service";
import type {
  BoardCommentCountsSnapshot,
  BoardItemCommentsChangedEvent,
  CommentCountResolver,
  ItemCommentSummary,
} from "@/types/board-comment-counts";

/** How often the counters are read again while the websocket is down (blocked, offline, Reverb stopped). */
const FALLBACK_POLL_MS = 30_000;

/** A tab hidden at least this long reads the counters again when it comes back, a sleeping laptop can miss socket events. */
const HIDDEN_RESYNC_AFTER_MS = 30_000;

/** Summaries that land this close together are applied as one state update. */
const BATCH_WINDOW_MS = 50;

/**
 * Keeps every row's updates counter (the chat bubble next to the item name) live on an open board,
 * so a new update shows without a page refresh. Three sources, all carrying the absolute count:
 * - the `item_comments` of the viewer's own post, delete and restore responses (`lib/item-comment-counts.ts`),
 * - the `board_item_comments_changed` event on the private `board-comments.{board_id}` channel, for
 *   everyone else, scheduled updates going live and automations posting updates,
 * - `GET items/comment-counts`, read when the socket reconnects, when the browser comes back
 *   online or after a long hidden tab, and every {@link FALLBACK_POLL_MS} while the socket is down.
 *
 * Each source is stamped with the server time it was read at, so whichever arrives last, the newest
 * count wins. `onCounts` receives a resolver to run over the board's rows.
 */
export function useBoardCommentCounts(board_id: number, onCounts: (resolve: CommentCountResolver) => void): void {
  const { user } = useAuth();
  const user_id = user?.id ?? null;
  const on_counts_ref = useRef(onCounts);

  useEffect(() => {
    on_counts_ref.current = onCounts;
  });

  useEffect(() => {
    const token = getToken();
    if (!board_id || user_id === null || !token) return;

    let is_disposed = false;
    /** Server time of the last summary applied to each item. */
    const item_stamps = new Map<number, number>();
    /** Server time of the last snapshot, every item was known at least that fresh. */
    let snapshot_stamp = 0;
    let pending = new Map<number, ItemCommentSummary>();
    let flush_timer: ReturnType<typeof setTimeout> | null = null;
    let poll_timer: ReturnType<typeof setInterval> | null = null;
    let is_resyncing = false;
    let was_connected = false;
    let hidden_at: number | null = null;

    const stampOf = (item_id: number) => Math.max(item_stamps.get(item_id) ?? 0, snapshot_stamp);

    const flush = () => {
      flush_timer = null;
      if (pending.size === 0) return;
      const batch = pending;
      pending = new Map();
      on_counts_ref.current((item_id) => {
        const summary = batch.get(item_id);
        return summary
          ? { comment_count: summary.comment_count, has_viewer_mention: summary.mentioned_user_ids.includes(user_id) }
          : null;
      });
    };

    const queueSummary = (summary: ItemCommentSummary) => {
      if (is_disposed || summary.changed_at < stampOf(summary.item_id)) return;
      item_stamps.set(summary.item_id, summary.changed_at);
      pending.set(summary.item_id, summary);
      if (!flush_timer) flush_timer = setTimeout(flush, BATCH_WINDOW_MS);
    };

    const applySnapshot = (snapshot: BoardCommentCountsSnapshot) => {
      if (is_disposed || snapshot.changed_at < snapshot_stamp) return;
      snapshot_stamp = snapshot.changed_at;
      const mentioned = new Set(snapshot.mentioned_item_ids);
      // Read once here, the resolver may run more than once (React strict mode) and must stay pure.
      const newer_item_ids = new Set(
        Array.from(item_stamps.entries())
          .filter(([, stamp]) => stamp > snapshot.changed_at)
          .map(([item_id]) => item_id)
      );
      on_counts_ref.current((item_id) =>
        newer_item_ids.has(item_id)
          ? null
          : { comment_count: snapshot.counts[String(item_id)] ?? 0, has_viewer_mention: mentioned.has(item_id) }
      );
    };

    const resync = async () => {
      if (is_resyncing || is_disposed) return;
      is_resyncing = true;
      try {
        applySnapshot(await boardCommentsService.getCommentCounts(board_id));
      } catch {
        // Retried on the next poll tick or catch up trigger.
      } finally {
        is_resyncing = false;
      }
    };

    const stopPolling = () => {
      if (poll_timer !== null) clearInterval(poll_timer);
      poll_timer = null;
    };

    const stop_responses = subscribeToItemCommentSummaries((summary_board_id, summary) => {
      if (summary_board_id === board_id) queueSummary(summary);
    });

    const stop_socket = listenOnPrivateChannel<BoardItemCommentsChangedEvent>(
      token,
      `board-comments.${board_id}`,
      ".board_item_comments_changed",
      (event) => {
        if (event.board_id === board_id) queueSummary(event);
      }
    );

    const stop_connection = subscribeToConnectionState(token, (state) => {
      if (state === "connected") {
        stopPolling();
        // Only a reconnect can have missed events, the first connect follows the items load.
        if (was_connected) void resync();
        was_connected = true;
        return;
      }
      if (poll_timer === null) poll_timer = setInterval(() => void resync(), FALLBACK_POLL_MS);
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hidden_at = Date.now();
        return;
      }
      if (hidden_at !== null && Date.now() - hidden_at >= HIDDEN_RESYNC_AFTER_MS) void resync();
      hidden_at = null;
    };
    const onOnline = () => void resync();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      is_disposed = true;
      stop_responses();
      stop_socket();
      stop_connection();
      stopPolling();
      if (flush_timer) clearTimeout(flush_timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
    };
  }, [board_id, user_id]);
}
