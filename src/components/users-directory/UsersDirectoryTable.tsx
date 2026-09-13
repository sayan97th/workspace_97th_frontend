import React from "react";
import { PersonAvatar } from "@/components/board";
import { toPersonOption } from "@/components/administration/adminUserMapping";
import { primaryRole } from "@/components/administration/useUsersManager";
import UserRoleBadge from "./UserRoleBadge";
import UserStatusBadge from "./UserStatusBadge";
import type { AdminUserDto, AdminUsersSortDirection, AdminUsersSortField } from "@/types/administration/admin-users";

const COLUMN_COUNT = 5;
const SKELETON_ROWS = 8;

const formatDate = (iso: string): string => new Date(iso).toLocaleDateString();

/** Up/down caret pair for a sortable header, the active field+direction highlighted. */
const SortIcon: React.FC<{ is_active: boolean; direction: AdminUsersSortDirection }> = ({ is_active, direction }) => (
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

const SortableHeader: React.FC<{
  field: AdminUsersSortField;
  sort_field: AdminUsersSortField;
  sort_direction: AdminUsersSortDirection;
  onSort: (field: AdminUsersSortField) => void;
  children: React.ReactNode;
}> = ({ field, sort_field, sort_direction, onSort, children }) => (
  <th
    className="group cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-shell-text-faint transition-colors hover:text-shell-text-secondary"
    onClick={() => onSort(field)}
  >
    <span className="inline-flex items-center">
      {children}
      <SortIcon is_active={sort_field === field} direction={sort_direction} />
    </span>
  </th>
);

export type UsersDirectoryTableProps = {
  user_rows: AdminUserDto[];
  is_loading: boolean;
  sort_field: AdminUsersSortField;
  sort_direction: AdminUsersSortDirection;
  onSort: (field: AdminUsersSortField) => void;
};

/**
 * Real `<table>` roster for the standalone Users directory: name, email, site-wide role,
 * department, active status and join date, one row per account, with every column
 * click-to-sort against the backend's `UserController::applySort()`. Mirrors the shape of
 * `InvitationsTable` (skeleton rows while loading, an empty state, hoverable rows) so every
 * account-wide roster in the app reads the same way.
 */
const UsersDirectoryTable: React.FC<UsersDirectoryTableProps> = ({
  user_rows,
  is_loading,
  sort_field,
  sort_direction,
  onSort,
}) => (
  <div className="overflow-x-auto rounded-t-[10px] border border-b-0 border-shell-border">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-shell-border bg-shell-panel-alt">
          <SortableHeader field="name" sort_field={sort_field} sort_direction={sort_direction} onSort={onSort}>
            Name
          </SortableHeader>
          <SortableHeader field="role" sort_field={sort_field} sort_direction={sort_direction} onSort={onSort}>
            Role
          </SortableHeader>
          <SortableHeader field="department" sort_field={sort_field} sort_direction={sort_direction} onSort={onSort}>
            Department
          </SortableHeader>
          <SortableHeader field="status" sort_field={sort_field} sort_direction={sort_direction} onSort={onSort}>
            Status
          </SortableHeader>
          <SortableHeader field="created_at" sort_field={sort_field} sort_direction={sort_direction} onSort={onSort}>
            Joined
          </SortableHeader>
        </tr>
      </thead>
      <tbody className="divide-y divide-shell-border">
        {is_loading ? (
          Array.from({ length: SKELETON_ROWS }).map((_, row_index) => (
            <tr key={row_index}>
              {Array.from({ length: COLUMN_COUNT }).map((__, column_index) => (
                <td key={column_index} className="px-4 py-4">
                  <div className="h-4 animate-pulse rounded bg-shell-hover" />
                </td>
              ))}
            </tr>
          ))
        ) : user_rows.length === 0 ? (
          <tr>
            <td colSpan={COLUMN_COUNT} className="px-4 py-12 text-center">
              <div className="flex flex-col items-center gap-2 text-shell-text-muted">
                <svg className="h-8 w-8 text-shell-text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.964 0a9 9 0 10-11.964 0m11.964 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-shell-text-secondary">No users found</p>
                <p className="text-xs text-shell-text-faint">Try adjusting your search or filters</p>
              </div>
            </td>
          </tr>
        ) : (
          user_rows.map((row) => {
            const person = toPersonOption(row);
            const role = primaryRole(row);

            return (
              <tr key={row.id} className="transition-colors hover:bg-shell-hover">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PersonAvatar person={person} size={28} />
                    <div className="min-w-0">
                      <div
                        className={`truncate text-[13.5px] font-semibold ${
                          row.is_active ? "text-shell-text" : "text-shell-text-faint line-through"
                        }`}
                      >
                        {row.full_name}
                      </div>
                      <div className="truncate text-xs text-shell-text-muted">{row.email}</div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <UserRoleBadge role={role} />
                </td>

                <td className="px-4 py-3 text-sm text-shell-text-muted">
                  {row.department?.name ?? <span className="text-shell-text-faint">Unassigned</span>}
                </td>

                <td className="px-4 py-3">
                  <UserStatusBadge is_active={row.is_active} />
                </td>

                <td className="px-4 py-3 text-sm text-shell-text-muted">{formatDate(row.created_at)}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
);

export default UsersDirectoryTable;
