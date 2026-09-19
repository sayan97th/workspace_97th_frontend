"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { listenOnPrivateChannel } from "@/lib/echo";
import { feedService } from "@/services/feed.service";
import { mapFeedUpdateDto, type FeedUpdateDto } from "@/types/feed";
import { feed_page_size, type FeedBoardFilter, type FeedUpdate, type UpdateFeedTabId } from "@/data/update-feed-data";

type UseFeedUpdatesOptions = {
  tab: UpdateFeedTabId;
  /** Sidebar board filter id, `"all-boards"` (or unset) means no filter. */
  board_id?: string;
  /** False for a caller that only wants the unread badge (the top bar), so it never fetches the list itself. Defaults to true. */
  load_updates?: boolean;
};

/** Whether a live `new_feed_update` payload belongs on the currently active tab. */
function matchesActiveTab(dto: FeedUpdateDto, tab: UpdateFeedTabId, viewer_id: number | undefined): boolean {
  if (tab === "scheduled") return false;
  if (tab === "mentioned") return dto.is_mentioned;
  if (tab === "bookmarked") return dto.is_bookmarked;
  if (tab === "account") return true;
  return dto.is_mentioned || dto.is_bookmarked || dto.actor.id === viewer_id;
}

/**
 * Fetches the current user's Update Feed for the given tab/board filter, one
 * cursor page at a time, keeps it live via the `feed.{user_id}` Reverb
 * channel, and exposes the card actions (bookmark, like, reply, schedule, mark
 * seen). Updates other people post while the feed is open are held back in
 * `pending_updates` (the "N new updates" banner) instead of shoving the cards
 * the viewer is reading around, the viewer's own posts show up straight away.
 * Mirrors `useNotifications`.
 */
