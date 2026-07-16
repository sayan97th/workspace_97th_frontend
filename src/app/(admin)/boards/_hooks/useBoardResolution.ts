"use client";
import { useEffect, useMemo, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { BoardDetail } from "@/types/workspace";

export type BoardResolutionState = {
  board: BoardDetail | null;
  has_error: boolean;
  breadcrumb: string[];
};

/**
 * Resolves a board (workspace navigation leaf) by its globally-unique id via
 * `GET /api/boards/{id}`. Shared by every `/boards/{id}` route — the plain
 * board page, and the `/pulses/{pulse_id}` and `/views/{view_id}` sub-routes —
 * so the fetch-and-breadcrumb logic isn't duplicated three times.
 */
export function useBoardResolution(id: string): BoardResolutionState {
  const item_id = useMemo(() => Number(id), [id]);

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(item_id)) {
      setHasError(true);
      return;
    }

    let cancelled = false;
    setBoard(null);
    setHasError(false);
    workspaceService
      .getBoard(item_id)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item_id]);

  const breadcrumb = useMemo(
    () => (board ? [...board.breadcrumb.map((ancestor) => ancestor.label), board.label] : []),
    [board]
  );

  return { board, has_error, breadcrumb };
}
