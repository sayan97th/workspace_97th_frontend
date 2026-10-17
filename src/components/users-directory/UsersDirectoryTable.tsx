"use client";
import React from "react";
import Link from "next/link";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import {
  InvitationAvatar,
  InvitationSentDate,
  InvitationSkeletonRows,
  InvitationsEmptyState,
  formatInvitationDateTime,
  formatRelative,
} from "@/components/invitations";
import { primaryRole } from "@/components/administration/useUsersManager";
import { BuildingIcon, ChevronDownIcon, ClockIcon, LockIcon, PencilIcon, SearchIcon, TeamsIcon } from "@/icons/workspace-icons";
import UserRoleBadge from "./UserRoleBadge";
import UserStatusBadge from "./UserStatusBadge";
import UserRowActionsMenu from "./UserRowActionsMenu";
import { STAFF_TIER_LOCKED_HINT } from "./userManagementPermissions";
import type { AdminUserDto, AdminUsersSortDirection, AdminUsersSortField } from "@/types/administration/admin-users";

const LIST_STYLE = {
  "--inv-columns": "minmax(220px, 2.2fr) 124px minmax(130px, 1fr) minmax(140px, 1fr) 120px 76px",
  "--inv-min-width": "880px",
} as React.CSSProperties;

const COLUMN_COUNT = 6;

