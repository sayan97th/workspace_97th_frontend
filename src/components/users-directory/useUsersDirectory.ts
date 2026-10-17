"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast/ToastProvider";
import { adminUsersService } from "@/services/administration/admin-users.service";
import { departmentsService } from "@/services/administration/departments.service";
import { impersonationService } from "@/services/admin/impersonation.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { downloadBlob } from "@/lib/download-blob";
import type {
  AdminUserDto,
  AdminUserStatusCounts,
  AdminUsersSortDirection,
  AdminUsersSortField,
  PlatformRoleName,
} from "@/types/administration/admin-users";
import type { DepartmentDto } from "@/types/administration/departments";
import type { ApiError } from "@/types/auth";
import { STAFF_TIER_ROLES, USER_MANAGER_ROLES, canManageAccount } from "./userManagementPermissions";

const SEARCH_DEBOUNCE_MS = 300;

/** Selectable page sizes, mirroring the backend's `UserController::MAX_PER_PAGE` ceiling of 100. */
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_PER_PAGE: (typeof PER_PAGE_OPTIONS)[number] = 25;

export type AccountStatusFilter = "active" | "disabled" | "deleted";

/** A department id, or every user without one. */
export type DepartmentFilter = number | "unassigned";

export type UsersDirectoryApi = {
  is_loading: boolean;
  error: string | null;
  clearError: () => void;
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
  department_filter: DepartmentFilter | null;
  setDepartmentFilter: (department: DepartmentFilter | null) => void;
  department_rows: DepartmentDto[];
  /** Search, role or department narrow the list (the status lives in the summary cards). */
  has_active_filters: boolean;
  clearFilters: () => void;
  /** Users per status for the current search, role and department, null until the first load. */
  status_counts: AdminUserStatusCounts | null;

  sort_field: AdminUsersSortField;
  sort_direction: AdminUsersSortDirection;
  /** Clicking a column that's already sorted flips its direction; clicking a new one sorts ascending. */
  toggleSort: (field: AdminUsersSortField) => void;

  /** Only `super_admin`/`admin` may deactivate, reactivate or delete an account; the backend enforces this too. */
  can_manage: boolean;
  /** The API answered 403, so the page shows the permission message instead of the table. */
  is_forbidden: boolean;
  current_user_id: number | null;
  /** Whether this row may be edited, disabled or deleted by the signed in account, see {@link canManageAccount}. */
  canManageRow: (user: AdminUserDto) => boolean;

  is_exporting: boolean;
  /** Downloads a CSV of every user matching the current search and filters. */
  exportUsers: () => Promise<void>;

  user_pending_toggle: AdminUserDto | null;
  requestToggleActive: (user: AdminUserDto) => void;
  cancelToggleActive: () => void;
  confirmToggleActive: () => Promise<void>;

  user_pending_delete: AdminUserDto | null;
  requestDelete: (user: AdminUserDto) => void;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;

  user_pending_restore: AdminUserDto | null;
  requestRestore: (user: AdminUserDto) => void;
  cancelRestore: () => void;
  confirmRestore: () => Promise<void>;

  /** Whether the signed-in account is allowed to impersonate this specific row, mirroring the backend's authorization rules. */
  canImpersonate: (user: AdminUserDto) => boolean;
  user_pending_impersonate: AdminUserDto | null;
  requestImpersonate: (user: AdminUserDto) => void;
  cancelImpersonate: () => void;
  confirmImpersonate: () => Promise<void>;
};

/**
 * State for the Manage users page: a server searched, filtered, sorted and paginated list of
 * every account, status counts for the summary cards, and the per row account actions
 * (disable, enable, delete, restore, impersonate) behind confirmation dialogs. Sourced from
 * the same `/api/admin/users` endpoints as Administration's Users section.
 */
