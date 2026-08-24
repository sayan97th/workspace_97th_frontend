"use client";
import React from "react";
import { formatDistanceToNow } from "date-fns";
import SearchField from "@/components/common/SearchField";
import { Pagination } from "@/components/content";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import type { AdminSessionsManagerApi } from "../useAdminSessionsManager";

export type SessionsSectionProps = {
  sessions: AdminSessionsManagerApi;
};

/** Administration > Security > Sessions — every account user's currently active sign-ins. */
const SessionsSection: React.FC<SessionsSectionProps> = ({ sessions }) => (
  <div>
    <div className="mb-4 flex items-start justify-between gap-5">
      <p className="max-w-[480px] text-[13px] leading-relaxed text-shell-text-muted">
        As an admin, you can view and control the sessions for every user on this account.
      </p>
      <button
        type="button"
        onClick={sessions.openLogoutAll}
        className="flex flex-none items-center gap-[7px] whitespace-nowrap rounded-[9px] bg-[#e2445c] px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45]"
      >
        <svg width="13" height="13" viewBox="0 0 16 16">
          <path
            d="M6 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h2M10.5 5 13.5 8l-3 3M13.5 8h-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Log out all account users
      </button>
    </div>

    {sessions.error ? (
      <div className="mb-4 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
        {sessions.error}
      </div>
    ) : null}

    {sessions.logoutAllNotice ? (
      <div className="mb-4 rounded-[9px] border border-shell-border-strong bg-shell-panel-alt px-3.5 py-2.5 text-[12.5px] font-medium text-[#8fe3b8]">
        {sessions.logoutAllNotice}
      </div>
    ) : null}

    <SearchField
      value={sessions.session_query}
      onChange={sessions.setSessionQuery}
      placeholder="Search name"
      className="mb-4 w-[280px]"
    />

    <div className="grid grid-cols-[minmax(180px,1.2fr)_160px_140px_130px_90px] gap-3 px-2.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.03em] text-shell-text-faint">
      <span>Active user</span>
      <span>Device</span>
      <span>IP address</span>
      <span>Last usage</span>
      <span />
    </div>
    <div className="h-px bg-shell-hover" />

    {sessions.is_loading ? (
      <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading active sessions…</div>
    ) : sessions.session_rows.length === 0 ? (
      <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">No active sessions.</div>
    ) : (
      sessions.session_rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(180px,1.2fr)_160px_140px_130px_90px] items-center gap-3 border-b border-shell-border px-2.5 py-[10px] text-[12.5px] text-shell-text-secondary"
        >
          <span className="truncate font-semibold text-shell-text">{row.user?.full_name ?? "Unknown user"}</span>
          <span className="text-shell-text-muted">{row.device}</span>
          <span className="text-shell-text-muted">{row.ip_address ?? "None"}</span>
          <span className="text-shell-text-muted">
            {formatDistanceToNow(new Date(row.last_used_at), { addSuffix: true })}
          </span>
          <button
            type="button"
            onClick={() => void sessions.logoutSession(row.id)}
            className="rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 py-1.5 text-center text-[11.5px] font-semibold text-shell-text-secondary transition-colors hover:border-[#e2445c]/30 hover:bg-[#e2445c]/[0.14] hover:text-[#ff8a94]"
          >
            Log out
          </button>
        </div>
      ))
    )}

    <Pagination
      current_page={sessions.page}
      last_page={sessions.last_page}
      total={sessions.total}
      per_page={25}
      onPageChange={sessions.setPage}
    />

    <ConfirmActionModal
      is_open={sessions.is_logout_all_open}
      title="Log out all account users"
      description="Every active session for every user on this account will be ended, except your own. Everyone will need to sign in again."
      confirm_label="Log out all users"
      danger
      onConfirm={sessions.logoutAllSessions}
      onClose={sessions.closeLogoutAll}
    />
  </div>
);

export default SessionsSection;
