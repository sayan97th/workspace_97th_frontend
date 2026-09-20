"use client";
import { useCallback, useEffect, useState } from "react";
import { boardAutomationService } from "@/services/board-automation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { BoardAutomationRunDto, BoardAutomationRunFilters, BoardAutomationRunsPage } from "@/types/board-automation";

export const RUNS_PER_PAGE = 20;

export type AutomationRunsApi = {
  runs: BoardAutomationRunDto[];
  meta: BoardAutomationRunsPage["meta"];
  is_loading: boolean;
  error: string | null;
  refresh: () => void;
};

const EMPTY_META: BoardAutomationRunsPage["meta"] = { current_page: 1, last_page: 1, per_page: RUNS_PER_PAGE, total: 0 };

/**
 * One page of a board tab's automation run history, refetched whenever the filters or the page
 * change. `refresh` reloads the current page, used by the tab's refresh button.
 */
export function useAutomationRuns(board_id: number, view_id: number | null, filters: BoardAutomationRunFilters, page: number): AutomationRunsApi {
  const [runs, setRuns] = useState<BoardAutomationRunDto[]>([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload_key, setReloadKey] = useState(0);

  const { status, automation_id, from, to } = filters;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    boardAutomationService
      .getRuns(board_id, view_id, { status, automation_id, from, to }, page, RUNS_PER_PAGE)
      .then((result) => {
        if (cancelled) return;
        setRuns(result.data);
        setMeta(result.meta);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "The run history could not be loaded."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [board_id, view_id, status, automation_id, from, to, page, reload_key]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  return { runs, meta, is_loading, error, refresh };
}
