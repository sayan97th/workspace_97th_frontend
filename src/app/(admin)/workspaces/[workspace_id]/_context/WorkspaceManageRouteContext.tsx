"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useWorkspaceManageResolution,
  type WorkspaceManageResolutionState,
} from "../_hooks/useWorkspaceManageResolution";
import {
  buildWorkspaceManagePath,
  DEFAULT_WORKSPACE_MANAGE_TAB,
  workspaceManageTabFromSlug,
  type WorkspaceManageTabId,
} from "@/components/workspace-manage/tab-routing";

export type WorkspaceManageRouteContextValue = WorkspaceManageResolutionState & {
  active_tab: WorkspaceManageTabId;
  onTabChange: (tab: WorkspaceManageTabId) => void;
};

const WorkspaceManageRouteContext = createContext<WorkspaceManageRouteContextValue | null>(null);

/**
 * Resolves the workspace's Manage Workspace board once per `workspace_id`
 * (via {@link useWorkspaceManageResolution}) and derives the active tab
 * straight from the `[tab]` route segment, sharing both through context with
 * every route nested under `/workspaces/[workspace_id]` — mirrors
 * `BoardRouteContext`'s role for `/boards/[id]`.
 *
 * Switching tabs updates the URL (`router.push`, so each tab is back/forward
 * navigable and survives a reload) without re-triggering the board fetch or
 * remounting `WorkspaceManage`, since the resolution only depends on
 * `workspace_id`, not on which tab is active.
 */
export const WorkspaceManageRouteProvider: React.FC<{ workspace_id: string; children: React.ReactNode }> = ({
  workspace_id,
  children,
}) => {
  const router = useRouter();
  const resolution = useWorkspaceManageResolution(workspace_id);
  const params = useParams<{ tab?: string }>();

  const active_tab = workspaceManageTabFromSlug(params.tab) ?? DEFAULT_WORKSPACE_MANAGE_TAB;

  // An unrecognized `[tab]` segment (a stale link, a typo) lands on the
  // default tab instead of silently rendering it under the wrong URL.
  useEffect(() => {
    if (params.tab && workspaceManageTabFromSlug(params.tab) === null) {
      router.replace(buildWorkspaceManagePath(Number(workspace_id), DEFAULT_WORKSPACE_MANAGE_TAB));
    }
  }, [params.tab, router, workspace_id]);

  const onTabChange = useCallback(
    (tab: WorkspaceManageTabId) => {
      router.push(buildWorkspaceManagePath(Number(workspace_id), tab));
    },
    [router, workspace_id]
  );

  const value = useMemo<WorkspaceManageRouteContextValue>(
    () => ({ ...resolution, active_tab, onTabChange }),
    [resolution, active_tab, onTabChange]
  );

  return <WorkspaceManageRouteContext.Provider value={value}>{children}</WorkspaceManageRouteContext.Provider>;
};

export function useWorkspaceManageRoute(): WorkspaceManageRouteContextValue {
  const context = useContext(WorkspaceManageRouteContext);
  if (!context) throw new Error("useWorkspaceManageRoute must be used within a WorkspaceManageRouteProvider");
  return context;
}
