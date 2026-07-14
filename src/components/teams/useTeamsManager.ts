"use client";
import { useState } from "react";
import type { Team, TeamMember, TeamsTabId } from "./types";

export const ALL_TEAMS_ID = "all";

const createTeamId = () => `custom-${Math.random().toString(36).slice(2, 10)}`;

export type TeamsManagerConfig = {
  teams: Team[];
  members: TeamMember[];
};

export type TeamRow = {
  id: string;
  name: string;
  member_count: number;
  is_selected: boolean;
  select: () => void;
};

export type TeamsManagerApi = {
  members: TeamMember[];

  teams: Team[];
  team_query: string;
  setTeamQuery: (value: string) => void;
  team_rows: TeamRow[];
  total_team_count: number;

  selected_team_id: string;
  selectTeam: (id: string) => void;
  is_all_selected: boolean;
  selected_team: Team | null;

  active_tab: TeamsTabId;
  setActiveTab: (tab: TeamsTabId) => void;

  panel_title: string;
  panel_subtitle: string;

  user_query: string;
  setUserQuery: (value: string) => void;
  visible_members: TeamMember[];

  is_create_team_open: boolean;
  openCreateTeam: () => void;
  closeCreateTeam: () => void;
  new_team_name: string;
  setNewTeamName: (value: string) => void;
  new_team_member_ids: string[];
  setNewTeamMemberIds: (ids: string[]) => void;
  can_create_team: boolean;
  createTeam: () => void;
};

/**
 * Owns all Teams-view state — team selection/search, the Users/Content tabs, the member
 * search, and the "Create new team" sub-flow — behind one config-in/API-out hook so
 * {@link TeamsModal} and its panels stay presentational. Mirrors the board toolbar's
 * `useBoardToolbar(config) -> Api` shape.
 */
export function useTeamsManager({ teams, members }: TeamsManagerConfig): TeamsManagerApi {
  const [custom_teams, setCustomTeams] = useState<Team[]>([]);
  const [team_query, setTeamQuery] = useState("");
  const [selected_team_id, setSelectedTeamId] = useState<string>(ALL_TEAMS_ID);
  const [active_tab, setActiveTab] = useState<TeamsTabId>("users");
  const [user_query, setUserQuery] = useState("");

  const [is_create_team_open, setIsCreateTeamOpen] = useState(false);
  const [new_team_name, setNewTeamName] = useState("");
  const [new_team_member_ids, setNewTeamMemberIds] = useState<string[]>([]);

  const all_teams = [...teams, ...custom_teams];

  const findMember = (id: string) => members.find((member) => member.id === id);

  const selectTeam = (id: string) => {
    setSelectedTeamId(id);
    setActiveTab("users");
    setUserQuery("");
  };

  const trimmed_team_query = team_query.trim().toLowerCase();
  const filtered_teams = trimmed_team_query
    ? all_teams.filter((team) => team.name.toLowerCase().includes(trimmed_team_query))
    : all_teams;

  const is_all_selected = selected_team_id === ALL_TEAMS_ID;
  const selected_team = is_all_selected
    ? null
    : all_teams.find((team) => team.id === selected_team_id) ?? null;

  const all_members_deduped = Array.from(
    new Map(
      all_teams.flatMap((team) => team.member_ids).map((id) => [id, findMember(id)])
    ).values()
  ).filter((member): member is TeamMember => Boolean(member));

  const members_for_selection = selected_team
    ? selected_team.member_ids
        .map((id) => findMember(id))
        .filter((member): member is TeamMember => Boolean(member))
    : all_members_deduped;

  const trimmed_user_query = user_query.trim().toLowerCase();
  const visible_members = trimmed_user_query
    ? members_for_selection.filter(
        (member) =>
          member.name.toLowerCase().includes(trimmed_user_query) ||
          member.email.toLowerCase().includes(trimmed_user_query)
      )
    : members_for_selection;

  const openCreateTeam = () => {
    setIsCreateTeamOpen(true);
    setNewTeamName("");
    setNewTeamMemberIds([]);
  };
  const closeCreateTeam = () => setIsCreateTeamOpen(false);

  const trimmed_new_team_name = new_team_name.trim();
  const can_create_team = trimmed_new_team_name !== "";

  const createTeam = () => {
    if (!can_create_team) return;
    const team: Team = {
      id: createTeamId(),
      name: trimmed_new_team_name,
      member_ids: new_team_member_ids,
    };
    setCustomTeams((current) => [...current, team]);
    setIsCreateTeamOpen(false);
    selectTeam(team.id);
  };

  return {
    members,

    teams: all_teams,
    team_query,
    setTeamQuery,
    team_rows: filtered_teams.map((team) => ({
      id: team.id,
      name: team.name,
      member_count: team.member_ids.length,
      is_selected: selected_team_id === team.id,
      select: () => selectTeam(team.id),
    })),
    total_team_count: all_teams.length,

    selected_team_id,
    selectTeam,
    is_all_selected,
    selected_team,

    active_tab,
    setActiveTab,

    panel_title: selected_team ? selected_team.name : "All members",
    panel_subtitle: selected_team
      ? `${selected_team.member_ids.length} ${selected_team.member_ids.length === 1 ? "member" : "members"}`
      : `${all_members_deduped.length} people across ${all_teams.length} teams`,

    user_query,
    setUserQuery,
    visible_members,

    is_create_team_open,
    openCreateTeam,
    closeCreateTeam,
    new_team_name,
    setNewTeamName,
    new_team_member_ids,
    setNewTeamMemberIds,
    can_create_team,
    createTeam,
  };
}
