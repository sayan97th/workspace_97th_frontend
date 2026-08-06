"use client";
import React, { createContext, useContext, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useBoardResolution, type BoardResolutionState } from "../../_hooks/useBoardResolution";

export type BoardRouteContextValue = BoardResolutionState & {
  /** Item id to open the detail drawer for, from `/boards/{id}/pulses/{item_id}` — `undefined` off that route. */
  open_item_id: number | undefined;
  /** Tab (view) id from `/boards/{id}/views/{view_id}`, or the pulse route's `?view_id=` — `undefined` selects the primary tab. */
  active_view_id: number | undefined;
};

const BoardRouteContext = createContext<BoardRouteContextValue | null>(null);

const toPositiveInt = (raw: string | string[] | null | undefined): number | undefined => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

/**
 * Resolves the board once per board id (via {@link useBoardResolution}) and
 * derives which item/tab the current URL is addressing directly from the
 * router (`useParams`/`useSearchParams`), sharing both through context to
 * every route nested under `/boards/[id]` — the plain board page,
 * `/pulses/[pulse_id]`, and `/views/[view_id]`.
 *
 * Mounted once at the `[id]` layout, so navigating between those sibling
 * routes (opening/closing the item drawer, switching a tab) only updates
 * `open_item_id`/`active_view_id` in place — it never re-triggers the board
 * fetch or remounts the view underneath it, unlike the old design where each
 * route had its own `page.tsx` independently calling `useBoardResolution`
 * and mounting a fresh view instance (the "reload the whole board just to
 * open one item" bug this replaces).
 */
export const BoardRouteProvider: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const resolution = useBoardResolution(id);
  const params = useParams<{ pulse_id?: string; view_id?: string }>();
  const search_params = useSearchParams();

  const open_item_id = useMemo(() => toPositiveInt(params.pulse_id), [params.pulse_id]);
  const active_view_id = useMemo(
    () => toPositiveInt(params.view_id) ?? toPositiveInt(search_params.get("view_id")),
    [params.view_id, search_params]
  );

  const value = useMemo<BoardRouteContextValue>(
    () => ({ ...resolution, open_item_id, active_view_id }),
    [resolution, open_item_id, active_view_id]
  );

  return <BoardRouteContext.Provider value={value}>{children}</BoardRouteContext.Provider>;
};

export function useBoardRoute(): BoardRouteContextValue {
  const context = useContext(BoardRouteContext);
  if (!context) throw new Error("useBoardRoute must be used within a BoardRouteProvider");
  return context;
}
