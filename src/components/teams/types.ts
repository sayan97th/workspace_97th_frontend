import type { BoardPersonOption } from "@/components/board";

/** A person entry in the account-wide Teams directory — the board roster plus the fields the Teams views need. */
export type TeamMember = BoardPersonOption & {
  email: string;
  title?: string;
  is_owner?: boolean;
};

/**
 * One team in the account. Rosters are fetched separately (and paginated) per
 * team rather than embedded here, so this stays cheap to list.
 */
export type Team = {
  id: string;
  name: string;
  member_count: number;
};

export type TeamsTabId = "users" | "content";
