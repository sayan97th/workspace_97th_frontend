"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/context/AuthContext";
import { commentDraftStore, type CommentDraftRecord, type DraftAddress } from "@/lib/comment-drafts";

/**
 * Points the shared draft store at the signed in user, so one person's drafts
 * never restore for another on the same browser. Every surface that reads or
 * writes drafts calls it, the store ignores repeated calls for the same user.
 */
export function useCommentDraftOwner(): number | null {
  const { user } = useAuth();
  const user_id = user?.id ?? null;
  useEffect(() => {
    commentDraftStore.setOwner(user_id === null ? null : Number(user_id));
  }, [user_id]);
  return user_id === null ? null : Number(user_id);
}

/** Loads one board's drafts as soon as the board is on screen, so every drawer restores at once. */
export function useBoardCommentDrafts(board_id: number | null | undefined) {
  const owner_id = useCommentDraftOwner();
  useEffect(() => {
    if (owner_id === null || board_id === null || board_id === undefined || !Number.isFinite(board_id)) return;
    void commentDraftStore.ensureBoardLoaded(board_id);
  }, [owner_id, board_id]);
}

/** Re-renders on every draft change, returning the store's change counter. */
export function useCommentDraftsVersion(): number {
  return useSyncExternalStore(commentDraftStore.subscribe, commentDraftStore.getVersion, () => 0);
}

/** One composer's live draft record (text, people, sync status), or null when it has none. */
export function useCommentDraft(address: DraftAddress | null): CommentDraftRecord | null {
  const board_id = address?.board_id ?? null;
  const item_id = address?.item_id ?? null;
  const parent_id = address?.parent_id ?? null;
  const getSnapshot = useCallback(
    () => (board_id === null ? null : commentDraftStore.getDraft({ board_id, item_id, parent_id })),
    [board_id, item_id, parent_id]
  );
  return useSyncExternalStore(commentDraftStore.subscribe, getSnapshot, () => null);
}

/**
 * Whether the item has an unsent update or reply, for the table's chat
 * bubble. Only re-renders its row when the answer flips, not on every keystroke.
 */
export function useHasItemDraft(item_id: string | number | null | undefined): boolean {
  const numeric_id = item_id === null || item_id === undefined ? NaN : Number(item_id);
  const getSnapshot = useCallback(
    () => (Number.isFinite(numeric_id) ? commentDraftStore.hasItemDraft(numeric_id) : false),
    [numeric_id]
  );
  return useSyncExternalStore(commentDraftStore.subscribe, getSnapshot, () => false);
}
