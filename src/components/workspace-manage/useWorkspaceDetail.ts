"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Uploads (or replaces) this workspace's custom avatar image. Owner/admin only. */
  uploadWorkspaceAvatar: (file: File) => Promise<void>;
  /** Removes this workspace's custom avatar, reverting it to its generated mono/color badge. Owner/admin only. */
  removeWorkspaceAvatar: () => Promise<void>;
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
  // hook was first mounted with. A ref (rather than relying on the `current_slug`
  // state closure) is required so that back-to-back calls in the same handler —
  // e.g. `updateWorkspace` immediately followed by `uploadWorkspaceAvatar`, as
  // `EditWorkspaceModal`'s combined name+avatar save does — see the slug update
  // synchronously instead of the stale value captured before that render's setState.
  const current_slug_ref = useRef(workspace_slug);
  const [, forceRender] = useState(0);
  const setCurrentSlug = useCallback((slug: string) => {
    current_slug_ref.current = slug;
    forceRender((n) => n + 1);
  }, []);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentSlug(workspace_slug);
  }, [workspace_slug, setCurrentSlug]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setWorkspace(await workspaceService.getWorkspace(current_slug_ref.current));
    } catch {
      setError("We couldn't load this workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [workspace_slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateWorkspace = useCallback(async (payload: UpdateWorkspacePayload) => {
    const updated = await workspaceService.updateWorkspace(current_slug_ref.current, payload);
    setWorkspace(updated);
    setCurrentSlug(updated.slug);
  }, [setCurrentSlug]);

  const uploadWorkspaceAvatar = useCallback(async (file: File) => {
    setWorkspace(await workspaceService.uploadWorkspaceAvatar(current_slug_ref.current, file));
  }, []);

  const removeWorkspaceAvatar = useCallback(async () => {
    setWorkspace(await workspaceService.removeWorkspaceAvatar(current_slug_ref.current));
  }, []);

  const leaveWorkspace = useCallback(async () => {
    await workspaceService.leaveWorkspace(current_slug_ref.current);
  }, []);

  const deleteWorkspace = useCallback(async () => {
    await workspaceService.deleteWorkspace(current_slug_ref.current);
  }, []);

  const transferOwnership = useCallback(
    async (payload: TransferOwnershipPayload): Promise<TransferOwnershipResult> => {
      const result = await workspaceService.transferOwnership(current_slug_ref.current, payload);
      // Only refetch when the caller stayed on: their own role (and thus
      // `can_manage_workspace`) may have changed. Leaving redirects the
      // caller away instead, so there's nothing left to refresh here.
      if (!result.left) await load();
      return result;
    },
    [load]
  );

  return {
    workspace,
    is_loading,
    error,
    updateWorkspace,
    uploadWorkspaceAvatar,
    removeWorkspaceAvatar,
    leaveWorkspace,
    deleteWorkspace,
    transferOwnership,
  };
}

export default useWorkspaceDetail;
