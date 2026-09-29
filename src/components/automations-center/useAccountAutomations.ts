"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardAutomationService } from "@/services/board-automation.service";
import type { AccountAutomationsResponse, BoardAutomationBulkResult } from "@/types/board-automation";

export type UseAccountAutomationsResult = {
  data: AccountAutomationsResponse | null;
  is_loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Turns automations on or off, optimistically, rolling back the ones the API left alone. */
  setEnabled: (automation_ids: number[], is_enabled: boolean) => Promise<BoardAutomationBulkResult | null>;
};

/**
 * The account wide Automations center's data: every automation on the boards the viewer may open,
 * with bulk on and off across boards.
 */
export default function useAccountAutomations(onError: (message: string) => void): UseAccountAutomationsResult {
  const [data, setData] = useState<AccountAutomationsResponse | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load_seq_ref = useRef(0);

  const reload = useCallback(async () => {
    const load_seq = ++load_seq_ref.current;
    try {
      const result = await boardAutomationService.getAccountAutomations();
      if (load_seq !== load_seq_ref.current) return;
      setData(result);
      setError(null);
    } catch (load_error) {
      if (load_seq === load_seq_ref.current) setError(getApiErrorMessage(load_error, "We couldn't load the automations."));
    } finally {
      if (load_seq === load_seq_ref.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setEnabled = useCallback(
    async (automation_ids: number[], is_enabled: boolean) => {
      if (automation_ids.length === 0) return null;
      const previous = data;
      // A newer load would overwrite the optimistic state, so any load in flight is dropped.
      load_seq_ref.current += 1;
      setData((current) => (current ? { ...current, data: current.data.map((automation) => (automation_ids.includes(automation.id) && automation.can_edit ? { ...automation, is_enabled } : automation)) } : current));

      try {
        const result = await boardAutomationService.bulkUpdateAccount(automation_ids, is_enabled ? "enable" : "disable");
        await reload();
        return result;
      } catch (update_error) {
        setData(previous);
        onError(getApiErrorMessage(update_error, "We couldn't change the automations."));
        return null;
      }
    },
    [data, onError, reload]
  );

  return { data, is_loading, error, reload, setEnabled };
}
