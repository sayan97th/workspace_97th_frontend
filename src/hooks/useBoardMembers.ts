"use client";

import { useEffect, useMemo, useState } from "react";
import { boardInvitationService } from "@/services/board-invitation.service";
import type { BoardMember } from "@/types/board-invitation";

export type BoardMembersState = {
  /** Null until the first answer arrives (or when it failed), so callers can tell "nobody" from "not known yet". */
  members: BoardMember[] | null;
  /** Ids of `members` as strings, the id format People cells and pickers use. Empty while `members` is null. */
  member_ids: ReadonlySet<string>;
  is_loaded: boolean;
};

/**
 * The people added to a board (`GET /api/boards/{id}/members`), the only ones its People pickers,
 * `@mention` pickers and Notify pickers may offer. Pass a `reload_key` that changes whenever who has
 * access changes (people invited or removed, the board switched to or from private) to fetch again.
 *
 * While loading, or when the request fails, nobody is offered: listing the whole workspace instead
 * would show people the board was never shared with. The API applies the same rule on every write.
 */
export function useBoardMembers(board_id: number, reload_key = ""): BoardMembersState {
  const [loaded, setLoaded] = useState<{ board_id: number; members: BoardMember[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    boardInvitationService
      .listMembers(board_id)
      .then((members) => {
        if (!cancelled) setLoaded({ board_id, members });
      })
      .catch(() => {
        // Keep the previous answer for this board, if any, rather than emptying every picker.
      });
    return () => {
      cancelled = true;
    };
  }, [board_id, reload_key]);

  // An answer that belongs to the previous board never leaks into this one.
  const members = loaded?.board_id === board_id ? loaded.members : null;
  const member_ids = useMemo(() => new Set((members ?? []).map((member) => String(member.id))), [members]);

  return { members, member_ids, is_loaded: members !== null };
}
