import type { BoardPersonOption } from "@/components/board";

/** A person entry in the account-wide Teams directory — the board roster plus the fields the Teams views need. */
export type TeamMember = BoardPersonOption & {
  email: string;
  title?: string;
  /** The account owner (super admin). */
  is_owner?: boolean;
  /** Delegated to manage the roster of the team being listed. */
  is_team_owner?: boolean;
};

/**
 * One team in the account. Rosters are fetched separately (and paginated) per
 * team rather than embedded here, so this stays cheap to list.
 */
export type Team = {
  id: string;
  name: string;
  member_count: number;
  owners: TeamMember[];
  /** The viewer may rename or delete the team and pick its owners. */
  can_manage: boolean;
  /** The viewer may add and remove this team's members. */
  can_manage_members: boolean;
};

export type TeamsTabId = "users" | "content";
