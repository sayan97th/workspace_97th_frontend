"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceService } from "@/services/workspace.service";
import { buildWorkspaceManagePath } from "@/components/workspace-manage/tab-routing";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

/**
 * `/workspace-home` is the app's stable post-login landing route (see
 * `src/utils/redirect.ts`), but "Manage Workspace" now lives at its own
 * tab-addressable `/workspaces/{workspace_id}/...` route. This page's only
 * job is to resolve the current user's home workspace and forward there —
 * it never renders Manage Workspace itself.
 */
const WorkspaceHomeRedirect: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const workspaces = await workspaceService.getWorkspaces();
        const home_workspace = workspaces.find((workspace) => workspace.is_home) ?? workspaces[0];

        if (!home_workspace) {
          if (!cancelled) setError("You don't have access to any workspace yet.");
          return;
        }

        if (!cancelled) router.replace(buildWorkspaceManagePath(home_workspace.id));
      } catch {
        if (!cancelled) setError("We couldn't load your workspace.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return <CenteredMessage title="Something went wrong" detail={error} />;
  }

  return <BoardLoadingSpinner />;
};

export default WorkspaceHomeRedirect;
