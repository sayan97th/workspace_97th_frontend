"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { feedService } from "@/services/feed.service";
import type { FeedFilters, FeedSavedView, UpdateFeedTabId } from "@/data/update-feed-data";

/**
 * The current user's saved feed views (a named tab, board and filter
 * combination): loads them once signed in and exposes save and delete, both
 * reflected in the list right away. Saving rejects when the server refuses
 * (a full list), so the caller can show its message.
 */
export function useFeedSavedViews() {
  const { user } = useAuth();
  const [saved_views, setSavedViews] = useState<FeedSavedView[]>([]);

  useEffect(() => {
    if (!user) return;
    feedService
      .listSavedViews()
      .then(setSavedViews)
      .catch(() => {
        // The menu simply starts out empty.
      });
  }, [user]);

  const saveView = useCallback(
    async (name: string, tab: UpdateFeedTabId, board_id: string, filters: FeedFilters): Promise<FeedSavedView> => {
      const view = await feedService.createSavedView(name, tab, board_id, filters);
      setSavedViews((previous) => [...previous, view]);
      return view;
    },
    []
  );

  const deleteView = useCallback(async (id: number) => {
    setSavedViews((previous) => previous.filter((view) => view.id !== id));
    await feedService.deleteSavedView(id).catch(() => {
      feedService.listSavedViews().then(setSavedViews).catch(() => {});
    });
  }, []);

  return { saved_views, saveView, deleteView };
}
