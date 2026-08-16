"use client";
import { useCallback, useEffect, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type {
  TransferOwnershipPayload,
  TransferOwnershipResult,
  UpdateWorkspacePayload,
  Workspace,
} from "@/types/workspace";

export type WorkspaceDetailApi = {
  workspace: Workspace | undefined;
  is_loading: boolean;
  error: string | null;
  updateWorkspace: (payload: UpdateWorkspacePayload) => Promise<void>;
  leaveWorkspace: () => Promise<void>;
  deleteWorkspace: () => Promise<void>;
  transferOwnership: (payload: TransferOwnershipPayload) => Promise<TransferOwnershipResult>;
};

/**
 * Fetches a single workspace by slug — the real, always-correct source of
 * "which workspace am I in" for Manage Workspace, since it's resolved from
 * the `/boards/{id}` route itself rather than a separately-selected "active
 * workspace" that could drift from the URL.
 */
export function useWorkspaceDetail(workspace_slug: string): WorkspaceDetailApi {
  // Renaming a workspace can change its slug (the backend derives it from the
  // name), so subsequent calls must follow the latest slug, not the one this
  // hook was first mounted with.
  const [current_slug, setCurrentSlug] = useState(workspace_slug);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentSlug(workspace_slug);
  }, [workspace_slug]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setWorkspace(await workspaceService.getWorkspace(current_slug));
    } catch {
      setError("We couldn't load this workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [current_slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateWorkspace = useCallback(
    async (payload: UpdateWorkspacePayload) => {
      const updated = await workspaceService.updateWorkspace(current_slug, payload);
      setWorkspace(updated);
      setCurrentSlug(updated.slug);
    },
    [current_slug]
  );

  const leaveWorkspace = useCallback(async () => {
    await workspaceService.leaveWorkspace(current_slug);
  }, [current_slug]);

  const deleteWorkspace = useCallback(async () => {
    await workspaceService.deleteWorkspace(current_slug);
  }, [current_slug]);

  const transferOwnership = useCallback(
    async (payload: TransferOwnershipPayload): Promise<TransferOwnershipResult> => {
      const result = await workspaceService.transferOwnership(current_slug, payload);
      // Only refetch when the caller stayed on: their own role (and thus
      // `can_manage_workspace`) may have changed. Leaving redirects the
      // caller away instead, so there's nothing left to refresh here.
      if (!result.left) await load();
      return result;
    },
    [current_slug, load]
  );

  return {
    workspace,
    is_loading,
    error,
    updateWorkspace,
    leaveWorkspace,
    deleteWorkspace,
    transferOwnership,
  };
}

export default useWorkspaceDetail;
