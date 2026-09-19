"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { searchService } from "@/services/search.service";
import {
  empty_global_search_results,
  GLOBAL_SEARCH_MIN_LENGTH,
  type GlobalSearchResults,
} from "@/types/search";

const SEARCH_DEBOUNCE_MS = 250;

const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

/**
 * Drives the top bar's "Search for anything..." box: debounces the typed
 * query, skips terms shorter than the API minimum, and cancels the in-flight
 * request whenever the query changes so a slow older response can never
 * overwrite a newer one.
 */
export function useGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(empty_global_search_results);
  const [searched_query, setSearchedQuery] = useState("");
  const [is_loading, setIsLoading] = useState(false);
  const [has_error, setHasError] = useState(false);

  const trimmed_query = query.trim();
  const is_searchable = trimmed_query.length >= GLOBAL_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!is_searchable) {
      setResults(empty_global_search_results);
      setSearchedQuery("");
      setIsLoading(false);
      setHasError(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const next_results = await searchService.search(trimmed_query, { signal: controller.signal });
        setResults(next_results);
        setSearchedQuery(trimmed_query);
        setHasError(false);
      } catch (error) {
        if (isAbortError(error)) return;
        setResults(empty_global_search_results);
        setSearchedQuery(trimmed_query);
        setHasError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmed_query, is_searchable]);

  const resetSearch = useCallback(() => setQuery(""), []);

  const result_count = results.workspaces.length + results.boards.length + results.items.length;

  return useMemo(
    () => ({
      query,
      setQuery,
      resetSearch,
      results,
      result_count,
      /** The trimmed query the current `results` belong to, empty until the first response. */
      searched_query,
      is_searchable,
      is_loading,
      has_error,
    }),
    [query, resetSearch, results, result_count, searched_query, is_searchable, is_loading, has_error]
  );
}
