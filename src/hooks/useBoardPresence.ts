"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { getEcho } from "@/lib/echo";

export interface PresenceUser {
  id: number;
  name: string;
  avatar: string | null;
}

/**
 * Tracks who else is currently viewing a board's Table tab, via the
 * `presence-board.{board_id}` Reverb channel (see `routes/channels.php`) —
 * mirrors `useBoardImportProgress`'s Echo subscribe/cleanup lifecycle, but
 * joins a presence channel instead of listening on a private one. Returns an
 * empty list (and never joins) while the viewer has "Hide online status" on,
 * since a presence channel makes every joiner visible to every other joiner:
 * there is no "invisible but still watching" middle ground.
 */
export function useBoardPresence(board_id: number): PresenceUser[] {
  const [presence_users, setPresenceUsers] = useState<PresenceUser[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const token = getToken();
    if (!user || !token || user.hide_online_status) {
      setPresenceUsers([]);
      return;
    }

    const echo = getEcho(token);
    const channel_name = `presence-board.${board_id}`;
    echo
      .join(channel_name)
      .here((members: PresenceUser[]) => setPresenceUsers(members.filter((member) => member.id !== user.id)))
      .joining((member: PresenceUser) => setPresenceUsers((current) => [...current, member]))
      .leaving((member: PresenceUser) => setPresenceUsers((current) => current.filter((existing) => existing.id !== member.id)));

    return () => echo.leave(channel_name);
  }, [board_id, user]);

  return presence_users;
}
