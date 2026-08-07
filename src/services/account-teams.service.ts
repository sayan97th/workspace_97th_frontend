import { apiClient } from "@/lib/api-client";
import type {
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
  const search = params.toString();
  return search ? `?${search}` : "";
};

/**
 * Talks to the Laravel account-teams API. Every call goes through the shared
 * {@link apiClient}, so it inherits the bearer-token auth + 401 refresh handling.
 */
export const accountTeamsService = {
  /** GET /api/account-teams — the Teams rail's team list. */
  async getTeams(search?: string): Promise<AccountTeamDto[]> {
    const response = await apiClient.get<{ data: AccountTeamDto[] }>(
      `/api/account-teams${search ? `?search=${encodeURIComponent(search)}` : ""}`
    );
    return response.data;
  },

  /** POST /api/account-teams — create a team, optionally seeded with an initial roster. */
  async createTeam(payload: CreateAccountTeamPayload): Promise<AccountTeamDto> {
    const response = await apiClient.post<{ team: AccountTeamDto }>("/api/account-teams", payload);
    return response.team;
  },

  /** PATCH /api/account-teams/{id} — rename a team. */
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

  /** GET /api/account-teams/{id}/members — one team's roster, searched + paginated. */
  async getTeamMembers(team_id: string, query?: MemberListQuery): Promise<AccountTeamMembersPage> {
    return apiClient.get<AccountTeamMembersPage>(
      `/api/account-teams/${team_id}/members${buildQuery(query)}`
    );
  },

  /** PUT /api/account-teams/{id}/members — replace a team's roster wholesale. */
  async syncTeamMembers(team_id: string, member_ids: string[]): Promise<void> {
    await apiClient.put(`/api/account-teams/${team_id}/members`, { member_ids });
  },

  /** GET /api/account-team-members — the account-wide "All members" dedupe. */
  async getAllMembers(query?: MemberListQuery): Promise<AllAccountTeamMembersPage> {
    return apiClient.get<AllAccountTeamMembersPage>(`/api/account-team-members${buildQuery(query)}`);
  },

  /** GET /api/account-team-candidates — the staff directory a member picker searches against. */
  async getCandidates(query?: MemberListQuery): Promise<AccountTeamMembersPage> {
    return apiClient.get<AccountTeamMembersPage>(`/api/account-team-candidates${buildQuery(query)}`);
  },
};
