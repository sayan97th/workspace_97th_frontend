"use client";
import React, { use } from "react";
import { WorkspaceManageRouteProvider } from "./_context/WorkspaceManageRouteContext";
import { WorkspaceManageRouteView } from "./_components/WorkspaceManageRouteView";

type LayoutParams = { workspace_id: string };

/**
 * Shared shell for every route nested under `/workspaces/{workspace_id}` —
 * one per Manage Workspace tab (`/recent-boards`, `/content-management`,
 * `/collaborators`, `/permissions`). `WorkspaceManageRouteProvider` resolves
 * the workspace's Manage Workspace board and renders it here, once, instead
 * of separately inside each `page.tsx`: those pages only exist to make the
 * routes addressable — see their own comments. Switching tabs is just a
 * client-side navigation to a sibling route under this same layout, so the
 * board fetch and the mounted view are untouched by it — mirrors
 * `boards/[id]/layout.tsx`.
 */
export default function WorkspaceManageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LayoutParams>;
}) {
  const { workspace_id } = use(params);

  return (
    <WorkspaceManageRouteProvider workspace_id={workspace_id}>
      <WorkspaceManageRouteView />
      {children}
    </WorkspaceManageRouteProvider>
  );
}
