"use client";
import React, { use } from "react";
import { BoardRouteProvider } from "./_context/BoardRouteContext";
import { BoardRouteView } from "./_components/BoardRouteView";

type LayoutParams = { id: string };

/**
 * Shared shell for every route nested under `/boards/{id}` — the board
 * itself, `/pulses/{pulse_id}` (item drawer deep link), and
 * `/views/{view_id}` (tab deep link). `BoardRouteProvider` resolves the
 * board and renders its view here, once, instead of separately inside each
 * `page.tsx`: those pages now only exist to make the routes addressable —
 * see their own comments. Opening/closing the item drawer or switching a
 * saved view is just a client-side navigation to a sibling route under this
 * same layout, so the board fetch and the mounted view are untouched by it.
 */
export default function BoardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LayoutParams>;
}) {
  const { id } = use(params);

  return (
    <BoardRouteProvider id={id}>
      <BoardRouteView />
      {children}
    </BoardRouteProvider>
  );
}
