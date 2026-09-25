"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardContentService } from "@/services/board-content.service";
import { personalService } from "@/services/personal.service";
import type { MyWorkItemDto, MyWorkResponseDto, MyWorkStatus } from "@/types/personal";

const DONE_LABELS = ["done", "complete", "completed", "finished", "closed"];

/** Mirrors `MyWorkService::isDoneStatus()` on the API, so a status change moves the row right away. */
const isDoneStatus = (status: MyWorkStatus | null): boolean =>
  !!status && (DONE_LABELS.includes(status.label.trim().toLowerCase()) || status.color.toLowerCase() === "#00c875");

export type UseMyWorkResult = {
  data: MyWorkResponseDto | null;
  is_loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setStatus: (item: MyWorkItemDto, status: MyWorkStatus | null) => Promise<void>;
  setDueDate: (item: MyWorkItemDto, date: string | null) => Promise<void>;
};

/**
 * My Work's data: loads every item assigned to the user and edits Status and
 * due date inline through the regular item values endpoint, optimistically
 * with a rollback when the board refuses the change.
 */
export default function useMyWork(onError: (message: string) => void): UseMyWorkResult {
  const [data, setData] = useState<MyWorkResponseDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A load only applies when it is the latest one and no inline edit
  // happened while it was in flight, otherwise a slow response would
  // overwrite the edit the user just made.
  const load_seq_ref = useRef(0);
  const edit_seq_ref = useRef(0);

  const reload = useCallback(async () => {
    const load_seq = ++load_seq_ref.current;
    const edit_seq_at_start = edit_seq_ref.current;
    try {
      const result = await personalService.getMyWork();
      if (load_seq !== load_seq_ref.current || edit_seq_at_start !== edit_seq_ref.current) return;
      setData(result);
      setError(null);
    } catch (load_error) {
      if (load_seq === load_seq_ref.current) setError(getApiErrorMessage(load_error, "We couldn't load your work."));
    } finally {
      if (load_seq === load_seq_ref.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchItem = useCallback((item_id: number, patch: Partial<MyWorkItemDto>) => {
    edit_seq_ref.current += 1;
    setData((current) =>
      current ? { ...current, items: current.items.map((item) => (item.id === item_id ? { ...item, ...patch } : item)) } : current
    );
  }, []);

  const setStatus = useCallback(
    async (item: MyWorkItemDto, status: MyWorkStatus | null) => {
      if (item.status_column_id === null) return;
      patchItem(item.id, { status, is_done: isDoneStatus(status) });
      try {
        await boardContentService.updateItemValues(item.board.id, item.id, { [String(item.status_column_id)]: status?.id ?? null });
      } catch (save_error) {
        patchItem(item.id, { status: item.status, is_done: item.is_done });
        onError(getApiErrorMessage(save_error, "We couldn't change the status."));
      }
    },
    [patchItem, onError]
  );

  const setDueDate = useCallback(
    async (item: MyWorkItemDto, date: string | null) => {
      if (!item.date_column) return;

      // A Timeline's due date is its end, the start only moves when the new
      // end would land before it. Written as "start..end", the format the
      // Table view's Timeline cell reads.
      const is_timeline = item.date_column.type === "timeline";
      const start = item.date?.start && date && item.date.start <= date ? item.date.start : date;
      const value = !date ? null : is_timeline ? `${start ?? date}..${date}` : date;

      patchItem(item.id, { date: date ? { value: date, start: is_timeline ? start : null } : null });
      try {
        await boardContentService.updateItemValues(item.board.id, item.id, { [String(item.date_column.id)]: value });
      } catch (save_error) {
        patchItem(item.id, { date: item.date });
        onError(getApiErrorMessage(save_error, "We couldn't change the date."));
      }
    },
    [patchItem, onError]
  );

  return { data, is_loading, error, reload, setStatus, setDueDate };
}
