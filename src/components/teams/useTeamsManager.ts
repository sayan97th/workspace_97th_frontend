"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { accountTeamsService, type AccountTeamImageKind } from "@/services/account-teams.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { AccountTeamDto } from "@/types/account-teams";
import { mapAccountTeamDtoToTeam, mapAccountTeamMemberDtoToTeamMember } from "./teamMapping";
import type { Team, TeamMember, TeamsFilterId, TeamsTabId } from "./types";

/** Cap for the member picker's one shot candidate pool, generous but still a real limit. */
const DIRECTORY_PER_PAGE = 100;

const TAB_IDS: TeamsTabId[] = ["users", "sub_teams", "content"];

export const TEAMS_FILTER_LABELS: Record<TeamsFilterId, string> = {
  all: "All teams",
  member: "Teams I'm a member of",
  owner: "Teams I own",
  guests: "Teams with guests",
};

/** One row of the rail, a team with its nesting depth in the tree. */
export type TeamRow = {
  team: Team;
  depth: number;
  has_children: boolean;
  is_expanded: boolean;
  is_selected: boolean;
};

export type TeamFormMode = "create" | "edit";

/** Holds the Create new team / Edit team dialog. */
export type TeamFormState = {
  mode: TeamFormMode;
  team_id: string | null;
  name: string;
  allow_guests: boolean;
  parent_id: string | null;
  member_ids: string[];
  picture_file: File | null;
};

const EMPTY_FORM: TeamFormState = {
  mode: "create",
  team_id: null,
  name: "",
  allow_guests: false,
  parent_id: null,
  member_ids: [],
  picture_file: null,
};

/** A confirmation the page is waiting on. */
export type TeamPendingAction = { kind: "delete" | "leave"; team: Team };

const matchesFilter = (team: Team, filter: TeamsFilterId): boolean => {
  if (filter === "member") return team.is_member;
  if (filter === "owner") return team.is_viewer_owner;
  if (filter === "guests") return team.allow_guests;
  return true;
};

/** Depth first walk of the team tree, children under their parent, each level sorted by name. */
const buildTreeRows = (
  teams: Team[],
  expanded_ids: Set<string>,
  selected_team_id: string | null
): TeamRow[] => {
  const known_ids = new Set(teams.map((team) => team.id));
  const children_by_parent = new Map<string | null, Team[]>();
  teams.forEach((team) => {
    // A sub-team whose parent is not listed shows at the top level instead of disappearing.
    const parent_key = team.parent_id && known_ids.has(team.parent_id) ? team.parent_id : null;
    children_by_parent.set(parent_key, [...(children_by_parent.get(parent_key) ?? []), team]);
  });

  const rows: TeamRow[] = [];
  const visit = (parent_key: string | null, depth: number) => {
    (children_by_parent.get(parent_key) ?? []).forEach((team) => {
      const has_children = (children_by_parent.get(team.id)?.length ?? 0) > 0;
      const is_expanded = expanded_ids.has(team.id);
      rows.push({ team, depth, has_children, is_expanded, is_selected: team.id === selected_team_id });
      if (has_children && is_expanded) visit(team.id, depth + 1);
    });
  };
  visit(null, 0);
  return rows;
};

/**
 * Owns the Teams page's team level state, backed by the `account-teams` API: the team list,
 * the rail's search, filter and sub-team tree, which team (or "All users") is open, the active
 * tab, and the create, edit, delete, leave and picture/cover flows. The open team and tab live
 * in the URL (`?team=12&tab=content`) so a refresh or a shared link lands on the same view.
 * Roster and Content state live in {@link useTeamRoster} and {@link useTeamBoards}.
 */
