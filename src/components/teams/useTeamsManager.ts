"use client";
import { useCallback, useEffect, useState } from "react";
import { accountTeamsService } from "@/services/account-teams.service";
import type { ApiError } from "@/types/auth";
import type { AllAccountTeamMembersPage } from "@/types/account-teams";
import { mapAccountTeamMemberDtoToTeamMember } from "./teamMapping";
import type { Team, TeamMember, TeamsTabId } from "./types";

export const ALL_TEAMS_ID = "all";

/** Members fetched per page in the roster table — small enough to page through comfortably, large enough to rarely need it. */
const MEMBERS_PER_PAGE = 20;
/** Cap for one-shot "give me everyone" fetches (the member picker's candidate pool, and an edit dialog's current roster) — generous, but still a real limit against a very large staff directory. */
const DIRECTORY_PER_PAGE = 200;
const SEARCH_DEBOUNCE_MS = 300;

export type TeamRow = {
  id: string;
  name: string;
  member_count: number;
  is_selected: boolean;
  select: () => void;
};

export type TeamFormMode = "create" | "edit";

export type TeamsManagerApi = {
  teams: Team[];
  is_loading_teams: boolean;
  teams_error: string | null;
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
  is_loading_members: boolean;
  members_error: string | null;
  page: number;
  setPage: (page: number) => void;
  last_page: number;
  total_members: number;
  per_page: number;

  candidates: TeamMember[];
  is_loading_candidates: boolean;

  is_team_form_open: boolean;
  team_form_mode: TeamFormMode;
  team_form_name: string;
  setTeamFormName: (value: string) => void;
  team_form_member_ids: string[];
  setTeamFormMemberIds: (ids: string[]) => void;
  is_loading_team_form_roster: boolean;
  can_submit_team_form: boolean;
  is_submitting_team_form: boolean;
  team_form_error: string | null;
  openCreateTeam: () => void;
  openEditTeam: (team: Team) => void;
  closeTeamForm: () => void;
  submitTeamForm: () => Promise<void>;

  team_pending_delete: Team | null;
  requestDeleteTeam: (team: Team) => void;
  cancelDeleteTeam: () => void;
  confirmDeleteTeam: () => Promise<void>;

  is_add_members_open: boolean;
  add_member_candidates: TeamMember[];
  is_loading_add_member_candidates: boolean;
  add_member_selected_ids: string[];
  setAddMemberSelectedIds: (ids: string[]) => void;
  can_submit_add_members: boolean;
  is_submitting_add_members: boolean;
  add_members_error: string | null;
  openAddMembers: () => void;
  closeAddMembers: () => void;
  submitAddMembers: () => Promise<void>;

  member_pending_remove: TeamMember | null;
  requestRemoveMember: (member: TeamMember) => void;
  cancelRemoveMember: () => void;
  confirmRemoveMember: () => Promise<void>;
};

const apiErrorMessage = (error: unknown, fallback: string): string => {
  const api_error = error as ApiError;
  const field_message = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return field_message || api_error?.message || fallback;
};

/**
 * Owns all Teams-view state, backed by the real `account-teams` API: team
 * selection/search, the account-wide "All members" dedupe vs. a single team's
 * roster (both searched and paginated server-side), and the create/edit/delete
 * team flows. Mirrors the board toolbar's `useBoardToolbar(config) -> Api` shape
 * so {@link TeamsView} and its panels stay presentational.
 */
