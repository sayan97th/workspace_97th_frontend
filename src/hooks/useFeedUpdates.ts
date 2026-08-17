"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { getEcho } from "@/lib/echo";
import { feedService } from "@/services/feed.service";
import { mapFeedUpdateDto, type FeedUpdateDto } from "@/types/feed";
import type { FeedBoardFilter, FeedUpdate, UpdateFeedTabId } from "@/data/update-feed-data";

type UseFeedUpdatesOptions = {
  tab: UpdateFeedTabId;
  /** Sidebar board filter id — `"all-boards"` (or unset) means no filter. */
  board_id?: string;
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
 * Fetches the current user's Update Feed for the given tab/board filter,
 * keeps it live via the `feed.{user_id}` Reverb channel, and exposes the
 * card actions (bookmark, like, reply, schedule, mark seen). Mirrors
 * `useNotifications`.
 */
export function useFeedUpdates({ tab, board_id }: UseFeedUpdatesOptions) {
  const { user } = useAuth();
  const [updates, setUpdates] = useState<FeedUpdate[]>([]);
  const [boards, setBoards] = useState<FeedBoardFilter[]>([]);
  const [unread_count, setUnreadCount] = useState(0);
  const [is_loading, setIsLoading] = useState(true);

  const loadUpdates = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await feedService.listUpdates(tab, board_id);
      setUpdates(list.map(mapFeedUpdateDto));
    } catch {
      // Leave whatever was already loaded, the drawer simply won't update this cycle.
    } finally {
      setIsLoading(false);
    }
  }, [tab, board_id]);

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
    if (user) loadUpdates();
  }, [user, loadUpdates]);

  useEffect(() => {
    if (user) {
      loadBoards();
      loadUnreadCount();
    }
  }, [user, loadBoards, loadUnreadCount]);

  useEffect(() => {
    const token = getToken();
    if (!user || !token) return;

    const echo = getEcho(token);
    const channel_name = `feed.${user.id}`;
    const channel = echo
      .private(channel_name)
      .listen(".new_feed_update", (payload: FeedUpdateDto) => {
        if (payload.is_unread) setUnreadCount((previous) => previous + 1);

        if (board_id && board_id !== "all-boards" && String(payload.board.id) !== board_id) return;
        if (!matchesActiveTab(payload, tab, user.id)) return;

        setUpdates((previous) => {
          if (previous.some((update) => update.id === payload.id)) return previous;
          return [mapFeedUpdateDto(payload), ...previous];
        });
      });

    return () => {
      channel.stopListening(".new_feed_update");
      echo.leave(channel_name);
    };
  }, [user, tab, board_id]);

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

  return {
    updates,
    boards,
    unread_count,
    is_loading,
    bookmarkUpdate,
    likeUpdate,
    markSeen,
    replyToUpdate,
    scheduleReply,
  };
}
