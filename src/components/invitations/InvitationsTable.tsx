"use client";
import React from "react";
import type { WorkspaceInvitation, WorkspaceInvitationSortField } from "@/types/invitation";
import { ChevronDownIcon, DeleteIcon, InviteIcon, SearchIcon } from "@/icons/workspace-icons";
import type { InvitationsApi } from "./useInvitations";
import InvitationRoleBadge from "./InvitationRoleBadge";
import {
  InvitationCopyEmailButton,
  InvitationIconButton,
  InvitationInviter,
  InvitationPerson,
  InvitationSentDate,
  InvitationSkeletonRows,
  InvitationStatusCell,
  InvitationsEmptyState,
} from "./InvitationParts";
import { formatRelative } from "./invitationFormat";

const LIST_STYLE = {
  "--inv-columns": "minmax(240px, 2fr) 120px minmax(160px, 1.2fr) minmax(150px, 1.1fr) 130px 76px",
} as React.CSSProperties;

const COLUMN_COUNT = 6;

const SortableHeader: React.FC<{
  field: WorkspaceInvitationSortField;
  active_field: WorkspaceInvitationSortField;
  direction: "asc" | "desc";
  onSort: (field: WorkspaceInvitationSortField) => void;
  children: React.ReactNode;
}> = ({ field, active_field, direction, onSort, children }) => {
  const is_active = active_field === field;
  return (
    <span role="columnheader" aria-sort={is_active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        data-active={is_active ? "true" : "false"}
        data-direction={direction}
        className="inv-sort-button"
      >
        {children}
        <ChevronDownIcon size={11} className="inv-sort-caret" />
      </button>
    </span>
  );
};

export type InvitationsTableProps = {
  invitations: WorkspaceInvitation[];
  is_loading: boolean;
  sort_field: WorkspaceInvitationSortField;
  sort_direction: "asc" | "desc";
  onSort: InvitationsApi["toggleColumnSort"];
  /** Asks for confirmation before revoking a pending invitation. */
  onRevoke: (invitation: WorkspaceInvitation) => void;
  revoking_id: number | null;
  has_active_filters: boolean;
  onClearFilters: () => void;
  onInvite: () => void;
};

/**
 * Person / Role / Status / Invited by / Invited / Actions list for the workspace "Sent
 * invitations" page. Header clicks sort server side; below 820px each row becomes a card.
 */
const InvitationsTable: React.FC<InvitationsTableProps> = ({
  invitations,
  is_loading,
  sort_field,
  sort_direction,
  onSort,
  onRevoke,
  revoking_id,
  has_active_filters,
  onClearFilters,
  onInvite,
}) => {
  const sort_props = { active_field: sort_field, direction: sort_direction, onSort };

  return (
    <div className="inv-list" role="table" aria-label="Sent invitations" style={LIST_STYLE}>
      <div className="inv-list-head" role="row">
        <SortableHeader field="email" {...sort_props}>
          Person
        </SortableHeader>
        <SortableHeader field="role" {...sort_props}>
          Role
        </SortableHeader>
        <SortableHeader field="status" {...sort_props}>
          Status
        </SortableHeader>
        <span role="columnheader">Invited by</span>
        <SortableHeader field="created_at" {...sort_props}>
          Invited
        </SortableHeader>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>

      {is_loading && invitations.length === 0 ? (
        <InvitationSkeletonRows columns={COLUMN_COUNT} />
      ) : invitations.length === 0 ? (
        has_active_filters ? (
          <InvitationsEmptyState
            icon={<SearchIcon size={22} />}
            title="No invitations match"
            detail="Try another email or clear the filters to see every invitation again."
            actions={
              <button type="button" onClick={onClearFilters} className="inv-button inv-button-secondary">
                Clear filters
              </button>
            }
          />
        ) : (
          <InvitationsEmptyState
            icon={<InviteIcon size={22} />}
            title="No invitations yet"
            detail="Invite teammates by email. Every invitation you send shows up here with its status."
            actions={
              <button type="button" onClick={onInvite} className="inv-button inv-button-primary">
                Invite member
              </button>
            }
          />
        )
      ) : (
        <div role="rowgroup" style={{ opacity: is_loading ? 0.6 : 1, transition: "opacity 120ms ease" }}>
          {invitations.map((invitation) => (
            <div key={invitation.id} className="inv-row" role="row">
              <div className="inv-cell inv-cell-person" role="cell">
                <InvitationPerson
                  email={invitation.email}
                  meta={invitation.created_at ? `Invited ${formatRelative(invitation.created_at)}` : undefined}
                />
              </div>
              <div className="inv-cell" role="cell" data-label="Role">
                <InvitationRoleBadge role={invitation.role} />
              </div>
              <div className="inv-cell" role="cell" data-label="Status">
                <InvitationStatusCell
                  status={invitation.status}
                  expires_at={invitation.expires_at}
                  accepted_at={invitation.accepted_at}
                />
              </div>
              <div className="inv-cell" role="cell" data-label="Invited by">
                <InvitationInviter inviter={invitation.inviter} />
              </div>
              <div className="inv-cell" role="cell" data-label="Invited">
                <InvitationSentDate iso={invitation.created_at} />
              </div>
              <div className="inv-cell inv-cell-actions" role="cell">
                <InvitationCopyEmailButton email={invitation.email} />
                {invitation.status === "pending" ? (
                  <InvitationIconButton
                    label="Revoke invitation"
                    variant="danger"
                    is_busy={revoking_id === invitation.id}
                    onClick={() => onRevoke(invitation)}
                  >
                    <DeleteIcon size={15} />
                  </InvitationIconButton>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvitationsTable;
