"use client";
import React, { use } from "react";
import { getViewComponent } from "@/components/workspace-nav/view-registry";
import { useBoardResolution } from "../../../_hooks/useBoardResolution";
import { BoardLoadingSpinner, CenteredMessage } from "../../../_components/BoardRouteStates";

type PageParams = { id: string; view_id: string };

/**
 * Deep link to a specific tab: `/boards/{board_id}/views/{view_id}`.
 *
 * Renders the same board view as `/boards/{id}`, passing `active_view_id` so
 * `TableBoardView` selects that tab and applies its saved filter/sort/display
 * state on mount instead of defaulting to the primary "Main table" view.
 */
export default function BoardViewPage({ params }: { params: Promise<PageParams> }) {
  const { id, view_id } = use(params);
  const { board, has_error, breadcrumb } = useBoardResolution(id);

  if (has_error) {
    return (
      <CenteredMessage title="Something went wrong" detail="We couldn't load this view. Please try again." />
    );
  }

  if (!board) {
    return <BoardLoadingSpinner />;
  }

  if (board.type !== "leaf") {
    return (
      <CenteredMessage title="Nothing to show here" detail="This navigation item doesn't have a view of its own." />
    );
  }

  const View = getViewComponent(board.view_key);
  const active_view_id = Number(view_id);

  return (
    <View
      key={`${board.id}-${view_id}`}
      node={board}
      breadcrumb={breadcrumb}
      workspace_slug={board.workspace.slug}
      active_view_id={Number.isFinite(active_view_id) ? active_view_id : undefined}
    />
  );
}
