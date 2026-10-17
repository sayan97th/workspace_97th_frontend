"use client";
import React from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import {
  InvitationCopyEmailButton,
  InvitationIconButton,
  InvitationInviter,
  InvitationPerson,
  InvitationPlatformRoleBadge,
  InvitationResultCount,
  InvitationSearchInput,
  InvitationSelect,
  InvitationSkeletonRows,
  InvitationStatCards,
  InvitationStatusCell,
  InvitationsEmptyState,
  InvitationsPager,
  PLATFORM_ROLE_META,
  formatInvitationDateTime,
  formatRelative,
} from "@/components/invitations";
import {
  AlertCircleIcon,
  BuildingIcon,
  CheckCircleIcon,
  CloseIcon,
  DeleteIcon,
  InviteIcon,
  MemberIcon,
  RefreshIcon,
  SearchIcon,
  SortArrowsIcon,
} from "@/icons/workspace-icons";
import type { PlatformRoleName } from "@/types/administration/admin-users";
import type { AdminStaffInvitationDto, StaffInvitationSort } from "@/types/administration/staff-invitations";
import { STAFF_INVITATIONS_PER_PAGE, type StaffInvitationsManagerApi } from "../useStaffInvitationsManager";

export type InvitationsPanelProps = {
  invitations: StaffInvitationsManagerApi;
  can_manage: boolean;
  /** Opens the Invite dialog from the empty state. */
  onInvite: () => void;
};

const LIST_STYLE = {
  "--inv-columns": "minmax(240px, 2fr) 136px minmax(120px, 1fr) 150px minmax(140px, 1fr) 108px",
} as React.CSSProperties;

const COLUMN_COUNT = 6;

const ROLE_OPTIONS: ReadonlyArray<{ value: PlatformRoleName | ""; label: string }> = [
  { value: "", label: "All roles" },
  ...(Object.keys(PLATFORM_ROLE_META) as PlatformRoleName[]).map((role) => ({
    value: role,
    label: PLATFORM_ROLE_META[role].label,
  })),
];

const SORT_OPTIONS: ReadonlyArray<{ value: StaffInvitationSort; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "email", label: "Email, A to Z" },
  { value: "expires", label: "Expiring soonest" },
];

const STATUS_EMPTY_COPY: Record<StaffInvitationsManagerApi["status"], { title: string; detail: string }> = {
  all: {
    title: "No invitations yet",
    detail: "Invite people by email. Every account invitation you send shows up here with its status.",
  },
  pending: {
    title: "No pending invitations",
    detail: "Everyone you invited either joined or let the link expire.",
  },
  accepted: {
    title: "Nobody has joined yet",
    detail: "Accounts created from an invitation show up here once the person accepts it.",
  },
  expired: {
    title: "No expired invitations",
    detail: "Every invitation link is still working or was already accepted.",
  },
};

/** The line under the person: who the account is once joined, otherwise when it was last sent. */
const personMeta = (row: AdminStaffInvitationDto): React.ReactNode => {
  if (row.account?.is_deactivated) return "Account deactivated";
  if (row.account) return row.account.job_title || row.email;
  return (
    <PortalTooltip content={`Last sent on ${formatInvitationDateTime(row.updated_at)}`}>
      <span>Sent {formatRelative(row.updated_at)}</span>
    </PortalTooltip>
  );
};

/**
 * Administration > Directory > Invitations list: summary cards that double as the status
 * filter, then one card with search, role filter, sorting and every account invitation. Joined
 * rows show the account that was created; open ones can be resent or canceled. Built from the
 * same invitations kit as the workspace "Sent invitations" page so both look alike.
 */
