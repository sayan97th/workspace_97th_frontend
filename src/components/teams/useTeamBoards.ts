"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { accountTeamsService } from "@/services/account-teams.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { AccountTeamDto } from "@/types/account-teams";
import type { Team, TeamBoard } from "./types";

const SEARCH_DEBOUNCE_MS = 300;

export type UseTeamBoardsOptions = {
  team: Team | null;
  /** Only fetch while the Content tab is showing. */
  is_active: boolean;
  onTeamUpdated: (dto: AccountTeamDto) => void;
};

/**
 * The open team's Content tab: the boards it joined, the "Add boards" dialog (a searchable
 * candidate list) and removing a board from the team.
 */
export function useTeamBoards({ team, is_active, onTeamUpdated }: UseTeamBoardsOptions) {
  const { showToast } = useToast();
  const team_id = team?.id ?? null;

  const [boards, setBoards] = useState<TeamBoard[]>([]);
  const [is_loading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh_token, setRefreshToken] = useState(0);

  const [is_add_open, setIsAddOpen] = useState(false);
  const [candidate_query, setCandidateQuery] = useState("");
  const [candidates, setCandidates] = useState<TeamBoard[]>([]);
  const [is_loading_candidates, setIsLoadingCandidates] = useState(false);
  const [selected_ids, setSelectedIds] = useState<string[]>([]);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [add_error, setAddError] = useState<string | null>(null);
  const [removing_id, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!team_id || !is_active) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    accountTeamsService
      .getTeamBoards(team_id)
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load this team's boards.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [team_id, is_active, refresh_token]);

  useEffect(() => {
    if (!team_id || !is_add_open) return;
    let cancelled = false;
    setIsLoadingCandidates(true);
    const timeout = window.setTimeout(() => {
      accountTeamsService
        .getBoardCandidates(team_id, candidate_query.trim())
        .then((data) => {
          if (!cancelled) setCandidates(data);
        })
        .catch(() => {
          if (!cancelled) setCandidates([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingCandidates(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [team_id, is_add_open, candidate_query]);

  const openAddBoards = useCallback(() => {
    setCandidateQuery("");
    setSelectedIds([]);
    setAddError(null);
    setIsAddOpen(true);
  }, []);

  const closeAddBoards = useCallback(() => setIsAddOpen(false), []);

  const toggleCandidate = useCallback((board_id: string) => {
    setSelectedIds((current) => (current.includes(board_id) ? current.filter((id) => id !== board_id) : [...current, board_id]));
  }, []);

  const can_submit = selected_ids.length > 0 && !is_submitting;

  const submitAddBoards = useCallback(async () => {
    if (!team_id || !can_submit) return;
    setIsSubmitting(true);
    setAddError(null);
    try {
      onTeamUpdated(await accountTeamsService.addTeamBoards(team_id, selected_ids));
      setRefreshToken((token) => token + 1);
      setIsAddOpen(false);
    } catch (submit_error) {
      setAddError(apiErrorMessage(submit_error, "Something went wrong. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }, [team_id, can_submit, selected_ids, onTeamUpdated]);

  const removeBoard = useCallback(
    async (board: TeamBoard) => {
      if (!team_id) return;
      setRemovingId(board.id);
      try {
        onTeamUpdated(await accountTeamsService.removeTeamBoard(team_id, board.id));
        setBoards((current) => current.filter((row) => row.id !== board.id));
      } catch (remove_error) {
        showToast({ variant: "error", title: "Couldn't remove the board", description: apiErrorMessage(remove_error, "Please try again.") });
      } finally {
        setRemovingId(null);
      }
    },
    [team_id, onTeamUpdated, showToast]
  );

  return {
    boards,
    is_loading,
    error,
    removing_id,
    removeBoard,

    is_add_open,
    openAddBoards,
    closeAddBoards,
    candidate_query,
    setCandidateQuery,
    candidates,
    is_loading_candidates,
    selected_ids,
    toggleCandidate,
    can_submit,
    is_submitting,
    add_error,
    submitAddBoards,
  };
}

export type TeamBoardsApi = ReturnType<typeof useTeamBoards>;
