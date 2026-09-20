/**
 * API types for the account-wide Teams directory.
 *
 * These mirror the Laravel `AccountTeamResource` / `AccountTeamMemberResource`
 * payloads. Teams sit above any single workspace — membership is drawn from
 * (and only ever shows) the internal staff roster, never client-portal users.
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
  member_count: number;
  owners: AccountTeamOwnerDto[];
  /** Create, rename, delete and pick owners: admins and the account owner only. */
  can_manage: boolean;
  /** Add and remove members: admins, the account owner and this team's owners. */
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
};

export type PaginatedResult<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export type AccountTeamMembersPage = PaginatedResult<AccountTeamMemberDto>;

/** `GET /api/account-team-members` additionally reports how many teams exist, for the "All members" subtitle. */
export type AllAccountTeamMembersPage = AccountTeamMembersPage & {
  team_count: number;
};

export type CreateAccountTeamPayload = {
  name: string;
  member_ids?: string[];
};

export type UpdateAccountTeamPayload = {
  name: string;
};

export type MemberListQuery = {
  search?: string;
  page?: number;
  per_page?: number;
  /** Candidate directory only: leave out staff already on this team. */
  exclude_team_id?: string;
};
