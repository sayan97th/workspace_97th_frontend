"use client";
import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useCommentDraftOwner } from "@/hooks/useCommentDrafts";
import { commentDraftStore, type CommentDraftRecord, type DraftAddress } from "@/lib/comment-drafts";
import type { ComposerDraftContextValue } from "./ComposerDraftContext";
import type { DrawerComposerTarget } from "./types";

type IdsByTarget = Record<string, string[]>;

export type UseComposerDraftsOptions = {
  /** Undefined for a mock board (Client Hub demos), which keeps no drafts. */
  board_id: number | undefined;
  /** The open item, or null for the board discussion. */
  item_id: number | null;
  /** False while the drawer is closed (or no item is open), nothing is restored or saved then. */
  is_active: boolean;
  setComposerText: Dispatch<SetStateAction<string>>;
  setReplyTextByComment: Dispatch<SetStateAction<Record<string, string>>>;
  mention_ids_by_target: IdsByTarget;
  setMentionIdsByTarget: Dispatch<SetStateAction<IdsByTarget>>;
  notified_ids_by_target: IdsByTarget;
  setNotifiedIdsByTarget: Dispatch<SetStateAction<IdsByTarget>>;
};

export type ComposerDraftsApi = {
  /** Fills the update box and every reply box of the scope from its saved drafts. Call right after opening it. */
  restoreDrafts: (board_id?: number, item_id?: number | null) => void;
  /** Saves what was just typed into one composer. */
  saveDraftText: (target: DrawerComposerTarget, value: string) => void;
  /** Drops a composer's draft once its update or reply is sent. */
  clearDraft: (target: DrawerComposerTarget) => void;
  /** What `ComposerDraftProvider` hands to every composer of the drawer. Null for a mock board. */
  draft_context: ComposerDraftContextValue | null;
};

const toStringIds = (ids: number[]): string[] => ids.map(String);

/** "composer" is the update box, any other target is the id of the update a reply box answers. */
const parentIdOf = (target: DrawerComposerTarget): number | null => (target === "composer" ? null : Number(target));

/** Puts a draft's text and people into the drawer state, never over something already typed there. */
const seedFromDrafts = (
  drafts: CommentDraftRecord[],
  options: Pick<UseComposerDraftsOptions, "setComposerText" | "setReplyTextByComment" | "setMentionIdsByTarget" | "setNotifiedIdsByTarget">,
  only_when_empty: boolean
) => {
  if (drafts.length === 0) return;
  const main = drafts.find((draft) => draft.parent_id === null);
  const replies = drafts.filter((draft) => draft.parent_id !== null);

  if (main) options.setComposerText((current) => (only_when_empty && current.trim() !== "" ? current : main.body));
  if (replies.length > 0) {
    options.setReplyTextByComment((current) => {
      const next = { ...current };
      replies.forEach((draft) => {
        const target = String(draft.parent_id);
        if (!only_when_empty || !(next[target] ?? "").trim()) next[target] = draft.body;
      });
      return next;
    });
  }

  const seedIds = (pick: (draft: CommentDraftRecord) => number[]) => (current: IdsByTarget) => {
    const next = { ...current };
    drafts.forEach((draft) => {
      const target = draft.parent_id === null ? "composer" : String(draft.parent_id);
      if (only_when_empty && (next[target] ?? []).length > 0) return;
      next[target] = toStringIds(pick(draft));
    });
    return next;
  };
  options.setMentionIdsByTarget(seedIds((draft) => draft.mentioned_user_ids));
  options.setNotifiedIdsByTarget(seedIds((draft) => draft.notified_user_ids));
};

/**
 * Keeps the item drawer's (or the board discussion's) update and reply boxes
 * in step with the shared draft store, so text typed there survives closing
 * the drawer, opening another item to look something up, reloading the page
 * or moving to another device. Each change is saved as it happens, the
 * picked `@mention` and "Notify" people included, a draft is restored the
 * moment its item opens and removed once it is sent or discarded.
 */
