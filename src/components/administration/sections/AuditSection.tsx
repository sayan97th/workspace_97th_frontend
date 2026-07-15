"use client";
import React from "react";
import SearchField from "@/components/common/SearchField";
import type { AdministrationManagerApi } from "../useAdministrationManager";
import SettingsDropdown from "../SettingsDropdown";
import { ADMIN_AUDIT_EVENT_OPTIONS } from "@/data/administration-data";

export type AuditSectionProps = {
  admin: AdministrationManagerApi;
};

const event_options = ADMIN_AUDIT_EVENT_OPTIONS.map((event) => ({ id: event, label: event }));

/** Administration > Security > Audit — sign-ins and security-setting changes across the account. */
const AuditSection: React.FC<AuditSectionProps> = ({ admin }) => (
  <div>
    <p className="mb-5 max-w-[640px] text-[13px] leading-relaxed text-shell-text-muted">
      See who signed in and when, plus changes made to security settings across this account.
    </p>

    <div className="mb-4 flex items-center gap-3">
      <SearchField
        value={admin.audit_query}
        onChange={admin.setAuditQuery}
        placeholder="Search by user"
        className="w-[240px]"
      />
      <SettingsDropdown
        value={admin.audit_event_filter}
        options={event_options}
        onChange={admin.setAuditEventFilter}
        className="w-[190px]"
      />
    </div>

    <div className="grid grid-cols-[120px_minmax(120px,1fr)_130px_minmax(150px,1.4fr)_120px_90px_80px] gap-3 px-2.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.03em] text-shell-text-faint">
      <span>Timestamp</span>
      <span>User</span>
      <span>Event</span>
      <span>Description</span>
      <span>IP Address</span>
      <span>Browser</span>
      <span>OS</span>
    </div>
    <div className="h-px bg-shell-hover" />

    {admin.audit_rows.map((row) => {
      const user = admin.members.find((member) => member.id === row.user_id);
      return (
        <div
          key={row.id}
          className="grid grid-cols-[120px_minmax(120px,1fr)_130px_minmax(150px,1.4fr)_120px_90px_80px] items-center gap-3 border-b border-shell-border px-2.5 py-[11px] text-[12.5px] text-shell-text-secondary"
        >
          <span>{row.timestamp}</span>
          <span className="truncate font-semibold text-shell-text">{user?.name ?? "Unknown"}</span>
          <span>{row.event}</span>
          <span className="truncate text-shell-text-muted">{row.description}</span>
          <span className="text-shell-text-muted">{row.ip}</span>
          <span className="text-shell-text-muted">{row.browser}</span>
          <span className="text-shell-text-muted">{row.os}</span>
        </div>
      );
    })}
  </div>
);

export default AuditSection;
