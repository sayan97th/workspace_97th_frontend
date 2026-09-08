"use client";
import React from "react";
// `workspace-nav/view-registry` and `workspace-manage` (via `WorkspaceManage.tsx`)
// import each other, so whichever of the two is imported *first* becomes the
// module that "wins" the cycle. `BoardRouteView` (the `/boards/{id}` route)
// always reaches `WorkspaceManage` by going through `view-registry` first —
// importing it here too, ahead of `WorkspaceManage` itself, keeps this route
// on that same safe evaluation order instead of tripping the cycle from the
// opposite direction.
import "@/components/workspace-nav/view-registry";
import WorkspaceManage from "@/components/workspace-manage/WorkspaceManage";
import { useWorkspaceManageRoute } from "../_context/WorkspaceManageRouteContext";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

/**
 * Renders `WorkspaceManage` from {@link useWorkspaceManageRoute}, with its
 * active tab controlled by the `/workspaces/{workspace_id}/{tab}` route
 * instead of the component's own local state — mirrors `BoardRouteView`'s
 * role for `/boards/{id}`.
 */
export const WorkspaceManageRouteView: React.FC = () => {
  const { node, has_error, active_tab, onTabChange } = useWorkspaceManageRoute();

  if (has_error) {
    return (
      <CenteredMessage title="Something went wrong" detail="We couldn't load this workspace. Please try again." />
    );
  }

  if (!node) {
    return <BoardLoadingSpinner />;
  }

  return (
    <WorkspaceManage
      key={node.workspace.id}
      node={node}
      breadcrumb={[]}
      workspace_slug={node.workspace.slug}
      active_tab={active_tab}
      onTabChange={onTabChange}
    />
  );
};
