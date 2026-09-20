"use client";
import { useCallback, useEffect, useState } from "react";
import type { CommentSortOrder } from "./commentFilters";

const STORAGE_PREFIX = "comment-sort-order:";

const readStoredOrder = (storage_key: string, fallback: CommentSortOrder): CommentSortOrder => {
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${storage_key}`);
    return stored === "newest" || stored === "oldest" ? stored : fallback;
  } catch {
    // Storage can be blocked (private window, site data off), the default order simply applies.
    return fallback;
  }
};

/**
 * The order an update thread is read in, remembered per drawer in this browser.
 * The item drawer defaults to oldest first (a conversation), the board
 * discussion to newest first (a feed), and the choice sticks once made.
 */
export function useCommentSortOrder(storage_key: string, fallback: CommentSortOrder) {
  const [sort_order, setSortOrderState] = useState<CommentSortOrder>(fallback);

  // Read after mount, so the server and first client render agree.
  useEffect(() => {
    setSortOrderState(readStoredOrder(storage_key, fallback));
  }, [storage_key, fallback]);

  const setSortOrder = useCallback(
    (order: CommentSortOrder) => {
      setSortOrderState(order);
      try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${storage_key}`, order);
      } catch {
        // Not remembered, the order still applies for this session.
      }
    },
    [storage_key]
  );

  return { sort_order, setSortOrder };
}
