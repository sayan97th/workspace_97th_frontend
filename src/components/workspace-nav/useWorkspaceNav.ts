"use client";
import { useCallback, useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { workspaceService } from "@/services/workspace.service";
import type {
  CreateNavItemPayload,
  MoveNavItemPayload,
  ReorderNavItemsPayload,
  WorkspaceNavNode,
} from "@/types/workspace";
import { collectGroupIds, locateNavNode } from "./helpers";

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
  /** Flags/unflags a sidebar item (board/folder) as priority — the nav tree's own priority star. */
  togglePriority: (item_id: number, is_priority: boolean) => Promise<void>;
  moveItem: (item_id: number, payload: MoveNavItemPayload) => Promise<void>;
  /** Drag-and-drop reorder: persists a full sibling order in one server-side transaction. */
  reorderItem: (payload: ReorderNavItemsPayload) => Promise<void>;
  /** Swaps an item with its previous sibling (kebab menu's "Move up"); a no-op when it's already first. */
  moveItemUp: (item_id: number) => Promise<void>;
  /** Swaps an item with its next sibling (kebab menu's "Move down"); a no-op when it's already last. */
  moveItemDown: (item_id: number) => Promise<void>;
  duplicateItem: (item_id: number) => Promise<void>;
  deleteItem: (item_id: number) => Promise<void>;
};

/**
 * Fetches and mutates a single workspace's navigation tree. All CRUD actions
 * round-trip to the API and then reload the tree so the sidebar stays in sync
 * with the server (the source of truth). Group expand/collapse state defaults
 * to open, is kept locally for a snappy toggle, and is persisted per user via
 * `PUT .../navigation/collapsed-state` so it's remembered across reloads and
 * devices (see {@link WorkspaceNavCollapseState} on the API).
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
      const { data, collapsed_group_ids } = await workspaceService.getNavigationTree(workspace_slug);
      setTree(data);
      setExpandedGroupIds((prev) => {
        const next = { ...prev };
        for (const group_id of collectGroupIds(data)) {
          if (next[group_id] === undefined) next[group_id] = !collapsed_group_ids.includes(Number(group_id));
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

  const toggleGroup = useCallback(
    (group_id: string) => {
      if (!workspace_slug) return;
      setExpandedGroupIds((prev) => {
        const next = { ...prev, [group_id]: !prev[group_id] };
        const collapsed_group_ids = Object.entries(next)
          .filter(([, is_expanded]) => !is_expanded)
          .map(([id]) => Number(id));
        void workspaceService.updateNavCollapseState(workspace_slug, { collapsed_group_ids });
        return next;
      });
    },
    [workspace_slug]
  );

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

  const togglePriority = useCallback(
    (item_id: number, is_priority: boolean) =>
      runMutation((slug) =>
        workspaceService.updateNavItem(slug, item_id, { is_priority })
      ),
    [runMutation]
  );

  const moveItem = useCallback(
    (item_id: number, payload: MoveNavItemPayload) =>
      runMutation((slug) => workspaceService.moveNavItem(slug, item_id, payload)),
    [runMutation]
  );

  const reorderItem = useCallback(
    (payload: ReorderNavItemsPayload) =>
      runMutation((slug) => workspaceService.reorderNavItems(slug, payload)),
    [runMutation]
  );

  /** Shared by `moveItemUp`/`moveItemDown`: swaps `item_id` with its previous/next sibling and persists the new order. */
  const swapWithSibling = useCallback(
    (item_id: number, direction: "up" | "down") =>
      runMutation((slug) => {
        const location = locateNavNode(tree, item_id);
        if (!location) return Promise.resolve();

        const swap_index = direction === "up" ? location.index - 1 : location.index + 1;
        if (swap_index < 0 || swap_index >= location.siblings.length) return Promise.resolve();

        const target_ordered_ids = arrayMove(
          location.siblings.map((sibling) => sibling.id),
          location.index,
          swap_index
        );

        return workspaceService.reorderNavItems(slug, {
          moved_item_id: item_id,
          target_parent_id: location.parent_id,
          target_ordered_ids,
        });
      }),
    [runMutation, tree]
  );

  const moveItemUp = useCallback((item_id: number) => swapWithSibling(item_id, "up"), [swapWithSibling]);
  const moveItemDown = useCallback((item_id: number) => swapWithSibling(item_id, "down"), [swapWithSibling]);

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
    togglePriority,
    moveItem,
    reorderItem,
    moveItemUp,
    moveItemDown,
    duplicateItem,
    deleteItem,
  };
}

export default useWorkspaceNav;
