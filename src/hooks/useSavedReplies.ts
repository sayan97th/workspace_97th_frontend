"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { savedRepliesService, type SavedReplyDto, type SavedReplyPayload } from "@/services/saved-replies.service";

/**
 * One shared copy of the signed-in user's saved replies, so every composer on
 * the page (the item drawer, the board discussion, each reply box) sees the
 * same list and a reply saved in one shows up in all of them right away.
 * Loaded lazily, the first time a composer needs it, and dropped when a
 * different user signs in so one person's templates never show for another.
 */
type Listener = (replies: SavedReplyDto[]) => void;

let cache_owner_id: number | null = null;
let replies_cache: SavedReplyDto[] | null = null;
let load_promise: Promise<void> | null = null;
const listeners = new Set<Listener>();

const publish = (next: SavedReplyDto[]) => {
  replies_cache = next;
  listeners.forEach((listener) => listener(next));
};

const byTitle = (a: SavedReplyDto, b: SavedReplyDto): number => a.title.localeCompare(b.title) || a.id - b.id;

export function useSavedReplies() {
  const { user } = useAuth();
  const user_id = user?.id ?? null;
  const [saved_replies, setSavedReplies] = useState<SavedReplyDto[]>(() => (cache_owner_id === user_id && replies_cache ? replies_cache : []));

  useEffect(() => {
    listeners.add(setSavedReplies);
    return () => {
      listeners.delete(setSavedReplies);
    };
  }, []);

  // A different person signed in: forget the previous user's templates.
  useEffect(() => {
    if (cache_owner_id === user_id) return;
    cache_owner_id = user_id;
    replies_cache = null;
    load_promise = null;
    setSavedReplies([]);
  }, [user_id]);

  /** Fetches the list the first time it is needed, later calls reuse it. */
  const ensureLoaded = useCallback(() => {
    if (user_id === null || replies_cache || load_promise) return;
    const owner_id = user_id;
    load_promise = savedRepliesService
      .listSavedReplies()
      .then((replies) => {
        if (cache_owner_id === owner_id) publish(replies);
      })
      .catch(() => {
        // Left unloaded, so the next open tries again.
      })
      .finally(() => {
        load_promise = null;
      });
  }, [user_id]);

  const saveReply = useCallback(async (payload: SavedReplyPayload): Promise<SavedReplyDto> => {
    const created = await savedRepliesService.createSavedReply(payload);
    publish([...(replies_cache ?? []), created].sort(byTitle));
    return created;
  }, []);

  const deleteReply = useCallback(async (id: number) => {
    const previous = replies_cache ?? [];
    publish(previous.filter((reply) => reply.id !== id));
    await savedRepliesService.deleteSavedReply(id).catch(() => publish(previous));
  }, []);

  return { saved_replies, ensureLoaded, saveReply, deleteReply };
}