const InvitationsPanel: React.FC<InvitationsPanelProps> = ({ invitations, can_manage, onInvite }) => {
  const empty_copy = STATUS_EMPTY_COPY[invitations.status];

  return (
    <div className="invitations-theme" data-surface="card">
      <InvitationStatCards counts={invitations.counts} active={invitations.status} onSelect={invitations.setStatus} />

      {invitations.error ? (
        <div role="alert" className="inv-notice" data-tone="danger">
          <AlertCircleIcon size={16} />
          <span>{invitations.error}</span>
        </div>
      ) : null}
      {invitations.notice ? (
        <div role="status" className="inv-notice" data-tone="success">
          <CheckCircleIcon size={16} />
          <span>{invitations.notice}</span>
          <PortalTooltip content="Dismiss">
            <button type="button" aria-label="Dismiss" onClick={invitations.dismissNotice} className="inv-notice-close">
              <CloseIcon size={12} />
            </button>
          </PortalTooltip>
        </div>
      ) : null}

      <section className="inv-card" data-flat="true" aria-label="Account invitations">
        <div className="inv-toolbar">
          <InvitationSearchInput
            value={invitations.query}
            onChange={invitations.setQuery}
            placeholder="Search by email or name"
            is_searching={invitations.is_loading}
          />
          <InvitationSelect
            value={invitations.role}
            onChange={invitations.setRole}
            options={ROLE_OPTIONS}
            label="Filter by role"
            is_active={invitations.role !== ""}
            icon={<MemberIcon size={14} />}
          />
          <span className="inv-toolbar-divider" aria-hidden />
          <InvitationSelect
            value={invitations.sort}
            onChange={invitations.setSort}
            options={SORT_OPTIONS}
            label="Sort by"
            icon={<SortArrowsIcon size={14} />}
          />

          <span className="inv-toolbar-end">
            {invitations.has_active_filters ? (
              <button type="button" onClick={invitations.clearFilters} className="inv-button inv-button-ghost">
                Clear filters
              </button>
            ) : null}
            <InvitationResultCount total={invitations.total} is_loading={invitations.is_loading} />
          </span>
        </div>

        <div className="inv-list" role="table" aria-label="Account invitations" style={LIST_STYLE}>
          <div className="inv-list-head" role="row">
            <span role="columnheader">Person</span>
            <span role="columnheader">Role</span>
            <span role="columnheader">Department</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Invited by</span>
            <span role="columnheader" className="sr-only">
              Actions
            </span>
          </div>

          {invitations.is_loading && invitations.rows.length === 0 ? (
            <InvitationSkeletonRows columns={COLUMN_COUNT} />
          ) : invitations.rows.length === 0 ? (
            invitations.has_active_filters ? (
              <InvitationsEmptyState
                icon={<SearchIcon size={22} />}
                title="No invitations match"
                detail="Try another email, name or role, or clear the filters to see every invitation again."
                actions={
                  <button type="button" onClick={invitations.clearFilters} className="inv-button inv-button-secondary">
                    Clear filters
                  </button>
                }
              />
            ) : (
              <InvitationsEmptyState
                icon={<InviteIcon size={22} />}
                title={empty_copy.title}
                detail={empty_copy.detail}
                actions={
                  can_manage ? (
                    <button type="button" onClick={onInvite} className="inv-button inv-button-primary">
                      Invite people
                    </button>
                  ) : undefined
                }
              />
            )
          ) : (
            <div role="rowgroup" style={{ opacity: invitations.is_loading ? 0.6 : 1, transition: "opacity 120ms ease" }}>
              {invitations.rows.map((row) => {
                const is_busy = invitations.busy_id === row.id;
                const can_change = can_manage && row.status !== "accepted";
                return (
                  <div key={row.id} className="inv-row" role="row">
                    <div className="inv-cell inv-cell-person" role="cell">
                      <InvitationPerson
                        email={row.email}
                        full_name={row.account?.full_name}
                        photo_url={row.account?.profile_photo_url}
                        is_faded={row.account?.is_deactivated}
                        meta={personMeta(row)}
                      />
                    </div>
                    <div className="inv-cell" role="cell" data-label="Role">
                      <InvitationPlatformRoleBadge role={row.role} />
                    </div>
                    <div className="inv-cell" role="cell" data-label="Department">
                      {row.department ? (
                        <PortalTooltip content={`Joins the ${row.department.name} department`} className="max-w-full">
                          <span className="inv-department">
                            <BuildingIcon size={13} />
                            <span>{row.department.name}</span>
                          </span>
                        </PortalTooltip>
                      ) : (
                        <span className="inv-muted">No department</span>
                      )}
                    </div>
                    <div className="inv-cell" role="cell" data-label="Status">
                      <InvitationStatusCell status={row.status} expires_at={row.expires_at} accepted_at={row.accepted_at} />
                    </div>
                    <div className="inv-cell" role="cell" data-label="Invited by">
                      <InvitationInviter inviter={row.inviter} />
                    </div>
                    <div className="inv-cell inv-cell-actions" role="cell">
                      <InvitationCopyEmailButton email={row.email} />
                      {can_change ? (
                        <>
                          <InvitationIconButton
                            label={row.status === "expired" ? "Resend, the link works for 7 more days" : "Resend invitation"}
                            is_busy={is_busy}
                            onClick={() => void invitations.resend(row)}
                          >
                            <RefreshIcon size={15} />
                          </InvitationIconButton>
                          <InvitationIconButton
                            label="Cancel invitation"
                            variant="danger"
                            disabled={is_busy}
                            onClick={() => invitations.requestCancel(row)}
                          >
                            <DeleteIcon size={15} />
                          </InvitationIconButton>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <InvitationsPager
          page={invitations.page}
          last_page={invitations.last_page}
          total={invitations.total}
          per_page={STAFF_INVITATIONS_PER_PAGE}
          onPageChange={invitations.setPage}
        />
      </section>

      <ConfirmActionModal
        is_open={invitations.pending_cancel !== null}
        title="Cancel invitation"
        description={`The invitation link sent to ${invitations.pending_cancel?.email ?? ""} will stop working right away. You can always invite them again.`}
        confirm_label="Cancel invitation"
        cancel_label="Keep it"
        variant="danger"
        onConfirm={invitations.confirmCancel}
        onClose={invitations.closeCancel}
      />
    </div>
  );
};

export default InvitationsPanel;
