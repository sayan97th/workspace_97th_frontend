"use client";
import { useCallback, useEffect, useState } from "react";
import { boardAutomationService } from "@/services/board-automation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { BoardAutomationUsageDto } from "@/types/board-automation";

export type AutomationUsageApi = {
  usage: BoardAutomationUsageDto | null;
  is_loading: boolean;
  error: string | null;
  refresh: () => void;
};

/** Run totals for a board tab's automations over the last 30 days, fetched when the usage tab opens. */
export function useAutomationUsage(board_id: number, view_id: number | null): AutomationUsageApi {
  const [usage, setUsage] = useState<BoardAutomationUsageDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload_key, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    boardAutomationService
      .getUsage(board_id, view_id)
      .then((result) => {
        if (!cancelled) setUsage(result);
      })
      .catch((failure) => {
        if (!cancelled) setError(apiErrorMessage(failure, "The usage numbers could not be loaded."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [board_id, view_id, reload_key]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  return { usage, is_loading, error, refresh };
}
