"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { staffInvitationsService } from "@/services/administration/staff-invitations.service";
import type { PlatformRoleName } from "@/types/administration/admin-users";
import type {
  AdminStaffInvitationDto,
  StaffInvitationSort,
  StaffInvitationStatus,
  StaffInvitationStatusCounts,
} from "@/types/administration/staff-invitations";
import { useDebouncedValue } from "./filters";

export const STAFF_INVITATIONS_PER_PAGE = 20;

const DEFAULT_SORT: StaffInvitationSort = "newest";

export type StaffInvitationsManagerApi = {
  is_loading: boolean;
  error: string | null;
  notice: string | null;
  dismissNotice: () => void;
  status: StaffInvitationStatus | "all";
  setStatus: (status: StaffInvitationStatus | "all") => void;
  query: string;
  setQuery: (value: string) => void;
  role: PlatformRoleName | "";
  setRole: (role: PlatformRoleName | "") => void;
  sort: StaffInvitationSort;
  setSort: (sort: StaffInvitationSort) => void;
  /** Search or role narrow the list (the status lives in the summary cards). */
  has_active_filters: boolean;
  clearFilters: () => void;
  rows: AdminStaffInvitationDto[];
  total: number;
  /** Account wide totals per status, null until the first page loads. */
  counts: StaffInvitationStatusCounts | null;
  page: number;
  setPage: (page: number) => void;
  last_page: number;
  /** The row a resend or cancel is running for. */
  busy_id: number | null;
  resend: (invitation: AdminStaffInvitationDto) => Promise<void>;
  pending_cancel: AdminStaffInvitationDto | null;
  requestCancel: (invitation: AdminStaffInvitationDto) => void;
  closeCancel: () => void;
  confirmCancel: () => Promise<void>;
};

/**
 * Owns Administration > Directory > Invitations: every account invitation sent from the Invite
 * dialog, filtered by status (summary cards), role and search, sorted server side, with resend
 * (which also revives an expired one) and cancel. `version` is bumped by the Users manager after
 * each new invitation, forcing a refetch.
 */
export function useStaffInvitationsManager(version: number): StaffInvitationsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatusValue] = useState<StaffInvitationStatus | "all">("all");
  const [query, setQuery] = useState("");
  const debounced_query = useDebouncedValue(query.trim());
  const [role, setRoleValue] = useState<PlatformRoleName | "">("");
  const [sort, setSortValue] = useState<StaffInvitationSort>(DEFAULT_SORT);
  const [rows, setRows] = useState<AdminStaffInvitationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<StaffInvitationStatusCounts | null>(null);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [reload_token, setReloadToken] = useState(0);
  const [busy_id, setBusyId] = useState<number | null>(null);
  const [pending_cancel, setPendingCancel] = useState<AdminStaffInvitationDto | null>(null);

  const setStatus = useCallback((next: StaffInvitationStatus | "all") => {
    setStatusValue(next);
    setPage(1);
  }, []);

  const setRole = useCallback((next: PlatformRoleName | "") => {
    setRoleValue(next);
    setPage(1);
  }, []);

  const setSort = useCallback((next: StaffInvitationSort) => {
    setSortValue(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setRoleValue("");
    setPage(1);
  }, []);

  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    setPage(1);
  }, [debounced_query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    staffInvitationsService
      .getInvitations({
        status,
        role: role || undefined,
        sort,
        search: debounced_query,
        page,
        per_page: STAFF_INVITATIONS_PER_PAGE,
      })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.total);
        setLastPage(result.last_page);
        setCounts(result.counts);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load invitations."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, role, sort, debounced_query, page, reload_token, version]);

  const resend = useCallback(async (invitation: AdminStaffInvitationDto) => {
    setBusyId(invitation.id);
    setError(null);
    try {
      await staffInvitationsService.resendInvitation(invitation.id);
      setNotice(`Invitation resent to ${invitation.email}. The link works for another 7 days.`);
      setReloadToken((token) => token + 1);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't resend that invitation."));
    } finally {
      setBusyId(null);
    }
  }, []);

  const requestCancel = useCallback((invitation: AdminStaffInvitationDto) => setPendingCancel(invitation), []);
  const closeCancel = useCallback(() => setPendingCancel(null), []);

  const confirmCancel = useCallback(async () => {
    if (!pending_cancel) return;
    const invitation = pending_cancel;
    setPendingCancel(null);
    setBusyId(invitation.id);
    setError(null);
    try {
      await staffInvitationsService.cancelInvitation(invitation.id);
      setNotice(`Invitation to ${invitation.email} canceled.`);
      setReloadToken((token) => token + 1);
    } catch (err) {
      setError(apiErrorMessage(err, "We couldn't cancel that invitation."));
    } finally {
      setBusyId(null);
    }
  }, [pending_cancel]);

  return {
    is_loading,
    error,
    notice,
    dismissNotice,
    status,
    setStatus,
    query,
    setQuery,
    role,
    setRole,
    sort,
    setSort,
    has_active_filters: query.trim() !== "" || role !== "",
    clearFilters,
    rows,
    total,
    counts,
    page,
    setPage,
    last_page,
    busy_id,
    resend,
    pending_cancel,
    requestCancel,
    closeCancel,
    confirmCancel,
  };
}
