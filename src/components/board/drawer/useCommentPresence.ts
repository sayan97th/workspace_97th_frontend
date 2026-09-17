"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { getEcho } from "@/lib/echo";

export type CommentPresenceUser = {
  id: number;
  name: string;
  avatar: string | null;
};

/** How long a "typing" whisper stays valid before that person drops off the indicator, absent a follow-up whisper refreshing it. */
const TYPING_TIMEOUT_MS = 3000;

/**
 * Live "who's viewing this thread" + "who's typing" for the item drawer's
 * Updates tab / the board discussion drawer — joins `channel_name` (a
 * `presence-board-item.{id}` or `presence-board-discussion.{id}` channel,
 * see `routes/channels.php`) only while `channel_name` is non-null (i.e.
 * only while that specific drawer is open), mirroring `useBoardPresence`'s
 * join/leave lifecycle. Typing is a pure client-to-client whisper (no DB
 * write, no `Notification`/broadcast event) — each whisper refreshes a
 * per-user timeout that drops them from {@link typing_names} after
 * {@link TYPING_TIMEOUT_MS} of silence.
 */
export function useCommentPresence(channel_name: string | null) {
  const { user } = useAuth();
  const [presence_users, setPresenceUsers] = useState<CommentPresenceUser[]>([]);
  const [typing_names, setTypingNames] = useState<string[]>([]);
  const channel_ref = useRef<ReturnType<ReturnType<typeof getEcho>["join"]> | null>(null);
  const typing_timeouts_ref = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const token = getToken();
    if (!channel_name || !user || !token || user.hide_online_status) {
      setPresenceUsers([]);
      setTypingNames([]);
      return;
    }

    const echo = getEcho(token);
    const channel = echo
      .join(channel_name)
      .here((members: CommentPresenceUser[]) => setPresenceUsers(members.filter((member) => member.id !== user.id)))
      .joining((member: CommentPresenceUser) => setPresenceUsers((current) => [...current, member]))
      .leaving((member: CommentPresenceUser) => setPresenceUsers((current) => current.filter((existing) => existing.id !== member.id)))
      .listenForWhisper("typing", (payload: { id: number; name: string }) => {
        if (payload.id === user.id) return;

        const timeouts = typing_timeouts_ref.current;
        const existing_timeout = timeouts.get(payload.id);
        if (existing_timeout) clearTimeout(existing_timeout);

        setTypingNames((current) => (current.includes(payload.name) ? current : [...current, payload.name]));
        timeouts.set(
          payload.id,
          setTimeout(() => {
            setTypingNames((current) => current.filter((name) => name !== payload.name));
            timeouts.delete(payload.id);
          }, TYPING_TIMEOUT_MS)
        );
      });

    channel_ref.current = channel;

    return () => {
      for (const timeout of typing_timeouts_ref.current.values()) clearTimeout(timeout);
      typing_timeouts_ref.current.clear();
      channel_ref.current = null;
      echo.leave(channel_name);
    };
  }, [channel_name, user]);

  const whisperTyping = useCallback(() => {
    if (!user || !channel_ref.current) return;
    channel_ref.current.whisper("typing", { id: user.id, name: user.full_name });
  }, [user]);

  return { presence_users, typing_names, whisperTyping };
}
