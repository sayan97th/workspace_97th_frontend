"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type {
  AdminUserDto,
  AdminUsersSortDirection,
  AdminUsersSortField,
  PlatformRoleName,
} from "@/types/administration/admin-users";

const SEARCH_DEBOUNCE_MS = 300;

/** Selectable page sizes, mirroring the backend's `UserController::MAX_PER_PAGE` ceiling of 100. */
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PER_PAGE: (typeof PER_PAGE_OPTIONS)[number] = 25;

export type AccountStatusFilter = "active" | "disabled";

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

  role_filter: PlatformRoleName | null;
  setRoleFilter: (role: PlatformRoleName | null) => void;
  status_filter: AccountStatusFilter | null;
  setStatusFilter: (status: AccountStatusFilter | null) => void;

  sort_field: AdminUsersSortField;
  sort_direction: AdminUsersSortDirection;
  /** Clicking a column that's already sorted flips its direction; clicking a new one sorts ascending. */
  toggleSort: (field: AdminUsersSortField) => void;

  /** Only `super_admin`/`admin` may deactivate, reactivate or delete an account; the backend enforces this too. */
  can_manage: boolean;
  current_user_id: number | null;

  user_pending_toggle: AdminUserDto | null;
  requestToggleActive: (user: AdminUserDto) => void;
  cancelToggleActive: () => void;
  confirmToggleActive: () => Promise<void>;

  user_pending_delete: AdminUserDto | null;
  requestDelete: (user: AdminUserDto) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
};

/**
 * Read-only roster for the standalone "Users" directory page: a server-searched, filtered,
 * sorted and paginated list of every account on the site, sourced from the same
 * `/api/admin/users` endpoint as Administration's Users section, but without any of that
 * section's mutating actions (role changes, department assignment, invite, ban/unban) since
 * this view is list-only.
 */
export function useUsersDirectory(): UsersDirectoryApi {
  const { user, hasAnyRole } = useAuth();
  const can_manage = hasAnyRole("super_admin", "admin");

  const [user_rows, setUserRows] = useState<AdminUserDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search_query, setSearchQuery] = useState("");
  const [debounced_query, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [per_page, setPerPage] = useState<number>(DEFAULT_PER_PAGE);
  const [last_page, setLastPage] = useState(1);
  const [user_total, setUserTotal] = useState(0);

  const [role_filter, setRoleFilter] = useState<PlatformRoleName | null>(null);
  const [status_filter, setStatusFilter] = useState<AccountStatusFilter | null>(null);

  const [sort_field, setSortField] = useState<AdminUsersSortField>("created_at");
  const [sort_direction, setSortDirection] = useState<AdminUsersSortDirection>("desc");

  const [user_pending_toggle, setUserPendingToggle] = useState<AdminUserDto | null>(null);
  const [user_pending_delete, setUserPendingDelete] = useState<AdminUserDto | null>(null);

  const replaceRow = (updated: AdminUserDto) =>
    setUserRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));

  const removeRow = (deleted_id: number) => setUserRows((current) => current.filter((row) => row.id !== deleted_id));

  const requestToggleActive = useCallback((user_row: AdminUserDto) => setUserPendingToggle(user_row), []);
  const cancelToggleActive = useCallback(() => setUserPendingToggle(null), []);

  const confirmToggleActive = useCallback(async () => {
    if (!user_pending_toggle) return;
    const updated = user_pending_toggle.is_active
      ? await adminUsersService.deactivateUser(user_pending_toggle.id)
      : await adminUsersService.reactivateUser(user_pending_toggle.id);
    replaceRow(updated);
    setUserPendingToggle(null);
  }, [user_pending_toggle]);

  const requestDelete = useCallback((user_row: AdminUserDto) => setUserPendingDelete(user_row), []);
  const cancelDelete = useCallback(() => setUserPendingDelete(null), []);

  const confirmDelete = useCallback(async () => {
    if (!user_pending_delete) return;
    await adminUsersService.deleteUser(user_pending_delete.id);
    removeRow(user_pending_delete.id);
    setUserPendingDelete(null);
    setUserTotal((current) => Math.max(0, current - 1));
  }, [user_pending_delete]);

  const toggleSort = (field: AdminUsersSortField) => {
    if (field === sort_field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(search_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [search_query]);

  useEffect(() => {
    setPage(1);
  }, [debounced_query, per_page, role_filter, status_filter, sort_field, sort_direction]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminUsersService
      .getUsers({
        search: debounced_query,
        page,
        per_page,
        role: role_filter ?? undefined,
        account_status: status_filter ?? undefined,
        sort_field,
        sort_direction,
      })
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
  }, [debounced_query, page, per_page, role_filter, status_filter, sort_field, sort_direction]);

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

    role_filter,
    setRoleFilter,
    status_filter,
    setStatusFilter,

    sort_field,
    sort_direction,
    toggleSort,

    can_manage,
    current_user_id: user?.id ?? null,

    user_pending_toggle,
    requestToggleActive,
    cancelToggleActive,
    confirmToggleActive,

    user_pending_delete,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