export function useComposerDrafts(options: UseComposerDraftsOptions): ComposerDraftsApi {
  const { board_id, item_id, is_active, mention_ids_by_target, notified_ids_by_target } = options;
  const owner_id = useCommentDraftOwner();
  const { info: toastInfo } = useToast();
  const is_enabled = board_id !== undefined && owner_id !== null;

  // The latest setters and scope, read by async restores and the context's callbacks.
  const options_ref = useRef(options);
  options_ref.current = options;
  const scope_key = is_enabled && is_active ? `${board_id}:${item_id ?? "board"}` : null;
  const scope_key_ref = useRef(scope_key);
  scope_key_ref.current = scope_key;

  const addressOf = (target: DrawerComposerTarget, scope_board_id = board_id, scope_item_id = item_id): DraftAddress | null =>
    scope_board_id === undefined ? null : { board_id: scope_board_id, item_id: scope_item_id, parent_id: parentIdOf(target) };

  // People picked with `@mention` or "Notify" travel with the draft, so a restored one still notifies them once sent.
  useEffect(() => {
    if (!scope_key || board_id === undefined) return;
    const targets = new Set([...Object.keys(mention_ids_by_target), ...Object.keys(notified_ids_by_target)]);
    targets.forEach((target) => {
      commentDraftStore.updateDraft(
        { board_id, item_id, parent_id: parentIdOf(target) },
        { mentioned_user_ids: (mention_ids_by_target[target] ?? []).map(Number), notified_user_ids: (notified_ids_by_target[target] ?? []).map(Number) }
      );
    });
  }, [scope_key, board_id, item_id, mention_ids_by_target, notified_ids_by_target]);

  const restoreDrafts = (scope_board_id = board_id, scope_item_id = item_id) => {
    if (scope_board_id === undefined || owner_id === null) return;
    // What this browser already holds restores right away, before any request.
    seedFromDrafts(commentDraftStore.getScopeDrafts(scope_board_id, scope_item_id), options_ref.current, false);
    if (commentDraftStore.isBoardLoaded(scope_board_id)) return;
    const expected_scope = `${scope_board_id}:${scope_item_id ?? "board"}`;
    void commentDraftStore.ensureBoardLoaded(scope_board_id).then(() => {
      // The viewer may have moved on, or started typing, while the drafts loaded.
      if (scope_key_ref.current !== expected_scope) return;
      seedFromDrafts(commentDraftStore.getScopeDrafts(scope_board_id, scope_item_id), options_ref.current, true);
    });
  };

  const saveDraftText = (target: DrawerComposerTarget, value: string) => {
    if (!scope_key) return;
    const address = addressOf(target);
    if (!address) return;
    commentDraftStore.updateDraft(address, {
      body: value,
      mentioned_user_ids: (mention_ids_by_target[target] ?? []).map(Number),
      notified_user_ids: (notified_ids_by_target[target] ?? []).map(Number),
    });
  };

  const clearDraft = (target: DrawerComposerTarget) => {
    const address = addressOf(target);
    if (address) commentDraftStore.clearDraft(address);
  };

  // Discard empties the box too, with a short Undo in case it was a slip.
  const discardDraft = (target: DrawerComposerTarget) => {
    const address = addressOf(target);
    if (!address) return;
    const discarded = commentDraftStore.getDraft(address);
    const current = options_ref.current;
    const resetTarget = (value: string, mentioned: string[], notified: string[]) => {
      if (target === "composer") current.setComposerText(value);
      else current.setReplyTextByComment((texts) => ({ ...texts, [target]: value }));
      current.setMentionIdsByTarget((ids) => ({ ...ids, [target]: mentioned }));
      current.setNotifiedIdsByTarget((ids) => ({ ...ids, [target]: notified }));
    };
    resetTarget("", [], []);
    commentDraftStore.clearDraft(address);
    if (!discarded) return;

    const scope_at_discard = scope_key_ref.current;
    toastInfo("Draft discarded", {
      action_text: "Undo",
      onAction: () => {
        commentDraftStore.updateDraft(address, {
          body: discarded.body,
          mentioned_user_ids: discarded.mentioned_user_ids,
          notified_user_ids: discarded.notified_user_ids,
        });
        if (scope_key_ref.current === scope_at_discard) {
          resetTarget(discarded.body, toStringIds(discarded.mentioned_user_ids), toStringIds(discarded.notified_user_ids));
        }
      },
    });
  };
  const discard_ref = useRef(discardDraft);
  discard_ref.current = discardDraft;

  const draft_context = useMemo<ComposerDraftContextValue | null>(
    () =>
      is_enabled && board_id !== undefined
        ? { board_id, item_id, discardDraft: (target: DrawerComposerTarget) => discard_ref.current(target) }
        : null,
    [is_enabled, board_id, item_id]
  );

  return { restoreDrafts, saveDraftText, clearDraft, draft_context };
}
