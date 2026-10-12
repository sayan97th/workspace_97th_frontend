"use client";
import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import SearchField from "@/components/common/SearchField";
import { Pagination } from "@/components/content";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { ROLE_LABELS } from "../useUsersManager";
import type { StaffInvitationsManagerApi } from "../useStaffInvitationsManager";
import type { StaffInvitationStatus } from "@/types/administration/staff-invitations";

export type InvitationsPanelProps = {
  invitations: StaffInvitationsManagerApi;
  can_manage: boolean;
};

const STATUS_TABS: { id: StaffInvitationStatus | "all"; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "expired", label: "Expired" },
  { id: "accepted", label: "Accepted" },
  { id: "all", label: "All" },
];

const STATUS_BADGE: Record<StaffInvitationStatus, string> = {
  pending: "admin-pill-info",
  expired: "admin-pill-warning",
  accepted: "admin-pill-success",
};

const GRID = "grid grid-cols-[minmax(200px,1.4fr)_110px_minmax(130px,1fr)_minmax(140px,1fr)_130px_150px] gap-3";

/** Administration > Users > Invitations tab: every account invitation, with resend and cancel. */
const InvitationsPanel: React.FC<InvitationsPanelProps> = ({ invitations, can_manage }) => (
  <div>
    {invitations.error ? (
      <div className="mb-3.5 admin-notice admin-notice-error">
        {invitations.error}
      </div>
    ) : null}
    {invitations.notice ? (
      <div className="mb-3.5 admin-notice admin-notice-success">
        {invitations.notice}
      </div>
    ) : null}

    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <SearchField value={invitations.query} onChange={invitations.setQuery} placeholder="Search email" className="w-[240px]" />
      <div className="flex items-center gap-1 rounded-[4px] border border-[var(--admin-border)] p-[3px]">
        {STATUS_TABS.map((tab) => {
          const count = tab.id === "pending" ? invitations.counts.pending : tab.id === "expired" ? invitations.counts.expired : null;
          const is_active = invitations.status === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => invitations.setStatus(tab.id)}
              className={`rounded-[4px] px-2.5 py-[5px] text-[13px] transition-colors ${
                is_active ? "bg-[var(--admin-selected)] text-shell-text" : "text-shell-text-muted hover:text-shell-text-secondary"
              }`}
            >
              {tab.label}
              {count ? <span className="ml-1.5 text-shell-text-faint">{count}</span> : null}
            </button>
          );
        })}
      </div>
    </div>

    <div className="admin-table">
      <div className="min-w-[860px]">
        <div className={`${GRID} admin-table-head`}>
          <span>Email</span>
          <span>Role</span>
          <span>Department</span>
          <span>Invited by</span>
          <span>Status</span>
          <span />
        </div>

        {invitations.is_loading ? (
          <div className="admin-table-empty">Loading invitations…</div>
        ) : invitations.rows.length === 0 ? (
          <div className="admin-table-empty">No invitations here.</div>
        ) : (
          invitations.rows.map((row) => {
            const is_busy = invitations.busy_id === row.id;
            return (
              <div key={row.id} className={`${GRID} items-center admin-table-row`}>
                <span className="min-w-0">
                  <div className="truncate text-[14px] text-shell-text">{row.email}</div>
                  <div className="truncate text-[11.5px] text-shell-text-faint">
                    Sent {format(new Date(row.updated_at), "MMM d, yyyy")}
                  </div>
                </span>
                <span className="text-shell-text-secondary">{ROLE_LABELS[row.role] ?? row.role}</span>
                <span className="truncate text-shell-text-muted">{row.department?.name ?? "None"}</span>
                <span className="truncate text-shell-text-muted">{row.inviter?.full_name ?? "Unknown"}</span>
                <span className="flex flex-col items-start gap-0.5">
                  <span className={`admin-pill capitalize ${STATUS_BADGE[row.status]}`}>
                    {row.status}
                  </span>
                  {row.status === "pending" && row.expires_at ? (
                    <span className="text-[11px] text-shell-text-faint">
                      Expires {formatDistanceToNow(new Date(row.expires_at), { addSuffix: true })}
                    </span>
                  ) : null}
                </span>
                <span className="flex justify-end gap-1.5">
                  {can_manage && row.status !== "accepted" ? (
                    <>
                      <button
                        type="button"
                        disabled={is_busy}
                        onClick={() => void invitations.resend(row)}
                        className="rounded-[4px] border border-[var(--admin-border)] px-2.5 py-1 text-[13px] text-shell-text hover:bg-shell-hover disabled:opacity-50"
                      >
                        {is_busy ? "Sending…" : "Resend"}
                      </button>
                      <button
                        type="button"
                        onClick={() => invitations.requestCancel(row)}
                        className="rounded-[4px] px-2.5 py-1 text-[13px] admin-danger-action"
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>

    <Pagination
      current_page={invitations.page}
      last_page={invitations.last_page}
      total={invitations.total}
      per_page={20}
      onPageChange={invitations.setPage}
    />

    <ConfirmActionModal
      is_open={invitations.pending_cancel !== null}
      title="Cancel invitation"
      description={`The invitation link sent to ${invitations.pending_cancel?.email ?? ""} will stop working. You can always invite them again.`}
      confirm_label="Cancel invitation"
      cancel_label="Keep it"
      variant="danger"
      onConfirm={invitations.confirmCancel}
      onClose={invitations.closeCancel}
    />
  </div>
);

export default InvitationsPanel;
