"use client";
import { useEffect, useState } from "react";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { AdminUserDto } from "@/types/administration/admin-users";

const SEARCH_DEBOUNCE_MS = 300;

/** Selectable page sizes, mirroring the backend's `UserController::MAX_PER_PAGE` ceiling of 100. */
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PER_PAGE: (typeof PER_PAGE_OPTIONS)[number] = 25;

export type UsersDirectoryApi = {
  is_loading: boolean;
  error: string | null;
  search_query: string;
  setSearchQuery: (value: string) => void;
  user_rows: AdminUserDto[];
  user_total: number;
  page: number;
  setPage: (page: number) => void;
  last_page: number;
  per_page: number;
  setPerPage: (per_page: number) => void;
};

/**
 * Read-only roster for the standalone "Users" directory page: a server-searched, paginated
 * list of every account on the site, sourced from the same `/api/admin/users` endpoint as
 * Administration's Users section, but without any of that section's mutating actions
 * (role changes, department assignment, invite, ban/unban) since this view is list-only.
 */
export function useUsersDirectory(): UsersDirectoryApi {
  const [user_rows, setUserRows] = useState<AdminUserDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search_query, setSearchQuery] = useState("");
  const [debounced_query, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [per_page, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [last_page, setLastPage] = useState(1);
  const [user_total, setUserTotal] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(search_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [search_query]);

  useEffect(() => {
    setPage(1);
  }, [debounced_query, per_page]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminUsersService
      .getUsers({ search: debounced_query, page, per_page })
      .then((result) => {
        if (cancelled) return;
        setUserRows(result.data);
        setLastPage(result.last_page);
        setUserTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load the user list."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced_query, page, per_page]);

  return {
    is_loading,
    error,
    search_query,
    setSearchQuery,
    user_rows,
    user_total,
    page,
    setPage,
    last_page,
    per_page,
    setPerPage,
  };
}
