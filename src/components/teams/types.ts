import type { BoardPersonOption } from "@/components/board";

/** A person entry in the account-wide Teams directory — the board roster plus the fields the Teams views need. */
export type TeamMember = BoardPersonOption & {
  email: string;
  title?: string;
  is_owner?: boolean;
};

/** One team in the account. `member_ids` reference {@link TeamMember.id}. */
export type Team = {
  id: string;
  name: string;
  member_ids: string[];
};

export type TeamsTabId = "users" | "content";
