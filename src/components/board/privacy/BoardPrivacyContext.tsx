"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BoardPersonOption } from "@/components/board/toolbar/types";

export type BoardPrivacy = {
  /** True on a private board: only its creator, owner and invited people can open it, assign or be notified. */
  is_private_board: boolean;
  /** Opens the board's invite dialog, omitted when the viewer cannot invite or there is no dialog. */
  onInviteClick?: () => void;
  /**
   * Active workspace members who were not added to this private board, empty on other boards.
   * A pasted `@Name` of theirs is flagged "not on this board" instead of "not found", the way
   * Slack points out someone mentioned who is not in the channel.
   */
  outside_people?: BoardPersonOption[];
};

const DEFAULT_PRIVACY: BoardPrivacy = { is_private_board: false };

const BoardPrivacyContext = createContext<BoardPrivacy>(DEFAULT_PRIVACY);

/**
 * Tells every picker inside a board (People cells, `@mention` and Notify pickers, portaled ones
 * included) whether the board is private, without threading a prop through the table state.
 * Outside a provider the board counts as not private, so the Update Feed and other boardless
 * hosts keep their usual look.
 */
export function BoardPrivacyProvider({ value, children }: { value: BoardPrivacy; children: ReactNode }) {
  return <BoardPrivacyContext.Provider value={value}>{children}</BoardPrivacyContext.Provider>;
}

export function useBoardPrivacy(): BoardPrivacy {
  return useContext(BoardPrivacyContext);
}
