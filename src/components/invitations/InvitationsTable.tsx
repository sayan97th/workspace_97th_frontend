import React from "react";
import type { WorkspaceInvitation, WorkspaceInvitationSortField } from "@/types/invitation";
import type { InvitationsApi } from "./useInvitations";
import InvitationRoleBadge from "./InvitationRoleBadge";
import InvitationStatusBadge from "./InvitationStatusBadge";

const formatDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString() : "—");

const SKELETON_COLUMNS = 7;
const SKELETON_ROWS = 5;

/** Up/down caret pair for a sortable header — the active field+direction is highlighted, matching {@link InvitationsFilterBar}'s sort control. */
const SortIcon: React.FC<{ field: WorkspaceInvitationSortField; active_field: WorkspaceInvitationSortField; direction: "asc" | "desc" }> = ({
  field,
  active_field,
  direction,
}) => {
  const is_active = active_field === field;
  return (
    <span className={`ml-1 inline-flex flex-col gap-px transition-opacity ${is_active ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}>
      <svg
        className={`h-2.5 w-2.5 transition-colors ${is_active && direction === "asc" ? "text-brand-500" : "text-shell-text-muted"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
      <svg
        className={`-mt-1 h-2.5 w-2.5 transition-colors ${is_active && direction === "desc" ? "text-brand-500" : "text-shell-text-muted"}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </span>
  );
};

const SortableHeader: React.FC<{
  field: WorkspaceInvitationSortField;
  active_field: WorkspaceInvitationSortField;
  direction: "asc" | "desc";
  onSort: (field: WorkspaceInvitationSortField) => void;
  children: React.ReactNode;
}> = ({ field, active_field, direction, onSort, children }) => (
  <th
    className="group cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint transition hover:text-shell-text-secondary"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center">
      {children}
      <SortIcon field={field} active_field={active_field} direction={direction} />
    </span>
  </th>
);

export type InvitationsTableProps = {
  invitations: WorkspaceInvitation[];
  is_loading: boolean;
  sort_field: WorkspaceInvitationSortField;
  sort_direction: "asc" | "desc";
  onSort: InvitationsApi["toggleColumnSort"];
  onRevoke: (id: number) => void;
};

/**
 * Sortable Email / Role / Status / Invited By / Invited At / Expires table
 * for the "Sent invitations" view, with a Revoke action for still-pending
 * rows — a real `<table>` (not a flex-row grid) to match the reference
 * implementation this was ported from.
 */
const InvitationsTable: React.FC<InvitationsTableProps> = ({
  invitations,
  is_loading,
  sort_field,
  sort_direction,
  onSort,
  onRevoke,
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-shell-border bg-shell-panel-alt">
          <SortableHeader field="email" active_field={sort_field} direction={sort_direction} onSort={onSort}>
            Email
          </SortableHeader>
          <SortableHeader field="role" active_field={sort_field} direction={sort_direction} onSort={onSort}>
            Role
          </SortableHeader>
          <SortableHeader field="status" active_field={sort_field} direction={sort_direction} onSort={onSort}>
            Status
          </SortableHeader>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint">
            Invited By
          </th>
          <SortableHeader field="created_at" active_field={sort_field} direction={sort_direction} onSort={onSort}>
            Invited At
          </SortableHeader>
          <SortableHeader field="expires_at" active_field={sort_field} direction={sort_direction} onSort={onSort}>
            Expires
          </SortableHeader>
          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-shell-text-faint">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-shell-border">
        {is_loading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, row_index) => (
            <tr key={row_index}>
              {Array.from({ length: SKELETON_COLUMNS }).map((__, column_index) => (
                <td key={column_index} className="px-6 py-4">
                  <div className="h-4 animate-pulse rounded bg-shell-hover" />
                </td>
              ))}
            </tr>
          ))
        ) : invitations.length === 0 ? (
          <tr>
            <td colSpan={SKELETON_COLUMNS} className="px-6 py-12 text-center">
              <div className="flex flex-col items-center gap-2 text-shell-text-muted">
                <svg className="h-8 w-8 text-shell-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0L12 13.5 2.25 6.75"
                  />
                </svg>
                <p className="text-sm font-medium text-shell-text-secondary">No invitations found</p>
                <p className="text-xs text-shell-text-faint">Try adjusting your search or filters</p>
              </div>
            </td>
          </tr>
        ) : (
          invitations.map((invitation) => (
            <tr key={invitation.id} className="transition-colors hover:bg-shell-hover">
              <td className="px-6 py-4 font-medium text-shell-text">{invitation.email}</td>

              <td className="px-6 py-4">
                <InvitationRoleBadge role={invitation.role} />
              </td>

              <td className="px-6 py-4">
                <InvitationStatusBadge status={invitation.status} />
              </td>

              <td className="px-6 py-4">
                {invitation.inviter ? (
                  <div>
                    <p className="text-sm text-shell-text-secondary">{invitation.inviter.full_name}</p>
                  </div>
                ) : (
                  <span className="text-xs text-shell-text-faint">—</span>
                )}
              </td>

              <td className="px-6 py-4 text-sm text-shell-text-muted">{formatDate(invitation.created_at)}</td>

              <td className="px-6 py-4 text-sm text-shell-text-muted">
                {invitation.status === "accepted" ? "—" : formatDate(invitation.expires_at)}
              </td>

              <td className="px-6 py-4 text-right">
                {invitation.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => onRevoke(invitation.id)}
                    className="text-xs font-medium text-error-400 transition-colors hover:text-error-500"
                  >
                    Revoke
                  </button>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default InvitationsTable;
