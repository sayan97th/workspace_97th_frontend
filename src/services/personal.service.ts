import { apiClient } from "@/lib/api-client";
import type { FavoritesResponseDto, MyWorkResponseDto, RecentBoardDto } from "@/types/personal";

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
  async getFavorites(): Promise<FavoritesResponseDto> {
    const response = await apiClient.get<Partial<FavoritesResponseDto>>("/api/favorites");
    return { data: response.data ?? [], workspaces: response.workspaces ?? [] };
  },

  /** Stars or unstars a whole workspace, by its slug. */
  async setWorkspaceFavorite(workspace_slug: string, is_favorite: boolean): Promise<void> {
    if (is_favorite) {
      await apiClient.put(`/api/favorites/workspaces/${workspace_slug}`);
    } else {
      await apiClient.delete(`/api/favorites/workspaces/${workspace_slug}`);
    }
    notifyFavoritesChanged();
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
