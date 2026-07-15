"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { CreateWorkspacePayload, UpdateWorkspacePayload } from "@/types/workspace";
import type { BrowseWorkspace } from "@/data/workspace-browse-data";
import { mapWorkspaceToBrowse } from "./helpers";

export type WorkspacesApi = {
  workspaces: BrowseWorkspace[];
  active_workspace: BrowseWorkspace | undefined;
  active_workspace_slug: string | undefined;
  recent_workspaces: BrowseWorkspace[];
  my_workspaces: BrowseWorkspace[];
  is_loading: boolean;
  error: string | null;
  selectWorkspace: (workspace: { id: string }) => void;
  createWorkspace: (payload: CreateWorkspacePayload) => Promise<BrowseWorkspace>;
  /** PATCH a workspace's own fields (rename / change type) — used by the "…" options menu. */
  updateWorkspace: (
    workspace_slug: string,
    payload: UpdateWorkspacePayload
  ) => Promise<BrowseWorkspace>;
  /** Remove the current user from a workspace; drops it from local state on success. */
  leaveWorkspace: (workspace_slug: string) => Promise<void>;
  /** Soft-delete a workspace; drops it from local state on success. */
  deleteWorkspace: (workspace_slug: string) => Promise<void>;
  reload: () => Promise<void>;
};

/**
 * Fetches the workspace catalog from the API and derives the switcher's
 * recent / mine lists. Config-in / API-out, mirroring the board & teams kits so
 * the sidebar (and any future top-bar switcher) stays presentational.
 */
export function useWorkspaces(): WorkspacesApi {
  const [workspaces, setWorkspaces] = useState<BrowseWorkspace[]>([]);
  const [active_workspace_id, setActiveWorkspaceId] = useState<string | undefined>();
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await workspaceService.getWorkspaces();
      const mapped = data.map(mapWorkspaceToBrowse);
      setWorkspaces(mapped);
      setActiveWorkspaceId((current) => {
        if (current && mapped.some((workspace) => workspace.id === current)) {
          return current;
        }
        return (mapped.find((workspace) => workspace.is_home) ?? mapped[0])?.id;
      });
    } catch {
      setError("We couldn't load your workspaces.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active_workspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === active_workspace_id),
    [workspaces, active_workspace_id]
  );

  const recent_workspaces = useMemo(
    () => workspaces.filter((workspace) => workspace.memberships.includes("recent")),
    [workspaces]
  );

  const my_workspaces = useMemo(
    () =>
      workspaces.filter(
        (workspace) =>
          workspace.memberships.includes("owner") ||
          workspace.memberships.includes("member")
      ),
    [workspaces]
  );

  const selectWorkspace = useCallback((workspace: { id: string }) => {
    setActiveWorkspaceId(workspace.id);
  }, []);

  const createWorkspace = useCallback(
    async (payload: CreateWorkspacePayload) => {
      const created = mapWorkspaceToBrowse(
        await workspaceService.createWorkspace(payload)
      );
      setWorkspaces((prev) => [...prev, created]);
      setActiveWorkspaceId(created.id);
      return created;
    },
    []
  );

  const updateWorkspace = useCallback(
    async (workspace_slug: string, payload: UpdateWorkspacePayload) => {
      const updated = mapWorkspaceToBrowse(
        await workspaceService.updateWorkspace(workspace_slug, payload)
      );
      setWorkspaces((prev) =>
        prev.map((workspace) => (workspace.id === workspace_slug ? updated : workspace))
      );
      // Renaming can change the slug (the backend derives it from the name), so the
      // active id must follow — otherwise `active_workspace` silently orphans itself.
      setActiveWorkspaceId((current) => (current === workspace_slug ? updated.id : current));
      return updated;
    },
    []
  );

  /** Drops a workspace from local state, falling back active selection to the home
   * workspace (or the first remaining one) when the removed workspace was active. */
  const dropWorkspaceFromState = useCallback((workspace_slug: string) => {
    setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== workspace_slug));
    setActiveWorkspaceId((current) => {
      if (current !== workspace_slug) return current;
      const remaining = workspaces.filter((workspace) => workspace.id !== workspace_slug);
      return (remaining.find((workspace) => workspace.is_home) ?? remaining[0])?.id;
    });
  }, [workspaces]);

  const leaveWorkspace = useCallback(
    async (workspace_slug: string) => {
      await workspaceService.leaveWorkspace(workspace_slug);
      dropWorkspaceFromState(workspace_slug);
    },
    [dropWorkspaceFromState]
  );

  const deleteWorkspace = useCallback(
    async (workspace_slug: string) => {
      await workspaceService.deleteWorkspace(workspace_slug);
      dropWorkspaceFromState(workspace_slug);
    },
    [dropWorkspaceFromState]
  );

  return {
    workspaces,
    active_workspace,
    active_workspace_slug: active_workspace_id,
    recent_workspaces,
    my_workspaces,
    is_loading,
    error,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    leaveWorkspace,
    deleteWorkspace,
    reload: load,
  };
}

export default useWorkspaces;
