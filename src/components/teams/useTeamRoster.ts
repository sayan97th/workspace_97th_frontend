"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { accountTeamsService } from "@/services/account-teams.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { AccountTeamDto, AllAccountTeamMembersPage } from "@/types/account-teams";
import { mapAccountTeamMemberDtoToTeamMember } from "./teamMapping";
import type { Team, TeamMember } from "./types";

/** Rows per page, small enough to page through comfortably, large enough to rarely need it. */
const MEMBERS_PER_PAGE = 25;
const CANDIDATES_PER_PAGE = 100;
const SEARCH_DEBOUNCE_MS = 300;

export type UseTeamRosterOptions = {
  /** The open team, `null` lists "All users". */
  team: Team | null;
  viewer_id: string | null;
  /** Receives the fresh team payload after every roster change. */
  onTeamUpdated: (dto: AccountTeamDto) => void;
};

/**
 * Roster state of the Teams page: the open team's Users tab, or the account wide "All users"
 * listing with every person's teams, both searched and paginated server side. Also owns the
 * "Add users" dialog, the remove confirmation and the owner crown toggle.
 */
export function useTeamRoster({ team, viewer_id, onTeamUpdated }: UseTeamRosterOptions) {
  const { showToast } = useToast();
  const team_id = team?.id ?? null;
  const can_manage_members = team?.can_manage_members ?? false;
  const can_manage_owners = team?.can_manage ?? false;

  const [user_query, setUserQuery] = useState("");
  const [debounced_query, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [team_count, setTeamCount] = useState(0);
  const [refresh_token, setRefreshToken] = useState(0);

  const [is_add_open, setIsAddOpen] = useState(false);
  const [add_candidates, setAddCandidates] = useState<TeamMember[]>([]);
  const [is_loading_add_candidates, setIsLoadingAddCandidates] = useState(false);
  const [add_selected_ids, setAddSelectedIds] = useState<string[]>([]);
  const [is_submitting_add, setIsSubmittingAdd] = useState(false);
  const [add_error, setAddError] = useState<string | null>(null);

  const [member_pending_remove, setMemberPendingRemove] = useState<TeamMember | null>(null);
  const [owner_saving_id, setOwnerSavingId] = useState<string | null>(null);

  const reload = useCallback(() => setRefreshToken((token) => token + 1), []);

  // Debounce the search so every keystroke doesn't fire a request.
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(user_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [user_query]);

  // Another team clears the search, and a new team or search starts back on page 1.
  useEffect(() => {
    setUserQuery("");
    setDebouncedQuery("");
  }, [team_id]);

  useEffect(() => {
    setPage(1);
  }, [team_id, debounced_query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const query = { search: debounced_query, page, per_page: MEMBERS_PER_PAGE };
    const request = team_id ? accountTeamsService.getTeamMembers(team_id, query) : accountTeamsService.getAllMembers(query);

    request
      .then((result) => {
        if (cancelled) return;
        setMembers(result.data.map(mapAccountTeamMemberDtoToTeamMember));
        setLastPage(result.last_page);
        setTotal(result.total);
        if (!team_id) setTeamCount((result as AllAccountTeamMembersPage).team_count);
      })
      .catch(() => {
        if (!cancelled) setError(team_id ? "We couldn't load this team's users." : "We couldn't load the users.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [team_id, debounced_query, page, refresh_token]);

  const openAddUsers = useCallback(() => {
    if (!team_id) return;
    setAddSelectedIds([]);
    setAddError(null);
    setIsAddOpen(true);
    setIsLoadingAddCandidates(true);
    accountTeamsService
      .getCandidates({ per_page: CANDIDATES_PER_PAGE, exclude_team_id: team_id })
      .then((result) => setAddCandidates(result.data.map(mapAccountTeamMemberDtoToTeamMember)))
      .catch(() => setAddCandidates([]))
      .finally(() => setIsLoadingAddCandidates(false));
  }, [team_id]);

  const closeAddUsers = useCallback(() => setIsAddOpen(false), []);
  const can_submit_add = add_selected_ids.length > 0 && !is_submitting_add;

  const submitAddUsers = useCallback(async () => {
    if (!team_id || !can_submit_add) return;
    setIsSubmittingAdd(true);
    setAddError(null);
    try {
      onTeamUpdated(await accountTeamsService.addTeamMembers(team_id, add_selected_ids));
      reload();
      setIsAddOpen(false);
    } catch (submit_error) {
      setAddError(apiErrorMessage(submit_error, "Something went wrong. Please try again."));
    } finally {
      setIsSubmittingAdd(false);
    }
  }, [team_id, can_submit_add, add_selected_ids, onTeamUpdated, reload]);

  /** Whether the row offers "Remove from team": a team owner cannot remove another owner. */
  const canRemoveMember = useCallback(
    (member: TeamMember) => member.id !== viewer_id && can_manage_members && (can_manage_owners || !member.is_team_owner),
    [viewer_id, can_manage_members, can_manage_owners]
  );

  const requestRemoveMember = useCallback((member: TeamMember) => setMemberPendingRemove(member), []);
  const cancelRemoveMember = useCallback(() => setMemberPendingRemove(null), []);

  const confirmRemoveMember = useCallback(async () => {
    if (!team_id || !member_pending_remove) return;
    onTeamUpdated(await accountTeamsService.removeTeamMember(team_id, member_pending_remove.id));
    // Removing the last row on a page beyond the first would otherwise leave that page empty.
    if (members.length === 1 && page > 1) setPage((current) => current - 1);
    else reload();
    setMemberPendingRemove(null);
  }, [team_id, member_pending_remove, members.length, page, onTeamUpdated, reload]);

  const toggleTeamOwner = useCallback(
    async (member: TeamMember) => {
      if (!team_id || !can_manage_owners) return;
      setOwnerSavingId(member.id);
      try {
        const updated = member.is_team_owner
          ? await accountTeamsService.removeTeamOwner(team_id, member.id)
          : await accountTeamsService.assignTeamOwner(team_id, member.id);
        onTeamUpdated(updated);
        setMembers((current) =>
          current.map((row) => (row.id === member.id ? { ...row, is_team_owner: !member.is_team_owner } : row))
        );
      } catch (toggle_error) {
        showToast({
          variant: "error",
          title: "Couldn't update the team owner",
          description: apiErrorMessage(toggle_error, "Something went wrong. Please try again."),
        });
      } finally {
        setOwnerSavingId(null);
      }
    },
    [team_id, can_manage_owners, onTeamUpdated, showToast]
  );

  return {
    user_query,
    setUserQuery,
    members,
    is_loading,
    error,
    page,
    setPage,
    last_page,
    total,
    per_page: MEMBERS_PER_PAGE,
    team_count,
    reload,

    can_manage_members,
    can_manage_owners,
    canRemoveMember,
    owner_saving_id,
    toggleTeamOwner,

    is_add_open,
    openAddUsers,
    closeAddUsers,
    add_candidates,
    is_loading_add_candidates,
    add_selected_ids,
    setAddSelectedIds,
    can_submit_add,
    is_submitting_add,
    add_error,
    submitAddUsers,

    member_pending_remove,
    requestRemoveMember,
    cancelRemoveMember,
    confirmRemoveMember,
  };
}

export type TeamRosterApi = ReturnType<typeof useTeamRoster>;
