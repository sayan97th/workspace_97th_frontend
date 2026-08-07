"use client";
import { useCallback, useEffect, useState } from "react";
import { invitationService } from "@/services/invitation.service";
import type {
  SortDirection,
  WorkspaceInvitation,
  WorkspaceInvitationSortField,
  WorkspaceInvitationsPageMeta,
  WorkspaceInvitationStatus,
  WorkspaceMembershipRole,
} from "@/types/invitation";

const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 450;

export type InvitationsApi = {
  invitations: WorkspaceInvitation[];
  meta: WorkspaceInvitationsPageMeta | null;
  is_loading: boolean;
  error: string | null;

  page: number;
  setPage: (page: number) => void;

  search_value: string;
  setSearchValue: (value: string) => void;

  status_filter: WorkspaceInvitationStatus | "";
  setStatusFilter: (status: WorkspaceInvitationStatus | "") => void;
  role_filter: WorkspaceMembershipRole | "";
  setRoleFilter: (role: WorkspaceMembershipRole | "") => void;

  sort_field: WorkspaceInvitationSortField;
  sort_direction: SortDirection;
  setSort: (field: WorkspaceInvitationSortField, direction: SortDirection) => void;
  /** Clicking a column header: same field toggles direction, a new field starts at desc. */
  toggleColumnSort: (field: WorkspaceInvitationSortField) => void;

  date_from: string;
  date_to: string;
  setDateRange: (from: string, to: string) => void;

  has_active_filters: boolean;
  clearAll: () => void;

  /** Revokes a pending invitation and drops it from the current page locally. */
  revokeInvitation: (id: number) => Promise<void>;
  revoke_error: string | null;

  reload: () => void;
};

/**
 * Owns all state for the "Sent invitations" view — debounced server-side
 * search, single-select status/role filters, column sorting, an "invited at"
 * date range, server-side pagination, and revoking a pending invitation —
 * behind one config-in/API-out hook, mirroring `useTrashManager`/
 * `useWorkspaces` so the view component itself stays presentational.
 */
export function useInvitations(workspace_slug: string | undefined): InvitationsApi {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [meta, setMeta] = useState<WorkspaceInvitationsPageMeta | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoke_error, setRevokeError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search_value, setSearchValue] = useState("");
  const [debounced_search, setDebouncedSearch] = useState("");
  const [status_filter, setStatusFilter] = useState<WorkspaceInvitationStatus | "">("");
  const [role_filter, setRoleFilter] = useState<WorkspaceMembershipRole | "">("");
  const [sort_field, setSortField] = useState<WorkspaceInvitationSortField>("created_at");
  const [sort_direction, setSortDirection] = useState<SortDirection>("desc");
  const [date_from, setDateFrom] = useState("");
  const [date_to, setDateTo] = useState("");
  const [reload_token, setReloadToken] = useState(0);

  // Debounce free-text search before it triggers a refetch.
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search_value.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [search_value]);

  // Any change to search/filters/sort/date range restarts pagination at page 1.
  useEffect(() => {
    setPage(1);
  }, [debounced_search, status_filter, role_filter, sort_field, sort_direction, date_from, date_to]);

  useEffect(() => {
    if (!workspace_slug) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    invitationService
      .listInvitations(workspace_slug, {
        page,
        per_page: PER_PAGE,
        search: debounced_search || undefined,
        status: status_filter || undefined,
        role: role_filter || undefined,
        sort_field,
        sort_direction,
        date_from: date_from || undefined,
        date_to: date_to || undefined,
      })
      .then(({ data, meta: page_meta }) => {
        if (cancelled) return;
        setInvitations(data);
        setMeta(page_meta);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load sent invitations.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspace_slug, page, debounced_search, status_filter, role_filter, sort_field, sort_direction, date_from, date_to, reload_token]);

  const setSort = useCallback((field: WorkspaceInvitationSortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  }, []);

  const toggleColumnSort = useCallback((field: WorkspaceInvitationSortField) => {
    setSortField((current_field) => {
      setSortDirection((current_direction) =>
        current_field === field ? (current_direction === "asc" ? "desc" : "asc") : "desc"
      );
      return field;
    });
  }, []);

  const setDateRange = useCallback((from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const clearAll = useCallback(() => {
    setSearchValue("");
    setStatusFilter("");
    setRoleFilter("");
    setSortField("created_at");
    setSortDirection("desc");
    setDateFrom("");
    setDateTo("");
  }, []);

  const revokeInvitation = useCallback(
    async (id: number) => {
      if (!workspace_slug) return;
      setRevokeError(null);
      try {
        await invitationService.revokeInvitation(workspace_slug, id);
        setInvitations((previous) => previous.filter((invitation) => invitation.id !== id));
        setMeta((previous) => (previous ? { ...previous, total: Math.max(0, previous.total - 1) } : previous));
      } catch {
        setRevokeError("We couldn't revoke that invitation. Please try again.");
      }
    },
    [workspace_slug]
  );

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const has_active_filters =
    search_value.length > 0 || status_filter !== "" || role_filter !== "" || date_from !== "" || date_to !== "";

  return {
    invitations,
    meta,
    is_loading,
    error,
    page,
    setPage,
    search_value,
    setSearchValue,
    status_filter,
    setStatusFilter,
    role_filter,
    setRoleFilter,
    sort_field,
    sort_direction,
    setSort,
    toggleColumnSort,
    date_from,
    date_to,
    setDateRange,
    has_active_filters,
    clearAll,
    revokeInvitation,
    revoke_error,
    reload,
  };
}
