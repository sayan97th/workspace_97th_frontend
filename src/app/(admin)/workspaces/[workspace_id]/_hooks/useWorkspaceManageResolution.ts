"use client";
import { useEffect, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { BoardDetail } from "@/types/workspace";

export type WorkspaceManageResolutionState = {
  node: BoardDetail | null;
  has_error: boolean;
};

/**
 * Resolves a workspace's "Manage Workspace" board from the workspace's own
 * numeric id (the `/workspaces/{workspace_id}/...` routes), rather than the
 * board leaf's own id (`/boards/{id}`): looks up the workspace by id to find
 * its `manage_node_id`, then resolves that leaf the same way `/boards/{id}`
 * does — so the resolved `node.workspace.slug` is always correct, matching
 * `useBoardResolution`'s guarantee for the generic board route.
 */
export function useWorkspaceManageResolution(workspace_id: string): WorkspaceManageResolutionState {
  const [node, setNode] = useState<BoardDetail | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    const parsed_workspace_id = Number(workspace_id);
    if (!Number.isFinite(parsed_workspace_id) || parsed_workspace_id <= 0) {
      setHasError(true);
      return;
    }

    let cancelled = false;
    setNode(null);
    setHasError(false);

    workspaceService
      .getWorkspaceById(parsed_workspace_id)
      .then((workspace) => {
        if (cancelled) return null;
        if (workspace.manage_node_id == null) {
          setHasError(true);
          return null;
        }
        return workspaceService.getBoard(workspace.manage_node_id);
      })
      .then((board) => {
        if (!cancelled && board) setNode(board);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [workspace_id]);

  return { node, has_error };
}
