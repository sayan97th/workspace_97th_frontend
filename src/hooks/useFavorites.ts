"use client";
import { useCallback, useEffect, useState } from "react";
import { FAVORITES_CHANGED_EVENT, personalService } from "@/services/personal.service";
import type { FavoriteItemDto } from "@/types/personal";

export type UseFavoritesResult = {
  favorites: FavoriteItemDto[];
  is_loading: boolean;
  removeFavorite: (item_id: number) => Promise<void>;
  /** Moves a favorite to a new position and saves the whole order. */
  moveFavorite: (item_id: number, to_index: number) => Promise<void>;
};

/**
 * The signed in user's Favorites. Refreshes itself whenever a favorite
 * changes elsewhere in the app (see `FAVORITES_CHANGED_EVENT`).
 */
export default function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<FavoriteItemDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setFavorites(await personalService.getFavorites());
    } catch {
      // Favorites are a convenience, the sidebar keeps working without them.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const handleChange = () => void load();
    window.addEventListener(FAVORITES_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handleChange);
  }, [load]);

  const removeFavorite = useCallback(async (item_id: number) => {
    setFavorites((current) => current.filter((favorite) => favorite.id !== item_id));
    await personalService.setFavorite(item_id, false);
  }, []);

  const moveFavorite = useCallback(
    async (item_id: number, to_index: number) => {
      const from_index = favorites.findIndex((favorite) => favorite.id === item_id);
      if (from_index < 0 || to_index < 0 || to_index >= favorites.length || from_index === to_index) return;
      const reordered = [...favorites];
      const [moved] = reordered.splice(from_index, 1);
      reordered.splice(to_index, 0, moved);
      setFavorites(reordered);
      try {
        await personalService.reorderFavorites(reordered.map((favorite) => favorite.id));
      } catch {
        void load();
      }
    },
    [favorites, load]
  );

  return { favorites, is_loading, removeFavorite, moveFavorite };
}
