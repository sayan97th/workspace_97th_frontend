"use client";
import React from "react";
import { getViewComponent } from "@/components/workspace-nav/view-registry";
import { useBoardRoute } from "../_context/BoardRouteContext";
import { BoardLoadingSpinner, CenteredMessage } from "../../_components/BoardRouteStates";

/**
 * Renders the resolved board's registry view from {@link useBoardRoute}.
 * Keyed only by `board.id`, so it stays mounted across navigations between
 * `/boards/{id}`, `/pulses/{item_id}`, and `/views/{view_id}` for the same
 * board — only the `initial_open_item_id`/`active_view_id` props it passes
 * down change, letting the view react to those instead of remounting.
 */
export const BoardRouteView: React.FC = () => {
  const { board, has_error, breadcrumb, open_item_id, active_view_id } = useBoardRoute();

  if (has_error) {
    return (
      <CenteredMessage title="Something went wrong" detail="We couldn't load this board. Please try again." />
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
