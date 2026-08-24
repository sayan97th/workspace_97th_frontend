"use client";
import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { auditLogService } from "@/services/administration/audit-log.service";
import type { AuditLogEntryDto } from "@/types/administration/audit-log";

const SEARCH_DEBOUNCE_MS = 300;
const PER_PAGE = 25;

export type AuditLogManagerApi = {
  is_loading: boolean;
  error: string | null;
  audit_query: string;
  setAuditQuery: (value: string) => void;
  audit_event_filter: string;
  setAuditEventFilter: (value: string) => void;
  audit_rows: AuditLogEntryDto[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  last_page: number;
};

/**
 * Owns the Audit log section: server-side search (by actor name/email) + event filter +
 * pagination against `/api/admin/audit-log`, the same shape as {@link useTeamsManager}'s
 * roster loading effect.
 */
export function useAuditLogManager(): AuditLogManagerApi {
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audit_query, setAuditQuery] = useState("");
  const [debounced_query, setDebouncedQuery] = useState("");
  const [audit_event_filter, setAuditEventFilter] = useState("");
  const [audit_rows, setAuditRows] = useState<AuditLogEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(audit_query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [audit_query]);

  useEffect(() => {
    setPage(1);
  }, [debounced_query, audit_event_filter]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    auditLogService
      .getAuditLog({ search: debounced_query, event: audit_event_filter || undefined, page, per_page: PER_PAGE })
      .then((result) => {
        if (cancelled) return;
        setAuditRows(result.data);
        setTotal(result.total);
        setLastPage(result.last_page);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, "We couldn't load the audit log."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced_query, audit_event_filter, page]);

  return {
    is_loading,
    error,
    audit_query,
    setAuditQuery,
    audit_event_filter,
    setAuditEventFilter,
    audit_rows,
    total,
    page,
    setPage,
    last_page,
  };
}
