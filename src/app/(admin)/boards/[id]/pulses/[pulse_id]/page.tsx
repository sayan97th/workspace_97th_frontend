"use client";
import React, { use } from "react";
import { getViewComponent } from "@/components/workspace-nav/view-registry";
import { useBoardResolution } from "../../../_hooks/useBoardResolution";
import { BoardLoadingSpinner, CenteredMessage } from "../../../_components/BoardRouteStates";

type PageParams = { id: string; pulse_id: string };

/**
 * Deep link to a single item's detail drawer: `/boards/{board_id}/pulses/{pulse_id}`.
 *
 * Renders the exact same board view as `/boards/{id}` (same data fetch, same
 * component), but tells it which item id to open the drawer for on mount via
 * `initial_open_item_id` — see `TableBoardView`'s deep-link effect. Client
 * Hub isn't registered under this route (it doesn't use the reusable engine
 * yet), so this only takes effect for boards resolved through the generic
 * `TableBoardView`.
 */
export default function BoardPulsePage({ params }: { params: Promise<PageParams> }) {
  const { id, pulse_id } = use(params);
  const { board, has_error, breadcrumb } = useBoardResolution(id);

  if (has_error) {
    return (
      <CenteredMessage title="Something went wrong" detail="We couldn't load this item. Please try again." />
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
  const initial_open_item_id = Number(pulse_id);

  return (
    <View
      key={`${board.id}-${pulse_id}`}
      node={board}
      breadcrumb={breadcrumb}
      workspace_slug={board.workspace.slug}
      initial_open_item_id={Number.isFinite(initial_open_item_id) ? initial_open_item_id : undefined}
    />
  );
}
