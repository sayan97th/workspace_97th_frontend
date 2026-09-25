import { apiClient } from "@/lib/api-client";
import type { FavoriteItemDto, MyWorkResponseDto, RecentBoardDto } from "@/types/personal";

/**
 * Window event fired whenever a favorite is added or removed anywhere in the
 * app (the nav tree menu, the board header star, the Home page), so every
 * Favorites list can refresh itself without sharing state.
 */
export const FAVORITES_CHANGED_EVENT = "favorites:changed";

export const notifyFavoritesChanged = (): void => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
};

/** The signed in user's own navigation: Favorites, My Work and recently visited boards. */
export const personalService = {
  async getFavorites(): Promise<FavoriteItemDto[]> {
    const response = await apiClient.get<{ data: FavoriteItemDto[] }>("/api/favorites");
    return response.data;
  },

  async setFavorite(item_id: number, is_favorite: boolean): Promise<void> {
    if (is_favorite) {
      await apiClient.put(`/api/favorites/${item_id}`);
    } else {
      await apiClient.delete(`/api/favorites/${item_id}`);
    }
    notifyFavoritesChanged();
  },

  async reorderFavorites(item_ids: number[]): Promise<void> {
    await apiClient.put("/api/favorites/order", { item_ids });
  },

  async getRecentBoards(): Promise<RecentBoardDto[]> {
    const response = await apiClient.get<{ data: RecentBoardDto[] }>("/api/home/recent-boards");
    return response.data;
  },

  async getMyWork(): Promise<MyWorkResponseDto> {
    return apiClient.get<MyWorkResponseDto>("/api/my-work");
  },
};
