"use client";
import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import SearchField from "@/components/common/SearchField";
import { Pagination } from "@/components/content";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { AdminFilterBar, AdminSortableHeader } from "../filters";
import { SESSION_FILTER_DEFS, type AdminSessionsManagerApi } from "../useAdminSessionsManager";
import type { AdminSessionDto, AdminSessionsSortField } from "@/types/administration/admin-sessions";

export type SessionsSectionProps = {
  sessions: AdminSessionsManagerApi;
};

const GRID = "grid grid-cols-[minmax(200px,1.3fr)_minmax(150px,1fr)_130px_120px_120px_190px] gap-3";

const DEVICE_TYPE_LABELS: Record<AdminSessionDto["device_type"], string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
};

/** Administration > Security > Sessions: every account user's currently active sign ins. */
const SessionsSection: React.FC<SessionsSectionProps> = ({ sessions }) => {
  const headerSort = (label: string, field: AdminSessionsSortField) => (
    <AdminSortableHeader
      label={label}
      field={field}
      sort_field={sessions.sort_field}
      sort_direction={sessions.sort_direction}
      onSort={sessions.toggleSort}
    />
  );

  return (
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

      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <SearchField
          value={sessions.session_query}
          onChange={sessions.setSessionQuery}
          placeholder="Search name or email"
          className="w-[260px]"
        />
        <AdminFilterBar
          defs={SESSION_FILTER_DEFS}
          state={sessions.filters.filter_state}
          onChange={sessions.filters.setFilter}
          onClearAll={sessions.filters.clearFilters}
        />
      </div>

      <div className="mb-2.5 text-[12.5px] text-shell-text-faint">{sessions.total} active sessions</div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className={`${GRID} px-2.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.03em] text-shell-text-faint`}>
            {headerSort("Active user", "user")}
            <span>Device</span>
            <span>IP address</span>
            {headerSort("Signed in", "created_at")}
            {headerSort("Last usage", "last_used_at")}
            <span />
          </div>
          <div className="h-px bg-shell-hover" />

          {sessions.is_loading ? (
            <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">Loading active sessions…</div>
          ) : sessions.session_rows.length === 0 ? (
            <div className="px-2.5 py-8 text-center text-[13px] text-shell-text-faint">No active sessions match.</div>
          ) : (
            sessions.session_rows.map((row) => (
              <div
                key={row.id}
                className={`${GRID} items-center border-b border-shell-border px-2.5 py-[10px] text-[12.5px] text-shell-text-secondary`}
              >
                <span className="min-w-0">
                  <div className="truncate font-semibold text-shell-text">{row.user?.full_name ?? "Unknown user"}</div>
                  {row.user?.email ? <div className="truncate text-[11.5px] text-shell-text-faint">{row.user.email}</div> : null}
                </span>
                <span className="min-w-0">
                  <div className="truncate text-shell-text-muted">{row.device}</div>
                  <div className="text-[11.5px] text-shell-text-faint">{DEVICE_TYPE_LABELS[row.device_type] ?? "Desktop"}</div>
                </span>
                <span className="truncate text-shell-text-muted">{row.ip_address ?? "None"}</span>
                <span className="text-shell-text-muted" title={format(new Date(row.created_at), "MMM d, yyyy p")}>
                  {format(new Date(row.created_at), "MMM d, yyyy")}
                </span>
                <span className="text-shell-text-muted">
                  {formatDistanceToNow(new Date(row.last_used_at), { addSuffix: true })}
                </span>
                <span className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => void sessions.logoutSession(row.id)}
                    className="rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 py-1.5 text-center text-[11.5px] font-semibold text-shell-text-secondary transition-colors hover:border-[#e2445c]/30 hover:bg-[#e2445c]/[0.14] hover:text-[#ff8a94]"
                  >
                    Log out
                  </button>
                  {row.user ? (
                    <button
                      type="button"
                      onClick={() => sessions.requestLogoutUser({ id: row.user!.id, full_name: row.user!.full_name })}
                      title="Log this user out on every device"
                      className="rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold text-[#ff8a94] transition-colors hover:bg-[#e2445c]/[0.12]"
                    >
                      Everywhere
                    </button>
                  ) : null}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <Pagination
        current_page={sessions.page}
        last_page={sessions.last_page}
        total={sessions.total}
        per_page={25}
        onPageChange={sessions.setPage}
      />

      <ConfirmActionModal
        is_open={sessions.user_pending_logout !== null}
        title="Log out this user everywhere"
        description={`Every active session of ${sessions.user_pending_logout?.full_name ?? "this user"} will end, on every device. They will need to sign in again.`}
        confirm_label="Log out everywhere"
        variant="danger"
        onConfirm={sessions.confirmLogoutUser}
        onClose={sessions.closeLogoutUser}
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
};

export default SessionsSection;