export function useUsersDirectory(): UsersDirectoryApi {
  const { user, hasAnyRole } = useAuth();
  const { showToast } = useToast();
  const can_manage = hasAnyRole(...USER_MANAGER_ROLES);
  const is_super_admin = hasAnyRole("super_admin");
  const current_user_id = user?.id ?? null;

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
  const [department_filter, setDepartmentFilter] = useState<DepartmentFilter | null>(null);
  const [department_rows, setDepartmentRows] = useState<DepartmentDto[]>([]);
  const [status_counts, setStatusCounts] = useState<AdminUserStatusCounts | null>(null);
  const [is_forbidden, setIsForbidden] = useState(false);
  const [is_exporting, setIsExporting] = useState(false);

  const [sort_field, setSortField] = useState<AdminUsersSortField>("created_at");
  const [sort_direction, setSortDirection] = useState<AdminUsersSortDirection>("desc");

  const [user_pending_toggle, setUserPendingToggle] = useState<AdminUserDto | null>(null);
  const [user_pending_delete, setUserPendingDelete] = useState<AdminUserDto | null>(null);
  const [user_pending_restore, setUserPendingRestore] = useState<AdminUserDto | null>(null);
  const [user_pending_impersonate, setUserPendingImpersonate] = useState<AdminUserDto | null>(null);

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
    const was_active = user_pending_toggle.is_active;
    setStatusCounts((current) =>
      current
        ? {
            ...current,
            active: current.active + (was_active ? -1 : 1),
            disabled: current.disabled + (was_active ? 1 : -1),
          }
        : current
    );
    showToast({
      variant: "success",
      title: was_active ? `${updated.full_name} can no longer sign in` : `${updated.full_name} can sign in again`,
    });
  }, [user_pending_toggle, showToast]);

  const requestDelete = useCallback((user_row: AdminUserDto) => setUserPendingDelete(user_row), []);
  const cancelDelete = useCallback(() => setUserPendingDelete(null), []);

  const confirmDelete = useCallback(async () => {
    if (!user_pending_delete) return;
    await adminUsersService.deleteUser(user_pending_delete.id);
    removeRow(user_pending_delete.id);
    setUserPendingDelete(null);
    setUserTotal((current) => Math.max(0, current - 1));
    const was_active = user_pending_delete.is_active;
    setStatusCounts((current) =>
      current
        ? {
            all: Math.max(0, current.all - 1),
            active: current.active - (was_active ? 1 : 0),
            disabled: current.disabled - (was_active ? 0 : 1),
            deleted: current.deleted + 1,
          }
        : current
    );
    showToast({
      variant: "success",
      title: `${user_pending_delete.full_name} was deleted`,
      description: "You can restore the account from the Deleted card.",
    });
  }, [user_pending_delete, showToast]);

  const requestRestore = useCallback((user_row: AdminUserDto) => setUserPendingRestore(user_row), []);
  const cancelRestore = useCallback(() => setUserPendingRestore(null), []);

  const confirmRestore = useCallback(async () => {
    if (!user_pending_restore) return;
    const restored = await adminUsersService.restoreUser(user_pending_restore.id);
    // The "Deleted" filter lists only deleted accounts, so a restored one leaves it. Elsewhere it just updates in place.
    if (status_filter === "deleted") {
      removeRow(restored.id);
      setUserTotal((current) => Math.max(0, current - 1));
    } else {
      replaceRow(restored);
    }
    setUserPendingRestore(null);
    setStatusCounts((current) =>
      current
        ? {
            all: current.all + 1,
            active: current.active + (restored.is_active ? 1 : 0),
            disabled: current.disabled + (restored.is_active ? 0 : 1),
            deleted: Math.max(0, current.deleted - 1),
          }
        : current
    );
    showToast({ variant: "success", title: `${restored.full_name} was restored` });
  }, [user_pending_restore, status_filter, showToast]);

  /**
   * Client-side mirror of `ImpersonationController::actorCanImpersonate()`, so an ineligible
   * row's impersonate button never even appears: nobody impersonates themselves, an inactive
   * account, or a super_admin, and a plain admin is further limited to client-tier accounts.
   * The backend re-checks all of this independently, this is purely a UI convenience.
   */
  const canImpersonate = useCallback(
    (row: AdminUserDto): boolean => {
      if (!can_manage) return false;
      if (current_user_id === row.id) return false;
      if (!row.is_active) return false;

      const target_role_names = row.roles.map((role) => role.name);
      if (target_role_names.includes("super_admin")) return false;
      if (!is_super_admin && target_role_names.some((name) => STAFF_TIER_ROLES.includes(name))) return false;

      return true;
    },
    [can_manage, is_super_admin, current_user_id]
  );

  const requestImpersonate = useCallback((user_row: AdminUserDto) => setUserPendingImpersonate(user_row), []);
  const cancelImpersonate = useCallback(() => setUserPendingImpersonate(null), []);

  const confirmImpersonate = useCallback(async () => {
    if (!user_pending_impersonate) return;
    await impersonationService.start(user_pending_impersonate.id);
    // Full navigation, not client-side routing, so every provider (auth, workspace, echo)
    // re-initializes cleanly under the impersonated identity instead of carrying over state
    // that was loaded for the admin's own account.
    window.location.href = "/";
  }, [user_pending_impersonate]);

  const canManageRow = useCallback(
    (row: AdminUserDto): boolean => can_manage && canManageAccount(row, current_user_id, is_super_admin),
    [can_manage, current_user_id, is_super_admin]
  );

  const has_active_filters = search_query.trim() !== "" || role_filter !== null || department_filter !== null;

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
    setRoleFilter(null);
    setDepartmentFilter(null);
  }, []);

  const exportUsers = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    try {
      const blob = await adminUsersService.exportUsers({
        search: debounced_query,
        role: role_filter ?? undefined,
        account_status: status_filter ?? undefined,
        department: department_filter ?? undefined,
        sort_field,
        sort_direction,
      });
      downloadBlob(blob, `users-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't export the users."));
    } finally {
      setIsExporting(false);
    }
  }, [debounced_query, role_filter, status_filter, department_filter, sort_field, sort_direction]);

  // Departments only feed the toolbar filter, a failure just leaves it with "All departments".
  useEffect(() => {
    if (!can_manage) return;
    departmentsService
      .getDepartments()
      .then(setDepartmentRows)
      .catch(() => setDepartmentRows([]));
  }, [can_manage]);

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
  }, [debounced_query, per_page, role_filter, status_filter, department_filter, sort_field, sort_direction]);

  useEffect(() => {
    if (!can_manage) {
      setIsLoading(false);
      return;
    }
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
        department: department_filter ?? undefined,
        sort_field,
        sort_direction,
        with_counts: true,
      })
      .then((result) => {
        if (cancelled) return;
        setUserRows(result.data);
        setLastPage(result.last_page);
        setUserTotal(result.total);
        setStatusCounts(result.counts ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        if ((err as ApiError).status_code === 403) {
          setIsForbidden(true);
          return;
        }
        setError(apiErrorMessage(err, "We couldn't load the user list."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [can_manage, debounced_query, page, per_page, role_filter, status_filter, department_filter, sort_field, sort_direction]);

  return {
    is_loading,
    error,
    clearError: () => setError(null),
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
    department_filter,
    setDepartmentFilter,
    department_rows,
    has_active_filters,
    clearFilters,
    status_counts,

    sort_field,
    sort_direction,
    toggleSort,

    can_manage,
    is_forbidden,
    current_user_id,
    canManageRow,

    is_exporting,
    exportUsers,

    user_pending_toggle,
    requestToggleActive,
    cancelToggleActive,
    confirmToggleActive,

    user_pending_delete,
    requestDelete,
    cancelDelete,
    confirmDelete,

    user_pending_restore,
    requestRestore,
    cancelRestore,
    confirmRestore,

    canImpersonate,
    user_pending_impersonate,
    requestImpersonate,
    cancelImpersonate,
    confirmImpersonate,
  };
}
