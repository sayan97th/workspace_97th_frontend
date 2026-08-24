"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { adminSessionsService } from "@/services/administration/admin-sessions.service";
import type { AdminSessionDto } from "@/types/administration/admin-sessions";

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

  logoutSession: (id: number) => Promise<void>;

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

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(session_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [session_query]);

  useEffect(() => {
    setPage(1);
  }, [debounced_query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    adminSessionsService
      .getSessions({ search: debounced_query, page, per_page: PER_PAGE })
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
  }, [debounced_query, page, refresh_token]);

  const logoutSession = useCallback(async (id: number) => {
    try {
      await adminSessionsService.revokeSession(id);
      setSessionRows((current) => current.filter((row) => row.id !== id));
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't log out that session."));
    }
  }, []);

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

    logoutSession,

    is_logout_all_open,
    openLogoutAll,
    closeLogoutAll,
    logoutAllNotice,
    logoutAllSessions,
  };
}
