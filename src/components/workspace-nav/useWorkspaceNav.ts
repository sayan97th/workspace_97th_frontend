"use client";
import { useCallback, useEffect, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type {
  CreateNavItemPayload,
  MoveNavItemPayload,
  WorkspaceNavNode,
} from "@/types/workspace";
import { collectGroupIds } from "./helpers";

export type WorkspaceNavApi = {
  tree: WorkspaceNavNode[];
  is_loading: boolean;
  error: string | null;
  expanded_group_ids: Record<string, boolean>;
  toggleGroup: (group_id: string) => void;
  reload: () => Promise<void>;
  createItem: (payload: CreateNavItemPayload) => Promise<void>;
  renameItem: (item_id: number, label: string) => Promise<void>;
  toggleFavorite: (item_id: number, is_favorite: boolean) => Promise<void>;
  moveItem: (item_id: number, payload: MoveNavItemPayload) => Promise<void>;
  duplicateItem: (item_id: number) => Promise<void>;
  deleteItem: (item_id: number) => Promise<void>;
};

/**
 * Fetches and mutates a single workspace's navigation tree. All CRUD actions
 * round-trip to the API and then reload the tree so the sidebar stays in sync
 * with the server (the source of truth). Group expand/collapse state is kept
 * locally and defaults to open, preserving user toggles across reloads.
 */
export function useWorkspaceNav(workspace_slug: string | undefined): WorkspaceNavApi {
  const [tree, setTree] = useState<WorkspaceNavNode[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded_group_ids, setExpandedGroupIds] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!workspace_slug) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await workspaceService.getNavigationTree(workspace_slug);
      setTree(data);
      setExpandedGroupIds((prev) => {
        const next = { ...prev };
        for (const group_id of collectGroupIds(data)) {
          if (next[group_id] === undefined) next[group_id] = true;
        }
        return next;
      });
    } catch {
      setError("We couldn't load this workspace's navigation.");
    } finally {
      setIsLoading(false);
    }
  }, [workspace_slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleGroup = useCallback((group_id: string) => {
    setExpandedGroupIds((prev) => ({ ...prev, [group_id]: !prev[group_id] }));
  }, []);

  const runMutation = useCallback(
    async (mutation: (slug: string) => Promise<unknown>) => {
      if (!workspace_slug) return;
      await mutation(workspace_slug);
      await load();
    },
    [workspace_slug, load]
  );

  const createItem = useCallback(
    (payload: CreateNavItemPayload) =>
      runMutation((slug) => workspaceService.createNavItem(slug, payload)),
    [runMutation]
  );

  const renameItem = useCallback(
    (item_id: number, label: string) =>
      runMutation((slug) => workspaceService.updateNavItem(slug, item_id, { label })),
    [runMutation]
  );

  const toggleFavorite = useCallback(
    (item_id: number, is_favorite: boolean) =>
      runMutation((slug) =>
        workspaceService.updateNavItem(slug, item_id, { is_favorite })
      ),
    [runMutation]
  );

  const moveItem = useCallback(
    (item_id: number, payload: MoveNavItemPayload) =>
      runMutation((slug) => workspaceService.moveNavItem(slug, item_id, payload)),
    [runMutation]
  );

  const duplicateItem = useCallback(
    (item_id: number) =>
      runMutation((slug) => workspaceService.duplicateNavItem(slug, item_id)),
    [runMutation]
  );

  const deleteItem = useCallback(
    (item_id: number) =>
      runMutation((slug) => workspaceService.deleteNavItem(slug, item_id)),
    [runMutation]
  );

  return {
    tree,
    is_loading,
    error,
    expanded_group_ids,
    toggleGroup,
    reload: load,
    createItem,
    renameItem,
    toggleFavorite,
    moveItem,
    duplicateItem,
    deleteItem,
  };
}

export default useWorkspaceNav;
