"use client";
import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { staffInvitationsService } from "@/services/administration/staff-invitations.service";
import type { AdminStaffInvitationDto, StaffInvitationStatus } from "@/types/administration/staff-invitations";
import { useDebouncedValue } from "./filters";

const PER_PAGE = 20;

export type StaffInvitationsManagerApi = {
  is_loading: boolean;
  error: string | null;
  notice: string | null;
  status: StaffInvitationStatus | "all";
  setStatus: (status: StaffInvitationStatus | "all") => void;
  query: string;
  setQuery: (value: string) => void;
  rows: AdminStaffInvitationDto[];
  total: number;
  counts: { pending: number; expired: number };
  page: number;
  setPage: (page: number) => void;
  last_page: number;
  busy_id: number | null;
  resend: (invitation: AdminStaffInvitationDto) => Promise<void>;
  pending_cancel: AdminStaffInvitationDto | null;
  requestCancel: (invitation: AdminStaffInvitationDto) => void;
  closeCancel: () => void;
  confirmCancel: () => Promise<void>;
};

/**
 * Owns Administration > Users > Invitations: the invitations sent from the Invite dialog,
 * filtered by status, with resend (which also revives an expired one) and cancel.
 * `version` is bumped by the Users manager after each new invitation, forcing a refetch.
 */
export function useStaffInvitationsManager(version: number): StaffInvitationsManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatusValue] = useState<StaffInvitationStatus | "all">("pending");
  const [query, setQuery] = useState("");
  const debounced_query = useDebouncedValue(query.trim());
  const [rows, setRows] = useState<AdminStaffInvitationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, expired: 0 });
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [reload_token, setReloadToken] = useState(0);
  const [busy_id, setBusyId] = useState<number | null>(null);
  const [pending_cancel, setPendingCancel] = useState<AdminStaffInvitationDto | null>(null);

  const setStatus = useCallback((next: StaffInvitationStatus | "all") => {
    setStatusValue(next);
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debounced_query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    staffInvitationsService
      .getInvitations({ status, search: debounced_query, page, per_page: PER_PAGE })
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
  }, [status, debounced_query, page, reload_token, version]);

  const resend = useCallback(async (invitation: AdminStaffInvitationDto) => {
    setBusyId(invitation.id);
    setError(null);
    try {
      await staffInvitationsService.resendInvitation(invitation.id);
      setNotice(`Invitation resent to ${invitation.email}.`);
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
    await staffInvitationsService.cancelInvitation(pending_cancel.id);
    setNotice(`Invitation to ${pending_cancel.email} canceled.`);
    setPendingCancel(null);
    setReloadToken((token) => token + 1);
  }, [pending_cancel]);

  return {
    is_loading,
    error,
    notice,
    status,
    setStatus,
    query,
    setQuery,
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