export function useTeamsManager() {
  const router = useRouter();
  const pathname = usePathname();
  const search_params = useSearchParams();
  const { user, hasAnyRole } = useAuth();
  const { showToast } = useToast();
  const is_admin = hasAnyRole("super_admin", "admin");

  const selected_team_id = search_params.get("team");
  const tab_param = search_params.get("tab") as TeamsTabId | null;
  const active_tab: TeamsTabId = tab_param && TAB_IDS.includes(tab_param) ? tab_param : "users";

  const [teams, setTeams] = useState<Team[]>([]);
  const [is_loading_teams, setIsLoadingTeams] = useState(true);
  const [teams_error, setTeamsError] = useState<string | null>(null);
  const [team_query, setTeamQuery] = useState("");
  const [filter, setFilter] = useState<TeamsFilterId>("all");
  const [expanded_ids, setExpandedIds] = useState<Set<string>>(new Set());

  const [team_form, setTeamForm] = useState<TeamFormState | null>(null);
  const [is_submitting_team_form, setIsSubmittingTeamForm] = useState(false);
  const [team_form_error, setTeamFormError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<TeamMember[]>([]);
  const [is_loading_candidates, setIsLoadingCandidates] = useState(false);

  const [pending_action, setPendingAction] = useState<TeamPendingAction | null>(null);
  const [image_saving_kind, setImageSavingKind] = useState<AccountTeamImageKind | null>(null);

  const loadTeams = useCallback(async () => {
    setTeamsError(null);
    try {
      const data = await accountTeamsService.getTeams();
      setTeams(data.map(mapAccountTeamDtoToTeam));
    } catch {
      setTeamsError("We couldn't load your teams.");
    } finally {
      setIsLoadingTeams(false);
    }
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  /** Writes the open team and tab into the URL, `null` opens "All users". */
  const navigate = useCallback(
    (team_id: string | null, tab: TeamsTabId = "users") => {
      const next_params = new URLSearchParams(search_params.toString());
      if (team_id) next_params.set("team", team_id);
      else next_params.delete("team");
      if (team_id && tab !== "users") next_params.set("tab", tab);
      else next_params.delete("tab");
      const query = next_params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, search_params]
  );

  const selectTeam = useCallback((team_id: string | null) => navigate(team_id), [navigate]);
  const setActiveTab = useCallback(
    (tab: TeamsTabId) => {
      if (selected_team_id) navigate(selected_team_id, tab);
    },
    [navigate, selected_team_id]
  );

  const selected_team = selected_team_id ? teams.find((team) => team.id === selected_team_id) ?? null : null;
  const parent_team = selected_team?.parent_id ? teams.find((team) => team.id === selected_team.parent_id) ?? null : null;
  const sub_teams = useMemo(
    () => (selected_team ? teams.filter((team) => team.parent_id === selected_team.id) : []),
    [teams, selected_team]
  );

  // A team opened from a link or created as a sub-team reveals itself in the tree.
  useEffect(() => {
    if (!selected_team_id || teams.length === 0) return;
    const ancestor_ids: string[] = [];
    let current = teams.find((team) => team.id === selected_team_id);
    while (current?.parent_id && !ancestor_ids.includes(current.parent_id)) {
      ancestor_ids.push(current.parent_id);
      current = teams.find((team) => team.id === current?.parent_id);
    }
    if (ancestor_ids.length === 0) return;
    setExpandedIds((existing) =>
      ancestor_ids.every((id) => existing.has(id)) ? existing : new Set([...existing, ...ancestor_ids])
    );
  }, [selected_team_id, teams]);

  const toggleExpanded = useCallback((team_id: string) => {
    setExpandedIds((existing) => {
      const next = new Set(existing);
      if (next.has(team_id)) next.delete(team_id);
      else next.add(team_id);
      return next;
    });
  }, []);

  const trimmed_team_query = team_query.trim().toLowerCase();
  const is_filtering = trimmed_team_query !== "" || filter !== "all";
  const team_rows: TeamRow[] = useMemo(() => {
    if (!is_filtering) return buildTreeRows(teams, expanded_ids, selected_team_id);
    // Searching or filtering lists the matches flat, a match deep in the tree must not hide behind a folded parent.
    return teams
      .filter((team) => matchesFilter(team, filter))
      .filter((team) => !trimmed_team_query || team.name.toLowerCase().includes(trimmed_team_query))
      .map((team) => ({ team, depth: 0, has_children: false, is_expanded: false, is_selected: team.id === selected_team_id }));
  }, [is_filtering, teams, expanded_ids, selected_team_id, filter, trimmed_team_query]);

  /** Reflects a mutation's fresh team payload (counts, owners, images, permissions) without a full refetch. */
  const applyUpdatedTeam = useCallback((dto: AccountTeamDto) => {
    const next_team = mapAccountTeamDtoToTeam(dto);
    setTeams((current) =>
      current.some((team) => team.id === next_team.id)
        ? current.map((team) => (team.id === next_team.id ? next_team : team))
        : [...current, next_team].sort((first, second) => first.name.localeCompare(second.name))
    );
  }, []);

  const loadCandidates = useCallback(async () => {
    setIsLoadingCandidates(true);
    try {
      const result = await accountTeamsService.getCandidates({ per_page: DIRECTORY_PER_PAGE, include_guests: true });
      setCandidates(result.data.map(mapAccountTeamMemberDtoToTeamMember));
    } catch {
      setCandidates([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, []);

  const openCreateTeam = useCallback(
    (parent_id: string | null = null) => {
      setTeamForm({ ...EMPTY_FORM, parent_id });
      setTeamFormError(null);
      void loadCandidates();
    },
    [loadCandidates]
  );

  const openEditTeam = useCallback((team: Team) => {
    setTeamForm({
      ...EMPTY_FORM,
      mode: "edit",
      team_id: team.id,
      name: team.name,
      allow_guests: team.allow_guests,
      parent_id: team.parent_id,
    });
    setTeamFormError(null);
  }, []);

  const closeTeamForm = useCallback(() => setTeamForm(null), []);

  const updateTeamForm = useCallback((changes: Partial<TeamFormState>) => {
    setTeamForm((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      // Turning guests off drops any guest already picked, the API would refuse them.
      if (changes.allow_guests === false) {
        next.member_ids = next.member_ids.filter((id) => !candidates.find((person) => person.id === id)?.is_guest);
      }
      return next;
    });
  }, [candidates]);

  const can_submit_team_form = Boolean(team_form && team_form.name.trim() !== "" && !is_submitting_team_form);

  const submitTeamForm = useCallback(async () => {
    if (!team_form || !can_submit_team_form) return;
    setIsSubmittingTeamForm(true);
    setTeamFormError(null);
    const name = team_form.name.trim();
    try {
      if (team_form.mode === "create") {
        let created = await accountTeamsService.createTeam({
          name,
          parent_id: team_form.parent_id,
          allow_guests: team_form.allow_guests,
          member_ids: team_form.member_ids,
        });
        if (team_form.picture_file) {
          try {
            created = await accountTeamsService.uploadTeamImage(created.id, "picture", team_form.picture_file);
          } catch (error) {
            showToast({
              variant: "error",
              title: "The team was created without its picture",
              description: apiErrorMessage(error, "Try uploading the picture again from the team page."),
            });
          }
        }
        applyUpdatedTeam(created);
        if (created.parent_id) void loadTeams();
        navigate(created.id);
      } else if (team_form.team_id) {
        const updated = await accountTeamsService.updateTeam(team_form.team_id, {
          name,
          parent_id: team_form.parent_id,
          allow_guests: team_form.allow_guests,
        });
        applyUpdatedTeam(updated);
        // Moving a team changes two parents' sub-team counts, reload them.
        void loadTeams();
      }
      setTeamForm(null);
    } catch (error) {
      setTeamFormError(apiErrorMessage(error, "Something went wrong. Please try again."));
    } finally {
      setIsSubmittingTeamForm(false);
    }
  }, [team_form, can_submit_team_form, applyUpdatedTeam, loadTeams, navigate, showToast]);

  /** Moves a sub-team back to the top level, from its parent's Sub-teams tab. */
  const detachSubTeam = useCallback(
    async (team: Team) => {
      try {
        const updated = await accountTeamsService.updateTeam(team.id, { parent_id: null });
        applyUpdatedTeam(updated);
        void loadTeams();
      } catch (error) {
        showToast({ variant: "error", title: "Couldn't move the team", description: apiErrorMessage(error, "Please try again.") });
      }
    },
    [applyUpdatedTeam, loadTeams, showToast]
  );

  const requestDeleteTeam = useCallback((team: Team) => setPendingAction({ kind: "delete", team }), []);
  const requestLeaveTeam = useCallback((team: Team) => setPendingAction({ kind: "leave", team }), []);
  const cancelPendingAction = useCallback(() => setPendingAction(null), []);

  /** Runs the confirmed delete or leave. Errors propagate so the confirm dialog shows them inline. */
  const confirmPendingAction = useCallback(async () => {
    if (!pending_action || !user) return;
    const { kind, team } = pending_action;
    if (kind === "delete") {
      await accountTeamsService.deleteTeam(team.id);
      if (selected_team_id === team.id) selectTeam(team.parent_id);
      await loadTeams();
    } else {
      const updated = await accountTeamsService.removeTeamMember(team.id, String(user.id));
      applyUpdatedTeam(updated);
      showToast({ variant: "success", title: `You left ${team.name}` });
    }
    setPendingAction(null);
  }, [pending_action, user, selected_team_id, selectTeam, loadTeams, applyUpdatedTeam, showToast]);

  const uploadTeamImage = useCallback(
    async (team: Team, kind: AccountTeamImageKind, file: File) => {
      setImageSavingKind(kind);
      try {
        applyUpdatedTeam(await accountTeamsService.uploadTeamImage(team.id, kind, file));
      } catch (error) {
        showToast({
          variant: "error",
          title: kind === "cover" ? "Couldn't update the cover" : "Couldn't update the team picture",
          description: apiErrorMessage(error, "Please try another image."),
        });
      } finally {
        setImageSavingKind(null);
      }
    },
    [applyUpdatedTeam, showToast]
  );

  const removeTeamImage = useCallback(
    async (team: Team, kind: AccountTeamImageKind) => {
      setImageSavingKind(kind);
      try {
        applyUpdatedTeam(await accountTeamsService.removeTeamImage(team.id, kind));
      } catch (error) {
        showToast({ variant: "error", title: "Couldn't remove the image", description: apiErrorMessage(error, "Please try again.") });
      } finally {
        setImageSavingKind(null);
      }
    },
    [applyUpdatedTeam, showToast]
  );

  // Cover changes come from CoverBanner, which shows its own toasts, so these let errors propagate.
  const uploadTeamCover = useCallback(
    async (team: Team, file: File) => {
      applyUpdatedTeam(await accountTeamsService.uploadTeamImage(team.id, "cover", file, team.cover_position_y));
    },
    [applyUpdatedTeam]
  );

  const repositionTeamCover = useCallback(
    async (team: Team, cover_position_y: number) => {
      applyUpdatedTeam(await accountTeamsService.updateTeamCoverPosition(team.id, cover_position_y));
    },
    [applyUpdatedTeam]
  );

  const removeTeamCover = useCallback(
    async (team: Team) => {
      applyUpdatedTeam(await accountTeamsService.removeTeamImage(team.id, "cover"));
    },
    [applyUpdatedTeam]
  );

  /** Teams the form may pick as a parent: never the team itself or one of its own sub-teams. */
  const parent_options = useMemo(() => {
    const editing_id = team_form?.mode === "edit" ? team_form.team_id : null;
    if (!editing_id) return teams;
    const excluded_ids = new Set([editing_id]);
    let frontier = [editing_id];
    while (frontier.length > 0) {
      frontier = teams.filter((team) => team.parent_id && frontier.includes(team.parent_id)).map((team) => team.id);
      frontier.forEach((id) => excluded_ids.add(id));
    }
    return teams.filter((team) => !excluded_ids.has(team.id));
  }, [teams, team_form?.mode, team_form?.team_id]);

  return {
    viewer_id: user ? String(user.id) : null,
    is_admin,
    can_create_teams: is_admin,

    teams,
    is_loading_teams,
    teams_error,
    reloadTeams: loadTeams,
    applyUpdatedTeam,

    team_query,
    setTeamQuery,
    filter,
    setFilter,
    is_filtering,
    team_rows,
    toggleExpanded,
    /** Some team has sub-teams, so top level rows keep room for the chevron. */
    has_nested_teams: teams.some((team) => team.parent_id !== null),

    selected_team_id,
    selected_team,
    parent_team,
    sub_teams,
    is_all_users: selected_team_id === null,
    selectTeam,
    active_tab,
    setActiveTab,

    team_form,
    updateTeamForm,
    openCreateTeam,
    openEditTeam,
    closeTeamForm,
    submitTeamForm,
    can_submit_team_form,
    is_submitting_team_form,
    team_form_error,
    candidates,
    is_loading_candidates,
    parent_options,
    detachSubTeam,

    pending_action,
    requestDeleteTeam,
    requestLeaveTeam,
    cancelPendingAction,
    confirmPendingAction,

    image_saving_kind,
    uploadTeamImage,
    removeTeamImage,
    uploadTeamCover,
    repositionTeamCover,
    removeTeamCover,
  };
}

export type TeamsManagerApi = ReturnType<typeof useTeamsManager>;
