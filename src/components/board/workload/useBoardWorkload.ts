"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { boardViewDataService } from "@/services/board-view-data.service";
import { boardContentService } from "@/services/board-content.service";
import { getApiErrorMessage } from "@/lib/api-error";
import type { BoardWorkloadConfig, WorkloadDataDto, WorkloadItem } from "./types";
import { reassignPeople } from "./workloadUtils";

const WORKING_DAYS_PER_WEEK = 5;

export type UseBoardWorkloadInput = { board_id: number; view_id: number };

/**
 * Owns a Workload tab's data: loads it for the visible date range, saves
 * setting changes straight away (like a Chart tab, there is no "Save"
 * button) and reassigns an item when it is dropped on another person.
 */
const useBoardWorkload = ({ board_id, view_id }: UseBoardWorkloadInput) => {
  const [data, setData] = useState<WorkloadDataDto | null>(null);
  const [range_start, setRangeStart] = useState<string | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ignores responses that arrive after a newer request, when the range or a setting changes quickly.
  const request_ref = useRef(0);

  const load = useCallback(
    async (start: string | null) => {
      const request_id = ++request_ref.current;
      try {
        const result = await boardViewDataService.getWorkload(board_id, view_id, start);
        if (request_id !== request_ref.current) return;
        setData(result);
        setError(null);
      } catch (caught) {
        if (request_id === request_ref.current) setError(getApiErrorMessage(caught, "Couldn't load the workload. Please try again."));
      } finally {
        if (request_id === request_ref.current) setIsLoading(false);
      }
    },
    [board_id, view_id]
  );

  useEffect(() => {
    setIsLoading(true);
    void load(range_start);
  }, [load, range_start]);

  const updateConfig = useCallback(
    (partial: Partial<BoardWorkloadConfig>) => {
      if (!data) return;
      const next_config = { ...data.config, ...partial };
      // Capacity is per period, so switching between days and weeks converts it (5 working days a week).
      if (partial.bucket && partial.bucket !== data.config.bucket && partial.capacity === undefined) {
        const factor = partial.bucket === "day" ? 1 / WORKING_DAYS_PER_WEEK : WORKING_DAYS_PER_WEEK;
        const convert = (value: number) => Math.round(value * factor * 10) / 10;
        next_config.capacity = convert(data.config.capacity);
        next_config.capacity_overrides = Object.fromEntries(Object.entries(data.config.capacity_overrides ?? {}).map(([id, value]) => [id, convert(value)]));
      }
      setData({ ...data, config: next_config });
      setIsSaving(true);
      void boardContentService
        .saveView(board_id, view_id, { workload_config: next_config })
        .then(() => load(partial.bucket ? null : range_start))
        .catch((caught) => setError(getApiErrorMessage(caught, "Couldn't save that change. Please try again.")))
        .finally(() => setIsSaving(false));
      if (partial.bucket) setRangeStart(null);
    },
    [board_id, view_id, data, load, range_start]
  );

  /** Moves an item from one person's row to another's by rewriting its People value. */
  const reassignItem = useCallback(
    async (item: WorkloadItem, from_person_id: number | null, to_person_id: number | null) => {
      const people_column_id = data?.config.people_column_id;
      if (!people_column_id || from_person_id === to_person_id) return;
      setIsSaving(true);
      try {
        await boardContentService.updateItemValues(board_id, item.id, {
          [people_column_id]: reassignPeople(item.person_ids, from_person_id, to_person_id),
        });
        await load(range_start);
      } catch (caught) {
        setError(getApiErrorMessage(caught, "Couldn't reassign the item. Please try again."));
      } finally {
        setIsSaving(false);
      }
    },
    [board_id, data?.config.people_column_id, load, range_start]
  );

  return {
    data,
    is_loading,
    is_saving,
    error,
    updateConfig,
    reassignItem,
    showPrevious: () => data && setRangeStart(data.range.previous_start),
    showNext: () => data && setRangeStart(data.range.next_start),
    showToday: () => setRangeStart(null),
    refresh: () => load(range_start),
  };
};

export default useBoardWorkload;
