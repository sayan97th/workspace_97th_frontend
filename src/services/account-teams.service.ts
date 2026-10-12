import { apiClient } from "@/lib/api-client";
import type {
  AccountTeamBoardDto,
  AccountTeamDto,
  AccountTeamMembersPage,
  AllAccountTeamMembersPage,
  CreateAccountTeamPayload,
  MemberListQuery,
  UpdateAccountTeamPayload,
} from "@/types/account-teams";

const buildQuery = (query?: MemberListQuery): string => {
  const params = new URLSearchParams();
  if (query?.search) params.set("search", query.search);
  if (query?.page) params.set("page", String(query.page));
  if (query?.per_page) params.set("per_page", String(query.per_page));
  if (query?.exclude_team_id) params.set("exclude_team_id", query.exclude_team_id);
  if (query?.include_guests) params.set("include_guests", "1");
  const search = params.toString();
  return search ? `?${search}` : "";
};

/**
 * Talks to the Laravel account-teams API. Every call goes through the shared
 * {@link apiClient}, so it inherits the bearer-token auth + 401 refresh handling.
 */
export const accountTeamsService = {
  /** GET /api/account-teams, the Teams rail's team list. */
  async getTeams(search?: string): Promise<AccountTeamDto[]> {
    const response = await apiClient.get<{ data: AccountTeamDto[] }>(
      `/api/account-teams${search ? `?search=${encodeURIComponent(search)}` : ""}`
    );
    return response.data;
  },

  /** POST /api/account-teams, create a team, optionally seeded with an initial roster. */
  async createTeam(payload: CreateAccountTeamPayload): Promise<AccountTeamDto> {
    const response = await apiClient.post<{ team: AccountTeamDto }>("/api/account-teams", payload);
    return response.team;
  },

  /** PATCH /api/account-teams/{id}, rename a team, move it under another team or toggle guests. */
  async updateTeam(team_id: string, payload: UpdateAccountTeamPayload): Promise<AccountTeamDto> {
    const response = await apiClient.patch<{ team: AccountTeamDto }>(
      `/api/account-teams/${team_id}`,
      payload
    );
    return response.team;
  },

  /** DELETE /api/account-teams/{id}. */
  async deleteTeam(team_id: string): Promise<void> {
    await apiClient.delete(`/api/account-teams/${team_id}`);
  },

  /** GET /api/account-teams/{id}/members, one team's roster, searched + paginated. */
  async getTeamMembers(team_id: string, query?: MemberListQuery): Promise<AccountTeamMembersPage> {
    return apiClient.get<AccountTeamMembersPage>(
      `/api/account-teams/${team_id}/members${buildQuery(query)}`
    );
  },

  /** PUT /api/account-teams/{id}/members, replace a team's roster wholesale. */
  async syncTeamMembers(team_id: string, member_ids: string[]): Promise<AccountTeamDto> {
    const response = await apiClient.put<{ team: AccountTeamDto }>(`/api/account-teams/${team_id}/members`, { member_ids });
    return response.team;
  },

  /** POST /api/account-teams/{id}/members, add members without disturbing the existing roster. */
  async addTeamMembers(team_id: string, member_ids: string[]): Promise<AccountTeamDto> {
    const response = await apiClient.post<{ team: AccountTeamDto }>(
      `/api/account-teams/${team_id}/members`,
      { member_ids }
    );
    return response.team;
  },

  /** DELETE /api/account-teams/{id}/members/{user_id}, remove a single member from the roster. */
  async removeTeamMember(team_id: string, user_id: string): Promise<AccountTeamDto> {
    const response = await apiClient.delete<{ team: AccountTeamDto }>(
      `/api/account-teams/${team_id}/members/${user_id}`
    );
    return response.team;
  },

  /** PUT /api/account-teams/{id}/owners/{user_id}, make a staff user a team owner, joining the roster if needed. Admin only. */
  async assignTeamOwner(team_id: string, user_id: string): Promise<AccountTeamDto> {
    const response = await apiClient.put<{ team: AccountTeamDto }>(
      `/api/account-teams/${team_id}/owners/${user_id}`,
      {}
    );
    return response.team;
  },

  /** DELETE /api/account-teams/{id}/owners/{user_id}, drop the owner delegation but keep the user on the roster. Admin only. */
  async removeTeamOwner(team_id: string, user_id: string): Promise<AccountTeamDto> {
    const response = await apiClient.delete<{ team: AccountTeamDto }>(
      `/api/account-teams/${team_id}/owners/${user_id}`
    );
    return response.team;
  },

  /** GET /api/account-team-members, "All users": every staff user and team guest with their teams. */
  async getAllMembers(query?: MemberListQuery): Promise<AllAccountTeamMembersPage> {
    return apiClient.get<AllAccountTeamMembersPage>(`/api/account-team-members${buildQuery(query)}`);
  },

  /** GET /api/account-team-candidates, the people directory a member picker searches against. */
  async getCandidates(query?: MemberListQuery): Promise<AccountTeamMembersPage> {
    return apiClient.get<AccountTeamMembersPage>(`/api/account-team-candidates${buildQuery(query)}`);
  },

  /**
   * POST /api/account-teams/{id}/picture or /cover, upload (or replace) the team's picture or cover
   * image. A cover may come with the vertical position it should start framed at.
   */
  async uploadTeamImage(team_id: string, kind: AccountTeamImageKind, file: File, cover_position_y?: number): Promise<AccountTeamDto> {
    const form_data = new FormData();
    form_data.append("file", file);
    if (kind === "cover" && cover_position_y !== undefined) {
      form_data.append("cover_position_y", String(Math.round(cover_position_y)));
    }
    const response = await apiClient.postFormData<{ team: AccountTeamDto }>(`/api/account-teams/${team_id}/${kind}`, form_data);
    return response.team;
  },

  /** PATCH /api/account-teams/{id}/cover, save where the cover is framed inside the banner. */
  async updateTeamCoverPosition(team_id: string, cover_position_y: number): Promise<AccountTeamDto> {
    const response = await apiClient.patch<{ team: AccountTeamDto }>(`/api/account-teams/${team_id}/cover`, {
      cover_position_y: Math.round(cover_position_y),
    });
    return response.team;
  },

  /** DELETE /api/account-teams/{id}/picture or /cover, fall back to the default art. */
  async removeTeamImage(team_id: string, kind: AccountTeamImageKind): Promise<AccountTeamDto> {
    const response = await apiClient.delete<{ team: AccountTeamDto }>(`/api/account-teams/${team_id}/${kind}`);
    return response.team;
  },

  /** GET /api/account-teams/{id}/boards, the team's Content tab. */
  async getTeamBoards(team_id: string): Promise<AccountTeamBoardDto[]> {
    const response = await apiClient.get<{ data: AccountTeamBoardDto[] }>(`/api/account-teams/${team_id}/boards`);
    return response.data;
  },

  /** GET /api/account-teams/{id}/board-candidates, boards the team could join. */
  async getBoardCandidates(team_id: string, search?: string): Promise<AccountTeamBoardDto[]> {
    const response = await apiClient.get<{ data: AccountTeamBoardDto[] }>(
      `/api/account-teams/${team_id}/board-candidates${search ? `?search=${encodeURIComponent(search)}` : ""}`
    );
    return response.data;
  },

  /** POST /api/account-teams/{id}/boards, the team joins boards and its members get access to them. */
  async addTeamBoards(team_id: string, board_ids: string[]): Promise<AccountTeamDto> {
    const response = await apiClient.post<{ team: AccountTeamDto }>(`/api/account-teams/${team_id}/boards`, { board_ids });
    return response.team;
  },

  /** DELETE /api/account-teams/{id}/boards/{board_id}, take a board off the Content tab. */
  async removeTeamBoard(team_id: string, board_id: string): Promise<AccountTeamDto> {
    const response = await apiClient.delete<{ team: AccountTeamDto }>(`/api/account-teams/${team_id}/boards/${board_id}`);
    return response.team;
  },
};

export type AccountTeamImageKind = "picture" | "cover";
