"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { CreateWorkspacePayload } from "@/types/workspace";
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
    reload: load,
  };
}

export default useWorkspaces;
