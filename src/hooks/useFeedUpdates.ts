"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { listenOnPrivateChannel } from "@/lib/echo";
import { feedService } from "@/services/feed.service";
import { mapFeedUpdateDto, type FeedUpdateDto } from "@/types/feed";
import {
  default_feed_filters,
  feed_page_size,
  type FeedAuthorOption,
  type FeedBoardFilter,
  type FeedFilters,
  type FeedUpdate,
  type UpdateFeedTabId,
} from "@/data/update-feed-data";

/** How long after the last card is read the unread counts are refetched, so a burst of reads costs one request. */
const COUNTS_REFRESH_DELAY_MS = 800;

type UseFeedUpdatesOptions = {
  tab: UpdateFeedTabId;
  /** Sidebar board filter id, `"all-boards"` (or unset) means no filter. */
  board_id?: string;
  /** Search, person, kind, date range and unread filters, applied server-side. Keep the object stable between renders, a new one refetches. */
  filters?: FeedFilters;
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

/** Local `YYYY-MM-DD` of an ISO timestamp, the same day the date pickers speak. */
const dayOf = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/**
 * Whether a live `new_feed_update` payload passes the feed's filters, so the
 * live list agrees with what a fresh `GET /api/feed/updates` for the same
 * filters would return.
 */
export function matchesFeedFilters(dto: FeedUpdateDto, filters: FeedFilters): boolean {
  if (filters.author_id && String(dto.actor.id) !== filters.author_id) return false;
  if (filters.kind === "replies" && !dto.is_reply) return false;
  if (filters.kind === "updates" && dto.is_reply) return false;
  if (filters.unread_only && !dto.is_unread) return false;

  const day = dayOf(dto.created_at);
  if (filters.from && day < filters.from) return false;
  if (filters.to && day > filters.to) return false;

  const needle = filters.search.trim().toLowerCase();
  if (!needle) return true;
  const haystack = `${dto.body} ${dto.actor.name}`.toLowerCase();
  return needle.split(/\s+/).every((term) => haystack.includes(term));
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
export function useFeedUpdates({ tab, board_id, filters = default_feed_filters, load_updates = true }: UseFeedUpdatesOptions) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<FeedUpdate[]>([]);
  const [pending_updates, setPendingUpdates] = useState<FeedUpdate[]>([]);
  const [next_cursor, setNextCursor] = useState<string | null>(null);
  const [boards, setBoards] = useState<FeedBoardFilter[]>([]);
  const [authors, setAuthors] = useState<FeedAuthorOption[]>([]);
  const [unread_count, setUnreadCount] = useState(0);
  const [is_loading, setIsLoading] = useState(load_updates);
  const [is_loading_more, setIsLoadingMore] = useState(false);

  // Only the newest list request may write its result, so switching tabs
  // quickly can never leave the previous tab's cards on screen.
  const request_id_ref = useRef(0);
  // Read by the websocket listener, so a fresh page of cards never re-subscribes it.
  const known_ids_ref = useRef(new Set<string>());
  const counts_refresh_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    known_ids_ref.current = new Set([...updates, ...pending_updates].map((update) => update.id));
  }, [updates, pending_updates]);

  const loadUpdates = useCallback(async () => {
    const request_id = ++request_id_ref.current;
    setIsLoading(true);
    setPendingUpdates([]);
    try {
      const page = await feedService.listUpdates(tab, board_id, null, feed_page_size, filters);
      if (request_id !== request_id_ref.current) return;
      setUpdates(page.data.map(mapFeedUpdateDto));
      setNextCursor(page.meta.next_cursor);
    } catch {
      // Leave whatever was already loaded, the drawer simply won't update this cycle.
    } finally {
      if (request_id === request_id_ref.current) setIsLoading(false);
    }
  }, [tab, board_id, filters]);

  const loadMore = useCallback(async () => {
    if (!next_cursor || is_loading || is_loading_more) return;
    const request_id = request_id_ref.current;
    setIsLoadingMore(true);
    try {
      const page = await feedService.listUpdates(tab, board_id, next_cursor, feed_page_size, filters);
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
  }, [tab, board_id, filters, next_cursor, is_loading, is_loading_more]);

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

  const loadAuthors = useCallback(async () => {
    try {
      setAuthors(await feedService.listAuthors());
    } catch {
      // The person filter keeps whatever options it already had.
    }
  }, []);

  useEffect(() => {
    if (user && load_updates) loadUpdates();
  }, [user, load_updates, loadUpdates]);

  // Reads arrive one card at a time, so the counts that depend on them are refetched once things settle.
  const scheduleCountsRefresh = useCallback(() => {
    if (counts_refresh_timeout_ref.current) clearTimeout(counts_refresh_timeout_ref.current);
    counts_refresh_timeout_ref.current = setTimeout(() => {
      loadUnreadCount();
      loadBoards();
    }, COUNTS_REFRESH_DELAY_MS);
  }, [loadUnreadCount, loadBoards]);

  useEffect(
    () => () => {
      if (counts_refresh_timeout_ref.current) clearTimeout(counts_refresh_timeout_ref.current);
    },
    []
  );

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
      if (!matchesFeedFilters(payload, filters)) return;
      if (known_ids_ref.current.has(payload.id)) return;

      const update = mapFeedUpdateDto(payload);
      if (payload.actor.id === user.id) {
        setUpdates((previous) => [update, ...previous]);
      } else {
        setPendingUpdates((previous) => [update, ...previous]);
      }
    });
  }, [user, tab, board_id, filters, load_updates]);

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
      scheduleCountsRefresh();
    },
    [updates, applyUpdate, scheduleCountsRefresh]
  );

  /** "Mark as unread": brings a card the viewer already read back as unread. */
  const markUnread = useCallback(
    async (id: string) => {
      const dto = await feedService.markUnseen(id);
      applyUpdate(dto);
      scheduleCountsRefresh();
    },
    [applyUpdate, scheduleCountsRefresh]
  );

  /** "Mark all as read": marks everything the current tab, board and filters match as seen. */
  const markAllSeen = useCallback(async () => {
    const result = await feedService.markAllSeen(tab, board_id, filters);
    setUpdates((previous) => previous.map((update) => ({ ...update, is_unread: false })));
    setUnreadCount(result.unread_count);
    loadBoards();
  }, [tab, board_id, filters, loadBoards]);

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
    authors,
    loadAuthors,
    unread_count,
    is_loading,
    is_loading_more,
    has_more: next_cursor !== null,
    loadMore,
    bookmarkUpdate,
    likeUpdate,
    pinUpdate,
    markSeen,
    markUnread,
    markAllSeen,
    replyToUpdate,
    scheduleReply,
  };
}
