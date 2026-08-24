"use client";
import React from "react";
import { format } from "date-fns";
import SearchField from "@/components/common/SearchField";
import { Pagination } from "@/components/content";
import SettingsDropdown from "../SettingsDropdown";
import type { AuditLogManagerApi } from "../useAuditLogManager";
import { AUDIT_LOG_EVENTS } from "@/types/administration/audit-log";

export type AuditSectionProps = {
  audit: AuditLogManagerApi;
};

const event_options = [
  { id: "", label: "All events" },
  ...AUDIT_LOG_EVENTS.map((event) => ({ id: event, label: event })),
];

/** Administration > Security > Audit — sign-ins and security-setting changes across the account. */
const AuditSection: React.FC<AuditSectionProps> = ({ audit }) => (
  <div>
    <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
      See who made changes to security-sensitive settings across this account, and when.
    </p>

    {audit.error ? (
      <div className="mb-4 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
        {audit.error}
      </div>
    ) : null}

    <div className="mb-4 flex items-center gap-3">
      <SearchField
        value={audit.audit_query}
        onChange={audit.setAuditQuery}
        placeholder="Search by user"
        className="w-[240px]"
      />
      <SettingsDropdown
        value={audit.audit_event_filter}
        options={event_options}
        onChange={audit.setAuditEventFilter}
        placeholder="All events"
        className="w-[220px]"
      />
    </div>

    <div className="grid grid-cols-[150px_minmax(120px,1fr)_180px_minmax(180px,1.6fr)_120px_140px] gap-3 px-2.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.03em] text-shell-text-faint">
      <span>Timestamp</span>
      <span>User</span>
      <span>Event</span>
      <span>Description</span>
      <span>IP address</span>
      <span>Device</span>
    </div>
    <div className="h-px bg-shell-hover" />

    {audit.is_loading ? (
      <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading audit log…</div>
    ) : audit.audit_rows.length === 0 ? (
      <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">No matching audit events.</div>
    ) : (
      audit.audit_rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[150px_minmax(120px,1fr)_180px_minmax(180px,1.6fr)_120px_140px] items-center gap-3 border-b border-shell-border px-2.5 py-[11px] text-[12.5px] text-shell-text-secondary"
        >
          <span>{format(new Date(row.created_at), "MMM d, yyyy p")}</span>
          <span className="truncate font-semibold text-shell-text">{row.actor?.full_name ?? "System"}</span>
          <span className="truncate font-mono text-[11.5px]">{row.event}</span>
          <span className="truncate text-shell-text-muted">{row.description}</span>
          <span className="text-shell-text-muted">{row.ip_address ?? "None"}</span>
          <span className="truncate text-shell-text-muted">{row.device}</span>
        </div>
      ))
    )}

    <Pagination
      current_page={audit.page}
      last_page={audit.last_page}
      total={audit.total}
      per_page={25}
      onPageChange={audit.setPage}
    />
  </div>
);

export default AuditSection;
