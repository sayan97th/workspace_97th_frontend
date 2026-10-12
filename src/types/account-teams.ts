/**
 * API types for the account-wide Teams directory.
 *
 * These mirror the Laravel `AccountTeamResource` / `AccountTeamMemberResource`
 * payloads. Teams sit above any single workspace. Membership is drawn from the
 * internal staff roster, and from guests (client accounts) only on a team that
 * allows guests.
 */

/** A team owner as embedded in {@link AccountTeamDto}, enough to draw an avatar and a tooltip. */
export type AccountTeamOwnerDto = {
  id: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
};

export type AccountTeamDto = {
  id: string;
  name: string;
  /** The team this one is a sub-team of, `null` for a top level team. */
  parent_id: string | null;
  /** The roster may include guests, the team can then only join shareable boards. */
  allow_guests: boolean;
  picture_url: string | null;
  cover_url: string | null;
  /** Vertical focal point of the cover inside the banner, 0 (top) to 100 (bottom). */
  cover_position_y: number;
  member_count: number;
  sub_team_count: number;
  board_count: number;
  owners: AccountTeamOwnerDto[];
  /** The viewer is on this team's roster. */
  is_member: boolean;
  /** The viewer is one of this team's owners. */
  is_viewer_owner: boolean;
  /** Create, rename, delete and pick owners: admins and the account owner only. */
  can_manage: boolean;
  /** Add and remove members, change the picture and cover, join boards: admins, the account owner and this team's owners. */
  can_manage_members: boolean;
  created_at: string;
};

export type AccountTeamMemberDto = {
  id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  profile_photo_url: string | null;
  /** The account owner (super admin), not to be confused with a team owner. */
  is_owner: boolean;
  /** Delegated to manage this team's roster, only set on a single team's roster. */
  is_team_owner: boolean;
  /** A client account, only found on teams that allow guests. */
  is_guest: boolean;
  is_deactivated: boolean;
  /** The teams this person belongs to, only sent by the "All users" listing. */
  teams?: AccountTeamSummaryDto[];
};

/** A team as listed next to a person in "All users". */
export type AccountTeamSummaryDto = {
  id: string;
  name: string;
  picture_url: string | null;
};

/** A board on a team's Content tab, or a candidate in its "Add boards" picker. */
export type AccountTeamBoardDto = {
  id: string;
  name: string;
  board_type: "main" | "private" | "shareable";
  is_archived: boolean;
  workspace: { id: string; name: string } | null;
  linked_at: string | null;
};

export type PaginatedResult<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export type AccountTeamMembersPage = PaginatedResult<AccountTeamMemberDto>;

/** `GET /api/account-team-members` ("All users") additionally reports how many teams exist. */
export type AllAccountTeamMembersPage = AccountTeamMembersPage & {
  team_count: number;
};

export type CreateAccountTeamPayload = {
  name: string;
  parent_id?: string | null;
  allow_guests?: boolean;
  member_ids?: string[];
};

export type UpdateAccountTeamPayload = {
  name?: string;
  parent_id?: string | null;
  allow_guests?: boolean;
};

export type MemberListQuery = {
  search?: string;
  page?: number;
  per_page?: number;
  /** Candidate directory only: leave out people already on this team (and include guests when it allows them). */
  exclude_team_id?: string;
  /** Candidate directory only: include guests (client accounts). */
  include_guests?: boolean;
};