const SortableHeader: React.FC<{
  field: AdminUsersSortField;
  sort_field: AdminUsersSortField;
  sort_direction: AdminUsersSortDirection;
  onSort: (field: AdminUsersSortField) => void;
  children: React.ReactNode;
}> = ({ field, sort_field, sort_direction, onSort, children }) => {
  const is_active = sort_field === field;
  return (
    <span role="columnheader" aria-sort={is_active ? (sort_direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        data-active={is_active ? "true" : "false"}
        data-direction={sort_direction}
        className="inv-sort-button"
      >
        {children}
        <ChevronDownIcon size={11} className="inv-sort-caret" />
      </button>
    </span>
  );
};

/** "Last active 3 days ago" under the status pill, the exact time in a tooltip. */
const LastActive: React.FC<{ iso: string | null | undefined }> = ({ iso }) =>
  iso ? (
    <PortalTooltip content={`Last active ${formatInvitationDateTime(iso)}`}>
      <span className="ud-status-meta">
        <ClockIcon size={11} />
        {formatRelative(iso)}
      </span>
    </PortalTooltip>
  ) : (
    <PortalTooltip content="This person has not signed in yet.">
      <span className="ud-status-meta">Never signed in</span>
    </PortalTooltip>
  );

export type UsersDirectoryTableProps = {
  user_rows: AdminUserDto[];
  is_loading: boolean;
  sort_field: AdminUsersSortField;
  sort_direction: AdminUsersSortDirection;
  onSort: (field: AdminUsersSortField) => void;
  current_user_id: number | null;
  /** Whether the signed in account may change this row, see `canManageAccount`. */
  canManageRow: (user: AdminUserDto) => boolean;
  onToggleActive: (user: AdminUserDto) => void;
  onDelete: (user: AdminUserDto) => void;
  onRestore: (user: AdminUserDto) => void;
  /** Whether the signed-in account may impersonate this specific row; hides the menu item when false. */
  canImpersonate: (user: AdminUserDto) => boolean;
  onImpersonate: (user: AdminUserDto) => void;
  has_active_filters: boolean;
  onClearFilters: () => void;
};

/**
 * Person / Role / Department / Status / Joined / Actions list for Manage users, on the same
 * grid as the Invitations lists. Header clicks sort server side (`AdminUserQuery::applySort()`),
 * below 820px each row becomes a card. Rows the signed in account cannot change show a lock
 * with the reason instead of the edit buttons.
 */
const UsersDirectoryTable: React.FC<UsersDirectoryTableProps> = ({
  user_rows,
  is_loading,
  sort_field,
  sort_direction,
  onSort,
  current_user_id,
  canManageRow,
  onToggleActive,
  onDelete,
  onRestore,
  canImpersonate,
  onImpersonate,
  has_active_filters,
  onClearFilters,
}) => {
  const sort_props = { sort_field, sort_direction, onSort };

  return (
    <div className="inv-list" role="table" aria-label="Users" style={LIST_STYLE}>
      <div className="inv-list-head" role="row">
        <SortableHeader field="name" {...sort_props}>
          Name
        </SortableHeader>
        <SortableHeader field="role" {...sort_props}>
          Role
        </SortableHeader>
        <SortableHeader field="department" {...sort_props}>
          Department
        </SortableHeader>
        <SortableHeader field="status" {...sort_props}>
          Status
        </SortableHeader>
        <SortableHeader field="created_at" {...sort_props}>
          Joined
        </SortableHeader>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>

      {is_loading && user_rows.length === 0 ? (
        <InvitationSkeletonRows columns={COLUMN_COUNT} rows={8} />
      ) : user_rows.length === 0 ? (
        has_active_filters ? (
          <InvitationsEmptyState
            icon={<SearchIcon size={22} />}
            title="No users match"
            detail="Try another name or email, or clear the filters to see everyone again."
            actions={
              <button type="button" onClick={onClearFilters} className="inv-button inv-button-secondary">
                Clear filters
              </button>
            }
          />
        ) : (
          <InvitationsEmptyState
            icon={<TeamsIcon size={22} />}
            title="No users here"
            detail="No account has this status right now."
          />
        )
      ) : (
        <div role="rowgroup" style={{ opacity: is_loading ? 0.6 : 1, transition: "opacity 120ms ease" }}>
          {user_rows.map((row) => {
            const is_self = current_user_id !== null && row.id === current_user_id;
            const is_deleted = Boolean(row.deleted_at);
            const can_manage_row = canManageRow(row);
            const edit_href = `/users/${row.id}/edit`;

            const person = (
              <div className="inv-person" data-faded={is_deleted || !row.is_active ? "true" : undefined}>
                <InvitationAvatar email={row.email} full_name={row.full_name} photo_url={row.profile_photo_url} />
                <span className="min-w-0">
                  <span className="ud-person-name">
                    <span className="inv-person-email">{row.full_name}</span>
                    {is_self ? <span className="ud-you-tag">You</span> : null}
                  </span>
                  <span className="inv-person-meta">{row.email}</span>
                </span>
              </div>
            );

            return (
              <div key={row.id} className="inv-row ud-row" role="row" data-faded={is_deleted ? "true" : undefined}>
                <div className="inv-cell inv-cell-person" role="cell">
                  {can_manage_row ? (
                    <PortalTooltip content={`Edit ${row.full_name}`} className="max-w-full">
                      <Link href={edit_href} className="ud-person-link block">
                        {person}
                      </Link>
                    </PortalTooltip>
                  ) : (
                    person
                  )}
                </div>

                <div className="inv-cell" role="cell" data-label="Role">
                  <UserRoleBadge role={primaryRole(row)} />
                </div>

                <div className="inv-cell" role="cell" data-label="Department">
                  {row.department ? (
                    <span className="inv-department">
                      <BuildingIcon size={14} />
                      <span>{row.department.name}</span>
                    </span>
                  ) : (
                    <span className="inv-muted">No department</span>
                  )}
                </div>

                <div className="inv-cell" role="cell" data-label="Status">
                  <div className="inv-status-stack">
                    <UserStatusBadge is_active={row.is_active} is_deleted={is_deleted} />
                    {is_deleted ? null : <LastActive iso={row.last_active_at} />}
                  </div>
                </div>

                <div className="inv-cell" role="cell" data-label="Joined">
                  <InvitationSentDate iso={row.created_at} />
                </div>

                <div className="inv-cell inv-cell-actions" role="cell">
                  {can_manage_row ? (
                    <>
                      {is_deleted ? null : (
                        <PortalTooltip content="Edit user">
                          <Link href={edit_href} aria-label={`Edit ${row.full_name}`} className="inv-icon-button">
                            <PencilIcon size={15} />
                          </Link>
                        </PortalTooltip>
                      )}
                      <UserRowActionsMenu
                        user={row}
                        can_impersonate={canImpersonate(row)}
                        onToggleActive={() => onToggleActive(row)}
                        onDelete={() => onDelete(row)}
                        onRestore={() => onRestore(row)}
                        onImpersonate={() => onImpersonate(row)}
                      />
                    </>
                  ) : (
                    <PortalTooltip
                      content={is_self ? "This is you. Change your own account from My Profile." : STAFF_TIER_LOCKED_HINT}
                    >
                      <span className="ud-locked" tabIndex={0} aria-label={is_self ? "Your account" : "Read only account"}>
                        <LockIcon size={15} />
                      </span>
                    </PortalTooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UsersDirectoryTable;
