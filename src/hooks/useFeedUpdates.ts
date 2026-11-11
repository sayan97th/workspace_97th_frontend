"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { listenOnPrivateChannel } from "@/lib/echo";
import { feedService } from "@/services/feed.service";
import { mapFeedReactionsDto, mapFeedUpdateDto, type FeedFollowsDto, type FeedUpdateDto } from "@/types/feed";
import { flipLike } from "@/components/board/drawer/likeToggle";
import { bumpReaction } from "@/components/board/drawer/reactionToggle";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import { getUserInitials } from "@/lib/user";
import {
  appendReply,
  collectFeedIds,
  countThreadUnread,
  isThreadUnread,
  mergeThread,
  patchFeedEntry,
  replaceFeedEntry,
} from "./feedThreads";
import {
  default_feed_filters,
  feed_page_size,
  type FeedAuthorOption,
  type FeedBoardFilter,
  type FeedFilters,
  type FeedHiddenBoard,
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
  if (tab === "following") return dto.is_following_item || dto.is_following_board;
  if (tab === "pinned") return dto.pinned;
  // A reply to the viewer's own update reaches them too, as the server's "all" reach says.
  return dto.is_mentioned || dto.is_bookmarked || dto.actor.id === viewer_id || dto.thread?.actor.id === viewer_id;
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
 * seen, follow and unfollow a board or item).
 *
 * The feed is a list of threads, as in monday.com's inbox: one card per
 * top-level update with its replies inline under it. A reply, the viewer's
 * own included, joins its thread's card instead of becoming a card of its
 * own. Like, React and the other actions take either a card id or a reply id.
 * New threads other people start while the feed is open are held back in
 * `pending_updates` (the "N new updates" banner) instead of shoving the cards
 * the viewer is reading around, a new reply to a thread already on screen
 * shows up inside it in place. Mirrors `useNotifications`.
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
  const [follows, setFollows] = useState<FeedFollowsDto | null>(null);
  const [hidden_boards, setHiddenBoards] = useState<FeedHiddenBoard[]>([]);

  // Only the newest list request may write its result, so switching tabs
  // quickly can never leave the previous tab's cards on screen.
  const request_id_ref = useRef(0);
  // Read by the websocket listener, so a fresh page of cards never re-subscribes it.
  const known_ids_ref = useRef(new Set<string>());
  const counts_refresh_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    known_ids_ref.current = collectFeedIds([...updates, ...pending_updates]);
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

  const loadFollows = useCallback(async () => {
    try {
      setFollows(await feedService.listFollows());
    } catch {
      // The Following header keeps whatever it already had.
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
      if (known_ids_ref.current.has(payload.id)) return;

      // A reply arrives with its whole thread, the card it belongs in.
      const card = mapFeedUpdateDto(payload.thread ?? payload);

      // The thread is already on screen (or waiting behind the banner): the reply shows up inside it, in place.
      if (known_ids_ref.current.has(card.id)) {
        const refresh = (cards: FeedUpdate[]) => cards.map((current) => (current.id === card.id ? mergeThread(current, card) : current));
        setUpdates(refresh);
        setPendingUpdates(refresh);
        return;
      }

      if (!matchesActiveTab(payload, tab, user.id)) return;
      if (!matchesFeedFilters(payload, filters)) return;

      if (payload.actor.id === user.id) {
        setUpdates((previous) => [card, ...previous]);
      } else {
        setPendingUpdates((previous) => [card, ...previous.filter((pending) => pending.id !== card.id)]);
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

  /**
   * Swaps a card, or one reply inside its card, for the server's copy after
   * an action. The action endpoints do not send the item changes timeline, so
   * the one already on the card is kept instead of disappearing.
   */
  const applyUpdate = useCallback((dto: FeedUpdateDto) => {
    const mapped = mapFeedUpdateDto(dto);
    setUpdates((previous) => replaceFeedEntry(previous, mapped));
  }, []);

  /** Changes one card or one reply in place, used by the optimistic Like and React toggles. */
  const patchUpdate = useCallback((id: string, transform: (update: FeedUpdate) => FeedUpdate) => {
    setUpdates((previous) => patchFeedEntry(previous, id, transform));
  }, []);

  /** Only the like and reaction fields of a server response, so a slower reply never undoes other changes to the card. */
  const applyServerReactions = useCallback(
    (dto: FeedUpdateDto) => patchUpdate(dto.id, (update) => ({ ...update, ...mapFeedReactionsDto(dto) })),
    [patchUpdate]
  );

  const bookmarkUpdate = useCallback(
    async (id: string) => {
      const dto = await feedService.toggleBookmark(id);
      applyUpdate(dto);
    },
    [applyUpdate]
  );

  /**
   * Follows or unfollows a board or an item, which fills the Following tab.
   * Every card on that board or item flips at once, and on the Following tab
   * the cards that stop matching leave the list. A failed request restores
   * the previous flags.
   */
  const setFollowing = useCallback(
    async (type: "board" | "item", id: number, following: boolean) => {
      const key = String(id);
      const flag = type === "item" ? "is_following_item" : "is_following_board";
      const matches = (update: FeedUpdate) => (type === "item" ? update.item_id === key : update.board_id === key);
      const previous = updates;

      setUpdates((current) => {
        const flipped = current.map((update) => (matches(update) ? { ...update, [flag]: following } : update));
        return tab === "following" ? flipped.filter((update) => update.is_following_item || update.is_following_board) : flipped;
      });

      try {
        await (following ? feedService.follow(type, id) : feedService.unfollow(type, id));
        loadFollows();
      } catch {
        setUpdates(previous);
      }
    },
    [updates, tab, loadFollows]
  );

  /** The viewer as the Like card and the reactions summary show them. */
  const current_person = useMemo<BoardPersonOption | null>(
    () =>
      user
        ? {
            id: String(user.id),
            name: user.full_name,
            initials: getUserInitials(user),
            avatar_seed: user.id,
            avatar_url: user.profile_photo_url ?? undefined,
          }
        : null,
    [user]
  );

  /**
   * Likes or unlikes a card. The count, the blue thumb and the "who liked"
   * list change at once, then the server's answer replaces them. A failed
   * request flips the like back and rethrows so the panel can say so.
   */
  const likeUpdate = useCallback(
    async (id: string) => {
      if (!current_person) return;
      const flip = (update: FeedUpdate) => flipLike(update, current_person);
      patchUpdate(id, flip);
      try {
        applyServerReactions(await feedService.toggleLike(id));
      } catch (error) {
        patchUpdate(id, flip);
        throw error;
      }
    },
    [current_person, patchUpdate, applyServerReactions]
  );

  /**
   * Adds the viewer's emoji reaction to a card, or removes it when they
   * already reacted with it. Optimistic like {@link likeUpdate}, rolled back
   * and rethrown when the request fails.
   */
  const reactToUpdate = useCallback(
    async (id: string, emoji: string) => {
      const bump = (update: FeedUpdate) => ({ ...update, reactions: bumpReaction(update.reactions, emoji) });
      patchUpdate(id, bump);
      try {
        applyServerReactions(await feedService.toggleReaction(id, emoji));
      } catch (error) {
        patchUpdate(id, bump);
        throw error;
      }
    },
    [patchUpdate, applyServerReactions]
  );

  const pinUpdate = useCallback(
    async (id: string) => {
      const dto = await feedService.togglePin(id);
      applyUpdate(dto);
    },
    [applyUpdate]
  );

  /** Reading a card reads the whole thread: the update and every reply in it are marked seen at once. */
  const markSeen = useCallback(
    async (id: string) => {
      const target = updates.find((update) => update.id === id);
      if (!target || !isThreadUnread(target)) return;

      const dto = await feedService.markSeen(id, true);
      applyUpdate(dto);
      setUnreadCount((previous) => Math.max(0, previous - countThreadUnread(target)));
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
    setUpdates((previous) =>
      filters.unread_only
        ? []
        : previous.map((update) => ({
            ...update,
            is_unread: false,
            replies: update.replies.map((reply) => ({ ...reply, is_unread: false })),
          }))
    );
    setUnreadCount(result.unread_count);
    loadBoards();
  }, [tab, board_id, filters, loadBoards]);

  /**
   * Puts a card back where it was, used by every "Undo": a card that left the
   * list returns at its old position, one that is still there is swapped for
   * the earlier copy.
   */
  const putCardBack = useCallback((card: FeedUpdate, index: number) => {
    setUpdates((previous) => {
      if (previous.some((update) => update.id === card.id)) {
        return previous.map((update) => (update.id === card.id ? card : update));
      }
      const next = [...previous];
      next.splice(Math.min(index, next.length), 0, card);
      return next;
    });
  }, []);

  /**
   * The inbox's blue check: reads the whole thread. While the inbox shows
   * unread updates only, the card leaves the list at once, as in monday.com.
   * Resolves to an undo that brings the card back unread, or null when there
   * was nothing to read.
   */
  const markThreadRead = useCallback(
    async (id: string): Promise<(() => Promise<void>) | null> => {
      const index = updates.findIndex((update) => update.id === id);
      const target = updates[index];
      if (!target || !isThreadUnread(target)) return null;

      const unread_in_thread = countThreadUnread(target);
      const read = (update: FeedUpdate): FeedUpdate => ({
        ...update,
        is_unread: false,
        replies: update.replies.map((reply) => ({ ...reply, is_unread: false })),
      });

      setUpdates((previous) =>
        filters.unread_only ? previous.filter((update) => update.id !== id) : previous.map((update) => (update.id === id ? read(update) : update))
      );
      setUnreadCount((previous) => Math.max(0, previous - unread_in_thread));

      try {
        await feedService.markSeen(id, true);
      } catch (error) {
        putCardBack(target, index);
        setUnreadCount((previous) => previous + unread_in_thread);
        throw error;
      }
      scheduleCountsRefresh();

      return async () => {
        putCardBack(target, index);
        await feedService.markUnseen(id, true);
        setUnreadCount((previous) => previous + unread_in_thread);
        scheduleCountsRefresh();
      };
    },
    [updates, filters.unread_only, putCardBack, scheduleCountsRefresh]
  );

  /** The check on a card already read: brings the whole thread back as unread. */
  const markThreadUnread = useCallback(
    async (id: string) => {
      const dto = await feedService.markUnseen(id, true);
      applyUpdate(dto);
      scheduleCountsRefresh();
    },
    [applyUpdate, scheduleCountsRefresh]
  );

  /** The board row's "Close All": reads every update the open tab shows for that board. */
  const markBoardRead = useCallback(
    async (target_board_id: string) => {
      const result = await feedService.markAllSeen(tab, target_board_id, filters);
      const on_board = (update: FeedUpdate) => target_board_id === "all-boards" || update.board_id === target_board_id;
      setUpdates((previous) =>
        filters.unread_only
          ? previous.filter((update) => !on_board(update))
          : previous.map((update) =>
              on_board(update)
                ? { ...update, is_unread: false, replies: update.replies.map((reply) => ({ ...reply, is_unread: false })) }
                : update
            )
      );
      setUnreadCount(result.unread_count);
      loadBoards();
      return result.marked_count;
    },
    [tab, filters, loadBoards]
  );

  const loadHiddenBoards = useCallback(async () => {
    try {
      setHiddenBoards(await feedService.listHiddenBoards());
    } catch {
      // Feed settings keeps whatever it already listed.
    }
  }, []);

  /** "Hide board updates from inbox": the board's cards and its row leave the inbox. */
  const hideBoard = useCallback(
    async (target_board_id: string) => {
      const hidden = await feedService.hideBoard(target_board_id);
      setHiddenBoards((previous) => [hidden, ...previous.filter((board) => board.id !== hidden.id)]);
      setBoards((previous) => previous.filter((board) => board.id !== target_board_id));
      if (tab !== "bookmarked") setUpdates((previous) => previous.filter((update) => update.board_id !== target_board_id));
      loadBoards();
      loadUnreadCount();
    },
    [tab, loadBoards, loadUnreadCount]
  );

  /** Feed settings' "Show in inbox": brings a hidden board's updates back. */
  const showBoard = useCallback(
    async (target_board_id: string) => {
      await feedService.showBoard(target_board_id);
      setHiddenBoards((previous) => previous.filter((board) => board.id !== target_board_id));
      loadBoards();
      loadUnreadCount();
      loadUpdates();
    },
    [loadBoards, loadUnreadCount, loadUpdates]
  );

  /** "Edit update": saves the new body, the card shows it with its "Edited" mark. */
  const editUpdate = useCallback(
    async (id: string, body: string) => {
      applyUpdate(await feedService.editUpdate(id, body));
    },
    [applyUpdate]
  );

  /**
   * "Delete update for everyone": the update (with its replies) or the single
   * reply leaves the inbox at once. Resolves to an undo that restores it on
   * the server and puts the card back as it was.
   */
  const deleteUpdate = useCallback(
    async (id: string): Promise<() => Promise<void>> => {
      const index = updates.findIndex((update) => update.id === id || update.replies.some((reply) => reply.id === id));
      const card = updates[index];
      const remove = (previous: FeedUpdate[]) =>
        card?.id === id
          ? previous.filter((update) => update.id !== id)
          : previous.map((update) => (update.id === card?.id ? { ...update, replies: update.replies.filter((reply) => reply.id !== id) } : update));

      setUpdates(remove);
      try {
        await feedService.deleteUpdate(id);
      } catch (error) {
        if (card) putCardBack(card, index);
        throw error;
      }

      return async () => {
        await feedService.restoreUpdate(id);
        if (card) putCardBack(card, index);
      };
    },
    [updates, putCardBack]
  );

  /** Posts a reply, which shows up at the end of its thread's card, never as a card of its own. */
  const replyToUpdate = useCallback(
    async (id: string, body: string, mentioned_user_ids: number[] = []) => {
      const dto = await feedService.reply(id, body, mentioned_user_ids);
      setUpdates((previous) => appendReply(previous, mapFeedUpdateDto(dto)));
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
    reactToUpdate,
    pinUpdate,
    follows,
    loadFollows,
    setFollowing,
    markSeen,
    markUnread,
    markAllSeen,
    markThreadRead,
    markThreadUnread,
    markBoardRead,
    hidden_boards,
    loadHiddenBoards,
    hideBoard,
    showBoard,
    editUpdate,
    deleteUpdate,
    replyToUpdate,
    scheduleReply,
  };
}
