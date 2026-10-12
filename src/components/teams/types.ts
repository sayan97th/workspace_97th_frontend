import type { BoardPersonOption } from "@/components/board";
import type { AccountTeamBoardDto } from "@/types/account-teams";

/** A team as shown next to a person in "All users". */
export type TeamSummary = {
  id: string;
  name: string;
  picture_url: string | null;
};

/** A person entry in the account-wide Teams directory, the board roster plus the fields the Teams views need. */
export type TeamMember = BoardPersonOption & {
  email: string;
  title?: string;
  /** The account owner (super admin). */
  is_owner?: boolean;
  /** Delegated to manage the roster of the team being listed. */
  is_team_owner?: boolean;
  /** A client account, only found on teams that allow guests. */
  is_guest?: boolean;
  /** The teams this person belongs to, only filled on "All users". */
  teams?: TeamSummary[];
};

/**
 * One team in the account. Rosters are fetched separately (and paginated) per
 * team rather than embedded here, so this stays cheap to list.
 */
export type Team = {
  id: string;
  name: string;
  /** The team this one is a sub-team of, `null` for a top level team. */
  parent_id: string | null;
  allow_guests: boolean;
  picture_url: string | null;
  cover_url: string | null;
  member_count: number;
  sub_team_count: number;
  board_count: number;
  owners: TeamMember[];
  /** The viewer is on this team's roster. */
  is_member: boolean;
  /** The viewer is one of this team's owners. */
  is_viewer_owner: boolean;
  /** The viewer may rename, move or delete the team and pick its owners. */
  can_manage: boolean;
  /** The viewer may change the roster, the picture, the cover and the boards the team joined. */
  can_manage_members: boolean;
};

export type TeamBoard = AccountTeamBoardDto;

export type TeamsTabId = "users" | "sub_teams" | "content";

/** Rail filters, monday's "Filter teams" menu. */
export type TeamsFilterId = "all" | "member" | "owner" | "guests";
