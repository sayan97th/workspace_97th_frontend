"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchEverythingService } from "@/services/search.service";
import type {
  AllTabResults,
  SearchEverythingCounts,
  SearchEverythingParams,
  SearchEverythingResponse,
  SearchEverythingTab,
} from "@/types/search-everything";

const SEARCH_DEBOUNCE_MS = 250;

/** Rows per page, a multiple of the 6 column Files and People grids. */
export const SEARCH_EVERYTHING_PER_PAGE = 24;

const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === "AbortError";

type SearchState = {
  /** "All" gets one preview per tab, every other tab a flat list that grows with each page. */
  results: AllTabResults | unknown[] | null;
  /** Tab the `results` belong to, they lag behind for a moment after switching tabs. */
  results_tab: SearchEverythingTab | null;
  counts: SearchEverythingCounts | null;
  facets: SearchEverythingResponse<unknown>["facets"];
  total: number;
  page: number;
  has_more: boolean;
  is_loading: boolean;
  is_loading_more: boolean;
  has_error: boolean;
};

const initial_state: SearchState = {
  results: null,
  results_tab: null,
  counts: null,
  facets: {},
  total: 0,
  page: 1,
  has_more: false,
  is_loading: false,
  is_loading_more: false,
  has_error: false,
};

/**
 * Drives the "Search Everything" dialog. Any change to the query (debounced),
 * tab, sort, date range or checkboxes refetches the first page, cancelling the
 * request in flight so a slow older response never overwrites a newer one.
 * `loadMore` appends the next page for infinite scroll. Tab counts are kept
 * from the last first page, so they stay visible while a new page loads.
 */
export function useSearchEverything(params: Omit<SearchEverythingParams, "page" | "per_page">, is_enabled: boolean) {
  const [state, setState] = useState<SearchState>(initial_state);
  const [debounced_query, setDebouncedQuery] = useState(params.q.trim());
  const abort_ref = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = params.q.trim();
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [params.q]);

  const request_params: Omit<SearchEverythingParams, "page"> = {
    ...params,
    q: debounced_query,
    per_page: SEARCH_EVERYTHING_PER_PAGE,
  };
  const request_key = JSON.stringify(request_params);
  const request_ref = useRef(request_params);
  request_ref.current = request_params;

  useEffect(() => {
    if (!is_enabled) return;

    abort_ref.current?.abort();
    const controller = new AbortController();
    abort_ref.current = controller;
    setState((current) => ({ ...current, is_loading: true, has_error: false }));

    searchEverythingService
      .search<AllTabResults | unknown[]>({ ...request_ref.current, page: 1 }, controller.signal)
      .then((response) => {
        setState((current) => ({
          results: response.data,
          results_tab: response.meta.tab,
          counts: response.counts ?? current.counts,
          facets: response.facets,
          total: response.meta.total,
          page: 1,
          has_more: response.meta.has_more,
          is_loading: false,
          is_loading_more: false,
          has_error: false,
        }));
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setState((current) => ({ ...current, is_loading: false, has_error: true }));
      });

    return () => controller.abort();
  }, [request_key, is_enabled]);

  const state_ref = useRef(state);
  state_ref.current = state;

  const loadMore = useCallback(() => {
    const current = state_ref.current;
    if (!current.has_more || current.is_loading || current.is_loading_more || !Array.isArray(current.results)) return;

    const next_page = current.page + 1;
    const controller = new AbortController();
    abort_ref.current = controller;
    // Marked right away on the ref too, so a second scroll event in the same frame can't fetch the page twice.
    state_ref.current = { ...current, is_loading_more: true };
    setState((latest) => ({ ...latest, is_loading_more: true }));

    searchEverythingService
      .search<unknown[]>({ ...request_ref.current, page: next_page }, controller.signal)
      .then((response) => {
        setState((latest) => ({
          ...latest,
          results: Array.isArray(latest.results) ? latest.results.concat(response.data) : response.data,
          page: next_page,
          has_more: response.meta.has_more,
          is_loading_more: false,
        }));
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setState((latest) => ({ ...latest, is_loading_more: false, has_error: true }));
      });
  }, []);

  return {
    ...state,
    /** The query the shown results belong to, the term for "N results for ..." and highlights. */
    searched_query: debounced_query,
    /** True while typing, before the debounce fires. */
    is_typing: params.q.trim() !== debounced_query,
    loadMore,
  };
}
