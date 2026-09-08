"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getViewComponent } from "@/components/workspace-nav/view-registry";
import { buildWorkspaceManagePath } from "@/components/workspace-manage/tab-routing";
import { useBoardRoute } from "../_context/BoardRouteContext";
import { BoardLoadingSpinner, CenteredMessage } from "../../_components/BoardRouteStates";

/**
 * Renders the resolved board's registry view from {@link useBoardRoute}.
 * Keyed only by `board.id`, so it stays mounted across navigations between
 * `/boards/{id}`, `/pulses/{item_id}`, and `/views/{view_id}` for the same
 * board — only the `initial_open_item_id`/`active_view_id` props it passes
 * down change, letting the view react to those instead of remounting.
 *
 * "Manage Workspace" (`view_key: "workspace_manage"`) is the one exception:
 * it now lives at its own tab-addressable `/workspaces/{workspace_id}/...`
 * route, so a `/boards/{id}` link that resolves to it is forwarded there
 * instead of being rendered in place — keeping the old, bookmarked URL
 * working while canonicalizing it to the new one.
 */
export const BoardRouteView: React.FC = () => {
  const router = useRouter();
  const { board, has_error, breadcrumb, open_item_id, active_view_id } = useBoardRoute();
  const is_workspace_manage = board?.view_key === "workspace_manage";

  useEffect(() => {
    if (board && is_workspace_manage) {
      router.replace(buildWorkspaceManagePath(board.workspace.id));
    }
  }, [board, is_workspace_manage, router]);

  if (has_error) {
    return (
      <CenteredMessage title="Something went wrong" detail="We couldn't load this board. Please try again." />
    );
  }

  if (!board || is_workspace_manage) {
    return <BoardLoadingSpinner />;
  }

  if (board.type !== "leaf") {
    return (
      <CenteredMessage title="Nothing to show here" detail="This navigation item doesn't have a view of its own." />
    );
  }

  const View = getViewComponent(board.view_key);

  return (
    <View
      key={board.id}
      node={board}
      breadcrumb={breadcrumb}
      workspace_slug={board.workspace.slug}
      initial_open_item_id={open_item_id}
      active_view_id={active_view_id}
    />
  );
};
