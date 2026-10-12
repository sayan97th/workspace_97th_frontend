import { useCallback, useEffect, useState } from "react";
import { notificationsService } from "@/services/notifications.service";
import { default_notification_filters } from "@/data/notifications-data";
import { FAVORITES_CHANGED_EVENT, personalService } from "@/services/personal.service";
import type { NotificationDto } from "@/types/notifications";
import type { FavoriteItemDto, MyWorkItemDto, RecentBoardDto } from "@/types/personal";

/** How many unread notifications the Inbox card lists. */
const INBOX_LIMIT = 5;

/** Every list starts as null while loading, a failed request settles to an empty list. */
export type HomeData = {
  recent_boards: RecentBoardDto[] | null;
  my_work: MyWorkItemDto[] | null;
  notifications: NotificationDto[] | null;
  /** Every unread notification, the inbox list only loads the newest few. */
  unread_count: number | null;
  favorites: FavoriteItemDto[] | null;
  toggleBoardFavorite: (board: RecentBoardDto) => Promise<void>;
};

/**
 * Loads the Home lists in parallel, each section renders as soon as its
 * own request lands. Favorites refresh when they change anywhere else in the app.
 */
export const useHomeData = (): HomeData => {
  const [recent_boards, setRecentBoards] = useState<RecentBoardDto[] | null>(null);
  const [my_work, setMyWork] = useState<MyWorkItemDto[] | null>(null);
  const [notifications, setNotifications] = useState<NotificationDto[] | null>(null);
  const [unread_count, setUnreadCount] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItemDto[] | null>(null);

  const loadFavorites = useCallback(
    () =>
      personalService
        .getFavorites()
        .then((result) => setFavorites(result.data))
        .catch(() => setFavorites([])),
    []
  );

  useEffect(() => {
    let is_cancelled = false;
    personalService
      .getRecentBoards()
      .then((boards) => !is_cancelled && setRecentBoards(boards))
      .catch(() => !is_cancelled && setRecentBoards([]));
    personalService
      .getMyWork()
      .then((result) => !is_cancelled && setMyWork(result.items))
      .catch(() => !is_cancelled && setMyWork([]));
    notificationsService
      .listNotifications({ filters: { ...default_notification_filters, unread_only: true }, limit: INBOX_LIMIT })
      .then((page) => !is_cancelled && setNotifications(page.data))
      .catch(() => !is_cancelled && setNotifications([]));
    notificationsService
      .getUnreadCount()
      .then((count) => !is_cancelled && setUnreadCount(count))
      .catch(() => !is_cancelled && setUnreadCount(0));
    return () => {
      is_cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadFavorites();
    window.addEventListener(FAVORITES_CHANGED_EVENT, loadFavorites);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, loadFavorites);
  }, [loadFavorites]);

  const setBoardFavorite = (board_id: number, is_favorite: boolean) =>
    setRecentBoards((current) => current?.map((board) => (board.id === board_id ? { ...board, is_favorite } : board)) ?? null);

  const toggleBoardFavorite = async (board: RecentBoardDto) => {
    const next_value = !board.is_favorite;
    setBoardFavorite(board.id, next_value);
    try {
      await personalService.setFavorite(board.id, next_value);
    } catch {
      setBoardFavorite(board.id, !next_value);
    }
  };

  return { recent_boards, my_work, notifications, unread_count, favorites, toggleBoardFavorite };
};