export function useTeamsManager(): TeamsManagerApi {
  const [teams, setTeams] = useState<Team[]>([]);
  const [is_loading_teams, setIsLoadingTeams] = useState(true);
  const [teams_error, setTeamsError] = useState<string | null>(null);
  const [team_query, setTeamQuery] = useState("");
  const [selected_team_id, setSelectedTeamId] = useState<string>(ALL_TEAMS_ID);
  const [active_tab, setActiveTab] = useState<TeamsTabId>("users");

  const [user_query, setUserQuery] = useState("");
  const [debounced_user_query, setDebouncedUserQuery] = useState("");
  const [page, setPage] = useState(1);
  const [visible_members, setVisibleMembers] = useState<TeamMember[]>([]);
  const [is_loading_members, setIsLoadingMembers] = useState(true);
  const [members_error, setMembersError] = useState<string | null>(null);
  const [last_page, setLastPage] = useState(1);
  const [total_members, setTotalMembers] = useState(0);
  const [all_members_team_count, setAllMembersTeamCount] = useState(0);
  /** Bumped to force the roster effect to re-run when a mutation (e.g. editing the currently-selected team's members) doesn't otherwise change its dependencies. */
  const [members_refresh_token, setMembersRefreshToken] = useState(0);

  const [candidates, setCandidates] = useState<TeamMember[]>([]);
  const [is_loading_candidates, setIsLoadingCandidates] = useState(false);

  const [is_team_form_open, setIsTeamFormOpen] = useState(false);
  const [team_form_mode, setTeamFormMode] = useState<TeamFormMode>("create");
  const [editing_team_id, setEditingTeamId] = useState<string | null>(null);
  const [team_form_name, setTeamFormName] = useState("");
  const [team_form_member_ids, setTeamFormMemberIds] = useState<string[]>([]);
  const [is_loading_team_form_roster, setIsLoadingTeamFormRoster] = useState(false);
  const [is_submitting_team_form, setIsSubmittingTeamForm] = useState(false);
  const [team_form_error, setTeamFormError] = useState<string | null>(null);

  const [team_pending_delete, setTeamPendingDelete] = useState<Team | null>(null);

  const [is_add_members_open, setIsAddMembersOpen] = useState(false);
  const [add_member_candidates, setAddMemberCandidates] = useState<TeamMember[]>([]);
  const [is_loading_add_member_candidates, setIsLoadingAddMemberCandidates] = useState(false);
  const [add_member_selected_ids, setAddMemberSelectedIds] = useState<string[]>([]);
  const [is_submitting_add_members, setIsSubmittingAddMembers] = useState(false);
  const [add_members_error, setAddMembersError] = useState<string | null>(null);

  const [member_pending_remove, setMemberPendingRemove] = useState<TeamMember | null>(null);

  const loadTeams = useCallback(async () => {
    setIsLoadingTeams(true);
    setTeamsError(null);
    try {
      const data = await accountTeamsService.getTeams();
      setTeams(data.map((team) => ({ id: team.id, name: team.name, member_count: team.member_count })));
    } catch {
      setTeamsError("We couldn't load your teams.");
    } finally {
      setIsLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  // Debounce the roster search so every keystroke doesn't fire a request.
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedUserQuery(user_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [user_query]);

  // A new selection or search always starts back on page 1.
  useEffect(() => {
    setPage(1);
  }, [selected_team_id, debounced_user_query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingMembers(true);
    setMembersError(null);

    const is_all = selected_team_id === ALL_TEAMS_ID;
    const request = is_all
      ? accountTeamsService.getAllMembers({ search: debounced_user_query, page, per_page: MEMBERS_PER_PAGE })
      : accountTeamsService.getTeamMembers(selected_team_id, {
          search: debounced_user_query,
          page,
          per_page: MEMBERS_PER_PAGE,
        });

    request
      .then((result) => {
        if (cancelled) return;
        setVisibleMembers(result.data.map(mapAccountTeamMemberDtoToTeamMember));
        setLastPage(result.last_page);
        setTotalMembers(result.total);
        if (is_all) setAllMembersTeamCount((result as AllAccountTeamMembersPage).team_count);
      })
      .catch(() => {
        if (!cancelled) setMembersError("We couldn't load this roster.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected_team_id, debounced_user_query, page, members_refresh_token]);

  const selectTeam = useCallback((id: string) => {
    setSelectedTeamId(id);
    setActiveTab("users");
    setUserQuery("");
  }, []);

  const trimmed_team_query = team_query.trim().toLowerCase();
  const filtered_teams = trimmed_team_query
    ? teams.filter((team) => team.name.toLowerCase().includes(trimmed_team_query))
    : teams;

  const is_all_selected = selected_team_id === ALL_TEAMS_ID;
  const selected_team = is_all_selected ? null : teams.find((team) => team.id === selected_team_id) ?? null;

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    try {
      const result = await accountTeamsService.getCandidates({ per_page: DIRECTORY_PER_PAGE });
      setCandidates(result.data.map(mapAccountTeamMemberDtoToTeamMember));
    } catch {
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  const openCreateTeam = useCallback(() => {
    setTeamFormMode("create");
    setEditingTeamId(null);
    setTeamFormName("");
    setTeamFormMemberIds([]);
    setTeamFormError(null);
    setIsTeamFormOpen(true);
    void loadCandidates();
  }, [loadCandidates]);

  const openEditTeam = useCallback(
    (team: Team) => {
      setTeamFormMode("edit");
      setEditingTeamId(team.id);
      setTeamFormName(team.name);
      setTeamFormMemberIds([]);
      setTeamFormError(null);
      setIsTeamFormOpen(true);
      void loadCandidates();

      setIsLoadingTeamFormRoster(true);
      accountTeamsService
        .getTeamMembers(team.id, { per_page: DIRECTORY_PER_PAGE })
        .then((result) => setTeamFormMemberIds(result.data.map((member) => member.id)))
        .catch(() => setTeamFormError("We couldn't load this team's current members."))
        .finally(() => setIsLoadingTeamFormRoster(false));
    },
    [loadCandidates]
  );

  const closeTeamForm = useCallback(() => setIsTeamFormOpen(false), []);

  const trimmed_team_form_name = team_form_name.trim();
  const can_submit_team_form = trimmed_team_form_name !== "" && !is_submitting_team_form;

  const submitTeamForm = useCallback(async () => {
    if (!can_submit_team_form) return;
    setIsSubmittingTeamForm(true);
    setTeamFormError(null);
    try {
      if (team_form_mode === "create") {
        const created = await accountTeamsService.createTeam({
          name: trimmed_team_form_name,
          member_ids: team_form_member_ids,
        });
        setTeams((current) => [
          ...current,
          { id: created.id, name: created.name, member_count: created.member_count },
        ]);
        selectTeam(created.id);
      } else if (editing_team_id) {
        const updated = await accountTeamsService.updateTeam(editing_team_id, {
          name: trimmed_team_form_name,
        });
        await accountTeamsService.syncTeamMembers(editing_team_id, team_form_member_ids);
        setTeams((current) =>
          current.map((team) =>
            team.id === editing_team_id
              ? { id: updated.id, name: updated.name, member_count: team_form_member_ids.length }
              : team
          )
        );
        if (selected_team_id === editing_team_id) {
          setMembersRefreshToken((token) => token + 1);
        }
      }
      setIsTeamFormOpen(false);
    } catch (error) {
      setTeamFormError(apiErrorMessage(error, "Something went wrong. Please try again."));
    } finally {
      setIsSubmittingTeamForm(false);
    }
  }, [
    can_submit_team_form,
    team_form_mode,
    trimmed_team_form_name,
    team_form_member_ids,
    editing_team_id,
    selected_team_id,
    selectTeam,
  ]);

  const requestDeleteTeam = useCallback((team: Team) => setTeamPendingDelete(team), []);
  const cancelDeleteTeam = useCallback(() => setTeamPendingDelete(null), []);

  const confirmDeleteTeam = useCallback(async () => {
    if (!team_pending_delete) return;
    const deleted_id = team_pending_delete.id;
    await accountTeamsService.deleteTeam(deleted_id);
    setTeams((current) => current.filter((team) => team.id !== deleted_id));
    if (selected_team_id === deleted_id) selectTeam(ALL_TEAMS_ID);
    setTeamPendingDelete(null);
  }, [team_pending_delete, selected_team_id, selectTeam]);

  /** Reflects a roster mutation's fresh `member_count` into the team list without a full refetch. */
  const applyMemberCount = useCallback((team_id: string, member_count: number) => {
    setTeams((current) => current.map((team) => (team.id === team_id ? { ...team, member_count } : team)));
  }, []);

  const openAddMembers = useCallback(() => {
    if (is_all_selected) return;
    setAddMemberSelectedIds([]);
    setAddMembersError(null);
    setIsAddMembersOpen(true);
    setIsLoadingAddMemberCandidates(true);
    accountTeamsService
      .getCandidates({ per_page: DIRECTORY_PER_PAGE, exclude_team_id: selected_team_id })
      .then((result) => setAddMemberCandidates(result.data.map(mapAccountTeamMemberDtoToTeamMember)))
      .catch(() => setAddMemberCandidates([]))
      .finally(() => setIsLoadingAddMemberCandidates(false));
  }, [is_all_selected, selected_team_id]);

  const closeAddMembers = useCallback(() => setIsAddMembersOpen(false), []);

  const can_submit_add_members = add_member_selected_ids.length > 0 && !is_submitting_add_members;

  const submitAddMembers = useCallback(async () => {
    if (!can_submit_add_members || is_all_selected) return;
    setIsSubmittingAddMembers(true);
    setAddMembersError(null);
    try {
      const updated = await accountTeamsService.addTeamMembers(selected_team_id, add_member_selected_ids);
      applyMemberCount(selected_team_id, updated.member_count);
      setMembersRefreshToken((token) => token + 1);
      setIsAddMembersOpen(false);
    } catch (error) {
      setAddMembersError(apiErrorMessage(error, "Something went wrong. Please try again."));
    } finally {
      setIsSubmittingAddMembers(false);
    }
  }, [can_submit_add_members, is_all_selected, selected_team_id, add_member_selected_ids, applyMemberCount]);

  const requestRemoveMember = useCallback((member: TeamMember) => setMemberPendingRemove(member), []);
  const cancelRemoveMember = useCallback(() => setMemberPendingRemove(null), []);

  const confirmRemoveMember = useCallback(async () => {
    if (!member_pending_remove || is_all_selected) return;
    const updated = await accountTeamsService.removeTeamMember(selected_team_id, member_pending_remove.id);
    applyMemberCount(selected_team_id, updated.member_count);
    // Removing the last row on a page beyond the first would otherwise leave that page empty.
    if (visible_members.length === 1 && page > 1) {
      setPage((current) => current - 1);
    } else {
      setMembersRefreshToken((token) => token + 1);
    }
    setMemberPendingRemove(null);
  }, [member_pending_remove, is_all_selected, selected_team_id, visible_members.length, page, applyMemberCount]);

  const total_team_count = teams.length;
  const all_members_total = is_all_selected ? total_members : 0;

  return {
    teams,
    is_loading_teams,
    teams_error,
    team_query,
    setTeamQuery,
    team_rows: filtered_teams.map((team) => ({
      id: team.id,
      name: team.name,
      member_count: team.member_count,
      is_selected: selected_team_id === team.id,
      select: () => selectTeam(team.id),
    })),
    total_team_count,

    selected_team_id,
    selectTeam,
    is_all_selected,
    selected_team,

    active_tab,
    setActiveTab,

    panel_title: selected_team ? selected_team.name : "All members",
    panel_subtitle: selected_team
      ? `${selected_team.member_count} ${selected_team.member_count === 1 ? "member" : "members"}`
      : `${all_members_total} people across ${all_members_team_count || total_team_count} teams`,

    user_query,
    setUserQuery,
    visible_members,
    is_loading_members,
    members_error,
    page,
    setPage,
    last_page,
    total_members,
    per_page: MEMBERS_PER_PAGE,

    candidates,
    is_loading_candidates,

    is_team_form_open,
    team_form_mode,
    team_form_name,
    setTeamFormName,
    team_form_member_ids,
    setTeamFormMemberIds,
    is_loading_team_form_roster,
    can_submit_team_form,
    is_submitting_team_form,
    team_form_error,
    openCreateTeam,
    openEditTeam,
    closeTeamForm,
    submitTeamForm,

    team_pending_delete,
    requestDeleteTeam,
    cancelDeleteTeam,
    confirmDeleteTeam,

    is_add_members_open,
    add_member_candidates,
    is_loading_add_member_candidates,
    add_member_selected_ids,
    setAddMemberSelectedIds,
    can_submit_add_members,
    is_submitting_add_members,
    add_members_error,
    openAddMembers,
    closeAddMembers,
    submitAddMembers,

    member_pending_remove,
    requestRemoveMember,
    cancelRemoveMember,
    confirmRemoveMember,
  };
}
