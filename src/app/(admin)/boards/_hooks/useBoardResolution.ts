"use client";
import { useEffect, useMemo, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { BoardDetail } from "@/types/workspace";

export type BoardResolutionState = {
  board: BoardDetail | null;
  has_error: boolean;
  /** True when the board is private and the current user was not added to it (API code `board_private`). */
  is_private_board: boolean;
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
  const [is_private_board, setIsPrivateBoard] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(item_id)) {
      setHasError(true);
      return;
    }

    let cancelled = false;
    setBoard(null);
    setHasError(false);
    setIsPrivateBoard(false);
    workspaceService
      .getBoard(item_id)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setHasError(true);
        setIsPrivateBoard(isPrivateBoardError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [item_id]);

  const breadcrumb = useMemo(
    () => (board ? [...board.breadcrumb.map((ancestor) => ancestor.label), board.label] : []),
    [board]
  );

  return { board, has_error, is_private_board, breadcrumb };
}

/** Whether the API refused the board because it is private and the user was not added to it. */
function isPrivateBoardError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "board_private";
}