export function useFeedUpdates({ tab, board_id, load_updates = true }: UseFeedUpdatesOptions) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<FeedUpdate[]>([]);
  const [pending_updates, setPendingUpdates] = useState<FeedUpdate[]>([]);
  const [next_cursor, setNextCursor] = useState<string | null>(null);
  const [boards, setBoards] = useState<FeedBoardFilter[]>([]);
  const [unread_count, setUnreadCount] = useState(0);
  const [is_loading, setIsLoading] = useState(load_updates);
  const [is_loading_more, setIsLoadingMore] = useState(false);

  // Only the newest list request may write its result, so switching tabs
  // quickly can never leave the previous tab's cards on screen.
  const request_id_ref = useRef(0);
  // Read by the websocket listener, so a fresh page of cards never re-subscribes it.
  const known_ids_ref = useRef(new Set<string>());

  useEffect(() => {
    known_ids_ref.current = new Set([...updates, ...pending_updates].map((update) => update.id));
  }, [updates, pending_updates]);

  const loadUpdates = useCallback(async () => {
    const request_id = ++request_id_ref.current;
    setIsLoading(true);
    setPendingUpdates([]);
    try {
      const page = await feedService.listUpdates(tab, board_id, null, feed_page_size);
      if (request_id !== request_id_ref.current) return;
      setUpdates(page.data.map(mapFeedUpdateDto));
      setNextCursor(page.meta.next_cursor);
    } catch {
      // Leave whatever was already loaded, the drawer simply won't update this cycle.
    } finally {
      if (request_id === request_id_ref.current) setIsLoading(false);
    }
  }, [tab, board_id]);

  const loadMore = useCallback(async () => {
    if (!next_cursor || is_loading || is_loading_more) return;
    const request_id = request_id_ref.current;
    setIsLoadingMore(true);
    try {
      const page = await feedService.listUpdates(tab, board_id, next_cursor, feed_page_size);
      if (request_id !== request_id_ref.current) return;
      setUpdates((previous) => {
        const known_ids = new Set(previous.map((update) => update.id));
        return [...previous, ...page.data.map(mapFeedUpdateDto).filter((update) => !known_ids.has(update.id))];
      });
      setNextCursor(page.meta.next_cursor);
    } catch {
      // The sentinel fires again on the next scroll, so a failed page is retried.
    } finally {
      setIsLoadingMore(false);
    }
  }, [tab, board_id, next_cursor, is_loading, is_loading_more]);

  const loadBoards = useCallback(async () => {
    try {
      setBoards(await feedService.listBoards());
    } catch {
      // Sidebar keeps whatever it already had.
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await feedService.getUnreadCount());
    } catch {
      // Badge keeps its last known value.
    }
  }, []);

  useEffect(() => {
    if (user && load_updates) loadUpdates();
  }, [user, load_updates, loadUpdates]);

  useEffect(() => {
    if (user) {
      loadBoards();
      loadUnreadCount();
    }
  }, [user, loadBoards, loadUnreadCount]);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    return listenOnPrivateChannel<FeedUpdateDto>(token, `feed.${user.id}`, ".new_feed_update", (payload) => {
      if (payload.is_unread) setUnreadCount((previous) => previous + 1);

      if (!load_updates) return;
      if (board_id && board_id !== "all-boards" && String(payload.board.id) !== board_id) return;
      if (!matchesActiveTab(payload, tab, user.id)) return;
      if (known_ids_ref.current.has(payload.id)) return;

      const update = mapFeedUpdateDto(payload);
      if (payload.actor.id === user.id) {
        setUpdates((previous) => [update, ...previous]);
      } else {
        setPendingUpdates((previous) => [update, ...previous]);
      }
    });
  }, [user, tab, board_id, load_updates]);

  /** Folds the held-back updates into the top of the list, newest first (the "N new updates" banner). */
  const showPendingUpdates = useCallback(() => {
    setUpdates((previous) => {
      const known_ids = new Set(previous.map((update) => update.id));
      return [...pending_updates.filter((update) => !known_ids.has(update.id)), ...previous];
    });
    setPendingUpdates([]);
  }, [pending_updates]);

  const applyUpdate = useCallback((dto: FeedUpdateDto) => {
    const mapped = mapFeedUpdateDto(dto);
    setUpdates((previous) => previous.map((update) => (update.id === mapped.id ? mapped : update)));
  }, []);

  const bookmarkUpdate = useCallback(
    async (id: string) => {
      const dto = await feedService.toggleBookmark(id);
      applyUpdate(dto);
    },
    [applyUpdate]
  );

  const likeUpdate = useCallback(
    async (id: string) => {
      const dto = await feedService.toggleLike(id);
      applyUpdate(dto);
    },
    [applyUpdate]
  );

  const pinUpdate = useCallback(
    async (id: string) => {
      const dto = await feedService.togglePin(id);
      applyUpdate(dto);
    },
    [applyUpdate]
  );

  const markSeen = useCallback(
    async (id: string) => {
      const target = updates.find((update) => update.id === id);
      if (!target?.is_unread) return;

      const dto = await feedService.markSeen(id);
      applyUpdate(dto);
      setUnreadCount((previous) => Math.max(0, previous - 1));
    },
    [updates, applyUpdate]
  );

  const replyToUpdate = useCallback(
    async (id: string, body: string, mentioned_user_ids: number[] = []) => {
      await feedService.reply(id, body, mentioned_user_ids);
    },
    []
  );

  const scheduleReply = useCallback(
    async (id: string, body: string, scheduled_at: string, mentioned_user_ids: number[] = []) => {
      await feedService.schedule(id, body, scheduled_at, mentioned_user_ids);
    },
    []
  );

  // Stable sort (pinned first): a page from the backend already comes pinned-first,
  // this keeps that order intact after a live update or pending batch is folded in.
  const sorted_updates = [...updates].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return {
    updates: sorted_updates,
    pending_count: pending_updates.length,
    showPendingUpdates,
    boards,
    unread_count,
    is_loading,
    is_loading_more,
    has_more: next_cursor !== null,
    loadMore,
    bookmarkUpdate,
    likeUpdate,
    pinUpdate,
    markSeen,
    replyToUpdate,
    scheduleReply,
  };
}
