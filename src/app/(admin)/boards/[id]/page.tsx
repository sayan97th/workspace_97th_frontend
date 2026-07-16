"use client";
import React, { use } from "react";
import { getViewComponent } from "@/components/workspace-nav/view-registry";
import { useBoardResolution } from "../_hooks/useBoardResolution";
import { BoardLoadingSpinner, CenteredMessage } from "../_components/BoardRouteStates";

type PageParams = { id: string };

/**
 * Id-routed entry point for every board (workspace navigation leaf).
 *
 * The URL `/boards/{id}` resolves directly against the item's globally-unique
 * database id via `GET /api/boards/{id}` — no workspace slug or slug path
 * needed. The response carries the owning workspace and the ancestor
 * breadcrumb, so this page never has to hold or walk the full navigation
 * tree just to render one leaf. The matched item's `view_key` selects a
 * component from the view registry (falling back to the generic view).
 */
export default function BoardPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);
  const { board, has_error, breadcrumb } = useBoardResolution(id);

  if (has_error) {
    return (
      <CenteredMessage
        title="Something went wrong"
        detail="We couldn't load this board. Please try again."
      />
    );
  }

  if (!board) {
    return <BoardLoadingSpinner />;
  }

  if (board.type !== "leaf") {
    return (
      <CenteredMessage
        title="Nothing to show here"
        detail="This navigation item doesn't have a view of its own."
      />
    );
  }

  const View = getViewComponent(board.view_key);

  return <View key={board.id} node={board} breadcrumb={breadcrumb} workspace_slug={board.workspace.slug} />;
}
