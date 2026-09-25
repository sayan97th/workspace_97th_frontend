"use client";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { FAVORITES_CHANGED_EVENT, personalService } from "@/services/personal.service";
import type { FavoriteItemDto, PersonalWorkspaceSummary } from "@/types/personal";

/** One workspace block of the sidebar's Favorites section. */
export type FavoriteWorkspaceGroup = {
  workspace: PersonalWorkspaceSummary | null;
  /** Whether the whole workspace itself is starred (its header shows a filled star). */
  is_workspace_favorite: boolean;
  items: FavoriteItemDto[];
};

export type UseFavoritesResult = {
  favorites: FavoriteItemDto[];
  favorite_workspaces: PersonalWorkspaceSummary[];
  /** Favorites grouped by workspace: starred workspaces first (in star order), then the rest by their first favorite. */
  groups: FavoriteWorkspaceGroup[];
  is_loading: boolean;
  removeFavorite: (item_id: number) => Promise<void>;
  /** Moves a favorite to a new position and saves the whole order. */
  moveFavorite: (item_id: number, to_index: number) => Promise<void>;
  /** Moves a favorite inside its own workspace group and saves the whole order. */
  moveFavoriteWithinGroup: (item_id: number, over_item_id: number) => Promise<void>;
  isWorkspaceFavorite: (workspace_slug: string) => boolean;
  toggleWorkspaceFavorite: (workspace_slug: string, is_favorite: boolean) => Promise<void>;
};

type FavoritesSnapshot = {
  favorites: FavoriteItemDto[];
  favorite_workspaces: PersonalWorkspaceSummary[];
  is_loading: boolean;
};

/**
 * Module level store shared by every `useFavorites()` caller (the sidebar
 * section, every workspace options menu, ...), so the list is fetched once
 * once per mount burst and all of them stay in sync without a context provider.
 */
let snapshot: FavoritesSnapshot = { favorites: [], favorite_workspaces: [], is_loading: true };
const listeners = new Set<() => void>();
let in_flight: Promise<void> | null = null;

const setSnapshot = (next: Partial<FavoritesSnapshot>) => {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
};

const loadFavorites = (): Promise<void> => {
  if (in_flight) return in_flight;
  in_flight = personalService
    .getFavorites()
    .then((response) => setSnapshot({ favorites: response.data, favorite_workspaces: response.workspaces, is_loading: false }))
    .catch(() => setSnapshot({ is_loading: false })) // Favorites are a convenience, the sidebar keeps working without them.
    .finally(() => {
      in_flight = null;
    });
  return in_flight;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => snapshot;

const groupFavorites = (favorites: FavoriteItemDto[], favorite_workspaces: PersonalWorkspaceSummary[]): FavoriteWorkspaceGroup[] => {
  const groups = new Map<string, FavoriteWorkspaceGroup>();
  const groupKey = (workspace: PersonalWorkspaceSummary | null) => (workspace ? String(workspace.id) : "none");

  for (const workspace of favorite_workspaces) {
    groups.set(groupKey(workspace), { workspace, is_workspace_favorite: true, items: [] });
  }
  for (const favorite of favorites) {
    const key = groupKey(favorite.workspace);
    const group = groups.get(key) ?? { workspace: favorite.workspace, is_workspace_favorite: false, items: [] };
    group.items.push(favorite);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/**
 * The signed in user's Favorites: starred boards and folders plus whole
 * starred workspaces. Refreshes itself whenever a favorite changes elsewhere
 * in the app (see `FAVORITES_CHANGED_EVENT`).
 */
export default function useFavorites(): UseFavoritesResult {
  const { favorites, favorite_workspaces, is_loading } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Every caller mounted in the same render shares one request (see `in_flight`).
  useEffect(() => {
    void loadFavorites();
    const handleChange = () => void loadFavorites();
    window.addEventListener(FAVORITES_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, handleChange);
  }, []);

  const groups = useMemo(() => groupFavorites(favorites, favorite_workspaces), [favorites, favorite_workspaces]);

  const saveOrder = useCallback(async (reordered: FavoriteItemDto[]) => {
    setSnapshot({ favorites: reordered });
    try {
      await personalService.reorderFavorites(reordered.map((favorite) => favorite.id));
    } catch {
      void loadFavorites();
    }
  }, []);

  const removeFavorite = useCallback(async (item_id: number) => {
    setSnapshot({ favorites: snapshot.favorites.filter((favorite) => favorite.id !== item_id) });
    await personalService.setFavorite(item_id, false);
  }, []);

  const moveFavorite = useCallback(
    async (item_id: number, to_index: number) => {
      const current = snapshot.favorites;
      const from_index = current.findIndex((favorite) => favorite.id === item_id);
      if (from_index < 0 || to_index < 0 || to_index >= current.length || from_index === to_index) return;
      const reordered = [...current];
      const [moved] = reordered.splice(from_index, 1);
      reordered.splice(to_index, 0, moved);
      await saveOrder(reordered);
    },
    [saveOrder]
  );

  // The server keeps one flat order, so a move inside a group is saved as
  // the groups concatenated in their display order.
  const moveFavoriteWithinGroup = useCallback(
    async (item_id: number, over_item_id: number) => {
      const current_groups = groupFavorites(snapshot.favorites, snapshot.favorite_workspaces);
      const group = current_groups.find((candidate) => candidate.items.some((favorite) => favorite.id === item_id));
      if (!group || !group.items.some((favorite) => favorite.id === over_item_id) || item_id === over_item_id) return;
      const from_index = group.items.findIndex((favorite) => favorite.id === item_id);
      const to_index = group.items.findIndex((favorite) => favorite.id === over_item_id);
      const [moved] = group.items.splice(from_index, 1);
      group.items.splice(to_index, 0, moved);
      await saveOrder(current_groups.flatMap((candidate) => candidate.items));
    },
    [saveOrder]
  );

  const isWorkspaceFavorite = useCallback(
    (workspace_slug: string) => favorite_workspaces.some((workspace) => workspace.slug === workspace_slug),
    [favorite_workspaces]
  );

  const toggleWorkspaceFavorite = useCallback(async (workspace_slug: string, is_favorite: boolean) => {
    if (!is_favorite) {
      setSnapshot({ favorite_workspaces: snapshot.favorite_workspaces.filter((workspace) => workspace.slug !== workspace_slug) });
    }
    await personalService.setWorkspaceFavorite(workspace_slug, is_favorite);
  }, []);

  return {
    favorites,
    favorite_workspaces,
    groups,
    is_loading,
    removeFavorite,
    moveFavorite,
    moveFavoriteWithinGroup,
    isWorkspaceFavorite,
    toggleWorkspaceFavorite,
  };
}
