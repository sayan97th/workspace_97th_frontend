"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminSessionsService } from "@/services/administration/admin-sessions.service";
import type { AdminSessionDto, AdminSessionsSortField } from "@/types/administration/admin-sessions";
import { useAdminFilterState, useAdminSort, type AdminFilterDef, type AdminFilterStateApi } from "./filters";

/** Column filters for the Sessions table, each typed after its column. */
export const SESSION_FILTER_DEFS: AdminFilterDef[] = [
  {
    key: "device_type",
    label: "Device type",
    kind: "multi_select",
    param: "device_type",
    options: [
      { id: "desktop", label: "Desktop" },
      { id: "mobile", label: "Mobile" },
      { id: "tablet", label: "Tablet" },
    ],
  },
  {
    key: "browser",
    label: "Browser",
    kind: "multi_select",
    param: "browser",
    options: [
      { id: "chrome", label: "Chrome" },
      { id: "firefox", label: "Firefox" },
      { id: "safari", label: "Safari" },
      { id: "edge", label: "Edge" },
      { id: "opera", label: "Opera" },
    ],
  },
  {
    key: "last_used",
    label: "Last usage",
    kind: "date_range",
    from_param: "last_used_from",
    to_param: "last_used_to",
    presets: ["today", "last_7_days", "older_than_30_days", "custom"],
  },
];

const SEARCH_DEBOUNCE_MS = 300;
const PER_PAGE = 25;

export type AdminSessionsManagerApi = {
  is_loading: boolean;
  error: string | null;
  session_query: string;
  setSessionQuery: (value: string) => void;
  session_rows: AdminSessionDto[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  last_page: number;

  filters: AdminFilterStateApi;
  sort_field: AdminSessionsSortField;
  sort_direction: "asc" | "desc";
  toggleSort: (field: AdminSessionsSortField) => void;

  logoutSession: (id: number) => Promise<void>;
  /** Pending "log out this user everywhere" confirmation. */
  user_pending_logout: { id: number; full_name: string } | null;
  requestLogoutUser: (user: { id: number; full_name: string }) => void;
  closeLogoutUser: () => void;
  confirmLogoutUser: () => Promise<void>;

  is_logout_all_open: boolean;
  openLogoutAll: () => void;
  closeLogoutAll: () => void;
  logoutAllNotice: string | null;
  logoutAllSessions: () => Promise<void>;
};

/**
 * Owns the Sessions section: the account-wide, all-users version of
 * {@link useProfileManager}'s own session fetch/logout, against `/api/admin/sessions`.
 * "Log out all account users" is routed through a confirmation modal, the old mock version
 * fired on a single click with no confirmation at all despite being fully destructive.
 */
export function useAdminSessionsManager(): AdminSessionsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session_query, setSessionQuery] = useState("");
  const [debounced_query, setDebouncedQuery] = useState("");
  const [session_rows, setSessionRows] = useState<AdminSessionDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [refresh_token, setRefreshToken] = useState(0);
  const [is_logout_all_open, setIsLogoutAllOpen] = useState(false);
  const [logoutAllNotice, setLogoutAllNotice] = useState<string | null>(null);
  const [user_pending_logout, setUserPendingLogout] = useState<{ id: number; full_name: string } | null>(null);
  const filters = useAdminFilterState(SESSION_FILTER_DEFS);
  const { filter_params, filter_key } = filters;
  const { sort_field, sort_direction, toggleSort } = useAdminSort<AdminSessionsSortField>("last_used_at", "desc");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(session_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [session_query]);

  useEffect(() => {
    setPage(1);
  }, [debounced_query, filter_key, sort_field, sort_direction]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminSessionsService
      .getSessions({ search: debounced_query, page, per_page: PER_PAGE, sort_field, sort_direction, filter_params })
      .then((result) => {
        if (cancelled) return;
        setSessionRows(result.data);
        setTotal(result.total);
        setLastPage(result.last_page);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load active sessions."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // `filter_key` is the stable string form of `filter_params`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced_query, page, refresh_token, filter_key, sort_field, sort_direction]);

  const logoutSession = useCallback(async (id: number) => {
    try {
      await adminSessionsService.revokeSession(id);
      setSessionRows((current) => current.filter((row) => row.id !== id));
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't log out that session."));
    }
  }, []);

  const requestLogoutUser = useCallback((user: { id: number; full_name: string }) => {
    setLogoutAllNotice(null);
    setUserPendingLogout(user);
  }, []);
  const closeLogoutUser = useCallback(() => setUserPendingLogout(null), []);

  const confirmLogoutUser = useCallback(async () => {
    if (!user_pending_logout) return;
    const count = await adminSessionsService.revokeUserSessions(user_pending_logout.id);
    setLogoutAllNotice(
      count === 1
        ? `1 session of ${user_pending_logout.full_name} logged out.`
        : `${count} sessions of ${user_pending_logout.full_name} logged out.`
    );
    setUserPendingLogout(null);
    setRefreshToken((token) => token + 1);
  }, [user_pending_logout]);

  const openLogoutAll = useCallback(() => {
    setLogoutAllNotice(null);
    setIsLogoutAllOpen(true);
  }, []);
  const closeLogoutAll = useCallback(() => setIsLogoutAllOpen(false), []);

  const logoutAllSessions = useCallback(async () => {
    const count = await adminSessionsService.revokeAllSessions();
    setLogoutAllNotice(count === 1 ? "1 session logged out." : `${count} sessions logged out.`);
    setRefreshToken((token) => token + 1);
  }, []);

  return {
    is_loading,
    error,
    session_query,
    setSessionQuery,
    session_rows,
    total,
    page,
    setPage,
    last_page,

    filters,
    sort_field,
    sort_direction,
    toggleSort,

    logoutSession,
    user_pending_logout,
    requestLogoutUser,
    closeLogoutUser,
    confirmLogoutUser,

    is_logout_all_open,
    openLogoutAll,
    closeLogoutAll,
    logoutAllNotice,
    logoutAllSessions,
  };
}
