"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { serializeFilters, type AdminFilterDef, type AdminFilterState, type AdminFilterValue } from "./adminFilterTypes";

const DEBOUNCE_MS = 300;

/** `value`, but only after it stopped changing for `delay_ms`. */
export function useDebouncedValue<T>(value: T, delay_ms: number = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay_ms);
    return () => window.clearTimeout(timeout);
  }, [value, delay_ms]);

  return debounced;
}

export type AdminFilterStateApi = {
  filter_state: AdminFilterState;
  setFilter: (key: string, value: AdminFilterValue | null) => void;
  clearFilters: () => void;
  /** Serialized, debounced query parameters, safe to use as a fetch effect dependency. */
  filter_params: Record<string, string>;
  /** Stable string form of `filter_params`, for effect dependency arrays. */
  filter_key: string;
};

/**
 * Column filter state for an Administration table plus its debounced serialized form, so typing
 * a number range or a text filter only refetches once the admin pauses.
 */
export function useAdminFilterState(defs: AdminFilterDef[]): AdminFilterStateApi {
  const [filter_state, setFilterState] = useState<AdminFilterState>({});

  const setFilter = useCallback((key: string, value: AdminFilterValue | null) => {
    setFilterState((current) => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setFilterState({}), []);

  const serialized = useMemo(() => JSON.stringify(serializeFilters(defs, filter_state)), [defs, filter_state]);
  const filter_key = useDebouncedValue(serialized);
  const filter_params = useMemo(() => JSON.parse(filter_key) as Record<string, string>, [filter_key]);

  return { filter_state, setFilter, clearFilters, filter_params, filter_key };
}

export type AdminSelectionApi = {
  selected_ids: number[];
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
  /** Selects every id of the current page, or clears them when they are all selected already. */
  togglePage: (page_ids: number[]) => void;
  clear: () => void;
  pageSelectionState: (page_ids: number[]) => "none" | "some" | "all";
};

/** Row selection for an Administration table, kept across pages until cleared. */
export function useAdminSelection(): AdminSelectionApi {
  const [selected_ids, setSelectedIds] = useState<number[]>([]);

  const isSelected = useCallback((id: number) => selected_ids.includes(id), [selected_ids]);

  const toggle = useCallback(
    (id: number) =>
      setSelectedIds((current) => (current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id])),
    []
  );

  const togglePage = useCallback((page_ids: number[]) => {
    setSelectedIds((current) => {
      const is_all_selected = page_ids.length > 0 && page_ids.every((id) => current.includes(id));
      return is_all_selected
        ? current.filter((id) => !page_ids.includes(id))
        : Array.from(new Set([...current, ...page_ids]));
    });
  }, []);

  const clear = useCallback(() => setSelectedIds([]), []);

  const pageSelectionState = useCallback(
    (page_ids: number[]): "none" | "some" | "all" => {
      const count = page_ids.filter((id) => selected_ids.includes(id)).length;
      if (count === 0) return "none";
      return count === page_ids.length ? "all" : "some";
    },
    [selected_ids]
  );

  return { selected_ids, isSelected, toggle, togglePage, clear, pageSelectionState };
}

/** Sort state for an Administration table: clicking the active column flips the direction. */
export function useAdminSort<TField extends string>(initial_field: TField, initial_direction: "asc" | "desc" = "desc") {
  const [sort_field, setSortField] = useState<TField>(initial_field);
  const [sort_direction, setSortDirection] = useState<"asc" | "desc">(initial_direction);

  const toggleSort = useCallback(
    (field: TField) => {
      if (field === sort_field) {
        setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection(field === "label" || field === "name" || field === "email" || field === "user" ? "asc" : "desc");
      }
    },
    [sort_field]
  );

  return { sort_field, sort_direction, toggleSort };
}
